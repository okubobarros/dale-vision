# Dale Vision - Análise CV + MLOps + Produto Multi-Cliente (2026-03-20)

## Contexto validado
- Backfill executado com sucesso:
  - `python manage.py backfill_first_metrics_received`
  - Resultado: `eventos_inseridos=1` para `store_id=ab20f272-c844-495b-bbeb-3d00f1945e07`.
- Ingestão operacional ativa (24h): `traffic_metrics`, `conversion_metrics`, `vision_atomic_events` e `event_receipts` com volume alto.
- Gap principal corrigido: etapa de funil `first_metrics_received` não era emitida quando o primeiro sinal chegava por `queue_state/crossing/checkout/zone`.

## Leitura técnica das evidências visuais (19/03/2026)

### 1) 20:35:47 - balcão/caixa (camera interna)
- Cena com equipe ativa e cliente no balcão.
- Forte oclusão por luminárias no topo e reflexos no vidro.
- Risco de FN:
  - subcontagem de mãos/objetos na frente do POS;
  - perda de tracking de pessoa ao cruzar atrás do balcão.
- Ação:
  - reduzir ângulo incidindo em vidro;
  - ajustar ROI de checkout para área útil do caixa (evitar área de vitrine).

### 2) 19:28:08 - entrada + checkout
- Cliente em pagamento, criança em trânsito e equipe no balcão.
- Esta cena é ótima para validar:
  - `entry_exit` na linha de entrada;
  - `checkout_proxy` no POS;
  - deduplicação por track entre entrada e zona de caixa.
- Risco atual:
  - dupla contagem quando cliente para próximo ao limite da linha virtual.

### 3) 19:35:55 - salão
- Duas pessoas sentadas claramente visíveis.
- Se capacidade operacional é 11 assentos + sofá, o modelo de ocupação precisa separar:
  - `seat_capacity_nominal`;
  - `seat_capacity_extended` (com sofá/eventual).
- Hoje o sistema tende a medir ocupação por presença, não por assento efetivamente ocupável.

## Crítica objetiva (computer-vision-expert)

### ROI e geometria
- Entrada: usar linha única de cruzamento perpendicular ao fluxo principal e zona tampão de histerese (anti-bounce).
- Checkout: ROI exclusiva do POS (evitar incluir vitrine e corredor).
- Salão: dividir por subzonas (mesas, sofá, circulação), com `roi_entity_id` por zona.
- Exigir `roi_version` publicado por câmera antes de considerar métrica "oficial".

### Qualidade de imagem
- Problemas observados: reflexo, brilho especular em vidro, pontos de luz superexpostos.
- Ajustes recomendados:
  - WDR/HDR ativo;
  - reduzir ganho noturno e shutter muito baixo;
  - ângulo 15-25 graus para minimizar reflexo frontal.

### Eventos e semântica
- Padronizar `metric_type`/`roi_entity_id` em 100% dos eventos.
- Para checkout: manter regra de proxy, mas anexar confidence e evidência temporal (janela de 30s).
- Para salão: medir `engaged/dwell` por zona; não inferir capacidade sem cadastro operacional da loja.

## Plano de refino de ingestão (ml-engineer + ml-pipeline-workflow)

## Stack CV por métrica (YOLO + MediaPipe + Tracking)

## Princípio
- Nenhuma métrica depende de um único modelo.
- Cada KPI é composto por:
  - detecção (`quem/onde`);
  - tracking (`quando/quanto tempo`);
  - regra espacial (`ROI/linha`);
  - validação operacional (`PDV, checklist, evidência`).

## Matriz métrica -> técnica
1. Fluxo de entrada (`traffic_metrics.footfall`, `vision.crossing.v1`)
- Modelo principal: YOLO (detecção de pessoa).
- Tracking: ByteTrack/BoT-SORT para ID temporal estável.
- Regra: line-crossing com histerese (cooldown por track).
- Papel do MediaPipe: opcional para refinamento de direção corporal quando cenário é ambíguo.
- Sinal de qualidade: `crossing_precision`, `crossing_recall`, `double_count_rate`.

2. Fila e risco de fila (`conversion_metrics.queue_avg_seconds`, `vision.queue_state.v1`)
- Modelo principal: YOLO pessoa em ROI de caixa.
- Tracking: persistência de IDs em janela de 30s.
- Regra: `queue_length_avg` por bucket e conversão para segundos.
- Papel do MediaPipe: pose básica para distinguir cliente atendido vs funcionário parado no caixa.
- Sinal de qualidade: MAE de tamanho de fila e erro de tempo médio de fila.

3. Conversão proxy de checkout (`conversion_metrics.checkout_events`, `vision.checkout_proxy.v1`)
- Modelo principal: YOLO pessoa + contexto de ROI POS.
- Tracking: entrada na zona POS + tempo mínimo de permanência + saída.
- Regras:
  - evento de checkout proxy exige sequência temporal (entrar -> interagir -> sair);
  - dedupe por `track_id_hash + janela`.
- Papel do MediaPipe Hands: opcional para elevar confiança de gesto de pagamento/manuseio em POS.
- Validação cruzada: correlação com PDV oficial por hora/dia.
- Sinal de qualidade: `proxy_vs_pos_error_abs`, `proxy_vs_pos_corr`.

4. Ocupação e permanência no salão (`traffic_metrics.engaged`, `traffic_metrics.dwell_seconds_avg`, `vision.zone_occupancy.v1`)
- Modelo principal: YOLO pessoa.
- Tracking: tempo por zona e reidentificação local.
- Regra: agregação por `roi_entity_id` (mesa/sofa/circulação).
- Papel do MediaPipe Pose: melhora distinção sentado/parado em cenas com ângulo lateral.
- Papel de SAM (quando necessário): refino de máscara de zona em layout complexo.
- Sinal de qualidade: MAE de ocupação por zona, erro de dwell por faixa.

5. Produtividade de staff (`conversion_metrics.staff_active_est`)
- Modelo principal: YOLO pessoa.
- Regras: presença em ROI de operação + movimento + tempo ativo.
- Papel do MediaPipe: estimar postura/atividade (evitar contar staff parado como ativo).
- Sinal de qualidade: concordância com observação manual por amostragem.

## Recomendação de rollout de modelo
- Fase 1 (rápida): YOLO + tracking + regras espaciais robustas.
- Fase 2 (precisão): MediaPipe em câmeras críticas (caixa e salão).
- Fase 3 (refino avançado): SAM para ROI difícil e revisão assistida no Calibration Lab.

## Onde refinar e testar
- `Admin SaaS`:
  - monitoramento de saúde, cobertura, null rate, backlog e risco.
  - não é o lugar para tuning profundo de modelo.
- `Lab de Calibração` (ferramenta separada, mas integrada ao admin):
  - ajuste ROI frame-a-frame;
  - revisão de eventos com evidência (clip/snapshot);
  - comparação previsão vs anotação humana;
  - publicação versionada de ROI/modelo.

## Autonomia Admin + Cliente (workflow operacional)

## Objetivo
- Admin e cliente conseguem ajustar operação sem depender de intervenção técnica manual contínua.
- Toda ação vira item rastreável com validação antes/depois.

## Fluxo por câmera/loja
1. Detecção de problema
- Sistema abre backlog automático por regra:
  - exemplo: `high_glare`, `low_crossing_recall`, `checkout_proxy_drift`.

2. Ação recomendada
- Exemplo de card de ação:
  - "Ajustar câmera 15 graus para reduzir reflexo na vitrine";
  - "Reposicionar linha de entrada 30 cm para dentro";
  - "Publicar ROI v8 com zona de caixa mais estreita".

3. Execução pelo cliente
- Cliente marca `acao_em_execucao` e anexa evidência (foto/snapshot pós-ajuste).

4. Revalidação automática
- Sistema captura novo snapshot/clip (janela padrão 10-15 min de operação real).
- Recalcula métricas de qualidade comparando antes/depois.

5. Decisão
- Se melhora acima do limiar: `acao_validada`.
- Se não: `acao_reprovada` com próxima recomendação.

## Entidades sugeridas (produto)
- `calibration_action`:
  - `id`, `org_id`, `store_id`, `camera_id`, `issue_code`, `recommended_action`, `owner_role`, `status`, `sla`.
- `calibration_evidence`:
  - `action_id`, `snapshot_before_url`, `snapshot_after_url`, `clip_before_url`, `clip_after_url`, `captured_at`.
- `calibration_result`:
  - `action_id`, `metric_name`, `baseline_value`, `after_value`, `delta`, `passed`, `validated_by`.

## Visibilidade no app
- Admin interno:
  - visão global multi-tenant de qualidade e pendências.
- Cliente (org/store):
  - backlog de ações da sua loja;
  - evidências antes/depois;
  - status de validação e impacto estimado.

## Pipeline recomendado
1. Coleta e versionamento
- Persistir evidências por evento: frame/clip curto + metadados.
- Dataset versionado por loja/câmera/ROI/model version.

2. Validação de dados
- Gate de qualidade antes de promover métrica a "oficial":
  - completude de payload;
  - consistência temporal;
  - identidade (`metric_type`, `roi_entity_id`, `camera_role`).

3. Avaliação CV
- Métricas mínimas:
  - Entrada: precision/recall/F1 de crossing.
  - Checkout proxy: correlação com PDV e erro absoluto por hora.
  - Salão: MAE de ocupação por faixa de lotação.

4. Deploy e governança
- Canary por loja.
- Rollback automático se queda de qualidade.
- Registro de método/versão por card no frontend (`official/proxy/estimated`).

## Evolução de produto para multi-cliente (acesso a imagem)

## Problema atual
- Hoje o acesso a snapshot/eventos está concentrado em fluxo interno e conta piloto.
- Isso não escala para múltiplos clientes com isolamento e compliance.

## Desenho recomendado
1. Storage de mídia por tenant
- Bucket lógico por `org_id/store_id/camera_id/date`.
- Sem mídia pública.

2. Acesso por URL assinada curta
- API gera signed URL com TTL curto (ex.: 60-300s).
- Escopo por tenant e papel (admin interno vs cliente loja).

3. RBAC e trilha de auditoria
- Registrar quem visualizou qual evidência e quando.
- Perfis:
  - `internal_admin` (cross-tenant);
  - `org_admin` (somente org);
  - `store_manager` (somente lojas permitidas).

4. Política de retenção
- Snapshot operacional: 7-30 dias.
- Evidência para calibração/incidente: 90 dias (com justificativa).
- Anonimização/masking se necessário por LGPD.

## Backlog executável (próximos 14 dias)
1. CV/ROI
- Criar checklist de posicionamento por tipo de câmera (entrada, caixa, salão).
- Implementar validação de ROI publicada por métrica.
- Implementar catálogo de `issue_code -> recommended_action` (incluindo "ajustar 15 graus").

2. Dados/eventos
- Contrato único de evento com testes automáticos por tipo.
- Dashboard de "eventos inválidos por motivo" no Admin SaaS.
- Salvar score de qualidade por câmera com histórico diário.

3. MLOps
- Criar `Calibration Lab` (MVP) para revisão de frames e aprovação de ROI versionado.
- Pipeline de avaliação offline com benchmark semanal por loja.
- Adicionar comparação antes/depois por ação (`baseline vs after`) com limiar configurável.

4. Produto
- Expor "Provas de Métrica" (evidências) no app por tenant com signed URL.
- Separar visão:
  - Admin interno (control tower global);
  - Cliente (somente sua operação e recomendações).
- Expor módulo "Ações recomendadas" para cliente confirmar execução e solicitar nova validação.

## Critérios de sucesso para sair de score 55 -> 95
- `first_metrics_received` em 100% das lojas com ingestão ativa.
- Null rate global < 2% nos campos críticos.
- Cobertura de `metric_type + roi_entity_id` >= 99%.
- Correlação checkout proxy vs PDV com erro dentro da faixa alvo definida por segmento.
- 0 incidentes de acesso cross-tenant a mídia/evidência.
