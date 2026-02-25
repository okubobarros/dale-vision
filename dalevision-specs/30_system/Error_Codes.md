# Error Codes (SSOT)

Formato padrão de erro para o backend (DRF):

```json
{
  "code": "SOME_CODE",
  "message": "Mensagem legível",
  "details": {}
}
```

Compatibilidade temporária:
- Campo `detail` pode ser enviado junto como fallback para clientes legados. **Deprecated**.

## Códigos mínimos

### PAYWALL_TRIAL_LIMIT
- Quando: trial expirado ou uso bloqueado por paywall de trial.
- HTTP: 402
- Mensagem UX sugerida: "Seu trial terminou. Assine um plano para continuar."

### LIMIT_CAMERAS_REACHED
- Quando: limite de câmeras do trial atingido.
- HTTP: 409
- Mensagem UX sugerida: "Limite de câmeras do trial atingido."

### CAMERA_VALIDATION_ERROR
- Quando: payload de câmera inválido (campos obrigatórios/formatos).
- HTTP: 400
- Mensagem UX sugerida: "Dados inválidos para câmera."

### EDGE_OFFLINE
- Quando: ação depende do edge online e ele está offline.
- HTTP: 412 (Precondition Failed)
- Mensagem UX sugerida: "Edge offline. Verifique a conexão da loja."

### SNAPSHOT_AUTH_FAILED
- Quando: autenticação de snapshot/RTSP falha.
- HTTP: 401
- Mensagem UX sugerida: "Falha de autenticação na câmera."

### RTSP_INVALID
- Quando: RTSP inválido ou malformado.
- HTTP: 400
- Mensagem UX sugerida: "RTSP inválido. Verifique o endereço."

### PERMISSION_DENIED
- Quando: usuário sem permissão para a operação.
- HTTP: 403
- Mensagem UX sugerida: "Você não tem permissão para essa ação."

### EDGE_SETUP_ERROR
- Quando: falha inesperada ao obter credenciais do edge.
- HTTP: 500
- Mensagem UX sugerida: "Erro inesperado no servidor. Tente novamente."

### EDGE_TOKEN_ROTATE_FAILED
- Quando: falha ao rotacionar/gerar token do edge.
- HTTP: 500
- Mensagem UX sugerida: "Não foi possível gerar o token do Edge."

### SUPABASE_TOKEN_INVALID
- Quando: token Supabase inválido/expirado durante bootstrap/setup-state.
- HTTP: 401
- Mensagem UX sugerida: "Sessão expirada, faça login novamente."

### SUPABASE_MISSING_CONFIG
- Quando: Supabase não configurado no backend.
- HTTP: 500
- Mensagem UX sugerida: "Estamos finalizando a configuração. Tente novamente em alguns minutos."

### ROI_UNAVAILABLE
- Quando: falha ao carregar ROI.
- HTTP: 503
- Mensagem UX sugerida: "ROI indisponível no momento."

### CAMERA_TEST_FAILED
- Quando: falha ao solicitar teste de conexão.
- HTTP: 500
- Mensagem UX sugerida: "Não foi possível testar a conexão da câmera."

### CAMERA_CREATE_FAILED
- Quando: falha inesperada ao criar câmera.
- HTTP: 500
- Mensagem UX sugerida: "Não foi possível cadastrar a câmera."

### SNAPSHOT_SIGN_FAILED
- Quando: falha ao gerar URL assinada de snapshot.
- HTTP: 502
- Mensagem UX sugerida: "Falha ao gerar URL do snapshot."

### STORAGE_NOT_CONFIGURED
- Quando: storage de snapshots não configurado no backend.
- HTTP: 503
- Mensagem UX sugerida: "Snapshot central indisponível. Fale com suporte."

### SNAPSHOT_NOT_FOUND
- Quando: não existe snapshot disponível para a câmera.
- HTTP: 404
- Mensagem UX sugerida: "Sem snapshot ainda. Faça upload ou gere via Edge."

### SNAPSHOT_MISSING
- Quando: upload sem arquivo `file`.
- HTTP: 400
- Mensagem UX sugerida: "Envie o arquivo do snapshot."

### SNAPSHOT_INVALID_TYPE
- Quando: upload com tipo inválido (não JPEG/PNG).
- HTTP: 400
- Mensagem UX sugerida: "Envie uma imagem JPEG ou PNG."

### SNAPSHOT_UPLOAD_FAILED
- Quando: falha ao subir snapshot (storage indisponível ou erro de upload).
- HTTP: 502
- Mensagem UX sugerida: "Falha ao enviar snapshot. Tente novamente."

### SNAPSHOT_FAILED
- Quando: falha inesperada ao carregar snapshot.
- HTTP: 500
- Mensagem UX sugerida: "Não foi possível carregar o snapshot."

## Observações
- Não inventar endpoints novos para suportar erros; quando necessário, usar `details` com o contexto.
- Para validações de campo, `details` deve conter o mapa de erros por campo no padrão DRF.
- `GET /api/me/setup-state/` pode retornar header `X-Schema-Warnings` quando detectar schema desatualizado.
