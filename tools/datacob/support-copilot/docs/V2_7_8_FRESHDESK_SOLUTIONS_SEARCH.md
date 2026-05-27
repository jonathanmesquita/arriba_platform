# v2.7.8 - Freshdesk Solutions Search

## Objetivo
Permitir que o Support Copilot busque artigos reais da Base de Conhecimento do Freshdesk e abra o link direto do artigo.

## Caso testado
Artigo: `BTG Pactual- Novo fluxo para forçar encerramentos de ticket - não tabulado`
URL: `https://ph3a.freshdesk.com/a/solutions/articles/48001280475?lang=pt-BR`

## Variáveis no Render
```env
FRESHDESK_USE_SOLUTIONS_API=true
FRESHDESK_SOLUTIONS_LANGUAGE=pt-BR
FRESHDESK_SOLUTIONS_FOLDER_IDS=48000676370
FRESHDESK_KB_CACHE_TTL_MINUTES=60
```

## Testes
```text
https://api.arriba.jm.dev.br/freshdesk/solutions/articles/48001280475
https://api.arriba.jm.dev.br/freshdesk/solutions/search?term=BTG%20Pactual%20Novo%20fluxo
https://api.arriba.jm.dev.br/freshdesk/solutions/folders/48000676370/articles
```
