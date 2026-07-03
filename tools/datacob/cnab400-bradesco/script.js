/* =====================================================================
   CNAB 400 - Bradesco (237) | Gerador + Leitor/Validador de Retorno
   Layout v05 (4008_0008). Processamento 100% no navegador.

   PRINCÍPIO CENTRAL
   -----------------
   As posições do manual são 1-indexadas e inclusivas ("071 a 082").
   Em JS, string.slice() é 0-indexado e exclusivo no fim.
   Logo, para um campo "ini a fim":  linha.slice(ini - 1, fim)
   Esse ajuste fica isolado em uma única função (fld) para nunca errar.
   ===================================================================== */

"use strict";

/* ---------------------------------------------------------------------
   1) DICIONÁRIO DE CAMPOS — fonte única de verdade.
   type: 'N' numérico (zeros à esquerda) | 'A' alfanumérico (espaços à direita)
   Usado tanto para PARSEAR (ler) quanto para GERAR (escrever).
   --------------------------------------------------------------------- */

// HEADER - Registro 0 (Arquivo-Retorno)
const HEADER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",     nome: "Identificação do Registro",     type: "N", fixo: "0" },
  { ini: 2,   fim: 2,   key: "idArquivo",      nome: "Identificação Arquivo Retorno", type: "N", fixo: "2" },
  { ini: 3,   fim: 9,   key: "literalRetorno", nome: "Literal Retorno",               type: "A", fixo: "RETORNO" },
  { ini: 10,  fim: 11,  key: "codServico",     nome: "Código do Serviço",             type: "N", fixo: "01" },
  { ini: 12,  fim: 26,  key: "literalServico", nome: "Literal Serviço",               type: "A", fixo: "COBRANCA" },
  { ini: 27,  fim: 46,  key: "codEmpresa",     nome: "Código da Empresa",             type: "N" },
  { ini: 47,  fim: 76,  key: "nomeEmpresa",    nome: "Nome da Empresa",               type: "A" },
  { ini: 77,  fim: 79,  key: "numBradesco",    nome: "Nº Bradesco (Compensação)",     type: "N", fixo: "237" },
  { ini: 80,  fim: 94,  key: "nomeBanco",      nome: "Nome do Banco",                 type: "A", fixo: "BRADESCO" },
  { ini: 95,  fim: 100, key: "dataGravacao",   nome: "Data da Gravação",              type: "N", fmt: "data" },
  { ini: 101, fim: 108, key: "densidade",      nome: "Densidade de Gravação",         type: "N", fixo: "01600000" },
  { ini: 109, fim: 113, key: "avisoBancario",  nome: "Nº Aviso Bancário",             type: "N" },
  { ini: 114, fim: 379, key: "branco1",        nome: "Branco",                        type: "A" },
  { ini: 380, fim: 385, key: "dataCredito",    nome: "Data do Crédito",               type: "N", fmt: "data" },
  { ini: 386, fim: 394, key: "branco2",        nome: "Branco",                        type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",    nome: "Nº Seqüencial do Registro",     type: "N", fixo: "000001" }
];

// DETALHE - Registro 1 (Transação - Retorno). Mapa completo das 400 posições.
const DETALHE_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",      nome: "Identificação do Registro",  type: "N", fixo: "1" },
  { ini: 2,   fim: 3,   key: "tipoInscEmpresa", nome: "Tipo Inscrição Empresa",     type: "N" },
  { ini: 4,   fim: 17,  key: "numInscEmpresa",  nome: "Nº Inscrição Empresa",       type: "N" },
  { ini: 18,  fim: 20,  key: "zeros1",          nome: "Zeros",                      type: "N" },
  { ini: 21,  fim: 37,  key: "idEmpresaBanco",  nome: "Ident. Empresa no Banco",    type: "N" },
  { ini: 38,  fim: 62,  key: "controleParticip",nome: "Nº Controle do Participante",type: "A" },
  { ini: 63,  fim: 70,  key: "zeros2",          nome: "Zeros",                      type: "N" },
  { ini: 71,  fim: 82,  key: "nossoNumero",     nome: "Identificação do Título no Banco (Nosso Número)", type: "A" },
  { ini: 83,  fim: 92,  key: "usoBanco1",       nome: "Uso do Banco",               type: "A" },
  { ini: 93,  fim: 104, key: "usoBanco2",       nome: "Uso do Banco",               type: "N" },
  { ini: 105, fim: 105, key: "indRateio",       nome: "Indicador de Rateio Crédito",type: "A" },
  { ini: 106, fim: 107, key: "zeros3",          nome: "Zeros",                      type: "N" },
  { ini: 108, fim: 108, key: "carteira",        nome: "Carteira",                   type: "N" },
  { ini: 109, fim: 110, key: "ocorrencia",      nome: "Identificação de Ocorrência",type: "N" },
  { ini: 111, fim: 116, key: "dataOcorrencia",  nome: "Data Ocorrência no Banco",   type: "N", fmt: "data" },
  { ini: 117, fim: 126, key: "numDocumento",    nome: "Número do Documento",        type: "A" },
  { ini: 127, fim: 146, key: "idTituloBanco20", nome: "Ident. Título no Banco",     type: "A" },
  { ini: 147, fim: 152, key: "dataVencimento",  nome: "Data Vencimento do Título",  type: "N", fmt: "data" },
  { ini: 153, fim: 165, key: "valorTitulo",     nome: "Valor do Título",            type: "N", fmt: "valor" },
  { ini: 166, fim: 168, key: "bancoCobrador",   nome: "Banco Cobrador",             type: "N" },
  { ini: 169, fim: 173, key: "agenciaCobradora",nome: "Agência Cobradora",          type: "N" },
  { ini: 174, fim: 175, key: "especieTitulo",   nome: "Espécie do Título",          type: "A" },
  { ini: 176, fim: 188, key: "despesasCobranca",nome: "Despesas de Cobrança",       type: "N", fmt: "valor" },
  { ini: 189, fim: 201, key: "outrasDespesas",  nome: "Outras Despesas / Custas",   type: "N", fmt: "valor" },
  { ini: 202, fim: 214, key: "jurosAtraso",     nome: "Juros Operação em Atraso",   type: "N", fmt: "valor" },
  { ini: 215, fim: 227, key: "iofDevido",       nome: "IOF Devido",                 type: "N", fmt: "valor" },
  { ini: 228, fim: 240, key: "abatimento",      nome: "Abatimento Concedido",       type: "N", fmt: "valor" },
  { ini: 241, fim: 253, key: "descontoConc",    nome: "Desconto Concedido",         type: "N", fmt: "valor" },
  { ini: 254, fim: 266, key: "valorPago",       nome: "Valor Pago",                 type: "N", fmt: "valor" },
  { ini: 267, fim: 279, key: "jurosMora",       nome: "Juros de Mora",              type: "N", fmt: "valor" },
  { ini: 280, fim: 292, key: "outrosCreditos",  nome: "Outros Créditos",            type: "N", fmt: "valor" },
  { ini: 293, fim: 294, key: "brancos1",        nome: "Brancos",                    type: "A" },
  { ini: 295, fim: 295, key: "motivoProtesto",  nome: "Motivo Ocorrência 19",       type: "A" },
  { ini: 296, fim: 301, key: "dataCredito",     nome: "Data do Crédito",            type: "N", fmt: "data" },
  { ini: 302, fim: 304, key: "origemPagamento", nome: "Origem Pagamento",           type: "A" },
  { ini: 305, fim: 314, key: "brancos2",        nome: "Brancos",                    type: "A" },
  { ini: 315, fim: 318, key: "codBancoCheque",  nome: "Banco do Cheque (0237)",     type: "N" },
  { ini: 319, fim: 328, key: "motivosRejeicao", nome: "Motivos das Rejeições",      type: "A" },
  { ini: 329, fim: 368, key: "brancos3",        nome: "Brancos",                    type: "A" },
  { ini: 369, fim: 370, key: "numCartorio",     nome: "Número do Cartório",         type: "N" },
  { ini: 371, fim: 380, key: "numProtocolo",    nome: "Número do Protocolo",        type: "N" },
  { ini: 381, fim: 394, key: "brancos4",        nome: "Brancos",                    type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",     nome: "Nº Seqüencial de Registro",  type: "N" }
];

/* ---------------------------------------------------------------------
   2) TABELAS DE DOMÍNIO (Ocorrências e Motivos de rejeição)
   --------------------------------------------------------------------- */

const OCORRENCIAS = {
  "02": "Entrada Confirmada",
  "03": "Entrada Rejeitada",
  "06": "Liquidação Normal",
  "09": "Baixado Automaticamente via Arquivo",
  "10": "Baixado conforme instruções da Agência",
  "11": "Em Ser (Títulos pendentes)",
  "12": "Abatimento Concedido",
  "13": "Abatimento Cancelado",
  "14": "Vencimento Alterado",
  "15": "Liquidação em Cartório",
  "16": "Título Pago em Cheque (Vinculado)",
  "17": "Liquidação após baixa / não registrado",
  "18": "Acerto de Depositária",
  "19": "Confirmação Receb. Instrução de Protesto",
  "20": "Confirmação Receb. Instrução Sustação Protesto",
  "21": "Acerto do Controle do Participante",
  "22": "Título com Pagamento Cancelado",
  "23": "Entrada do Título em Cartório",
  "24": "Entrada Rejeitada por CEP Irregular",
  "27": "Baixa Rejeitada",
  "28": "Débito de Tarifas / Custas",
  "30": "Alteração de Outros Dados Rejeitados",
  "32": "Instrução Rejeitada",
  "33": "Confirmação Pedido Alteração Outros Dados",
  "34": "Retirado de Cartório e Manutenção Carteira",
  "35": "Desagendamento do Débito Automático",
  "40": "Estorno de Pagamento",
  "55": "Sustado Judicial",
  "68": "Acerto dos dados do Rateio de Crédito",
  "69": "Cancelamento dos dados do Rateio"
};

// Quais ocorrências têm motivo na posição 319-328 (vs. "sem motivo")
const OCORRENCIA_COM_MOTIVO = ["02", "03", "09", "10", "24", "27", "28", "30", "32", "35"];

// Motivos mais comuns (não exaustivo — varia por ocorrência). Usado só como ajuda visual.
const MOTIVOS = {
  "00": "Ocorrência aceita / Título pago em dinheiro",
  "01": "Código do Banco inválido",
  "04": "Cód. movimento não permitido p/ carteira",
  "08": "Nosso número inválido",
  "09": "Nosso número duplicado",
  "10": "Carteira inválida",
  "15": "Título pago com cheque / Características incompatíveis",
  "16": "Data de vencimento inválida",
  "17": "Venc. anterior à emissão",
  "20": "Valor do título inválido",
  "21": "Espécie do título inválida",
  "24": "Data de emissão inválida",
  "46": "Tipo/nº de inscrição do sacado inválidos",
  "48": "CEP inválido",
  "63": "Entrada para título já cadastrado"
};

/* ---------------------------------------------------------------------
   3) HELPERS DE BAIXO NÍVEL (slice posicional + conversões)
   --------------------------------------------------------------------- */

// Extrai um campo da linha respeitando o ajuste 1-indexado → slice.
function fld(line, def) {
  return line.slice(def.ini - 1, def.fim);
}

// "0000000015000" (13, 2 decimais implícitas) -> 150.00 (number)
function parseValor(raw) {
  const digits = (raw || "").replace(/\D/g, "") || "0";
  return parseInt(digits, 10) / 100;
}

// 150.00 -> "0000000015000" preenchido em `size` posições, sem ponto/vírgula
function formatValor(value, size) {
  const cents = Math.round((Number(value) || 0) * 100);
  return String(cents).padStart(size, "0").slice(-size);
}

// "DDMMAA" -> "DD/MM/AAAA"  (pivô de século: <=70 => 2000+, senão 1900+)
function parseData(raw) {
  if (!raw || !/^\d{6}$/.test(raw) || raw === "000000") return "";
  const dd = raw.slice(0, 2), mm = raw.slice(2, 4), aa = parseInt(raw.slice(4, 6), 10);
  const yyyy = aa <= 70 ? 2000 + aa : 1900 + aa;
  // validação leve
  if (+dd < 1 || +dd > 31 || +mm < 1 || +mm > 12) return raw; // devolve cru se suspeito
  return `${dd}/${mm}/${yyyy}`;
}

// "AAAA-MM-DD" (input date) -> "DDMMAA"
function formatData(isoDate) {
  if (!isoDate) return "000000";
  const [y, m, d] = isoDate.split("-");
  return `${d}${m}${y.slice(-2)}`;
}

// preenche um campo conforme o tipo (N = zeros à esq., A = espaços à dir.)
function padField(value, def) {
  const size = def.fim - def.ini + 1;
  let v = (value === undefined || value === null) ? "" : String(value);
  if (def.type === "N") {
    v = v.replace(/\D/g, "");
    return v.padStart(size, "0").slice(-size);
  }
  // alfanumérico: caixa alta, espaços à direita, trunca
  v = v.toUpperCase();
  return v.padEnd(size, " ").slice(0, size);
}

/* =====================================================================
   4) PARSER (LEITURA) — recebe o texto e devolve estrutura validada
   ===================================================================== */

function parseRetorno(text) {
  // normaliza: separa por quebras, remove vazias, remove CR/LF e o finalizador 0x1A
  const lines = text
    .replace(/\u001a/g, "")
    .split(/\r\n|\r|\n/)
    .filter(l => l.length > 0);

  if (lines.length === 0) throw new Error("Arquivo vazio.");

  const result = { header: null, titulos: [], trailer: null, avisos: [], totalLinhas: lines.length };

  lines.forEach((line, idx) => {
    // aviso (não bloqueante) se a linha não tiver 400 caracteres
    if (line.length !== 400) {
      result.avisos.push(`Linha ${idx + 1}: tem ${line.length} caracteres (esperado 400).`);
    }
    const tipo = line.charAt(0);

    if (idx === 0 || tipo === "0") {
      result.header = parseHeader(line, result);
    } else if (tipo === "1") {
      result.titulos.push(parseDetalhe(line, idx + 1));
    } else if (tipo === "9") {
      result.trailer = { quantidadeTitulos: line.slice(17, 25), seqRegistro: line.slice(394, 400) };
    }
    // tipo 3 (rateio) é ignorado nesta versão de suporte
  });

  return result;
}

function parseHeader(line, result) {
  const h = {};
  HEADER_FIELDS.forEach(def => {
    const raw = fld(line, def);
    if (def.fmt === "data") h[def.key] = parseData(raw);
    else h[def.key] = raw.trim();
  });

  // VALIDAÇÃO dos campos fixos do Header
  const checks = [
    ["idRegistro", "0"], ["idArquivo", "2"], ["literalRetorno", "RETORNO"],
    ["codServico", "01"], ["numBradesco", "237"]
  ];
  h._valido = true;
  h._erros = [];
  checks.forEach(([key, esperado]) => {
    if (String(h[key]).toUpperCase() !== esperado) {
      h._valido = false;
      h._erros.push(`Campo "${key}" = "${h[key]}" (esperado "${esperado}")`);
    }
  });
  // "COBRANCA" pode vir com acento/variação — checagem tolerante
  if (!/COBRAN/.test(String(h.literalServico).toUpperCase())) {
    h._valido = false;
    h._erros.push(`Literal Serviço inesperado: "${h.literalServico}"`);
  }
  return h;
}

function parseDetalhe(line, numLinha) {
  const t = { _linha: numLinha };
  DETALHE_FIELDS.forEach(def => {
    const raw = fld(line, def);
    if (def.fmt === "valor") t[def.key] = parseValor(raw);
    else if (def.fmt === "data") t[def.key] = parseData(raw);
    else t[def.key] = raw.trim();
  });
  t.ocorrenciaDesc = OCORRENCIAS[t.ocorrencia] || "Desconhecida";
  // motivos: 5 pares de 2 dígitos (319-328) — só interpreta se a ocorrência os usa
  t.motivosList = [];
  if (OCORRENCIA_COM_MOTIVO.includes(t.ocorrencia)) {
    const raw = t.motivosRejeicao.padEnd(10, "0");
    for (let i = 0; i < 10; i += 2) {
      const cod = raw.slice(i, i + 2);
      if (cod && cod !== "00" || (i === 0)) {
        if (/^\d{2}$/.test(cod)) t.motivosList.push({ cod, desc: MOTIVOS[cod] || "—" });
      }
    }
  }
  return t;
}

/* =====================================================================
   5) GERADOR (ESCRITA) — monta linhas de exatamente 400 caracteres
   ===================================================================== */

// Cria uma linha-base de 400 posições já com os defaults por tipo de cada campo.
function buildLine(fieldDefs, values) {
  let line = "";
  fieldDefs.forEach(def => {
    const v = def.fixo !== undefined ? def.fixo
            : (values[def.key] !== undefined ? values[def.key] : "");
    line += padField(v, def);
  });
  if (line.length !== 400) {
    // salvaguarda: corrige eventual desalinhamento do mapa
    line = line.padEnd(400, " ").slice(0, 400);
  }
  return line;
}

function gerarHeader(cfg) {
  return buildLine(HEADER_FIELDS, {
    codEmpresa: cfg.codEmpresa,
    nomeEmpresa: cfg.nomeEmpresa,
    dataGravacao: formatData(cfg.dataGravacao),
    avisoBancario: cfg.aviso,
    dataCredito: formatData(cfg.dataCredito)
  });
}

function gerarDetalhe(titulo, seq) {
  return buildLine(DETALHE_FIELDS, {
    nossoNumero: titulo.nossoNumero,
    carteira: titulo.carteira,
    ocorrencia: titulo.ocorrencia,
    dataOcorrencia: formatData(titulo.dataCredito || titulo.dataVencimento),
    numDocumento: titulo.numDocumento,
    dataVencimento: formatData(titulo.dataVencimento),
    valorTitulo: formatValor(titulo.valorTitulo, 13),
    bancoCobrador: "237",
    valorPago: formatValor(titulo.valorPago, 13),
    dataCredito: formatData(titulo.dataCredito),
    motivosRejeicao: titulo.motivos || "",
    seqRegistro: String(seq).padStart(6, "0")
  });
}

function gerarTrailer(qtdTitulos, valorTotal, seq) {
  let line = "9237".padEnd(0); // placeholder, montamos por posição abaixo
  // construímos manualmente as posições principais do trailer 9
  line = "9".padEnd(1);                       // 1: id registro
  line += "2";                                // 2: id retorno
  line += "01";                               // 3-4: tipo registro
  line += "237";                              // 5-7: banco
  line += " ".repeat(10);                     // 8-17: brancos
  line += String(qtdTitulos).padStart(8, "0");// 18-25: qtd títulos
  line += formatValor(valorTotal, 14);        // 26-39: valor total
  line = line.padEnd(394, " ");               // 40-394: demais campos zerados/brancos p/ teste
  line += String(seq).padStart(6, "0");       // 395-400: seq
  return line.padEnd(400, " ").slice(0, 400);
}

function gerarArquivo(cfg, titulos) {
  const linhas = [gerarHeader(cfg)];
  let seq = 1;
  let total = 0;
  titulos.forEach(t => {
    seq++;
    total += Number(t.valorPago || t.valorTitulo || 0);
    linhas.push(gerarDetalhe(t, seq));
  });
  seq++;
  linhas.push(gerarTrailer(titulos.length, total, seq));
  return linhas;
}

/* =====================================================================
   6) UI WIRING
   ===================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // modo (leitor/gerador)
  document.querySelectorAll("[data-mode]").forEach(btn => {
    btn.addEventListener("click", () => switchMode(btn.dataset.mode, btn));
  });
  // abas do resultado
  document.querySelectorAll("[data-rtab]").forEach(btn => {
    btn.addEventListener("click", () => switchResultTab(btn.dataset.rtab));
  });

  // ---- Leitor ----
  const dz = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  dz.addEventListener("click", () => fileInput.click());
  dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("drag"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
  dz.addEventListener("drop", e => {
    e.preventDefault(); dz.classList.remove("drag");
    if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", e => { if (e.target.files[0]) readFile(e.target.files[0]); });

  document.getElementById("btnParse").addEventListener("click", runParse);
  document.getElementById("btnExampleRet").addEventListener("click", loadExample);
  document.getElementById("btnClearReader").addEventListener("click", clearReader);
  document.getElementById("btnCsv").addEventListener("click", exportCsv);

  // ---- Gerador ----
  document.getElementById("btnAddRow").addEventListener("click", () => addDetRow());
  document.getElementById("btnGenerate").addEventListener("click", runGenerate);
  document.getElementById("btnDownload").addEventListener("click", downloadFile);
  document.getElementById("btnCopyGen").addEventListener("click", copyGen);

  // defaults de data = hoje
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("genDataGravacao").value = today;
  document.getElementById("genDataCredito").value = today;
  addDetRow(); // primeira linha
});

function switchMode(mode, btn) {
  document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active", b === btn));
  document.getElementById("mode-reader").classList.toggle("hidden", mode !== "reader");
  document.getElementById("mode-generator").classList.toggle("hidden", mode !== "generator");
}

function switchResultTab(tab) {
  document.querySelectorAll("[data-rtab]").forEach(b => b.classList.toggle("active", b.dataset.rtab === tab));
  document.getElementById("rtab-table").classList.toggle("hidden", tab !== "table");
  document.getElementById("rtab-header").classList.toggle("hidden", tab !== "header");
  document.getElementById("rtab-json").classList.toggle("hidden", tab !== "json");
}

/* ---------------- Leitor: I/O ---------------- */

let lastParsed = null;

function readFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("rawInput").value = reader.result;
    runParse();
  };
  // CNAB micro-a-micro é ASCII/Latin-1
  reader.readAsText(file, "ISO-8859-1");
}

function runParse() {
  const text = document.getElementById("rawInput").value;
  if (!text.trim()) { setReaderMsg("Cole o conteúdo ou envie um arquivo.", "error"); return; }

  try {
    const data = parseRetorno(text);
    lastParsed = data;
    renderResult(data);

    // chips
    document.getElementById("chipLines").textContent = data.totalLinhas;
    document.getElementById("chipTitulos").textContent = data.titulos.length;
    document.getElementById("chipEmpresa").textContent = data.header ? (data.header.nomeEmpresa || "-") : "-";

    const hValid = data.header && data.header._valido;
    const chipH = document.getElementById("chipHeader");
    chipH.innerHTML = hValid
      ? '<span class="pill ok">Válido</span>'
      : '<span class="pill bad">Inválido</span>';

    let msg = `Arquivo lido: ${data.titulos.length} título(s) extraído(s).`;
    let kind = "ok";
    if (!hValid) {
      kind = "error";
      msg = "Header inválido — " + data.header._erros.join("; ");
    } else if (data.avisos.length) {
      kind = "ok";
      msg += " Avisos: " + data.avisos.slice(0, 3).join(" ");
    }
    setReaderMsg(msg, kind);
    document.getElementById("resultSection").classList.remove("hidden");
  } catch (err) {
    setReaderMsg("Erro ao processar: " + err.message, "error");
  }
}

function renderResult(data) {
  // tabela de títulos
  const body = document.getElementById("retBody");
  body.innerHTML = "";
  data.titulos.forEach((t, i) => {
    const motivos = t.motivosList.length
      ? t.motivosList.map(m => `${m.cod} (${m.desc})`).join("<br>")
      : "—";
    const ocPill = t.ocorrencia === "06" ? "ok" : (["03", "27", "30", "32"].includes(t.ocorrencia) ? "bad" : "warn");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${esc(t.nossoNumero)}</td>
      <td>${esc(t.numDocumento)}</td>
      <td><span class="pill ${ocPill}">${esc(t.ocorrencia)}</span> ${esc(t.ocorrenciaDesc)}</td>
      <td>${esc(t.dataVencimento) || "—"}</td>
      <td class="num">${money(t.valorTitulo)}</td>
      <td class="num">${money(t.valorPago)}</td>
      <td>${esc(t.dataCredito) || "—"}</td>
      <td>${motivos}</td>`;
    body.appendChild(tr);
  });

  // aba header
  const hb = document.getElementById("headerBody");
  hb.innerHTML = "";
  if (data.header) {
    HEADER_FIELDS.forEach(def => {
      if (/^branco/.test(def.key)) return;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><strong>${def.nome}</strong><br><small style="color:var(--muted)">${def.ini}–${def.fim}</small></td><td>${esc(data.header[def.key])}</td>`;
      hb.appendChild(tr);
    });
  }

  // aba JSON
  const clean = {
    header: data.header,
    titulos: data.titulos.map(t => ({
      nossoNumero: t.nossoNumero, numDocumento: t.numDocumento,
      ocorrencia: t.ocorrencia, ocorrenciaDesc: t.ocorrenciaDesc,
      dataVencimento: t.dataVencimento, valorTitulo: t.valorTitulo,
      valorPago: t.valorPago, dataCredito: t.dataCredito,
      motivos: t.motivosList
    }))
  };
  document.getElementById("rtab-json").textContent = JSON.stringify(clean, null, 2);
}

function exportCsv() {
  if (!lastParsed || !lastParsed.titulos.length) return;
  const head = ["NossoNumero", "NumDocumento", "Ocorrencia", "Descricao", "Vencimento", "ValorTitulo", "ValorPago", "DataCredito", "Motivos"];
  const rows = lastParsed.titulos.map(t => [
    t.nossoNumero, t.numDocumento, t.ocorrencia, t.ocorrenciaDesc,
    t.dataVencimento, t.valorTitulo.toFixed(2), t.valorPago.toFixed(2),
    t.dataCredito, t.motivosList.map(m => m.cod).join(" ")
  ]);
  const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  download("\ufeff" + csv, "cnab400-retorno.csv", "text/csv;charset=utf-8");
}

function loadExample() {
  // Exemplo internamente consistente, montado pelas próprias funções de geração.
  // Inclui uma liquidação (06) e uma entrada rejeitada (03) com motivo.
  const cfg = { codEmpresa: "5213287", nomeEmpresa: "PH3A COMERCIO E SERVICOS DE TE", dataGravacao: "2024-11-08", aviso: "4", dataCredito: "2024-11-08" };
  const titulos = [
    { nossoNumero: "999080163762", carteira: "09", ocorrencia: "06", numDocumento: "266728", dataVencimento: "2024-11-06", valorTitulo: 52.56, valorPago: 52.56, dataCredito: "2024-11-07" },
    { nossoNumero: "999040135602", carteira: "09", ocorrencia: "02", numDocumento: "266729", dataVencimento: "2025-01-10", valorTitulo: 150.00, valorPago: 0, dataCredito: "" }
  ];
  document.getElementById("rawInput").value = gerarArquivo(cfg, titulos).join("\r\n");
  runParse();
}

function clearReader() {
  document.getElementById("rawInput").value = "";
  document.getElementById("resultSection").classList.add("hidden");
  ["chipLines", "chipTitulos", "chipEmpresa"].forEach(id => document.getElementById(id).textContent = "-");
  document.getElementById("chipHeader").textContent = "Aguardando";
  setReaderMsg("Aguardando arquivo de retorno.", "");
}

/* ---------------- Gerador: linhas dinâmicas ---------------- */

function addDetRow(preset = {}) {
  const wrap = document.getElementById("detRows");
  const row = document.createElement("div");
  row.className = "det-row";
  const ocOptions = ["02", "06", "09", "10", "15", "16", "17", "23", "28"]
    .map(c => `<option value="${c}">${c} — ${OCORRENCIAS[c] || ""}</option>`).join("");
  row.innerHTML = `
    <div><label>Nosso Número</label><input class="form-control" data-k="nossoNumero" value="${preset.nossoNumero || ""}"></div>
    <div><label>Carteira</label><input class="form-control" data-k="carteira" value="${preset.carteira || "09"}"></div>
    <div><label>Ocorrência</label><select class="form-select" data-k="ocorrencia">${ocOptions}</select></div>
    <div><label>Nº Documento</label><input class="form-control" data-k="numDocumento" value="${preset.numDocumento || ""}"></div>
    <div><label>Vencimento</label><input type="date" class="form-control" data-k="dataVencimento"></div>
    <div><label>Valor Título</label><input class="form-control" data-k="valorTitulo" placeholder="0,00" value="${preset.valorTitulo || ""}"></div>
    <div><label>Valor Pago</label><input class="form-control" data-k="valorPago" placeholder="0,00" value="${preset.valorPago || ""}"></div>
    <div><label>Data Crédito</label><input type="date" class="form-control" data-k="dataCredito"></div>
    <button type="button" class="det-remove" title="Remover"><i class="fa-solid fa-trash"></i></button>`;
  row.querySelector(".det-remove").addEventListener("click", () => row.remove());
  wrap.appendChild(row);
}

function collectGenerator() {
  const cfg = {
    codEmpresa: document.getElementById("genCodEmpresa").value.trim(),
    nomeEmpresa: document.getElementById("genNomeEmpresa").value.trim(),
    dataGravacao: document.getElementById("genDataGravacao").value,
    aviso: document.getElementById("genAviso").value.trim(),
    dataCredito: document.getElementById("genDataCredito").value
  };
  const titulos = [...document.querySelectorAll("#detRows .det-row")].map(row => {
    const o = {};
    row.querySelectorAll("[data-k]").forEach(el => {
      let v = el.value;
      if (el.dataset.k === "valorTitulo" || el.dataset.k === "valorPago") {
        v = parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0; // aceita 1.234,56
      }
      o[el.dataset.k] = v;
    });
    return o;
  });
  return { cfg, titulos };
}

function runGenerate() {
  const { cfg, titulos } = collectGenerator();
  const errs = [];
  if (!cfg.codEmpresa) errs.push("Código da Empresa é obrigatório.");
  if (!cfg.nomeEmpresa) errs.push("Nome da Empresa é obrigatório.");
  if (!cfg.dataGravacao) errs.push("Data da Gravação é obrigatória.");
  if (!titulos.length) errs.push("Adicione ao menos um título.");
  titulos.forEach((t, i) => {
    if (!t.nossoNumero) errs.push(`Título ${i + 1}: Nosso Número é obrigatório.`);
    if (!t.dataVencimento) errs.push(`Título ${i + 1}: Vencimento é obrigatório.`);
  });
  if (errs.length) { setGenMsg(errs.join(" "), "error"); return; }

  const linhas = gerarArquivo(cfg, titulos);
  const allOk = linhas.every(l => l.length === 400);
  document.getElementById("genPreview").textContent = linhas.join("\n");
  setGenMsg(
    `Arquivo gerado: ${linhas.length} linha(s). Comprimento das linhas: ${allOk ? "todas com 400 ✓" : "DIVERGENTE ✗"}.`,
    allOk ? "ok" : "error"
  );
  window.__cnabLinhas = linhas;
}

function downloadFile() {
  if (!window.__cnabLinhas) { setGenMsg("Gere o arquivo antes de baixar.", "error"); return; }
  const name = document.getElementById("genFileName").value.trim() || "CB-retorno-teste.RET";
  // CNAB micro-a-micro: registros separados por CRLF + finalizador 0x1A
  const content = window.__cnabLinhas.join("\r\n") + "\r\n\u001a";
  download(content, name, "text/plain");
}

function copyGen() {
  const txt = document.getElementById("genPreview").textContent;
  if (txt) navigator.clipboard.writeText(txt).then(() => setGenMsg("Conteúdo copiado.", "ok"));
}

/* ---------------- utilidades de UI ---------------- */

function setReaderMsg(msg, kind) {
  const el = document.getElementById("readerMsg");
  el.textContent = msg;
  el.className = "validation-msg" + (kind ? " " + kind : "");
}
function setGenMsg(msg, kind) {
  const el = document.getElementById("genMsg");
  el.textContent = msg;
  el.className = "validation-msg" + (kind ? " " + kind : "");
}
function money(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
function pad(s) { return s.padEnd(400, " ").slice(0, 400); }
function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
