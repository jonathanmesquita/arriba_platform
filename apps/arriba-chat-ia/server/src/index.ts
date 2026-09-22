/* =====================================================================
   Subida do servidor — Arriba Chat IA

   A ordem das coisas aqui não é estética; cada passo depende do anterior:

   1. Carregar o .env ANTES de qualquer outra coisa. O `dotenv/config`
      precisa ser o primeiro import porque, em ESM, os módulos importados
      são avaliados antes do corpo deste arquivo — se ele viesse depois,
      quem lesse `process.env` no topo do próprio módulo (o db.ts lê a
      DATABASE_URL para montar o pool) já encontraria o ambiente vazio.

   2. Validar a configuração (carregarEnv) e só então importar o resto.
      Por isso os imports da aplicação são DINÂMICOS: import estático é
      avaliado antes do corpo da função, ou seja, o db.ts abriria o pool
      — e morreria com "DATABASE_URL não definida" — antes de o env.ts
      conseguir imprimir a lista completa do que falta. Falhar na subida
      é o comportamento certo; falhar com a mensagem errada, não.

   3. Middlewares na ordem em que a requisição os atravessa:
        cors        -> responde o preflight OPTIONS antes de tudo, senão
                       o navegador nem chega a mandar o POST de verdade;
        cookie-parser -> preenche req.cookies, de onde o requireAuth lê o
                       token (montar depois dos routers = sessão sempre
                       ausente);
        express.json -> preenche req.body, que os routers validam com zod;
        routers     -> as rotas em si;
        404         -> depois das rotas (antes, engoliria todas elas);
        erro        -> por ÚLTIMO e com quatro parâmetros, que é como o
                       Express reconhece um handler de erro.
   ===================================================================== */

// Primeiro import de propósito: o .env precisa estar carregado antes
// de qualquer módulo ler process.env.
import "./carregarDotenv.js";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { carregarEnv, type Env } from "./env.js";
import { SecretBox } from "./crypto/secretBox.js";

/** Teto do corpo da requisição. O chat já recusa mensagem acima de 32 mil
 *  caracteres na própria rota; este limite é a barreira anterior, para o
 *  processo não alocar megabytes por causa de um colar acidental ou de um
 *  POST malicioso. */
const LIMITE_CORPO = "1mb";

/** Tempo máximo esperando o encerramento educado antes de sair à força. */
const PRAZO_ENCERRAMENTO_MS = 10_000;

function carregarEnvOuSair(): Env {
  try {
    return carregarEnv();
  } catch (erro) {
    // Mensagem, sem stack: o que falta está na mensagem do env.ts, e a
    // stack só polui o terminal de quem está configurando o projeto.
    console.error(erro instanceof Error ? erro.message : String(erro));
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const env = carregarEnvOuSair();

  // Falha aqui se a ENCRYPTION_KEY não tiver 32 bytes — o env.ts já
  // conferiu, mas é esta instância que o resto do sistema usa.
  const secretBox = SecretBox.fromEnv(env.ENCRYPTION_KEY);

  // Importação dinâmica: ver o item 2 do cabeçalho.
  const [{ prisma }, auth, chat, admin, http] = await Promise.all([
    import("./db.js"),
    import("./auth/routes.js"),
    import("./chat/routes.js"),
    import("./admin/routes.js"),
    import("./http/errors.js")
  ]);

  const app = express();

  // Não anunciar a stack do servidor: é informação de graça para quem
  // procura versão vulnerável.
  app.disable("x-powered-by");

  // Atrás de proxy (Render, Cloudflare), sem isto o req.ip seria sempre o
  // do proxy — e o IP do AuditLog não serviria para investigar nada. Só em
  // produção: em dev confiar no X-Forwarded-For é aceitar IP forjado.
  if (env.isProduction) app.set("trust proxy", 1);

  // `credentials: true` é obrigatório porque a sessão é um cookie; e com
  // credenciais o navegador RECUSA `origin: "*"`, então a lista explícita
  // do CORS_ORIGINS não é preciosismo, é o que faz o login funcionar.
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: LIMITE_CORPO }));

  // Sem autenticação de propósito: quem chama é o monitor/orquestrador,
  // que não tem sessão. Também não consulta o banco — health que faz
  // query vira uma consulta por segundo e, pior, derruba o serviço inteiro
  // do balanceador quando o banco só está lento. Aqui a pergunta é "o
  // processo está de pé e respondendo?".
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Cada router já traz o próprio prefixo (/auth/..., /chat/..., /admin/...),
  // então montar em /api produz /api/auth/login, /api/chat/conversations etc.
  app.use("/api", auth.criarAuthRouter(env));
  app.use("/api", chat.criarChatRouter(env, secretBox));
  app.use("/api", admin.criarAdminRouter(env, secretBox));

  app.use(http.middlewareNaoEncontrado);
  app.use(http.middlewareDeErro);

  const servidor = app.listen(env.PORT, () => {
    console.log(`[arriba-chat-ia] API ouvindo em http://127.0.0.1:${env.PORT} (${env.NODE_ENV})`);
    console.log(`[arriba-chat-ia] origens liberadas no CORS: ${env.corsOrigins.join(", ") || "(nenhuma)"}`);
  });

  let encerrando = false;

  /** Encerramento educado: para de aceitar conexão nova, espera as em
   *  andamento e fecha o pool do Postgres. Sem o $disconnect, o Postgres
   *  fica com conexões penduradas até o próprio timeout dele. */
  async function encerrar(sinal: string): Promise<void> {
    if (encerrando) return; // Ctrl+C duas vezes não deve reentrar aqui.
    encerrando = true;
    console.log(`[arriba-chat-ia] ${sinal} recebido, encerrando...`);

    // Rede de segurança: o chat responde por SSE, e uma conexão SSE aberta
    // só fecha quando o cliente desiste. Sem este prazo, o `close` poderia
    // nunca completar e o processo ficaria zumbi na fila de deploy.
    const desistir = setTimeout(() => {
      console.error("[arriba-chat-ia] encerramento demorou demais; saindo à força.");
      process.exit(1);
    }, PRAZO_ENCERRAMENTO_MS);
    desistir.unref();

    await new Promise<void>((resolver) => servidor.close(() => resolver()));

    try {
      await prisma.$disconnect();
    } catch (erro) {
      console.error("[arriba-chat-ia] falha ao fechar a conexão com o banco:", erro);
    }

    clearTimeout(desistir);
    console.log("[arriba-chat-ia] encerrado.");
    process.exit(0);
  }

  // SIGTERM é o que o Docker/Render mandam no deploy; SIGINT é o Ctrl+C.
  process.on("SIGTERM", () => void encerrar("SIGTERM"));
  process.on("SIGINT", () => void encerrar("SIGINT"));
}

main().catch((erro) => {
  // Qualquer falha na subida (porta ocupada, import quebrado, chave
  // inválida) termina aqui. Subir pela metade seria pior: o serviço
  // responderia health e falharia em todo o resto.
  console.error("[arriba-chat-ia] não foi possível subir o servidor:");
  console.error(erro);
  process.exit(1);
});
