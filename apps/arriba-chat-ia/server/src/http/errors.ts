/* =====================================================================
   Erros HTTP — um formato só para a resposta de falha

   Toda resposta de erro deste servidor tem a mesma forma:

     { "error": "CODIGO_EM_MAIUSCULA", "message": "frase em pt-BR", ... }

   O front decide o que fazer pelo `error` (código estável) e mostra o
   `message` (que pode mudar sem quebrar nada). Foi a falta desse
   contrato que produziu, no support-copilot, o bug de tratar um 401 de
   upstream como "sua sessão caiu".

   Três regras que o middleware final obedece sem exceção:

   1. Stack trace NUNCA vai na resposta. Ele nomeia arquivo, caminho e
      dependência — mapa pronto para quem procura brecha. Stack vai só
      para o console do servidor.
   2. O corpo da requisição NUNCA é ecoado. O corpo do /auth/login tem
      senha; o do /chat tem conteúdo de conversa. Erro que devolve "veio
      isto aqui" vaza os dois, inclusive para o log de acesso do proxy.
   3. Erro não classificado vira 500 genérico. Mensagem de biblioteca
      costuma trazer credencial, host interno ou query — melhor a frase
      neutra e o detalhe no servidor.
   ===================================================================== */

import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { ProviderError, type ProviderErrorCode } from "../providers/errors.js";

/** Erro previsto pela aplicação: já sabe que status e que código quer.
 *  Qualquer rota pode lançar — o middleware final traduz. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  /** Detalhe opcional que PODE ir para o cliente (ex.: campos
   *  inválidos). Nunca coloque segredo nem corpo de requisição aqui. */
  readonly detalhes?: unknown;

  constructor(status: number, code: string, message: string, opcoes?: { detalhes?: unknown; cause?: unknown }) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    if (opcoes?.detalhes !== undefined) this.detalhes = opcoes.detalhes;
    if (opcoes?.cause !== undefined) this.cause = opcoes.cause;
  }

  static naoEncontrado(mensagem = "Recurso não encontrado."): AppError {
    return new AppError(404, "NAO_ENCONTRADO", mensagem);
  }

  static requisicaoInvalida(mensagem: string, detalhes?: unknown): AppError {
    return new AppError(400, "REQUISICAO_INVALIDA", mensagem, { detalhes });
  }

  static conflito(mensagem: string): AppError {
    return new AppError(409, "CONFLITO", mensagem);
  }
}

type ManipuladorAsync = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

/** Envelope para handler assíncrono.
 *
 *  O Express 5 encaminha promessa rejeitada em muitos casos, mas não em
 *  todos (middleware de erro, handlers montados fora do roteador comum),
 *  e depender disso é exatamente o tipo de falha que só aparece em
 *  produção, como requisição pendurada até o timeout. Com o wrapper o
 *  caminho é sempre o mesmo: rejeitou -> next(erro). */
export function asyncHandler(fn: ManipuladorAsync): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Status HTTP para cada falha de provedor.
 *
 *  Detalhe que importa: chave de API recusada pelo provedor NÃO é 401 —
 *  quem não se autenticou seria o nosso usuário, e ele está autenticado.
 *  O problema é upstream, então 502. Mandar 401 aqui faria o front achar
 *  que a sessão caiu e jogar o usuário na tela de login (de novo, o bug
 *  do support-copilot). */
const STATUS_POR_CODIGO: Record<ProviderErrorCode, number> = {
  AUTH_INVALID: 502,
  RATE_LIMIT: 429,
  QUOTA_EXCEEDED: 502,
  TIMEOUT: 504,
  CONTEXT_LENGTH: 413,
  MODEL_NOT_FOUND: 502,
  BAD_REQUEST: 502,
  CONTENT_FILTERED: 422,
  PROVIDER_UNAVAILABLE: 503,
  // 499 ("client closed request"): o usuário abortou. Não é erro nosso e
  // não deve poluir o painel como 5xx.
  CANCELLED: 499,
  UNKNOWN: 502
};

function ehAdmin(req: Request): boolean {
  // Lido de forma defensiva para este módulo não depender do middleware
  // de auth (que importa daqui) — evita ciclo entre os dois.
  const usuario = (req as unknown as { usuario?: { role?: string } }).usuario;
  return usuario?.role === "ADMIN";
}

function resumoDoErro(erro: unknown): string {
  if (erro instanceof Error) return `${erro.name}: ${erro.message}`;
  return String(erro);
}

/** Middleware final de erro. Precisa dos QUATRO parâmetros: é pela
 *  aridade que o Express reconhece um handler de erro. */
export const middlewareDeErro: ErrorRequestHandler = (erro, req, res, next) => {
  // Se a resposta já começou a ser enviada (streaming do chat, por
  // exemplo), não dá para trocar status nem corpo: deixa o Express
  // fechar a conexão.
  if (res.headersSent) {
    next(erro);
    return;
  }

  if (erro instanceof ProviderError) {
    const status = STATUS_POR_CODIGO[erro.code] ?? 502;
    const payload = erro.toUserPayload();
    console.error(`[provedor] ${req.method} ${req.originalUrl} -> ${erro.code}`, erro.providerMessage ?? "");

    res.status(status).json({
      error: payload.code,
      message: payload.message,
      retryable: payload.retryable,
      // Só o admin recebe o texto cru do provedor: é o que ele precisa
      // para consertar, e é informação de infraestrutura.
      ...(ehAdmin(req) ? { detalheAdmin: erro.toAdminPayload() } : {})
    });
    return;
  }

  if (erro instanceof ZodError) {
    res.status(400).json({
      error: "REQUISICAO_INVALIDA",
      message: "Alguns campos estão inválidos. Confira e envie de novo.",
      campos: erro.issues.map((problema) => ({
        campo: problema.path.map(String).join(".") || "(raiz)",
        mensagem: problema.message
      }))
    });
    return;
  }

  if (erro instanceof AppError) {
    if (erro.status >= 500) {
      console.error(`[app] ${req.method} ${req.originalUrl} -> ${erro.code}`, erro);
    }
    res.status(erro.status).json({
      error: erro.code,
      message: erro.message,
      ...(erro.detalhes !== undefined ? { detalhes: erro.detalhes } : {})
    });
    return;
  }

  // JSON malformado no corpo: o body-parser do Express lança um erro com
  // status 400 e `type: "entity.parse.failed"`. Vale responder direito
  // em vez de 500 — é erro do cliente, não do servidor.
  const comStatus = erro as { status?: number; statusCode?: number; type?: string };
  const status = comStatus?.status ?? comStatus?.statusCode;
  if (status === 400 && comStatus?.type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON_INVALIDO", message: "O corpo da requisição não é um JSON válido." });
    return;
  }

  // Qualquer outra coisa: 500 genérico. O detalhe fica no console —
  // método e rota ajudam a achar; o corpo, nunca (senha e conversa).
  console.error(`[erro] ${req.method} ${req.originalUrl} -> ${resumoDoErro(erro)}`);
  if (erro instanceof Error && erro.stack) console.error(erro.stack);

  res.status(500).json({
    error: "ERRO_INTERNO",
    message: "Algo deu errado por aqui. Tente de novo; se continuar, avise o administrador."
  });
};

/** Handler de rota inexistente. Vai montado depois de todas as rotas e
 *  antes do middleware de erro. */
export const middlewareNaoEncontrado: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "NAO_ENCONTRADO", message: "Rota não encontrada." });
};
