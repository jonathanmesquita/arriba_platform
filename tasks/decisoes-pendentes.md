# 🙋 Decisões pendentes

Só o que depende de decisão de quem é dono do projeto. Cada item diz o que trava.

---

## ⏳ Marcas de TERCEIROS no repositório (direito autoral / marca registrada)

**Pedido:** "não quero usar nenhuma empresa por enquanto, para evitar direitos autorais."

A descaracterização de out/2026 mirou **uma** empresa e tirou o conteúdo operacional dela.
Esta verificação (2026-10-05) é outra: procura marca de **qualquer** terceiro. Sobrou coisa,
e em duas categorias bem diferentes.

### O que foi medido

| O que | Quanto | Usado hoje? | Observação |
|---|---|---|---|
| **Logos de bancos** `assets/img/bancos/` | **205 SVG, 87 instituições, 9,0 MB** | **não** — nenhuma página referencia a pasta | são marcas registradas de 87 instituições financeiras, copiadas inteiras |
| **Ícones de banco na UI** `cnab400/assets/icons/` | 3 SVG | **sim** — aparecem na tela do validador | Bradesco, Itaú e BMP |
| **Logo da empresa e do produto** `assets/img/logos-assets/` | 2 arquivos | **não** — órfãos | `logo-ph3.webp` e `logo-datacob.png` sobreviveram à descaracterização |
| **Capturas do produto real** `capas-wallpaper-menus/` | 2 JPG | **não** — órfãos | tela de login (com logo, nome da empresa, "© 2026" e versão interna `v.3.0.289.7`) e **peça de marketing** com os selos ISO 27001 e LGPD |
| **Capas com o produto no nome** `capas-wallpaper-menus/` | 3 PNG | **não** — órfãos | `capa-01-*-datacob.png` |
| **Imagem servida pelo site da Oracle** `index.html` | 3 `<img>` | **sim** | `https://www.oracle.com/a/ocom/img/fe-nav-close-black.svg` — o navegador de quem visita busca o arquivo **no servidor da Oracle** |
| **Nome "Oracle" no design** | `oracle-inspired.css`, README, comentários | sim | "Oracle-inspired", "Oracle style" |
| **Nomes de banco no CNAB** `banks/*.js` | 3 módulos | sim | `bradesco.js`, `itau.js`, `bmp.js` |
| **Arquivo de licença / créditos** | **nenhum** | — | o repositório não declara licença própria nem origem de asset de terceiro |

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

**6. Licença.** O repositório é público e não diz sob que termos. Vale decidir a licença
do que é seu e creditar o que não é (as bandeiras de idioma, as fontes).

> Nota: isto é inventário do que está no repositório, não parecer jurídico.

---

## ⏳ Até onde vai a descaracterização do projeto

**Pedido:** "projeto de estudos — tirar tudo que relaciona a uma empresa específica, quero
que seja um protótipo apenas."

### Inventário (medido em 2026-10-01)

| Categoria | Tamanho | O que é | Risco de manter num protótipo público |
|---|---|---|---|
| **Manuais operacionais** `tools/.../docs/*-manuais/` | **87 páginas** | documentação interna de operação, com pastas que trazem **nome de clientes reais** (`havan-api-…`, `willbank-api-…`, `wedoo-api-…`, `cobransaas-…`) | **alto** — é material de cliente, não demonstração de engenharia |
| **Base de erros + respostas prontas** `assets/data/` | 2 arquivos | catálogo de erro do produto e texto padrão de atendimento | alto — conteúdo de operação |
| **Layouts de negativação** `tools/.../bureau/layouts/` | 112 campos | gerados a partir de planilhas de validação de um cliente | **alto** — é a especificação dela, não um layout público |
| **Copiloto de suporte** `tools/.../support-copilot/` | 1 ferramenta | integra com o help desk da empresa (sessão, artigos) | alto — só faz sentido dentro dela |
| **Nomes de pasta e rótulo** (`cobranca`, `ph3a`, help desk, bureau) | ~200 arquivos | nome do produto/empresa em caminho, menu, título e texto | médio — cosmético, mas é o que se vê |
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

- **Solução:** _(escreva aqui a letra escolhida e eu executo numa passada só)_

---

## ⏳ Qual chat do site aposentar

Existem dois caminhos de chat convivendo: o widget do site (base local + provedor opcional
no navegador) e a rota `/chat` do backend externo, que está presa em fallback local.
Manter os dois dobra a manutenção e confunde quem lê o repositório.

- **Solução:** _(qual sai)_

---

## ⏳ O app de chat continua neste repositório?

`apps/arriba-chat-ia/` tem build, backend e banco próprios — é a única exceção à regra de
site estático. Pode continuar aqui (com `.vercelignore` excluindo do deploy) ou virar
repositório próprio via `git subtree`.

- **Solução:** _(aqui ou repositório próprio)_
