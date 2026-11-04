/* =====================================================================
   Registro de auditoria

   Toda ação que importa (login, troca de provedor, mensagem respondida,
   falha do provedor) vira uma linha em AuditLog. Duas regras governam
   este arquivo, e as duas existem por motivo prático:

   1. AUDITORIA NUNCA DERRUBA A OPERAÇÃO PRINCIPAL. Se o insert falhar
      (banco fora, coluna nova ainda não migrada, JSON inválido), o
      usuário não pode perder a resposta que já foi gerada e já foi paga
      em tokens. O erro vai para o console do servidor e a vida segue.
      Por isso nenhuma chamada a `registrarAuditoria` precisa de
      try/catch do lado de quem chama.

   2. SEGREDO NÃO ENTRA NO LOG. `metadata` é campo livre — é justamente
      por ser livre que alguém, um dia, vai jogar o corpo inteiro de uma
      requisição ali dentro. `sanitizarMetadata()` corta as chaves com
      cara de credencial ANTES de gravar, e mascara valores com formato
      conhecido de chave (`sk-...`, `AIza...`). Log de auditoria é
      exatamente o lugar que se copia inteiro para um chamado — não pode
      ter chave dentro.
   ===================================================================== */

import type { Request } from "express";
import type { Prisma, ProviderKind } from "../../generated/prisma/client.js";
import { prisma } from "../db.js";
import { mascararSegredo } from "../providers/registry.js";

export interface DadosAuditoria {
  /** Null/undefined quando não dá para saber quem era (login que falhou
   *  com e-mail inexistente, por exemplo). */
  userId?: string | null;
  /** Verbo no formato `assunto.acao`: "auth.login", "chat.completion",
   *  "chat.error", "provider.activate". */
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  provider?: ProviderKind | null;
  model?: string | null;
  conversationId?: string | null;
  success?: boolean;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

/** Chaves que nunca são gravadas, não importa o valor. A lista é
 *  propositalmente generosa: um falso positivo custa um campo a menos no
 *  log; um falso negativo custa uma credencial em texto puro no banco. */
const CHAVES_SENSIVEIS =
  /(api[-_ ]?key|apikey|secret|token|senha|password|passwd|authorization|credential|bearer|cookie|private[-_ ]?key|cipher)/i;

/** Formatos públicos e conhecidos de credencial. Serve para o caso em que
 *  a chave veio numa propriedade de nome inocente ("valor", "entrada"). */
const VALOR_COM_CARA_DE_CHAVE =
  /^(sk-|sk_live_|sk_test_|rk_|xoxb-|xoxp-|ghp_|gho_|github_pat_|AIza|Bearer\s|ya29\.|v1\.[A-Za-z0-9_-]{8})/;

const PROFUNDIDADE_MAXIMA = 4;
const TAMANHO_MAXIMO_TEXTO = 2_000;
const REMOVIDO = "[removido]";

function sanitizarTexto(valor: string): string {
  if (VALOR_COM_CARA_DE_CHAVE.test(valor.trim())) return mascararSegredo(valor);
  return valor.length > TAMANHO_MAXIMO_TEXTO
    ? `${valor.slice(0, TAMANHO_MAXIMO_TEXTO)}… [${valor.length} caracteres]`
    : valor;
}

/** Deixa o valor em forma JSON segura. A profundidade máxima também
 *  resolve referência circular sem precisar de WeakSet: passou do limite,
 *  vira texto. */
function sanitizarValor(valor: unknown, profundidade: number): unknown {
  if (valor === null || valor === undefined) return null;

  if (typeof valor === "string") return sanitizarTexto(valor);
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : String(valor);
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "bigint") return valor.toString();
  if (valor instanceof Date) return valor.toISOString();
  if (valor instanceof Error) return `${valor.name}: ${sanitizarTexto(valor.message)}`;

  if (profundidade >= PROFUNDIDADE_MAXIMA) return "[profundo demais]";

  if (Array.isArray(valor)) {
    return valor.slice(0, 50).map((item) => sanitizarValor(item, profundidade + 1));
  }

  if (typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [chave, item] of Object.entries(valor as Record<string, unknown>)) {
      saida[chave] = CHAVES_SENSIVEIS.test(chave) ? REMOVIDO : sanitizarValor(item, profundidade + 1);
    }
    return saida;
  }

  // Função, símbolo e afins não têm representação JSON útil.
  return String(valor);
}

export function sanitizarMetadata(metadata: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
  if (!metadata) return undefined;
  const limpo = sanitizarValor(metadata, 0);
  if (!limpo || typeof limpo !== "object") return undefined;
  return limpo as Prisma.InputJsonValue;
}

/** IP de quem chamou.
 *
 *  Com proxy na frente (Render, Cloudflare, nginx) o `req.socket` mostra
 *  o IP do proxy, não o do usuário — o valor útil está no primeiro item
 *  de `x-forwarded-for`, que é o cliente original; os seguintes são os
 *  saltos intermediários. O cabeçalho é forjável por quem fala direto com
 *  o servidor, então ele serve para investigação, nunca para decisão de
 *  autorização. */
export function ipDaRequisicao(req: Request): string | null {
  const encaminhado = req.headers["x-forwarded-for"];
  const bruto = Array.isArray(encaminhado) ? encaminhado[0] : encaminhado;

  if (bruto) {
    const primeiro = bruto.split(",")[0]?.trim();
    if (primeiro) return primeiro;
  }

  return req.ip ?? req.socket?.remoteAddress ?? null;
}

/** Grava a linha de auditoria. Não lança: falha vira `console.error`. */
export async function registrarAuditoria(dados: DadosAuditoria): Promise<void> {
  try {
    const metadata = sanitizarMetadata(dados.metadata);

    await prisma.auditLog.create({
      data: {
        userId: dados.userId ?? null,
        action: dados.action,
        targetType: dados.targetType ?? null,
        targetId: dados.targetId ?? null,
        provider: dados.provider ?? null,
        model: dados.model ?? null,
        conversationId: dados.conversationId ?? null,
        success: dados.success ?? true,
        ip: dados.ip ?? null,
        ...(metadata !== undefined ? { metadata } : {})
      }
    });
  } catch (erro) {
    // Ver a regra 1 no topo: a operação principal não pode cair porque a
    // auditoria falhou. Só o `action` vai para o console — `metadata`
    // pode carregar conteúdo de conversa, que não deve virar log de texto.
    console.error(`[auditoria] falha ao gravar "${dados.action}":`, erro);
  }
}
