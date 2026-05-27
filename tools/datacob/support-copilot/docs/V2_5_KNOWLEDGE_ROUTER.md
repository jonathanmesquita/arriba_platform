# v2.5 - Knowledge Router

Esta versão adiciona busca e sugestão de manuais por rotina, módulo e cliente.

## Frontend

Arquivos adicionados:

```txt
pages/docs/help-center/assets/manuals-index.js
pages/docs/help-center/assets/manual-router.js
pages/docs/help-center/assets/manual-router.css
```

Arquivos alterados:

```txt
pages/docs/help-center/index.html
tools/datacob/support-copilot/support-copilot.html
tools/datacob/support-copilot/support-copilot.js
tools/datacob/support-copilot/support-copilot.css
```

## Backend

Arquivos adicionados:

```txt
arriba-api/modules/knowledge/manualCatalog.js
arriba-api/modules/knowledge/manualSearch.js
```

Rotas adicionadas:

```http
GET /freshdesk/manuals
GET /freshdesk/manuals/search
POST /freshdesk/manuals/match
```

## Fluxo no Copilot

1. O ticket é buscado no Freshdesk.
2. O texto do ticket é usado para buscar base local/Freshdesk e também manuais.
3. A aba Base mostra artigos e manuais sugeridos.
4. O analista pode abrir artigo, copiar checklist e consultar rotinas.

## Modo seguro

Nada é gravado no Freshdesk.
