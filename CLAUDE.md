# CLAUDE.md

Contexto e convenções do projeto para agentes de IA (Claude Code). Mantenha este
arquivo atualizado quando decisões de arquitetura mudarem.

## O que é

**Arriba Platform** — **protótipo de estudos** em fullstack: validadores de arquivo
(posicional e CSV), geradores, simulador SQL, editor web com preview ao vivo e um app de
chat com IA. Tudo que é ferramenta roda **no navegador**; o único backend é o do app de
chat, em `apps/`.

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

# Conferência de contraste de todo o site, nos dois temas (sai 1 se reprovar).
python3 -m http.server 8899 &         # na raiz
cd scripts && npm install && npm run contraste
```

O `scripts/package.json` existe **só** para essa conferência — o site continua sem build e
sem dependência. Não mova nada dele para a raiz.

## Regra de ouro: fonte única

Estes recursos são definidos em **um lugar só**. Ao mudar, edite apenas a fonte:

- **Menu + busca:** `assets/js/navigation-v2.js`. O mega-menu é **gerado por JS**, não é
  HTML fixo. Adicionar item ao menu = adicionar em `links` do grupo; adicionar à busca =
  adicionar em `searchItems` (exportado). `assets/js/search.js` (busca da home) **importa**
  esse mesmo `searchItems` — não duplicar dados de ferramentas lá. Rode `node --check`
  após editar: não há build para acusar erro de sintaxe.
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
- **Ícone do banco na UI** (`ui.js`, `BANK_ICONS`): SVGs em
  `tools/cobranca/cnab400/assets/icons/`, curados a partir de `assets/img/bancos/`. Banco
  novo = copiar o SVG para essa pasta e registrar em `BANK_ICONS`.
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
- **Geradores de dados fictícios BR** (nome/CPF válido/celular/CEP/endereço/e-mail) ficam
  em `assets/js/fake-data-br.js` (módulo sem dependência de DOM). Reusar em vez de
  reescrever gerador.
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
- **Chatbot e provedores de IA** (`assets/js/chatbot.js` + `assets/js/llm-providers.js`): o
  padrão é `local` — responde pela base `assets/data/base-conhecimento.js` no próprio
  navegador, sem rede, sem chave, sem custo. IA de verdade é **opt-in**, configurada no
  painel da engrenagem: `ollama` (modelo na máquina de quem usa), `openai`, `anthropic` e
  `gemini` (BYOK). `llm-providers.js` é a fonte única de provedor. Ordem: base local
  primeiro; provedor só quando a local não cobre; falha do provedor **sempre** cai na local.
  **A chave fica no localStorage de quem digitou** e a chamada sai do navegador dela: não há
  backend aqui para guardar segredo. Nunca commitar chave nem colocá-la em variável de
  build — tudo que vai para um site estático é público. O histórico da conversa é só em
  memória.
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
- **Biblioteca de logos de bancos** (`assets/img/bancos/`): 205 SVGs de 87 bancos, guardados como fonte
  para quando novos bancos entrarem no CNAB. Copiar o SVG desejado para a pasta
  `assets/icons/` da ferramenta em vez de referenciar essa pasta diretamente.

## Estado atual

Entregue e funcionando:

- Validador CNAB 400 (Bradesco, Itaú e BMP), validar e gerar, com conferência de trailer.
- Validador de CSV e gerador de CSV compartilhando a mesma fonte de layouts.
- Utilitários de dados: JSON, hash, CSV↔JSON, Base64→PDF, decodificador universal.
- Massa de dados fictícios e decodificador/criador de modelo de carta.
- Centro de Aprendizado, trilha de SQL com gamificação e SQL Playground (AlaSQL).
- Editor Web com preview ao vivo e sandbox endurecido.
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
  pega cor fixa esquecida que a paleta no papel não mostra. Ela mede só o que está **visível
  no carregamento** — painel aberto, menu aberto e resultado preenchido continuam sendo
  conferência manual.
- Dado de exemplo é sempre fictício: nome, CPF/CNPJ, telefone, e-mail, endereço e número de
  contrato em fixture, exemplo de campo ou schema de sandbox são inventados.
