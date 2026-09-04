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
  HTML fixo. Adicionar item ao menu = adicionar em `dados.links` (grupos sem CRM) ou dentro
  de `crms.tabs[].links` (grupo "CRMs" → aba do CRM, ver abaixo); adicionar à busca =
  adicionar em `searchItems` (exportado). `assets/js/search.js` (busca da home) **importa**
  esse mesmo `searchItems` — não duplicar dados de ferramentas lá, só adicionar em
  `navigation-v2.js`. Rode `node --check` após editar.
- **Grupo "CRMs" (multi-CRM, ago/2026):** `menuData.ferramentas.children.crms` usa `tabs`
  (não `links` direto) — cada aba é um CRM (`{ key, label, links }`). Hoje só "DataCob" tem
  ferramentas; "Outros CRM" existe vazia (mensagem "Em breve..."), pronta para quando surgir
  a primeira ferramenta de outro CRM — só adicionar um novo objeto em `tabs[]` ou preencher
  `links` da aba "outros". `renderDetail()` em `navigation-v2.js` já sabe renderizar `tabs`
  (com botões estilo aba) ou `links` plano (usado por Dados/Suporte/Cloud) — não duplicar essa
  lógica em outro lugar.
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

- **Validador CNAB 400** (`tools/datacob/cnab400/`, renomeado de "CNAB 400 (multi-banco)"
  em ago/2026 — nome mais direto, alinhado a ferramentas concorrentes tipo ValidaCNAB):
  motor genérico multi-banco (`engine.js` + `banks/<banco>.js`, hoje Bradesco, Itaú e BMP
  Money Plus), com leitor (`parseArquivo`) e gerador (`gerarArquivo`) — a UI (`ui.js`) já
  tem modo "Gerar" para as duas direções, baixando `.REM`/`.RET`. Posições do manual são
  **1-indexadas e inclusivas**; `slice()` é 0-indexado exclusivo → usar `slice(ini-1, fim)`.
  Bradesco Retorno **e** Remessa (header/detalhe/trailer) validados byte a byte contra
  planilhas reais (`VALIDADOR_CNAB400_BRADESCO*.xlsx`) via round-trip parse→gerarArquivo;
  Itaú só contra o manual (nenhuma linha real de Remessa/Retorno confirmada ainda). BMP
  Money Plus (274, `banks/bmp.js`) validado contra 2 planilhas VALIDADOR próprias +
  3 arquivos `.RET` reais distintos do cliente (round-trip byte a byte OK em 93 linhas
  de detalhe: 15 + 42 + 36) **e agora também contra o manual oficial do BMP**
  (bmpdocs.moneyp.com.br/baas/layouts-de-cnab/cnab-400, v13.1 05/2026) — o manual
  confirmou a tabela completa de Header+Detalhe da Remessa e trouxe as tabelas oficiais
  de Ocorrência/Motivo (Remessa e Retorno) — o BMP foi o primeiro banco com motivo
  escopado por ocorrência (mesmo código de motivo significa coisas diferentes em
  ocorrências diferentes), então `engine.js`/`parseDetalhe` passou a aceitar
  `config.motivos[ocorrencia][cod]` (objeto aninhado) além do mapa plano
  `config.motivos[cod]` já usado pelo Bradesco — checa aninhado primeiro, cai pro
  plano se não achar, sem quebrar os bancos existentes. O Detalhe da Retorno segue
  confirmado só por
  planilha+arquivo real (o manual não trouxe a tabela completa da Retorno). Ordem de
  confiança quando fontes divergem: **arquivo real > planilha com amostra própria >
  manual oficial** (tabela sem amostra, mais sujeita a erro de transcrição) — ex.: o
  manual descreve a posição 021-037 do Detalhe como um campo único "fornecido pela
  BMP", mas planilha (com amostra real "0001"/"1005113"/"09") e arquivo real confirmam
  que é decomposto em zero+carteira+agência+conta+dígito, então a decomposição foi
  mantida. Também corrigido nessa rodada: `nossoNumero` da Remessa (071-081) era tipo
  alfanumérico (bug — gerava com espaços em vez de zeros à esquerda), confirmado
  numérico pela amostra da planilha ("00000000002") e pelo manual. O campo 293-295 do
  detalhe de Retorno (que a planilha marcava inteiro como "brancos") na verdade é
  brancos (293-294) + 1 dígito fixo "0" (295) antes da Data do Crédito — real venceu
  aqui também (a amostra do manual dizia "brancos" nos 3, mas 51 linhas reais
  discordam). Um arquivo de teste recebido no processo (`..._Nuevo.RET`) veio truncado
  (linha de detalhe com 392 de 400 posições, trailer com contagem de títulos
  inconsistente com o conteúdo) — descartado da validação, não é dado confiável; depois
  veio a versão corrigida dele (`...BaixaDataCob_CNAB400BMP.RET`, 2 títulos), que bate
  byte a byte, elevando o total validado para **95 linhas de detalhe reais** (15+42+36+2).
  Esse arquivo corrigido, porém, **não tem Trailer** — foi o que motivou a conferência de
  Trailer descrita abaixo.
- **Conferência do Trailer (`engine.js`, `conferirTrailer`)**: na leitura, compara o que o
  Trailer declara (quantidade de títulos e valor total) com o que foi lido, e avisa se
  não fecha ou se o Trailer não existe. Isso pega arquivo truncado/editado à mão — o
  `..._Nuevo.RET` acima, por exemplo, hoje é sinalizado automaticamente (declarava 36
  títulos com 1 linha de detalhe), antes só dava pra achar na mão. É opt-in por banco via
  `config.trailerConferencia = { quantidadeKey, valorKey }`: BMP usa os dois, Bradesco só
  a quantidade (não há arquivo real de Bradesco com trailer pra confirmar qual soma o
  valor total usa) e Itaú não declara (Trailer com totais separados por tipo de cobrança —
  habilitar ali geraria aviso falso). O valor esperado sai da mesma regra da geração
  (`trailerTotalFn`/`trailerTotalKey`), pra validação e geração não divergirem.
  **Atenção:** no BMP o valor total do Trailer é a soma de `valorTitulo`, NÃO de
  `valorPago` — os 3 arquivos reais com trailer provam isso (2.833,41 vs 2.893,99 e
  11.137,21 vs 11.298,19). O gerador somava `valorPago` e escrevia trailer errado; foi
  corrigido. Bradesco segue somando `valorPago || valorTitulo` porque é a regra herdada e
  não temos arquivo real pra contestar.
  Trailer de Retorno tem só posições 1-39 e 395-400 confirmadas — o manual sugere um
  detalhamento por ocorrência a partir da posição ~40 (igual ao do Bradesco), mas
  todos os arquivos reais disponíveis só têm ocorrência 06, insuficiente pra confirmar
  as posições das outras ocorrências nesse detalhamento; resto fica `naoConfirmado`.
  Ferramenta antiga `cnab400-bradesco/` foi aposentada — não recriar.
  Ícone pequeno do banco na UI (`ui.js`, `BANK_ICONS`) usa SVGs em
  `tools/datacob/cnab400/assets/icons/` (curados a partir de `assets/img/bancos/`, ver
  abaixo) — ao adicionar um banco novo, copiar o SVG correspondente para essa pasta e
  registrar em `BANK_ICONS`. Modo "Validar" tem botão "Editar e gerar novo arquivo"
  (`ui.js`, `editAndRegenerate`) — depois de ler um arquivo com sucesso, leva header +
  títulos extraídos para o modo "Gerar" já preenchidos (só os campos que aparecem no
  formulário, i.e. `formFields`), para o usuário ajustar valores e baixar uma nova
  versão sem redigitar tudo do zero. O modo "Gerar" também tem sua própria zona de
  importação (`ui.js`, `importarArquivoNoGerador`) — dá pra soltar/selecionar um
  .REM/.RET direto ali, sem precisar passar pelo "Validar" antes; ambos os caminhos
  reaproveitam `preencherGeradorComDados()` pra preencher o formulário.
- **Base64** (`tools/dados/base64-pdf/` e `decodificador/`): decode 100% no browser.
  `base64-pdf` extrai Base64 embutido em JSON automaticamente (detecta por magic bytes
  `%PDF`). `decodificador/` é o conversor universal (Base64, URL, HTML entities, hex,
  binário, ROT13, JWT, Unicode escape) com detecção automática de formato e exemplos
  prontos por formato.
- **Dados que parecem código são dados:** `assets/data/datacob-knowledge-base.js` é usado
  pela página de erros, pelo chatbot e pelo support-copilot. `assets/data/respostas-predefinidas.js`
  é usado pelo support-copilot (aba "Respostas Prontas") e pela página standalone em
  `tools/datacob/respostas-predefinidas/`. `assets/data/tracks/track-7-sql.js` alimenta o
  Track 7 e `assets/data/datacob-sandbox-schema.js` alimenta o sandbox das lições e o SQL
  Playground. Não remover nenhum desses.
- **Geradores de dados fictícios BR** (nome/CPF válido/celular/CEP/endereço/e-mail) ficam
  em `assets/js/fake-data-br.js` (módulo sem dependência de DOM, mesmo algoritmo de CPF já
  usado em `massa-dados/script.js`). Reusar esse módulo em vez de reescrever geradores.
- **Gamificação de trilhas** (pontos/badges/progresso) é genérica em `assets/js/gamification.js`,
  100% `localStorage`, sem backend — track-agnóstica (recebe `trackId`). O Track 7
  (`tools/datacob/treinamento-sql/`) é o primeiro consumidor; futuras trilhas reusam o
  mesmo motor em vez de criar um novo.
- **Sandbox SQL do Track 7** roda via AlaSQL 100% no navegador — nenhuma conexão com o SQL
  Server real do DataCob. Desde set/2026 as 15 lições praticam contra o **schema real**
  (`assets/data/datacob-sandbox-schema.js`, o mesmo do SQL Playground) com dados 100%
  fictícios; o dataset genérico antigo (`track-7-sql-dataset.js`, tabelas
  boletos/remessas/retornos que não existem no DataCob) foi removido depois da migração —
  não recriar. Ao mexer no conteúdo das lições, **rode todas as queries contra o AlaSQL
  antes de commitar**: `tryIt.query` e `exercicios[].solucao` das 15 lições (61 queries)
  foram validadas uma a uma, e o simulador tem limites que o T-SQL real não tem (ver
  gotcha da semeadura abaixo). O SQL Query Builder (`tools/datacob/query-builder/`) também
  é só um gerador de texto de query + preview fictício, não executa nada contra o banco real.
- **Semeadura do sandbox AlaSQL é fonte única em `assets/js/sql-sandbox.js`** —
  `semearTabelas()` + `executarQuery()`. **Não use `SELECT * INTO tabela FROM ?`**: esse
  comando NÃO funciona no AlaSQL 4 (estoura em `'xcolumns'`) e era exatamente o bug que
  deixava o sandbox do Track 7 quebrado (nenhuma tabela criada → toda query respondia
  "Table does not exist: boletos", com o erro escondido num `try/catch` que só logava
  aviso). O que funciona é `DROP TABLE IF EXISTS` → `CREATE TABLE` → `INSERT INTO ...
  SELECT * FROM ?` (idempotente, reload não duplica linha). Cuidado também com alias:
  `AS Total` quebra o parser do AlaSQL (palavra reservada) — usar `Qtd_Linhas` e afins.
- **SQL Playground** (`tools/datacob/sql-playground/`, set/2026): simulador SQL livre
  ("Try it Yourself" fora das lições), com navegador de schema, exemplos prontos,
  histórico, consultas salvas, estatísticas de uso e export CSV. Roda contra
  `assets/data/datacob-sandbox-schema.js` — **as tabelas/colunas espelham o modelo real
  do DataCob** (Cliente, Grupo, Financiado, Contrato, Parcela, Negociacao,
  Negociacao_Parcela, Acordo, Parcela_Acordo, Historico, Ocorrencia_Sistema, Email,
  Telefone, Endereco, extraídas do diagrama ER do banco), mas **os dados são 100%
  inventados** (LGPD: nenhum nome/CPF/telefone/e-mail real). Continua sem nenhuma conexão
  com o SQL Server real. Metadados de coluna/PK/FK e as consultas de exemplo saem do
  mesmo arquivo (`DATACOB_SCHEMA`/`CONSULTAS_EXEMPLO`) — a UI não duplica lista de tabela.
- **Histórico/consultas salvas de SQL** ficam em `assets/js/sql-query-store.js` — módulo
  genérico por `toolId`, 100% `localStorage` (mesmo padrão do `gamification.js`, sem
  backend). Usado pelo SQL Playground e também pelo sandbox das lições do Track 7, que
  grava as execuções com o `toolId` da trilha.
- **Centro de Aprendizado** (`pages/aprender/`, set/2026): hub das trilhas/simuladores no
  espírito do W3Schools — card por tópico com exemplo de código real + botão "Try it
  Yourself", seção "Teste seus conhecimentos" e painel de progresso. Adicionar tópico =
  adicionar um objeto em `TOPICOS` (em `pages/aprender/script.js`); nenhum card é escrito
  à mão no HTML. O painel de progresso **não tem dados próprios**: soma o que
  `gamification.js` (pontos/lições/badges) e `sql-query-store.js` (execuções/salvas) já
  gravam — se entrar uma segunda trilha, é só somar ali. Feito a partir de um clone da
  home do W3Schools enviado como referência, mas **sem** trazer marca, logo, imagens ou
  paleta de lá: identidade Redwood do site, mesma decisão que foi tomada no query-builder
  (recebido em Tailwind/jsx e refeito no padrão do site).
- **Biblioteca de logos de bancos** (`assets/img/bancos/`, ago/2026): cópia integral do
  repositório [Bancos-em-SVG](https://github.com/Tgentil/Bancos-em-SVG) (87 bancos, SVG),
  guardada como fonte para quando novos bancos forem adicionados a ferramentas do site
  (hoje só o Validador CNAB 400 usa, ver acima). Não é gerada nem processada por build —
  são arquivos estáticos; copiar o SVG desejado para a pasta `assets/icons/` da ferramenta
  em vez de referenciar `assets/img/bancos/` diretamente.

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
- [x] **Parte 5 — Ferramentas e trilha nova (jul/2026).** Itaú (341) adicionado ao CNAB 400
  multi-banco (`banks/itau.js`); Decodificador Universal (`tools/dados/decodificador/`);
  Respostas Predefinidas — aba no Support Copilot + página standalone, fonte única em
  `assets/data/respostas-predefinidas.js`; Track 7 "Treinamento SQL" (15 lições,
  sandbox AlaSQL, gamificação) em `tools/datacob/treinamento-sql/`; SQL Query T-SQL -
  Relatórios (`tools/datacob/query-builder/`, recebido com Tailwind/jsx/docs redundantes —
  refeito no padrão do site); `search.js` da home deixou de duplicar dados de ferramentas
  (importa `searchItems` de `navigation-v2.js`).
  - [ ] **Pendente:** `arriba-api` (`/chat` e `/support/copilot/analyze`) está sempre em
    `source: "local-fallback"` — integração OpenAI parece fora do ar no Render (fora deste
    repo, precisa checar env vars/logs do serviço). O fallback local de conhecimento também
    retornou artigo errado num teste (relevância ruim), vale investigar no `arriba-api`.
- [x] **Parte 6 — CNAB Bradesco real + menu multi-CRM (ago/2026).** Retorno e Remessa
  Bradesco corrigidos com dados reais (planilhas `VALIDADOR_CNAB400_BRADESCO*.xlsx` +
  manual oficial "Layout da Cobrança Bradesco" v05/2008) — Remessa estava quase toda com
  campos "não confirmado"; agora bate byte a byte com fonte real e oficial (testado
  ponta a ponta no navegador: preencher formulário → gerar → baixar `.REM`/`.RET`). Menu
  reorganizado: "DataCob" (item direto em Ferramentas) virou "CRMs" com abas — ver
  `crms.tabs` acima — preparando o site para ferramentas de outros CRMs além do DataCob.
  - [ ] **Pendente (roadmap, sem trabalho iniciado):** mais bancos no CNAB 400 (Banco do
    Brasil, Santander...) — a arquitetura já suporta (só criar `banks/<banco>.js` e
    registrar em `banks/registry.js`), falta manual/planilha validadora de cada banco para
    implementar com o mesmo rigor usado no Bradesco (não estimar posições "prováveis").
    Também falta a primeira ferramenta de "Outros CRM" (aba já existe, vazia).
- [x] **Parte 7 — BMP Money Plus + rename + ícones de banco (ago/2026).** BMP (274)
  adicionado ao CNAB 400 (`banks/bmp.js`) usando 2 planilhas VALIDADOR próprias + 3
  arquivos `.RET` reais do cliente (sem manual oficial ainda — documentado no código e
  aqui). Ferramenta renomeada de "CNAB 400 (multi-banco)" para "Validador CNAB 400"
  (menu, busca, título, hero). Ícone pequeno do banco adicionado ao lado do nome na UI
  (Bradesco/Itaú/BMP), sem alterar o layout existente — biblioteca de logos completa
  (87 bancos) salva em `assets/img/bancos/` para uso futuro.
- [x] **Parte 8 — Editar/importar arquivo no modo Gerar + 3º arquivo real do BMP
  (ago/2026).** Botão "Editar e gerar novo arquivo" no modo Validar e zona de
  importação própria dentro do modo Gerar (ambos levam cabeçalho + títulos de um
  .REM/.RET lido direto para o formulário de gerar, ver gotcha do CNAB 400 acima).
  BMP Money Plus revalidado com mais um arquivo `.RET` real (36 títulos) — achou e
  corrigiu um campo do detalhe de Retorno que a planilha marcava errado como
  "brancos" (293-295; na real são 2 brancos + 1 dígito fixo "0"); um outro arquivo
  de teste recebido no processo veio truncado e foi descartado (ver gotcha).
- [ ] i18n PT/EN · command palette `Ctrl/Cmd+K`.
- [ ] Screenshot/GIF real em `docs/preview.png` para o README de portfólio (ainda placeholder).

## Convenções de trabalho

- Antes de apagar qualquer arquivo, **verificar referências com `grep`** — nunca remover às cegas.
- Commits pequenos e por parte. Mensagens no formato `tipo(escopo): descrição`.
- Respostas e comentários em **português (Brasil)**.
- Preservar o visual/tom retro-criativo e a paleta Deep Autumn/Redwood em todos os entregáveis.
