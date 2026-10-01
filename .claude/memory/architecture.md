# Padrões de Arquitetura — Arriba Platform

> **Este arquivo é o MAPA: onde cada coisa mora e qual arquivo manda em quê.**
> O *porquê* de cada escolha está em [decisions.md](decisions.md); as armadilhas de
> cada ferramenta (posições de CNAB, limites do AlaSQL, sandbox do iframe) continuam
> no `CLAUDE.md` da raiz, que é a fonte única delas — não copie para cá.

## Dois mundos no mesmo repositório

| | Site (`assets/`, `tools/`, `pages/`, `index.html`) | Aplicações (`apps/`) |
|---|---|---|
| Stack | HTML/CSS/JS puro + Bootstrap 5 via CDN | React + Vite · Express + Prisma/Postgres |
| Build | **nenhum** — o arquivo servido é o arquivo editado | `npm run build` próprio de cada app |
| Deploy | Vercel, no push | ainda não implantado |
| Dependência | só CDN, com SRI | `package.json` próprio |

`.vercelignore` exclui `apps/` do deploy do site. **Não importe nada de `apps/` a partir de
`assets/` ou `tools/`** — o site não tem bundler para resolver isso, e o código-fonte do app
iria para o ar como arquivo estático.

## Quem manda em quê (fonte única)

| Assunto | Arquivo | Quem consome |
|---|---|---|
| Menu + busca | `assets/js/navigation-v2.js` (`menuData`, `searchItems`) | mega-menu, busca do topo, `assets/js/search.js` |
| Cores / tema | `assets/css/tokens.css` | todas as páginas (linkar **antes** dos outros CSS) |
| Dark mode | `assets/js/theme.js` (`body.dark-mode`) | site inteiro |
| Layouts CSV do cobrança | `tools/cobranca/arriba-csv-generator/layouts-csv.js` | gerador CSV + validador de CSV |
| Motor de arquivo posicional | `tools/cobranca/cnab400/engine.js` | CNAB 400 (`banks/*.js`) **e** bureau de crédito (`layouts/*.js`) |
| Processo de negativação | `tools/cobranca/bureau/processo.js` | ferramenta bureau de crédito + página do processo |
| Base de erros do cobrança | `assets/data/cobranca-knowledge-base.js` | página de erros, chatbot, support-copilot, base do chat-ia |
| Respostas prontas | `assets/data/respostas-predefinidas.js` | support-copilot + página standalone |
| Schema do sandbox SQL | `assets/data/sandbox-schema.js` | lições do Track 7 + SQL Playground |
| Semeadura/execução AlaSQL | `assets/js/sql-sandbox.js` | Track 7 + SQL Playground |
| Histórico/consultas SQL | `assets/js/sql-query-store.js` | Track 7 + SQL Playground |
| Gamificação de trilhas | `assets/js/gamification.js` | Track 7 (e trilhas futuras) |
| Dados fictícios BR | `assets/js/fake-data-br.js` | massa de dados e demais geradores |
| Provedores de IA do site | `assets/js/llm-providers.js` | `assets/js/chatbot.js` |

Mexeu em `navigation-v2.js`? Rode `node --check` — não há build para acusar erro de sintaxe.

## Camadas do `apps/arriba-chat-ia`

```
web/src/api/client.ts        único lugar que fala com a API (sempre credentials: "include")
      src/auth/              sessão + rotas protegidas
      src/pages/             Login · Chat · Admin
server/src/index.ts          sobe o servidor (env validado ANTES dos imports da aplicação)
          env.ts             configuração validada com zod — não sobe incompleto
          db.ts              cliente Prisma único, criado no primeiro uso
          auth/              scrypt + JWT em cookie HttpOnly + middleware
          chat/              conversas e streaming SSE
          knowledge/         importação do portal, busca e montagem de contexto
          providers/         um adapter por provedor + catálogo, registry e erros
          admin/             provedores, usuários, auditoria, base de conhecimento
          http/errors.ts     formato único de erro
```

Regra de dependência: `routes` → `service` → `provider|prisma`. Nada em `providers/` conhece
Express, e nada em `web/` importa tipo do Prisma — o front tem os tipos do JSON em
`web/src/components/tipos.ts`.

## Onde as coisas NÃO estão

- **Não há backend do site neste repositório.** O `arriba-api` (Render) é outro repo.
- **Não há banco de dados do cobrança em lugar nenhum daqui.** Sandbox e playground rodam
  AlaSQL no navegador, com dados inventados.
- **Não há segredo versionado.** Chave de IA do site fica no `localStorage` de quem digitou;
  a do `apps/arriba-chat-ia` fica cifrada no banco do app.
