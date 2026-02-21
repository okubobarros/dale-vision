# ADR-0003 - Camera Validation Strategy

## Contexto
O cadastro de câmera no backend deve aceitar dados mínimos e não bloquear por conectividade.
A validação de rede (RTSP/snapshot) depende do Edge Agent e do ambiente local.

## Decisão
- Backend **não** valida conectividade no `create`.
- Backend valida apenas formato e campos obrigatórios.
- Conectividade e health são verificados pelo Edge Agent após o cadastro.

## Consequências
- Criação de câmera é rápida e previsível.
- Erros de rede são tratados como estado operacional, não como falha de cadastro.
- Frontend deve exibir status de health após criação.

## Alternativas
- Validar RTSP/snapshot no Backend: rejeitado por instabilidade de rede e bloqueios em loja.
