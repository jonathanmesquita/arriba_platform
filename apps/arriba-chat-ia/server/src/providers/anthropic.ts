/* =====================================================================
   Adapter da Anthropic (Claude)

   Traduz o contrato de types.ts para a API de Mensagens da Anthropic e
   traduz os erros dela de volta para ProviderError. Ninguém fora daqui
   importa @anthropic-ai/sdk.

   Três detalhes da API que não são iguais aos outros provedores:

   1. `system` é campo de TOPO, não uma mensagem com role "system". Mandar
      { role: "system" } dentro de `messages` devolve 400.
   2. `max_tokens` é OBRIGATÓRIO. Não existe "responda o que precisar".
   3. `temperature` foi REMOVIDO dos modelos de raciocínio atuais. Ver o
      bloco grande em montarCorpo().
   ===================================================================== */

import Anthropic from "@anthropic-ai/sdk";

import type {
  AIProvider,
  ChatMessage,
  CompletionResult,
  CompletionUsage,
  ProviderRuntimeConfig,
  StreamChunk,
  TestConnectionResult
} from "./types.js";
import { ProviderError, classificarPorStatus, comoProviderError, refinarPorTexto } from "./errors.js";

const PROVEDOR = "ANTHROPIC" as const;

/** A API exige max_tokens; quando a config não diz, usamos o mesmo padrão
 *  do catálogo. Não dá para "deixar o modelo decidir". */
const MAX_TOKENS_PADRAO = 4096;

/** O "Testar conexão" só quer saber se a credencial e o modelo respondem.
 *  Teto minúsculo para a chamada custar quase nada — a resposta sair
 *  truncada aqui é irrelevante. */
const MAX_TOKENS_TESTE = 64;

/** Corpo comum de create() e stream(). `system` e `temperature` só entram
 *  quando têm valor — ver montarCorpo(). */
interface CorpoRequisicao {
  model: string;
  max_tokens: number;
  messages: Anthropic.MessageParam[];
  system?: string;
  temperature?: number;
}

function criarCliente(config: ProviderRuntimeConfig): Anthropic {
  return new Anthropic({
    apiKey: config.apiKey,
    // O SDK da Anthropic conta timeout em MILISSEGUNDOS (o da OpenAI em
    // ms também, o da Python em segundos) — timeoutMs vai direto.
    timeout: config.timeoutMs,
    // 1 tentativa extra: o SDK já repete 429/5xx sozinho. Mais que isso
    // faz o usuário esperar vários timeouts empilhados antes do erro.
    maxRetries: 1
  });
}

function montarCorpo(
  messages: ChatMessage[],
  config: ProviderRuntimeConfig,
  maxTokens: number
): CorpoRequisicao {
  const corpo: CorpoRequisicao = {
    model: config.model,
    max_tokens: maxTokens,
    messages: messages.map((m) => ({ role: m.role, content: m.content }))
  };

  // System prompt vai no campo de topo. Só mandamos se tiver conteúdo:
  // string vazia é um bloco de sistema inútil ocupando tokens.
  const system = config.systemPrompt?.trim();
  if (system) corpo.system = system;

  // ----------------------------------------------------------------
  // ATENÇÃO — o erro que mais derruba integração com Claude:
  // os modelos de raciocínio atuais (claude-opus-5, claude-sonnet-5,
  // claude-opus-4-8, claude-fable-5-1) REMOVERAM temperature/top_p.
  // Mandar o campo, mesmo com o valor padrão, devolve HTTP 400 e o chat
  // inteiro para de responder.
  //
  // Quem decide isso é o registry (resolverProvedor + capacidadesDoModelo):
  // ele passa temperature: null quando o modelo não aceita. Aqui a regra é
  // mecânica — só incluir quando for número de verdade. `?? 0` ou
  // `if (config.temperature)` NÃO servem: o primeiro ressuscita o campo
  // proibido e o segundo descarta temperature 0, que é válida.
  // ----------------------------------------------------------------
  if (typeof config.temperature === "number") {
    corpo.temperature = config.temperature;
  }

  return corpo;
}

/** Junta os blocos de texto da resposta. A Anthropic devolve uma LISTA de
 *  blocos (texto, thinking, tool_use...) — pegar content[0].text ignora
 *  resposta quebrada em vários blocos e quebra quando o primeiro bloco não
 *  é de texto. */
function extrairTexto(blocos: Anthropic.ContentBlock[]): string {
  return blocos
    .filter((bloco): bloco is Anthropic.TextBlock => bloco.type === "text")
    .map((bloco) => bloco.text)
    .join("");
}

/** input_tokens/output_tokens podem vir null no tipo do SDK; o nosso
 *  contrato usa undefined para "não informado". */
function extrairUso(usage: Anthropic.Usage | undefined): CompletionUsage | undefined {
  if (!usage) return undefined;
  return {
    promptTokens: usage.input_tokens ?? undefined,
    completionTokens: usage.output_tokens ?? undefined
  };
}

/** Texto cru do provedor, para auditoria e tela do admin. Nunca contém a
 *  API key: a Anthropic não ecoa a credencial no corpo do erro, e nós não
 *  acrescentamos nada vindo de config.apiKey. */
function textoDoErro(erro: Anthropic.APIError): string {
  const corpo = erro.error as { error?: { message?: string }; message?: string } | undefined;
  return corpo?.error?.message ?? corpo?.message ?? erro.message;
}

/** `retry-after` vem em segundos no header do 429. Serve para a UI dizer
 *  quanto esperar em vez de mandar "tente de novo" genérico. */
function retryAfterDoErro(erro: Anthropic.APIError): number | undefined {
  const bruto = erro.headers?.get("retry-after");
  if (!bruto) return undefined;
  const segundos = Number(bruto);
  return Number.isFinite(segundos) && segundos >= 0 ? segundos : undefined;
}

/**
 * Converte o erro do SDK em ProviderError.
 *
 * A ordem importa: as classes tipadas da Anthropic são específicas e
 * dizem mais que o status sozinho, então vêm primeiro. Só depois caímos
 * no APIError genérico (status + refino por texto) e, no fim, em
 * comoProviderError() como rede de segurança para o que não é do SDK
 * (erro de rede cru, TypeError nosso, etc.).
 */
function traduzirErro(erro: unknown): ProviderError {
  if (erro instanceof ProviderError) return erro;

  // Cancelamento do usuário não é falha: fechou a aba, trocou de pergunta.
  if (erro instanceof Anthropic.APIUserAbortError) {
    return new ProviderError({
      code: "CANCELLED",
      provider: PROVEDOR,
      providerMessage: erro.message,
      cause: erro
    });
  }

  // O AbortSignal do chamador pode abortar o fetch antes de o SDK
  // embrulhar o erro — aí chega um DOMException/AbortError puro.
  if (erro instanceof Error && erro.name === "AbortError") {
    return new ProviderError({
      code: "CANCELLED",
      provider: PROVEDOR,
      providerMessage: erro.message,
      cause: erro
    });
  }

  if (erro instanceof Anthropic.APIConnectionTimeoutError) {
    return new ProviderError({
      code: "TIMEOUT",
      provider: PROVEDOR,
      providerMessage: erro.message,
      cause: erro
    });
  }

  // Sem status HTTP: não chegou a falar com a API (DNS, TLS, proxy, rede
  // caída). Para o admin isso é indisponibilidade, não chave errada.
  if (erro instanceof Anthropic.APIConnectionError) {
    return new ProviderError({
      code: "PROVIDER_UNAVAILABLE",
      provider: PROVEDOR,
      providerMessage: erro.message,
      cause: erro
    });
  }

  if (erro instanceof Anthropic.AuthenticationError || erro instanceof Anthropic.PermissionDeniedError) {
    return new ProviderError({
      code: "AUTH_INVALID",
      provider: PROVEDOR,
      httpStatus: erro.status,
      providerMessage: textoDoErro(erro),
      cause: erro
    });
  }

  if (erro instanceof Anthropic.RateLimitError) {
    // 429 na Anthropic é limite por minuto; crédito acabado também sai
    // como 429 com texto de faturamento. refinarPorTexto() separa os dois.
    const texto = textoDoErro(erro);
    return new ProviderError({
      code: refinarPorTexto("RATE_LIMIT", texto),
      provider: PROVEDOR,
      httpStatus: erro.status,
      retryAfterSeconds: retryAfterDoErro(erro),
      providerMessage: texto,
      cause: erro
    });
  }

  if (erro instanceof Anthropic.NotFoundError) {
    return new ProviderError({
      code: "MODEL_NOT_FOUND",
      provider: PROVEDOR,
      httpStatus: erro.status,
      providerMessage: textoDoErro(erro),
      cause: erro
    });
  }

  if (erro instanceof Anthropic.BadRequestError) {
    // 400 é o mais ambíguo: modelo inexistente, contexto estourado,
    // conteúdo bloqueado ou parâmetro recusado (tipicamente temperature).
    // O texto é a única coisa que distingue.
    const texto = textoDoErro(erro);
    return new ProviderError({
      code: refinarPorTexto("BAD_REQUEST", texto),
      provider: PROVEDOR,
      httpStatus: erro.status,
      providerMessage: texto,
      cause: erro
    });
  }

  if (erro instanceof Anthropic.APIError) {
    const texto = textoDoErro(erro);
    return new ProviderError({
      code: refinarPorTexto(classificarPorStatus(erro.status), texto),
      provider: PROVEDOR,
      httpStatus: erro.status,
      retryAfterSeconds: retryAfterDoErro(erro),
      providerMessage: texto,
      cause: erro
    });
  }

  return comoProviderError(erro, PROVEDOR);
}

export const anthropicProvider: AIProvider = {
  kind: PROVEDOR,

  async sendMessage(
    messages: ChatMessage[],
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): Promise<CompletionResult> {
    const cliente = criarCliente(config);
    const corpo = montarCorpo(messages, config, config.maxTokens ?? MAX_TOKENS_PADRAO);

    try {
      const resposta = await cliente.messages.create(corpo, { signal });
      return {
        text: extrairTexto(resposta.content),
        usage: extrairUso(resposta.usage),
        // O modelo que respondeu, não o que foi pedido: a API devolve o id
        // resolvido (alias podem apontar para outra versão).
        model: resposta.model
      };
    } catch (erro) {
      throw traduzirErro(erro);
    }
  },

  async *streamMessage(
    messages: ChatMessage[],
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, CompletionUsage | undefined, void> {
    const cliente = criarCliente(config);
    const corpo = montarCorpo(messages, config, config.maxTokens ?? MAX_TOKENS_PADRAO);

    const stream = cliente.messages.stream(corpo, { signal });
    let concluido = false;

    try {
      for await (const evento of stream) {
        if (evento.type !== "content_block_delta") continue;

        if (evento.delta.type === "text_delta") {
          yield { type: "text", text: evento.delta.text };
          continue;
        }

        // Resumo de raciocínio: só aparece quando o modelo é de
        // raciocínio E a exibição está ligada. No padrão atual o texto vem
        // vazio, então filtramos para não empurrar pedaço em branco para
        // a UI.
        if (evento.delta.type === "thinking_delta" && evento.delta.thinking) {
          yield { type: "reasoning", text: evento.delta.thinking };
        }
      }

      // finalMessage() é o jeito do SDK de esperar o fim e entregar a
      // mensagem montada — é daqui que sai o usage, que os eventos de
      // delta não trazem completo.
      const mensagemFinal = await stream.finalMessage();
      concluido = true;
      return extrairUso(mensagemFinal.usage);
    } catch (erro) {
      throw traduzirErro(erro);
    } finally {
      // Se quem consome deu break/return no meio (usuário fechou a aba),
      // o generator é finalizado aqui sem o stream ter acabado: abortar
      // fecha a conexão HTTP em vez de deixá-la aberta recebendo tokens
      // que ninguém vai ler — e ainda por cima cobrados.
      if (!concluido && !stream.aborted) stream.abort();
    }
  },

  async testConnection(
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): Promise<TestConnectionResult> {
    const inicio = Date.now();

    try {
      const cliente = criarCliente(config);
      // Mandamos o corpo REAL (inclusive temperature, quando a config
      // manda) e não só a credencial: o objetivo é reprovar aqui, na tela
      // do admin, a combinação modelo+parâmetro que reprovaria depois no
      // meio de uma conversa.
      const corpo = montarCorpo([{ role: "user", content: "ping" }], config, MAX_TOKENS_TESTE);
      const resposta = await cliente.messages.create(corpo, { signal });
      const latencyMs = Date.now() - inicio;

      return {
        ok: true,
        message: `Conexão estabelecida. O modelo "${resposta.model}" respondeu em ${latencyMs} ms.`,
        latencyMs,
        model: resposta.model
      };
    } catch (erro) {
      // Contrato: testConnection NUNCA lança. mensagemAdmin já diz o que
      // fazer em cada código e anexa o texto do provedor.
      const falha = traduzirErro(erro);
      return {
        ok: false,
        message: falha.mensagemAdmin,
        latencyMs: Date.now() - inicio,
        model: config.model
      };
    }
  }
};
