/* Semente: o primeiro administrador.
 *
 * O portal nasce sem usuário e não tem cadastro aberto — alguém precisa
 * ser o primeiro. É idempotente (upsert por e-mail) e, se o usuário já
 * existe, NÃO sobrescreve a senha: um .env antigo esquecido na máquina
 * reverteria, a cada deploy, a senha que alguém acabou de trocar.
 *
 * A senha nunca é impressa, nem mascarada, nem em caso de erro. */
import "../src/carregarDotenv.js";

import { prisma } from "../src/db.js";
import { hashSenha, validarForcaSenha } from "../src/auth/password.js";

function variavel(nome: string): string | undefined {
  const valor = process.env[nome];
  const limpo = typeof valor === "string" ? valor.trim() : "";
  return limpo.length > 0 ? limpo : undefined;
}

async function principal(): Promise<void> {
  const email = variavel("SEED_ADMIN_EMAIL")?.toLowerCase();
  const senha = variavel("SEED_ADMIN_PASSWORD");
  const nome = variavel("SEED_ADMIN_NOME") ?? "Administrador";

  if (!email || !senha) {
    console.log(
      [
        "[seed] Nenhum administrador criado: SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD não estão definidas.",
        "",
        "Defina no .env e rode de novo:",
        "  SEED_ADMIN_EMAIL=voce@exemplo.com.br",
        "  SEED_ADMIN_PASSWORD=<senha longa, 12+ caracteres>",
        '  SEED_ADMIN_NOME="Seu Nome"',
        "",
        "Depois de entrar, apague SEED_ADMIN_PASSWORD do .env."
      ].join("\n")
    );
    return;
  }

  const fraca = validarForcaSenha(senha);
  if (fraca) {
    console.error(`[seed] A senha do administrador não serve: ${fraca}`);
    process.exit(1);
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });

  const usuario = await prisma.usuario.upsert({
    where: { email },
    create: { email, nome, papel: "ADMIN", senhaHash: await hashSenha(senha) },
    // Em quem já existe, garante só o essencial: papel de administrador e
    // conta ativa, para ninguém ficar trancado para fora.
    update: { papel: "ADMIN", ativo: true }
  });

  console.log(
    existente
      ? `[seed] Administrador já existia: ${usuario.email} (senha mantida).`
      : `[seed] Administrador criado: ${usuario.email} (${usuario.nome}).`
  );
}

principal()
  .catch((erro) => {
    console.error("[seed] falhou:", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
