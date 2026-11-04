/* =====================================================================
   Contrato comum dos provedores de IA

   Este arquivo é o combinado entre o chat e os adapters. A lógica do chat
   (src/chat/) importa SÓ daqui — nunca de anthropic.ts / openai.ts /
   gemini.ts. Trocar o provedor ativo, então, não toca em nenhuma linha do
   chat: troca a implementação que o registry devolve.

   Duas operações porque são dois casos de uso diferentes, não por
   duplicação:

     sendMessage()   — resposta inteira de uma vez. É o que o "Testar
                       conexão" e futuras rotinas em lote usam.
     streamMessage() — async generator de pedaços de texto. É o que a tela
                       do chat consome, para o texto aparecer aos poucos.

   Todo adapter converte os erros do SDK dele para ProviderError
   (ver errors.ts). O chat nunca vê exceção de SDK de terceiro.
   ===================================================================== */

/** Precisa espelhar exatamente o enum ProviderKind do schema.prisma —
 *  divergir aqui quebra o Record<ProviderKind, ...> do catálogo e do
 *  registry, que é como OLLAMA e OPENROUTER entraram depois dos três
 *  primeiros. */
export type ProviderKind = "ANTHROPIC" | "OPENAI" | "GEMINI" | "OLLAMA" | "OPENROUTER";

/** Uma mensagem da conversa, no formato neutro. O papel `system` não entra
 *  aqui: cada API trata instrução de sistema de um jeito (campo separado na
 *  Anthropic e na Gemini, mensagem com role "system" na OpenAI), então ela
 *  viaja em `ProviderRuntimeConfig.systemPrompt` e cada adapter acomoda. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** O que o adapter precisa para falar com o provedor. Vem da
 *  ProviderConfig do banco, já com a API key DECIFRADA — decifrar é
 *  responsabilidade de quem monta isto (src/providers/registry.ts), e o
 *  valor não deve ser logado nem devolvido em resposta HTTP. */
export interface ProviderRuntimeConfig {
  apiKey: string;
  model: string;
  temperature?: number | null;
  maxTokens?: number | null;
  systemPrompt?: string | null;
  /** Corte de segurança por requisição. O adapter deve abortar a chamada. */
  timeoutMs?: number;
}

/** Pedaço de resposta durante o streaming. `reasoning` só aparece quando o
 *  modelo expõe resumo de raciocínio e a config pede — a UI mostra em
 *  separado do texto final. */
export type StreamChunk =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string };

export interface CompletionUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface CompletionResult {
  text: string;
  usage?: CompletionUsage;
  /** Modelo que de fato respondeu (pode diferir do pedido em fallback). */
  model: string;
}

export interface TestConnectionResult {
  ok: boolean;
  /** Mensagem pronta para a tela do admin, em português. */
  message: string;
  latencyMs: number;
  model?: string;
}

export interface AIProvider {
  readonly kind: ProviderKind;

  /** Resposta completa, sem streaming. */
  sendMessage(
    messages: ChatMessage[],
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): Promise<CompletionResult>;

  /** Resposta em pedaços. Quem consome deve tratar cancelamento pelo
   *  AbortSignal (o usuário fechou a aba no meio da resposta). */
  streamMessage(
    messages: ChatMessage[],
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, CompletionUsage | undefined, void>;

  /** Chamada mínima e barata só para dizer se a credencial funciona.
   *  Nunca lança: devolve ok=false com a mensagem traduzida. */
  testConnection(
    config: ProviderRuntimeConfig,
    signal?: AbortSignal
  ): Promise<TestConnectionResult>;
}
