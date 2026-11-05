# 📋 Backlog

Trabalho futuro já entendido. Formato em [README.md](README.md).

## Qualidade do site

- [ ] Testes para a lógica pura do site 📅 2026-10-02 🔼 média #area/ferramentas #esforco/m 🤖
  - Contexto: os dois apps têm 77 testes; o **site não tem nenhum**. E é no site que mora a
    lógica onde errar é caro: `parser.js` (RFC 4180 — aspas, `""` escapado, delimitador e
    quebra de linha dentro do campo), `engine.js` do CNAB (fatias 1-indexadas do manual),
    `rules.js` (CPF/CNPJ, data) e `fake-data-br.js`. São ~1.070 linhas, **todas sem DOM**:
    `node --test` roda os módulos como estão, verificado.
  - Local: `tools/dados/csv-validator/`, `tools/cobranca/cnab400/engine.js`, `assets/js/`
  - Ação: `scripts/package.json` já existe para ferramenta de manutenção; acrescentar
    `npm test` ali, começando pelo parser de CSV, que é o de regra mais sutil.
- [ ] Apagar a cópia morta do patch de Tipo_Registro 📅 2026-10-02 🔽 baixa #area/ferramentas #esforco/p 🤖
  - Contexto: `patch-tipo-registro-layout.js` (251 linhas) não é carregado por página nenhuma
    — o HTML só carrega `script.js` e `bmp-layout.js`. A sequência que ele define já está
    dentro de `script.js:7`. São duas cópias da mesma tabela, e só uma é usada: quem editar
    a errada não vê efeito. `LAYOUT_FIX.md` documenta correção de layout já aplicada.
  - Local: `tools/cobranca/arriba-csv-generator/`
  - Ação: conferir com `grep` que nada referencia (feito) e remover os dois.

## Ferramentas

- [ ] Mais bancos no validador CNAB 400 📅 2026-10-01 🔽 baixa #area/ferramentas #esforco/g
  - Contexto: a arquitetura já suporta (criar `banks/<banco>.js` e registrar no registry).
  - Local: `tools/cobranca/cnab400/banks/`
  - Ação: só com manual **e** amostra real — não estimar posição "provável" (ADR-006).

## Site

- [ ] Hub de laboratórios 📅 2026-10-01 🔼 média #area/site #esforco/m 🤖
  - Contexto: `pages/lab/index.html` não é índice — é a página "Comportamento e UX", mas o
    item "Laboratório" do topo leva lá como se fosse hub. O mega-menu já lista os quatro labs.
  - Ação: criar o índice listando os labs, ou renomear o item do menu.
- [ ] i18n PT/EN e paleta de comandos `Ctrl/Cmd+K` 📅 2026-10-01 🔽 baixa #area/site #esforco/g

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

## API privada (`arriba-api`)

Pedido de 05/11: API só para o dono testar, depois uma plataforma de controle de API com
APIs públicas e gratuitas, depois integração com IA. A primeira fase está no ar desde 05/11 (PR #1 do
`arriba-api`), com a tela "Validar e consultar pela API" no site.

- [ ] Conferir as consultas reais (CEP, CNPJ, bancos) 📅 2026-11-05 🔼 média #area/infra #esforco/p
  - Contexto: a API está no ar e privada, e a validação foi conferida ao vivo (CNPJ
    alfanumérico, 200 com chave). As consultas não: ViaCEP e BrasilAPI ficam fora da rede da
    sessão que escreveu o código, e os testes simulam as respostas.
  - Ação: na tela "Validar e consultar pela API" (ou no Postman), consultar um CEP duas vezes
    (a segunda deve vir `cache: true`), um CNPJ real e um banco. Se o formato vier diferente,
    o ajuste é em `modules/consulta/publicas.js` do `arriba-api`.
- [ ] Plataforma de controle de API 📅 2026-11-05 🔼 média #area/infra #esforco/g
  - Contexto: fase 2 do pedido. A base já existe: as consultas de `/v1/consultar` têm
    tempo-limite, cache, fonte e tempo de resposta em cada chamada.
  - Ação: registrar cada chamada (rota, fonte, status, ms, se veio do cache) e mostrar numa
    tela — volume, erro e lentidão por API. Antes, decidir onde guardar: o plano grátis do Render não tem
    disco, então é banco gerenciado (Postgres/KV) ou só memória.
  - Candidatas grátis e sem chave para somar: BrasilAPI (feriados, DDD, FIPE, ISBN),
    IBGE (localidades), Banco Central (câmbio PTAX, SGS).
- [ ] Integração com IA na API (OpenAI, Gemini e outros) 📅 2026-11-05 🔼 média #area/chat-ia #esforco/m
  - Contexto: fase 3. Já há **três** implementações de provedor: `llm-providers.js` no site
    (BYOK), `apps/arriba-chat-ia` (multi-provedor no servidor) e o `/chat` do `arriba-api`
    (só OpenAI). Uma quarta seria mais uma cópia para manter.
  - Ação: decidir qual delas a API reaproveita; a chave do provedor fica em variável da
    hospedagem, nunca no código, e a rota passa pelo mesmo portão de acesso.

## Do status de nov/2026

Itens do documento de status do dono que viram trabalho. Os que contradizem decisões já
tomadas estão em `decisoes-pendentes.md`, não aqui.

- [ ] Ligar o login com Microsoft de ponta a ponta 📅 2026-11-04 🔺 alta #area/infra #esforco/p
  - Contexto: o backend está pronto no `arriba-api`, branch `claude/gerador-arquivos-web-n2oi6p`
    (`3817965`, 21 testes): confere assinatura, emissor, audiência, validade e escopo, e recusa
    tenant genérico e token do Graph. Falta o que não é código desta API.
  - Ação: (1) no registro do app, *Expor uma API* com o escopo `access_as_user`; (2) em
    `auth/callback/`, trocar o escopo padrão `User.Read` (token do Graph, que a API recusa)
    por `api://<client-id>/access_as_user`; (3) definir `AZURE_TENANT_ID`, `AZURE_API_AUDIENCE`
    e **`ARRIBA_JWT_SECRET`** no Render; (4) abrir o PR do branch.
  - Nota: nenhuma rota confere papel (`role`) — quem entra pelo Microsoft acessa o mesmo que o
    admin. Se for para ter diferença, é a próxima peça.
- [ ] Teste de carga dos 3 endpoints Escobs — ⏸️ em espera (decisão do dono, 05/11) 📅 2026-11-04 🔽 baixa #area/qa #esforco/m
  - Contexto: collection e environments do Postman foram entregues e validados (freio
    automático 10/10, login 6/6), mas só existem como download: o ambiente foi reciclado e o
    repositório privado não chegou a ser criado. Decidido: k6 contra o mock para volume,
    Newman para o cenário de registros, `dados-cadastrais` fora do escopo.
  - Ação: criar o repositório PRIVADO primeiro; depois mock, k6 e `COMO_RODAR.md`.
- [ ] Ranking e personagens na gamificação 📅 2026-11-04 🔽 baixa #area/site #esforco/m
  - Contexto: o status lista "plataforma gamificada estilo W3Schools" como ideia, mas o
    Centro de Aprendizado e o `gamification.js` (pontos, badges, progresso) já existem.
    Falta só o que é novo: ranking e personagens.
  - Local: `assets/js/gamification.js`
- [ ] Publicar os prompts de code review e auditoria de segurança como páginas 📅 2026-11-04 🔽 baixa #area/site #esforco/p
  - Contexto: estão prontos como texto, fora do site.
- [ ] Tirar o descriptografador do ar (Vercel e GitHub) 📅 2026-11-04 🔼 média #area/infra #esforco/p
  - Contexto: o link já saiu do menu e da busca. Falta a parte que só o dono faz: remover o
    projeto da Vercel e arquivar ou apagar o repositório — apagar não tem volta.
