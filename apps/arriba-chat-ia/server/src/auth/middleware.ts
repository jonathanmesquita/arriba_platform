/* =====================================================================
   Middlewares de autenticação e papel

   `requireAuth` não confia só no token: ele recarrega o usuário do banco
   a cada requisição. Isso custa uma consulta, e é de propósito — é o que
   faz valer, DENTRO do prazo do token, três coisas que o JWT sozinho não
   sabe: conta desativada (`isActive`), papel rebaixado (o `role` do
   banco vence o do token) e sessão revogada (`tokenVersion`).

   Sempre que a sessão é recusada o cookie é limpo junto. Sem isso o
   navegador continuaria mandando um cookie morto em toda requisição, e
   o front ficaria num laço de "tenta / toma 401".

   O tipo de `req.usuario` é declarado por augmentation do módulo de
   tipos do Express (não `declare global`): fica restrito ao programa que
   importa este arquivo e não polui o escopo global.
   ===================================================================== */

import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Role } from "../../generated/prisma/client.js";
import { prisma } from "../db.js";
import { carregarEnv, type Env } from "../env.js";
import { limparCookieSessao, tokenDoCookie, verificarToken } from "./session.js";

/** O usuário já validado, como as rotas o enxergam. Sem passwordHash:
 *  hash de senha não tem por que circular pela camada de rota. */
export interface UsuarioAutenticado {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  tokenVersion: number;
}

declare module "express-serve-static-core" {
  interface Request {
    /** Preenchido por `requireAuth`. Opcional porque rotas públicas
     *  também passam pelo mesmo tipo de Request. */
    usuario?: UsuarioAutenticado;
  }
}

/** Para handlers que rodam DEPOIS de `requireAuth` e não querem checar
 *  `usuario` de novo: `(req as RequisicaoAutenticada).usuario.id`. */
export interface RequisicaoAutenticada extends Request {
  usuario: UsuarioAutenticado;
}

/** Sessão ausente/expirada/revogada. */
function responder401(res: Response, env: Env, mensagem: string): void {
  limparCookieSessao(res, env);
  res.status(401).json({ error: "NAO_AUTENTICADO", message: mensagem });
}

/** Autenticado, mas o papel não alcança. Aqui o cookie NÃO é limpo: a
 *  sessão é válida, só não serve para esta rota. */
function responder403(res: Response, mensagem: string): void {
  res.status(403).json({ error: "SEM_PERMISSAO", message: mensagem });
}

/* O Env é injetado por quem monta o app (`criarRequireAuth(env)`), que é
   o caminho preferido. O `requireAuth` exportado pronto existe para uso
   direto em `router.use(requireAuth)`: ele pega o Env de
   `app.locals.env`, se o index.ts tiver publicado ali, e senão carrega
   uma vez do ambiente. Carregar é barato e idempotente — a validação do
   env.ts já rodou na subida do processo. */
let envMemorizado: Env | undefined;

function resolverEnv(req: Request): Env {
  const doApp = (req.app?.locals as { env?: Env } | undefined)?.env;
  if (doApp) return doApp;
  envMemorizado ??= carregarEnv();
  return envMemorizado;
}

function cookiesDe(req: Request): Record<string, unknown> | undefined {
  // cookie-parser preenche isto; se o middleware não estiver montado,
  // o valor simplesmente não existe e a sessão cai como ausente.
  return (req as unknown as { cookies?: Record<string, unknown> }).cookies;
}

async function autenticar(req: Request, res: Response, next: NextFunction, env: Env): Promise<void> {
  try {
    const token = tokenDoCookie(cookiesDe(req), env);
    const payload = verificarToken(env, token);

    if (!payload) {
      responder401(res, env, "Sessão não encontrada ou expirada. Entre novamente.");
      return;
    }

    const usuario = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true, tokenVersion: true }
    });

    if (!usuario) {
      responder401(res, env, "Sessão inválida. Entre novamente.");
      return;
    }

    if (!usuario.isActive) {
      responder401(res, env, "Este acesso foi desativado. Procure o administrador.");
      return;
    }

    if (usuario.tokenVersion !== payload.tokenVersion) {
      // Senha trocada, papel alterado ou acesso revogado desde a emissão.
      responder401(res, env, "Sua sessão foi encerrada. Entre novamente.");
      return;
    }

    req.usuario = usuario;
    next();
  } catch (erro) {
    // Express 5 não captura rejeição de promessa aqui de forma
    // confiável; o erro vai para o middleware final na mão.
    next(erro);
  }
}

/** Versão parametrizada — use esta quando tiver o Env em mãos. */
export function criarRequireAuth(env: Env): RequestHandler {
  return (req, res, next) => {
    void autenticar(req, res, next, env);
  };
}

/** Versão pronta para uso, resolvendo o Env por conta própria. */
export const requireAuth: RequestHandler = (req, res, next) => {
  void autenticar(req, res, next, resolverEnv(req));
};

/** Exige papel ADMIN. Deve vir DEPOIS de `requireAuth` na cadeia; se
 *  vier sozinho, responde 401 em vez de deixar passar. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  const usuario = req.usuario;

  if (!usuario) {
    responder401(res, resolverEnv(req), "Sessão não encontrada ou expirada. Entre novamente.");
    return;
  }

  if (usuario.role !== "ADMIN") {
    responder403(res, "Esta área é restrita a administradores.");
    return;
  }

  next();
};

/** Atalho para handlers: devolve o usuário autenticado ou lança. Use
 *  apenas em rota que já passou por `requireAuth` — o lançamento aqui é
 *  rede de segurança contra cadeia mal montada, não fluxo esperado. */
export function usuarioDaRequisicao(req: Request): UsuarioAutenticado {
  const usuario = req.usuario;
  if (!usuario) {
    throw new Error("Rota sem requireAuth na cadeia: req.usuario não foi preenchido.");
  }
  return usuario;
}
