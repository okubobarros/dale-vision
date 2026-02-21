# Journey - Admin (Org Admin / Store Manager)

## Objetivo
Garantir operação segura e eficiente da(s) loja(s): Edge online, câmeras ativas,
ROI publicado e alertas configurados com baixo atrito.

## Quem é
- Admin (Org Admin): administra múltiplas lojas, câmeras, ROI e equipe.
- Manager (Store Manager): administra lojas específicas (escopo por loja).
- Owner (Org Owner): faz tudo que Admin faz + billing e gestão de plano.
- Viewer: somente leitura (não faz parte desta jornada).

## Jornada (primeiro acesso)
1. Login e seleção de loja (se multi-loja).
2. Edge Setup (gera .env, instala agent, valida “Loja Online”).
3. Cadastro de câmeras (inventário inicial).
4. Teste de conexão (assíncrono; aguarda status).
5. Definição de ROI (entrada, caixa, fila, salão, etc).
6. Publicação do ROI (versão ativa).
7. Confirmação de “primeiro sinal” (health/snapshot/heartbeat).
8. Configuração de alertas e navegação para Analytics.

## Jornada (rotina diária/semana)
- Monitorar status (Loja Online, câmera degradada/offline).
- Ajustar ROI ou alertas quando necessário.
- Acompanhar alertas e métricas operacionais.
- Revisar relatório semanal (SPEC-005).

## Pontos críticos (fricções)
- Edge offline ou sem heartbeat.
- Câmera criada mas sem health (pendente).
- ROI não publicado (insights não aparecem).
- Permissões insuficientes por escopo de loja.

## O que muda no dashboard (Admin/Manager vs Viewer)
Admin/Manager pode:
- Adicionar/editar/remover câmera e testar conexão.
- Criar/editar/publicar ROI.
- Configurar alertas (limiares, cooldown, canais).
- Gerar/rotacionar token do Edge e ver heartbeat/versão.
- Convidar usuários e definir papéis (Admin/Owner).

Viewer vê (somente leitura):
- Dashboard/Analytics/Relatórios.
- Alertas (lista e detalhes).
- Câmeras (lista e status), sem ações destrutivas.
- ROI apenas leitura (quando aplicável).

## Métricas
- Tempo para primeira câmera ativa.
- Tempo para “primeiro sinal” após Edge Setup.
- % de lojas online (7 dias).
- Número de alertas acionáveis vs. ruidosos.
