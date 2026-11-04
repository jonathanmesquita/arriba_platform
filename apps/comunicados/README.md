# Comunicados

Portal para escrever **cartas modelo** e disparar **comunicados por e-mail** para uma lista
de clientes, com configuração de servidor SMTP, controle de descadastro e histórico de quem
recebeu o quê.

Faz parte do repositório como **protótipo de estudos**: não traz dado nem nome de empresa
nenhuma — cliente, produto e carta são cadastrados por quem usa.

---

## O que faz

| Tela | Para quê |
|---|---|
| **Novo envio** | escolhe a carta, marca os clientes (ou cola e-mails), **confere a lista** e dispara |
| **Enviados** | histórico com status por destinatário, lote, horário e motivo da falha |
| **Clientes** | cliente → contatos (um cliente pode ter vários e-mails) e produtos |
| **Cartas modelo** | editor HTML com variáveis e pré-visualização; anexos; duplicar |
| **Servidor de e-mail** | host, porta, TLS, credencial, remetente, tamanho de lote e limite de anexo |
| **Descadastros** | quem pediu para não receber mais — retirado de todo disparo |
| **Usuários** | administrador (configura) e operador (escreve e dispara) |

---

## Rodar

Precisa de **Node 20+**. Não precisa de banco instalado: o armazenamento é um arquivo
SQLite em `dados/`.

```bash
cd apps/comunicados
npm install

cp .env.example .env          # preencha os segredos (comandos abaixo)
npm run db:migrate --workspace=server
npm run db:seed --workspace=server

npm run dev                   # API em :3344 e portal em :5273
```

Gere os segredos do `.env`:

```bash
openssl rand -base64 32       # ENCRYPTION_KEY — cifra a senha do SMTP no banco
openssl rand -base64 48       # JWT_SECRET — assina o cookie de sessão
```

Entre em http://localhost:5273 com o e-mail e a senha do seed. **Depois de entrar, apague
`SEED_ADMIN_PASSWORD` do `.env`.**

### Modo de teste (padrão no `.env.example`)

Com `SMTP_MODO_TESTE=1`, **nada vai para a rede**: cada mensagem montada vira um arquivo
`.eml` em `dados/saida/`, que abre em qualquer cliente de e-mail, com anexo e tudo. Serve
para conferir layout, variáveis e lotes sem servidor de SMTP — e é como o fluxo foi testado
de ponta a ponta aqui. Para enviar de verdade, apague a linha.

---

## As decisões que valem conhecer

**A senha do servidor de e-mail é cifrada e nunca volta.** AES-256-GCM (chave mestra em
`ENCRYPTION_KEY`), formato versionado `v1.<iv>.<tag>.<ct>`. Nenhuma rota devolve a senha,
nem cifrada — a tela só sabe se existe uma salva, e campo vazio significa "mantém a atual",
não "apaga". Quem tem a `ENCRYPTION_KEY` decifra: ela é segredo de infraestrutura, e
trocá-la exige digitar a senha de novo.

**Erro de envio passa por um mascarador antes de ser guardado.** O erro do servidor é a
informação mais útil quando um disparo falha — e a mais perigosa: a biblioteca inclui o
diálogo SMTP, e o diálogo inclui o `AUTH LOGIN` com a credencial em base64. `mascarar.ts`
fica entre o erro e qualquer lugar que o guarde (banco, log, tela). Sem isso, a senha do
e-mail ficaria gravada no banco num campo chamado "erro".

**Destinatários vão em CCO, com o remetente no "Para".** É o que impede um cliente de ver a
lista de e-mails dos outros — vazamento clássico de comunicado em massa. Mensagem sem
destinatário visível também é recusada por parte dos servidores.

**O disparo é em lotes, com intervalo.** Não é lentidão artificial: provedor de e-mail
limita destinatários por mensagem e mensagens por hora, e estourar o limite bloqueia a
conta no meio do disparo — com metade da lista avisada e a outra metade não. Os dois
números ficam na tela de configuração.

**Descadastro é consultado em todo disparo**, inclusive quando a lista foi colada à mão. E
quem foi barrado entra no envio com status `DESCADASTRADO` em vez de sumir: a pergunta "por
que fulano não recebeu?" precisa ter resposta no histórico, não na memória de quem disparou.

**Assunto e corpo são copiados para o envio.** Editar a carta depois não reescreve o que já
saiu — o que a pessoa recebeu é o que aparece no histórico.

**Enviar é em dois passos.** "Conferir lista" grava o envio e mostra quem entra e quem fica
de fora (descadastrado, repetido, inválido); "disparar" manda. Juntar os dois num botão só
tiraria a última chance de olhar a lista, que é onde o erro caro acontece.

**Variável desconhecida fica visível.** `{{nome_do_titular}}`, que ninguém declarou, aparece
na conferência da carta em vez de sair como texto cru para a lista inteira. As variáveis
existentes estão em `server/src/cartas/variaveis.ts` — fonte única: a tela, o preenchimento
e a conferência leem dali.

**O valor da variável é escapado no corpo HTML.** O corpo é escrito por quem opera, mas o
valor vem do cadastro: um nome com `<` quebraria o layout, e um com `<script>` viraria
execução no cliente de e-mail de quem recebe. No assunto não escapa — ali `&` tem de sair
`&` mesmo.

---

## Limitações conhecidas

- **Personalização só em lote de 1.** Como o lote vira **uma** mensagem com vários
  destinatários em CCO, `{{nome}}` e `{{cliente}}` ficam vazios quando o lote tem mais de um
  — sairia o nome de um na carta de todos. Para carta personalizada, use "destinatários por
  lote = 1" (mais mensagens, mais lento, dentro do limite do provedor).
- **Sem agendamento automático.** O campo existe no banco e a tela aceita data, mas não há
  processo que acorde sozinho para disparar na hora marcada — hoje o disparo é manual.
- **O disparo roda no próprio servidor**, sem fila. Se o processo cair no meio, o que já
  saiu está gravado (com horário e destinatário) e o envio fica em `ENVIANDO`; não há
  retomada automática.
- **Sem rastreio de abertura nem de clique**, e sem tratamento de retorno (bounce): o
  status diz que o servidor aceitou a mensagem, não que ela chegou à caixa de entrada.
- **Sem limite de taxa no login** e sem segundo fator.
- **Um remetente só.** A configuração é única (uma linha na tabela), não por produto.

---

## Estrutura

```
apps/comunicados/
├── server/
│   ├── prisma/schema.prisma      Usuario, ConfigSmtp, Produto, Cliente, Contato,
│   │                             CartaModelo, Anexo, Envio, EnvioDestinatario,
│   │                             Descadastro, Auditoria
│   └── src/
│       ├── index.ts              subida: env validado antes dos imports da aplicação
│       ├── env.ts · db.ts        configuração e cliente Prisma (SQLite)
│       ├── auth/                 scrypt, JWT em cookie HttpOnly, middleware e rotas
│       ├── crypto/secretBox.ts   AES-256-GCM da senha do SMTP
│       ├── config/routes.ts      tela do servidor de e-mail + teste de conexão
│       ├── cadastros/routes.ts   produtos, clientes, contatos, descadastros, usuários
│       ├── cartas/               variáveis (fonte única) e CRUD com prévia e anexos
│       └── envios/               lotes, mascaramento, transporte e o disparo
└── web/src/                      React + Vite: login, portal e as sete telas
```

```bash
npm run typecheck    # TypeScript nos dois pacotes
npm test             # testes do servidor (node:test)
```

Os testes cobrem o que falha em silêncio: o escape das variáveis, a separação da lista
(descadastrado, repetido, inválido), a conta dos lotes e — principalmente — o mascaramento
do segredo, que já pegou dois furos reais antes de qualquer e-mail sair.
