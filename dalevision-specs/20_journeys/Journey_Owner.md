# Journey - Owner

## Objetivo
Jornada do dono da organização desde onboarding até operação recorrente.

## Etapas
1. Cadastro e login
2. Confirmação de e-mail (callback)
3. Criação de loja (trial inicia)
4. Edge setup (token, download e instalação)
   - Baixar e extrair ZIP do edge-agent
   - Configurar `.env` com `EDGE_TOKEN`, `STORE_ID`, `AGENT_ID`, `CLOUD_BASE_URL`
   - Teste: `02_TESTE_RAPIDO.bat`
   - Produção: `03_INSTALAR_AUTOSTART.bat`
   - Verificar: `04_VERIFICAR_STATUS.bat`
   - Referência: `README.txt` do ZIP
   - Diagnóstico: `Diagnose.bat` (gera ZIP para suporte)
5. Adição de câmeras
6. Dashboard + alertas
7. Upgrade / renovação

## Fricções
- Dificuldade em seguir a sequência correta de scripts do edge-agent.
- Falhas de RTSP/credenciais.
- Link de confirmação pode demorar (fallback para onboarding).
- Recuperação de senha deve ser rápida e sem vazamento de usuário.

## Eventos e métricas
- Tempo para primeira câmera ativa.
- Conversão de trial.
