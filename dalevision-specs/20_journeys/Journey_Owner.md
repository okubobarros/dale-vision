# Journey - Owner

## Objetivo
Jornada do dono da organização desde onboarding até operação recorrente.

## Etapas
1. Cadastro e login
2. Confirmação de e-mail (callback)
3. Criação de loja (trial inicia)
4. Onboarding dinâmico (próximo passo guiado)
5. Edge setup (token, download e instalação)
   - Baixar e extrair ZIP do edge-agent
   - Configurar `.env` com `EDGE_TOKEN`, `STORE_ID`, `AGENT_ID`, `CLOUD_BASE_URL`
   - Teste: `01_TESTE_RAPIDO.bat`
   - Produção: `02_INSTALAR_AUTOSTART.bat`
   - Verificar: `03_VERIFICAR_STATUS.bat`
   - Referência: `README.txt` do ZIP
   - Diagnóstico: `Diagnose.bat` (gera ZIP para suporte)
   - Instalacao copia o bundle para `C:\ProgramData\DaleVision\EdgeAgent\dalevision-edge-agent-windows`
6. Adição de câmeras
7. Validação de câmeras + ROI
8. Dashboard + alertas
9. Trial expira → relatório final (diagnóstico de impacto) + upgrade
10. Pós-upgrade: relatório contínuo com período customizado + export

## Fricções
- Dificuldade em seguir a sequência correta de scripts do edge-agent.
- Falhas de RTSP/credenciais.
- Link de confirmação pode demorar (fallback para onboarding).
- Recuperação de senha deve ser rápida e sem vazamento de usuário.

## Eventos e métricas
- Tempo para primeira câmera ativa.
- Conversão de trial.
- Visualização do relatório de impacto.
- Cliques em CTA de upgrade.
