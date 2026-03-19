# Plano Executável — 10 Early Users (2026-03-19)

## Objetivo
- Sair de validação técnica de 1 loja para operação repetível em 10 lojas com qualidade de dados confiável.

## Estado atual (resumo)
- Conectividade edge validada (heartbeat/camera_health/eventos de visão).
- ROI publicável via app com início de monitoramento simplificado (`Publicar e iniciar`).
- Setup Wizard com perfil padrão backend-managed (API-first) e autostart de produção.
- Gap principal: qualidade métrica operacional (KPI útil para gestão) ainda instável entre lojas/cenas.

## North Star de prontidão
- 10 lojas com:
  - agente iniciando sem login humano (boot OK),
  - câmeras sincronizadas via backend (sem `CAMERAS_JSON` manual no caminho padrão),
  - KPIs com cobertura mínima e acurácia auditável.

## Metas de qualidade mínima (gate de rollout)
- Conectividade:
  - `edge_heartbeat` sem lacuna > 120s por 95% do horário operacional.
  - `camera_health` por câmera a cada <= 60s em p95.
- ROI:
  - 100% das câmeras com ROI publicada e semântica de métrica definida.
- Métricas:
  - `vision_queue_state_v1` e `vision_zone_occupancy_v1` presentes em > 90% dos buckets esperados.
  - KPI de fila com erro relativo <= 20% em amostras auditadas.
  - Footfall com erro relativo <= 15% em amostras auditadas.

## Plano por trilha

### Trilha A — Produto e UX operacional
1. ROI Editor:
   - manter CTA único `Publicar e iniciar`.
   - status explícito: `Publicado • Monitoramento ativo`.
2. Câmeras:
   - backend-managed como padrão em setup.
   - `CAMERAS_JSON` somente fallback de contingência.
3. Onboarding:
   - bloquear avanço quando faltar ROI obrigatório por tipo de KPI (fila/fluxo/ocupação).

### Trilha B — Confiabilidade CV (detecção e eventos)
1. Protocolo de calibração por loja (D0):
   - gravar 20-30 min por câmera em horário real.
   - rotular amostras (entrada/saída, fila, ocupação, checkout proxy).
2. Validação:
   - comparar predição vs verdade-terreno por janela de 30s.
   - medir FN/FP por cenário (oclusão, reflexo, contra-luz, pico).
3. Correções:
   - ajustar posição de câmera, FOV, altura e ângulo.
   - ajustar ROI (linha/zonas) antes de ajustar modelo.
   - somente depois aplicar ajuste de threshold/heurística.

### Trilha C — Dados e dashboard
1. Contrato de métricas:
   - documentar fórmula de cada KPI exibido.
   - mapear evento-fonte e projeção consumida no dashboard.
2. Observabilidade:
   - painel de “saúde de dados” por loja:
     - heartbeat fresh,
     - coverage de buckets,
     - atraso de projeção.
3. Critério de exibição:
   - não exibir `0` como definitivo quando houver baixa cobertura; exibir `sem cobertura suficiente`.

## Sequência de execução (2 semanas)
- Semana 1:
  - fechar trilha A (UX/fluxo padrão) e observabilidade mínima.
  - ativar 2 lojas piloto com protocolo de calibração.
- Semana 2:
  - consolidar baseline de acurácia por KPI.
  - escalar para mais 8 lojas com checklist de instalação e aceite.

## Checklist de aceite por loja
- Edge startup no boot confirmado.
- 3/3 (ou N/N) câmeras online por >= 30 min.
- ROI publicada em todas as câmeras requeridas.
- Snapshot e eventos recentes fluindo.
- Dashboard sem erro crítico de auth/rota.
- Relatório de calibração com erro medido e plano de ajuste.

## Riscos abertos
- Drift de cena (layout/iluminação) reduzindo qualidade após implantação.
- Dependência de qualidade de instalação física da câmera.
- Falta de rotina de revalidação periódica em loja.

## Decisão de rollout
- Go para nova loja somente com checklist completo + acurácia mínima atingida no piloto.
