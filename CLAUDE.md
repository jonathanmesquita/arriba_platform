# CLAUDE.md

Contexto e convenções do projeto para agentes de IA (Claude Code). Mantenha este
arquivo atualizado quando decisões de arquitetura mudarem.

## O que é

**Arriba Platform** (`arriba.jm.dev.br`) — hub de ferramentas e utilitários para o
time de suporte técnico + base de conhecimento + portfólio pessoal do Jonathan.
Evoluindo **por partes** rumo a um visual Oracle Redwood (terroso, minimalista).

## Stack e hospedagem

- **Frontend:** HTML/CSS/JavaScript puro + Bootstrap 5 (via CDN). **Sem framework, sem
  build step** — decisão intencional (ferramentas pequenas, carregam instantâneo, deploy
  estático). Não introduza React/Vue/Tailwind/bundler sem pedido explícito.
- **Backend:** `arriba-api` — Node.js + Express, **API JSON pura** (sem template engine).
  Integrações OpenAI e Freshdesk. Hospedado no Render.
- **Infra/DNS:** Cloudflare (`jm.dev.br`). Deploy do front na Vercel (push → deploy automático).

## Regra de ouro: fonte única

Estes recursos são definidos em **um lugar só**. Ao mudar, edite apenas a fonte:

- **Menu + busca:** `assets/js/navigation-v2.js`. O mega-menu é **gerado por JS**, não é
  HTML fixo. Adicionar item ao menu = adicionar em `datacobtools.links`/`dados.links`;
  adicionar à busca = adicionar em `searchItems`. Rode `node --check` após editar.
- **Cores / design tokens:** `assets/css/tokens.css`. Define os tokens canônicos `--rw-*`
  e aliases curtos (`--bg`, `--red`, ...). Ferramentas devem **linkar tokens.css e remover
  o `:root{}` inline** — os aliases garantem que nada quebra durante a migração.
- **Dark mode:** ativado por `body.dark-mode` (ver `assets/js/theme.js`). Salvo em localStorage.

## Como adicionar uma ferramenta

1. Criar `tools/<categoria>/<nome>/<nome>.html` + `script.js` (padrão: topbar → hero →
   sidebar/main, `.btn-arriba`, `.panel`, `.card-section`). Copiar de uma ferramenta existente.
2. Linkar `tokens.css` **antes** dos outros CSS; não duplicar `:root`.
3. Registrar no menu e na busca em `navigation-v2.js` (fonte única acima).
4. Processamento de arquivo deve ser **client-side** (privacidade + custo zero + sem
   cold-start do Render). Só usar o backend para IA/Freshdesk.

## Gotchas específicos

- **CNAB 400** (`tools/datacob/cnab400-bradesco/`): posições do manual são **1-indexadas e
  inclusivas**; `slice()` é 0-indexado exclusivo → usar `slice(ini-1, fim)`. Já validado
  byte a byte contra o layout Bradesco e arquivos reais. Não "consertar" as posições.
- **Base64** (`tools/dados/base64/` e `base64-pdf/`): decode 100% no browser; detecta tipo
  por magic bytes (`%PDF`). O `base64-pdf` extrai Base64 embutido em JSON automaticamente.
- **Dados que parecem código são dados:** `assets/data/datacob-knowledge-base.js` é usado
  pela página de erros, pelo chatbot e pelo support-copilot. Não remover.

## Status por partes

- [x] **Parte 1 — Limpeza.** Órfãos confirmados sem referência (seguro remover):
  `index_old_2.html`, `pages/lab/index_lab.html`, `pages/lab/psychology/index.html`,
  `components/splash.html`, `assets/js/tools/json_validador.js`, `desktop.ini`.
  Adicionar ao `.gitignore`: `desktop.ini .DS_Store Thumbs.db dist/ .vercel/ .env*`
- [x] **Parte 2 — Tokens CSS** em fonte única (`assets/css/tokens.css`) + README de portfólio.
- [x] **Parte 3 — Catálogo de erros unificado.** Canônica agora em
  `pages/docs/datacob/erros-datacob.html` (13KB, ex-`erros/erros-datacob.html`).
  `support-copilot/docs/datacob/` renomeado para `docs/datacob-manuais/`; todas as
  referências (`search.js`, `index.html`, `navigation-v2.js`, `manuals-index*.js`,
  autorreferências internas dos manuais) reapontadas.
- [x] **Parte 4 (parcial) — Base de Conhecimento navegável.** Dados de
  `manuals-index.js`/`manuals-index-2025.additions.js` limpos (sem entradas fictícias,
  quebradas ou duplicadas; 65 manuais reais indexados 1x cada). Hub +
  20 páginas de índice por categoria em `docs/datacob-manuais/<categoria>/index.html`.
  Integrado ao mega-menu, à busca do topo e ao Knowledge Router do Help Center.
  - [ ] **Pendente:** padronizar visualmente os 61 manuais "genéricos" (template
    `manual-2025.css`, sem imagem/breadcrumb) para o nível dos 5 "premium"
    (`article.css` próprio, imagens, breadcrumb, CTA).
- [ ] i18n PT/EN · command palette `Ctrl/Cmd+K`.
- [ ] Screenshot/GIF real em `docs/preview.png` para o README de portfólio (ainda placeholder).

## Convenções de trabalho

- Antes de apagar qualquer arquivo, **verificar referências com `grep`** — nunca remover às cegas.
- Commits pequenos e por parte. Mensagens no formato `tipo(escopo): descrição`.
- Respostas e comentários em **português (Brasil)**.
- Preservar o visual/tom retro-criativo e a paleta Deep Autumn/Redwood em todos os entregáveis.
