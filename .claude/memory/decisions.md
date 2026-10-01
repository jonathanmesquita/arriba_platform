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

**Decisão:** formato `tipo(escopo)?: descrição`, validado por `commit-msg` do modelo a empresa.
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
