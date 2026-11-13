/* =====================================================================
   Configuração validada

   O processo não sobe pela metade: se falta segredo, ele morre dizendo
   exatamente o que falta e como gerar. Subir com configuração incompleta
   é pior do que não subir — a falha só apareceria no primeiro disparo,
   com a carta já escrita e a lista já escolhida.

   DATABASE_URL, ENCRYPTION_KEY e JWT_SECRET não têm valor padrão de
   propósito: padrão de segredo é segredo que vai para produção sem
   ninguém notar.
   ===================================================================== */

import { z } from "zod";
import { carregarChave } from "./crypto/secretBox.js";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3344),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória (ex.: file:../dados/comunicados.db)."),

  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY é obrigatória (openssl rand -base64 32)."),
  JWT_SECRET: z.string().min(32, "JWT_SECRET precisa de pelo menos 32 caracteres."),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),

  CORS_ORIGINS: z.string().default("http://localhost:5273"),
  COOKIE_NAME: z.string().default("comunicados_sessao"),
  COOKIE_SECURE: z.enum(["true", "false", "auto"]).default("auto"),

  /** Teto do corpo da requisição JSON. Carta em HTML é texto, não imagem:
   *  1 MB cobre folgado e evita virar porta de upload disfarçada. */
  MAX_BODY_KB: z.coerce.number().int().positive().default(1024),

  /** Em modo de teste o envio não vai para a rede: cada mensagem é
   *  gravada como `.eml` em dados/saida/. É o que deixa testar a
   *  montagem do e-mail (inclusive anexo) sem servidor de SMTP. */
  SMTP_MODO_TESTE: z.string().optional(),

  PASTA_DADOS: z.string().default("../dados")
});

export type Env = z.infer<typeof schema> & {
  chaveDeCifra: Buffer;
  corsOrigens: string[];
  cookieSecure: boolean;
  modoTeste: boolean;
};

export function carregarEnv(): Env {
  const resultado = schema.safeParse(process.env);

  if (!resultado.success) {
    const linhas = resultado.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    console.error(
      ["[comunicados] configuração incompleta:", ...linhas, "", "Confira o .env (modelo em .env.example)."].join("\n")
    );
    process.exit(1);
  }

  const env = resultado.data;

  // Valida o tamanho da chave aqui, na subida, e não no primeiro envio.
  const chaveDeCifra = carregarChave(env.ENCRYPTION_KEY);

  const isProd = env.NODE_ENV === "production";

  return {
    ...env,
    chaveDeCifra,
    corsOrigens: env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
    cookieSecure: env.COOKIE_SECURE === "auto" ? isProd : env.COOKIE_SECURE === "true",
    modoTeste: env.SMTP_MODO_TESTE === "1" || env.SMTP_MODO_TESTE === "true"
  };
}
