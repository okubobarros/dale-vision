# Open Activity — Delegação Operacional via WhatsApp

## Status
- Estado: `em aberto`
- Data: `2026-03-13`
- Responsável técnico: `backend + automação n8n`

## O que já foi implementado
- Endpoint backend criado:
  - `POST /api/alerts/events/{event_id}/delegate-whatsapp/`
- Comportamento atual:
  - valida permissão por organização/loja
  - monta payload operacional do evento (problema, severidade, horário, evidências)
  - dispara evento para `N8N_EVENTS_WEBHOOK` com `event_name=alert_delegate_whatsapp_requested`
  - grava auditoria em `notification_logs` (`channel=whatsapp`, `provider=n8n`, `status=queued|failed`)
  - registra `journey_events` para rastreabilidade

## Regra de vínculo com equipe (implementada)
- A delegação não aceita destino genérico.
- O backend resolve o destinatário a partir de colaborador ativo da **mesma loja** do alerta.
- Fonte atual do telefone da equipe:
  - campo `employees.external_id` (temporário como contato WhatsApp)
- Se não houver colaborador elegível ou telefone válido, retorna erro 400 orientativo.

## Campos de request (atual)
- `destination` (opcional): destino textual (ex.: gerente/telefone)
- `manager_name` (opcional): nome do gerente destino
- `note` (opcional): contexto adicional de execução

## Resposta (atual)
- `ok`: sucesso na publicação para n8n
- `activity_status`: `"open"`
- `message`: orientação de estado de implementação
- `notification_log_id`: id do log criado
- `event_id`: id do evento delegado
- `n8n`: retorno bruto do webhook

## Lacunas (por isso permanece em aberto)
1. Entrega real WhatsApp ainda depende do workflow n8n final e provedor homologado.
2. Falta contrato definitivo de telefone da equipe (hoje usa `external_id` como solução temporária).
3. Falta confirmação de entrega/leitura no `notification_logs` (status assíncrono).
4. Falta política de retry/backoff por canal.
5. Falta UI final de confirmação/erro por gerente e loja.

## Próximos passos recomendados
1. Definir contrato canônico do destino (`whatsapp_number`, `manager_id`, `store_id`).
2. Implementar workflow n8n com retorno de `provider_message_id`.
3. Criar callback/status sync para atualizar `notification_logs` (`sent`, `delivered`, `failed`).
4. Adicionar testes de integração (happy path + timeout + erro de provedor).
5. Publicar playbook operacional para suporte (falha de envio, reenvio, fallback).
