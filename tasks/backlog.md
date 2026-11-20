# 📋 Backlog

Trabalho futuro já entendido. Formato em [README.md](README.md).

## Qualidade do site

- [ ] Política de conteúdo (CSP) completa: tirar script e estilo de dentro do HTML 📅 2026-11-20 🔽 baixa #area/site #esforco/g 🤖
  - Contexto: `vercel.json` (nov/2026) já publica `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS, `X-Frame-Options` e uma CSP só com `base-uri 'self'; frame-ancestors 'self'`. A parte que barra script injetado (`script-src` sem `'unsafe-inline'`) ainda não dá: 25 páginas têm `<script>` dentro do HTML, 24 têm `<style>` e 16 usam `style="…"`
  - Armadilha: a moldura `srcdoc` do Editor Web **herda a CSP da página** — `script-src` fechado quebra o código de quem usa o editor. Resolver antes (servir o preview de outra origem, ou abrir exceção só nessa página)
  - Origens que a regra completa precisa liberar: `cdn.jsdelivr.net` (script, estilo, fonte), `api.arriba.jm.dev.br`, `dns.google`, `cloudflare-dns.com`, `api.ipify.org`, `api64.ipify.org`, `api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`, `http://localhost:11434` (Ollama), `placehold.co` (imagem); `blob:`/`data:` para a prévia de PDF
  - Ação: mover cada `<script>`/`<style>` para arquivo, por página; depois subir a CSP em modo `Report-Only`, conferir o console nas telas da lista `ESTADOS` e só então ligar

- [ ] Decidir o que fazer com `assets/icons/favicon_old.ico` 📅 2026-11-16 🔽 baixa #area/site #esforco/p 🤖
  - Contexto: é o ícone cinza anterior, renomeado pelo dono ao subir o novo; nenhuma página o referencia (conferido com grep)
  - Ação: apagar, se a cópia não for mais necessária — o git guarda o arquivo de qualquer forma
- [ ] Campos de texto continuam brancos no tema escuro nas telas de CSV→JSON e hash 📅 2026-11-13 🔽 baixa #area/site #esforco/p 🤖
  - Contexto: o `.form-control` do Bootstrap pinta fundo branco fixo; o texto digitado fica legível (passa no contraste), mas a caixa branca destoa do tema escuro
  - Local: `tools/dados/csv-to-json/csv-to-json.html`, `tools/dados/hash-generator/hash-generator.html`
  - Ação: campo pelos tokens (`--surface`, `--ink`, `--line-strong`), como nas telas novas; achado ao corrigir o contraste, adiado por não reprovar
- [ ] Tela de dados fictícios ainda tem cópia própria de CPF, CNPJ e CEP 📅 2026-11-13 🔽 baixa #area/ferramentas #esforco/p 🤖
  - Contexto: a fonte única é `assets/js/fake-data-br.js`; o RG já vem de lá, o resto não
  - Local: `tools/cobranca/massa-dados/script.js` (`generateCpf`, `generateCnpjNumeric`, `generateCep`)
  - Ação: importar do módulo e apagar as cópias; o CNPJ alfanumérico precisa entrar no módulo antes
- [ ] Apagar a cópia morta do patch de Tipo_Registro 📅 2026-10-02 🔽 baixa #area/ferramentas #esforco/p 🤖
  - Contexto: `patch-tipo-registro-layout.js` (251 linhas) não é carregado por página nenhuma
    — o HTML só carrega `script.js` e `bmp-layout.js`. A sequência que ele define já está
    dentro de `script.js:7`. São duas cópias da mesma tabela, e só uma é usada: quem editar
    a errada não vê efeito. `LAYOUT_FIX.md` documenta correção de layout já aplicada.
  - Local: `tools/cobranca/arriba-csv-generator/`
  - Ação: conferir com `grep` que nada referencia (feito) e remover os dois.

## Ferramentas

- [ ] CNAB: conferir o dígito verificador do CPF/CNPJ do pagador na leitura e no gerador 📅 2026-11-17 🔽 baixa #area/ferramentas #esforco/p 🤖
  - Contexto: o algoritmo do CPF/CNPJ é público e já está testado em `assets/js/fake-data-br.js`; hoje o CNAB só confere tamanho e se é dígito (`validacao.js`)
  - Local: `tools/cobranca/cnab400/validacao.js` (`validarValor`, `validarLinhas`), campo `numInscPagador`
  - Ação: validar só quando `codInscPagador` indica CPF (01) ou CNPJ (02); aviso, não erro, enquanto o tipo não for confirmado no manual de cada banco
- [ ] CNAB Inter 400: confirmar a numeração "ocorrência 01–04" do trailer do retorno e montar tipos 2 e 3 na tela 📅 2026-11-18 🔽 baixa #area/ferramentas #esforco/m 🤖
  - Contexto: o manual do Inter não liga os códigos do detalhe (02 aberto, 03 erro, 06 pago, 07 cancelado) à numeração do trailer; hoje o gerador grava o trailer do retorno zerado. Os registros tipo 2 (mensagens, descontos 2 e 3) e tipo 3 (e-mail e beneficiário final) são lidos e validados, mas a tela só monta o tipo 1
  - Local: `tools/cobranca/cnab400/banks/inter.js` (`RETORNO_TRAILER_FIELDS`, comentário do cabeçalho)
  - Ação: perguntar ao banco ou achar um arquivo de retorno real; depois ligar `trailerConferencia` e o gerador
- [ ] CNAB 240 Inter pagamentos: segmento C, retorno e regras que cruzam registros 📅 2026-11-18 🔽 baixa #area/ferramentas #esforco/m 🤖
  - Contexto: o manual cita o segmento C (opcional na TED) mas não traz o layout; o código de remessa do header só é definido como "1", então o retorno não é conferido nesse campo; a forma de iniciação 05 do Pix (no B) exige os dados bancários do favorecido no A, e só o lado B é conferido; formas 80/81 (ISS) sem segmento próprio no manual; DV do código de barras fora do manual
  - Local: `tools/cobranca/cnab240/layouts/inter-pagamentos.js` (cabeçalho do arquivo lista cada limite)
  - Ação: perguntar ao banco/obter arquivo de retorno real; depois ligar o que faltar
- [ ] CNAB 240 Santander: montar os segmentos R, S e Y na tela de geração e conferir os totais do trailer de lote do retorno 📅 2026-11-18 🔽 baixa #area/ferramentas #esforco/m 🤖
  - Contexto: R, S1, S2, Y03 e Y53 (remessa) e Y03/Y04 (retorno) são lidos e validados, mas o formulário só monta P/Q e T/U; o manual não diz como os totais por tipo de cobrança do trailer de lote do retorno se ligam aos movimentos, então saem zerados
  - Local: `tools/cobranca/cnab240/layouts/santander.js` (`formulario`), `gerar240.js`
- [ ] CNAB: dígito verificador do nosso número, tabelas de espécie/instrução por banco e validador de CNAB 240 📅 2026-11-17 🔺 alta #area/ferramentas #esforco/g 🤖
  - Contexto: precisa do manual de cada banco; a sessão não abriu os PDFs (rede) e não preencheu de memória
  - Ação: ver `tasks/decisoes-pendentes.md` ("Manuais de CNAB") — destravar o acesso e então implementar item a item, marcando `naoConfirmado` o que não achar na fonte

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
- [ ] Ligar um Postgres no painel da API 📅 2026-11-09 🔼 média #area/infra #esforco/p
  - Contexto: o painel funciona sem banco, mas guarda o histórico em memória — no plano
    grátis do Render ele zera toda vez que o serviço dorme. Com `DATABASE_URL`, a tabela é
    criada sozinha e o histórico dura 30 dias (testado contra Postgres 16).
  - Ação (dono): criar um banco grátis (Neon ou Supabase), colar a connection string em
    `DATABASE_URL` no Render e conferir no log de subida e no topo do painel que aparece
    "Postgres". Se o banco não conectar, a API não cai: avisa e segue em memória.
- [ ] Ligar o chat com IA para visitantes 📅 2026-11-10 🔼 média #area/chat-ia #esforco/p
  - Contexto: está pronto e **desligado**. A API guarda a chave do provedor e atende o chat
    do site em `/publico/chat`, com teto por minuto e por dia. Não foi conferido contra
    provedor de verdade (os testes simulam OpenAI, Gemini e Claude).
  - Ação (dono), nesta ordem: (1) configurar **limite de gasto** no painel do provedor — o
    teto da API fica em memória e zera quando o serviço reinicia; (2) testar
    `POST /v1/ia/conversar` com a chave, pelo Postman; (3) `IA_CHAT_PUBLICO=true` no Render;
    (4) `CHAT_PUBLICO_LIGADO = true` em `assets/js/arriba-api.js`. O quadro "IA do servidor"
    em `pages/admin/configurar-chat.html` mostra o que falta.
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
- [ ] Teste de carga dos 3 endpoints de um sistema externo — ⏸️ em espera (decisão do dono, 05/11) 📅 2026-11-04 🔽 baixa #area/qa #esforco/m
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
