# Decisões de Arquitetura — Arriba Platform

> ADR simplificado: o que foi decidido, por quê, o que mais foi avaliado e o que a decisão
> custa. São decisões **estruturais** — o que muda o jeito de trabalhar no repositório.
> Detalhe de implementação e armadilha de ferramenta ficam no `CLAUDE.md`.

---

## ADR-001: Site estático, sem framework e sem build step

**Decisão:** HTML/CSS/JS puro + Bootstrap 5 por CDN. O arquivo servido é o arquivo editado.
**Motivo:** são ferramentas pequenas e independentes, usadas por quem está atendendo chamado:
carregam instantâneo, qualquer pessoa do time edita sem instalar nada, e o deploy é cópia de
arquivo. Sem `node_modules` para manter, sem build para quebrar.
**Alternativas:** React/Vite para o site inteiro (rejeitada: paga-se build e estado de
framework para telas que são, na prática, formulário + processamento local).
**Consequências:** não há transpilação — o JS escrito é o JS executado (ES modules nativos);
erro de sintaxe só aparece no navegador, então `node --check` faz o papel do compilador.
Não introduzir React/Vue/Tailwind/bundler no site sem pedido explícito.

---

## ADR-002: `apps/` é a exceção — e só ela

**Decisão:** aplicações com backend e banco próprios vivem em `apps/<nome>/`, com
`package.json`, build e README próprios. A primeira é `apps/arriba-chat-ia/`.
**Motivo:** um chat multiusuário com histórico, sessão e chave de API cifrada não cabe num
site estático — precisa de servidor. Isolar em `apps/` preserva o ADR-001 para o site.
**Consequências:** `.vercelignore` exclui `apps/` (senão o código-fonte iria para o ar como
arquivo estático); dependência de app não se mistura com o site; `assets/` e `tools/` **não**
importam nada de `apps/`.

---

## ADR-003: Processamento de arquivo é client-side

**Decisão:** CNAB, bureau de crédito, CSV, Base64, PDF — tudo é lido e gerado no navegador. O backend
só entra para IA e help desk.
**Motivo:** três razões na mesma direção. Privacidade/LGPD (arquivo de remessa e base de
devedor têm CPF, nome e endereço reais, e não devem subir para servidor nenhum); custo zero;
e ausência de cold start — o Render dorme, o navegador não.
**Consequências:** nada de processamento pesado em lote; o limite é a memória da aba.

---

## ADR-004: Fonte única declarada por assunto

**Decisão:** menu/busca, tokens de cor, layouts do cobrança, motor de arquivo posicional e
regras de processo têm **um** arquivo dono (mapa em [architecture.md](architecture.md)).
**Motivo:** o repositório já viveu o oposto — o mesmo item de menu com três nomes, layout de
CSV redigitado no gerador e no validador. Some quando tem dono.
**Consequências:** adicionar ferramenta é mexer também no arquivo-fonte do menu/busca; um
consumidor novo importa, nunca copia.

---

## ADR-005: Um motor genérico para arquivo de posição fixa

**Decisão:** `tools/cobranca/cnab400/engine.js` lê e gera qualquer layout posicional a partir
de uma declaração de campos; banco novo é `banks/<banco>.js`, bureau novo é `layouts/<x>.js`.
A bureau de crédito (registro de 600 posições) reusa o mesmo motor.
**Motivo:** a diferença entre bancos é tabela, não algoritmo.
**Consequências:** o motor não pode assumir tamanho de registro (`config.tamanhoRegistro`)
nem formato de motivo (mapa plano **ou** aninhado por ocorrência).

---

## ADR-006: Ordem de confiança quando as fontes divergem

**Decisão:** **arquivo real > planilha com amostra própria > manual oficial.** Campo sem
confirmação fica marcado como não confirmado em vez de estimado.
**Motivo:** manual sem amostra erra por transcrição — aconteceu no BMP (posições 021-037 e
293-295) e no bureau de crédito (identificador do REFIN). Arquivo real de produção não erra sobre si.
**Consequências:** banco novo só entra com manual **e** amostra; "posição provável" não entra.

---

## ADR-007: Simulador SQL nunca toca o banco real

**Decisão:** Track 7 e SQL Playground rodam AlaSQL no navegador, contra um schema que espelha
o modelo real do cobrança com dados 100% inventados.
**Motivo:** treinar e testar consulta sem risco de leitura em produção e sem dado pessoal.
**Consequências:** o simulador tem limites que o T-SQL não tem — query de lição é validada
contra o AlaSQL antes de commitar.

---

## ADR-008: O código do usuário roda isolado no Editor Web

**Decisão:** `<iframe sandbox="allow-scripts allow-forms allow-modals allow-popups">`, sem
`allow-same-origin`, com ponte de console por `postMessage`.
**Motivo:** o JS digitado precisa executar de verdade, mas não pode alcançar `localStorage`
nem o DOM do site. Com `allow-same-origin` junto de `allow-scripts`, o sandbox deixa de existir.
**Consequências:** o console do iframe não é legível do pai sem a ponte injetada; o `.html`
baixado sai sem ela.

---

## ADR-009: Integridade de CDN obrigatória

**Decisão:** toda tag de `cdn.jsdelivr`/`cdnjs` leva `integrity` + `crossorigin`, com versão
exata (nunca tag flutuante).
**Motivo:** sem SRI, comprometimento do CDN executa JS arbitrário em todas as páginas.
**Consequências:** atualizar biblioteca é gerar o hash junto (`npm pack` → `openssl dgst`).

---

## ADR-010: Chave de IA do site é do usuário, no navegador dele

**Decisão:** o chat do site responde primeiro pela base local; IA de verdade é opt-in, com
chave própria (BYOK) guardada no `localStorage` de quem digitou.
**Motivo:** site estático não tem onde guardar segredo — tudo que vai para o ar é público.
**Consequências:** o painel avisa que o texto sai da máquina; histórico só em memória
(conversa de suporte pode ter dado de chamado e não deve persistir).

---

## ADR-011: No app do chat, o segredo é do servidor e cifrado

**Decisão:** a API key do provedor é cifrada com AES-256-GCM (chave mestra em
`ENCRYPTION_KEY`) e nunca volta por HTTP; a sessão é JWT em cookie `HttpOnly`.
**Motivo:** aqui existe servidor, então a chave é da empresa e não de cada usuário. GCM é
cifra autenticada: adulterar o registro faz a decifragem falhar em vez de devolver lixo.
**Consequências:** quem tem a `ENCRYPTION_KEY` decifra tudo — ela é segredo de infraestrutura,
e rotacioná-la exige recadastrar as chaves.

---

## ADR-012: Base de conhecimento do chat por busca textual, não embeddings

**Decisão:** busca nativa do Postgres com dicionário português, sobre uma **cópia importada**
da documentação do portal.
**Motivo:** medido antes de decidir — 95 documentos e ~80 mil caracteres. Nessa escala a busca
nativa acerta, custa zero por consulta e funciona offline. Ler os arquivos do site a cada
pergunta amarraria o app ao repositório do portal para sempre.
**Alternativas:** pgvector + embeddings (rejeitada por ora; o caminho está documentado no
schema para quando a base passar de alguns milhares de documentos).
**Consequências:** cópia envelhece — manual novo só chega depois de reimportar; e pergunta com
sinônimo que não está no texto não encontra.

---

## ADR-013: Conventional Commits validados por hook

**Decisão:** formato `tipo(escopo)?: descrição`, validado por um hook `commit-msg` no próprio repositório.
**Motivo:** histórico legível, `CHANGELOG.md` gerado do `git log`, rastreabilidade por escopo.
**Consequências:** após clonar, rodar `bash scripts/hooks/install-hooks.sh`. Commits anteriores
a set/2026 não seguem o formato e ficam fora do CHANGELOG gerado.

---

## ADR-014: Estrutura de trabalho em arquivo (memória, regras, fila, hooks)

**Decisão:** o repositório carrega a própria estrutura de trabalho — `.claude/memory/`
(mapa, ADRs e padrões), `.claude/rules/` (comportamento por caminho), `tasks/` (a fila) e
um hook de Conventional Commits com `CHANGELOG` gerado.
**Motivo:** a ideia veio de um boilerplate corporativo que organiza projetos assim. O que
se mostrou útil aqui é a parte que **não depende de empresa nenhuma**: decisão registrada
onde o código está, pendência em arquivo em vez de memória de conversa, e histórico de
commit legível por máquina.
**Alternativas:** instalar o boilerplate inteiro (rejeitada: traz corpus de negócio,
agentes por área, política interna e skills que dependem de servidores que este projeto não
tem) e não ter estrutura nenhuma (rejeitada: já era o estado, e a pendência vivia espalhada
entre prosa e conversa).
**Consequências:** quem clona roda `bash scripts/hooks/install-hooks.sh`; pendência nova
tem lugar certo; e `.claude/memory/` precisa ser mantida junto com o código que descreve —
documento que mente é pior que documento que falta.


---

## ADR-015: Cada acento da paleta tem duas entradas — a cheia e a tinta

**Decisão:** toda cor de acento existe em par: a **cheia** (`--rw-red`, `--rw-olive`,
`--rw-ok`, `--rw-warn`, `--rw-danger`) é preenchimento e borda; a **tinta** (`--rw-red-ink`,
`--rw-olive-ink`, `--rw-ok-ink`, `--rw-warn-ink`, `--rw-danger-ink`) é a cor de **texto** e é
a única das duas que vira com o tema. Some-se a isso `--rw-on-primary` (o que fica legível
*sobre* a terracota) e `--rw-on-dark` (o que fica legível sobre as superfícies escuras fixas).
**Motivo:** medição, não gosto. A terracota pura dá 4,27 como texto sobre a areia e a oliva
pura 4,05 — as duas reprovam. No tema escuro a terracota **clareia** para #E08A55, e aí o
branco em cima dela dá 2,65: o `#fff` fixo que funcionava no tema claro passa a reprovar em
23 botões. Uma cor só não consegue ser preenchimento e texto ao mesmo tempo nos dois temas.
**Alternativas:** escurecer a paleta inteira até a cor cheia servir de texto (rejeitada:
mataria o laranja que dá identidade ao projeto) e aceitar a reprovação (rejeitada: é a
diferença entre ler e não ler o rótulo do botão).
**Consequências:** `color:` nunca recebe a cor cheia — nem `--ok`, nem `--warn`, nem
`--danger`. Acento novo entra em par, com o contraste do par medido antes de adotar.

---

## ADR-016: Superfície e texto são vocabulários separados — e isso se verifica medindo

**Decisão:** `--ink` e as tintas são **cor de texto** e nunca entram em `background`;
`--rw-dark`, `--rw-dark-2`, `--rw-deep` e `--rw-deep-2` são **superfície escura fixa** e
nunca entram em `color`. A conferência é feita por `scripts/conferir-contraste.mjs`, que
abre cada página nos dois temas e mede o que está pintado.
**Motivo:** os dois sentidos da troca já tinham acontecido no repositório sem ninguém notar.
`--dark` como `color:` sumia no tema escuro (23 ocorrências) e `--ink` como `background:`
virava creme no tema escuro — no mega-menu, no corpo do chat, nas modais e na navbar, cada um
com uma sobrescrita `body.dark-mode` por cima escondendo o problema. Nenhum dos dois aparece
numa revisão de paleta no papel; os dois aparecem na primeira medição.
**Alternativas:** conferir por captura de tela (rejeitada: foi o que deixou passar — o olho
não vê 4,27 contra 4,5) e confiar nos valores da paleta (rejeitada: o fundo real é composto,
e um chip de mostarda a 14% sobre o creme não é o creme).
**Consequências:** o repositório ganhou `scripts/package.json` só para essa conferência — o
site continua sem build. E a conferência mede o que está visível **no carregamento**: estado
aberto (chat, menu, modal) continua sendo verificação manual, registrada em `tasks/`.
