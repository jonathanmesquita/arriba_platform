/* Cliente Prisma único para o processo.

   Prisma 7 exige um driver adapter: o client não abre conexão sozinho a
   partir de uma url no schema. Aqui é o `pg` (PostgreSQL) recebendo a
   DATABASE_URL já validada pelo env.ts.

   O cache em globalThis existe para o modo dev: o tsx recarrega o módulo
   a cada save e, sem isso, cada reload abriria um pool novo até o
   Postgres recusar conexão.

   A CRIAÇÃO É PREGUIÇOSA (o Proxy abaixo) por um motivo prático: quem
   só `import`a um módulo que por acaso importa este aqui não deveria
   precisar de banco nenhum. Era o que acontecia com o teste das funções
   puras da base de conhecimento — `search.ts` importa este arquivo por
   causa de uma função, e o teste morria no import com "DATABASE_URL não
   definida" sem nunca chegar a rodar. Com o Proxy, o client nasce no
   primeiro uso de verdade. */
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

function clientDoProcesso(): PrismaClient {
  const existente = globalParaPrisma.prisma;
  if (existente) return existente;

  const novo = criarClient();
  if (process.env["NODE_ENV"] !== "production") globalParaPrisma.prisma = novo;
  return novo;
}

/** Mesma interface do PrismaClient; a instância só existe quando alguém
 *  toca em alguma propriedade (prisma.user, prisma.$queryRaw, ...). */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_alvo, propriedade, receptor) {
    const valor = Reflect.get(clientDoProcesso(), propriedade, receptor) as unknown;
    // Método precisa continuar ligado ao client, senão `this` chega
    // como o Proxy e o Prisma quebra por dentro.
    return typeof valor === "function" ? valor.bind(clientDoProcesso()) : valor;
  },
  has(_alvo, propriedade) {
    return propriedade in clientDoProcesso();
  }
});
