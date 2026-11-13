# CLAUDE.md

Contexto e convenções do projeto para agentes de IA (Claude Code). Mantenha este
arquivo atualizado quando decisões de arquitetura mudarem.

## O que é

**Arriba Platform** — **protótipo de estudos** em fullstack: validadores de arquivo
(posicional e CSV), geradores, simulador SQL, editor web com preview ao vivo e um app de
chat com IA. Tudo que é ferramenta roda **no navegador**; o único backend é o do app de
chat, em `apps/`. **Exceções:** a tela "Validar e consultar pela API"
(`tools/dados/api-privada/`) e a página de administração do chat (`pages/admin/`) chamam
a Arriba API, que mora em **outro repositório** (`arriba-api`, privado, no Render) — as
duas pelo mesmo módulo, `assets/js/arriba-api.js`.

**Não há conteúdo de empresa aqui.** Em out/2026 o projeto foi descaracterizado: saíram os
87 manuais de operação (alguns com nome de cliente no caminho do arquivo), a base de erros,
as respostas prontas, o copiloto de suporte e os layouts de negativação gerados a partir de
planilhas de cliente. Ficou a engenharia — parsers, motores, sandbox e UI — com nomes
neutros. Ao acrescentar algo, **não reintroduza nome de empresa, produto, cliente ou
bureau**; dado de exemplo é fictício, sempre.

## Stack e hospedagem

- **Site:** HTML/CSS/JavaScript puro + Bootstrap 5 (via CDN). **Sem framework, sem build
  step** — decisão intencional (ferramentas pequenas, carregam instantâneo, deploy
  estático). Não introduza React/Vue/Tailwind/bundler no site sem pedido explícito.
- **`apps/` é exceção à regra acima, e só ela.** A pasta guarda aplicações que **não fazem
  parte do site**: têm build próprio, backend e banco. Hoje há `apps/arriba-chat-ia/`
  (React + Vite + Express + Prisma/Postgres) e `apps/comunicados/` (React + Vite + Express +
  Prisma/**SQLite**). `.vercelignore` exclui `apps/` do deploy,
  senão o código-fonte iria para o ar como arquivo estático. Cada app tem o próprio README
  e `package.json` — **não** misture dependência de app com o site, e não importe nada de
  `apps/` a partir de `assets/` ou `tools/`.
- **Deploy:** Vercel (push → deploy automático). O app de chat ainda não foi implantado.

## Estrutura de trabalho do repositório

| Onde | O que guarda |
|---|---|
| `CLAUDE.md` | este arquivo: contexto, convenções e armadilhas por ferramenta |
| `.claude/memory/` | [arquitetura](.claude/memory/architecture.md) (mapa), [decisões](.claude/memory/decisions.md) (ADRs) e [padrões](.claude/memory/patterns.md) (snippets) |
| `.claude/rules/` | regras de comportamento por caminho (idioma, fila de trabalho) |
| `tasks/` | a fila: `backlog`, `bugs`, `ideas`, `decisoes-pendentes`, `concluidas` |
| `scripts/` | `changelog.sh`, o hook de commit e `conferir-contraste.mjs` |

**Pendência identificada e não executada agora vira item em `tasks/`** — não comentário
`// TODO`, não só na conversa. O que depende de decisão do dono vai para
`tasks/decisoes-pendentes.md` e o trabalho continua pelo que não depende dela.

Commits em **Conventional Commits** (`tipo(escopo): descrição`), validados pelo hook:

```bash
bash scripts/hooks/install-hooks.sh   # depois de clonar
bash scripts/changelog.sh             # regenera o CHANGELOG a partir do git log

# Testes da lógica das ferramentas (parser CSV, regras, CNAB 400, dados fictícios).
cd scripts && npm test

# Conferência de contraste de todo o site, nos dois temas (sai 1 se reprovar).
python3 -m http.server 8899 &         # na raiz
cd scripts && npm install && npm run contraste
```

O `scripts/package.json` existe **só** para essas conferências — o site continua sem build e
sem dependência. Não mova nada dele para a raiz. **As duas rodam sozinhas em todo PR**
(`.github/workflows/conferencias.yml`), junto com `node --check` em todo `.js` fora de
`apps/`; o `arriba-api` tem o próprio workflow com os testes dele.

## Regra de ouro: fonte única

Estes recursos são definidos em **um lugar só**. Ao mudar, edite apenas a fonte:

- **Menu + busca:** `assets/js/navigation-v2.js`. O mega-menu é **gerado por JS**, não é
  HTML fixo. Adicionar item ao menu = adicionar em `links` do grupo; adicionar à busca =
  adicionar em `searchItems` (exportado). `assets/js/search.js` (busca da home) **importa**
  esse mesmo `searchItems` — não duplicar dados de ferramentas lá. Rode `node --check`
  após editar: não há build para acusar erro de sintaxe.
  - **Regra de nome (nov/2026): o rótulo diz o que a ferramenta FAZ**, em português, para
    quem não conhece o domínio — o teste é um recrutador entender sem perguntar. Sigla de
    nicho vai com explicação ("Arquivo bancário (CNAB 400)"); código interno nunca aparece
    na tela ("Track 7" virou "Curso de SQL"; "Erro DX001" virou "Falha de conexão com uma
    API"). O menu agrupa por **ação** (validar, gerar, converter, código e SQL), não pelo
    domínio. Nome novo muda em quatro lugares: menu/busca aqui, `<title>`/kicker/`<h1>` da
    página, `caminhoTela` em `assets/data/base-conhecimento.js` e o README. **O caminho do
    arquivo não muda** — renomear pasta quebra link e import relativo.
- **Cores / design tokens:** `assets/css/tokens.css`. Paleta **boho tech / Deep Autumn**
  (out/2026): terracota, oliva, mostarda e areia. Define os tokens canônicos `--rw-*`, os
  aliases curtos (`--bg`, `--red`, ...) e os nomes `--cor-*`. Ferramentas devem **linkar
  tokens.css e remover o `:root{}` inline** — trocar a paleta inteira é trocar valor nesse
  arquivo, e foi o que permitiu a mudança sem tocar nas ferramentas.
  - **Cada cor tem um uso, medido em contraste** (os números estão no cabeçalho do
    arquivo): `--rw-red` é preenchimento de botão e texto sobre cartão; **texto sobre a
    areia é `--rw-red-ink`** (a terracota pura dá 4,27 ali, abaixo de 4,5); `--rw-red-soft`
    é realce, nunca fundo de botão com texto branco (3,13); `--rw-gold` é **fundo** de selo
    com texto escuro, nunca texto (2,33); `--rw-accent` (mostarda) só sobre faixa escura.
    `--rw-line` é divisória decorativa e `--rw-line-strong` é borda de **controle** (campo,
    select), que precisa de 3:1 para a pessoa achar o campo.
  - **Todo acento tem um par: a cor cheia e a tinta (`-ink`).** A cheia é preenchimento e
    borda; a `-ink` é a de **texto** e **vira com o tema**. Vale para terracota
    (`--rw-red` / `--rw-red-ink`), oliva, sucesso, aviso e erro — `--rw-ok`, `--rw-warn` e
    `--rw-danger` nunca entram como `color:`, só `--rw-ok-ink`, `--rw-warn-ink`,
    `--rw-danger-ink`. O motivo é medido: no tema escuro `--rw-red` clareia para #E08A55 e
    **branco em cima dá 2,65** — por isso o que vai sobre a terracota é `--rw-on-primary`,
    nunca `#fff` fixo (eram 23 botões assim).
  - **`--dark` é cor de superfície, não de texto.** Usada como `color:`, ela some no tema
    escuro — eram 23 ocorrências. Para texto, `--ink`.
  - **E o inverso também:** `--ink` é cor de **texto**, não de superfície. Como `background`,
    ela vira creme no tema escuro e o que estiver escrito em cima some — foi assim com o
    mega-menu, o corpo do chat, as modais e a navbar, cada um com uma sobrescrita de tema
    escuro por cima escondendo o problema. Superfície escura fixa é `--rw-dark` /
    `--rw-dark-2` / `--rw-deep` / `--rw-deep-2`, e o texto em cima delas é **`--rw-on-dark`**
    (também fixo: essas faixas são escuras nos dois temas, logo o texto não pode virar).
  - **Sobrescrita `body.dark-mode` é sinal de cheiro.** Se a regra clara usa token, a
    sobrescrita é desnecessária — e na prática era o lugar onde o cinza-azulado da paleta
    antiga sobrevivia. Antes de escrever uma, verificar se o token já não resolve.
  - **ARMADILHA DO ALIAS:** `--bg: var(--rw-bg)` é substituído **no elemento onde a
    declaração está**. Declarado só em `:root`, o alias congela o valor claro, e o
    `body.dark-mode` troca o canônico sem trocar o alias — foi assim que o tema escuro
    nunca funcionou para quase todo o site, sem ninguém notar. Por isso o bloco de aliases
    é declarado **nos três escopos** (`:root`, `body.dark-mode`, `[data-theme="dark"]`).
    Alias novo entra nesse bloco, não no `:root`.
  - **A conferência de contraste é por medição, não por leitura da paleta.** O que vale é o
    que está pintado na tela: o fundo precisa ser **composto** camada a camada (um chip de
    mostarda a 14% sobre o creme não é o creme), texto com alfa também, e `rgb(from …)` sai
    do navegador como `color(srgb 0.95 0.9 0.86 / .72)` — componentes de 0 a 1, não de 0 a
    255. Duas armadilhas de quem escreve o conferidor: ler esses componentes como 0–255
    inventa reprovação, e pular elemento com filho **descarta todo botão com ícone** (medir
    o texto próprio do nó).
  - **O Bootstrap traz duas cores de texto por conta própria**, e as duas reprovam sobre a
    paleta: o rosa do `<code>` (#d63384) e o cinza fixo do `.text-muted`. `tokens.css`
    aponta `--bs-code-color` e `--bs-secondary-color` para as tintas daqui — **em `body`,
    não em `:root`**, porque o Bootstrap define as dele em `:root` e metade das páginas o
    carrega depois do `tokens.css`. Classe de botão do Bootstrap com cor fixa (`.btn-dark`,
    `.btn-outline-dark`) some no tema escuro: botão é pelos tokens.
- **Dark mode:** ativado por `body.dark-mode` (ver `assets/js/theme.js`), salvo em
  localStorage.
- **Busca do topo (home):** o campo é o `<input id="topbarSearchInput">` da topbar em
  `index.html`; o painel de resultados (`setupSearchPanel()` em `navigation-v2.js`) **não
  tem campo próprio** e é ancorado por JS embaixo do campo, com a mesma largura. Em
  `<input type="search">` o Esc limpa o campo e isso dispara `input` — o handler cancela o
  comportamento nativo, senão o painel reabre sozinho ao fechar.
- **Layouts de CSV:** `tools/cobranca/arriba-csv-generator/layouts-csv.js` — mesma fonte
  para o gerador e para o validador, então CSV gerado pelo site passa no validador do site
  por construção.
- **Base do chat do site:** `assets/data/base-conhecimento.js`.
- **Acesso à Arriba API:** `assets/js/arriba-api.js` — endereço da API (`?api=` só
  localhost), `chamarApi()`, login/sessão e o atalho de administrador. A tela da API e as
  páginas de administração importam daqui; não reescrever `fetch` para a API em outra tela.
  O bloco "Acesso" das páginas de `pages/admin/` (estado, login, sair, aviso) é
  `assets/js/acesso-admin.js`: a página chama `iniciarAcessoAdmin({ aoLiberar, aoFechar })`
  e só reage — página de administração nova reusa, não copia o login.

## Como adicionar uma ferramenta

1. Criar `tools/<categoria>/<nome>/<nome>.html` + `script.js` (padrão: topbar → hero →
   sidebar/main, `.btn-arriba`, `.panel`, `.card-section`). Copiar de uma existente.
2. Linkar `tokens.css` **antes** dos outros CSS; não duplicar `:root`.
3. Registrar no menu e na busca em `navigation-v2.js` (fonte única acima).
4. Processamento de arquivo deve ser **client-side** — privacidade, custo zero e nenhum
   servidor para manter.

## Gotchas específicos

- **Validador CNAB 400** (`tools/cobranca/cnab400/`): motor genérico multi-banco
  (`engine.js` + `banks/<banco>.js`, hoje Bradesco, Itaú e BMP), com leitor (`parseArquivo`)
  e gerador (`gerarArquivo`); a UI tem modo "Validar" e modo "Gerar", baixando `.REM`/`.RET`.
  Posições do manual são **1-indexadas e inclusivas**; `slice()` é 0-indexado exclusivo →
  usar `slice(ini-1, fim)`. O motor **não assume 400 posições** (`config.tamanhoRegistro`) e
  aceita motivo escopado por ocorrência (`config.motivos[ocorrencia][cod]`) além do mapa
  plano — checa aninhado primeiro, cai para o plano. Campo sem confirmação em fonte
  confiável fica marcado como `naoConfirmado`, nunca estimado.
- **Conferência do Trailer** (`engine.js`, `conferirTrailer`): compara o que o Trailer
  declara (quantidade e valor total) com o que foi lido e avisa quando não fecha ou quando
  não existe — é o que pega arquivo truncado ou editado à mão. Opt-in por banco via
  `config.trailerConferencia`. O valor esperado sai da mesma regra da geração
  (`trailerTotalFn`/`trailerTotalKey`), para validação e geração não divergirem.
- **Ícone do banco na UI** (`ui.js`, `bankIconHtml`): um ícone **neutro** de banco, igual
  para todos. **Não há logo de banco no repositório** (nov/2026): os 3 que apareciam na tela
  e a biblioteca de 205 SVGs saíram, por serem marca registrada de terceiro. O que identifica
  o layout é o nome e o código de compensação, em texto — uso descritivo de uma
  especificação pública. Banco novo não precisa de imagem; não reintroduzir logo.
- **Validador de CSV** (`tools/dados/csv-validator/`): separa **dois assuntos que não se
  misturam** — `parser.js` responde "o arquivo está bem formado?" (RFC 4180 de verdade:
  aspas, `""` escapado, delimitador e quebra de linha dentro do campo; BOM, EOL, cabeçalho
  duplicado) e `rules.js` responde "o conteúdo está certo?" (tipo, obrigatório, único,
  tamanho, lista de valores, regex). **Não trocar o parser por `split(";")`:** endereço com
  ponto e vírgula dentro de aspas é comum e o `split` transforma arquivo bom em arquivo
  "corrompido". Campo vazio nunca é testado pelo tipo — quem cobra vazio é a regra
  `obrigatorio`. O **tipo** de cada coluna em `schemas.js` é inferido da convenção de nome
  (`Dt_*` = data, `Vl_*`/`Tx_*` = decimal, `Cpf_Cnpj`, `UF`, `Email`, `CEP`) — é
  inferência, não dicionário oficial, por isso a tela deixa ajustar e desligar cada regra.
- **Base64** (`tools/dados/base64-pdf/` e `decodificador/`): decode 100% no browser.
  `base64-pdf` extrai Base64 embutido em JSON automaticamente (detecta por magic bytes
  `%PDF`). `decodificador/` é o conversor universal (Base64, URL, HTML entities, hex,
  binário, ROT13, JWT, Unicode escape) com detecção automática de formato.
- **Geradores de dados fictícios BR** (nome/CPF válido/RG/celular/CEP/endereço/e-mail) ficam
  em `assets/js/fake-data-br.js` (módulo sem dependência de DOM). Reusar em vez de
  reescrever gerador. O **RG** segue o padrão de São Paulo (8 dígitos + verificador, que
  pode ser "X") — não há regra nacional, e a tela diz isso; o dígito foi conferido contra um
  RG de gerador de referência, e esse caso está nos testes. A tela
  `tools/cobranca/massa-dados/` ainda tem cópia própria de CPF, CNPJ e CEP; o RG já vem do
  módulo (por isso o `script.js` dela é `type="module"`). A tela **gera sozinha**: ao abrir,
  ao trocar de gerador e a cada opção mexida — nunca fica vazia nem com dado velho — e
  **"Copiar" fica junto do resultado e leva só os registros**, sem a linha de título (que
  aparece apagada na tela e vai no arquivo). Três cuidados que custaram um teste cada: sair
  do campo de quantidade dispara `change` sem o número mudar, então só regenera se a
  assinatura das opções mudou (senão o dado trocava debaixo do clique em Copiar); as linhas
  que estão na tela vão para o arquivo baixado como estão; e a linha de estado reserva o
  espaço mesmo vazia, para não empurrar o botão na hora do toque. No celular o menu lateral
  vira um `<select>` montado da mesma lista (`generatorMeta`). As opções escolhidas ficam em
  `localStorage` (`arribaMassaDados:opcoes`) só como conveniência de quem usa.
- **Gamificação de trilhas** (pontos/badges/progresso) é genérica em
  `assets/js/gamification.js`, 100% `localStorage`, sem backend — recebe `trackId`. A
  trilha de SQL é a primeira consumidora; trilha nova reusa o mesmo motor.
- **Sandbox SQL** roda via AlaSQL 100% no navegador, contra `assets/data/sandbox-schema.js`
  (modelo de cobrança com dados **100% inventados**). Ao mexer nas lições, **rode todas as
  queries contra o AlaSQL antes de commitar** — o simulador tem limites que o T-SQL não tem.
- **Semeadura do AlaSQL é fonte única em `assets/js/sql-sandbox.js`** (`semearTabelas()` +
  `executarQuery()`). **Não use `SELECT * INTO tabela FROM ?`**: não funciona no AlaSQL 4
  (estoura em `'xcolumns'`) e era o bug que deixava o sandbox quebrado, escondido num
  `try/catch` que só logava aviso. O que funciona é `DROP TABLE IF EXISTS` → `CREATE TABLE`
  → `INSERT INTO ... SELECT * FROM ?` (idempotente). Cuidado com alias: `AS Total` quebra o
  parser (palavra reservada) — usar `Qtd_Linhas` e afins.
- **Histórico/consultas salvas de SQL** ficam em `assets/js/sql-query-store.js` — módulo
  genérico por `toolId`, 100% `localStorage`. Usado pelo playground e pela trilha.
- **Centro de Aprendizado** (`pages/aprender/`): card por tópico com exemplo de código real
  + "Try it Yourself". Adicionar tópico = adicionar um objeto em `TOPICOS`
  (`pages/aprender/script.js`); nenhum card é escrito à mão no HTML. O painel de progresso
  **não tem dados próprios**: soma o que `gamification.js` e `sql-query-store.js` gravam.
- **Editor Web** (`tools/dados/editor-web/`): três abas viram um documento só, renderizado
  num `<iframe srcdoc>`. **O `sandbox` é de propósito `allow-scripts allow-forms
  allow-modals allow-popups` SEM `allow-same-origin`**: o JS do usuário executa de verdade
  mas fica em origem opaca, sem alcançar `localStorage` nem o DOM da página. **Não adicione
  `allow-same-origin`** — junto com `allow-scripts` isso anula o sandbox. Como o iframe está
  em outra origem, o console dele não é legível daqui: `PONTE_CONSOLE` é injetada no
  documento gerado e manda tudo via `postMessage`; o pai valida por
  `evento.source === preview.contentWindow` (o `origin` vem `"null"`). O `.html` baixado sai
  **sem** a ponte.
- **Validar e consultar pela API** (`tools/dados/api-privada/`, nov/2026): a única tela que
  chama servidor — `https://api.arriba.jm.dev.br`, repositório `arriba-api`. **A API é
  privada e nenhum segredo entra neste repositório**: site estático é público por definição.
  Dois jeitos de entrar, nenhum grava nada no navegador: (1) **usuário e senha** →
  `POST /auth/login` devolve cookie `HttpOnly` que o JS não lê, mandado sozinho com
  `credentials: "include"`. Funciona porque `arriba.jm.dev.br` e `api.arriba.jm.dev.br` são o
  mesmo *site* (`dev.br` é sufixo público, então o cookie `SameSite=Lax` vai junto) e a API
  libera CORS só para esta origem; (2) **chave de API** digitada na hora, guardada numa
  variável do módulo — some ao recarregar, **nunca** em `localStorage`/`sessionStorage`.
  `?api=` só aceita `http://localhost`: aceitar qualquer endereço deixaria um link
  `?api=site-dele` receber a senha digitada. Resposta da API é escrita com `textContent`,
  nunca `innerHTML` (o endereço da ViaCEP é dado de terceiro). O exemplo de consulta de CNPJ
  **não existe de propósito**: consulta precisa de CNPJ real, e exemplo aqui é fictício.
  Preview da Vercel (`*.vercel.app`) **não** entra: não é o mesmo site nem está no CORS.
- **Painel da API** (`pages/admin/painel-api.html`, nov/2026): lê `/v1/painel/resumo` e
  `/v1/painel/chamadas` da Arriba API — só administrador, fora do menu e da busca,
  `noindex`. Mostra quatro números, o volume no período em colunas e tabelas por rota, por
  API pública e das últimas chamadas. A API registra só o **molde da rota**
  (`/v1/consultar/cep/:cep`), nunca o dado que passou. O gráfico é uma série só, então não
  tem legenda (o título diz o que é); cada coluna responde a mouse **e** foco de teclado, e
  há a mesma informação em tabela. Acima de 48 h as colunas viram por dia. A cor da marca é
  `--rw-grafico`, **não** `--rw-red`: no tema escuro a terracota (#E08A55) passa da faixa de
  luminosidade de marca de dado — o token foi validado nos dois temas. A tela diz onde o
  histórico está guardado (memória ou Postgres), para "sem chamadas" não se confundir com
  "a memória zerou".
- **Chatbot e provedores de IA** (`assets/js/chatbot.js` + `assets/js/llm-providers.js`): o
  padrão é `local` — responde pela base `assets/data/base-conhecimento.js` no próprio
  navegador, sem rede, sem chave, sem custo. IA de verdade é **opt-in** e **só o
  administrador configura**, em `pages/admin/configurar-chat.html`: `ollama` (modelo na
  máquina de quem usa), `openai`, `anthropic` e `gemini` (BYOK). `llm-providers.js` é a
  fonte única de provedor. Ordem: base local primeiro; quando ela não cobre, o provedor que
  o administrador configurou naquele navegador; sem ele, a **IA do servidor** (abaixo), se
  ligada; falha de qualquer um **sempre** cai na local.
  No provedor do administrador, **a chave fica no localStorage de quem digitou** e a chamada
  sai do navegador dela. Nunca commitar chave nem colocá-la em variável de build — tudo que
  vai para um site estático é público. O histórico da conversa é só em memória.
  - **IA do servidor para visitantes (nov/2026, desligada por padrão).** A Arriba API guarda a
    chave do provedor e expõe `POST /publico/chat`; `perguntarAoChatPublico()` em
    `arriba-api.js` é quem chama. Liga-se em **dois lugares**: `IA_CHAT_PUBLICO=true` no
    Render **e** `CHAT_PUBLICO_LIGADO = true` em `arriba-api.js`. Com o do site desligado o
    chat nem tenta — não acorda o servidor à toa nem deixa o visitante esperando. Ligado, o
    chat **avisa na abertura** que a pergunta pode ser enviada a um serviço de IA e o
    subtítulo muda; o que a pessoa escreve passa a sair do navegador, então esse aviso não é
    opcional. Se o servidor responde `IA_DESLIGADA`, o chat para de tentar naquela visita e
    responde pela base, sem mensagem de erro. O estado dos dois lados aparece no quadro "IA
    do servidor" de `pages/admin/configurar-chat.html` (só leitura; nunca mostra chave).
  - **Busca na base por palavra, não por pedaço de texto.** Palavra-chave casa por palavra
    inteira e palavra solta casa pelo começo de uma palavra (com tolerância a plural). Por
    pedaço, a palavra-chave "api" casava dentro de "c**api**tal" e "qual a capital da
    França" voltava a sugerir ferramenta — regressão que entrou junto com a entrada da API
    na base e só apareceu no teste de tela. Palavra-chave nova e curta: testar com uma
    pergunta fora do assunto.
  - **Configuração só para administrador (nov/2026).** O painel que a engrenagem abria
    dentro do chat, à vista de qualquer visitante, virou a página
    `pages/admin/configurar-chat.html` (fora do menu, da busca e com `noindex`). Ela só mostra
    o formulário depois que a **Arriba API** confirma, pelo cookie, uma sessão com
    `role: "admin"`. No chat, a engrenagem virou um **link** para essa página e só aparece no
    navegador em que o administrador já entrou — uma marca em `localStorage`
    (`arribaAdmin:atalho`, de `arriba-api.js`) que **só decide se o atalho aparece**, sem
    dar acesso a nada. Assim o chat não chama a API a cada página (acordaria o Render à
    toa). Honestidade sobre o que isso protege: esconder formulário em site estático não é
    segurança; é aceitável porque **não há segredo do site** nesse formulário — a chave do
    provedor é de quem digita e fica no navegador dele. A configuração vale **para aquele
    navegador**: IA para todos os visitantes exige guardar a chave no servidor (fase 3 da
    API, no backlog).
  - **Escrita do chat (nov/2026):** o primeiro balão diz que é um **assistente automático**
    e o que ele faz; quando não sabe, diz "não sei" e oferece caminho — "achei algo
    parecido" e "não tenho nada" são respostas **diferentes** (misturar as duas era o que
    fazia "qual a capital da França" virar uma lista de ferramentas). O subtítulo mostra
    **de onde vem a resposta** (base do site ou provedor), não um humor do mascote. Fala com
    quem visita o site: nada de "encaminhar para DEV" ou "resposta para cliente".
  - **Estilo em `assets/css/chatbot.css`, fonte única** — antes eram ~550 linhas em
    `style.css` que se sobrescreviam. O widget **não usa as classes `.card` do Bootstrap**:
    as regras globais de `.card-header` (com `!important` no tema escuro) brigavam com o
    cabeçalho. O lançador **não anima sozinho** (movimento automático sem pausa fere a WCAG
    2.2.2); movimento só no hover, e some com `prefers-reduced-motion`.
  - **Camada 1070, acima do topo fixo (1060).** Em 1050 o cabeçalho do chat — com o botão de
    fechar — ficava atrás do topo em qualquer tela abaixo de ~800 px de altura, inclusive
    no celular, e isso foi para o ar porque o teste rodava só numa janela de 900 px. Mudou
    tamanho ou posição do chat, confira em várias telas (baixa, notebook, celular, celular
    deitado) se o fechar e o campo continuam visíveis **e por cima** (`elementFromPoint`).
- **Base de conhecimento do app de chat** (`apps/arriba-chat-ia/server/src/knowledge/`): o
  chat do app consulta a **documentação do próprio repositório** antes de chamar o modelo.
  É cópia importada, não leitura ao vivo (`npm run kb:import` ou o botão na aba "Base de
  conhecimento" do admin). Fontes: `assets/data/base-conhecimento.js` e os arquivos de
  `README.md`, `CLAUDE.md`, `.claude/memory/`, `tasks/` e `pages/docs/`. A busca é a textual
  do Postgres com dicionário português, sem embeddings — decisão medida: nessa escala a
  busca nativa responde e é uma dependência a menos. O importador corta frase que se repete
  em muitos documentos (era 48% do texto quando a base eram páginas de template), e isso
  depende de `textoDeHtml()` **preservar a quebra de bloco**. A resposta cita `[1]`, `[2]` e
  as fontes ficam gravadas em `Message.knowledgeUsed`.
- **Comunicados** (`apps/comunicados/`, out/2026): portal de cartas modelo e disparo de
  e-mail. **SQLite**, e não Postgres: roda na máquina de quem opera, e um arquivo em
  `dados/` elimina servidor de banco, porta e usuário para administrar. Quatro regras
  moram no código e não podem ser afrouxadas sem pensar: a senha do SMTP é cifrada
  (AES-256-GCM) e **nunca volta por HTTP** — campo vazio na tela significa "mantém",
  não "apaga"; todo erro de envio passa por `envios/mascarar.ts` antes de ser guardado,
  porque o diálogo SMTP traz o `AUTH LOGIN` com a credencial; os destinatários vão em
  **CCO** com o remetente no "Para", senão um cliente vê a lista dos outros; e o
  descadastro é consultado em **todo** disparo, inclusive em lista colada à mão. As
  variáveis da carta (`{{nome}}`, `{{cliente}}`…) são declaradas em
  `cartas/variaveis.ts` — fonte única da tela, do preenchimento e da conferência — e o
  valor é **escapado** no corpo HTML (nome com `<` quebraria o layout; com `<script>`,
  executaria no cliente de e-mail de quem recebe). **Personalização só funciona com lote
  de 1**: o lote vira uma mensagem só, então `{{nome}}` fica vazio quando há mais de um
  destinatário. `SMTP_MODO_TESTE=1` grava `.eml` em `dados/saida/` em vez de mandar pela
  rede — é como o fluxo é testado sem servidor.
- **Integridade de CDN (SRI)**: toda tag de `cdn.jsdelivr`/`cdnjs` tem `integrity` +
  `crossorigin`. Ao adicionar biblioteca de CDN, **gerar o hash junto** — sem ele,
  comprometimento do CDN executa JS arbitrário em todas as páginas. O hash sai do pacote npm
  (`npm pack <pkg>@<versão>` → `openssl dgst -sha384 -binary <arquivo> | openssl base64 -A`).
  **Sempre pinar versão exata**: tag flutuante muda sozinha e impede fixar hash.
- **Imagens: só o que é do projeto.** `assets/img/` guarda o fundo e o cartão do topo da
  home, as bandeiras de idioma e o mascote (o sapo laranja em uso e o desenho antigo, de
  backup). Em nov/2026 saíram 233 arquivos que não eram: logos de bancos, logo de empresa e
  de produto, telas reais de produto, um mascote com o símbolo da empresa e fotos de banco
  de imagens de um site corporativo — nenhum era usado por página alguma. Imagem nova entra
  só se for feita para o projeto ou tiver licença que permita, e com a origem anotada.
  **O histórico do git recomeçou em 13/11/2026**, num repositório novo com o mesmo nome: o
  primeiro commit é o estado daquele dia. O repositório anterior foi renomeado e guarda as
  versões antigas — e nelas os arquivos removidos —, por isso precisa ficar **privado**
  (ver `tasks/decisoes-pendentes.md`). Forçar o envio por cima da `main` não bastava: o
  GitHub mantém os commits antigos presos a cada PR já aberto.

## Estado atual

Entregue e funcionando:

- Validador CNAB 400 (Bradesco, Itaú e BMP), validar e gerar, com conferência de trailer.
- Validador de CSV e gerador de CSV compartilhando a mesma fonte de layouts.
- Utilitários de dados: JSON, hash, CSV↔JSON, Base64→PDF, decodificador universal.
- Massa de dados fictícios e decodificador/criador de modelo de carta.
- Centro de Aprendizado, trilha de SQL com gamificação e SQL Playground (AlaSQL).
- Editor Web com preview ao vivo e sandbox endurecido.
- Tela "Validar e consultar pela API", ligada à Arriba API privada (login por cookie
  `HttpOnly` ou chave só em memória).
- Configuração do chat e Painel da API em páginas de administração, abertas só com sessão
  de administrador na Arriba API.
- Chat do site (base local + provedores BYOK) e `apps/arriba-chat-ia` (multi-provedor,
  streaming SSE, administração, auditoria e base de conhecimento).
- `apps/comunicados`: portal de cartas modelo e disparo de e-mail em lotes, com
  descadastro, histórico por destinatário e configuração de servidor SMTP.

O que falta está em `tasks/` — e as decisões que dependem do dono, em
`tasks/decisoes-pendentes.md`.

## Convenções de trabalho

- Antes de apagar qualquer arquivo, **verificar referências com `grep`** — nunca remover às
  cegas. Depois de renomear caminho, conferir também **import relativo** (`../../`), que não
  aparece numa busca pelo caminho a partir da raiz.
- Commits pequenos e por parte, em `tipo(escopo): descrição`.
- Respostas e comentários em **português (Brasil)**.
- Preservar o visual/tom retro-criativo e a paleta boho tech (terracota, oliva, mostarda,
  areia). **Cor nova entra em `tokens.css`, nunca escrita à mão no HTML da ferramenta** — e
  antes de adotar, medir o contraste do par (texto × fundo) em que ela vai ser usada.
- Depois de mexer em cor, rodar `scripts/conferir-contraste.mjs` nos **dois** temas: ela
  pega cor fixa esquecida que a paleta no papel não mostra. Mede cada página no
  carregamento **e** os estados abertos da lista `ESTADOS` (chat aberto e respondendo, chat
  do administrador, mega-menu, busca) — interface nova que só aparece depois de um clique
  entra nessa lista. O tema escuro é ligado **sem transição**: medir no meio da animação de
  cor reprovava texto bom numa rodada e passava na outra.
- **Conferência de contraste sem o CDN não vale.** Se o Bootstrap não carrega, a página é
  pintada sem ele e a medição dá "0" para uma tela que não existe — foi assim que 74
  reprovações passaram numa máquina com o CDN bloqueado e só apareceram no GitHub. Agora
  folha de estilo que falha derruba a conferência (saída 2, "MEDIÇÃO INVÁLIDA"). Em máquina
  sem acesso ao CDN, baixar os pacotes com `npm pack` e apontar `CDN_LOCAL` (o passo a
  passo está no cabeçalho de `scripts/conferir-contraste.mjs`).
- Dado de exemplo é sempre fictício: nome, CPF/CNPJ, telefone, e-mail, endereço e número de
  contrato em fixture, exemplo de campo ou schema de sandbox são inventados.
