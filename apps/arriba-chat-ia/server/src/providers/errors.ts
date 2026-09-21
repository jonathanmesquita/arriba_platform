/* =====================================================================
   Erros de provedor, normalizados

   Cada SDK erra de um jeito: a Anthropic lança classes tipadas
   (RateLimitError, AuthenticationError...), a OpenAI tem APIError com
   `status`, a Gemini devolve mensagem de texto com o código embutido.
   Se isso vazar para o chat, a mensagem que o usuário vê depende do
   provedor ativo — e o admin não consegue diagnosticar.

   Aqui todos viram ProviderError com um `code` do nosso conjunto, uma
   frase para o USUÁRIO (curta, sem jargão, sem nome de provedor) e uma
   para o ADMIN (com o que ele precisa para consertar). O texto cru do
   provedor fica em `providerMessage` — vai para o log de auditoria, não
   para a tela do usuário comum.
   ===================================================================== */

import type { ProviderKind } from "./types.js";

export type ProviderErrorCode =
  | "AUTH_INVALID"        // chave errada, revogada ou sem permissão
  | "RATE_LIMIT"          // estourou cota/limite por minuto
  | "QUOTA_EXCEEDED"      // créditos/faturamento esgotados
  | "TIMEOUT"             // o provedor demorou além do limite
  | "CONTEXT_LENGTH"      // conversa maior que a janela do modelo
  | "MODEL_NOT_FOUND"     // id de modelo inexistente para essa conta
  | "BAD_REQUEST"         // parâmetro recusado (ex.: temperature em modelo que não aceita)
  | "CONTENT_FILTERED"    // o provedor recusou por política de conteúdo
  | "PROVIDER_UNAVAILABLE"// 5xx, indisponibilidade, rede
  | "CANCELLED"           // o próprio usuário abortou
  | "UNKNOWN";

/** Frases para o usuário comum. Não citam provedor nem modelo de
 *  propósito: para quem está no chat, "qual IA está por trás" é detalhe
 *  de configuração, e citar isso só gera chamado errado. */
const MENSAGEM_USUARIO: Record<ProviderErrorCode, string> = {
  AUTH_INVALID: "O assistente está com a configuração de acesso inválida. Avise o administrador.",
  RATE_LIMIT: "Muitas mensagens ao mesmo tempo. Espere alguns segundos e tente de novo.",
  QUOTA_EXCEEDED: "A cota do assistente acabou. Avise o administrador.",
  TIMEOUT: "O assistente demorou demais para responder. Tente de novo.",
  CONTEXT_LENGTH: "Esta conversa ficou longa demais para o assistente. Comece uma conversa nova.",
  MODEL_NOT_FOUND: "O modelo configurado não está disponível. Avise o administrador.",
  BAD_REQUEST: "A configuração do assistente foi recusada pelo provedor. Avise o administrador.",
  CONTENT_FILTERED: "O provedor recusou responder a esse conteúdo.",
  PROVIDER_UNAVAILABLE: "O serviço de IA está indisponível agora. Tente de novo em instantes.",
  CANCELLED: "Resposta cancelada.",
  UNKNOWN: "Não consegui responder agora. Tente de novo."
};

/** Frases para o admin: dizem o que fazer. */
const MENSAGEM_ADMIN: Record<ProviderErrorCode, string> = {
  AUTH_INVALID: "A API key foi recusada. Gere uma nova no painel do provedor e substitua na configuração.",
  RATE_LIMIT: "Limite de requisições por minuto atingido. Reduza o uso ou peça aumento de limite ao provedor.",
  QUOTA_EXCEEDED: "Créditos/faturamento esgotados na conta do provedor.",
  TIMEOUT: "O provedor não respondeu dentro do tempo limite configurado (PROVIDER_TIMEOUT_MS).",
  CONTEXT_LENGTH: "A conversa excedeu a janela de contexto do modelo. Reduza CHAT_HISTORY_LIMIT ou escolha um modelo com janela maior.",
  MODEL_NOT_FOUND: "O id do modelo não existe ou a conta não tem acesso a ele. Confira o campo Modelo.",
  BAD_REQUEST: "O provedor recusou um parâmetro da requisição. Veja o detalhe abaixo — o caso mais comum é enviar temperature para um modelo que não aceita.",
  CONTENT_FILTERED: "O provedor bloqueou a requisição por política de conteúdo.",
  PROVIDER_UNAVAILABLE: "O provedor está indisponível ou inacessível pela rede.",
  CANCELLED: "Requisição cancelada pelo cliente.",
  UNKNOWN: "Falha não classificada. Veja a mensagem original abaixo."
};

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly provider: ProviderKind;
  readonly httpStatus?: number;
  readonly retryAfterSeconds?: number;
  /** Texto cru do provedor. Vai para auditoria e para a tela do admin. */
  readonly providerMessage?: string;

  constructor(params: {
    code: ProviderErrorCode;
    provider: ProviderKind;
    httpStatus?: number;
    retryAfterSeconds?: number;
    providerMessage?: string;
    cause?: unknown;
  }) {
    super(`[${params.provider}] ${params.code}: ${params.providerMessage ?? ""}`.trim());
    this.name = "ProviderError";
    this.code = params.code;
    this.provider = params.provider;
    this.httpStatus = params.httpStatus;
    this.retryAfterSeconds = params.retryAfterSeconds;
    this.providerMessage = params.providerMessage;
    if (params.cause !== undefined) this.cause = params.cause;
  }

  get mensagemUsuario(): string {
    return MENSAGEM_USUARIO[this.code];
  }

  get mensagemAdmin(): string {
    const base = MENSAGEM_ADMIN[this.code];
    return this.providerMessage ? `${base}\n\nResposta do provedor: ${this.providerMessage}` : base;
  }

  /** Vale tentar de novo automaticamente? Só para falha transitória. */
  get retryable(): boolean {
    return this.code === "RATE_LIMIT" || this.code === "PROVIDER_UNAVAILABLE" || this.code === "TIMEOUT";
  }

  /** Forma segura para resposta HTTP ao usuário comum. */
  toUserPayload() {
    return { code: this.code, message: this.mensagemUsuario, retryable: this.retryable };
  }

  /** Forma para o admin (inclui o texto do provedor). */
  toAdminPayload() {
    return {
      code: this.code,
      provider: this.provider,
      message: this.mensagemAdmin,
      httpStatus: this.httpStatus,
      retryAfterSeconds: this.retryAfterSeconds,
      retryable: this.retryable
    };
  }
}

/** Classificador por status HTTP — a parte que é igual nos três provedores.
 *  Cada adapter chama isto depois de tentar os tipos próprios do SDK dele. */
export function classificarPorStatus(status: number | undefined): ProviderErrorCode {
  switch (status) {
    case 401:
    case 403:
      return "AUTH_INVALID";
    case 404:
      return "MODEL_NOT_FOUND";
    case 408:
      return "TIMEOUT";
    case 413:
      return "CONTEXT_LENGTH";
    case 422:
    case 400:
      return "BAD_REQUEST";
    case 429:
      return "RATE_LIMIT";
    default:
      if (status && status >= 500) return "PROVIDER_UNAVAILABLE";
      return "UNKNOWN";
  }
}

/** Refina o código olhando o texto do erro. Serve para os casos que o
 *  status não distingue: 400 pode ser "modelo não existe", "contexto
 *  estourado" ou "parâmetro inválido", e 429 pode ser cota acabada. */
export function refinarPorTexto(code: ProviderErrorCode, texto: string | undefined): ProviderErrorCode {
  if (!texto) return code;
  const t = texto.toLowerCase();

  if (/context length|too many tokens|maximum context|prompt is too long|input is too long/.test(t)) return "CONTEXT_LENGTH";
  if (/model.*(not found|does not exist|not available|unsupported)|unknown model|invalid model/.test(t)) return "MODEL_NOT_FOUND";
  if (/insufficient[_ ]quota|billing|credit balance|exceeded your current quota|payment required/.test(t)) return "QUOTA_EXCEEDED";
  if (/api key|unauthorized|authentication|permission denied|invalid[_ ]api[_ ]key|credential/.test(t)) return "AUTH_INVALID";
  if (/rate limit|too many requests|resource[_ ]exhausted/.test(t)) return "RATE_LIMIT";
  if (/safety|blocked|content filter|content_policy|prohibited/.test(t)) return "CONTENT_FILTERED";
  if (/timeout|timed out|deadline exceeded/.test(t)) return "TIMEOUT";
  return code;
}

/** Converte qualquer coisa lançada num ProviderError. Cada adapter usa isto
 *  como rede de segurança final, depois de tratar os tipos que conhece. */
export function comoProviderError(erro: unknown, provider: ProviderKind): ProviderError {
  if (erro instanceof ProviderError) return erro;

  if (erro instanceof Error && (erro.name === "AbortError" || erro.name === "APIUserAbortError")) {
    return new ProviderError({ code: "CANCELLED", provider, providerMessage: erro.message, cause: erro });
  }

  const qualquer = erro as { status?: number; statusCode?: number; message?: string; error?: { message?: string } };
  const status = qualquer?.status ?? qualquer?.statusCode;
  const texto = qualquer?.error?.message ?? qualquer?.message ?? String(erro);

  return new ProviderError({
    code: refinarPorTexto(classificarPorStatus(status), texto),
    provider,
    httpStatus: status,
    providerMessage: texto,
    cause: erro
  });
}
