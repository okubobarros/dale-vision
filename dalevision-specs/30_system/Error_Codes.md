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

### SNAPSHOT_UPLOAD_FAILED
- Quando: falha ao subir snapshot (storage indisponível ou erro de upload).
- HTTP: 500
- Mensagem UX sugerida: "Falha ao enviar snapshot. Tente novamente."

## Observações
- Não inventar endpoints novos para suportar erros; quando necessário, usar `details` com o contexto.
- Para validações de campo, `details` deve conter o mapa de erros por campo no padrão DRF.
