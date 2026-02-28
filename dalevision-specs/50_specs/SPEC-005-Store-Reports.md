# SPEC-005 Store Reports (v1)

## Objetivo
Entregar relatórios v1 que comprovem valor operacional e ROI por **Store** e por **Org**, alinhado aos limites do **Trial** e planos pagos (ver `10_product/Pricing_Plans.md`) e à fase “Relatórios por loja” do `10_product/Roadmap.md`.

## Personas
- **Store Manager**: precisa de resumo semanal por loja para orientar equipe.
- **Org Owner**: precisa de visão mensal multi‑loja para decidir expansão.
- **Ops Analyst**: acompanha ROI e indicadores de performance para justificar investimento.

## Relatórios v1

### 1) Semanal Loja
Resumo por **Store** com foco em operação.
- Período padrão: últimos 7 dias (segunda‑domingo).
- Seções:
  - Health do **Agent** e das **Cameras** (uptime e falhas relevantes).
  - Events e **Alerts** críticos (por tipo e severidade).
  - Indicadores de performance de loja (quando disponíveis).

### 2) Mensal Multi‑loja
Resumo por **Org** com comparação entre lojas.
- Período padrão: último mês fechado.
- Seções:
  - Ranking de lojas (top/bottom) por métricas principais.
  - Evolução de Events críticos e **Alerts** por loja.
  - Tendências de ROI e impactos operacionais.

### 3) Relatório contínuo (pós‑upgrade)
- Período customizável (7d / 30d / 90d / custom).
- KPIs, gráficos por hora e insights básicos.
- Exportação CSV/PDF.

### 4) ROI Dashboard (v1)
Painel simples com ROI explicado, transparente e rastreável.
- Entrada: métricas de performance e eventos.
- Saída: ROI estimado com faixas e limites claros.

## Fontes de dados

### v1 (confirmadas por Data Model)
- **Store**, **Org** (Organization), **OrgMember**
- **Camera**, **CameraHealthLog**
- **DetectionEvent**, **EventMedia**
- **AlertRule**, **NotificationLog**
- **Subscription**, **BillingCustomer**

### v2 (evolução prevista, sem novos modelos agora)
- Enriquecimento de métricas de conversão e produtividade via tabelas existentes (ex.: agregações internas).
- Integração com eventos de jornada (**JourneyEvent**) para atribuição.
- Observação: sem criação de novas tabelas nesta versão. Qualquer necessidade deve ser **TBD** no `30_system/API_Contracts.md`.

## UX (v1)
- Acesso por **Store** e por **Org** com filtros de período.
- Estados: `idle`, `loading`, `ready`, `error`.
- Exportação: CSV/PDF disponível via `/api/v1/report/export/`.
- Informar claramente limites do **Trial** quando aplicável.
- Visual simples e comparável (cards + tabela de ranking).

## APIs (confirmadas vs TBD)

### Confirmadas
- Autenticação, permissões e acesso por **Org/Store** já existentes.
- Health e status via endpoints atuais de **Store** / **Camera** (ver `30_system/API_Contracts.md`).
- `GET /api/v1/report/summary/` (KPIs, charts e insights)
- `GET /api/v1/report/export/` (CSV/PDF)

### TBD (não inventar endpoints)
- Endpoint(s) de relatórios semanal/mensal.
- Endpoint de ROI Dashboard.

Todos os endpoints novos devem ser definidos em `30_system/API_Contracts.md` antes de implementação.

## Cálculos e transparência do ROI
ROI v1 deve ser **explicável** e baseado apenas em métricas disponíveis.

### Fórmula base (v1)
- **ROI%** = `(Benefício Estimado - Custo Estimado) / Custo Estimado * 100`

### Benefício Estimado (v1)
Somatório de ganhos atribuídos a eventos e métricas existentes, com limites:
- **Prevenção de perdas**: usar **DetectionEvent** relacionados a perdas/fraudes quando existirem.
- **Produtividade / fila**: usar métricas agregadas disponíveis (se não existirem, marcar como `TBD`).

### Custo Estimado (v1)
Proporcional a:
- Nº de **Stores** ativas
- Nº de **Cameras** ativas
- Plano atual (ver `10_product/Pricing_Plans.md`)

### Limites e transparência
- Sempre mostrar a base do cálculo e o período.
- Se alguma métrica estiver ausente, indicar **“ROI parcial (dados incompletos)”**.
- Nunca inferir valores financeiros não confirmados; usar faixas e notas explicativas.

## DOR (Definition of Ready)
- Métricas v1 confirmadas no `30_system/Data_Model.md`.
- Contratos de API definidos (ou `TBD` marcado).
- UX definido com estados e mensagens.
- Termos alinhados ao `00_index/Glossary.md`.
- Dependências de backend/edge mapeadas.

## DOD (Definition of Done)
- Relatórios v1 funcionando para **Store** e **Org**.
- ROI Dashboard exibindo fórmula e limitações.
- Erros padronizados e mensagens legíveis.
- Testes automatizados cobrindo fluxos principais.
- Documentação atualizada (SPEC + API_Contracts).
- Registro no `70_ops/Daily_Log.md`.

## Testes
- Geração de relatório semanal por **Store** (período padrão).
- Geração de relatório mensal por **Org**.
- ROI Dashboard com dados completos e parciais.
- Erros de permissão (403), loja inexistente (404) e validação (400).
- Comportamento em **Trial** (mensagens e limites).
