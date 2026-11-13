/* =====================================================================
   Acesso à Arriba API (fonte única)

   O site é estático; a Arriba API (repositório arriba-api, no Render) é
   o único servidor que ele chama. Duas telas usam este módulo:
   - tools/dados/api-privada/      validar e consultar pela API
   - pages/admin/configurar-chat   configuração do chat, só administrador

   SEGREDO NENHUM AQUI. O login por usuário e senha devolve um cookie
   HttpOnly que nenhum JavaScript lê; o navegador o manda sozinho com
   `credentials: "include"`. Funciona porque arriba.jm.dev.br e
   api.arriba.jm.dev.br são o mesmo *site* (`dev.br` é sufixo público) e
   a API só libera CORS para esta origem.
   ===================================================================== */

export const API_PADRAO = "https://api.arriba.jm.dev.br";
const TEMPO_LIMITE_MS = 70_000;     // o plano grátis do Render leva até ~50 s para acordar
const AVISO_DEMORA_MS = 3_000;

/* `?api=http://localhost:3000` aponta a tela para a API rodando na sua
   máquina. SÓ localhost: aceitar qualquer endereço deixaria alguém mandar
   um link com ?api=site-dele e receber a senha digitada aqui. */
export function enderecoDaApi(busca = location.search) {
  const pedido = new URLSearchParams(busca).get("api");
  if (pedido && /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(pedido)) return pedido;
  return API_PADRAO;
}

export const API = enderecoDaApi();

/* Uma chamada à API. Nunca lança: devolve { status, ms, dados, falhaRede }.
   `aoDemorar` é chamado se a resposta passar de 3 s — a tela avisa que a
   API pode estar acordando, em vez de parecer travada. */
export async function chamarApi(metodo, caminho, { corpo, chave, aoDemorar, tempoLimiteMs = TEMPO_LIMITE_MS } = {}) {
  const cabecalhos = {};
  if (corpo !== undefined) cabecalhos["content-type"] = "application/json";
  if (chave) cabecalhos["x-api-key"] = chave;

  const inicio = performance.now();
  const avisoDemora = aoDemorar ? setTimeout(aoDemorar, AVISO_DEMORA_MS) : null;

  try {
    const resposta = await fetch(API + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      credentials: "include",
      signal: AbortSignal.timeout(tempoLimiteMs)
    });
    let dados = null;
    try { dados = await resposta.json(); } catch { dados = null; }
    return { status: resposta.status, ms: Math.round(performance.now() - inicio), dados };
  } catch (erro) {
    const tempo = erro?.name === "TimeoutError";
    return {
      status: 0,
      ms: Math.round(performance.now() - inicio),
      dados: null,
      falhaRede: tempo
        ? `A API não respondeu em ${tempoLimiteMs / 1000} segundos.`
        : "Não foi possível falar com a API (sem internet, API fora do ar ou bloqueio de CORS)."
    };
  } finally {
    if (avisoDemora) clearTimeout(avisoDemora);
  }
}

export const MENSAGEM_DEMORA =
  "A API está demorando: o plano grátis do Render dorme sem uso e a primeira chamada pode levar até 50 segundos. Aguarde.";

/* ---------------------------------------------------------------------
   Sessão (usuário e senha)
   --------------------------------------------------------------------- */

/** { conectado, usuario, papel, falhaRede } — pergunta à API pelo cookie. */
export async function lerSessao(opcoes = {}) {
  const r = await chamarApi("GET", "/auth/status", opcoes);
  const usuario = r.dados?.user;
  if (r.status === 200 && r.dados?.authenticated && usuario) {
    return { conectado: true, usuario: usuario.username, papel: usuario.role };
  }
  return { conectado: false, falhaRede: r.falhaRede || null };
}

/** { ok, usuario, papel, mensagem } — a senha vai direto para a API e não fica em lugar nenhum. */
export async function entrar(usuario, senha, opcoes = {}) {
  const r = await chamarApi("POST", "/auth/login", { ...opcoes, corpo: { username: usuario, password: senha } });
  if (r.status === 200 && r.dados?.authenticated) {
    return { ok: true, usuario: r.dados.user?.username || usuario, papel: r.dados.user?.role };
  }
  const motivos = {
    401: "Usuário ou senha não conferem.",
    429: r.dados?.error || "Muitas tentativas. Espere alguns minutos.",
    500: r.dados?.error || "A API recusou criar a sessão (falta configuração no servidor)."
  };
  return { ok: false, mensagem: r.falhaRede || motivos[r.status] || `A API respondeu ${r.status}.` };
}

export async function sair() {
  await chamarApi("POST", "/auth/logout");
  lembrarAdmin(false);
}

/* ---------------------------------------------------------------------
   Atalho de administrador

   Depois que o administrador entra, este navegador guarda uma MARCA para
   o chat mostrar o atalho "Configurar o chat". É só aparência: a marca
   não dá acesso a nada — quem decide é a API, pelo cookie, quando a
   página de configuração abre. Assim o chat não precisa chamar a API em
   toda página carregada (o que acordaria o Render à toa) só para saber
   se mostra uma engrenagem.
   --------------------------------------------------------------------- */
const MARCA_ADMIN = "arribaAdmin:atalho";

export function lembrarAdmin(sim) {
  try {
    if (sim) localStorage.setItem(MARCA_ADMIN, "1");
    else localStorage.removeItem(MARCA_ADMIN);
  } catch { /* armazenamento bloqueado: o atalho só não aparece */ }
}

export function pareceAdmin() {
  try { return localStorage.getItem(MARCA_ADMIN) === "1"; } catch { return false; }
}

/* ---------------------------------------------------------------------
   Chat público: a IA do servidor para quem visita o site

   Quando a base do site não cobre a pergunta, o chat pode perguntar à
   Arriba API (POST /publico/chat), que fala com o provedor de IA usando a
   chave guardada NO SERVIDOR. Nenhuma chave passa por aqui.

   Liga-se em dois lugares, de propósito:
   1. no servidor (Render): IA_CHAT_PUBLICO=true e a chave de um provedor;
   2. aqui: CHAT_PUBLICO_LIGADO = true.
   Com este desligado o site nem tenta — não acorda o servidor à toa nem
   deixa o visitante esperando uma resposta que não vem. Em
   desenvolvimento (?api=http://localhost...) o chat sempre tenta.

   O que a pessoa escreve SAI do navegador quando isto está ligado; o chat
   avisa disso na abertura.
   --------------------------------------------------------------------- */
export const CHAT_PUBLICO_LIGADO = false;

export const chatPublicoAtivo = () => CHAT_PUBLICO_LIGADO || API !== API_PADRAO;

const MAX_MENSAGENS_PUBLICO = 7;      // o servidor aceita 8; ímpar começa e termina em "user"
const MAX_CARACTERES_PUBLICO = 1000;  // mesmo teto do servidor

/** { ok, texto } ou { ok: false, erro, desligado } — nunca lança. */
export async function perguntarAoChatPublico({ historico, contexto, aoDemorar }) {
  const mensagens = historico.slice(-MAX_MENSAGENS_PUBLICO)
    .map((m) => ({ papel: m.role, texto: String(m.content).slice(0, MAX_CARACTERES_PUBLICO) }));
  while (mensagens.length && mensagens[0].papel !== "user") mensagens.shift();

  const r = await chamarApi("POST", "/publico/chat", { corpo: { mensagens, contexto }, aoDemorar, tempoLimiteMs: 60_000 });
  if (r.status === 200 && r.dados?.ok) return { ok: true, texto: r.dados.texto, provedor: r.dados.provedor };
  return {
    ok: false,
    desligado: r.dados?.code === "IA_DESLIGADA",
    erro: r.falhaRede || r.dados?.error || `a API respondeu ${r.status}`
  };
}
