/* =====================================================================
   Configuração do servidor, validada na subida

   A regra: o processo NÃO sobe com configuração incompleta. É melhor
   falhar no start, com a lista do que falta, do que subir e quebrar na
   primeira mensagem do usuário — ou pior, subir com chave de cifra
   fraca e só descobrir quando alguém for ler o banco.

   Nada aqui tem valor-padrão de segredo. DATABASE_URL, JWT_SECRET e
   ENCRYPTION_KEY não têm default de propósito: default de segredo é
   segredo que vai para produção sem ninguém notar.
   ===================================================================== */

import { z } from "zod";
import { carregarChave } from "./crypto/secretBox.js";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória."),

  // 32 bytes. A validação de verdade é a do carregarChave() abaixo.
  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY é obrigatória (openssl rand -base64 32)."),

  JWT_SECRET: z.string().min(32, "JWT_SECRET precisa de pelo menos 32 caracteres."),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),

  // Origem do front, para CORS com cookie. Lista separada por vírgula.
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  COOKIE_NAME: z.string().default("arriba_chat_session"),
  /** Em produção o cookie vai como Secure; em dev, não (localhost é http). */
  COOKIE_SECURE: z
    .enum(["true", "false", "auto"])
    .default("auto"),

  /** Quantas mensagens do histórico vão junto a cada chamada.
   *  Existe por dois motivos, nesta ordem: janela de contexto (o modelo
   *  não presta atenção em tudo ao mesmo tempo — atenção deslizante) e
   *  custo por token, que cresce com o histórico reenviado. */
  CHAT_HISTORY_LIMIT: z.coerce.number().int().positive().max(200).default(20),

  /** Corte por requisição ao provedor. */
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

  /** Semente do primeiro administrador (só usada pelo `prisma db seed`). */
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
  SEED_ADMIN_NAME: z.string().optional()
});

export type Env = z.infer<typeof schema> & {
  corsOrigins: string[];
  cookieSecure: boolean;
  isProduction: boolean;
};

export function carregarEnv(fonte: NodeJS.ProcessEnv = process.env): Env {
  const resultado = schema.safeParse(fonte);

  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((i) => `  - ${i.path.join(".") || "(raiz)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Configuração inválida. Corrija o .env e suba de novo:\n${problemas}\n\n` +
      "Use o .env.example como referência."
    );
  }

  const env = resultado.data;

  // Falha cedo se a chave de cifra não tiver o tamanho certo — senão o
  // erro só apareceria quando alguém salvasse a primeira API key.
  carregarChave(env.ENCRYPTION_KEY);

  const isProduction = env.NODE_ENV === "production";

  if (isProduction && env.JWT_SECRET.length < 48) {
    throw new Error("Em produção, use um JWT_SECRET com 48+ caracteres (openssl rand -base64 48).");
  }

  return {
    ...env,
    corsOrigins: env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
    cookieSecure: env.COOKIE_SECURE === "auto" ? isProduction : env.COOKIE_SECURE === "true",
    isProduction
  };
}
