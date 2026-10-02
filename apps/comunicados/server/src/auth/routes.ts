/* =====================================================================
   Sessão: entrar, sair, quem sou eu, trocar senha

   O portal é fechado: não existe cadastro aberto. O primeiro
   administrador nasce do seed e, a partir dele, os outros são criados na
   tela de usuários.

   Falha de login devolve SEMPRE a mesma frase e o mesmo código, com ou
   sem o e-mail existindo — e o scrypt roda nos dois casos, para os dois
   caminhos levarem o mesmo tempo. Dizer "usuário não encontrado" entrega
   quais e-mails existem.
   ===================================================================== */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import type { Env } from "../env.js";
import { AppError, asyncHandler, ipDaRequisicao } from "../http/errors.js";
import { hashSenha, validarForcaSenha, verificarSenha } from "./password.js";
import { criarRequireAuth, usuarioDaRequisicao } from "./middleware.js";
import { assinarToken, definirCookieSessao, limparCookieSessao } from "./session.js";

const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase().min(1, "Informe o e-mail."),
  senha: z.string().min(1, "Informe a senha.")
});

const esquemaTroca = z.object({
  senhaAtual: z.string().min(1, "Informe a senha atual."),
  senhaNova: z.string().min(1, "Informe a senha nova.")
});

/** Hash descartável para gastar o mesmo tempo quando o e-mail não
 *  existe. Sem isto, responder rápido já denuncia que o e-mail é falso. */
const HASH_FALSO = "scrypt$16384$8$1$MDAwMDAwMDAwMDAwMDAwMA==$MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=";

export function rotasDeAutenticacao(env: Env): Router {
  const router = Router();
  const requireAuth = criarRequireAuth(env);

  router.post(
    "/auth/login",
    asyncHandler(async (req, res) => {
      const { email, senha } = esquemaLogin.parse(req.body ?? {});

      const usuario = await prisma.usuario.findUnique({ where: { email } });
      const confere = usuario
        ? await verificarSenha(senha, usuario.senhaHash)
        : (await verificarSenha(senha, HASH_FALSO), false);

      if (!usuario || !confere || !usuario.ativo) {
        await prisma.auditoria.create({
          data: { acao: "login.falha", detalhe: email, ip: ipDaRequisicao(req) }
        });
        throw new AppError(401, "CREDENCIAIS_INVALIDAS", "E-mail ou senha não conferem.");
      }

      await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoLoginEm: new Date() } });
      definirCookieSessao(res, env, assinarToken(env, usuario));

      await prisma.auditoria.create({
        data: { usuarioId: usuario.id, acao: "login.ok", ip: ipDaRequisicao(req) }
      });

      res.json({
        user: {
          id: usuario.id,
          email: usuario.email,
          nome: usuario.nome,
          papel: usuario.papel,
          ativo: usuario.ativo
        }
      });
    })
  );

  router.post(
    "/auth/logout",
    asyncHandler(async (_req, res) => {
      limparCookieSessao(res, env);
      res.status(204).end();
    })
  );

  router.get(
    "/auth/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      res.json({ user: usuario });
    })
  );

  router.post(
    "/auth/senha",
    requireAuth,
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const { senhaAtual, senhaNova } = esquemaTroca.parse(req.body ?? {});

      const atual = await prisma.usuario.findUnique({ where: { id: usuario.id } });
      if (!atual || !(await verificarSenha(senhaAtual, atual.senhaHash))) {
        throw new AppError(400, "SENHA_ATUAL_INVALIDA", "A senha atual não confere.");
      }

      const fraca = validarForcaSenha(senhaNova);
      if (fraca) throw new AppError(400, "SENHA_FRACA", fraca);

      // Trocar senha derruba as outras sessões: é o que faz a troca valer
      // alguma coisa quando o motivo foi suspeita de acesso indevido.
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { senhaHash: await hashSenha(senhaNova), tokenVersion: { increment: 1 } }
      });

      limparCookieSessao(res, env);
      await prisma.auditoria.create({
        data: { usuarioId: usuario.id, acao: "senha.trocada", ip: ipDaRequisicao(req) }
      });

      res.json({ ok: true, mensagem: "Senha trocada. Entre de novo com a nova senha." });
    })
  );

  return router;
}
