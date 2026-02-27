# Backup Diário de Métricas (Google Drive)

## Objetivo
Exportar diariamente as métricas para o Google Drive e aplicar retenção no banco para não estourar o trial.

## Escopo MVP
- Exportar CSV de:
  - `traffic_metrics`
  - `conversion_metrics`
  - `event_receipts`
- Frequência: 1x por dia, **02:00 (America/Sao_Paulo)**.

## Credenciais
- Usar **Google Drive API** com **Service Account**.
- Compartilhar a pasta com o e-mail da service account (Editor).

## Pasta no Drive
- Pasta: `Backup-Dalevision`
- Folder ID: `1oljmo_60AC09FkhqbDawXvr_3emyzg0G`

## Render (Web Service do backend)
- Em **Environment → Secret Files**, criar um arquivo (ex.: `gdrive-sa.json`) e colar o JSON da service account.
- O Render monta os secret files em `/etc/secrets/`.
- Definir variáveis:
  - `GOOGLE_DRIVE_SA_JSON=/etc/secrets/gdrive-sa.json`
  - `GOOGLE_DRIVE_FOLDER_ID=1oljmo_60AC09FkhqbDawXvr_3emyzg0G`
  - `GOOGLE_DRIVE_EXPORT_TZ=America/Sao_Paulo`

## Alternativa (Render Free) — GitHub Actions
Quando Jobs do Render não estão disponíveis, usar GitHub Actions com cron:
- Schedule em UTC: **05:00** (equivale a 02:00 America/Sao_Paulo).
- Secrets necessários no repo:
  - `DATABASE_URL`
  - `GOOGLE_DRIVE_FOLDER_ID`
  - `GOOGLE_DRIVE_SA_JSON` (conteúdo do JSON)
- Workflow: `.github/workflows/export_metrics_drive.yml`

## Variáveis de ambiente
- `GOOGLE_DRIVE_SA_JSON` = caminho do JSON da service account
- `GOOGLE_DRIVE_FOLDER_ID` = ID da pasta no Drive
- `GOOGLE_DRIVE_EXPORT_TZ` = `America/Sao_Paulo` (default)
- `GOOGLE_DRIVE_EXPORT_TABLES` = `traffic_metrics,conversion_metrics,event_receipts`
- `TRAFFIC_METRICS_TTL_DAYS` = `90`
- `CONVERSION_METRICS_TTL_DAYS` = `90`
- `EVENT_RECEIPTS_TTL_DAYS` = `14`

## Execução (manual)
```bash
python manage.py export_metrics_drive
```

## Execução (data específica)
```bash
python manage.py export_metrics_drive --date 2026-02-26
```

## Retenção
O comando aplica TTL automático após o upload:
- `traffic_metrics` e `conversion_metrics`: 90 dias
- `event_receipts`: 14 dias

## Observações
- CSVs são gravados por tabela e por dia.
- Não salvar frames/vídeos contínuos (custo).
