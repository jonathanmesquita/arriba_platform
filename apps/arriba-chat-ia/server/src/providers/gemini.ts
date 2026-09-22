/* =====================================================================
   Adapter do Gemini (Google)

   Traduz o contrato de types.ts para a API do Google Gen AI e traduz os
   erros dela de volta para ProviderError. Ninguém fora daqui importa
   @google/genai.

   SDK: `@google/genai` (o atual, 2.x). O pacote `@google/generative-ai`
   é o LEGADO, parado, e nem está instalado aqui — se alguma receita da
   internet mandar usar `getGenerativeModel()`, é daquele.

   Quatro diferenças em relação aos outros provedores, e todas quebram a
   requisição se forem ignoradas:

   1. A instrução de sistema vai em `config.systemInstruction`. Não existe
      mensagem com role "system" — mandar uma é conteúdo de usuário.
   2. Os papéis são "user" e "model". O nosso "assistant" precisa virar
      "model", senão a API recusa o histórico.
   3. Cada item de `contents` é { role, parts: [{ text }] } — o texto nunca
      vai solto no objeto.
   4. temperature e maxOutputTokens moram DENTRO de `config`, não na raiz
      dos parâmetros.
   ===================================================================== */

import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";
import type {
  Content,
  GenerateContentConfig,
  GenerateContentParameters,
  GenerateContentResponse,
  GenerateContentResponseUsageMetadata,
  Part
} from "@google/genai";

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

const PROVEDOR = "GEMINI" as const;

/** O "Testar conexão" só quer saber se credencial e modelo respondem.
 *  Teto minúsculo para a chamada custar quase nada. */
const MAX_TOKENS_TESTE = 64;

/** finishReason que significa "o provedor se recusou a responder", e não
 *  "acabou o texto". RECITATION entra aqui porque, do ponto de vista de
 *  quem está no chat, é o mesmo caso: veio vazio por decisão de política.
 *  MAX_TOKENS de propósito NÃO entra — ali a resposta existe, só saiu
 *  truncada, e transformar isso em erro apagaria o que o modelo escreveu. */
const MOTIVOS_DE_BLOQUEIO = new Set<FinishReason>([
  FinishReason.SAFETY,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
  FinishReason.RECITATION
]);

/* ------------------------------------------------------------------ */
/* Cancelamento e tempo limite                                         */
/* ------------------------------------------------------------------ */

/** O SDK aceita `httpOptions.timeout`, mas quando esse relógio dispara ele
 *  aborta o fetch SEM motivo — o erro que chega é indistinguível de um
 *  cancelamento do usuário. Como "o provedor demorou" e "o usuário fechou a
 *  aba" pedem mensagens (e decisões de retry) opostas, o relógio é nosso:
 *  abortamos o mesmo signal e guardamos quem puxou o gatilho. */
interface Cancelamento {
  readonly signal: AbortSignal;
  /** true quando quem abortou foi o nosso relógio, não o chamador. */
  expirou(): boolean;
  /** Fecha a conexão quando quem consome o streaming desistiu no meio. */
  abortar(): void;
  /** Libera o timer e o listener. Sempre no finally. */
  encerrar(): void;
}

function montarCancelamento(
  config: ProviderRuntimeConfig,
  sinalDoChamador: AbortSignal | undefined
): Cancelamento {
  const controlador = new AbortController();
  const estado = { expirou: false };

  const repassar = () => controlador.abort(sinalDoChamador?.reason);

  let relogio: NodeJS.Timeout | undefined;
  const limite = config.timeoutMs;
  if (typeof limite === "number" && limite > 0) {
    relogio = setTimeout(() => {
      estado.expirou = true;
      controlador.abort(new Error(`O provedor não respondeu em ${limite} ms.`));
    }, limite);
    // unref para um timeout pendente não segurar o processo na saída.
    relogio.unref();
  }

  if (sinalDoChamador) {
    if (sinalDoChamador.aborted) repassar();
    else sinalDoChamador.addEventListener("abort", repassar, { once: true });
  }

  return {
    signal: controlador.signal,
    expirou: () => estado.expirou,
    abortar: () => controlador.abort(),
    encerrar: () => {
      if (relogio) clearTimeout(relogio);
      sinalDoChamador?.removeEventListener("abort", repassar);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Montagem da requisição                                              */
/* ------------------------------------------------------------------ */

function criarCliente(config: ProviderRuntimeConfig): GoogleGenAI {
  // Sem httpOptions.timeout de propósito: quem conta o tempo é o
  // Cancelamento acima (ver comentário lá).
  return new GoogleGenAI({ apiKey: config.apiKey });
}

/** Histórico neutro -> `contents` da Gemini.
 *
 *  Duas conversões obrigatórias: "assistant" vira "model" e o texto vira
 *  uma lista de parts. Mensagem sem texto é descartada porque a API
 *  devolve 400 para part de texto vazio — e uma bolha vazia no histórico
 *  não vale derrubar a conversa inteira. */
function paraContents(messages: ChatMessage[]): Content[] {
  return messages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
}

function montarParametros(
  messages: ChatMessage[],
  config: ProviderRuntimeConfig,
  cancelamento: Cancelamento,
  maxTokens: number | null | undefined
): GenerateContentParameters {
  const configuracao: GenerateContentConfig = { abortSignal: cancelamento.signal };

  // System prompt só quando tem conteúdo: string vazia é uma instrução
  // inútil ocupando tokens em toda mensagem.
  const sistema = config.systemPrompt?.trim();
  if (sistema) configuracao.systemInstruction = sistema;

  // Só incluir temperature quando for número de verdade. O registry manda
  // null para modelo que não aceita o parâmetro, e `?? 0` ou
  // `if (config.temperature)` estragariam os dois casos: o primeiro
  // ressuscita o campo proibido, o segundo descarta temperature 0, válida.
  if (typeof config.temperature === "number") {
    configuracao.temperature = config.temperature;
  }

  // Diferente da Anthropic, aqui o teto de saída é opcional: sem ele a
  // Gemini usa o padrão do modelo. Só mandamos quando há um valor útil.
  if (typeof maxTokens === "number" && maxTokens > 0) {
    configuracao.maxOutputTokens = maxTokens;
  }

  return {
    model: config.model,
    contents: paraContents(messages),
    config: configuracao
  };
}

/* ------------------------------------------------------------------ */
/* Leitura da resposta                                                 */
/* ------------------------------------------------------------------ */

/** Não usamos o getter `resposta.text`: ele junta só o primeiro candidato,
 *  loga aviso quando há parte não textual e joga fora a marca `thought`,
 *  que é justamente o que separa raciocínio de resposta para a UI. */
function partesDoCandidato(resposta: GenerateContentResponse): Part[] {
  return resposta.candidates?.[0]?.content?.parts ?? [];
}

function extrairTexto(partes: Part[]): string {
  return partes
    .filter((parte) => parte.thought !== true && typeof parte.text === "string")
    .map((parte) => parte.text ?? "")
    .join("");
}

function extrairUso(uso: GenerateContentResponseUsageMetadata | undefined): CompletionUsage | undefined {
  if (!uso) return undefined;
  return {
    promptTokens: uso.promptTokenCount ?? undefined,
    completionTokens: uso.candidatesTokenCount ?? undefined
  };
}

/** A Gemini recusa conteúdo com HTTP 200: o bloqueio vem no corpo, em
 *  `promptFeedback.blockReason` (entrada barrada) ou em
 *  `candidates[0].finishReason` (saída barrada). Sem esta checagem o
 *  usuário receberia uma resposta em branco, sem explicação. */
function conferirBloqueio(resposta: GenerateContentResponse): void {
  const bloqueioDeEntrada = resposta.promptFeedback?.blockReason;
  if (bloqueioDeEntrada) {
    const detalhe = resposta.promptFeedback?.blockReasonMessage;
    throw new ProviderError({
      code: "CONTENT_FILTERED",
      provider: PROVEDOR,
      providerMessage: `A pergunta foi bloqueada (${bloqueioDeEntrada})${detalhe ? `: ${detalhe}` : "."}`
    });
  }

  const candidato = resposta.candidates?.[0];
  const motivo = candidato?.finishReason;
  if (motivo && MOTIVOS_DE_BLOQUEIO.has(motivo)) {
    const detalhe = candidato?.finishMessage;
    throw new ProviderError({
      code: "CONTENT_FILTERED",
      provider: PROVEDOR,
      providerMessage: `A resposta foi interrompida pelo provedor (${motivo})${detalhe ? `: ${detalhe}` : "."}`
    });
  }
}

/* ------------------------------------------------------------------ */
/* Tradução de erros                                                   */
/* ------------------------------------------------------------------ */

/** Uma volta de desembrulho: `{"error":{"message":"...","status":"..."}}`
 *  vira a mensagem. Devolve undefined quando não é esse formato. */
function interpretarCorpoJson(texto: string): string | undefined {
  if (!texto.startsWith("{")) return undefined;
  try {
    const corpo = JSON.parse(texto) as { error?: { message?: string; status?: string } };
    const mensagem = corpo.error?.message?.trim();
    if (!mensagem) return undefined;
    // O `status` só entra quando a mensagem já é o texto final — se ela
    // ainda é JSON, o próximo desembrulho traz o status de verdade
    // (INVALID_ARGUMENT) em vez do texto do HTTP ("Bad Request").
    const status = corpo.error?.status;
    return status && !mensagem.startsWith("{") ? `${mensagem} (${status})` : mensagem;
  } catch {
    return undefined;
  }
}

/** A mensagem do erro do SDK é o corpo JSON inteiro, serializado
 *  (`{"error":{"code":429,"message":"...","status":"RESOURCE_EXHAUSTED"}}`).
 *  No streaming ele vem ANINHADO: a resposta de erro do stream não tem
 *  content-type JSON, então o SDK embrulha o JSON da API dentro de outro
 *  JSON. Sem desembrulhar, o admin lê 20 linhas de chaves para achar
 *  "API key not valid". Hoje bastam duas voltas; o teto de três existe só
 *  para o laço não depender do formato de terceiro para terminar. */
function textoDoErro(mensagem: string): string {
  let atual = mensagem.trim();
  for (let volta = 0; volta < 3; volta += 1) {
    const desembrulhado = interpretarCorpoJson(atual);
    if (!desembrulhado) break;
    atual = desembrulhado;
  }
  return atual;
}

/** Erro que não é ApiError às vezes traz o status embutido no texto
 *  ("got status: 403 Forbidden", '"code": 429'). Pescar o número é o que
 *  permite classificar com a mesma régua dos outros provedores em vez de
 *  cair tudo em UNKNOWN. */
function statusNoTexto(texto: string): number | undefined {
  const achado = /(?:status|code)\D{0,4}([45]\d{2})\b/i.exec(texto);
  if (!achado?.[1]) return undefined;
  const status = Number(achado[1]);
  return Number.isFinite(status) ? status : undefined;
}

/** Rede de segurança: a chave da Gemini viaja no header `x-goog-api-key` e
 *  o corpo do erro não a ecoa, mas base URL de proxy/gateway pode devolver
 *  a URL com `?key=`. Se o segredo aparecer no texto, ele é mascarado aqui
 *  — este texto vai para auditoria e para a tela do admin.
 *  (Mascaramento local em vez de importar mascararSegredo() do registry:
 *  registry.ts importa este arquivo, e o caminho inverso fecharia um ciclo.) */
function semCredencial(texto: string, apiKey: string): string {
  if (!apiKey || apiKey.length < 8 || !texto.includes(apiKey)) return texto;
  return texto.split(apiKey).join(`••••${apiKey.slice(-4)}`);
}

/**
 * Converte o erro do SDK em ProviderError.
 *
 * Ordem: cancelamento primeiro (não é falha), depois o ApiError tipado
 * (tem `status`), depois o Error solto com status no texto e, no fim,
 * comoProviderError() para o que não veio do SDK (DNS, TLS, bug nosso).
 */
function traduzirErro(erro: unknown, config: ProviderRuntimeConfig, cancelamento?: Cancelamento): ProviderError {
  if (erro instanceof ProviderError) return erro;

  const limpar = (texto: string) => semCredencial(texto, config.apiKey);

  // Abortamos o mesmo signal nos dois casos, então quem sabe diferenciar é
  // o nosso Cancelamento — não o nome/mensagem do erro.
  const abortado =
    erro instanceof Error && (erro.name === "AbortError" || erro.name === "TimeoutError");
  if (abortado || cancelamento?.expirou()) {
    if (cancelamento?.expirou()) {
      return new ProviderError({
        code: "TIMEOUT",
        provider: PROVEDOR,
        providerMessage: limpar(erro instanceof Error ? erro.message : String(erro)),
        cause: erro
      });
    }
    return new ProviderError({
      code: "CANCELLED",
      provider: PROVEDOR,
      providerMessage: erro instanceof Error ? erro.message : String(erro),
      cause: erro
    });
  }

  if (erro instanceof ApiError) {
    const texto = limpar(textoDoErro(erro.message));
    return new ProviderError({
      // 400 na Gemini é ambíguo do mesmo jeito que nos outros: modelo
      // inexistente, contexto estourado ou parâmetro recusado. E o 429 tanto
      // é limite por minuto quanto cota do projeto esgotada. Só o texto separa.
      code: refinarPorTexto(classificarPorStatus(erro.status), texto),
      provider: PROVEDOR,
      httpStatus: erro.status,
      providerMessage: texto,
      cause: erro
    });
  }

  if (erro instanceof Error) {
    // O status sai do texto CRU (é lá que está `"code": 400`); o que vai
    // para a tela é a versão desembrulhada.
    const cru = limpar(erro.message);
    const status = statusNoTexto(cru);
    const texto = textoDoErro(cru);
    if (status !== undefined) {
      return new ProviderError({
        code: refinarPorTexto(classificarPorStatus(status), texto),
        provider: PROVEDOR,
        httpStatus: status,
        providerMessage: texto,
        cause: erro
      });
    }
    // Sem status: ou é falha de rede (fetch failed), ou algo que só o texto
    // classifica. refinarPorTexto sobre UNKNOWN cobre o segundo caso.
    const codigo = refinarPorTexto("UNKNOWN", texto);
    return new ProviderError({
      code: codigo === "UNKNOWN" && /fetch failed|network|econnrefused|enotfound|socket/i.test(texto)
        ? "PROVIDER_UNAVAILABLE"
        : codigo,
      provider: PROVEDOR,
      providerMessage: texto,
      cause: erro
    });
  }

  return comoProviderError(erro, PROVEDOR);
}

/* ------------------------------------------------------------------ */
/* Adapter                                                             */
/* ------------------------------------------------------------------ */

export const geminiProvider: AIProvider = {
  kind: PROVEDOR,

  async sendMessage(
    messages: ChatMessage[],
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): Promise<CompletionResult> {
    const cancelamento = montarCancelamento(config, signal);

    try {
      const cliente = criarCliente(config);
      const resposta = await cliente.models.generateContent(
        montarParametros(messages, config, cancelamento, config.maxTokens)
      );

      conferirBloqueio(resposta);

      return {
        text: extrairTexto(partesDoCandidato(resposta)),
        usage: extrairUso(resposta.usageMetadata),
        // modelVersion é o modelo que de fato respondeu; o pedido pode ser
        // um alias ("gemini-2.0-flash") que resolve para uma versão datada.
        model: resposta.modelVersion ?? config.model
      };
    } catch (erro) {
      throw traduzirErro(erro, config, cancelamento);
    } finally {
      cancelamento.encerrar();
    }
  },

  async *streamMessage(
    messages: ChatMessage[],
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, CompletionUsage | undefined, void> {
    const cancelamento = montarCancelamento(config, signal);
    let concluido = false;
    let uso: CompletionUsage | undefined;

    try {
      const cliente = criarCliente(config);
      // Atenção ao `await`: generateContentStream devolve uma PROMISE de
      // async iterable, não o iterable direto. Sem o await, o for-await
      // percorreria a promise e não os pedaços.
      const fluxo = await cliente.models.generateContentStream(
        montarParametros(messages, config, cancelamento, config.maxTokens)
      );

      for await (const pedaco of fluxo) {
        // O bloqueio pode aparecer em qualquer pedaço (o de entrada vem no
        // primeiro; o de saída, no último). Conferir sempre.
        conferirBloqueio(pedaco);

        // usageMetadata é cumulativo e costuma vir só no fim — o último
        // pedaço que trouxer o campo é o total da requisição.
        const usoDoPedaco = extrairUso(pedaco.usageMetadata);
        if (usoDoPedaco) uso = usoDoPedaco;

        for (const parte of partesDoCandidato(pedaco)) {
          const texto = parte.text;
          if (!texto) continue;
          yield { type: parte.thought === true ? "reasoning" : "text", text: texto };
        }
      }

      concluido = true;
      return uso;
    } catch (erro) {
      throw traduzirErro(erro, config, cancelamento);
    } finally {
      // Se quem consome deu break/return no meio (o usuário fechou a aba),
      // o generator é finalizado aqui com o stream em andamento: abortar
      // fecha a conexão HTTP em vez de continuar recebendo — e pagando —
      // tokens que ninguém vai ler.
      if (!concluido) cancelamento.abortar();
      cancelamento.encerrar();
    }
  },

  async testConnection(
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): Promise<TestConnectionResult> {
    const inicio = Date.now();
    const cancelamento = montarCancelamento(config, signal);

    try {
      const cliente = criarCliente(config);
      // Mandamos a requisição REAL (com system prompt e temperature da
      // config), e não só a credencial: o objetivo é reprovar aqui, na tela
      // do admin, a combinação modelo+parâmetro que reprovaria depois no
      // meio de uma conversa.
      const resposta = await cliente.models.generateContent(
        montarParametros([{ role: "user", content: "ping" }], config, cancelamento, MAX_TOKENS_TESTE)
      );
      const latencyMs = Date.now() - inicio;
      const modelo = resposta.modelVersion ?? config.model;

      // Texto vazio aqui NÃO é falha: com teto de 64 tokens um modelo que
      // pensa antes de responder pode gastar tudo no raciocínio. O que o
      // teste conclui é que a credencial e o modelo respondem.
      return {
        ok: true,
        message: `Conexão estabelecida. O modelo "${modelo}" respondeu em ${latencyMs} ms.`,
        latencyMs,
        model: modelo
      };
    } catch (erro) {
      // Contrato: testConnection NUNCA lança. mensagemAdmin já diz o que
      // fazer em cada código e anexa o texto do provedor.
      const falha = traduzirErro(erro, config, cancelamento);
      return {
        ok: false,
        message: falha.mensagemAdmin,
        latencyMs: Date.now() - inicio,
        model: config.model
      };
    } finally {
      cancelamento.encerrar();
    }
  }
};
