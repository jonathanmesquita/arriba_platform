/* =====================================================================
   Configurar o chat do site - área de administração

   Antes, a configuração do provedor de IA era um painel dentro do chat,
   aberto pela engrenagem, à vista de qualquer visitante. Agora mora aqui,
   e esta página só mostra o formulário depois que a ARRIBA API confirma,
   pelo cookie de sessão, que quem está aqui é administrador.

   O que isto protege, e o que não protege — dito com honestidade:
   esconder um formulário num site estático não é segurança, porque o
   código é público. O que torna isto aceitável é que NÃO HÁ SEGREDO DO
   SITE aqui: a chave do provedor é de quem a digita e fica no navegador
   dela (llm-providers.js). A trava separa o papel de administrador do
   de visitante; o segredo de verdade (senha) é conferido na API.
   ===================================================================== */

import { PROVEDORES, configCompleta, getConfig, limparConfig, salvarConfig, testarConexao } from "../../assets/js/llm-providers.js";
import { iniciarAcessoAdmin } from "../../assets/js/acesso-admin.js";
import { CHAT_PUBLICO_LIGADO, chamarApi } from "../../assets/js/arriba-api.js";

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, filhos = []) {
  const no = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === "texto") no.textContent = v;
    else if (k === "classe") no.className = v;
    else if (k in no) no[k] = v;
    else no.setAttribute(k, v);
  });
  [].concat(filhos).filter(Boolean).forEach((f) => no.append(f));
  return no;
}

/* Acesso: o bloco "Acesso" é o mesmo das outras páginas de administração
   (acesso-admin.js). Aqui só se reage: liberou → mostra o formulário. */
function liberar() {
  $("painelConfig").hidden = false;
  $("painelServidor").hidden = false;
  montarFormulario();
  mostrarIaDoServidor();
}

function fechar() {
  $("painelConfig").hidden = true;
  $("painelServidor").hidden = true;
}

/* O estado da IA guardada no servidor — a que atende visitantes. Só
   leitura: a chave e os limites são variáveis de ambiente no Render, e
   esta tela não tem (nem deve ter) como alterá-las. A API responde
   sim/não por provedor, nunca a chave. */
async function mostrarIaDoServidor() {
  const selo = $("servidorSituacao");
  const r = await chamarApi("GET", "/v1/ia/status");
  if (r.status !== 200 || !r.dados?.ok) {
    selo.textContent = "não foi possível ler";
    selo.dataset.tipo = "";
    $("servidorDados").replaceChildren();
    $("servidorComoLigar").textContent = r.falhaRede || r.dados?.error || `A API respondeu ${r.status}.`;
    return;
  }
  const d = r.dados;
  const noServidor = Boolean(d.chatPublico?.ligado);
  const ligado = noServidor && CHAT_PUBLICO_LIGADO;
  selo.textContent = ligado ? "ligado" : "desligado";
  selo.dataset.tipo = ligado ? "externo" : "local";

  const nomes = { openai: "OpenAI", gemini: "Gemini", anthropic: "Claude" };
  const comChave = Object.entries(d.configurados || {}).filter(([, tem]) => tem).map(([id]) => nomes[id] || id);
  const linhas = [
    ["Provedor em uso", d.ligada ? `${d.provedorNome} — ${d.modelo}` : "nenhum (falta a chave de um provedor no servidor)"],
    ["Chaves no servidor", comChave.length ? comChave.join(", ") : "nenhuma"],
    ["No servidor", noServidor ? "chat público ligado" : "chat público desligado"],
    ["No site", CHAT_PUBLICO_LIGADO ? "ligado" : "desligado"],
    ["Uso hoje", `${d.chatPublico?.hoje ?? 0} de ${d.chatPublico?.limiteDoDia ?? "?"} perguntas (até ${d.chatPublico?.limitePorMinuto ?? "?"} por minuto)`]
  ];
  $("servidorDados").replaceChildren(...linhas.flatMap(([rotulo, valor]) => [el("dt", { texto: rotulo }), el("dd", { texto: valor })]));

  const falta = [];
  if (!d.ligada) falta.push("cadastrar a chave de um provedor no Render (OPENAI_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY)");
  if (!noServidor) falta.push("definir IA_CHAT_PUBLICO=true no Render");
  if (!CHAT_PUBLICO_LIGADO) falta.push("trocar CHAT_PUBLICO_LIGADO para true em assets/js/arriba-api.js");
  $("servidorComoLigar").textContent = falta.length
    ? `Para ligar, falta: ${falta.join("; ")}. Antes, configure um limite de gasto no painel do provedor — o chat público gasta a sua conta em nome de quem visita.`
    : "Ligado nos dois lados. O teto diário fica na memória do servidor e zera quando ele reinicia: o limite de verdade é o limite de gasto no painel do provedor.";
}

/* ---------------------------------------------------------------------
   Formulário do provedor
   --------------------------------------------------------------------- */
function atualizarSituacao() {
  const cfg = getConfig();
  const ativo = configCompleta(cfg) ? cfg.provedor : "local";
  const selo = $("situacao");
  if (ativo === "local") {
    selo.textContent = "responde só pela base do site";
    selo.dataset.tipo = "local";
  } else {
    selo.textContent = `usa ${PROVEDORES[ativo].nome} quando a base não cobre`;
    selo.dataset.tipo = "externo";
  }
}

function status(tipo, texto) {
  const s = $("cfgStatus");
  s.dataset.tipo = tipo || "";
  s.textContent = texto || "";
}

function montarFormulario(provedorEscolhido) {
  const cfg = getConfig();
  const id = provedorEscolhido || cfg.provedor;
  const p = PROVEDORES[id];

  const select = $("cfgProvedor");
  select.replaceChildren(...Object.values(PROVEDORES).map((x) => el("option", { value: x.id, texto: x.nome, selected: x.id === id })));
  $("cfgResumo").textContent = p.resumo;

  /* Campos do provedor escolhido. Valores entram por .value (DOM), nunca
     por HTML montado em texto. */
  const mesmos = id === cfg.provedor;
  const campos = [];
  if (p.id !== "local") {
    const lista = el("datalist", { id: "cfgModelos" }, p.modelos.map((m) => el("option", { value: m })));
    campos.push(el("div", { classe: "campo" }, [
      el("label", { htmlFor: "cfgModelo", texto: "Modelo" }),
      el("input", { id: "cfgModelo", value: mesmos ? cfg.modelo : "", placeholder: p.modelos[0] || "", autocomplete: "off", spellcheck: false }),
      lista
    ]));
    if (p.precisaUrl) {
      campos.push(el("div", { classe: "campo" }, [
        el("label", { htmlFor: "cfgUrl", texto: "Endereço" }),
        el("input", { id: "cfgUrl", value: (mesmos && cfg.url) || p.urlPadrao, autocomplete: "off", spellcheck: false })
      ]));
    }
    if (p.precisaChave) {
      const blocoChave = el("div", { classe: "campo" }, [
        el("label", { htmlFor: "cfgChave", texto: "Chave de API do provedor" }),
        el("input", { id: "cfgChave", type: "password", value: mesmos ? cfg.chave : "", placeholder: "cole a chave", autocomplete: "off", spellcheck: false })
      ]);
      if (p.linkChave) {
        blocoChave.append(el("p", { classe: "dica" }, el("a", { href: p.linkChave, target: "_blank", rel: "noopener noreferrer", texto: "Onde pegar a chave (abre em nova aba)" })));
      }
      campos.push(blocoChave);
    }
    if (p.ajudaSetup) campos.push(el("p", { classe: "dica" }, el("code", { texto: p.ajudaSetup })));
    campos.push(el("div", { classe: "leia" }, [
      el("strong", { texto: "Leia antes de ativar" }),
      el("p", { texto: `${p.privacidade} Não cole dado pessoal (CPF, nome completo, telefone) no chat.` }),
      p.precisaChave ? el("p", { texto: "A chave fica só neste navegador e aparece nas ferramentas de desenvolvedor de quem usa este computador. Use uma chave com limite de gasto." }) : null
    ]));
  }
  $("camposProvedor").replaceChildren(...campos);

  // O seletor do HTML tem <label for>, mas o datalist precisa do atributo.
  $("cfgModelo")?.setAttribute("list", "cfgModelos");
  atualizarSituacao();
}

function lerFormulario() {
  return {
    provedor: $("cfgProvedor").value,
    modelo: $("cfgModelo")?.value || "",
    chave: $("cfgChave")?.value || "",
    url: $("cfgUrl")?.value || ""
  };
}

function aoSalvar(evento) {
  evento.preventDefault();
  const cfg = salvarConfig(lerFormulario());
  atualizarSituacao();
  status(configCompleta(cfg) ? "ok" : "erro", configCompleta(cfg)
    ? (cfg.provedor === "local"
      ? "Salvo: o chat responde só pela base do site."
      : "Salvo. Quando a base do site não tiver a resposta, o chat deste navegador pergunta a este provedor.")
    : "Falta preencher o modelo ou a chave — até lá, o chat responde só pela base do site.");
}

async function aoTestar() {
  const botao = $("cfgTestar");
  botao.disabled = true;
  status("", "Testando…");
  const r = await testarConexao(salvarConfig(lerFormulario()));
  botao.disabled = false;
  atualizarSituacao();
  status(r.ok ? "ok" : "erro", (r.ok ? "Funcionou: " : "Não funcionou: ") + r.texto);
}

function aoLimpar() {
  limparConfig();
  montarFormulario("local");
  status("ok", "Pronto: o chat responde só pela base do site.");
}

/* ---------------------------------------------------------------------
   Início
   --------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  $("formConfig").addEventListener("submit", aoSalvar);
  $("cfgTestar").addEventListener("click", aoTestar);
  $("cfgLimpar").addEventListener("click", aoLimpar);
  $("cfgProvedor").addEventListener("change", (e) => {
    // Trocar de provedor não carrega chave de um no outro.
    montarFormulario(e.target.value);
    status("", "");
  });
  iniciarAcessoAdmin({ aoLiberar: liberar, aoFechar: fechar });
});
