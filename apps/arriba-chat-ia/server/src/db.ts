/* Cliente Prisma único para o processo.

   Prisma 7 exige um driver adapter: o client não abre conexão sozinho a
   partir de uma url no schema. Aqui é o `pg` (PostgreSQL) recebendo a
   DATABASE_URL já validada pelo env.ts.

   O cache em globalThis existe para o modo dev: o tsx recarrega o módulo
   a cada save e, sem isso, cada reload abriria um pool novo até o
   Postgres recusar conexão. */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarClient(): PrismaClient {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL não definida — o env.ts deveria ter barrado a subida antes daqui.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env["NODE_ENV"] === "development" ? ["warn", "error"] : ["error"]
  });
}

export const prisma: PrismaClient = globalParaPrisma.prisma ?? criarClient();

if (process.env["NODE_ENV"] !== "production") globalParaPrisma.prisma = prisma;
