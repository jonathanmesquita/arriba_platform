/* =====================================================================
   Sessão — JWT em cookie HttpOnly

   Duas decisões que valem explicar, porque são o motivo de o desenho ser
   este e não "token no localStorage":

   1. Cookie HttpOnly. O JavaScript da página NÃO consegue ler o cookie
      (`document.cookie` não enxerga). Então um XSS — script injetado por
      markdown de resposta do modelo, por dependência comprometida, pelo
      que for — não consegue copiar a sessão e usá-la de outra máquina.
      Token guardado em localStorage é legível por qualquer script da
      origem: um XSS vira roubo de conta permanente.
      Junto vão SameSite=Lax (o cookie não acompanha requisição
      cross-site, o que corta CSRF na navegação comum) e Secure em
      produção (não trafega em http).

   2. `tokenVersion` no payload. Sem tabela de sessão, um JWT emitido é
      válido até expirar — não dá para "deslogar" ninguém. A versão
      resolve isso: ela vive na linha do usuário e o middleware compara.
      Trocou a senha, o papel mudou, o admin revogou o acesso? Basta
      incrementar `tokenVersion` no banco e TODOS os tokens daquele
      usuário morrem na próxima requisição. Revogação sem estado extra.

   O algoritmo é fixado em HS256 na assinatura E na verificação. Aceitar
   o algoritmo que o token declara é a falha clássica de JWT (`alg: none`,
   ou RS256 verificado como HS256 usando a chave pública como segredo).
   ===================================================================== */

import jwt from "jsonwebtoken";
import type { CookieOptions, Response } from "express";
import type { Role } from "../../generated/prisma/client.js";
import type { Env } from "../env.js";

const ALGORITMO = "HS256" as const;

/** O que viaja dentro do token. Propositalmente mínimo: nada de e-mail
 *  ou nome. O payload de um JWT é apenas assinado, NÃO é cifrado —
 *  qualquer um que tenha o token lê o conteúdo em base64. Dado do
 *  usuário vem do banco a cada requisição (ver middleware.ts). */
export interface PayloadSessao {
  sub: string;
  role: Role;
  tokenVersion: number;
}

/** O mínimo que a assinatura precisa saber do usuário. Aceita a linha
 *  inteira do Prisma sem exigir o tipo completo. */
export interface UsuarioParaToken {
  id: string;
  role: Role;
  tokenVersion: number;
}

export function assinarToken(env: Env, usuario: UsuarioParaToken): string {
  const payload: PayloadSessao = {
    sub: usuario.id,
    role: usuario.role,
    tokenVersion: usuario.tokenVersion
  };

  // expiresIn em SEGUNDOS (número) em vez de string "12h": o tipo de
  // string do jsonwebtoken é literal e não aceita template montado em
  // runtime — número é inequívoco e evita erro de compilação.
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: ALGORITMO,
    expiresIn: env.SESSION_TTL_HOURS * 3600
  });
}

/** Verifica assinatura, validade e formato. Devolve null para qualquer
 *  token inválido — quem chama trata como "não autenticado" e pronto;
 *  distinguir "expirado" de "assinatura errada" para o cliente só ajuda
 *  quem está tentando adivinhar. */
export function verificarToken(env: Env, token: string | undefined | null): PayloadSessao | null {
  if (!token || typeof token !== "string") return null;

  try {
    const bruto = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITMO] });
    if (typeof bruto !== "object" || bruto === null) return null;

    const dados = bruto as Record<string, unknown>;
    const sub = dados["sub"];
    const role = dados["role"];
    const tokenVersion = dados["tokenVersion"];

    if (typeof sub !== "string" || sub.length === 0) return null;
    if (role !== "USER" && role !== "ADMIN") return null;
    if (typeof tokenVersion !== "number" || !Number.isInteger(tokenVersion)) return null;

    return { sub, role, tokenVersion };
  } catch {
    return null;
  }
}

/** Opções do cookie. Ficam numa função só para que `definir` e `limpar`
 *  usem exatamente os mesmos atributos — o navegador só apaga um cookie
 *  quando path/sameSite/secure batem com os da criação. */
function opcoesCookie(env: Env): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    path: "/"
  };
}

export function definirCookieSessao(res: Response, env: Env, token: string): void {
  res.cookie(env.COOKIE_NAME, token, {
    ...opcoesCookie(env),
    // Mesmo prazo do JWT: cookie que sobrevive ao token só produz
    // requisição com sessão morta.
    maxAge: env.SESSION_TTL_HOURS * 3600 * 1000
  });
}

export function limparCookieSessao(res: Response, env: Env): void {
  res.clearCookie(env.COOKIE_NAME, opcoesCookie(env));
}

/** Lê o token do cookie da requisição. Só cookie, de propósito: aceitar
 *  também `Authorization: Bearer` devolveria ao JavaScript da página a
 *  necessidade de guardar o token em algum lugar legível — exatamente o
 *  que o HttpOnly evita. */
export function tokenDoCookie(
  cookies: Record<string, unknown> | undefined,
  env: Env
): string | undefined {
  const valor = cookies?.[env.COOKIE_NAME];
  return typeof valor === "string" && valor.length > 0 ? valor : undefined;
}
