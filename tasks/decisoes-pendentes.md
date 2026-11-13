# 🙋 Decisões pendentes

Só o que depende de decisão de quem é dono do projeto. Cada item diz o que trava.

---

## ⏳ Itens do status de nov/2026 que contradizem decisões já tomadas

O documento de status usa informações até o início de outubro, antes da descaracterização.
Três itens dele voltam atrás em decisões registradas — por isso estão aqui, e não no backlog.

| Item do status | Decisão que ele contradiz |
|---|---|
| "Módulo de respostas predefinidas no estilo de help desk" | Removido de propósito na descaracterização de outubro: era conteúdo operacional de empresa |
| "Dashboard de chamados conectado a API/BD real" + "registro do app no tenant da empresa (produção)" | O repositório é **público** e é protótipo. Chamado real tem dado de cliente (LGPD) — mesma lógica que levou o teste de carga de um sistema externo para repositório privado |
| "Visual: Oracle Redwood" | O pedido foi "nenhuma empresa, por direitos autorais"; ver o inventário de marcas abaixo |

**O que trava:** decidir se o dashboard e as respostas predefinidas vivem num repositório
privado (e o site público só mostra uma versão com dado inventado) ou se ficam de fora.

## ✅ ~~O `arriba-api` é público e guarda o que saiu do site em outubro~~

**Resolvido em 05/11:** o repositório foi tornado **privado** (saída "a" abaixo), o que esconde
também o histórico. O conteúdo de empresa continua lá dentro, fechado, e as rotas do help desk
passaram a exigir login (API privada por padrão). O texto abaixo fica como registro.

<details><summary>Registro original</summary>


Medido em 04/11/2026, ao anexar o repositório para o login com Microsoft:

| O quê | Quanto |
|---|---|
| Catálogos de manual e pacote (`modules/knowledge/`) | ~9.500 linhas |
| Nome de **cliente real** em caminho de manual | 4 clientes |
| Menções a empresa, produto e help desk | mais de 1.700 |
| Copiloto de help desk (módulo e rotas próprios) | ~3.000 linhas |

Em outubro, no site, esse mesmo material foi classificado como risco **alto** e removido.

Conferido em 05/11: **0 forks e 0 estrelas** (tornar privado esconde tudo, sem cópia pública
sobrando) e **nenhum segredo real no histórico** — os valores de `ARRIBA_JWT_SECRET` e
do segredo do webhook do help desk que aparecem nos commits são placeholders ("troque-…").

**O que trava:** apagar os arquivos hoje não tira do histórico do git — num repositório
público, qualquer um ainda lê as versões antigas. As saídas reais são: (a) tornar o
repositório **privado** (configuração do GitHub, só o dono faz; resolve inclusive o histórico);
(b) descaracterizar como foi feito no site e aceitar que o histórico continua exposto; ou
(c) as duas. O login com Microsoft já entregue não depende dessa escolha.

</details>

---

## ⏳ O repositório antigo precisa ficar privado

**Feito em 13/11:** o histórico recomeçou. Este repositório é novo e começa num commit
único, com o projeto como estava naquele dia; o anterior foi renomeado pelo dono e guarda
todas as versões antigas, com os 25 PRs — e, neles, os manuais com nome de cliente e as
imagens de terceiros removidos.

**O que trava (só o dono faz):** conferir que o repositório antigo está **privado**
(*Settings → Danger Zone → Change visibility*). Renomear não esconde nada: enquanto ele
for público, o material continua acessível, só que em outro endereço. Depois disso este
item fecha.

- **Solução:** _(confirmar que o antigo está privado)_

---

## ✅ ~~Marcas de TERCEIROS no repositório (direito autoral / marca registrada)~~

**Resolvido em 12/11** por decisão delegada do dono ("pode decidir o que fazer"): saíram os
205 logos de bancos, os 3 ícones de banco da tela do CNAB (trocados por um ícone neutro), os
dois logos de empresa/produto e 23 imagens de capa (telas de produto, mascote com símbolo da
empresa, fotos de site corporativo). Ficou em aberto só o nome `oracle-inspired.css` (item 5)
e o crédito das bandeiras de idioma (item 6). O texto abaixo fica como registro.

**Pedido:** "não quero usar nenhuma empresa por enquanto, para evitar direitos autorais."

A descaracterização de out/2026 mirou **uma** empresa e tirou o conteúdo operacional dela.
Esta verificação (2026-10-05) é outra: procura marca de **qualquer** terceiro. Sobrou coisa,
e em duas categorias bem diferentes.

### O que foi medido

| O que | Quanto | Usado hoje? | Observação |
|---|---|---|---|
| **Logos de bancos** `assets/img/bancos/` | **205 SVG, 87 instituições, 9,0 MB** | **não** — nenhuma página referencia a pasta | são marcas registradas de 87 instituições financeiras, copiadas inteiras |
| **Ícones de banco na UI** `cnab400/assets/icons/` | 3 SVG | **sim** — aparecem na tela do validador | Bradesco, Itaú e BMP |
| **Logo da empresa e do produto** `assets/img/logos-assets/` | 2 arquivos | **não** — órfãos | um logo da empresa e um do produto sobreviveram à descaracterização |
| **Capturas do produto real** `capas-wallpaper-menus/` | 2 JPG | **não** — órfãos | tela de login (com logo, nome da empresa, "© 2026" e número de versão interna) e **peça de marketing** com os selos ISO 27001 e LGPD |
| **Capas com o produto no nome** `capas-wallpaper-menus/` | 3 PNG | **não** — órfãos | nome do produto no nome do arquivo |
| ~~**Imagem servida pelo site da Oracle**~~ — **resolvido em 04/11**: estava só na página Sobre antiga, que foi refeita | 3 `<img>` | não | `https://www.oracle.com/a/ocom/img/fe-nav-close-black.svg` — o navegador de quem visita busca o arquivo **no servidor da Oracle** |
| **Nome "Oracle" no design** | `oracle-inspired.css`, README, comentários | sim | "Oracle-inspired", "Oracle style" |
| **Nomes de banco no CNAB** `banks/*.js` | 3 módulos | sim | `bradesco.js`, `itau.js`, `bmp.js` |
| ~~**Arquivo de licença**~~ — **resolvido em 05/11**: `LICENSE` MIT na raiz; o README exclui logos e marcas de terceiros | 1 arquivo | sim | falta só creditar asset de terceiro (item 6) |

### O que é decisão sua, e por quê

**1. Os 7 órfãos (logo da empresa, logo do produto, as 2 capturas, as 3 capas).**
Não são usados por nada — removê-los não quebra tela nenhuma. São o resíduo mais direto:
a captura de marketing traz inclusive selo de certificação de terceiro. *Recomendação:
remover; é custo zero.*

**2. Os 205 logos de bancos (9,0 MB).** É o item grande, e o `CLAUDE.md` hoje manda o
contrário — diz para guardá-los "como fonte para quando novos bancos entrarem no CNAB".
Nenhuma página os usa; só 3 foram copiados para a ferramenta. Travado porque remover
contraria uma instrução escrita do projeto.

**3. O hotlink da Oracle.** Independente de marca, é frágil: a imagem some se a Oracle
mudar o caminho, e cada visita do site informa à Oracle quem acessou. Trocar por um ícone
próprio resolve as duas coisas de uma vez. *Recomendação: trocar.*

**4. Nome de banco no código e na tela.** Diferente dos logos: o CNAB 400 é **especificação
pública**, e dizer "esta ferramenta lê o CNAB do Bradesco" é uso descritivo — é o que
torna a ferramenta verificável. O **logo** é que é o ativo de marca. Decisão de apetite,
não de necessidade.

**5. "Oracle-inspired".** Descreve a inspiração do layout, não se passa pela Oracle. Se a
régua for "nenhuma empresa", vira "mega-menu corporativo" e o arquivo muda de nome.

**6. Licença.** ~~Decidir a licença~~ — **resolvido em 05/11**: MIT, mesmo texto do
`arriba-api`, e o README diz que logos e marcas de terceiros ficam de fora. Continua em
aberto só **creditar** o que não é seu (as bandeiras de idioma, as fontes) — e, se os 205
logos ficarem (item 2), dizer de onde vieram.

> Nota: isto é inventário do que está no repositório, não parecer jurídico.

---

## ✅ ~~Até onde vai a descaracterização do projeto~~

**Resolvido em out/2026 com a saída B** ("remover operação, manter engenharia"), como registra
o `CLAUDE.md`: saíram manuais, base de erros, respostas prontas, copiloto e layouts de cliente.
Conferido em 05/11: nenhuma ocorrência de nome de empresa ou cliente fora de `apps/`, `tasks/`
e do histórico. O texto abaixo fica como registro.

### O pedido original

**Pedido:** "projeto de estudos — tirar tudo que relaciona a uma empresa específica, quero
que seja um protótipo apenas."

### Inventário (medido em 2026-10-01)

| Categoria | Tamanho | O que é | Risco de manter num protótipo público |
|---|---|---|---|
| **Manuais operacionais** `tools/.../docs/*-manuais/` | **87 páginas** | documentação interna de operação, com pastas que trazem **nome de clientes reais** (4 clientes) | **alto** — é material de cliente, não demonstração de engenharia |
| **Base de erros + respostas prontas** `assets/data/` | 2 arquivos | catálogo de erro do produto e texto padrão de atendimento | alto — conteúdo de operação |
| **Layouts de negativação** `tools/.../bureau/layouts/` | 112 campos | gerados a partir de planilhas de validação de um cliente | **alto** — é a especificação dela, não um layout público |
| **Copiloto de suporte** `tools/.../support-copilot/` | 1 ferramenta | integra com o help desk da empresa (sessão, artigos) | alto — só faz sentido dentro dela |
| **Nomes de pasta e rótulo** (`cobranca`, sigla da empresa, help desk, bureau) | ~200 arquivos | nome do produto/empresa em caminho, menu, título e texto | médio — cosmético, mas é o que se vê |
| **Layouts de banco** `cnab400/banks/` | 3 bancos | CNAB 400 é **especificação pública de banco**, não da empresa | baixo — é o que torna a ferramenta real |
| **Simulador SQL / dados fictícios** | 2 arquivos | o schema **espelha** um modelo real, com dados 100% inventados | baixo-médio — vale renomear tabela e campo |

### As três saídas

| | O que faz | Resultado |
|---|---|---|
| **A. Renomear tudo** | produto, empresa, bureau e help desk viram nomes fictícios; conteúdo todo fica | site completo, mas com 87 manuais de operação "de mentira" — fica estranho e não vira portfólio |
| **B. Remover operação, manter engenharia** | saem manuais, base de erros, respostas prontas, copiloto e layouts de cliente; ficam as ferramentas (CNAB, CSV, Base64/decodificador, editor web, trilha e playground SQL, app de chat) com nomes neutros | protótipo enxuto e honesto: mostra o que foi construído, sem material de ninguém |
| **C. Só a camada visível** | troca nome em título, menu e texto; caminhos (`tools/cobranca/…`) continuam | rápido, mas o repositório continua apontando para a empresa |

**Recomendação: B.** O valor de estudo está nos parsers, no motor de arquivo posicional, no
sandbox e no app de chat — não na documentação de operação. B também resolve o item de maior
risco (nome de cliente em caminho de arquivo), que A e C mantêm.

**O que trava:** sem a escolha, não dá para mexer — A, B e C mudam os mesmos arquivos em
direções diferentes, e metade do caminho fica pior que qualquer um dos três.

- **Solução:** B (executada em out/2026).

---

## ✅ ~~Qual chat do site aposentar~~

**Resolvido em 12/11:** o dono mandou apagar a rota antiga. `POST /chat` saiu do `arriba-api`
(`routes/chat.routes.js` e `modules/chat/`) e responde
404. Fica um caminho só: o widget do site, com a base local, o provedor do administrador e,
se ligada, a IA do servidor (`/v1/ia/conversar` e `/publico/chat`). Vale a partir do
merge e do deploy no Render.

---

## ⏳ Renovação do GitHub: o que fica à vista, o que é arquivado e o que é apagado

Pedido de 12/11: "renovar o GitHub, deixar os projetos novos de 2026 e atualizar os antigos".
São 29 repositórios. A proposta abaixo é ponto de partida — **nada fora do `arriba_platform`
e do `arriba-api` foi tocado**: arquivar e apagar repositório é ação do dono, na tela do
GitHub, e apagar não tem volta.

| Grupo | Repositórios | Proposta |
|---|---|---|
| Vitrine (fixar no perfil) | `arriba_platform`, `jm-portfolio`, `nexus2027` e os dois de análise de dados de 2025 (`Challenge-Alura-TelecomXBR`, `Challenge--Alura-Store`) | manter, com README, descrição, tópicos e link do site em dia |
| Perfil | `jonathanmesquita` (README do perfil) | reescrever para 2026 |
| Privado | `arriba-api` | fica como está |
| ~~Apagar~~ **feito em 13/11** | `arriba_platform_backend`, `meu-teste-de-medalhas`, `projeto-git-hub_01`, `Challenge--Alura-telecom_x_analise-evasao-de-clientes-main` e os 4 forks sem commit próprio (`developer-roadmap`, `emoji-cheat-sheet`, `text-generation-webui`, `skill-alexa-chatgpt4`) | apagados pelo dono; conferido na lista de repositórios (29 → 21). O e-mail corporativo exposto saiu junto |
| Arquivar (somem da frente, continuam existindo) | exercícios de curso de 2022 a 2025: `mario-jump`, `flappy-bird`, `linktree`, `Card-Magic-3D-main`, `portfolio-alura-01`, `cartao_mesquita`, `logica-js-projeto_inicial`, `challenge-amigo-secreto`, `conversor-moedas`, `convertor-maiusculas-minusculas`, `DecodificacaoBase64`, `leitor-csv`, `skills-getting-started-with-github-copilot`, e o fork `python-nao-programadores-2687000` (tem exercícios seus, de abr/2025) | arquivar |

**Conferido em 12 e 13/11, lendo os 22 repositórios próprios e os últimos commits dos 5 forks
(só a branch principal de cada fork):**

- `arriba_platform_backend` tem só um README e um `.gitignore` — nada se perde ao apagar.
- **README do perfil está com texto de modelo no ar**: os três cartões de projeto dizem
  "[NOME DO PROJETO 1]" com link `#`, o do blog também aponta para `#`, a imagem do topo é
  um link de anexo de chat (esse tipo de link expira) e a animação de contribuições é de
  2021. É a primeira coisa que um recrutador vê — prioridade da renovação.
- **E-mail corporativo público** em
  `Challenge--Alura-telecom_x_analise-evasao-de-clientes-main/README.md:89`. Os outros
  repositórios usam o e-mail pessoal. Trocar, ou apagar o repositório (ele duplica o
  `Challenge-Alura-TelecomXBR`, que é o mais recente).
- Nome do empregador aparece em `jm-portfolio/index.html` (seção de experiência — normal em
  portfólio) e em `nexus2027` (um item do jogo e o README). Não é material da empresa, é
  menção; fica a critério do dono.
- Nenhuma chave ou senha encontrada nos arquivos atuais (busca por formatos comuns; o
  histórico dos commits não foi varrido).
- README de duas linhas ou com "alterar depois": `DecodificacaoBase64`,
  `convertor-maiusculas-minusculas`, `leitor-csv` — mais um motivo para arquivar.
- `jm-portfolio/README.md` se contradiz: "Current version v0.8.0" no topo e "Live in
  production — v1.0.0" no fim; e descreve o Arriba como "full-stack support platform", texto
  de antes da descaracterização.

**O que trava:** aprovar a tabela. Arquivar e apagar é na tela do GitHub (não há ferramenta
para isso na sessão). Para publicar o README novo do perfil e corrigir o do portfólio, a
sessão precisa de permissão de escrita nesses dois repositórios.

**Atualização de 13/11:** os oito da linha "apagar" já saíram. O rascunho do README do perfil
foi entregue ao dono na conversa e **não foi publicado** — ele revisa depois. Segue aberto:
arquivar os exercícios de curso e publicar o README do perfil.

- **Solução:** _(arquivar os exercícios? publicar o README do perfil?)_

---

## ⏳ O app de chat continua neste repositório?

`apps/arriba-chat-ia/` tem build, backend e banco próprios — é a única exceção à regra de
site estático. Pode continuar aqui (com `.vercelignore` excluindo do deploy) ou virar
repositório próprio via `git subtree`.

- **Solução:** _(aqui ou repositório próprio)_
