/* =====================================================================
   Rotas de sessão: /auth/login, /auth/logout, /auth/me

   O ponto sensível aqui é o login. Uma tela de login descuidada vira
   ferramenta de enumeração de usuários: responde "senha incorreta" para
   e-mail que existe e "usuário não encontrado" para o que não existe, e
   pronto — dá para levantar a lista de quem trabalha na empresa sem ter
   nenhuma senha. Mesmo respondendo a MESMA frase, o tempo entrega: o
   caminho "e-mail não existe" volta na hora, o caminho "existe, senha
   errada" paga o custo do scrypt (~100 ms).

   Por isso, aqui:

   - falha sempre devolve o mesmo código e a mesma frase, seja e-mail
     inexistente, senha errada ou conta desativada;
   - quando o e-mail não existe, o scrypt roda mesmo assim contra um hash
     descartável, para pagar o mesmo custo;
   - toda resposta de login espera um piso de tempo, o que dilui a
     variação que sobrar.

   Auditoria: toda tentativa vira linha em AuditLog, com sucesso/falha e
   IP. O e-mail tentado é registrado (é o que serve para investigar);
   a senha, jamais — nem em log, nem em metadata, nem em mensagem de erro.
   ===================================================================== */

import { randomBytes } from "node:crypto";
import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import type { Env } from "../env.js";
import { registrarAuditoria } from "../audit/log.js";
import { asyncHandler } from "../http/errors.js";
import { verificarSenha, hashSenha } from "./password.js";
import { criarRequireAuth, usuarioDaRequisicao } from "./middleware.js";
import {
  assinarToken,
  definirCookieSessao,
  limparCookieSessao,
  tokenDoCookie,
  verificarToken
} from "./session.js";

/** Piso de duração da resposta de login, em ms. Não é proteção contra
 *  força bruta (isso é limite de taxa); é para que os desfechos não se
 *  distingam pelo relógio. */
const PISO_LOGIN_MS = 350;

const MENSAGEM_FALHA_LOGIN = "E-mail ou senha inválidos.";

const esquemaLogin = z.object({
  email: z
    .string({ message: "Informe o e-mail." })
    .trim()
    .toLowerCase()
    .email("E-mail inválido."),
  senha: z.string({ message: "Informe a senha." }).min(1, "Informe a senha.")
});

/** Hash descartável usado quando o e-mail não existe, só para que o
 *  scrypt rode e o tempo de resposta bata com o do caminho real. É
 *  calculado uma vez por processo, sob demanda, a partir de bytes
 *  aleatórios — nenhuma senha real chega perto disto. */
let hashDescartavel: Promise<string> | undefined;
function hashParaComparacaoFalsa(): Promise<string> {
  hashDescartavel ??= hashSenha(randomBytes(24).toString("base64url"));
  return hashDescartavel;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

async function aguardarPiso(inicio: number): Promise<void> {
  const restante = PISO_LOGIN_MS - (Date.now() - inicio);
  if (restante > 0) await esperar(restante);
}

/** IP de quem chamou. Com proxy na frente (Render, Cloudflare), o valor
 *  útil só aparece se o app tiver `trust proxy` ligado — é lá que essa
 *  decisão mora, não aqui. */
function ipDaRequisicao(req: Request): string | null {
  return req.ip ?? req.socket?.remoteAddress ?? null;
}

/** Forma pública do usuário. Nunca inclui passwordHash nem tokenVersion
 *  (detalhe interno de revogação). */
function usuarioPublico(usuario: {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: Date | null;
}) {
  return {
    id: usuario.id,
    email: usuario.email,
    name: usuario.name,
    role: usuario.role,
    isActive: usuario.isActive,
    lastLoginAt: usuario.lastLoginAt ?? null
  };
}

export function criarAuthRouter(env: Env): Router {
  const router = Router();
  const requireAuth = criarRequireAuth(env);

  router.post(
    "/auth/login",
    asyncHandler(async (req, res) => {
      const inicio = Date.now();
      const { email, senha } = esquemaLogin.parse(req.body);
      const ip = ipDaRequisicao(req);

      const usuario = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          tokenVersion: true,
          passwordHash: true
        }
      });

      // Sem `if (!usuario) return`: o scrypt roda dos dois lados.
      const guardado = usuario?.passwordHash ?? (await hashParaComparacaoFalsa());
      const senhaConfere = await verificarSenha(senha, guardado);

      if (!usuario || !senhaConfere || !usuario.isActive) {
        const motivo = !usuario
          ? "usuario_inexistente"
          : !senhaConfere
            ? "senha_incorreta"
            : "usuario_inativo";

        await registrarAuditoria({
          userId: usuario?.id ?? null,
          action: "auth.login",
          success: false,
          ip,
          // O motivo detalhado fica AQUI, no log interno — a resposta ao
          // cliente continua sendo uma frase só.
          metadata: { email, motivo }
        });

        await aguardarPiso(inicio);
        res.status(401).json({ error: "CREDENCIAIS_INVALIDAS", message: MENSAGEM_FALHA_LOGIN });
        return;
      }

      const atualizado = await prisma.user.update({
        where: { id: usuario.id },
        data: { lastLoginAt: new Date() },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          tokenVersion: true,
          lastLoginAt: true
        }
      });

      const token = assinarToken(env, atualizado);
      definirCookieSessao(res, env, token);

      await registrarAuditoria({
        userId: atualizado.id,
        action: "auth.login",
        success: true,
        ip,
        metadata: { email: atualizado.email }
      });

      await aguardarPiso(inicio);
      res.json({ user: usuarioPublico(atualizado) });
    })
  );

  router.post(
    "/auth/logout",
    asyncHandler(async (req, res) => {
      // Sem requireAuth de propósito: sair tem de funcionar mesmo com
      // sessão expirada ou token estragado. O cookie some de qualquer
      // jeito; a auditoria só acontece se der para saber quem era.
      const payload = verificarToken(env, tokenDoCookie(req.cookies as Record<string, unknown>, env));

      limparCookieSessao(res, env);

      if (payload) {
        await registrarAuditoria({
          userId: payload.sub,
          action: "auth.logout",
          success: true,
          ip: ipDaRequisicao(req)
        });
      }

      res.json({ ok: true });
    })
  );

  router.get(
    "/auth/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      const daSessao = usuarioDaRequisicao(req);

      // Relê a linha para devolver também `lastLoginAt`, que o
      // middleware não carrega (ele só busca o necessário para decidir
      // se a sessão vale).
      const usuario = await prisma.user.findUnique({
        where: { id: daSessao.id },
        select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true }
      });

      if (!usuario) {
        // Conta apagada entre o middleware e aqui: trata como sessão morta.
        limparCookieSessao(res, env);
        res.status(401).json({ error: "NAO_AUTENTICADO", message: "Sessão inválida. Entre novamente." });
        return;
      }

      res.json({ user: usuarioPublico(usuario) });
    })
  );

  return router;
}
