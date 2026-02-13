/* ===========================
   Massa de Dados (MX) — Arriba
   - Nomes/Sobrenomes mexicanos
   - CPF/CNPJ válidos (BR)
   - Email fake, telefone MX, endereço MX, data nascimento
   - Preview + copiar + baixar CSV/JSON
   ===========================

   IDs esperados no HTML (recomendado):
   Inputs:
   - n_preview            (quantos mostrar na tela)        default 10
   - n_export             (quantos exportar)               default 100
   - doc_mode             ("cpf" | "cnpj" | "auto")        default "auto"
   - email_domain         (ex: "example.mx")               default "example.mx"
   - seed_cliente         (cliente id Arriba)              default "1320"
   - seed_nome_prefix     (prefixo nome)                   default "" (ignora)

   Botões:
   - btnGerarPreview
   - btnCopiarJSON
   - btnCopiarCSV
   - btnBaixarJSON
   - btnBaixarCSV
   - btnBaixarArribaFinanciado (opcional)

   Saídas:
   - previewTableBody     (tbody da tabela)
   - outJSON              (textarea/pre/code)
   - outCSV               (textarea/pre/code)
*/

const SEP = ";";
const NL = "\r\n";

/* ========= Utils ========= */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const padLeft = (num, size) => String(num).padStart(size, "0");

function slug(s) {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function safeEl(id) {
  return document.getElementById(id);
}
function val(id, fallback = "") {
  const el = safeEl(id);
  if (!el) return fallback;
  return (el.value ?? "").toString().trim();
}
function numVal(id, fallback = 0) {
  const el = safeEl(id);
  if (!el) return fallback;
  const n = Number(el.value);
  return Number.isFinite(n) ? n : fallback;
}

function downloadText(filename, content, mime = "text/plain;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(headers, rows) {
  return [headers.join(SEP), ...rows.map(r => r.join(SEP))].join(NL);
}

async function copyToClipboard(text) {
  // tenta Clipboard API, se falhar usa fallback
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  }
}

/* ========= CPF / CNPJ (BR válidos) ========= */
function randomDigit() {
  return Math.floor(Math.random() * 10);
}

function gerarCPF() {
  const nums = Array.from({ length: 9 }, randomDigit);

  let d1 = nums.reduce((s, n, i) => s + n * (10 - i), 0) % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;

  let d2 = [...nums, d1].reduce((s, n, i) => s + n * (11 - i), 0) % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;

  return [...nums, d1, d2].join("");
}

function gerarCNPJ() {
  const nums = Array.from({ length: 12 }, randomDigit);

  const calc = (base, weights) =>
    base.reduce((s, n, i) => s + n * weights[i], 0) % 11;

  let d1 = calc(nums, [5,4,3,2,9,8,7,6,5,4,3,2]);
  d1 = d1 < 2 ? 0 : 11 - d1;

  let d2 = calc([...nums, d1], [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  d2 = d2 < 2 ? 0 : 11 - d2;

  return [...nums, d1, d2].join("");
}

function resolveDocumentoBR(mode) {
  if (mode === "cpf") return { tipo: "CPF", valor: gerarCPF() };
  if (mode === "cnpj") return { tipo: "CNPJ", valor: gerarCNPJ() };
  // auto
  const isCpf = Math.random() > 0.25; // tende a CPF
  return isCpf ? { tipo: "CPF", valor: gerarCPF() } : { tipo: "CNPJ", valor: gerarCNPJ() };
}

/* ========= Dados MX (listas simples, mas decentes) ========= */
const FIRST_NAMES_MX = [
  "Juan","José","Luis","Carlos","Jorge","Miguel","Jesús","Alejandro","Fernando","Ricardo",
  "Antonio","Eduardo","Héctor","Roberto","Manuel","Francisco","Raúl","Sergio","Diego","Daniel",
  "María","Guadalupe","Juana","Carmen","Rosa","Patricia","Ana","Laura","Sofía","Valentina",
  "Fernanda","Daniela","Gabriela","Paola","Alejandra","Lucía","Ximena","Camila","Andrea","Karla"
];

const LAST_NAMES_MX = [
  "García","Hernández","Martínez","López","González","Pérez","Rodríguez","Sánchez","Ramírez","Cruz",
  "Flores","Gómez","Morales","Vargas","Reyes","Torres","Ruiz","Jiménez","Díaz","Romero",
  "Navarro","Rojas","Castillo","Ortega","Silva","Mendoza","Chávez","Herrera","Aguilar","Delgado"
];

const MX_STATES = [
  { estado: "Ciudad de México", abre: "CDMX", municipios: ["Benito Juárez","Coyoacán","Iztapalapa","Miguel Hidalgo","Cuauhtémoc"] },
  { estado: "Jalisco", abre: "JAL", municipios: ["Guadalajara","Zapopan","Tlaquepaque","Tonalá","Puerto Vallarta"] },
  { estado: "Nuevo León", abre: "NL", municipios: ["Monterrey","San Pedro Garza García","Guadalupe","Apodaca","Santa Catarina"] },
  { estado: "Puebla", abre: "PUE", municipios: ["Puebla","San Andrés Cholula","Tehuacán","Atlixco","San Pedro Cholula"] },
  { estado: "Yucatán", abre: "YUC", municipios: ["Mérida","Valladolid","Progreso","Tizimín","Umán"] },
];

const MX_COLONIAS = [
  "Centro","Roma Norte","Condesa","Del Valle","Polanco","Doctores","Obrera","Narvarte","Juárez","Santa María la Ribera",
  "Providencia","Americana","Ladrón de Guevara","Obispado","Mitras Centro","San Javier","La Paz","Huexotitla"
];

const STREET_TYPES = ["Calle","Av.","Blvd.","Calz.","Priv.","Circuito"];
const STREET_NAMES = [
  "Insurgentes","Reforma","Universidad","Tlalpan","Patriotismo","Chapultepec","Juárez","Zaragoza","Hidalgo","Madero",
  "Benito Juárez","Niños Héroes","Independencia","Allende","5 de Mayo","Morelos","Zapata","Obregón","Guerrero","Avenida del Sol"
];

const MX_AREA_CODES = ["55","33","81","222","999","664","686","662","998","667"]; // CDMX/GDL/MTY/...
function gerarTelefoneMX() {
  const ac = pick(MX_AREA_CODES);
  const part1 = randInt(100, 999);
  const part2 = randInt(10, 99);
  const part3 = randInt(10, 99);
  // formato: +52 55 123 45 67 (10 dígitos após país)
  return `+52 ${ac} ${part1} ${part2} ${part3}`;
}

function gerarCPMX() {
  // Código postal MX tem 5 dígitos
  return padLeft(randInt(1000, 99999), 5);
}

function gerarEnderecoMX() {
  const st = pick(MX_STATES);
  const municipio = pick(st.municipios);
  const col = pick(MX_COLONIAS);
  const type = pick(STREET_TYPES);
  const name = pick(STREET_NAMES);
  const num = randInt(10, 9999);
  const cp = gerarCPMX();
  // Ex: Calle Reforma 120, Col. Roma Norte, Benito Juárez, Ciudad de México, CP 06700
  return {
    rua: `${type} ${name}`,
    numero: String(num),
    colonia: `Col. ${col}`,
    municipio,
    estado: st.estado,
    cp,
    completo: `${type} ${name} ${num}, ${`Col. ${col}`}, ${municipio}, ${st.estado}, CP ${cp}`
  };
}

function gerarNascimento(minAge = 18, maxAge = 70) {
  const now = new Date();
  const year = now.getFullYear() - randInt(minAge, maxAge);
  const month = randInt(0, 11);
  const day = randInt(1, 28); // simplifica
  const d = new Date(year, month, day);
  // dd/mm/aaaa
  const dd = padLeft(d.getDate(), 2);
  const mm = padLeft(d.getMonth() + 1, 2);
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function gerarNomeCompleto(prefixo = "") {
  const first = pick(FIRST_NAMES_MX);
  // no MX é comum 2 sobrenomes
  const last1 = pick(LAST_NAMES_MX);
  let last2 = pick(LAST_NAMES_MX);
  if (last2 === last1) last2 = pick(LAST_NAMES_MX);

  const nome = prefixo ? `${prefixo} ${first}` : first;
  return { first, last1, last2, full: `${nome} ${last1} ${last2}`.replace(/\s+/g, " ").trim() };
}

function gerarEmail(first, last1, domain = "example.mx") {
  const n = randInt(10, 99);
  return `${slug(first)}.${slug(last1)}${n}@${domain}`;
}

/* ========= Gerar registro ========= */
function gerarPessoaMX(opts = {}) {
  const {
    docMode = "auto",
    emailDomain = "example.mx",
    clienteArriba = "1320",
    nomePrefix = ""
  } = opts;

  const nome = gerarNomeCompleto(nomePrefix);
  const doc = resolveDocumentoBR(docMode);
  const nascimento = gerarNascimento();
  const email = gerarEmail(nome.first, nome.last1, emailDomain);
  const tel = gerarTelefoneMX();
  const end = gerarEnderecoMX();

  return {
    nome: nome.full,
    primeiro_nome: nome.first,
    sobrenome_1: nome.last1,
    sobrenome_2: nome.last2,

    doc_tipo: doc.tipo,
    cpf_cnpj: doc.valor,

    dt_nascimento: nascimento,
    email,
    telefone: tel,

    endereco: end.completo,
    rua: end.rua,
    numero: end.numero,
    colonia: end.colonia,
    municipio: end.municipio,
    estado: end.estado,
    cp: end.cp,

    arriba_cliente: clienteArriba
  };
}

/* ========= Preview (tabela) ========= */
function renderPreview(list) {
  const tbody = safeEl("previewTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const frag = document.createDocumentFragment();

  list.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(p.nome)}</td>
      <td>${escapeHtml(p.doc_tipo)}</td>
      <td>${escapeHtml(p.cpf_cnpj)}</td>
      <td>${escapeHtml(p.dt_nascimento)}</td>
      <td>${escapeHtml(p.email)}</td>
      <td>${escapeHtml(p.telefone)}</td>
      <td>${escapeHtml(p.endereco)}</td>
    `;
    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ========= Export: JSON e CSV ========= */
function buildJSON(list) {
  return JSON.stringify(list, null, 2);
}

function buildCSV(list) {
  const headers = [
    "Nome","Doc_Tipo","Cpf_Cnpj","Dt_Nascimento","Email","Telefone",
    "Endereco","Rua","Numero","Colonia","Municipio","Estado","CP","Cliente_Arriba"
  ];
  const rows = list.map(p => ([
    p.nome, p.doc_tipo, p.cpf_cnpj, p.dt_nascimento, p.email, p.telefone,
    p.endereco, p.rua, p.numero, p.colonia, p.municipio, p.estado, p.cp, p.arriba_cliente
  ]));
  return toCSV(headers, rows);
}

/* ========= Export: Arriba Financiado (completo) =========
   Header pedido:
   Tipo_Registro;Nr_Contrato;Nome;Cpf_Cnpj;Cliente;Dt_Nascimento;Sexo;Tipo_Pessoa;Estado_Civil;Conjuge;Pai;Mae;Rg;Rg_Orgao_Emiss;Rg_Uf_Emiss;Rg_Dt_Emiss;Score_Serasa;Profissao;Renda;Score_Adicional
*/
function buildArribaFinanciadoCSV(list, cfg = {}) {
  const headers = [
    "Tipo_Registro","Nr_Contrato","Nome","Cpf_Cnpj","Cliente",
    "Dt_Nascimento","Sexo","Tipo_Pessoa","Estado_Civil","Conjuge","Pai","Mae",
    "Rg","Rg_Orgao_Emiss","Rg_Uf_Emiss","Rg_Dt_Emiss",
    "Score_Serasa","Profissao","Renda","Score_Adicional"
  ];

  // se você quiser encaixar com o seu nr_contrato gerado em outro lugar,
  // dá pra passar cfg.makeNrContrato(i) aqui
  const makeNrContrato = cfg.makeNrContrato || ((i) => `MX-${padLeft(i + 1, 6)}`);

  const clienteDefault = cfg.cliente || "1320";

  const rows = list.map((p, i) => ([
    "2",
    makeNrContrato(i),
    p.nome,
    p.cpf_cnpj,
    clienteDefault || p.arriba_cliente,

    p.dt_nascimento,
    "",         // Sexo (opcional)
    "",         // Tipo_Pessoa (opcional no layout completo; no seu caso você pode usar F/J se quiser)
    "",         // Estado_Civil
    "",         // Conjuge
    "",         // Pai
    "",         // Mae
    "",         // Rg
    "",         // Rg_Orgao_Emiss
    "",         // Rg_Uf_Emiss
    "",         // Rg_Dt_Emiss
    "",         // Score_Serasa
    "",         // Profissao
    "",         // Renda
    ""          // Score_Adicional
  ]));

  return toCSV(headers, rows);
}

/* ========= Controller ========= */
function getOptions() {
  return {
    nPreview: Math.max(1, numVal("n_preview", 10)),
    nExport: Math.max(1, numVal("n_export", 100)),
    docMode: (val("doc_mode", "auto") || "auto").toLowerCase(),
    emailDomain: val("email_domain", "example.mx") || "example.mx",
    clienteArriba: val("seed_cliente", "1320") || "1320",
    nomePrefix: val("seed_nome_prefix", "") || ""
  };
}

function gerarLista(qtd, opts) {
  const list = [];
  for (let i = 0; i < qtd; i++) list.push(gerarPessoaMX(opts));
  return list;
}

function setOutputs(jsonText, csvText) {
  const outJ = safeEl("outJSON");
  const outC = safeEl("outCSV");
  if (outJ) outJ.value !== undefined ? (outJ.value = jsonText) : (outJ.textContent = jsonText);
  if (outC) outC.value !== undefined ? (outC.value = csvText) : (outC.textContent = csvText);
}

/* ========= Wire events ========= */
function bind() {
  const btnGerarPreview = safeEl("btnGerarPreview");
  const btnCopiarJSON = safeEl("btnCopiarJSON");
  const btnCopiarCSV = safeEl("btnCopiarCSV");
  const btnBaixarJSON = safeEl("btnBaixarJSON");
  const btnBaixarCSV = safeEl("btnBaixarCSV");
  const btnBaixarArribaFin = safeEl("btnBaixarArribaFinanciado");

  // Estado em memória (pra copiar/baixar sem regenerar)
  let cachePreview = [];
  let cacheExport = [];

  function doPreview() {
    const o = getOptions();
    cachePreview = gerarLista(o.nPreview, o);
    renderPreview(cachePreview);

    // também gera saídas textuais do preview
    const j = buildJSON(cachePreview);
    const c = buildCSV(cachePreview);
    setOutputs(j, c);
  }

  function doExportEnsure() {
    const o = getOptions();
    cacheExport = gerarLista(o.nExport, o);
    return { o, list: cacheExport };
  }

  if (btnGerarPreview) btnGerarPreview.addEventListener("click", doPreview);

  if (btnCopiarJSON) btnCopiarJSON.addEventListener("click", async () => {
    const outJ = safeEl("outJSON");
    const text = outJ?.value ?? outJ?.textContent ?? "";
    await copyToClipboard(text);
  });

  if (btnCopiarCSV) btnCopiarCSV.addEventListener("click", async () => {
    const outC = safeEl("outCSV");
    const text = outC?.value ?? outC?.textContent ?? "";
    await copyToClipboard(text);
  });

  if (btnBaixarJSON) btnBaixarJSON.addEventListener("click", () => {
    const { list } = doExportEnsure();
    downloadText("massa_mx.json", buildJSON(list), "application/json;charset=utf-8;");
  });

  if (btnBaixarCSV) btnBaixarCSV.addEventListener("click", () => {
    const { list } = doExportEnsure();
    downloadText("massa_mx.csv", buildCSV(list), "text/csv;charset=utf-8;");
  });

  if (btnBaixarArribaFin) btnBaixarArribaFin.addEventListener("click", () => {
    const { o, list } = doExportEnsure();
    const csv = buildArribaFinanciadoCSV(list, { cliente: o.clienteArriba });
    downloadText("arriba_financiado_mx.csv", csv, "text/csv;charset=utf-8;");
  });

  // gera preview automático ao abrir (se quiser, pode comentar)
  doPreview();
}

document.addEventListener("DOMContentLoaded", bind);
