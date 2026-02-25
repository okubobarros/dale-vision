# DALE Vision — Context Pack (Fev/2026) — Produto + Engenharia (Ultra Técnico)

## 0) TL;DR (o que estamos construindo)
DALE Vision é um SaaS de Retail Vision que transforma CFTV em:
- Alertas operacionais (fila, aglomeração, permanência, áreas críticas)
- Auditoria (evidências, logs, cooldowns)
- Métricas/insights (footfall, conversão, permanência, produtividade)
Arquitetura: Frontend React + Backend Django + Supabase (auth + DB) + Edge Agent (Windows/Python) + n8n (roteador de automações).

Objetivo comercial:
- Trial guiado (72h) → “Aha moment” → conversão em plano pago
- Escalar de 100 → 1000 lojas com onboarding autoassistido + suporte mínimo

---

Variáveis de ambiente (backend):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (service role do Supabase)
- `SUPABASE_STORAGE_BUCKET` (default: `camera-snapshots`)

Checklist Render (Storage de snapshots):
- Definir `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no Render.
- (Opcional) Definir `SUPABASE_STORAGE_BUCKET` (default: `camera-snapshots`).
- Criar o bucket no Supabase com o mesmo nome configurado.
- Validar em `/api/v1/system/storage-status/` (staff only).

## 1) Realidade do campo (lições aprendidas)
### 1.1 Intelbras iC4/Mibo/iC5 (consumer cloud-only)
- Não expõe RTSP/ONVIF na LAN: portas fechadas; acesso via cloud do fabricante.
- Conclusão: integração direta via RTSP = impossível.
- Produto: filtrar leads e exigir NVR ou oferecer fallback premium (cloud snapshots, se viável).

### 1.2 NVR Intelbras NVD 1408P (profissional)
- Expondo RTSP e portas típicas:
  - RTSP: 554
  - HTTP: 80
  - HTTPS: 443
  - Serviço/SDK: 37777 / UDP 37778
- Template RTSP (observado no próprio NVR):
  - Stream principal: rtsp://{user}:{pass}@{ip}:554/cam/realmonitor?channel={ch}&subtype=0
  - Stream extra:     rtsp://{user}:{pass}@{ip}:554/cam/realmonitor?channel={ch}&subtype=1
- Recomendações:
  - subtype=1 no edge (economia CPU/banda)
  - Canal = 1..N (câmeras conectadas)

### 1.3 Redes segmentadas (padrão em loja)
- Muito comum: rede “usuários” (ex 192.168.5.x) ≠ rede “câmeras/NVR” (ex 192.168.15.x)
- Implicação: Edge Agent precisa ter visibilidade L2/L3 do NVR.
- Soluções de campo:
  - instalar agente em máquina na rede do NVR
  - roteamento entre VLANs (depende do roteador/IT)
  - bridge com duas interfaces (Wi-Fi + Ethernet)

---

## 2) Personas e Jornadas (User + Admin)
### 2.1 Persona: Dono/Operador (leigo)
Objetivo: “Quero ver se vocês me dão resultado sem dor de cabeça.”
Medos: TI, IP, RTSP, quebrar câmera, expor vídeo.

### 2.2 Persona: Admin/Operações (multi-loja)
Objetivo: padronizar, acompanhar status, comparar lojas, receber alertas e relatórios.

---

## 3) Jornada do Trial (72h) — experiência que precisa fluir
### Etapa 1 — Conta
- Signup/login + e-mail/whatsapp
- Estado: created_account = true

### Etapa 2 — Loja
- Criar 1 loja (trial)
- Estado: store_created = true

### Etapa 3 — Equipe (opcional no MVP)
- Criar funcionários/roles (admin/manager/viewer)
- Estado: team_ready = true (ou skip)

### Etapa 4 — Ativação (Edge)
**Meta da etapa:** “Loja Online” + “Primeira Câmera conectada” + “Primeiro Snapshot” + “ROI publicado”

#### 4.1 Edge Setup Wizard (modal)
Passos:
1) Selecionar loja
2) Download do Edge Agent
3) Copiar .env (token + store_id + base_url)
4) Rodar agent (janela terminal aberta)
5) Verificação online (monitorar heartbeat por até 2 min)

UX esperado:
- Botões de confirmação devem ser destaque (mesma cor do CTA do produto)
- Timer real (countdown) e status dinâmico:
  - “Aguardando heartbeat… (restam 65s)”
  - ao receber: “Heartbeat recebido agora ✅”
- Ao sucesso: redirecionar em 3s para /app/cameras com mensagem: “Próximo passo: adicionar sua primeira câmera.”

**Importante:** fechar o wizard NÃO pode deixar o dashboard “vazio”.
- Dashboard deve ter estado “pré-dados” com:
  - status do Edge (online/offline, last_seen)
  - checklist do próximo passo (CTA Add Camera)
  - explicação de “quando aparecerão métricas”

#### 4.2 Cadastro de câmera (MVP realista)
Não pedir RTSP. Pedir:
- Tipo de origem:
  A) NVR (recomendado)  B) Câmera IP (RTSP direto)  C) Cloud-only (não suportado no MVP)
- Para NVR:
  - IP do NVR
  - Usuário
  - Senha
  - Canal (1..N)
  - (opção) stream: principal/extra (default extra)
Backend/Edge montam RTSP automaticamente.

Aha mínimo no trial:
- 1 snapshot exibido no dashboard
- ROI desenhado e publicado
- 1 evento/alerta gerado (ex: presença/ocupação/contagem) ou “health report parcial”

---

## 4) Arquitetura Técnica (alto nível)
### 4.1 Frontend (React)
- Páginas: Dashboard, Stores, Cameras, Alerts, Analytics, Settings
- Edge Setup Wizard: modal guiado
- Cameras:
  - Lista por loja
  - Add Camera Wizard (NVR vs RTSP)
  - Preview snapshot e ROI editor

### 4.2 Backend (Django)
- Auth: Supabase JWT
- API:
  - Stores
  - Edge status (heartbeat ingestion / last_seen)
  - Cameras (CRUD)
  - Camera health endpoint (trigger test, persist status)
  - ROI config publish
  - Alerts/events storage
  - Trial limits endpoint
- Idempotência: receipts com unique constraint no DB

### 4.3 Edge Agent (Windows, Python)
Responsabilidades:
- Heartbeat periódico (store online)
- Descoberta/config (fase 2; MVP manual guiado)
- Conectar RTSP:
  - montar URL por templates (Intelbras NVR)
  - testar conexão (RTSP DESCRIBE opcional)
  - capturar snapshot (OpenCV; fallback ffmpeg)
- Enviar:
  - camera health (ok/erro + latência + snapshot_url quando existir)
  - eventos (quando visão computacional rodar)

---

## 5) Edge Agent — Conectividade e Robustez (campo)
### 5.1 Modo NVR Intelbras (prioridade máxima)
Input:
- nvr_ip, username, password, channel, subtype (default 1)
Build:
- rtsp://{u}:{p}@{ip}:554/cam/realmonitor?channel={ch}&subtype={sub}
Test plan:
- ping ip
- tcp connect 554
- abrir stream (VLC/ffmpeg)
- snapshot capturado

### 5.2 Modo RTSP direto (câmera IP/RTSP)
Input:
- ip, user, pass, port(554 default), path/preset (marca)
- tentar presets comuns (stream1, h264, etc.)

### 5.3 Detecção de rede segmentada (requisito produto)
Se store online (heartbeat ok) mas câmera não conecta:
- mostrar diagnóstico:
  - “Seu agente está na rede 192.168.5.x e o NVR está em 192.168.15.x. Isso indica rede segmentada.”
- instruir:
  - “conecte o PC do agente via cabo na rede do NVR” OU “solicite ao TI liberar rota”.

---

## 6) Onboarding Progress — definição e persistência
Estado por loja (store-scoped), steps:
1) edge_connected
2) camera_added
3) snapshot_ok
4) roi_published
5) monitoring_started
6) first_insight (aha)

Regra mínima para first_insight:
- primeiro evento válido registrado (ex: detection_event) OU
- primeiro alerta operacional gerado
- fallback: primeiro relatório parcial (health report) entregue

---

## 7) Trial → Operação → Planos (como funciona)
### Trial (72h)
- 1 loja
- até 1-3 câmeras
- ROI + 1 playbook de alertas
- relatório final automático (Store Health Report)

### Plano “Starter”
- 1-2 lojas
- até X câmeras
- alertas + dashboards + relatórios semanais

### Plano “Multi-loja”
- comparação entre lojas
- ranking de performance
- alertas avançados + SLA de monitoramento
- gestão de equipe/roles

### Enterprise
- SSO
- VLAN/network playbooks
- discovery assistido + suporte
- integrações (ERP/PDV)

---

## 8) Roadmap (100 → 1000 usuários)
### Para 100 usuários (agora)
- MVP NVR Intelbras robusto
- wizard que não trava e não “some” dashboard
- diagnósticos claros (rede segmentada, credenciais, porta)
- relatório final 72h com 3 insights acionáveis

### Para 1000 usuários
- auto-detection NVR (scan ONVIF + portas) com fallback guiado
- fleet management do Edge (auto-update, restart, logs remotos)
- templates por fabricante (Intelbras/Hikvision/Dahua)
- operações multi-loja completas + billing

---

## 9) Definition of Ready (DoR) — “pronto pra campo”
Para dizer que “Edge + NVR Intelbras está pronto”:
- Consegue conectar RTSP subtype=1 em 3 cenários:
  1) mesma subnet
  2) rede segmentada mas com PC dual-NIC
  3) credenciais erradas (erro explícito 401)
- Snapshot aparece no dashboard em < 30s
- Wizard redireciona e orienta próximo passo
- Logs do edge com códigos de falha e recomendação humana
- Playbook “como instalar em rede segmentada” pronto

---

## 10) Lead Qualification (anti-trial impossível)
Perguntas mínimas no agendamento/demo:
1) Quantas câmeras?
2) Você tem NVR/DVR? Qual modelo?
3) App que usa hoje: iSIC Lite / Mibo / outro
4) Rede das câmeras é separada? (sim/não/não sei)
5) Tem um PC Windows no local conectado à rede do NVR?

Regras:
- Se “Mibo/iC4 sem NVR” → marcar como “não compatível no MVP” (oferecer alternativa: NVR ou plano premium cloud no futuro)
- Se “NVR Intelbras” → qualificado para trial imediato

---

## 11) Testes (backend)
Comandos:
- `python manage.py test`

Notas:
- Não existe `DROP DATABASE` manual no fluxo de testes.
- Se `DATABASE_URL` estiver configurado, o Django cria e destrói automaticamente o banco de teste `test_<db>`.
- O nome do banco de teste Postgres inclui um sufixo por processo (ex.: `test_postgres_<pid>`) para evitar colisões sem `DROP DATABASE`.
- Por padrão, `python manage.py test` usa SQLite em memória (independente de `DATABASE_URL`), evitando depender de Postgres local.
- Para forçar Postgres em testes, use `USE_POSTGRES_FOR_TESTS=1`.

# FIM
