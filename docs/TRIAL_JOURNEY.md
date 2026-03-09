# Jornada do Trial (Dale Vision)

## Objetivo do Trial (72h)
Provar valor rápido com 1 loja online, 1–3 câmeras ativas, snapshot + health, ROI publicado e 1 primeiro insight exibido no Analytics. Ao final, gerar relatório executivo com recomendação de upgrade.

## Estado Atual (baseline)
`Django backend + React frontend + Supabase Postgres + Edge Agent Windows`.

Status confirmado:
- Login otimizado (chamada ao Supabase é best effort).
- Edge Setup Wizard recebe heartbeat.
- Store fica `online_no_cameras` quando não há câmeras.
- Edge agent Windows envia heartbeat continuamente (run.bat + logs).
- Supabase já possui tabelas: `cameras`, `camera_health_logs`, `camera_roi_configs`, `camera_snapshots`.

## Problema de Produto (agora)
Usuário leigo não sabe RTSP e se perde após o heartbeat. A jornada precisa ser guiada com um próximo passo único sempre visível.

## Jornada do Usuário (0 → Aha)

### Etapa 0 — Aquisição / Demo / Trial
- Lead agenda demo.
- Após demo, libera trial 72h (limites por loja/câmera).
- Usuário cria conta, cria 1 loja (equipe opcional), entra no dashboard.

### Etapa 1 — Ativação Edge (Wizard)
Passos: Download → Copiar `.env` → Rodar `run.bat` → Verificação online (até 2 min).

Após sucesso:
- Mostrar: “🟢 Agente conectado com sucesso”.
- Regra de ouro: “Conectado” ≠ pronto para valor.
- CTA principal: “Configurar primeira câmera”.
- Redirecionar para `/app/cameras`.

Se fechar o wizard:
- Dashboard nunca pode ficar vazio.
- Mostrar card “Próximo passo: adicionar câmera”.

### Etapa 2 — Câmeras (manual guiado no MVP)
Objetivo: cadastrar pelo menos 1 câmera e ver “online + snapshot”.

Formulário (MVP):
- Nome, IP, Usuário, Senha, Marca (opcional), Canal (opcional), “É NVR?” (toggle).

Backend:
- Salva credenciais com `rtsp_url` write-only.
- UI mostra apenas `rtsp_url_masked`.

Edge agent:
- Sincroniza câmeras ativas.
- Constrói candidatos RTSP por presets.
- Testa conexão RTSP (TCP + DESCRIBE opcional).
- Captura snapshot (se OpenCV disponível).
- Envia `camera.health` com `status/latency/error/snapshot_url`.

Critério de sucesso:
- “Câmera 1: Online (xx ms) + snapshot recente”.
- “ROI pronta para desenhar”.

### Etapa 3 — ROI (publicar)
- Usuário desenha ROI com semântica operacional e publica.
- Entrada/saída deve usar `line`.
- Fila, checkout proxy e ocupação devem usar `poly` como padrão.
- Cada métrica precisa ter câmera dona (`ownership=primary`) para evitar duplicação.
- Edge agent busca `roi/latest` (somente `published`) e usa versionamento para cache.

### Etapa 4 — Analytics (Aha)
Métricas base no trial (varejo):
- Fila no caixa (tempo médio, picos).
- Fluxo/footfall por bucket de tempo a partir de `line ROI`.
- Permanência/dwell por zona.
- Alertas operacionais (concentração, permanência alta).

Regra mínima de Aha:
- Pelo menos 1 bucket com métricas não‑zero OU 1 evento relevante em `detection_events` originado do edge.

### Etapa 5 — Relatório Final do Trial (72h)
Geração automática (n8n ou backend cron):
- Resumo por loja/câmera.
- Top insights (fila, fluxo, permanência).
- Incidentes/alertas com evidência (snapshot).
- Recomendação de ROI/alert rules.
- “O que você perderá se parar”.

### Etapa 6 — Conversão / Plano / Escala
Planos sugeridos por dimensões:
- nº de lojas
- nº de câmeras ativas
- retenção de dados (dias)
- módulos de métricas (retail base vs verticais)

Escala 100 → 1000 users:
- Padronizar onboarding + reduzir suporte.
- Observabilidade do edge (logs + health + diagnósticos).
- Templates de métricas por segmento.
- Governança de ROI e manutenção contínua.

## Questões Reais de Engenharia (riscos)
1) Duplicidade entre câmeras (mesma pessoa contada duas vezes)
- MVP: separar “métrica por câmera” vs “métrica por loja”.
- Heurística: ROIs não sobrepostas, marcar câmeras como “mesma área”.
- Roadmap: re‑ID, track stitching, calibração.

2) Modelo de dados (usar o que já existe)
- `camera_health_logs` como histórico.
- `cameras.status/last_seen_at/last_error` como estado atual.
- `camera_roi_configs` versionado (draft/published).
- `camera_snapshots` para evidências e UI.

3) Operação do edge
- Edge deve rodar contínuo.
- Fail‑fast em 401/403 para evitar “offline silencioso”.
- Health por câmera não derruba o agent.
- Logs claros para suporte (especialmente RTSP).

## Próximos Desafios (24–72h)
- UX: pós‑heartbeat redirecionar para `/app/cameras` e dashboard com “próximo passo”.
- Câmeras: fluxo manual guiado + snapshot/latência/erro.
- ROI: publicar ROI e confirmar cache/versão no edge.
- Analytics: definir “primeiro insight” e exibir no dashboard.
- Trial: pipeline mínimo do relatório final.
