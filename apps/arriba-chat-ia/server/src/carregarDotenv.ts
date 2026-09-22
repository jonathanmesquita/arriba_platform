/* Carrega o .env antes de qualquer outra coisa.

   O arquivo fica na RAIZ do app (apps/arriba-chat-ia/.env) porque é
   compartilhado entre server e web, mas os processos do servidor rodam
   de dentro de server/ — então o dotenv precisa do caminho explícito,
   senão procura em server/.env e não acha nada.

   Importado por index.ts, pelo CLI da base e pelo prisma.config.ts. O
   `override: false` garante que variável já definida no ambiente (que é
   como Render e Docker entregam segredo) ganha do arquivo. */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(import.meta.dirname, "..", "..", ".env"), override: false });
config({ path: resolve(import.meta.dirname, "..", ".env"), override: false });
