# 🐞 Bugs

Defeitos abertos. Formato em [README.md](README.md).

- [ ] O modelo `.env.example` dos dois apps nunca foi para o GitHub 📅 2026-11-04 🔼 média #area/chat-ia #esforco/p 🤖
  - Contexto: o `.gitignore` da raiz tem `.env.*`, que também casa com `.env.example`. O
    README de `apps/arriba-chat-ia` manda `cp .env.example server/.env` — quem clona não tem
    o arquivo. Vale para `apps/comunicados` também.
  - Local: `.gitignore:35`; `apps/*/README.md`
  - Ação: acrescentar `!.env.example` ao `.gitignore` e recriar os dois modelos a partir de
    `server/src/env.ts` de cada app, só com nomes de variável e valores vazios.
- [ ] Cartão da vitrine cobre a pergunta no hero da home 📅 2026-11-04 🔽 baixa #area/site #esforco/p 🤖
  - Contexto: em 1280 px o cartão "Portal de ferramentas" fica por cima de "Qual arquivo
    precisa ser validado agora?". Aparece no `docs/preview.png` do README.
  - Local: `index.html`, `.assistant-card` e o cartão de capa do carrossel
- [ ] Link morto para a documentação do layout no Gerador de CSV 📅 2026-10-02 🔼 média #area/ferramentas #esforco/p 🤖
  - Contexto: o botão "📘 Documentação do layout padrão" aponta para `docs/layout-padrao.html`,
    que não existe — a pasta `docs/` dessa ferramenta não existe. Provável remoção na
    descaracterização sem tirar o botão.
  - Local: `tools/cobranca/arriba-csv-generator/csv-template-generator.html:806`
  - Ação: recriar a página ou remover o botão.
- [ ] Backend externo preso em `source: "local-fallback"` 📅 2026-10-01 🔼 média #area/infra #esforco/m
  - Contexto: as rotas de IA do backend nunca usam o provedor configurado — caem sempre no
    conhecimento local. Suspeita de variável de ambiente ausente no serviço hospedado.
  - Local: fora deste repositório (serviço de API)
  - Ação: conferir variáveis e log do serviço. Hoje o chat do site não depende mais disso.
- [ ] Relevância ruim no fallback local do backend externo 📅 2026-10-01 🔽 baixa #area/infra #esforco/m
  - Contexto: num teste, devolveu artigo errado para a pergunta.
  - Ação: comparar com a busca do `apps/arriba-chat-ia`, que já ordena por relevância medida.
