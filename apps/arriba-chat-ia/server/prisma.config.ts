/* Configuração do CLI do Prisma (v7+).

   A URL do banco saiu do schema.prisma e passou a morar aqui — o schema
   virou só a descrição dos modelos, e a conexão é responsabilidade de
   quem executa (CLI de migração aqui; driver adapter em src/db.ts para o
   runtime). Por isso o `import "dotenv/config"`: diferente do Prisma 6,
   o CLI não lê o .env sozinho. */
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] }
});
