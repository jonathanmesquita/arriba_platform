/* =====================================================================
   Semente: o primeiro administrador

   O sistema nasce sem nenhum usuário, e não existe tela de cadastro
   aberta — seria um chat interno com porta destrancada. Alguém precisa
   ser o primeiro, e é este script: ele lê SEED_ADMIN_EMAIL /
   SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME do ambiente e grava um usuário
   com papel ADMIN. Depois disso, o admin cria os outros pela aplicação.

   Duas decisões que valem explicar:

   - É idempotente (upsert pelo e-mail), porque `prisma migrate dev` roda
     o seed sozinho e rodar duas vezes não pode explodir nem duplicar.

   - Se o usuário JÁ EXISTE, a senha NÃO é sobrescrita. Um .env antigo
     esquecido na máquina (ou no painel do serviço) reverteria, a cada
     deploy, a senha que alguém acabou de trocar — e ninguém perceberia.
     O que o upsert garante em quem já existe é só o essencial: papel de
     administrador e conta ativa, para ninguém ficar trancado para fora.

   A senha nunca é impressa, nem mascarada, nem em caso de erro: log de
   terminal vai para arquivo, para CI e para a rolagem de quem estava
   olhando. O e-mail é impresso porque é ele que identifica o registro.
   ===================================================================== */

// Primeiro import, pelo mesmo motivo explicado no src/index.ts: o db.ts
// lê a DATABASE_URL quando é avaliado.
import "dotenv/config";

import { prisma } from "../src/db.js";
import { hashSenha, validarForcaSenha } from "../src/auth/password.js";

/** Lê e normaliza uma variável, tratando string vazia como ausente —
 *  `SEED_ADMIN_EMAIL=` no .env é intenção de "não configurado", não de
 *  "e-mail vazio". */
function variavel(nome: string): string | undefined {
  const valor = process.env[nome];
  if (typeof valor !== "string") return undefined;
  const limpo = valor.trim();
  return limpo.length > 0 ? limpo : undefined;
}

function explicarEsair(): never {
  console.log(
    [
      "[seed] Nenhum administrador foi criado: SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD não estão definidas.",
      "",
      "Isso não é um erro — o seed só é necessário na primeira subida do banco.",
      "Para criar o primeiro administrador, defina no server/.env:",
      "",
      "  SEED_ADMIN_EMAIL=voce@empresa.com.br",
      "  SEED_ADMIN_PASSWORD=<uma senha longa, 12+ caracteres>",
      '  SEED_ADMIN_NAME="Seu Nome"',
      "",
      "e rode de novo: npm run db:seed",
      "",
      "Depois de entrar, remova SEED_ADMIN_PASSWORD do .env — senha de verdade não",
      "precisa continuar em arquivo de configuração."
    ].join("\n")
  );
  process.exit(0);
}

async function main(): Promise<void> {
  const email = variavel("SEED_ADMIN_EMAIL")?.toLowerCase();
  const senha = variavel("SEED_ADMIN_PASSWORD");
  // O nome é opcional: sem ele, usa a parte antes do @ como rótulo.
  const nome = variavel("SEED_ADMIN_NAME");

  if (!email || !senha) explicarEsair();

  // Conferência boba de propósito: o login normaliza o e-mail para
  // minúsculas e busca exato, então um valor sem "@" criaria um usuário
  // no qual ninguém consegue entrar.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`[seed] SEED_ADMIN_EMAIL não parece um e-mail válido: ${email}`);
    process.exit(1);
  }

  const problemaNaSenha = validarForcaSenha(senha);
  if (problemaNaSenha) {
    // A mensagem fala do tamanho, nunca do conteúdo.
    console.error(`[seed] SEED_ADMIN_PASSWORD recusada: ${problemaNaSenha}`);
    process.exit(1);
  }

  const nomeFinal = nome ?? (email.split("@")[0] ?? "Administrador");
  const jaExistia = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  const usuario = await prisma.user.upsert({
    where: { email },
    // Quem já existe: só garante acesso de administrador e conta ativa.
    // `passwordHash` fora do update é a decisão explicada no cabeçalho.
    update: { role: "ADMIN", isActive: true },
    create: {
      email,
      name: nomeFinal,
      passwordHash: await hashSenha(senha),
      role: "ADMIN",
      isActive: true
    },
    select: { id: true, email: true, name: true, role: true }
  });

  if (jaExistia) {
    console.log(`[seed] Usuário ${usuario.email} já existia — papel ADMIN e conta ativa confirmados.`);
    console.log("[seed] A senha gravada NÃO foi alterada (o seed nunca sobrescreve senha).");
  } else {
    console.log(`[seed] Administrador criado: ${usuario.email} (${usuario.name}).`);
    console.log("[seed] Entre em http://localhost:5173 com esse e-mail e a senha do .env.");
  }
}

main()
  .catch((erro) => {
    console.error("[seed] falhou:", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(() => {
    // Sem isto o pool do Postgres segura o processo aberto e o script
    // "termina" mas não sai.
    void prisma.$disconnect();
  });
