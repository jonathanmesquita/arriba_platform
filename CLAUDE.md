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
- [ ] **Parte 3 — Unificar catálogo de erros.** Canônica: `erros/erros-datacob.html` (13KB).
  Antes de apagar a de 3KB, rodar `grep -rl "pages/docs/datacob/erros-datacob"` e reapontar
  TODAS as referências (`assets/js/navigation-v2.js`, `pages/docs/help-center/index.html`)
  para a canônica; só então `git rm pages/docs/datacob/erros-datacob.html`.
- [ ] **Parte 4 — Base de Conhecimento.** Expor os ~66 manuais internos hoje enterrados em
  `tools/datacob/support-copilot/docs/` como seção de primeira classe.
- [ ] i18n PT/EN · command palette `Ctrl/Cmd+K`.

## Convenções de trabalho

- Antes de apagar qualquer arquivo, **verificar referências com `grep`** — nunca remover às cegas.
- Commits pequenos e por parte. Mensagens no formato `tipo(escopo): descrição`.
- Respostas e comentários em **português (Brasil)**.
- Preservar o visual/tom retro-criativo e a paleta Deep Autumn/Redwood em todos os entregáveis.
