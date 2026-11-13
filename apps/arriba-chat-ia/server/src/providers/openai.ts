/* =====================================================================
   Adapter da OpenAI — e de todo gateway que fala o protocolo dela

   Este arquivo atende DOIS provedores do catálogo: OPENAI e OPENROUTER
   (ver ADAPTERS em registry.ts). Não há adapter de OpenRouter: ele expõe
   o mesmo protocolo, então a única diferença é a `baseUrl` que o registry
   coloca no runtime config. Qualquer gateway interno "OpenAI-compatible"
   entra do mesmo jeito, sem código novo — é exatamente por isso que a
   baseUrl viaja na configuração em vez de ficar chumbada aqui.

   Três decisões que valem explicação:

   1. Usamos `chat.completions`, não a Responses API. A Responses é a
      recomendação atual da OpenAI, mas praticamente nenhum gateway
      compatível a implementa — e o mesmo código aqui precisa servir
      OpenRouter, Ollama-compatible, LiteLLM e afins.
   2. O system prompt é a PRIMEIRA mensagem, com role "system" (na
      Anthropic e na Gemini ele é campo de topo; aqui, não).
   3. Streaming só devolve `usage` se pedirmos
      `stream_options.include_usage` — sem isso o último chunk vem sem
      contagem nenhuma e o registro de consumo fica zerado.
   ===================================================================== */

// As classes de erro vêm por importação nomeada: dentro do namespace
// `OpenAI` os mesmos nomes existem como propriedade estática do client, o
// que serve para `instanceof` mas não como anotação de tipo. O default
// (`OpenAI`) continua servindo para os TIPOS da API (OpenAI.ChatCompletion,
// OpenAI.ChatCompletionMessageParam...), que moram no namespace.
import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError
} from "openai";

import type {
  AIProvider,
  ChatMessage,
  CompletionResult,
  CompletionUsage,
  ProviderKind,
  ProviderRuntimeConfig,
  StreamChunk,
  TestConnectionResult
} from "./types.js";
import { ProviderError, classificarPorStatus, comoProviderError, refinarPorTexto } from "./errors.js";

/** O `kind` declarado no contrato. O provedor REAL de cada chamada sai de
 *  provedorDa(), porque a mesma instância atende OPENAI e OPENROUTER. */
const PROVEDOR_PADRAO = "OPENAI" as const;

/** Teto por requisição. A API aceita omitir, mas aí o custo de uma
 *  resposta longa fica sem limite; mantemos o mesmo padrão do catálogo. */
const MAX_TOKENS_PADRAO = 4096;

/** "Testar conexão" só precisa saber se credencial + modelo respondem.
 *  Cinco tokens: a resposta sair truncada aqui não tem importância. */
const MAX_TOKENS_TESTE = 5;

/** A baseUrl não está no contrato mínimo (só alguns provedores usam), então
 *  o registry a pendura no runtime config. Ler assim, num único ponto,
 *  evita espalhar cast pelo arquivo. */
function baseUrlDa(config: ProviderRuntimeConfig): string | undefined {
  const comBaseUrl = config as ProviderRuntimeConfig & { baseUrl?: string };
  return comBaseUrl.baseUrl || undefined;
}

/** Qual provedor está por trás desta chamada.
 *
 *  Deduzimos pela baseUrl em vez de receber o kind por parâmetro porque o
 *  contrato AIProvider não passa o kind para os métodos — e o registry
 *  entrega a MESMA instância para OPENAI e OPENROUTER. Sem isso, um erro
 *  de chave do OpenRouter apareceria na auditoria como erro da OpenAI, e o
 *  admin iria trocar a credencial errada.
 *
 *  Gateway desconhecido (LiteLLM interno, por exemplo) conta como OPENAI:
 *  é o protocolo que ele fala, e é o rótulo menos enganoso disponível. */
function provedorDa(config: ProviderRuntimeConfig): ProviderKind {
  const base = baseUrlDa(config);
  return base && base.toLowerCase().includes("openrouter.ai") ? "OPENROUTER" : PROVEDOR_PADRAO;
}

function criarCliente(config: ProviderRuntimeConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    // baseURL indefinida = API oficial da OpenAI. Definida = OpenRouter ou
    // gateway compatível. É o único ponto de variação entre os dois.
    baseURL: baseUrlDa(config),
    // Timeout em milissegundos, igual ao SDK da Anthropic.
    timeout: config.timeoutMs,
    // O SDK já repete 429/5xx sozinho; mais de uma tentativa extra faz o
    // usuário esperar vários timeouts empilhados antes de ver o erro.
    maxRetries: 1
  });
}

interface CorpoRequisicao {
  model: string;
  messages: OpenAI.ChatCompletionMessageParam[];
  max_tokens: number;
  temperature?: number;
}

function montarCorpo(
  messages: ChatMessage[],
  config: ProviderRuntimeConfig,
  maxTokens: number
): CorpoRequisicao {
  const mensagens: OpenAI.ChatCompletionMessageParam[] = [];

  // System prompt como primeira mensagem. Só entra se tiver conteúdo —
  // string vazia é uma mensagem inútil ocupando tokens em toda chamada.
  const system = config.systemPrompt?.trim();
  if (system) mensagens.push({ role: "system", content: system });

  for (const m of messages) {
    mensagens.push({ role: m.role, content: m.content });
  }

  const corpo: CorpoRequisicao = {
    model: config.model,
    messages: mensagens,
    // `max_tokens` está marcado como deprecated em favor de
    // `max_completion_tokens`, mas continua aceito pela OpenAI e é o único
    // que TODO gateway compatível entende — o novo campo faz gateway antigo
    // devolver 400. Compatibilidade ganha da deprecação aqui.
    max_tokens: maxTokens
  };

  // Mesma regra dos outros adapters: temperature só vai quando é número.
  // Quem decide é o registry (capacidadesDoModelo) — modelo de raciocínio
  // recusa o campo com HTTP 400. `?? 0` ressuscitaria o campo proibido e
  // `if (config.temperature)` descartaria temperature 0, que é válida.
  if (typeof config.temperature === "number") {
    corpo.temperature = config.temperature;
  }

  return corpo;
}

function extrairUso(usage: OpenAI.CompletionUsage | null | undefined): CompletionUsage | undefined {
  if (!usage) return undefined;
  // Os campos são obrigatórios no tipo da OpenAI, mas gateway compatível
  // costuma mandar o objeto pela metade — daí o ?? undefined.
  return {
    promptTokens: usage.prompt_tokens ?? undefined,
    completionTokens: usage.completion_tokens ?? undefined
  };
}

/** Texto cru do provedor, para auditoria e tela do admin.
 *  Nunca contém a API key: o corpo de erro da OpenAI/OpenRouter não ecoa a
 *  credencial, e não acrescentamos nada vindo de config.apiKey. */
function textoDoErro(erro: APIError): string {
  const corpo = erro.error as { error?: { message?: string }; message?: string } | undefined;
  return corpo?.error?.message ?? corpo?.message ?? erro.message;
}

/** `retry-after` vem em segundos; a OpenAI manda também `retry-after-ms`,
 *  mais preciso quando o limite é por minuto. */
function retryAfterDoErro(erro: APIError): number | undefined {
  const emMs = erro.headers?.get("retry-after-ms");
  if (emMs) {
    const ms = Number(emMs);
    if (Number.isFinite(ms) && ms >= 0) return ms / 1000;
  }

  const bruto = erro.headers?.get("retry-after");
  if (!bruto) return undefined;
  const segundos = Number(bruto);
  return Number.isFinite(segundos) && segundos >= 0 ? segundos : undefined;
}

/**
 * Converte o erro do SDK em ProviderError.
 *
 * Ordem importa duas vezes: as classes específicas dizem mais que o status
 * sozinho, e a hierarquia do SDK é encadeada
 * (APIConnectionTimeoutError → APIConnectionError → APIError), então a
 * subclasse precisa ser testada antes da base, senão nunca é alcançada.
 */
function traduzirErro(erro: unknown, provedor: ProviderKind): ProviderError {
  if (erro instanceof ProviderError) return erro;

  // Cancelamento não é falha: o usuário fechou a aba ou trocou de pergunta.
  if (erro instanceof APIUserAbortError) {
    return new ProviderError({
      code: "CANCELLED",
      provider: provedor,
      providerMessage: erro.message,
      cause: erro
    });
  }

  // O AbortSignal do chamador pode cortar o fetch antes de o SDK embrulhar
  // o erro — aí chega um DOMException/AbortError cru.
  if (erro instanceof Error && erro.name === "AbortError") {
    return new ProviderError({
      code: "CANCELLED",
      provider: provedor,
      providerMessage: erro.message,
      cause: erro
    });
  }

  if (erro instanceof APIConnectionTimeoutError) {
    return new ProviderError({
      code: "TIMEOUT",
      provider: provedor,
      providerMessage: erro.message,
      cause: erro
    });
  }

  // Sem status HTTP: não chegou a falar com a API (DNS, TLS, proxy, gateway
  // interno fora do ar). Para o admin isso é indisponibilidade, não chave
  // errada — e com baseUrl customizada é o erro mais comum de digitação.
  if (erro instanceof APIConnectionError) {
    return new ProviderError({
      code: "PROVIDER_UNAVAILABLE",
      provider: provedor,
      providerMessage: erro.message,
      cause: erro
    });
  }

  if (erro instanceof AuthenticationError || erro instanceof PermissionDeniedError) {
    return new ProviderError({
      code: "AUTH_INVALID",
      provider: provedor,
      httpStatus: erro.status,
      providerMessage: textoDoErro(erro),
      cause: erro
    });
  }

  if (erro instanceof RateLimitError) {
    // 429 aqui é limite por minuto OU crédito acabado (a OpenAI usa 429 com
    // `insufficient_quota`, o OpenRouter com texto de créditos). Só o texto
    // separa os dois, e a diferença importa: um espera, o outro paga.
    const texto = textoDoErro(erro);
    return new ProviderError({
      code: refinarPorTexto("RATE_LIMIT", texto),
      provider: provedor,
      httpStatus: erro.status,
      retryAfterSeconds: retryAfterDoErro(erro),
      providerMessage: texto,
      cause: erro
    });
  }

  if (erro instanceof NotFoundError) {
    // 404 em /chat/completions quase sempre é id de modelo inexistente para
    // a conta. No OpenRouter, também é o id sem o prefixo do provedor
    // ("gpt-4o" em vez de "openai/gpt-4o").
    return new ProviderError({
      code: "MODEL_NOT_FOUND",
      provider: provedor,
      httpStatus: erro.status,
      providerMessage: textoDoErro(erro),
      cause: erro
    });
  }

  if (erro instanceof BadRequestError) {
    // 400 é o mais ambíguo: contexto estourado, modelo inválido, conteúdo
    // bloqueado ou parâmetro recusado (tipicamente temperature ou
    // max_tokens em modelo de raciocínio). O texto é o que distingue.
    const texto = textoDoErro(erro);
    return new ProviderError({
      code: refinarPorTexto("BAD_REQUEST", texto),
      provider: provedor,
      httpStatus: erro.status,
      providerMessage: texto,
      cause: erro
    });
  }

  if (erro instanceof APIError) {
    // Cobre 408, 409, 422, 5xx e qualquer status que o gateway invente.
    const texto = textoDoErro(erro);
    return new ProviderError({
      code: refinarPorTexto(classificarPorStatus(erro.status), texto),
      provider: provedor,
      httpStatus: erro.status,
      retryAfterSeconds: retryAfterDoErro(erro),
      providerMessage: texto,
      cause: erro
    });
  }

  return comoProviderError(erro, provedor);
}

/** Gateway compatível (OpenRouter à frente) às vezes responde HTTP 200 com
 *  um campo `error` no corpo, em vez de status de erro — inclusive no meio
 *  de um stream. Sem esta checagem isso vira "o assistente respondeu vazio",
 *  que é o pior diagnóstico possível para o admin. */
function erroEmbutido(
  payload: { error?: { message?: string; code?: unknown } | null },
  provedor: ProviderKind
): ProviderError | undefined {
  const erro = payload.error;
  if (!erro) return undefined;

  const texto = erro.message ?? JSON.stringify(erro);
  const statusEmbutido = typeof erro.code === "number" ? erro.code : undefined;

  return new ProviderError({
    code: refinarPorTexto(classificarPorStatus(statusEmbutido), texto),
    provider: provedor,
    httpStatus: statusEmbutido,
    providerMessage: texto
  });
}

/** Leitura tolerante do resumo de raciocínio. Não existe no tipo do SDK
 *  porque não é campo da OpenAI: quem manda é o OpenRouter (`reasoning`) e
 *  servidores compatíveis tipo vLLM/Ollama (`reasoning_content`). Quando
 *  vier, a UI mostra separado do texto final; quando não vier, ninguém
 *  perde nada. */
function extrairRaciocinio(delta: OpenAI.ChatCompletionChunk.Choice.Delta): string | undefined {
  const extras = delta as { reasoning?: unknown; reasoning_content?: unknown };
  const bruto = extras.reasoning ?? extras.reasoning_content;
  return typeof bruto === "string" && bruto.length > 0 ? bruto : undefined;
}

export const openAIProvider: AIProvider = {
  // Declaramos OPENAI porque é o protocolo que este adapter fala; o rótulo
  // por chamada (OPENAI x OPENROUTER) sai de provedorDa().
  kind: PROVEDOR_PADRAO,

  async sendMessage(
    messages: ChatMessage[],
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): Promise<CompletionResult> {
    const provedor = provedorDa(config);
    const cliente = criarCliente(config);
    const corpo = montarCorpo(messages, config, config.maxTokens ?? MAX_TOKENS_PADRAO);

    try {
      const resposta = await cliente.chat.completions.create({ ...corpo, stream: false }, { signal });

      const embutido = erroEmbutido(resposta as { error?: { message?: string; code?: unknown } }, provedor);
      if (embutido) throw embutido;

      // noUncheckedIndexedAccess: `choices` pode voltar vazia (gateway com
      // resposta filtrada), então choices[0] é Choice | undefined.
      const escolha = resposta.choices[0];

      if (escolha?.finish_reason === "content_filter") {
        throw new ProviderError({
          code: "CONTENT_FILTERED",
          provider: provedor,
          providerMessage: "A resposta foi interrompida pelo filtro de conteúdo do provedor."
        });
      }

      // `refusal` é a recusa explícita do modelo; vem com content nulo.
      const recusa = escolha?.message.refusal;
      if (recusa) {
        throw new ProviderError({
          code: "CONTENT_FILTERED",
          provider: provedor,
          providerMessage: recusa
        });
      }

      return {
        text: escolha?.message.content ?? "",
        usage: extrairUso(resposta.usage),
        // O modelo que de fato respondeu: no OpenRouter pode diferir do
        // pedido (roteamento para outro provedor do mesmo modelo).
        model: resposta.model
      };
    } catch (erro) {
      throw traduzirErro(erro, provedor);
    }
  },

  async *streamMessage(
    messages: ChatMessage[],
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, CompletionUsage | undefined, void> {
    const provedor = provedorDa(config);
    const cliente = criarCliente(config);
    const corpo = montarCorpo(messages, config, config.maxTokens ?? MAX_TOKENS_PADRAO);

    // A abertura do stream é awaitada aqui, num try próprio: falha de
    // credencial/modelo acontece ANTES do primeiro chunk, e tem que sair
    // como ProviderError igual ao resto.
    let fluxo;
    try {
      fluxo = await cliente.chat.completions.create(
        {
          ...corpo,
          stream: true,
          // Sem include_usage o stream termina sem contagem de tokens — e é
          // justamente no chat (o caminho que usa streaming) que o consumo
          // precisa ser registrado.
          stream_options: { include_usage: true }
        },
        { signal }
      );
    } catch (erro) {
      throw traduzirErro(erro, provedor);
    }

    let uso: CompletionUsage | undefined;
    let emitiuTexto = false;
    let concluido = false;

    try {
      for await (const chunk of fluxo) {
        const embutido = erroEmbutido(chunk as { error?: { message?: string; code?: unknown } }, provedor);
        if (embutido) throw embutido;

        // O chunk final de usage vem com `choices` VAZIA quando
        // include_usage está ligado — por isso usage é lido antes de
        // qualquer coisa depender de choices[0].
        if (chunk.usage) uso = extrairUso(chunk.usage);

        const escolha = chunk.choices[0];
        if (!escolha) continue;

        const raciocinio = extrairRaciocinio(escolha.delta);
        if (raciocinio) yield { type: "reasoning", text: raciocinio };

        // `content` pode vir null (chunk só com role, ou só com tool_calls)
        // e pode vir "" — string vazia não vira pedaço na UI.
        const texto = escolha.delta.content;
        if (texto) {
          emitiuTexto = true;
          yield { type: "text", text: texto };
        }

        // Filtro de conteúdo antes de qualquer texto: vira erro, para o
        // usuário não ficar olhando uma resposta vazia. Se já saiu texto,
        // o que foi dito continua valendo e só encerramos.
        if (escolha.finish_reason === "content_filter" && !emitiuTexto) {
          throw new ProviderError({
            code: "CONTENT_FILTERED",
            provider: provedor,
            providerMessage: "A resposta foi bloqueada pelo filtro de conteúdo do provedor."
          });
        }
      }

      concluido = true;
      return uso;
    } catch (erro) {
      throw traduzirErro(erro, provedor);
    } finally {
      // Quem consome pode dar break/return no meio (usuário fechou a aba).
      // Abortar fecha a conexão HTTP em vez de deixá-la recebendo — e
      // cobrando — tokens que ninguém vai ler.
      if (!concluido) fluxo.controller.abort();
    }
  },

  async testConnection(
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): Promise<TestConnectionResult> {
    const inicio = Date.now();
    const provedor = provedorDa(config);

    try {
      const cliente = criarCliente(config);
      // Mandamos o corpo REAL (inclusive temperature e system prompt, quando
      // configurados): a ideia é reprovar aqui, na tela do admin, a mesma
      // combinação modelo+parâmetro que reprovaria no meio de uma conversa.
      const corpo = montarCorpo([{ role: "user", content: "ping" }], config, MAX_TOKENS_TESTE);
      const resposta = await cliente.chat.completions.create({ ...corpo, stream: false }, { signal });

      const embutido = erroEmbutido(resposta as { error?: { message?: string; code?: unknown } }, provedor);
      if (embutido) throw embutido;

      const latencyMs = Date.now() - inicio;
      const rotuloGateway = provedor === "OPENROUTER" ? " via OpenRouter" : "";

      return {
        ok: true,
        message: `Conexão estabelecida${rotuloGateway}. O modelo "${resposta.model}" respondeu em ${latencyMs} ms.`,
        latencyMs,
        model: resposta.model
      };
    } catch (erro) {
      // Contrato: testConnection NUNCA lança. mensagemAdmin já diz o que
      // fazer em cada código e anexa o texto cru do provedor.
      const falha = traduzirErro(erro, provedor);
      return {
        ok: false,
        message: falha.mensagemAdmin,
        latencyMs: Date.now() - inicio,
        model: config.model
      };
    }
  }
};
