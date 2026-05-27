# v2.8 - Auth + Permission UX

## Frontend
O Support Copilot agora tem overlay de login opcional quando a API retorna `AUTH_REQUIRED`.

## Freshdesk Solutions
Quando a base de conhecimento retornar erro 401/403, a tela exibe um popup suave explicando que a API Key precisa ter permissão para Solutions.

## Modo seguro
Nada grava no Freshdesk. O modo seguro continua controlado por:

```env
FRESHDESK_ENABLE_WRITES=false
SUPPORT_COPILOT_AUTO_NOTE=false
```
