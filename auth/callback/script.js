/* =====================================================================
   Callback OAuth (Microsoft Entra ID) — Arriba Platform

   Esta pagina e o endereco de retorno do login. Ela faz duas coisas,
   dependendo do que vier na URL:

     sem `code`/`error`  -> painel: configura, inicia o login, ve historico
     com `code`/`error`  -> recebe, troca o codigo pelo token e mostra tudo

   FLUXO: Authorization Code + PKCE, SEM client secret.

   Por que PKCE e nao o fluxo "Web" com secret: a Arriba e site estatico,
   sem backend. Qualquer segredo embarcado aqui vira publico no momento em
   que o arquivo e servido. O PKCE resolve isso provando a posse de um
   `code_verifier` gerado na hora, que nunca trafega na primeira perna.

   E por isso que a URI PRECISA estar registrada no portal como plataforma
   "Aplicativo de pagina unica (SPA)", e nao "Web": so no tipo SPA o Entra
   libera CORS no endpoint /token. Registrada como Web, o login ate
   funciona e o redirect volta, mas a troca do codigo falha com
   AADSTS9002326 ("Cross-origin token redemption is permitted only for the
   'Single-Page Application' client-type").

   ONDE CADA COISA FICA
     localStorage   configuracao (tenant, client id, escopos) e historico.
                    Nada disso e segredo: client id e tenant id aparecem na
                    propria URL de autorizacao, visiveis no navegador.
     sessionStorage code_verifier, state e nonce — por aba, somem ao fechar.
     lugar nenhum   o token. E exibido e descartado; guardar access token em
                    storage e o erro classico desse tipo de pagina.
   ===================================================================== */

"use strict";

const CFG_KEY = "arribaOAuth:config";
const HIST_KEY = "arribaOAuth:historico";
const PKCE_KEY = "arribaOAuth:pkce";
const MAX_HIST = 25;

const $ = (id) => document.getElementById(id);

function escHtml(v = "") {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

/* A URI precisa bater EXATAMENTE com a registrada no portal — inclusive a
   ausencia de barra final e de query string. Por isso e derivada daqui e
   mostrada em campo somente-leitura, em vez de digitada. */
const REDIRECT_URI = location.origin + location.pathname.replace(/\/index\.html$/, "/");

/* ---------------------------------------------------------------------
   Configuracao
   --------------------------------------------------------------------- */
function getConfig() {
  try {
    const s = JSON.parse(localStorage.getItem(CFG_KEY) || "null");
    if (!s || typeof s !== "object") throw 0;
    return {
      tenant: String(s.tenant || ""),
      clientId: String(s.clientId || ""),
      scopes: String(s.scopes || "openid profile email User.Read")
    };
  } catch {
    return { tenant: "", clientId: "", scopes: "openid profile email User.Read" };
  }
}

function salvarConfig() {
  const cfg = {
    tenant: $("tenant").value.trim(),
    clientId: $("clientId").value.trim(),
    scopes: $("scopes").value.trim() || "openid profile email User.Read"
  };
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* modo privado */ }
  return cfg;
}

/* ---------------------------------------------------------------------
   Historico de retornos (para "acompanhar via web")
   --------------------------------------------------------------------- */
function getHistorico() {
  try {
    const h = JSON.parse(localStorage.getItem(HIST_KEY) || "[]");
    return Array.isArray(h) ? h : [];
  } catch { return []; }
}

function registrarHistorico(entrada) {
  const h = getHistorico();
  h.unshift(entrada);
  try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, MAX_HIST))); } catch { /* cota */ }
}

function renderHistorico() {
  const h = getHistorico();
  $("contadorHist").textContent = h.length ? `(${h.length})` : "";
  if (!h.length) {
    $("historico").innerHTML = `<p class="vazio">Nenhum retorno recebido ainda. Os callbacks aparecem aqui conforme chegam.</p>`;
    return;
  }
  $("historico").innerHTML = `
    <table>
      <thead><tr><th>Quando</th><th>Resultado</th><th>Detalhe</th></tr></thead>
      <tbody>
        ${h.map(e => `
          <tr>
            <td class="chave">${escHtml(e.quando)}</td>
            <td>${e.ok ? "✅ sucesso" : "❌ erro"}</td>
            <td class="valor">${escHtml(e.detalhe || "—")}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

/* ---------------------------------------------------------------------
   PKCE — geracao do par verifier/challenge com Web Crypto
   --------------------------------------------------------------------- */
function aleatorio(tamanho = 64) {
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  // base64url sem padding: alfabeto seguro para URL
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function desafioDe(verifier) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* ---------------------------------------------------------------------
   Inicio do login
   --------------------------------------------------------------------- */
async function entrar() {
  const cfg = salvarConfig();
  if (!cfg.tenant || !cfg.clientId) {
    $("statusConfig").textContent = "⚠ Preencha o locatário e o ID do aplicativo antes de entrar.";
    return;
  }

  const verifier = aleatorio();
  const state = aleatorio(16);
  const nonce = aleatorio(16);
  // state e nonce existem para o retorno poder ser conferido: sem eles, um
  // terceiro consegue empurrar um `code` na sua sessao (CSRF de login).
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, nonce, cfg }));

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    response_mode: "query",
    scope: cfg.scopes,
    state,
    nonce,
    code_challenge: await desafioDe(verifier),
    code_challenge_method: "S256"
  });

  location.assign(`https://login.microsoftonline.com/${encodeURIComponent(cfg.tenant)}/oauth2/v2.0/authorize?${params}`);
}

/* ---------------------------------------------------------------------
   Tratamento do retorno
   --------------------------------------------------------------------- */
function mostrarEstado(classe, titulo, texto) {
  const el = $("estadoRetorno");
  el.className = `estado ${classe}`;
  el.innerHTML = `<strong>${escHtml(titulo)}</strong>${escHtml(texto)}`;
}

function renderParams(params) {
  const linhas = [...params.entries()];
  if (!linhas.length) return;
  $("tabelaParams").innerHTML = `
    <table>
      <thead><tr><th>Parâmetro</th><th>Valor</th></tr></thead>
      <tbody>
        ${linhas.map(([k, v]) => `
          <tr>
            <td class="chave">${escHtml(k)}</td>
            <td class="valor">${escHtml(k === "code" ? v.slice(0, 24) + "… (truncado)" : v)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

/* Decodifica o payload de um JWT. NAO verifica assinatura: isso exige as
   chaves publicas do provedor e cabe a quem consome o token, nao a esta
   pagina de inspecao. */
function decodificarJwt(jwt) {
  try {
    const payload = jwt.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

async function tratarRetorno(params) {
  $("blocoRetorno").classList.remove("hidden");
  renderParams(params);

  const agora = new Date().toLocaleString("pt-BR");

  if (params.get("error")) {
    const desc = params.get("error_description") || "";
    mostrarEstado("erro", `Erro: ${params.get("error")}`, desc);
    registrarHistorico({ quando: agora, ok: false, detalhe: `${params.get("error")}: ${desc.slice(0, 120)}` });
    renderHistorico();
    return;
  }

  const code = params.get("code");
  if (!code) return;

  const guardado = JSON.parse(sessionStorage.getItem(PKCE_KEY) || "null");
  if (!guardado) {
    mostrarEstado("aviso", "Código recebido, mas sem sessão para trocá-lo",
      "O code_verifier fica em sessionStorage e some ao fechar a aba. Inicie o login novamente nesta mesma aba.");
    registrarHistorico({ quando: agora, ok: false, detalhe: "sem code_verifier na sessão" });
    renderHistorico();
    return;
  }

  if (params.get("state") !== guardado.state) {
    mostrarEstado("erro", "State não confere",
      "O retorno não corresponde ao login iniciado aqui. Descartado por segurança (proteção contra CSRF de login).");
    registrarHistorico({ quando: agora, ok: false, detalhe: "state divergente — retorno descartado" });
    renderHistorico();
    return;
  }

  mostrarEstado("aviso", "Código recebido", "Trocando pelo token...");

  const corpo = new URLSearchParams({
    client_id: guardado.cfg.clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: guardado.verifier,
    scope: guardado.cfg.scopes
  });

  try {
    const resp = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(guardado.cfg.tenant)}/oauth2/v2.0/token`,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: corpo, credentials: "omit" }
    );
    const dados = await resp.json();

    if (!resp.ok) {
      const cod = dados.error_description || dados.error || `HTTP ${resp.status}`;
      const dica = /AADSTS9002326/.test(cod)
        ? " ➜ Esta é a falha típica de URI registrada como plataforma “Web”. Troque para “Aplicativo de página única (SPA)” no portal."
        : "";
      mostrarEstado("erro", "Falha ao trocar o código pelo token", cod + dica);
      registrarHistorico({ quando: agora, ok: false, detalhe: String(cod).slice(0, 160) });
      renderHistorico();
      return;
    }

    const claims = dados.id_token ? decodificarJwt(dados.id_token) : null;
    const quem = claims?.preferred_username || claims?.name || claims?.email || "autenticado";

    mostrarEstado("ok", "Login concluído", `Token recebido para ${quem}. Ele é exibido abaixo e não fica guardado.`);
    renderToken(dados, claims);
    registrarHistorico({ quando: agora, ok: true, detalhe: `${quem} · escopos: ${(dados.scope || "").slice(0, 80)}` });
    renderHistorico();

    // A sessao PKCE serve uma vez so: um `code` nao pode ser reaproveitado.
    sessionStorage.removeItem(PKCE_KEY);
  } catch (e) {
    mostrarEstado("erro", "Não foi possível falar com o endpoint de token", e.message);
    registrarHistorico({ quando: agora, ok: false, detalhe: e.message.slice(0, 160) });
    renderHistorico();
  }
}

function renderToken(dados, claims) {
  $("secaoToken").classList.remove("hidden");
  const resumo = {
    token_type: dados.token_type,
    expires_in: dados.expires_in,
    scope: dados.scope,
    access_token: dados.access_token ? `${String(dados.access_token).slice(0, 18)}… (truncado nesta tela)` : undefined,
    id_token: dados.id_token ? `${String(dados.id_token).slice(0, 18)}… (truncado nesta tela)` : undefined
  };
  $("tokenDecodificado").innerHTML = `
    <p class="hint">Resposta do endpoint de token (tokens truncados de propósito — não copie token para lugar nenhum):</p>
    <pre class="bloco">${escHtml(JSON.stringify(resumo, null, 2))}</pre>
    ${claims ? `
      <p class="hint" style="margin-top:14px">Claims do <code>id_token</code> — <strong>assinatura não verificada</strong>, só decodificada:</p>
      <pre class="bloco">${escHtml(JSON.stringify(claims, null, 2))}</pre>` : ""}`;
}

/* ---------------------------------------------------------------------
   Init
   --------------------------------------------------------------------- */
const cfg = getConfig();
$("tenant").value = cfg.tenant;
$("clientId").value = cfg.clientId;
$("scopes").value = cfg.scopes;
$("redirect").value = REDIRECT_URI;

$("btnEntrar").addEventListener("click", entrar);
$("btnSalvar").addEventListener("click", () => {
  salvarConfig();
  $("statusConfig").textContent = "✓ Configuração salva neste navegador.";
});
$("btnSair").addEventListener("click", () => {
  sessionStorage.removeItem(PKCE_KEY);
  $("statusConfig").textContent = "Sessão limpa. A configuração foi mantida.";
});
$("btnLimparHist").addEventListener("click", () => {
  try { localStorage.removeItem(HIST_KEY); } catch { /* nada a fazer */ }
  renderHistorico();
});

renderHistorico();

const params = new URLSearchParams(location.search);
if (params.get("code") || params.get("error")) {
  tratarRetorno(params);
  // Tira o code da barra de endereco: ele e de uso unico, mas nao deve
  // ficar no historico do navegador nem ser compartilhado por copiar a URL.
  history.replaceState(null, "", location.pathname);
}
