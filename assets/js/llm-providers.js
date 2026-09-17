/* =====================================================================
   Provedores de LLM do chat da Arriba (fonte única)

   O chat nasceu chamando o arriba-api (`/chat`), que está preso em
   `source: "local-fallback"` desde jul/2026 — ou seja, na prática já
   respondia sem IA. Aqui o padrão passa a ser explicitamente LOCAL, e
   qualquer IA de verdade é opt-in, configurada por quem usa.

   Cinco provedores, dois mundos:

   local    - base de conhecimento DataCob no próprio navegador. ZERO
              rede, zero configuração, funciona para todo mundo. É o
              padrão e o fallback de todos os outros.
   ollama   - LLM rodando na máquina de quem usa (o modelo do artigo do
              Akita). Sem custo por token, sem dado saindo do computador.
   openai / anthropic / gemini
            - API de terceiro, com chave de quem usa (BYOK).

   ------------------------------------------------------------------
   POR QUE A CHAVE FICA NO NAVEGADOR, E O QUE ISSO CUSTA

   Não há backend aqui para guardar segredo. A chave que a pessoa digita
   fica no localStorage DELA, e a chamada sai do navegador dela direto
   para o provedor. Isso significa:

   - a chave é visível no devtools de quem a digitou (é a própria pessoa);
   - qualquer XSS nesta origem consegue lê-la — por isso o SRI que entrou
     em set/2026 importa aqui, não é burocracia;
   - o conteúdo enviado SAI para o provedor. Num chat de suporte isso pode
     incluir dado de chamado, então a UI avisa antes de ativar.

   Chave de provedor pago NUNCA deve ser commitada nem colocada em
   variável de build de site estático: tudo que vai para o bundle é
   público. Só entra digitada pelo usuário, em runtime.
   ===================================================================== */

"use strict";

const STORAGE_KEY = "arribaLLM:config";

/* ---------------------------------------------------------------------
   Catálogo de provedores.

   `modelos` são só sugestões para o datalist — o campo é livre de
   propósito, porque nome de modelo muda toda hora e uma lista fechada
   envelhece e passa a impedir o uso de um modelo novo.
   --------------------------------------------------------------------- */
export const PROVEDORES = {
  local: {
    id: "local",
    nome: "Local (base de conhecimento)",
    resumo: "Responde pela base DataCob embutida na página. Sem rede, sem chave, sem custo.",
    precisaChave: false,
    precisaUrl: false,
    modelos: [],
    privacidade: "Nada sai do navegador."
  },

  ollama: {
    id: "ollama",
    nome: "Ollama (na sua máquina)",
    resumo: "LLM rodando no seu computador. Sem custo por token e sem dado saindo da máquina.",
    precisaChave: false,
    precisaUrl: true,
    urlPadrao: "http://localhost:11434",
    modelos: ["llama3.2", "llama3.1", "qwen2.5", "mistral", "gemma2", "phi4", "deepseek-r1"],
    privacidade: "O texto vai para o seu próprio computador.",
    // Ollama recusa origem cruzada por padrão: é preciso subir com
    //   OLLAMA_ORIGINS=https://arriba.jm.dev.br ollama serve
    // senão o navegador barra no CORS antes da requisição chegar.
    ajudaSetup: "Suba o Ollama liberando esta origem: OLLAMA_ORIGINS=" +
                (typeof location !== "undefined" ? location.origin : "https://arriba.jm.dev.br") +
                " ollama serve"
  },

  openai: {
    id: "openai",
    nome: "ChatGPT (OpenAI)",
    resumo: "API da OpenAI com a sua chave.",
    precisaChave: true,
    precisaUrl: false,
    urlPadrao: "https://api.openai.com",
    modelos: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o4-mini"],
    linkChave: "https://platform.openai.com/api-keys",
    privacidade: "O texto da conversa vai para os servidores da OpenAI."
  },

  anthropic: {
    id: "anthropic",
    nome: "Claude (Anthropic)",
    resumo: "API da Anthropic com a sua chave.",
    precisaChave: true,
    precisaUrl: false,
    urlPadrao: "https://api.anthropic.com",
    modelos: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"],
    linkChave: "https://console.anthropic.com/settings/keys",
    privacidade: "O texto da conversa vai para os servidores da Anthropic.",
    // A API da Anthropic bloqueia chamada direta do navegador a menos que
    // o cabeçalho abaixo seja enviado. O nome dele ("dangerous") é o
    // próprio aviso: expõe a chave ao devtools de quem usa.
    ajudaSetup: "Exige envio do cabeçalho anthropic-dangerous-direct-browser-access."
  },

  gemini: {
    id: "gemini",
    nome: "Gemini (Google)",
    resumo: "API do Google AI Studio com a sua chave.",
    precisaChave: true,
    precisaUrl: false,
    urlPadrao: "https://generativelanguage.googleapis.com",
    modelos: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
    linkChave: "https://aistudio.google.com/apikey",
    privacidade: "O texto da conversa vai para os servidores do Google."
  }
};

export const PROVEDOR_PADRAO = "local";

/* ---------------------------------------------------------------------
   Configuração (localStorage, por navegador)
   --------------------------------------------------------------------- */
function configVazia() {
  return { provedor: PROVEDOR_PADRAO, modelo: "", chave: "", url: "" };
}

export function getConfig() {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return configVazia();
    const salvo = JSON.parse(bruto);
    if (!salvo || typeof salvo !== "object") return configVazia();
    // Provedor desconhecido (config antiga, chave editada à mão) volta
    // para o local em vez de quebrar o chat.
    const provedor = PROVEDORES[salvo.provedor] ? salvo.provedor : PROVEDOR_PADRAO;
    return {
      provedor,
      modelo: String(salvo.modelo || ""),
      chave: String(salvo.chave || ""),
      url: String(salvo.url || "")
    };
  } catch {
    return configVazia();
  }
}

export function salvarConfig(config) {
  const limpo = {
    provedor: PROVEDORES[config.provedor] ? config.provedor : PROVEDOR_PADRAO,
    modelo: String(config.modelo || "").trim(),
    chave: String(config.chave || "").trim(),
    url: String(config.url || "").trim()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limpo));
  } catch {
    // Modo privado/cota: segue valendo só nesta aba.
  }
  return limpo;
}

export function limparConfig() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* nada a fazer */ }
}

/* Config utilizável? (usado pela UI para não deixar ativar pela metade) */
export function configCompleta(config) {
  const p = PROVEDORES[config.provedor];
  if (!p) return false;
  if (p.id === "local") return true;
  if (p.precisaChave && !config.chave) return false;
  if (!config.modelo) return false;
  return true;
}

function baseUrl(config) {
  const p = PROVEDORES[config.provedor];
  // `config.url` so vale para provedor que DECLARA precisar de endereco
  // (hoje, o Ollama). Antes valia para todos, e o campo simplesmente nao
  // aparecia na UI dos outros - mas a config vem do localStorage, que nao
  // e caminho confiavel: uma entrada forjada apontaria o endpoint da
  // OpenAI/Anthropic para outro host, e a CHAVE ia junto no cabecalho.
  // Exige XSS para escrever no localStorage (e quem tem XSS ja le a chave),
  // mas fechar essa rota de exfiltracao custa uma linha.
  const url = p.precisaUrl ? config.url : "";
  return (url || p.urlPadrao || "").replace(/\/+$/, "");
}

/* ---------------------------------------------------------------------
   Montagem da requisição por provedor.

   Cada API tem um formato próprio: mensagens em `messages` com role, ou
   `contents` com parts; chave no header ou na query; system separado do
   histórico ou dentro dele. Fica tudo isolado aqui para o chatbot não
   precisar saber de nenhum deles.
   --------------------------------------------------------------------- */
function montarRequisicao(config, sistema, mensagens) {
  const url = baseUrl(config);
  const modelo = config.modelo;

  switch (config.provedor) {
    case "ollama":
      return {
        url: `${url}/api/chat`,
        opcoes: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelo,
            stream: false,
            messages: [{ role: "system", content: sistema }, ...mensagens]
          })
        },
        extrair: (d) => d?.message?.content
      };

    case "openai":
      return {
        url: `${url}/v1/chat/completions`,
        opcoes: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.chave}`
          },
          body: JSON.stringify({
            model: modelo,
            messages: [{ role: "system", content: sistema }, ...mensagens]
          })
        },
        extrair: (d) => d?.choices?.[0]?.message?.content
      };

    case "anthropic":
      return {
        url: `${url}/v1/messages`,
        opcoes: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.chave,
            "anthropic-version": "2023-06-01",
            // Sem este cabeçalho a API recusa chamada vinda de navegador.
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: modelo,
            max_tokens: 1024,
            // No Claude o system vai FORA da lista de mensagens.
            system: sistema,
            messages: mensagens
          })
        },
        extrair: (d) => d?.content?.[0]?.text
      };

    case "gemini":
      return {
        // A chave do Gemini vai na query string, não em header.
        url: `${url}/v1beta/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(config.chave)}`,
        opcoes: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: sistema }] },
            // O Gemini usa "model" onde os outros usam "assistant".
            contents: mensagens.map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }]
            }))
          })
        },
        extrair: (d) => d?.candidates?.[0]?.content?.parts?.[0]?.text
      };

    default:
      return null;
  }
}

/* ---------------------------------------------------------------------
   Chamada.

   Devolve { ok, texto, erro, provedor }. NUNCA lança: o chat precisa
   conseguir cair na base local sem tratar exceção em três lugares.
   --------------------------------------------------------------------- */
export async function conversar({ config, sistema, mensagens, timeoutMs = 45000 }) {
  const prov = PROVEDORES[config.provedor];
  if (!prov || prov.id === "local") {
    return { ok: false, erro: "provedor local", provedor: "local" };
  }

  const req = montarRequisicao(config, sistema, mensagens);
  if (!req) return { ok: false, erro: "Provedor não suportado.", provedor: config.provedor };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const resp = await fetch(req.url, { ...req.opcoes, signal: ctrl.signal, credentials: "omit" });
    if (!resp.ok) {
      let detalhe = `HTTP ${resp.status}`;
      try {
        const corpo = await resp.json();
        detalhe = corpo?.error?.message || corpo?.error || corpo?.message || detalhe;
      } catch { /* resposta sem JSON: fica o status */ }
      return { ok: false, erro: String(detalhe), provedor: config.provedor };
    }
    const dados = await resp.json();
    const texto = req.extrair(dados);
    if (!texto) return { ok: false, erro: "Resposta vazia do provedor.", provedor: config.provedor };
    return { ok: true, texto: String(texto).trim(), provedor: config.provedor };
  } catch (e) {
    // Erro de CORS e servidor fora do ar chegam aqui do mesmo jeito
    // ("Failed to fetch"), então a mensagem aponta as duas causas.
    const msg = e.name === "AbortError"
      ? `Tempo esgotado (${Math.round(timeoutMs / 1000)}s).`
      : `Não foi possível falar com o provedor (${e.message}). Verifique a URL, a chave e, no Ollama, o OLLAMA_ORIGINS.`;
    return { ok: false, erro: msg, provedor: config.provedor };
  } finally {
    clearTimeout(timer);
  }
}

/* Teste de conexão do painel de configuração: manda um "ping" curto e
   diz se voltou texto. Barato e prova a ponta a ponta (rede + chave +
   nome do modelo), que é onde as três coisas costumam falhar. */
export async function testarConexao(config) {
  if (config.provedor === "local") {
    return { ok: true, texto: "Base local — sempre disponível, sem rede." };
  }
  const r = await conversar({
    config,
    sistema: "Responda com uma única palavra.",
    mensagens: [{ role: "user", content: "Diga OK" }],
    timeoutMs: 20000
  });
  return r.ok
    ? { ok: true, texto: `Conectado. Resposta: "${r.texto.slice(0, 60)}"` }
    : { ok: false, texto: r.erro };
}
