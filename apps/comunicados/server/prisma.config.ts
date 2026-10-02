/* Prisma 7 tirou a `url` do bloco datasource: a conexão é de quem
   executa (CLI aqui; driver adapter em src/db.ts no runtime). O .env fica
   na raiz do app, e o CLI roda de dentro de server/ — por isso o caminho
   explícito. */
import { config as carregarDotenv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

carregarDotenv({ path: resolve(import.meta.dirname, "..", ".env"), override: false });
carregarDotenv({ path: resolve(import.meta.dirname, ".env"), override: false });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env["DATABASE_URL"] ?? "file:../dados/comunicados.db" }
});
