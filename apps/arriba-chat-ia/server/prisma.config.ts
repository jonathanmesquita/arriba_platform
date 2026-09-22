/* Configuração do CLI do Prisma (v7+).

   A URL do banco saiu do schema.prisma e passou a morar aqui — o schema
   virou só a descrição dos modelos, e a conexão é responsabilidade de
   quem executa (CLI de migração aqui; driver adapter em src/db.ts para o
   runtime). Por isso o `import "dotenv/config"`: diferente do Prisma 6,
   o CLI não lê o .env sozinho. */
import { config as carregarDotenv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

// O .env mora na raiz do app (um nível acima de server/), e o CLI do
// Prisma roda daqui — sem o caminho explícito ele procura em server/.env.
carregarDotenv({ path: resolve(import.meta.dirname, "..", ".env"), override: false });
carregarDotenv({ path: resolve(import.meta.dirname, ".env"), override: false });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] }
});
