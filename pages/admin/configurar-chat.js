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
import { API, API_PADRAO, MENSAGEM_DEMORA, entrar, lembrarAdmin, lerSessao, sair } from "../../assets/js/arriba-api.js";

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

/* ---------------------------------------------------------------------
   Acesso
   --------------------------------------------------------------------- */
function aviso(tipo, texto) {
  const a = $("avisoAcesso");
  if (!texto) { a.hidden = true; return; }
  a.dataset.tipo = tipo;
  a.textContent = texto;
  a.hidden = false;
}

const avisarDemora = () => aviso("info", MENSAGEM_DEMORA);

function definirEstado(estado, usuario = "") {
  const textos = {
    verificando: "Verificando…",
    fora: "Não conectado",
    semPermissao: `Conectado como ${usuario}, sem permissão de administrador`,
    admin: `Administrador: ${usuario}`
  };
  $("estado").dataset.estado = estado;
  $("estadoTexto").textContent = textos[estado];
  $("formLogin").hidden = estado !== "fora";
  $("blocoConectado").hidden = !(estado === "admin" || estado === "semPermissao");
  $("painelConfig").hidden = estado !== "admin";
  if (estado === "admin") montarFormulario();
}

function aplicarSessao({ conectado, usuario, papel }) {
  if (!conectado) { definirEstado("fora"); lembrarAdmin(false); return; }
  const admin = papel === "admin";
  lembrarAdmin(admin);
  definirEstado(admin ? "admin" : "semPermissao", usuario);
  if (!admin) aviso("erro", "Esta conta entra na API, mas não é de administrador. A configuração do chat fica fechada.");
}

async function verificar() {
  const sessao = await lerSessao({ aoDemorar: avisarDemora });
  aviso(null);
  if (sessao.falhaRede) aviso("erro", sessao.falhaRede);
  aplicarSessao(sessao);
}

async function aoEntrar(evento) {
  evento.preventDefault();
  const botao = $("btnEntrar");
  botao.disabled = true;
  const r = await entrar($("usuario").value.trim(), $("senha").value, { aoDemorar: avisarDemora });
  $("senha").value = "";
  botao.disabled = false;
  aviso(null);
  if (!r.ok) { aviso("erro", r.mensagem); $("senha").focus(); return; }
  aplicarSessao({ conectado: true, usuario: r.usuario, papel: r.papel });
}

async function aoSair() {
  await sair();
  definirEstado("fora");
  aviso("ok", "Você saiu. O atalho de configuração some do chat deste navegador.");
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
  $("formLogin").addEventListener("submit", aoEntrar);
  $("btnSair").addEventListener("click", aoSair);
  $("formConfig").addEventListener("submit", aoSalvar);
  $("cfgTestar").addEventListener("click", aoTestar);
  $("cfgLimpar").addEventListener("click", aoLimpar);
  $("cfgProvedor").addEventListener("change", (e) => {
    // Trocar de provedor não carrega chave de um no outro.
    montarFormulario(e.target.value);
    status("", "");
  });

  verificar().then(() => {
    if (API !== API_PADRAO && $("avisoAcesso").hidden) aviso("info", `Usando a API local: ${API}`);
  });
});
