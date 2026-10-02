/* =====================================================================
   Subida do servidor — Comunicados

   A ordem aqui não é estética; cada passo depende do anterior:

   1. carregar o .env ANTES de tudo (em ESM, o import é avaliado antes do
      corpo do arquivo: quem lê process.env no topo do próprio módulo —
      como o db.ts — encontraria o ambiente vazio);
   2. validar a configuração e só então importar o resto, por isso os
      imports da aplicação são dinâmicos;
   3. middlewares na ordem em que a requisição os atravessa, com o
      handler de erro por último e com quatro parâmetros, que é como o
      Express o reconhece.
   ===================================================================== */

import "./carregarDotenv.js";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { carregarEnv } from "./env.js";

async function principal(): Promise<void> {
  const env = carregarEnv();

  const { rotasDeAutenticacao } = await import("./auth/routes.js");
  const { rotasDeConfiguracao } = await import("./config/routes.js");
  const { rotasDeCadastros } = await import("./cadastros/routes.js");
  const { rotasDeCartas } = await import("./cartas/routes.js");
  const { rotasDeEnvios } = await import("./envios/routes.js");
  const { middlewareDeErro, middlewareNaoEncontrado } = await import("./http/errors.js");

  const app = express();

  app.use(
    cors({
      origin: env.corsOrigens,
      // O cookie de sessão só viaja com isto — e só para as origens
      // declaradas, nunca para "*".
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: `${env.MAX_BODY_KB}kb` }));

  app.get("/api/health", (_req, res) => res.json({ ok: true, modoTeste: env.modoTeste }));

  app.use("/api", rotasDeAutenticacao(env));
  app.use("/api", rotasDeConfiguracao(env));
  app.use("/api", rotasDeCadastros(env));
  app.use("/api", rotasDeCartas(env));
  app.use("/api", rotasDeEnvios(env));

  app.use(middlewareNaoEncontrado);
  app.use(middlewareDeErro);

  app.listen(env.PORT, "127.0.0.1", () => {
    console.log(`[comunicados] API ouvindo em http://127.0.0.1:${env.PORT} (${env.NODE_ENV})`);
    if (env.modoTeste) {
      console.log("[comunicados] MODO DE TESTE: nada vai para a rede — cada mensagem vira um .eml em dados/saida/");
    }
  });
}

principal().catch((erro) => {
  console.error("[comunicados] falha ao subir:", erro);
  process.exit(1);
});
