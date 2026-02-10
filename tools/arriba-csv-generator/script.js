const SEP = ";";
const NL = "\r\n";

/* ===== Headers (travados no layout) ===== */
const HEADERS = {
  parcela: [
    "Tipo_Registro","Nr_Contrato","Dt_Vencimento","Tipo_Parcela","Nr_Parcela","Vl_Original","Vl_Saldo",
    "Vl_Tarifa","Cliente","Dt_Inclusao","Dt_Devolucao","Dt_Inibicao","Motivo","Dt_Notificacao",
    "Marcar_Dt_Lote","Dt_Lote","Documento","Cpf_Cnpj","Plano"
  ],
  financiado: [
    "Tipo_Registro","Nr_Contrato","Nome","Cpf_Cnpj","Cliente","Dt_Nascimento","Sexo","Tipo_Pessoa",
    "Estado_Civil","Conjuge","Pai","Mae","Rg","Rg_Orgao_Emiss","Rg_Uf_Emiss","Rg_Dt_Emiss",
    "Score_Serasa","Profissao","Renda","Score_Adicional"
  ],
  contrato: [
    "Tipo_Registro","Cliente","Nr_Contrato","Filial","Plano","Fase","Regional","Regua","Vl_Contrato","Dt_Contrato",
    "Tx_Contrato","Dt_Para_Notificacao","Dt_Solicitacao_Documento","Dt_Ajuizamento","Cod_Loja","Grupo",
    "Moeda","SubRegua","Cpf_Cnpj"
  ],
};

/* ========= Utils ========= */
function padLeft(num, size) {
  const s = String(num);
  return s.length >= size ? s : "0".repeat(size - s.length) + s;
}
function makeNrContrato(i, start, pad, suffix) {
  return `${padLeft(i + start, pad)}${suffix}`;
}
function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function csv(headers, rows) {
  return [headers.join(SEP), ...rows.map(r => r.join(SEP))].join(NL);
}

/* ========= Defaults parser (pretos) =========
   Formato:
   Coluna=Valor
   Coluna=
*/
function parseDefaults(text) {
  const out = {};
  (text || "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .forEach(line => {
      const idx = line.indexOf("=");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1); // mantém espaços do valor
      if (key) out[key] = val;
    });
  return out;
}

/* ========= CPF / CNPJ ========= */
function randomDigit() { return Math.floor(Math.random() * 10); }

function gerarCPF(raw = true) {
  let nums = Array.from({ length: 9 }, randomDigit);

  let d1 = nums.reduce((s, n, i) => s + n * (10 - i), 0) % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;

  let d2 = [...nums, d1].reduce((s, n, i) => s + n * (11 - i), 0) % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;

  const cpf = [...nums, d1, d2].join("");
  if (raw) return cpf;
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

function gerarCNPJ(raw = true) {
  let nums = Array.from({ length: 12 }, randomDigit);

  const calc = (base, weights) =>
    base.reduce((s, n, i) => s + n * weights[i], 0) % 11;

  let d1 = calc(nums, [5,4,3,2,9,8,7,6,5,4,3,2]);
  d1 = d1 < 2 ? 0 : 11 - d1;

  let d2 = calc([...nums, d1], [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  d2 = d2 < 2 ? 0 : 11 - d2;

  const cnpj = [...nums, d1, d2].join("");
  if (raw) return cnpj;
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function resolveDocumento(type, rawOut) {
  if (type === "cpf") return gerarCPF(rawOut);
  if (type === "cnpj") return gerarCNPJ(rawOut);
  if (type === "auto") return Math.random() > 0.5 ? gerarCPF(rawOut) : gerarCNPJ(rawOut);
  return "";
}

/* ========= Inputs ========= */
function getInputs() {
  return {
    n: +document.getElementById("n").value,
    start: +document.getElementById("start").value,
    pad: +document.getElementById("pad").value,
    suffix: document.getElementById("suffix").value || "-ARRIBA",

    docType: document.getElementById("docType")?.value || "none",
    docFormat: document.getElementById("docFormat")?.value || "raw",

    contrato: {
      cliente: document.getElementById("contrato_cliente").value || "1320",
      fase: document.getElementById("contrato_fase").value || "AM",
      defaults: parseDefaults(document.getElementById("contrato_defaults")?.value || ""),
    },

    financiado: {
      cliente: document.getElementById("fin_cliente").value || "1320",
      nomePrefix: document.getElementById("fin_nome_prefix").value || "Cliente Generico",
      tipoPessoa: document.getElementById("fin_tipo_pessoa").value || "Fisica",
      defaults: parseDefaults(document.getElementById("fin_defaults")?.value || ""),
    },

    parcela: {
      dtVenc: document.getElementById("parc_dt_venc").value,
      tipoParc: document.getElementById("parc_tipo").value,
      nrParc: document.getElementById("parc_nr").value,
      vlIni: +document.getElementById("parc_vl_ini").value,
      vlStep: +document.getElementById("parc_vl_step").value,
      defaults: parseDefaults(document.getElementById("parc_defaults")?.value || ""),
    }
  };
}

/* ========= Montagem de linha por header ========= */
function buildRowFromHeaders(headers, baseMap) {
  return headers.map(h => (baseMap[h] ?? "")); // vazio se não existir
}

/* ========= Geradores ========= */
function gerarContrato(x) {
  const headers = HEADERS.contrato;
  const rows = [];

  for (let i = 0; i < x.n; i++) {
    const nr = makeNrContrato(i, x.start, x.pad, x.suffix);

    // defaults (pretos)
    const map = { ...x.contrato.defaults };

    // obrigatórios (vermelhos) + tipo registro
    map["Tipo_Registro"] = "6";
    map["Cliente"] = x.contrato.cliente;
    map["Nr_Contrato"] = nr;
    map["Fase"] = x.contrato.fase;

    rows.push(buildRowFromHeaders(headers, map));
  }
  return csv(headers, rows);
}

function gerarFinanciado(x) {
  const headers = HEADERS.financiado;
  const rows = [];

  const rawOut = (x.docFormat !== "pretty"); // raw = somente números

  for (let i = 0; i < x.n; i++) {
    const nr = makeNrContrato(i, x.start, x.pad, x.suffix);

    const map = { ...x.financiado.defaults };

    map["Tipo_Registro"] = "2";
    map["Nr_Contrato"] = nr;
    map["Nome"] = `${x.financiado.nomePrefix} ${padLeft(i + x.start, x.pad)}`;
    map["Cliente"] = x.financiado.cliente;

    // Tipo_Pessoa obrigatório
    map["Tipo_Pessoa"] = x.financiado.tipoPessoa;

    // CPF/CNPJ opcional (mas está no “vermelho” do seu layout, então a UI controla)
    map["Cpf_Cnpj"] = resolveDocumento(x.docType, rawOut);

    rows.push(buildRowFromHeaders(headers, map));
  }
  return csv(headers, rows);
}

function gerarParcela(x) {
  const headers = HEADERS.parcela;
  const rows = [];

  for (let i = 0; i < x.n; i++) {
    const nr = makeNrContrato(i, x.start, x.pad, x.suffix);
    const vl = x.parcela.vlIni + x.parcela.vlStep * i;

    const map = { ...x.parcela.defaults };

    map["Tipo_Registro"] = "7";
    map["Nr_Contrato"] = nr;
    map["Dt_Vencimento"] = x.parcela.dtVenc;
    map["Tipo_Parcela"] = x.parcela.tipoParc;
    map["Nr_Parcela"] = x.parcela.nrParc;

    map["Vl_Original"] = String(vl);
    map["Vl_Saldo"] = String(vl); // regra: saldo = original

    // se você quiser a regra “Dt_Inclusao = Dt_Vencimento” por padrão, dá pra forçar:
    if (map["Dt_Inclusao"] === undefined || map["Dt_Inclusao"] === "") {
      map["Dt_Inclusao"] = x.parcela.dtVenc;
    }

    rows.push(buildRowFromHeaders(headers, map));
  }
  return csv(headers, rows);
}

/* ========= Eventos ========= */
document.getElementById("btnContrato").onclick = () => {
  const x = getInputs();
  downloadText("contrato.csv", gerarContrato(x));
};

document.getElementById("btnFinanciado").onclick = () => {
  const x = getInputs();
  downloadText("financiado.csv", gerarFinanciado(x));
};

document.getElementById("btnParcela").onclick = () => {
  const x = getInputs();
  downloadText("parcela.csv", gerarParcela(x));
};

document.getElementById("btnTodos").onclick = () => {
  const x = getInputs();
  downloadText("contrato.csv", gerarContrato(x));
  downloadText("financiado.csv", gerarFinanciado(x));
  downloadText("parcela.csv", gerarParcela(x));
};
