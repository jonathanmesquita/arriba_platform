/* =====================================================================
   Registry de provedores — o único lugar que conhece os adapters

   O chat pede "me dê o provedor ativo" e recebe um AIProvider + a
   configuração de execução. Nem o chat nem o admin importam
   anthropic.ts / openai.ts / gemini.ts / ollama.ts diretamente.

   Provedor novo = criar o adapter, registrar no mapa abaixo e acrescentar
   ao catálogo (catalog.ts). Nada mais muda.

   É também aqui que a API key é DECIFRADA — no último momento possível,
   já a caminho da chamada. Ela nunca é devolvida por rota HTTP, nunca vai
   para log e nunca aparece em mensagem de erro (ver mascararSegredo()).
   ===================================================================== */

// O client do Prisma 7 e gerado para ../generated/prisma (ver schema.prisma),
// entao o tipo da linha vem de la, nao de "@prisma/client".
import type { ProviderConfig } from "../../generated/prisma/client.js";
import type { AIProvider, ProviderKind, ProviderRuntimeConfig } from "./types.js";
import { ProviderError } from "./errors.js";
import { capacidadesDoModelo, PROVEDORES, MAX_TOKENS_PADRAO, TEMPERATURA_PADRAO } from "./catalog.js";
import type { SecretBox } from "../crypto/secretBox.js";

import { anthropicProvider } from "./anthropic.js";
import { openAIProvider } from "./openai.js";
import { geminiProvider } from "./gemini.js";
import { ollamaProvider } from "./ollama.js";

/** OPENROUTER não tem adapter próprio: fala o protocolo da OpenAI, então
 *  reusa aquele adapter com outra baseUrl. Essa é a vantagem de o
 *  contrato ser uma interface e não um if espalhado pelo chat. */
const ADAPTERS: Record<ProviderKind, AIProvider> = {
  ANTHROPIC: anthropicProvider,
  OPENAI: openAIProvider,
  GEMINI: geminiProvider,
  OLLAMA: ollamaProvider,
  OPENROUTER: openAIProvider
};

export function adapterDe(kind: ProviderKind): AIProvider {
  const adapter = ADAPTERS[kind];
  if (!adapter) {
    throw new ProviderError({
      code: "BAD_REQUEST",
      provider: kind,
      providerMessage: `Nenhum adapter registrado para o provedor ${kind}.`
    });
  }
  return adapter;
}

export interface ProvedorResolvido {
  adapter: AIProvider;
  runtime: ProviderRuntimeConfig;
  config: ProviderConfig;
}

/** Monta o que o adapter precisa a partir da linha do banco.
 *
 *  Regras aplicadas aqui, uma vez, para todos os provedores:
 *  - decifra a API key (e exige que exista, quando o provedor pede uma);
 *  - resolve a baseUrl (a da config, ou o padrão do catálogo);
 *  - OMITE `temperature` quando o modelo não aceita — mandar assim mesmo
 *    devolve HTTP 400 nos modelos de raciocínio da Anthropic. É a regra
 *    que mais gera chamado quando fica na mão de cada adapter.
 */
export function resolverProvedor(
  config: ProviderConfig,
  secretBox: SecretBox,
  timeoutMs: number
): ProvedorResolvido {
  const kind = config.provider as ProviderKind;
  const info = PROVEDORES[kind];
  const adapter = adapterDe(kind);

  let apiKey = "";
  if (info?.requerApiKey) {
    if (!config.apiKeyCipher) {
      throw new ProviderError({
        code: "AUTH_INVALID",
        provider: kind,
        providerMessage: `A configuração "${config.label}" não tem API key cadastrada.`
      });
    }
    apiKey = secretBox.decrypt(config.apiKeyCipher);
  }

  const capacidades = capacidadesDoModelo(kind, config.model);

  const runtime: ProviderRuntimeConfig = {
    apiKey,
    model: config.model,
    maxTokens: config.maxTokens ?? MAX_TOKENS_PADRAO,
    systemPrompt: config.systemPrompt ?? null,
    timeoutMs,
    temperature: capacidades.supportsTemperature
      ? (config.temperature ?? TEMPERATURA_PADRAO)
      : null
  };

  // baseUrl viaja fora do contrato mínimo porque só alguns provedores
  // usam; o adapter lê daqui quando precisa.
  (runtime as ProviderRuntimeConfig & { baseUrl?: string }).baseUrl =
    config.baseUrl ?? info?.baseUrlPadrao;

  return { adapter, runtime, config };
}

/** Nunca deixe um segredo chegar a log ou resposta. Usar em qualquer
 *  lugar que ecoe configuração. */
export function mascararSegredo(valor: string | null | undefined): string {
  if (!valor) return "";
  const limpo = String(valor);
  return limpo.length <= 8 ? "••••" : `••••${limpo.slice(-4)}`;
}
