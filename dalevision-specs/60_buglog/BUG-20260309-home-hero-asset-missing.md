# BUG-20260309-home-hero-asset-missing

## Resumo
A landing em produção (`https://app.dalevision.com/`) exibiu a hero sem a imagem esperada porque o código referenciava um asset inexistente (`/hero-store-floor.png`) e o arquivo real (`hero_coffee.png`) não havia sido publicado em `frontend/public`.

## Passos para reproduzir
1. Abrir a landing após o deploy da nova hero.
2. Observar a área visual à direita da hero.

## Resultado esperado
A hero deve exibir a foto operacional do café/restaurante com o overlay de análise (`DADOS REAIS`, `CAM 04 — STORE FLOOR`, `AI ANALYSIS ACTIVE`).

## Resultado atual
A área visual renderiza apenas o fundo escuro/gradiente, sem a imagem principal.

## Evidências e logs
- Código apontava para `url('/hero-store-floor.png')` em `frontend/src/pages/Home/Home.tsx`.
- `frontend/public` não continha `hero-store-floor.png` nem `hero_coffee.png` no momento da investigação.
- Arquivo real localizado em `C:\Users\Alexandre\Downloads\hero_coffee.png`.

## Causa raiz
- Mismatch entre o nome/path usado no JSX e o nome real do asset.
- Asset não versionado/copied para `frontend/public` antes do deploy.

## Correção aplicada
- Copiado `hero_coffee.png` para `frontend/public/hero_coffee.png`.
- Atualizado `frontend/src/pages/Home/Home.tsx` para usar `url('/hero_coffee.png')`.

## Impacto
- Severidade: Média
- Usuários afetados: visitantes da landing / pipeline comercial
- Efeito: percepção de produto degradada na primeira dobra

## Prevenção
- Todo asset de landing deve entrar via import versionado ou existir em `frontend/public` antes do merge.
- Validar o request do asset na aba Network como parte do checklist pré-deploy.

## Status
- Resolvido no código
- Pendente: deploy do frontend e validação em produção
