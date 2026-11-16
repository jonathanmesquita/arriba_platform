/* =====================================================================
   Meu IP, navegador e sistema — a tela.

   A leitura do navegador e do sistema mora em detectar.js (tem teste
   automático). Aqui só se monta a página e se busca o IP.

   Tudo que vem de fora (o IP do serviço público) entra por textContent,
   nunca por innerHTML: é dado de terceiro.
   ===================================================================== */

import { detectarNavegador, detectarSistema, ipValido, montarResumo } from "./detectar.js";

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, filhos = []) {
  const no = document.createElement(tag);
  Object.entries(props).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null) return;
    if (chave === "texto") no.textContent = valor;
    else if (chave === "classe") no.className = valor;
    else if (chave in no) no[chave] = valor;
    else no.setAttribute(chave, valor);
  });
  [].concat(filhos).filter(Boolean).forEach((filho) => no.append(filho));
  return no;
}

/* Lista de pares rótulo/valor. Valor vazio não vira linha em branco. */
function preencherDados(id, pares) {
  $(id).replaceChildren(...pares
    .filter(([, valor]) => valor !== "" && valor !== null && valor !== undefined)
    .flatMap(([rotulo, valor]) => [el("dt", { texto: rotulo }), el("dd", { texto: String(valor) })]));
}

function estado(texto, tipo = "") {
  const linha = $("estado");
  linha.textContent = texto;
  linha.dataset.tipo = tipo;
}

/* ---------------------------------------------------------------------
   IP público

   Uma página não enxerga o próprio IP: quem enxerga é o servidor do outro
   lado. Daí perguntar a um serviço de fora. São dois endereços do mesmo
   serviço: o primeiro responde sempre em IPv4; o segundo responde em IPv6
   quando a conexão tem, e é assim que se sabe se a rede já usa IPv6.
   --------------------------------------------------------------------- */
const SERVICOS_DE_IP = [
  { url: "https://api.ipify.org?format=json", chave: "ip", prefere: "IPv4" },
  { url: "https://api64.ipify.org?format=json", chave: "ip", prefere: "IPv6" }
];

async function buscarIp({ url, chave }) {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), 8000);
  try {
    const resposta = await fetch(url, { signal: controle.signal, cache: "no-store" });
    if (!resposta.ok) return "";
    const dados = await resposta.json();
    const ip = String(dados?.[chave] ?? "").trim();
    return ipValido(ip) ? ip : "";
  } catch {
    return "";
  } finally {
    clearTimeout(relogio);
  }
}

let ipCopiavel = "";

async function mostrarIp() {
  const [v4, segundo] = await Promise.all(SERVICOS_DE_IP.map(buscarIp));
  const v6 = ipValido(segundo) === "IPv6" ? segundo : "";
  const principal = v4 || segundo;

  if (!principal) {
    $("ipPrincipal").textContent = "Não foi possível descobrir";
    estado("Não deu para consultar o seu IP. Pode ser falta de conexão, um bloqueador de anúncios ou a rede da empresa barrando o serviço.", "erro");
    $("notaIp").textContent = "Se você está numa rede corporativa, é comum que serviços assim sejam bloqueados. Nesse caso, o IP que o suporte precisa é o que aparece no firewall da empresa.";
    return;
  }

  ipCopiavel = montarResumo([["IP", v4 || principal], ["IPv6", v6]]);
  $("ipPrincipal").textContent = principal;
  $("btnCopiarIp").disabled = false;
  preencherDados("dadosIp", [
    ["Tipo", ipValido(principal) === "IPv6" ? "IPv6" : "IPv4"],
    v6 && v4 ? ["Também em IPv6", v6] : ["IPv6", v6 ? v6 : "a sua conexão não usa IPv6"],
    ["Fonte", "ipify.org"]
  ]);
}

/* ---------------------------------------------------------------------
   Navegador, sistema, tela
   --------------------------------------------------------------------- */
const SIM_NAO = (valor) => (valor ? "Sim" : "Não");

async function mostrarDispositivo() {
  const ua = navigator.userAgent || "";
  const dadosDoNavegador = navigator.userAgentData;

  /* A lista detalhada e a versão do sistema só vêm se forem pedidas, e a
     chamada pode ser recusada: por isso o try/catch e o valor de reserva. */
  let dicas = {};
  let marcas = dadosDoNavegador?.brands || [];
  if (dadosDoNavegador?.getHighEntropyValues) {
    try {
      dicas = await dadosDoNavegador.getHighEntropyValues(["platform", "platformVersion", "architecture", "bitness", "model", "fullVersionList"]);
      if (Array.isArray(dicas.fullVersionList) && dicas.fullVersionList.length) marcas = dicas.fullVersionList;
      dicas.mobile = dadosDoNavegador.mobile;
      dicas.platform = dicas.platform || dadosDoNavegador.platform;
    } catch {
      dicas = { platform: dadosDoNavegador.platform, mobile: dadosDoNavegador.mobile };
    }
  }

  const navegador = detectarNavegador(ua, marcas);
  const sistema = detectarSistema(ua, dicas, navigator.maxTouchPoints || 0);

  $("navegadorPrincipal").textContent = [navegador.nome, navegador.versao].filter(Boolean).join(" ") || "Não identificado";
  preencherDados("dadosNavegador", [
    ["Motor", navegador.motor],
    ["Idioma", navigator.language || ""],
    ["Cookies", SIM_NAO(navigator.cookieEnabled)],
    ["JavaScript", "Sim (esta página precisa dele para funcionar)"],
    ["Modo escuro", SIM_NAO(matchMedia("(prefers-color-scheme: dark)").matches)],
    ["De onde veio esta informação", navegador.origem === "client-hints" ? "O navegador informou (Client Hints)" : "Deduzida do texto de identificação"]
  ]);

  $("sistemaPrincipal").textContent = [sistema.nome, sistema.versao].filter(Boolean).join(" ") || "Não identificado";
  preencherDados("dadosSistema", [
    ["Tipo", sistema.dispositivo],
    ["Modelo", sistema.modelo],
    ["Processador", sistema.arquitetura],
    ["Tela sensível ao toque", SIM_NAO((navigator.maxTouchPoints || 0) > 0)]
  ]);
  $("observacaoSistema").textContent = sistema.observacao;

  const conexao = navigator.connection;
  preencherDados("dadosTela", [
    ["Tela", `${screen.width} × ${screen.height} pixels`],
    ["Janela do navegador", `${innerWidth} × ${innerHeight} pixels`],
    ["Zoom e densidade", `${devicePixelRatio}×`],
    ["Cores", screen.colorDepth ? `${screen.colorDepth} bits` : ""],
    ["Idiomas aceitos", (navigator.languages || []).join(", ")],
    ["Fuso horário", Intl.DateTimeFormat().resolvedOptions().timeZone || ""],
    ["Agora, no seu relógio", new Date().toLocaleString("pt-BR")],
    ["Está online", SIM_NAO(navigator.onLine)],
    ["Tipo de conexão", conexao?.effectiveType ? `${conexao.effectiveType} (estimativa do navegador)` : ""],
    ["Economia de dados", conexao?.saveData === undefined ? "" : SIM_NAO(conexao.saveData)]
  ]);

  $("userAgent").textContent = ua || "(o navegador não informou)";
  return { navegador, sistema };
}

/* ---------------------------------------------------------------------
   Copiar
   --------------------------------------------------------------------- */
async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const caixa = document.createElement("textarea");
    caixa.value = texto;
    caixa.setAttribute("readonly", "");
    caixa.style.position = "fixed";
    caixa.style.opacity = "0";
    document.body.appendChild(caixa);
    caixa.select();
    let copiou = false;
    try { copiou = document.execCommand("copy"); } catch { copiou = false; }
    caixa.remove();
    return copiou;
  }
}

/* A resposta aparece no próprio botão — é para onde a pessoa está olhando. */
function responderNoBotao(botao, textoNormal, icone) {
  const rotulo = botao.querySelector("span");
  const marca = botao.querySelector("i");
  botao.dataset.estado = "copiado";
  if (rotulo) rotulo.textContent = "Copiado";
  if (marca) marca.className = "fa-solid fa-check";
  setTimeout(() => {
    botao.dataset.estado = "";
    if (rotulo) rotulo.textContent = textoNormal;
    if (marca) marca.className = icone;
  }, 2000);
}

function montarTudo() {
  const linhas = [];
  const pares = (id) => {
    const lista = [...$(id).children];
    for (let i = 0; i < lista.length; i += 2) linhas.push(`${lista[i].textContent}: ${lista[i + 1].textContent}`);
  };
  linhas.push(`IP: ${$("ipPrincipal").textContent}`);
  pares("dadosIp");
  linhas.push("", `Navegador: ${$("navegadorPrincipal").textContent}`);
  pares("dadosNavegador");
  linhas.push("", `Sistema: ${$("sistemaPrincipal").textContent}`);
  pares("dadosSistema");
  if ($("observacaoSistema").textContent) linhas.push(`Observação: ${$("observacaoSistema").textContent}`);
  linhas.push("", "Tela, idioma e conexão");
  pares("dadosTela");
  linhas.push("", `Identificação do navegador: ${$("userAgent").textContent}`);
  return linhas.join("\n");
}

document.addEventListener("DOMContentLoaded", async () => {
  $("btnCopiarIp").addEventListener("click", async () => {
    if (!ipCopiavel) return;
    const copiou = await copiar(ipCopiavel);
    if (copiou) responderNoBotao($("btnCopiarIp"), "Copiar IP", "fa-regular fa-copy");
    estado(copiou ? "IP copiado." : "Não foi possível copiar. Selecione o texto e use Ctrl+C.", copiou ? "ok" : "erro");
  });

  $("btnCopiarTudo").addEventListener("click", async () => {
    const copiou = await copiar(montarTudo());
    if (copiou) responderNoBotao($("btnCopiarTudo"), "Copiar tudo para o suporte", "fa-regular fa-copy");
    estado(copiou ? "Tudo copiado. É só colar no chamado." : "Não foi possível copiar. Selecione o texto e use Ctrl+C.", copiou ? "ok" : "erro");
  });

  await mostrarDispositivo();
  await mostrarIp();
});
