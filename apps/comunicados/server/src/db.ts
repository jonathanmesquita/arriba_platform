/* Cliente Prisma único para o processo.

   Prisma 7 exige driver adapter; aqui é o better-sqlite3, que lê o
   arquivo do banco direto, sem servidor.

   A criação é PREGUIÇOSA (o Proxy abaixo) pelo mesmo motivo do outro app
   deste repositório: quem importa um módulo só para usar uma função pura
   não deveria precisar de banco nenhum — era o que quebrava os testes no
   import, antes de rodar o primeiro caso. */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarClient(): PrismaClient {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL não definida — o env.ts deveria ter barrado a subida antes daqui.");
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

function clientDoProcesso(): PrismaClient {
  const existente = globalParaPrisma.prisma;
  if (existente) return existente;
  const novo = criarClient();
  if (process.env["NODE_ENV"] !== "production") globalParaPrisma.prisma = novo;
  return novo;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_alvo, propriedade, receptor) {
    const valor = Reflect.get(clientDoProcesso(), propriedade, receptor) as unknown;
    return typeof valor === "function" ? valor.bind(clientDoProcesso()) : valor;
  },
  has(_alvo, propriedade) {
    return propriedade in clientDoProcesso();
  }
});
