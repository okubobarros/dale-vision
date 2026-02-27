# SPEC-007 Event Pipeline

## Objetivo e Escopo v1
Estabelecer um pipeline confiável de eventos do **Agent** no **Edge** até **Backend**, com armazenamento e agregações básicas para relatórios. O foco v1 é garantir entrega, idempotência e rastreabilidade dos eventos essenciais.

## Não‑objetivos
- Não criar novos endpoints sem atualizar `30_system/API_Contracts.md` (marcar `TBD`).
- Não implementar processamento em tempo real com baixa latência.
- Não criar novos modelos/tabelas fora do `30_system/Data_Model.md`.

## Event Names v1 (lista fechada)
- `camera.health`
- `camera.snapshot`
- `queue.detected`
- `idle.detected`
- `compliance.detected`
- `vision.metrics.v1`

## Contrato do evento (v1)
Campos obrigatórios:
- `receipt_id` (string, idempotência)
- `event_name` (string, fechado conforme lista v1)
- `ts` (timestamp ISO8601)
- `store_id` (uuid)
- `org_id` (uuid, quando aplicável)
- `source` (string: `edge` | `backend` | `system`)

Campos opcionais:
- `camera_id` (uuid)
- `zone_id` (uuid)
- `payload` (json)
- `meta` (json)

### Idempotência
- `receipt_id` é chave única de deduplicação.
- Retries devem manter o mesmo `receipt_id`.
- Eventos duplicados são ignorados ou reprocessados sem efeitos colaterais.

## Fluxo v1
1. **Agent** captura evento e gera `receipt_id`.
2. **Backend** recebe, valida e persiste recibo do evento.
3. **Storage** armazena evento e mídia associada (quando aplicável).
4. **Métricas** agregam eventos por buckets de tempo.
5. **Relatórios** consomem métricas agregadas.

## Estratégia de snapshots
### v1 (on‑demand)
- Snapshot somente sob solicitação (ex.: debug, evidência, suporte).
- Throttling por **Camera** e **Store** para evitar abuso.

### v2 (periodic)
- Captura periódica opcional com limites configuráveis.
- Requer definição em `API_Contracts.md` e revisão de custos.

## Agregações e buckets
Buckets padrão:
- 5 minutos
- 15 minutos
- 1 hora

Tabelas que alimentam agregações (existentes em `Data_Model.md`):
- `DetectionEvent` (base para eventos detectados)
- `CameraHealthLog` (base para health e disponibilidade)
- `EventMedia` (evidências associadas)

Observação: armazenamento de buckets pode usar tabelas existentes ou views internas. Se precisar de novas tabelas, marcar `TBD` em `API_Contracts.md`.

## DOR (Definition of Ready)
- Event names v1 aprovados.
- Contrato do evento validado em `API_Contracts.md` (ou `TBD` marcado).
- Métricas e buckets definidos com fontes claras.
- Termos alinhados ao `00_index/Glossary.md`.
- Riscos operacionais mapeados.

## DOD (Definition of Done)
- Recebimento e deduplicação por `receipt_id` funcionando.
- Eventos essenciais v1 gerados pelo **Agent** e persistidos no Backend.
- Agregações por bucket funcionando com dados consistentes.
- Relatórios v1 consomem agregações.
- Testes automatizados cobrindo unit/api/integração.
- Registro no `70_ops/Daily_Log.md`.

## Testes
- Unit: geração de `receipt_id`, validação de contrato.
- API: ingestão com idempotência (replay do mesmo `receipt_id`).
- Integração: Edge -> Backend -> Storage -> Métricas.
- Snapshot on‑demand com throttling.

## Riscos operacionais
- Rede instável em loja (perda de eventos).
- Credenciais inválidas ou expiradas.
- SmartScreen/antivírus bloqueando o **Agent**.
- PC do caixa com baixo desempenho (latência e perda de pacotes).
- Ausência de permissões de rede (firewall/ACL).

## APIs
- Endpoints de ingestão e consulta devem estar em `30_system/API_Contracts.md`.
- Se algum endpoint faltar, marcar como `TBD` antes de implementação.
