/* Importação da base pela linha de comando: `npm run kb:import`.

   Existe além do botão no painel porque a primeira carga acontece antes
   de haver qualquer usuário na tela — e porque num deploy dá para rodar
   junto da migration, sem depender de alguém clicar. */

// Primeiro import de propósito: o .env precisa estar carregado antes
// de qualquer módulo ler process.env.
import "../carregarDotenv.js";

import { importarBase, raizDoSite } from "./ingest.js";
import { prisma } from "../db.js";

async function principal(): Promise<void> {
  console.log(`Lendo a base do portal em: ${raizDoSite()}`);
  const resultado = await importarBase();

  console.log(`\nIndexados ${resultado.total} documento(s), ${resultado.caracteres.toLocaleString("pt-BR")} caracteres:`);
  for (const [fonte, quantos] of Object.entries(resultado.porFonte)) {
    console.log(`  ${fonte.padEnd(16)} ${quantos}`);
  }
  if (resultado.removidos) console.log(`\n${resultado.removidos} documento(s) que sumiram da origem foram removidos.`);
  for (const aviso of resultado.avisos) console.log(`  aviso: ${aviso}`);
}

principal()
  .catch((erro) => {
    console.error("\nFalhou:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
