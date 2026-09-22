# Arriba Chat IA

Chat de IA interno com **múltiplos provedores** (Claude, ChatGPT, Gemini, Ollama e
OpenRouter) e **painel administrativo**. A arquitetura é simples de propósito: um front
React + Vite conversa com uma API Express (Node 22, TypeScript ESM) que guarda tudo em
Postgres via Prisma; o navegador **nunca** fala com o provedor de IA nem vê uma API key —
quem tem as credenciais é o servidor, que as guarda cifradas com AES-256-GCM e as decifra
só no instante de chamar o modelo. Cada provedor é um *adapter* atrás de uma interface
única (`AIProvider`), então trocar de modelo, acrescentar provedor ou desligar um deles é
configuração no banco, não mudança de código; a resposta volta ao navegador em streaming
(SSE), e toda ação relevante — login, troca de provedor, mensagem enviada, erro do
provedor — vira linha de auditoria.

> Esta aplicação **não faz parte do site estático** do Arriba Platform. Ela mora em
> `apps/`, tem build próprio, backend e banco, e é excluída do deploy da Vercel.

---

## Árvore de pastas

```
apps/arriba-chat-ia/
├── docker-compose.yml          Postgres local (só desenvolvimento)
├── .env.example                Modelo de configuração — copie para server/.env
├── package.json                Workspaces: server + web
│
├── server/                     API Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma       Modelos: User, ProviderConfig, Conversation, Message, AuditLog
│   │   ├── migrations/         Histórico de migração (gerado pelo Prisma)
│   │   └── seed.ts             Cria o primeiro administrador
│   ├── prisma.config.ts        Config do CLI do Prisma 7 (a URL do banco mora aqui)
│   └── src/
│       ├── index.ts            Subida do servidor: middlewares, routers, encerramento
│       ├── env.ts              Configuração validada com zod — o processo não sobe incompleto
│       ├── db.ts               Cliente Prisma único (driver adapter do `pg`)
│       ├── crypto/secretBox.ts Cifra/decifra das API keys (AES-256-GCM)
│       ├── auth/               Senha (scrypt), JWT em cookie, middleware, rotas de sessão
│       ├── chat/               Conversas, histórico e envio de mensagem com streaming SSE
│       ├── admin/              Provedores, teste de conexão, usuários e auditoria
│       ├── providers/          Um adapter por provedor + catálogo, registry e erros
│       ├── audit/              Gravação do AuditLog
│       └── http/errors.ts      Formato único de erro e middleware final
│
└── web/                        Front React + Vite
    └── src/
        ├── api/                Cliente HTTP (sempre com `credentials: "include"`)
        ├── auth/               Estado da sessão e rota protegida
        ├── components/         Peças de interface
        └── pages/              Login, chat e administração
```

---

## Pré-requisitos

- **Node 20 ou superior** (desenvolvido em Node 22). `node -v` para conferir.
- **Docker** (para subir o Postgres com um comando) **ou** um PostgreSQL 14+ já instalado.
- `openssl` para gerar os segredos — já vem no macOS e no Linux; no Windows, use o do Git
  Bash ou o WSL.

Não é preciso GPU, chave de API nem conta em lugar nenhum para o sistema **subir**. As
credenciais de provedor entram depois, pela tela de administração.

---

## Passo a passo (primeira vez)

### 1. Configuração

```bash
cd apps/arriba-chat-ia
cp .env.example server/.env
```

O arquivo fica em `server/.env` porque é de lá que o servidor e o CLI do Prisma leem (os
dois rodam com o diretório de trabalho em `server/`). Ele está no `.gitignore` e **não
vai para o git**.

### 2. Gerar os segredos

```bash
openssl rand -base64 32   # -> ENCRYPTION_KEY  (32 bytes; cifra as API keys)
openssl rand -base64 48   # -> JWT_SECRET      (assina o cookie de sessão)
```

Cole cada valor na variável correspondente do `server/.env`. Aproveite e defina
`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (12+ caracteres) e `SEED_ADMIN_NAME`.

Guarde a `ENCRYPTION_KEY`. Se ela se perder, as API keys já gravadas ficam ilegíveis para
sempre e será preciso cadastrá-las de novo.

### 3. Subir o banco

```bash
docker compose up -d
docker compose ps        # espere o healthcheck ficar "healthy"
```

Já tem um Postgres seu? Pule o Docker e ajuste a `DATABASE_URL` no `server/.env` para
apontar para ele.

### 4. Instalar, migrar e semear

```bash
npm install                 # na raiz de apps/arriba-chat-ia (workspaces)
npm run db:migrate          # cria as tabelas (prisma migrate dev) e gera o client
npm run db:seed             # cria o primeiro administrador a partir do .env
```

O seed é idempotente: rodar de novo não duplica nada. Ele **nunca sobrescreve a senha** de
um usuário que já existe — se as variáveis não estiverem definidas, ele explica e sai sem
erro.

### 5. Rodar

```bash
npm run dev
```

Sobem dois processos:

| Serviço | Endereço | O que é |
|---|---|---|
| API | http://localhost:3333 | Express. Saúde: `GET /api/health` → `{ "ok": true }` |
| Web | http://localhost:5173 | Vite. É aqui que você abre o navegador |

O Vite faz proxy de `/api` para a porta 3333, então front e API compartilham a origem em
desenvolvimento e o cookie de sessão funciona sem configuração extra no navegador.

Entre em http://localhost:5173 com o e-mail e a senha do seed. **Depois de entrar, apague
`SEED_ADMIN_PASSWORD` do `.env`.**

### Outros comandos

```bash
npm run typecheck     # TypeScript nos dois pacotes
npm test              # testes do servidor (node:test)
npm run db:studio     # Prisma Studio, para olhar o banco
npm run build         # build de produção (server + web)
```

---

## Cadastrando o primeiro provedor

Sem provedor ativo o chat responde que não há nenhum configurado — é o estado esperado
logo depois do seed. Com o usuário administrador:

1. Abra **Administração → Provedores** e clique em **Novo provedor**.
2. Escolha o provedor (Claude, ChatGPT, Gemini, Ollama ou OpenRouter). O formulário se
   ajusta: Ollama não pede API key e pede endereço; OpenRouter pede os dois.
3. Dê um **rótulo** (ex.: "Claude produção") e escolha o **modelo**. O campo de modelo é
   texto livre de propósito — o `<select>` só sugere, e um modelo novo da sua conta
   funciona sem esperar deploy nosso.
4. Cole a **API key**. Ela é cifrada antes de tocar o banco; a partir daí a tela mostra
   apenas os quatro últimos caracteres (`•••• 1234`). Não existe rota que devolva a chave.
5. Ajuste, se quiser, **temperature**, **máximo de tokens** e o **system prompt** (o padrão
   é uma persona com regras numeradas, em pt-BR).
6. **Testar conexão** — dá para testar antes mesmo de salvar. O teste faz uma chamada
   mínima ao provedor e diz o que aconteceu: chave recusada, modelo inexistente, endereço
   errado, sem crédito.
7. **Ativar**. Só uma configuração fica ativa por vez; ativar uma desativa a anterior, em
   transação. Todas as ações ficam registradas na auditoria.

---

## Provedores suportados

| Provedor | API key | Endpoint | Observação |
|---|---|---|---|
| **Claude (Anthropic)** | sim | oficial | `console.anthropic.com → API Keys` |
| **ChatGPT (OpenAI)** | sim | oficial | `platform.openai.com → API keys` |
| **Gemini (Google)** | sim | oficial | `aistudio.google.com → Get API key` |
| **Ollama** | **não** | seu (`http://127.0.0.1:11434`) | roda local |
| **OpenRouter** | sim | `https://openrouter.ai/api/v1` | gateway |

**Ollama** é o provedor que roda na sua máquina ou num servidor da empresa. Duas vantagens
que nenhum serviço pago oferece: **privacidade** — nenhum texto sai da rede, o que muda o
que se pode colar no chat — e **custo zero por token**. A conta é a infraestrutura: precisa
de GPU, e na prática de uns 24 GB de VRAM para os modelos maiores (um 8B cabe em 16 GB, com
qualidade menor). É também o único que continua respondendo com a internet fora.

**OpenRouter** é um *gateway*: uma chave só, um crédito só, e acesso a modelos de vários
provedores, com o id do modelo prefixado (`anthropic/claude-sonnet-5`, `openai/gpt-4o`).
Como ele fala o protocolo da OpenAI, reaproveita aquele mesmo adapter trocando a `baseUrl`
— é a vantagem de o contrato ser uma interface. Serve bem para comparar modelos sem abrir
conta em cada fornecedor; em troca, você depende de mais um intermediário entre você e o
modelo.

---

## Segurança

**O que é cifrado.** As API keys dos provedores, com **AES-256-GCM**, chave mestra na
`ENCRYPTION_KEY`. GCM é cifra *autenticada*: se alguém adulterar o registro no banco, a
decifragem falha em vez de devolver lixo silencioso. O IV é sorteado a cada operação
(reaproveitar IV em GCM é falha grave) e o formato guardado é versionado
(`v1.<iv>.<tag>.<ct>`), para dar para trocar de algoritmo no futuro sem adivinhar o que já
está gravado. Não existe coluna com a chave em texto puro — só o cifrado e os quatro
últimos caracteres, que servem para a tela dizer "termina em 1234".

**As senhas não são cifradas, são hasheadas** com **scrypt** (`node:crypto`), salt
aleatório por senha e parâmetros gravados junto do hash — assim dá para encarecer o custo
depois sem invalidar as senhas existentes. A comparação é em tempo constante.

**O que nunca sai por HTTP.** API key (nenhuma rota devolve, nem para o administrador —
o que se vê é a máscara), hash de senha, `tokenVersion`, *stack trace* e o corpo da
requisição. Erro de provedor chega ao usuário como código estável + frase em pt-BR; o texto
cru do provedor vai junto **só para administrador**, porque é o que ele precisa para
consertar. Mensagem de erro passa por `mascararSegredo()` antes de virar log.

**Por que o cookie é HttpOnly.** O token de sessão é um JWT em cookie `HttpOnly`,
`SameSite=Lax`, `Secure` em produção, e o servidor **só** aceita o cookie — não existe
`Authorization: Bearer`. Aceitar o header obrigaria o front a guardar o token em algum
lugar que o JavaScript lê (`localStorage`), e aí qualquer XSS, em qualquer página, leva a
sessão embora. Com `HttpOnly`, o script da página não enxerga o token. Revogação é o campo
`tokenVersion` do usuário: incrementou, todos os tokens já emitidos morrem, sem tabela de
sessão.

**O login não entrega quem existe.** Falha sempre devolve a mesma frase e o mesmo código,
e o scrypt roda mesmo quando o e-mail não existe, para os dois caminhos levarem o mesmo
tempo. Toda tentativa vira linha de auditoria com IP e motivo; a senha, jamais.

**O alerta que importa:** quem tem a `ENCRYPTION_KEY` decifra todas as credenciais
gravadas. Ela é segredo de infraestrutura — cofre do serviço de hospedagem, nunca `.env`
commitado, nunca variável de build (tudo que vai para o navegador é público). Rotacionar a
chave invalida o que já está cifrado: as API keys precisam ser recadastradas. Proteção
contra quem já tem acesso ao servidor seria HSM/KMS, que está fora do escopo de um chat
interno — o formato versionado deixa a porta aberta.

---

## Modelos e temperature

`temperature` **não é um parâmetro universal**. Os modelos de raciocínio atuais da
Anthropic (Opus 5, Sonnet 5, Opus 4.8, Fable 5.1) removeram `temperature` e `top_p`: mandar
o campo devolve **HTTP 400** e a mensagem quebra. Haiku 4.5 ainda aceita, assim como os
modelos da OpenAI e do Google listados no catálogo.

O sistema resolve isso sozinho: `src/providers/catalog.ts` marca cada modelo com
`supportsTemperature`, e o *registry* **omite** o campo quando o modelo não aceita — o valor
continua salvo na configuração, apenas não é enviado. Então dá para deixar temperature
preenchida e trocar de modelo sem quebrar nada.

Modelo digitado à mão (fora do catálogo) cai num padrão conservador: assume que aceita
temperature, exceto na família Claude, onde a regra é aplicada pelo nome do modelo porque
errar ali quebra a chamada. Se um modelo novo recusar o parâmetro, o erro volta como
`BAD_REQUEST` já com a explicação pronta — e a correção é acrescentar o modelo ao catálogo.

O padrão do sistema é **temperature 0.2**: para uso técnico, quer-se resposta previsível, e
temperatura alta produz "criatividade" onde ela não foi pedida. Quem quiser texto mais
solto sobe o valor na tela de administração.

---

## Limitações conhecidas

Lista honesta do que **não** existe hoje:

- **Sem RAG / base de conhecimento.** O chat não consulta documento, manual nem banco da
  empresa: ele conversa com o modelo e mais nada. O que existe de "conhecimento" é o system
  prompt configurável.
- **Sem anexos.** Só texto. Nada de imagem, PDF ou planilha, mesmo quando o modelo
  escolhido é multimodal.
- **Sem SSO.** A autenticação é e-mail + senha no banco local. Não há integração com
  Google Workspace, Entra ID nem LDAP, e não há segundo fator.
- **Sem busca no histórico.** As conversas são listadas por data e abertas uma a uma; não
  há busca por texto, tag ou filtro por provedor.
- **Uma instância só.** O streaming é SSE, que prende a conexão a um processo específico.
  Rodar duas ou mais réplicas atrás de um balanceador exige *sticky session* ou um broker
  (Redis/Postgres LISTEN-NOTIFY) para repassar os pedaços da resposta entre processos —
  nada disso está implementado. Escale verticalmente até isso virar problema de verdade.
- **Sem limite de taxa.** O login tem um piso de tempo (contra enumeração de usuários),
  o que **não** é proteção contra força bruta; e não há cota por usuário no chat. Num
  ambiente exposto à internet, ponha um *rate limit* na borda.
- **Custo não é controlado.** Tokens de entrada e saída ficam gravados por mensagem, mas
  não há painel de gasto, orçamento nem corte automático quando estoura.
- **Sem redefinição de senha por e-mail.** Não há envio de e-mail no sistema; troca de
  senha passa pelo administrador.
- **O seed não reseta senha.** É proposital (ver `prisma/seed.ts`), mas significa que
  administrador que perdeu a senha depende de outro administrador ou de intervenção no
  banco.
