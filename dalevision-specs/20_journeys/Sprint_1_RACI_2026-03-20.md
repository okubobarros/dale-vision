# Sprint 1 - Matriz RACI de Execucao

Data: `2026-03-20`
Escopo: itens `UX-01`, `UX-02`, `UX-03`, `UX-07`, `UX-13`
Referencias:
- `Sprint_1_PRD_UX_2026-03-20.md`
- `Sprint_1_Tickets_Execution_2026-03-20.md`

## Papéis
- `PM`: Product Manager
- `PD`: Product Designer
- `FE`: Frontend Engineer
- `BE`: Backend Engineer
- `DE`: Data/Analytics Engineer
- `QA`: Quality Engineer
- `CS`: Customer Success / Operacao
- `TL`: Tech Lead / Arquitetura

Legenda:
- `R` = Responsible (executa)
- `A` = Accountable (aprova/decide)
- `C` = Consulted (consulta obrigatoria)
- `I` = Informed (informado)

## RACI por iniciativa

| Iniciativa | PM | PD | FE | BE | DE | QA | CS | TL |
|---|---|---|---|---|---|---|---|---|
| UX-01 Ativacao/Callback | A | R | R | C | C | R | I | C |
| UX-02 Pos-login explainer | A | R | R | I | C | R | C | C |
| UX-03 Edge checklist | A | C | R | R | C | R | C | A |
| UX-07 Escalada tecnica | A | C | R | R | C | R | C | A |
| UX-13 Upgrade por prova | A | R | R | R | C | R | C | C |

## RACI por tipo de decisao

| Decisao | PM | PD | FE | BE | DE | QA | CS | TL |
|---|---|---|---|---|---|---|---|---|
| Priorizacao de escopo sprint | A | C | C | C | I | I | C | C |
| Copy de UX e mensageria critica | A | R | C | I | I | C | C | I |
| Contrato de endpoint e payload | C | I | C | R | C | I | I | A |
| Schema de eventos de tracking | C | I | C | C | R | I | I | A |
| Critérios de aceite finais | A | C | C | C | C | R | C | C |
| Go-live e rollback decision | A | I | C | C | C | R | C | A |

## Cadencia operacional recomendada
1. Planejamento (D0): PM + TL validam ordem dos tickets e dependencias.
2. Design review (D1-D2): PD valida fluxos e handoff com FE/BE.
3. Tech design (D2): FE/BE/DE congelam contratos e eventos.
4. Build (D3-D8): execucao paralela por trilha com sync diario curto.
5. QA + UAT (D9-D10): QA conduz regressao; CS valida aderencia operacional.
6. Go/No-Go (D10): PM + TL decisao final com base em checklist.

## Checklist de Go/No-Go
- Todos os criterios de aceite P0 atendidos.
- Tracking de eventos validado em homologacao.
- Nenhum bug aberto severidade alta para rotas criticas.
- Plano de rollback documentado para cada fluxo alterado.
- CS treinado para novas mensagens e novos caminhos de escalada.

## Riscos de governanca e controle
- Risco: decisoes de copy sem dono unico.
  - Controle: PM `A`, PD `R` para copy final.
- Risco: conflitos FE/BE em contrato de checklist edge.
  - Controle: TL `A` para congelar contrato antes do build.
- Risco: tracking incompleto no go-live.
  - Controle: DE `R` + QA gate obrigatorio de eventos.
