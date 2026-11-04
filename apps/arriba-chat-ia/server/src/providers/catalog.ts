/* =====================================================================
   Catálogo de provedores e modelos

   Duas coisas moram aqui, e é importante não confundir:

   1. CAPACIDADES — o que a API aceita. Isso NÃO é sugestão, é regra: se
      `supportsTemperature` é false e o adapter mandar temperature mesmo
      assim, a requisição volta HTTP 400 e o chat quebra. Os modelos de
      raciocínio atuais da Anthropic (Opus 5, Sonnet 5, Opus 4.8/4.7,
      Fable 5.1) removeram temperature/top_p; Haiku 4.5 ainda aceita.

   2. SUGESTÕES de modelo — apenas para preencher o <select> do admin.
      O campo Modelo é TEXTO LIVRE de propósito: catálogo de modelo de
      terceiro envelhece rápido, e ninguém deveria precisar esperar um
      deploy nosso para usar um modelo que a conta dele já tem. Modelo
      fora da lista funciona; só não ganha dica de capacidade (o default
      conservador de `capacidadesDoModelo()` assume que aceita
      temperature, que é o comportamento da maioria).

   Temperatura: o padrão do sistema é BAIXO (0.2). É a recomendação do
   artigo do Akita para uso técnico — temperatura alta gera "criatividade"
   onde se quer resposta previsível. Quem quiser texto mais solto sobe na
   tela do admin.
   ===================================================================== */

import type { ProviderKind } from "./types.js";

export interface ModeloSugerido {
  id: string;
  label: string;
  /** false = mandar temperature devolve 400. Ver comentário acima. */
  supportsTemperature: boolean;
  nota?: string;
}

export interface ProvedorInfo {
  kind: ProviderKind;
  label: string;
  /** Precisa de API key? Ollama não precisa: roda local. */
  requerApiKey: boolean;
  /** Precisa de endpoint próprio? */
  requerBaseUrl: boolean;
  baseUrlPadrao?: string;
  /** Onde o admin pega a credencial — aparece na tela de configuração. */
  ondeObterChave?: string;
  descricao: string;
  modelos: ModeloSugerido[];
}

export const TEMPERATURA_PADRAO = 0.2;
export const MAX_TOKENS_PADRAO = 4096;

export const PROVEDORES: Record<ProviderKind, ProvedorInfo> = {
  ANTHROPIC: {
    kind: "ANTHROPIC",
    label: "Claude (Anthropic)",
    requerApiKey: true,
    requerBaseUrl: false,
    ondeObterChave: "console.anthropic.com → API Keys",
    descricao: "Modelos Claude via API oficial da Anthropic.",
    modelos: [
      { id: "claude-opus-5", label: "Claude Opus 5", supportsTemperature: false, nota: "Raciocínio adaptativo ligado por padrão; não aceita temperature." },
      { id: "claude-sonnet-5", label: "Claude Sonnet 5", supportsTemperature: false, nota: "Mais barato que o Opus; não aceita temperature." },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", supportsTemperature: true, nota: "O mais rápido e barato; aceita temperature." },
      { id: "claude-opus-4-8", label: "Claude Opus 4.8", supportsTemperature: false },
      { id: "claude-fable-5-1", label: "Claude Fable 5.1", supportsTemperature: false, nota: "O mais capaz e o mais caro." }
    ]
  },

  OPENAI: {
    kind: "OPENAI",
    label: "ChatGPT (OpenAI)",
    requerApiKey: true,
    requerBaseUrl: false,
    ondeObterChave: "platform.openai.com → API keys",
    descricao: "Modelos GPT via API oficial da OpenAI.",
    modelos: [
      { id: "gpt-4o", label: "GPT-4o", supportsTemperature: true },
      { id: "gpt-4o-mini", label: "GPT-4o mini", supportsTemperature: true, nota: "Barato, bom para triagem e respostas curtas." },
      { id: "gpt-4.1", label: "GPT-4.1", supportsTemperature: true },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini", supportsTemperature: true }
    ]
  },

  GEMINI: {
    kind: "GEMINI",
    label: "Gemini (Google)",
    requerApiKey: true,
    requerBaseUrl: false,
    ondeObterChave: "aistudio.google.com → Get API key",
    descricao: "Modelos Gemini via Google AI Studio.",
    modelos: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", supportsTemperature: true },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", supportsTemperature: true },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", supportsTemperature: true }
    ]
  },

  OLLAMA: {
    kind: "OLLAMA",
    label: "Ollama (modelo local)",
    requerApiKey: false,
    requerBaseUrl: true,
    baseUrlPadrao: "http://127.0.0.1:11434",
    descricao:
      "Modelo rodando na máquina/servidor da empresa. Nada sai da rede e não há custo por token — " +
      "em troca, precisa de GPU (na prática, 24 GB de VRAM para os modelos maiores).",
    modelos: [
      { id: "qwen2.5-coder:14b", label: "Qwen 2.5 Coder 14B", supportsTemperature: true, nota: "Especializado em código." },
      { id: "qwen2.5-coder:32b", label: "Qwen 2.5 Coder 32B", supportsTemperature: true, nota: "O maior da série; pede GPU de 24 GB." },
      { id: "llama3.1:8b", label: "Llama 3.1 8B", supportsTemperature: true, nota: "Cabe em GPU de 16 GB." },
      { id: "mistral", label: "Mistral 7B", supportsTemperature: true }
    ]
  },

  OPENROUTER: {
    kind: "OPENROUTER",
    label: "OpenRouter (gateway)",
    requerApiKey: true,
    requerBaseUrl: true,
    baseUrlPadrao: "https://openrouter.ai/api/v1",
    ondeObterChave: "openrouter.ai → Keys",
    descricao:
      "Uma chave só para modelos de vários provedores, com crédito centralizado. " +
      "Fala o protocolo da OpenAI, então usa o mesmo adapter com outra baseUrl. " +
      "O id do modelo vem com o prefixo do provedor.",
    modelos: [
      { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5 (via OpenRouter)", supportsTemperature: false },
      { id: "openai/gpt-4o", label: "GPT-4o (via OpenRouter)", supportsTemperature: true },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash (via OpenRouter)", supportsTemperature: true }
    ]
  }
};

export const PROVIDER_KINDS: ProviderKind[] = ["ANTHROPIC", "OPENAI", "GEMINI", "OLLAMA", "OPENROUTER"];

/** Capacidades de um modelo. Modelo fora do catálogo cai no default
 *  conservador: assume que aceita temperature (maioria) e deixa a
 *  primeira chamada revelar o contrário — que aí volta como BAD_REQUEST
 *  com a explicação pronta (ver errors.ts). */
export function capacidadesDoModelo(kind: ProviderKind, modelId: string): ModeloSugerido {
  const doCatalogo = PROVEDORES[kind]?.modelos.find((m) => m.id === modelId);
  if (doCatalogo) return doCatalogo;

  // Heurística só para a família Claude, onde errar isso quebra a chamada:
  // qualquer modelo de raciocínio atual recusa temperature; Haiku aceita.
  if (kind === "ANTHROPIC" || (kind === "OPENROUTER" && modelId.startsWith("anthropic/"))) {
    const ehHaikuOuAntigo = /haiku|claude-3|claude-2/.test(modelId);
    return { id: modelId, label: modelId, supportsTemperature: ehHaikuOuAntigo };
  }

  return { id: modelId, label: modelId, supportsTemperature: true };
}

/** System prompt padrão. Segue a forma que o artigo do Akita defende:
 *  persona + REGRAS NUMERADAS, no começo da sessão. O admin pode trocar,
 *  mas o campo nunca deveria ficar vazio — sem regras, o modelo responde
 *  como um assistente genérico. */
export const SYSTEM_PROMPT_PADRAO = `Você é o Arriba Chat IA, assistente interno da empresa.

REGRAS:
1. Responda em português do Brasil, de forma direta e objetiva.
2. Se não souber, diga que não sabe. Nunca invente número, norma, nome de rotina ou comportamento de sistema.
3. Quando a pergunta for técnica, mostre o passo a passo e o comando/consulta exata, não só a descrição.
4. Não peça nem repita dados pessoais de clientes (CPF, nome completo, telefone, endereço). Se o usuário colar esse tipo de dado, responda sem reproduzi-lo.
5. Quando a resposta depender de uma informação que você não tem, diga qual informação falta em vez de supor.`;
