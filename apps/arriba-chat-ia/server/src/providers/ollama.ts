/* =====================================================================
   Adapter do Ollama — modelo rodando LOCAL

   Diferente dos outros três, aqui não há SDK: a API do Ollama é HTTP +
   JSON simples, e instalar uma dependência só para montar dois `fetch`
   seria peso morto. Node 22 já tem `fetch`, `AbortController` e
   `TextDecoder` nativos.

   Três coisas que mudam em relação aos adapters de nuvem:

   1. NÃO HÁ API KEY. É a vantagem inteira do local: o texto do usuário
      não sai da rede da empresa e o custo por token é zero. Por isso
      `config.apiKey` vem vazio do registry (PROVEDORES.OLLAMA tem
      `requerApiKey: false`) e nada neste arquivo lê esse campo — não há
      segredo a mascarar, e a `baseUrl`, que aparece nas mensagens de
      erro, é endereço de serviço, não credencial.
   2. O streaming é NDJSON, não SSE: uma linha JSON por pedaço. O
      cuidado obrigatório é acumular buffer — ver comentário em
      `streamMessage()`.
   3. O erro mais comum não é "chave inválida", é "o serviço nem está no
      ar" ou "o modelo não foi baixado". As duas mensagens deste arquivo
      dizem o comando exato (`ollama serve` / `ollama pull <modelo>`),
      porque quem lê é o admin que precisa resolver.
   ===================================================================== */

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

const PROVEDOR: ProviderKind = "OLLAMA";

/** Mesmo valor do catálogo. Repetido aqui como rede de segurança: o
 *  adapter também roda em teste, onde ninguém passou pelo registry. */
const BASE_URL_PADRAO = "http://127.0.0.1:11434";

/** Teto por requisição, igual ao padrão do catálogo. */
const MAX_TOKENS_PADRAO = 4096;

/** A baseUrl não está no contrato mínimo (só alguns provedores usam),
 *  então o registry a pendura no runtime config. Ler num ponto só evita
 *  espalhar cast pelo arquivo. Barra final removida para não gerar
 *  ".../api/chat" com barra dupla. */
function baseUrlDa(config: ProviderRuntimeConfig): string {
  const comBaseUrl = config as ProviderRuntimeConfig & { baseUrl?: string };
  const bruta = comBaseUrl.baseUrl?.trim() || BASE_URL_PADRAO;
  return bruta.replace(/\/+$/, "");
}

/* ---------------------------------------------------------------------
   Corpo da requisição
   ------------------------------------------------------------------ */

interface MensagemOllama {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpcoesOllama {
  temperature?: number;
  num_predict?: number;
  num_ctx?: number;
  repeat_penalty?: number;
}

/* Janela de contexto do Ollama.

   PEGADINHA que derruba a qualidade sem dar erro nenhum: o padrão do
   Ollama é ~2048 tokens de contexto, independente do que o modelo
   aguenta. Com esse padrão, uma conversa de algumas mensagens já começa
   a perder o começo — inclusive o system prompt com as regras — e o
   modelo "esquece" as instruções sem que nada apareça no log.

   8192 é um piso seguro para modelo pequeno em GPU modesta. Aumentar
   custa VRAM: a memória cresce com a janela, então subir isso num
   servidor apertado troca "esquece as regras" por "não carrega".
   Configurável por ambiente para quem tem GPU sobrando. */
const NUM_CTX_PADRAO = 8192;

/* Penalidade de repetição. Sem ela, modelo pequeno entra em laço
   repetindo a mesma frase; acima de ~1.2 ele começa a evitar palavras
   necessárias (nome de variável, termo técnico que precisa repetir).
   1.1 é o meio-termo recomendado. */
const REPEAT_PENALTY_PADRAO = 1.1;

interface CorpoChat {
  model: string;
  messages: MensagemOllama[];
  stream: boolean;
  options: OpcoesOllama;
}

function montarCorpo(
  messages: ChatMessage[],
  config: ProviderRuntimeConfig,
  stream: boolean,
  maxTokens: number
): CorpoChat {
  const mensagens: MensagemOllama[] = [];

  // No Ollama o system prompt é a primeira mensagem, com role "system"
  // (como na OpenAI; na Anthropic e na Gemini é campo de topo). Só entra
  // quando tem conteúdo — string vazia é token gasto à toa.
  const system = config.systemPrompt?.trim();
  if (system) mensagens.push({ role: "system", content: system });

  for (const m of messages) {
    mensagens.push({ role: m.role, content: m.content });
  }

  const options: OpcoesOllama = {};

  // Mesma regra dos outros adapters: temperature só vai quando é número.
  // Quem decide é o registry (capacidadesDoModelo). `?? 0` ressuscitaria
  // o campo quando ele foi omitido de propósito, e `if (temperature)`
  // descartaria o 0, que é um valor válido e muito usado aqui.
  if (typeof config.temperature === "number") {
    options.temperature = config.temperature;
  }

  // `num_predict` é o max_tokens do Ollama. Sem ele o modelo local pode
  // ficar gerando até o limite de contexto — não custa dinheiro, mas
  // prende a GPU e estoura o timeout da requisição.
  if (Number.isFinite(maxTokens) && maxTokens > 0) {
    options.num_predict = maxTokens;
  }

  // Ver o comentário de NUM_CTX_PADRAO: sem isto o Ollama usa ~2048 e a
  // conversa perde o começo (incluindo as regras) em silêncio.
  const numCtxDoAmbiente = Number(process.env["OLLAMA_NUM_CTX"]);
  options.num_ctx = Number.isFinite(numCtxDoAmbiente) && numCtxDoAmbiente > 0
    ? numCtxDoAmbiente
    : NUM_CTX_PADRAO;

  options.repeat_penalty = REPEAT_PENALTY_PADRAO;

  return { model: config.model, messages: mensagens, stream, options };
}

/* ---------------------------------------------------------------------
   Resposta
   ------------------------------------------------------------------ */

/** Formato de /api/chat. Tudo opcional de propósito: é JSON de terceiro,
 *  e versões diferentes do Ollama mandam conjuntos diferentes de campos. */
interface RespostaChat {
  model?: string;
  message?: { role?: string; content?: string };
  done?: boolean;
  done_reason?: string;
  /** Tokens de ENTRADA (prompt + histórico + system). */
  prompt_eval_count?: number;
  /** Tokens de SAÍDA (o que o modelo gerou). */
  eval_count?: number;
  /** O Ollama devolve erro assim inclusive com HTTP 200, no meio do stream. */
  error?: string;
}

function extrairUso(payload: RespostaChat): CompletionUsage | undefined {
  const promptTokens = typeof payload.prompt_eval_count === "number" ? payload.prompt_eval_count : undefined;
  const completionTokens = typeof payload.eval_count === "number" ? payload.eval_count : undefined;
  if (promptTokens === undefined && completionTokens === undefined) return undefined;
  return { promptTokens, completionTokens };
}

/* ---------------------------------------------------------------------
   Tempo limite e cancelamento
   ------------------------------------------------------------------ */

interface LimiteDeTempo {
  signal: AbortSignal;
  /** true quando quem cortou foi o NOSSO relógio (TIMEOUT), não o usuário. */
  expirou(): boolean;
  /** true quando quem cortou foi o chamador (CANCELLED). */
  canceladoPeloChamador(): boolean;
  /** Derruba a conexão — usado quando o consumidor desiste no meio. */
  abortar(): void;
  encerrar(): void;
}

/** Junta o AbortSignal do chamador com o corte por tempo desta requisição.
 *
 *  Os dois abortam o mesmo controlador, mas significam coisas opostas para
 *  o admin: TIMEOUT ("o modelo local não deu conta no tempo — modelo grande
 *  demais para a GPU?") x CANCELLED ("o usuário fechou a aba"). Como o
 *  `fetch` rejeita igual nos dois casos, a distinção fica nesta flag, e não
 *  no tipo do erro. */
function abrirLimiteDeTempo(timeoutMs: number | undefined, externo: AbortSignal | undefined): LimiteDeTempo {
  const controlador = new AbortController();
  let expirou = false;

  const propagar = () => controlador.abort(externo?.reason);
  if (externo) {
    if (externo.aborted) propagar();
    else externo.addEventListener("abort", propagar, { once: true });
  }

  const temporizador =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? setTimeout(() => {
          expirou = true;
          controlador.abort(new Error(`Tempo limite de ${timeoutMs} ms excedido.`));
        }, timeoutMs)
      : undefined;

  return {
    signal: controlador.signal,
    expirou: () => expirou,
    canceladoPeloChamador: () => externo?.aborted === true,
    abortar: () => controlador.abort(),
    encerrar() {
      if (temporizador !== undefined) clearTimeout(temporizador);
      externo?.removeEventListener("abort", propagar);
    }
  };
}

/* ---------------------------------------------------------------------
   Erros
   ------------------------------------------------------------------ */

/** Códigos de erro de socket que o `fetch` esconde dentro de `cause`.
 *  Separados por significado: "não achei/não me deixaram conectar" é
 *  indisponibilidade; "conectei e o outro lado não respondeu a tempo" é
 *  timeout — e a diferença muda o que o admin vai olhar primeiro. */
const CODIGOS_INDISPONIVEL = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "UND_ERR_SOCKET"
]);

const CODIGOS_TIMEOUT = new Set(["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"]);

function codigoDeRede(erro: unknown): string | undefined {
  const comCausa = erro as { code?: unknown; cause?: { code?: unknown } };
  const bruto = comCausa?.cause?.code ?? comCausa?.code;
  return typeof bruto === "string" ? bruto : undefined;
}

/** Texto de "o serviço não está no ar". Diz o comando, porque é sempre a
 *  mesma correção: ninguém subiu o Ollama, ou ele está preso ao 127.0.0.1
 *  enquanto a API roda em outra máquina/contêiner. */
function mensagemServicoForaDoAr(baseUrl: string, detalhe: string): string {
  return (
    `Não foi possível conectar ao Ollama em ${baseUrl}. ` +
    "Verifique se o serviço está rodando na máquina do endereço acima (`ollama serve`; " +
    "instalado como serviço, `systemctl status ollama`). " +
    "Se a API e o Ollama estão em máquinas ou contêineres diferentes, o Ollama só aceita " +
    "conexão de fora quando sobe com OLLAMA_HOST=0.0.0.0 — e a baseUrl da configuração " +
    "precisa apontar para o host dele, não para 127.0.0.1. " +
    `Detalhe técnico: ${detalhe}`
  );
}

/** Texto de "modelo não baixado". O Ollama não tem catálogo remoto: o
 *  modelo precisa existir no disco da máquina que serve. */
function mensagemModeloAusente(modelo: string, detalhe?: string): string {
  const base =
    `O modelo "${modelo}" não está instalado neste Ollama. ` +
    `Baixe-o na máquina que hospeda o serviço: ollama pull ${modelo}. ` +
    "Confira também se o id está com a tag certa (ex.: qwen2.5-coder:14b); sem tag, o Ollama procura :latest.";
  return detalhe ? `${base} Detalhe técnico: ${detalhe}` : base;
}

interface ContextoErro {
  baseUrl: string;
  modelo: string;
  limite?: LimiteDeTempo;
}

/** Converte qualquer falha desta integração em ProviderError.
 *  Ordem: cancelamento/timeout (que não são culpa do provedor) → falha de
 *  socket (serviço fora do ar) → rede de segurança do errors.ts. */
function traduzirErro(erro: unknown, contexto: ContextoErro): ProviderError {
  if (erro instanceof ProviderError) return erro;

  const detalhe = erro instanceof Error ? erro.message : String(erro);

  if (contexto.limite?.expirou()) {
    return new ProviderError({
      code: "TIMEOUT",
      provider: PROVEDOR,
      providerMessage:
        `O Ollama em ${contexto.baseUrl} não terminou a resposta dentro do tempo limite. ` +
        "Em modelo local isso costuma ser hardware: o modelo não cabe na GPU e caiu para a CPU. " +
        "Use um modelo menor, reduza o histórico (CHAT_HISTORY_LIMIT) ou aumente PROVIDER_TIMEOUT_MS.",
      cause: erro
    });
  }

  if (contexto.limite?.canceladoPeloChamador()) {
    return new ProviderError({ code: "CANCELLED", provider: PROVEDOR, providerMessage: detalhe, cause: erro });
  }

  if (erro instanceof Error && (erro.name === "AbortError" || erro.name === "TimeoutError")) {
    const cancelado = erro.name === "AbortError";
    return new ProviderError({
      code: cancelado ? "CANCELLED" : "TIMEOUT",
      provider: PROVEDOR,
      providerMessage: detalhe,
      cause: erro
    });
  }

  const codigo = codigoDeRede(erro);
  if (codigo && CODIGOS_TIMEOUT.has(codigo)) {
    return new ProviderError({
      code: "TIMEOUT",
      provider: PROVEDOR,
      providerMessage: `O Ollama em ${contexto.baseUrl} aceitou a conexão mas não respondeu (${codigo}).`,
      cause: erro
    });
  }

  if (codigo && CODIGOS_INDISPONIVEL.has(codigo)) {
    return new ProviderError({
      code: "PROVIDER_UNAVAILABLE",
      provider: PROVEDOR,
      providerMessage: mensagemServicoForaDoAr(contexto.baseUrl, `${codigo} — ${detalhe}`),
      cause: erro
    });
  }

  // `fetch failed` sem código legível é o caso do Ollama fora do ar visto
  // por um proxy/undici que não expôs o errno. Tratar como "não conectou"
  // é bem mais útil que UNKNOWN.
  if (erro instanceof TypeError && /fetch failed|network/i.test(detalhe)) {
    return new ProviderError({
      code: "PROVIDER_UNAVAILABLE",
      provider: PROVEDOR,
      providerMessage: mensagemServicoForaDoAr(contexto.baseUrl, detalhe),
      cause: erro
    });
  }

  return comoProviderError(erro, PROVEDOR);
}

/** Erro devolvido com status HTTP. O Ollama manda `{"error": "..."}`. */
async function erroDaResposta(resposta: Response, contexto: ContextoErro): Promise<ProviderError> {
  let texto = "";
  try {
    texto = (await resposta.text()).trim();
  } catch {
    // Corpo ilegível (conexão cortada no meio): o status ainda classifica.
  }

  let mensagem = texto;
  try {
    const json = JSON.parse(texto) as { error?: unknown };
    if (typeof json.error === "string" && json.error) mensagem = json.error;
  } catch {
    // Não era JSON — fica o texto cru (às vezes é HTML de proxy).
  }

  // 404 do /api/chat é quase sempre modelo não baixado ("model 'x' not
  // found, try pulling it first"). Só o 404 de rota errada é outra coisa,
  // e aí a mensagem crua aparece junto.
  if (resposta.status === 404 || /model .*not found|no such model|try pulling it first/i.test(mensagem)) {
    return new ProviderError({
      code: "MODEL_NOT_FOUND",
      provider: PROVEDOR,
      httpStatus: resposta.status,
      providerMessage: mensagemModeloAusente(contexto.modelo, mensagem || undefined),
      cause: undefined
    });
  }

  return new ProviderError({
    code: refinarPorTexto(classificarPorStatus(resposta.status), mensagem),
    provider: PROVEDOR,
    httpStatus: resposta.status,
    providerMessage: mensagem || `HTTP ${resposta.status} em ${contexto.baseUrl}.`
  });
}

/** Erro que vem DENTRO do corpo, com HTTP 200 (acontece no stream). */
function erroEmbutido(payload: RespostaChat, contexto: ContextoErro): ProviderError | undefined {
  if (!payload.error) return undefined;

  if (/model .*not found|no such model|try pulling it first/i.test(payload.error)) {
    return new ProviderError({
      code: "MODEL_NOT_FOUND",
      provider: PROVEDOR,
      providerMessage: mensagemModeloAusente(contexto.modelo, payload.error)
    });
  }

  return new ProviderError({
    code: refinarPorTexto("UNKNOWN", payload.error),
    provider: PROVEDOR,
    providerMessage: payload.error
  });
}

/* ---------------------------------------------------------------------
   Chamadas
   ------------------------------------------------------------------ */

async function postarChat(
  corpo: CorpoChat,
  baseUrl: string,
  limite: LimiteDeTempo,
  aceita: string
): Promise<Response> {
  // Sem cabeçalho de autorização: o Ollama não tem conceito de API key.
  return fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: aceita },
    body: JSON.stringify(corpo),
    signal: limite.signal
  });
}

/** Normaliza o id do modelo para comparar com /api/tags: "llama3.1" e
 *  "llama3.1:latest" são o mesmo modelo para o Ollama. */
function comTag(modelo: string): string {
  const limpo = modelo.trim();
  return limpo.includes(":") ? limpo : `${limpo}:latest`;
}

export const ollamaProvider: AIProvider = {
  kind: PROVEDOR,

  async sendMessage(
    messages: ChatMessage[],
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): Promise<CompletionResult> {
    const baseUrl = baseUrlDa(config);
    const limite = abrirLimiteDeTempo(config.timeoutMs, signal);
    const contexto: ContextoErro = { baseUrl, modelo: config.model, limite };

    try {
      const corpo = montarCorpo(messages, config, false, config.maxTokens ?? MAX_TOKENS_PADRAO);
      const resposta = await postarChat(corpo, baseUrl, limite, "application/json");

      if (!resposta.ok) throw await erroDaResposta(resposta, contexto);

      // Com stream: false a resposta é UM objeto JSON, já com a contagem
      // de tokens que no streaming só chega na última linha.
      const payload = (await resposta.json()) as RespostaChat;

      const embutido = erroEmbutido(payload, contexto);
      if (embutido) throw embutido;

      return {
        text: payload.message?.content ?? "",
        usage: extrairUso(payload),
        // O Ollama ecoa o modelo já resolvido (com a tag), que pode diferir
        // do que foi pedido quando o id veio sem tag.
        model: payload.model ?? config.model
      };
    } catch (erro) {
      throw traduzirErro(erro, contexto);
    } finally {
      limite.encerrar();
    }
  },

  async *streamMessage(
    messages: ChatMessage[],
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, CompletionUsage | undefined, void> {
    const baseUrl = baseUrlDa(config);
    const limite = abrirLimiteDeTempo(config.timeoutMs, signal);
    const contexto: ContextoErro = { baseUrl, modelo: config.model, limite };

    // A abertura vai num try próprio: modelo inexistente e serviço fora do
    // ar falham ANTES do primeiro pedaço, e têm que sair como ProviderError
    // igual ao resto.
    let resposta: Response;
    try {
      const corpo = montarCorpo(messages, config, true, config.maxTokens ?? MAX_TOKENS_PADRAO);
      resposta = await postarChat(corpo, baseUrl, limite, "application/x-ndjson");
      if (!resposta.ok) throw await erroDaResposta(resposta, contexto);
    } catch (erro) {
      limite.encerrar();
      throw traduzirErro(erro, contexto);
    }

    if (!resposta.body) {
      limite.encerrar();
      throw new ProviderError({
        code: "PROVIDER_UNAVAILABLE",
        provider: PROVEDOR,
        providerMessage: `O Ollama em ${baseUrl} respondeu sem corpo para uma requisição de streaming.`
      });
    }

    const leitor = resposta.body.getReader();
    // `stream: true` no decode: um caractere multibyte (acento, emoji) pode
    // vir partido entre dois pacotes da rede; sem isso ele viraria "�".
    const decodificador = new TextDecoder("utf-8");
    let buffer = "";
    let uso: CompletionUsage | undefined;
    let concluido = false;

    /** Interpreta UMA linha NDJSON. Devolve o texto novo, se houver.
     *  Não pode dar `yield` daqui (não é generator), então o chamador
     *  emite — por isso o retorno. */
    const interpretar = (linha: string): string | undefined => {
      const limpa = linha.trim();
      if (!limpa) return undefined;

      let payload: RespostaChat;
      try {
        payload = JSON.parse(limpa) as RespostaChat;
      } catch (erro) {
        // Linha inválida só pode ser bug nosso de fatiamento (ou um proxy
        // que reescreveu o corpo). Falhar alto é melhor que engolir: engolir
        // vira "o assistente respondeu pela metade" sem rastro.
        throw new ProviderError({
          code: "UNKNOWN",
          provider: PROVEDOR,
          providerMessage: `Linha NDJSON inválida vinda do Ollama: ${limpa.slice(0, 200)}`,
          cause: erro
        });
      }

      const embutido = erroEmbutido(payload, contexto);
      if (embutido) throw embutido;

      // A última linha (done: true) é a que traz a contagem de tokens —
      // as anteriores só têm texto.
      if (payload.done) {
        const contagem = extrairUso(payload);
        if (contagem) uso = contagem;
      }

      return payload.message?.content || undefined;
    };

    try {
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;

        buffer += decodificador.decode(value, { stream: true });

        // ESTE é o ponto que quebra a integração quando feito errado: o
        // NDJSON é uma linha JSON por pedaço, mas o TCP não respeita linha.
        // Um chunk da rede pode trazer 3 linhas e meia, e a metade que
        // sobrou só fecha no chunk seguinte. Por isso acumulamos em
        // `buffer` e só consumimos até o último "\n" completo.
        let quebra = buffer.indexOf("\n");
        while (quebra >= 0) {
          const linha = buffer.slice(0, quebra);
          buffer = buffer.slice(quebra + 1);

          const texto = interpretar(linha);
          if (texto) yield { type: "text", text: texto };

          quebra = buffer.indexOf("\n");
        }
      }

      // Sobra final: o Ollama costuma terminar com "\n", mas não é
      // garantia — sem isto o último pedaço (justamente o `done: true`,
      // que carrega os tokens) se perderia.
      buffer += decodificador.decode();
      const restante = interpretar(buffer);
      if (restante) yield { type: "text", text: restante };
      buffer = "";

      concluido = true;
      return uso;
    } catch (erro) {
      throw traduzirErro(erro, contexto);
    } finally {
      // Quem consome pode dar break/return no meio (usuário fechou a aba).
      // Abortar libera a GPU do outro lado em vez de deixar o modelo gerando
      // texto que ninguém vai ler.
      if (!concluido) {
        limite.abortar();
        void leitor.cancel().catch(() => undefined);
      }
      limite.encerrar();
    }
  },

  async testConnection(config: ProviderRuntimeConfig, signal?: AbortSignal): Promise<TestConnectionResult> {
    const inicio = Date.now();
    const baseUrl = baseUrlDa(config);
    const limite = abrirLimiteDeTempo(config.timeoutMs, signal);
    const contexto: ContextoErro = { baseUrl, modelo: config.model, limite };

    try {
      // /api/tags lista o que está BAIXADO na máquina. É a verificação certa
      // aqui porque separa os dois problemas que o admin confunde: "o serviço
      // não está no ar" x "o serviço está no ar mas o modelo não foi puxado".
      // De quebra, não carrega modelo nenhum na VRAM — testar conexão não
      // deve travar a GPU por vários segundos.
      const resposta = await fetch(`${baseUrl}/api/tags`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: limite.signal
      });

      if (!resposta.ok) throw await erroDaResposta(resposta, contexto);

      const payload = (await resposta.json()) as { models?: Array<{ name?: string; model?: string }> };
      const latencyMs = Date.now() - inicio;

      const instalados: string[] = [];
      for (const m of payload.models ?? []) {
        const nome = m.name ?? m.model;
        if (nome) instalados.push(nome);
      }

      if (instalados.length === 0) {
        return {
          ok: false,
          message:
            `O Ollama respondeu em ${baseUrl} (${latencyMs} ms), mas não há nenhum modelo instalado. ` +
            `Rode: ollama pull ${config.model}`,
          latencyMs,
          model: config.model
        };
      }

      const procurado = comTag(config.model);
      const encontrado = instalados.some((nome) => comTag(nome) === procurado);

      if (!encontrado) {
        // Listar o que existe economiza uma ida e volta: quase sempre o
        // modelo está lá com outra tag (":14b" em vez de ":latest").
        const amostra = instalados.slice(0, 10).join(", ");
        const resto = instalados.length > 10 ? ` (e mais ${instalados.length - 10})` : "";
        return {
          ok: false,
          message:
            `O Ollama respondeu em ${baseUrl} (${latencyMs} ms), mas o modelo "${config.model}" não está instalado. ` +
            `Rode: ollama pull ${config.model}. Modelos disponíveis hoje: ${amostra}${resto}.`,
          latencyMs,
          model: config.model
        };
      }

      return {
        ok: true,
        message:
          `Conexão estabelecida com o Ollama em ${baseUrl} em ${latencyMs} ms. ` +
          `O modelo "${config.model}" está instalado (${instalados.length} modelo(s) na máquina). ` +
          "Sem chave e sem custo por token: nada sai da rede. " +
          "A primeira mensagem pode demorar mais que as seguintes, porque o modelo ainda precisa ser carregado na memória da GPU.",
        latencyMs,
        model: config.model
      };
    } catch (erro) {
      // Contrato: testConnection NUNCA lança. mensagemAdmin já diz o que
      // fazer em cada código e anexa o detalhe técnico.
      const falha = traduzirErro(erro, contexto);
      return {
        ok: false,
        message: falha.mensagemAdmin,
        latencyMs: Date.now() - inicio,
        model: config.model
      };
    } finally {
      limite.encerrar();
    }
  }
};
