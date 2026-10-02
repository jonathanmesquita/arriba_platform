# 📋 Backlog

Trabalho futuro já entendido. Formato em [README.md](README.md).

## Protótipo / descaracterização

- [ ] Remover do repositório o que amarra o projeto a uma empresa específica 📅 2026-10-01 🔺 alta #area/site #esforco/g
  - Contexto: o projeto é de **estudos** — vitrine de engenharia, não sistema de cliente.
    Hoje há nome de empresa, de produto e de bureau espalhados por ~200 arquivos.
  - Local: inventário em `tasks/decisoes-pendentes.md`
  - Ação: definir renomear × remover por categoria e executar numa passada só.

## Ferramentas

- [ ] Mais bancos no validador CNAB 400 📅 2026-10-01 🔽 baixa #area/ferramentas #esforco/g
  - Contexto: a arquitetura já suporta (criar `banks/<banco>.js` e registrar no registry).
  - Local: `tools/cobranca/cnab400/banks/`
  - Ação: só com manual **e** amostra real — não estimar posição "provável" (ADR-006).
- [ ] Primeira ferramenta da aba "Outros CRM" 📅 2026-10-01 🔽 baixa #area/ferramentas #esforco/m
  - Local: `assets/js/navigation-v2.js` (`crms.tabs`)
  - Ação: a aba existe vazia, com mensagem "Em breve".

## Site

- [ ] Hub de laboratórios 📅 2026-10-01 🔼 média #area/site #esforco/m 🤖
  - Contexto: `pages/lab/index.html` não é índice — é a página de um lab só, mas a navegação
    superior leva lá como se fosse hub.
  - Ação: criar o índice listando os labs, ou renomear o item do menu.
- [ ] Padronizar visualmente os 61 manuais genéricos 📅 2026-10-01 🔽 baixa #area/docs #esforco/g
  - Contexto: template sem imagem nem breadcrumb; 5 páginas "premium" mostram o alvo.
  - Nota: depende da decisão de descaracterização — pode virar remoção em vez de padronização.
- [ ] i18n PT/EN e paleta de comandos `Ctrl/Cmd+K` 📅 2026-10-01 🔽 baixa #area/site #esforco/g
- [ ] Screenshot real em `docs/preview.png` para o README 📅 2026-10-01 🔽 baixa #area/docs #esforco/p

## App de chat

- [ ] Implantar o `apps/arriba-chat-ia` 📅 2026-10-01 🔼 média #area/chat-ia #esforco/m
  - Contexto: só rodou local; precisa de Postgres gerenciado, variáveis de ambiente e
    `ENCRYPTION_KEY` fora do repositório.
- [ ] Limite de taxa no `/auth/login` 📅 2026-10-01 🔼 média #area/chat-ia #esforco/p 🤖
  - Contexto: hoje só há piso de tempo contra enumeração de usuário — não é proteção contra
    força bruta.
- [ ] Busca no histórico de conversas 📅 2026-10-01 🔽 baixa #area/chat-ia #esforco/m

## Área de testes (QA)

- [ ] Validador de login por ambiente (Playwright) 📅 2026-10-02 🔼 média #area/qa #esforco/g
  - Contexto: proposta de estrutura entregue e aprovada pela metade — o dono pediu a
    estrutura antes de codar, viu a proposta e mudou de assunto antes de confirmar.
  - Ação: confirmar o caminho (`apps/validador-login/`) e começar por um ambiente de
    exemplo público funcionando ponta a ponta (login certo, login errado, URL fora do ar).
  - Decisões já tomadas: `playwright` puro (não o runner), sem IA, segredo mascarado no
    relatório, CAPTCHA vira status e não obstáculo, `ambientes.json` real fora do git.

## Comunicados (envio de e-mail)

- [ ] Agendamento automático de disparo 📅 2026-10-02 🔼 média #area/comunicados #esforco/m
  - Contexto: o campo `agendadoPara` existe e a tela aceita data, mas nada acorda sozinho
    para disparar na hora marcada — hoje o disparo é manual.
  - Ação: um verificador periódico no próprio servidor, sem fila externa.
- [ ] Retomada de envio interrompido 📅 2026-10-02 🔼 média #area/comunicados #esforco/m 🤖
  - Contexto: se o processo cair no meio, o envio fica em ENVIANDO e os pendentes não
    seguem sozinhos. O estado está no banco, então dá para continuar de onde parou.
- [ ] Tratamento de retorno (bounce) 📅 2026-10-02 🔽 baixa #area/comunicados #esforco/g
  - Contexto: hoje "ENVIADO" significa que o servidor aceitou, não que chegou.
- [ ] Limite de taxa no login do portal 📅 2026-10-02 🔼 média #area/comunicados #esforco/p 🤖

## Identidade visual

- [ ] Esfriar menos a arte do hero 📅 2026-10-02 🔽 baixa #area/site #esforco/p 🤖
  - Contexto: a ilustração do hero (selo "AI" e o gráfico) tem turquesa e rosa pastel, que
    sobraram da paleta antiga. O véu já é terroso, mas a arte em si continua fria.
  - Ação: regerar ou recolorir `assets/img/capas-wallpaper-menus/` na paleta nova.
- [ ] Paleta dos apps em fonte única 📅 2026-10-02 🔽 baixa #area/site #esforco/m 🤖
  - Contexto: `apps/arriba-chat-ia` e `apps/comunicados` repetem os valores da paleta no
    próprio `styles.css` porque rodam fora do site e não carregam `tokens.css`. Hoje são
    três cópias para manter em sincronia.
  - Ação: gerar o `:root` dos apps a partir do `tokens.css` no build, ou publicar os tokens
    como um arquivo compartilhado.
- [ ] Conferir contraste também nos estados abertos 📅 2026-10-02 🔼 média #area/site #esforco/m 🤖
  - Contexto: `scripts/conferir-contraste.mjs` mede o que está pintado **no carregamento**.
    Os piores defeitos de tema não estavam ali — estavam no chat aberto, no mega-menu e na
    modal, que a conferência de página nunca vê. Foram achados com um segundo roteiro, que
    abria cada estado antes de medir, e esse roteiro não ficou no repositório.
  - Ação: acrescentar ao script um modo que abre os estados (chat, mega-menu, busca, painel
    de resultado, `<details>`) antes de medir, com a lista declarada por página.
- [ ] Tema escuro nos dois apps 📅 2026-10-02 🔽 baixa #area/site #esforco/m 🤖
  - Contexto: `apps/arriba-chat-ia` e `apps/comunicados` não têm tema escuro — por isso as
    cores semânticas fixas deles (`#8c2430`, `#14603c`, `#7a5a00`) ainda passam. No dia em
    que o tema entrar, elas precisam virar o par cheia/`-ink` como no site.
  - Local: `apps/*/web/src/styles.css`
