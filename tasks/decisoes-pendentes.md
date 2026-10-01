# 🙋 Decisões pendentes

Só o que depende de decisão de quem é dono do projeto. Cada item diz o que trava.

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
