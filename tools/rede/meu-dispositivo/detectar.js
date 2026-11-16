/* =====================================================================
   Que navegador e que sistema são estes — a parte que não depende de tela.

   Duas fontes, nesta ordem:
   1. "Client Hints" (navigator.userAgentData), quando o navegador tem: é
      a informação estruturada e a única que distingue Windows 10 de 11.
   2. O texto do User-Agent, que todo navegador manda — mas que hoje vem
      "congelado" de propósito: o Chrome no Android diz sempre "Android 10"
      e o macOS diz sempre "10.15.7". Onde o texto não é confiável, a
      resposta diz que não dá para saber, em vez de repetir o número falso.

   Sem DOM aqui, para ter teste automático (scripts/tests/rede.test.mjs).
   ===================================================================== */

const primeiro = (texto, expressao) => (expressao.exec(texto) || [])[1] || "";

/* `marcas` é a lista de navigator.userAgentData (brands ou fullVersionList):
   [{ brand: "Google Chrome", version: "130.0.6723.70" }, ...]. */
export function detectarNavegador(ua = "", marcas = []) {
  const texto = String(ua);

  /* A lista de marcas traz de propósito uma marca falsa ("Not A;Brand") e
     "Chromium", que é o motor. O navegador é a que sobra. */
  const marca = (marcas || []).find((m) => m?.brand && !/not.?a.?brand|^chromium$/i.test(m.brand));
  if (marca) return { nome: marca.brand, versao: String(marca.version || ""), motor: "Blink", origem: "client-hints" };

  const noIos = /iPhone|iPad|iPod/.test(texto);
  const regras = [
    ["Microsoft Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/, "Blink"],
    ["Opera", /OPR\/([\d.]+)/, "Blink"],
    ["Samsung Internet", /SamsungBrowser\/([\d.]+)/, "Blink"],
    ["Vivaldi", /Vivaldi\/([\d.]+)/, "Blink"],
    ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/, "Gecko"],
    ["Google Chrome", /(?:Chrome|CriOS)\/([\d.]+)/, "Blink"],
    ["Safari", /Version\/([\d.]+).*Safari\//, "WebKit"],
    ["Internet Explorer", /(?:MSIE |rv:)([\d.]+)/, "Trident"]
  ];
  for (const [nome, expressao, motor] of regras) {
    if (nome === "Internet Explorer" && !/Trident|MSIE/.test(texto)) continue;
    const versao = primeiro(texto, expressao);
    /* No iPhone e no iPad todo navegador usa o motor do Safari, por regra
       da loja — "Chrome para iOS" é WebKit por baixo. */
    if (versao) return { nome, versao, motor: noIos ? "WebKit" : motor, origem: "user-agent" };
  }
  return { nome: "Não identificado", versao: "", motor: "", origem: "user-agent" };
}

/* `dicas` são os valores de userAgentData (e getHighEntropyValues), quando
   existem: { platform, platformVersion, architecture, bitness, model, mobile }.
   `pontosDeToque` é navigator.maxTouchPoints. */
export function detectarSistema(ua = "", dicas = {}, pontosDeToque = 0) {
  const texto = String(ua);
  const d = dicas || {};
  const versaoDaDica = String(d.platformVersion || "");
  const maior = Number(versaoDaDica.split(".")[0]);
  let nome = "Não identificado";
  let versao = "";
  let observacao = "";

  if (/Windows/.test(texto) || d.platform === "Windows") {
    nome = "Windows";
    const nt = primeiro(texto, /Windows NT ([\d.]+)/);
    if (versaoDaDica) versao = maior >= 13 ? "11" : maior > 0 ? "10" : { "0.3": "8.1", "0.2": "8", "0.1": "7" }[versaoDaDica.slice(0, 3)] || "";
    else if (nt === "10.0") { versao = "10 ou 11"; observacao = "Este navegador não informa se é Windows 10 ou 11: os dois se apresentam igual."; }
    else versao = { "6.3": "8.1", "6.2": "8", "6.1": "7", "6.0": "Vista", "5.1": "XP" }[nt] || "";
  } else if (/iPhone|iPod/.test(texto)) {
    nome = "iOS";
    versao = primeiro(texto, /OS (\d+[_\d]*) like Mac/).replace(/_/g, ".");
  } else if (/iPad/.test(texto) || (/Macintosh/.test(texto) && pontosDeToque > 1)) {
    /* O iPad se apresenta como Mac desde o iPadOS 13. O que o entrega é
       ter tela de toque — Mac não tem. */
    nome = "iPadOS";
    versao = primeiro(texto, /OS (\d+[_\d]*) like Mac/).replace(/_/g, ".");
    if (!versao) observacao = "O iPad se apresenta como Mac e não informa a versão do sistema.";
  } else if (/Android/.test(texto) || d.platform === "Android") {
    nome = "Android";
    if (versaoDaDica) versao = String(maior || versaoDaDica);
    else {
      versao = primeiro(texto, /Android ([\d.]+)/);
      if (/Android 10; K\)/.test(texto)) { versao = ""; observacao = "Este navegador informa sempre \"Android 10\", qualquer que seja a versão: não dá para saber a verdadeira."; }
    }
  } else if (/CrOS/.test(texto) || d.platform === "Chrome OS" || d.platform === "Chromium OS") {
    nome = "ChromeOS";
  } else if (/Mac OS X|Macintosh/.test(texto) || d.platform === "macOS") {
    nome = "macOS";
    if (versaoDaDica) versao = versaoDaDica.split(".").slice(0, 2).join(".").replace(/\.0$/, "");
    else {
      const doTexto = primeiro(texto, /Mac OS X (\d+[_.\d]*)/).replace(/_/g, ".");
      if (doTexto === "10.15.7" || doTexto === "10.15") observacao = "Este navegador informa sempre \"10.15.7\", qualquer que seja a versão do macOS: não dá para saber a verdadeira.";
      else versao = doTexto;
    }
  } else if (/Linux|X11/.test(texto) || d.platform === "Linux") {
    nome = "Linux";
    const distribuicao = primeiro(texto, /(Ubuntu|Fedora|Debian)/);
    if (distribuicao) versao = distribuicao;
  }

  let arquitetura = "";
  if (d.architecture) {
    const familia = { x86: "x86 (Intel ou AMD)", arm: "ARM" }[d.architecture] || d.architecture;
    arquitetura = d.bitness ? `${familia}, ${d.bitness} bits` : familia;
  } else if (/Win64|x64|x86_64|amd64/i.test(texto)) arquitetura = "x86 (Intel ou AMD), 64 bits";
  else if (/WOW64/.test(texto)) arquitetura = "Sistema de 64 bits com navegador de 32 bits";
  else if (/aarch64|arm64/i.test(texto)) arquitetura = "ARM, 64 bits";
  else if (/\barm/i.test(texto)) arquitetura = "ARM";
  else if (/i[36]86/.test(texto)) arquitetura = "x86 (Intel ou AMD), 32 bits";

  let dispositivo = "Computador";
  if (nome === "iPadOS" || (nome === "Android" && !/Mobile/.test(texto) && d.mobile !== true)) dispositivo = "Tablet";
  else if (d.mobile === true || nome === "iOS" || /Mobi/.test(texto)) dispositivo = "Celular";

  return { nome, versao, arquitetura, dispositivo, modelo: String(d.model || ""), observacao };
}

/* O resumo em texto puro, para colar num chamado de suporte. `itens` é
   uma lista de [rótulo, valor]; valor vazio fica de fora. */
export function montarResumo(itens) {
  return itens.filter(([, valor]) => valor !== "" && valor !== null && valor !== undefined).map(([rotulo, valor]) => `${rotulo}: ${valor}`).join("\n");
}

export function ipValido(texto) {
  const ip = String(texto ?? "").trim();
  if (/^(\d{1,3})(\.\d{1,3}){3}$/.test(ip)) return ip.split(".").every((p) => Number(p) <= 255) ? "IPv4" : "";
  if (/^[0-9a-f:.]+$/i.test(ip) && ip.includes(":") && ip.length <= 45) return "IPv6";
  return "";
}
