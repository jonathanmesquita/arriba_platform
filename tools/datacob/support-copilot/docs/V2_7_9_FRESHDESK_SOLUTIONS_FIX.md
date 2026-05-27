# v2.7.9 - Freshdesk Solutions Fix

Corrige a busca de artigos reais do Freshdesk Solutions.

## Render env

```env
FRESHDESK_USE_SOLUTIONS_API=true
FRESHDESK_SOLUTIONS_LANGUAGE=pt-BR
FRESHDESK_SOLUTIONS_FOLDER_IDS=48000676370
FRESHDESK_KB_CACHE_TTL_MINUTES=60
```

Obrigatorio:

```env
FRESHDESK_DOMAIN=ph3a
FRESHDESK_API_KEY=sua_chave
```

## Testes

```txt
/freshdesk/solutions/status
/freshdesk/solutions/articles/48001280475?force=true
/freshdesk/solutions/search?term=BTG%20Pactual%20Novo%20fluxo&force=true
/freshdesk/solutions/folders/48000676370/articles?force=true
```

## Observacao

Se o artigo estiver em rascunho, a API key precisa ser de um agente com permissao para acessar/gerenciar Solutions.
