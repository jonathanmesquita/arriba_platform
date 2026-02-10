const SEP = ";";
const NL = "\r\n";

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

/* ========= CPF / CNPJ ========= */
function randomDigit() {
  return Math.floor(Math.random() * 10);
}

function gerarCPF() {
  let nums = Array.from({ length: 9 }, randomDigit);

  let d1 = nums.reduce((s, n, i) => s + n * (10 - i), 0) % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;

  let d2 = [...nums, d1].reduce((s, n, i) => s + n * (11 - i), 0) % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;

  return [...nums, d1, d2].join("");
}

function gerarCNPJ() {
  let nums = Array.from({ length: 12 }, randomDigit);

  const calc = (base, weights) =>
    base.reduce((s, n, i) => s + n * weights[i], 0) % 11;

  let d1 = calc(nums, [5,4,3,2,9,8,7,6,5,4,3,2]);
  d1 = d1 < 2 ? 0 : 11 - d1;

  let d2 = calc([...nums, d1], [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  d2 = d2 < 2 ? 0 : 11 - d2;

  return [...nums, d1, d2].join("");
}

/* ========= Inputs ========= */
function getInputs() {
  return {
    n: +document.getElementById("n").value,
    start: +document.getElementById("start").value,
    pad: +document.getElementById("pad").value,
    suffix: document.getElementById("suffix").value || "-ARRIBA",
    docType: document.getElementById("docType")?.value || "none",

    contrato: {
      cliente: document.getElementById("contrato_cliente").value || "1320",
      fase: document.getElementById("contrato_fase").value || "AM",
    },

    financiado: {
      cliente: document.getElementById("fin_cliente").value || "1320",
      nomePrefix: document.getElementById("fin_nome_prefix").value || "Cliente Generico",
      tipoPessoa: document.getElementById("fin_tipo_pessoa").value || "Fisica",
    },

    parcela: {
      dtVenc: document.getElementById("parc_dt_venc").value,
      tipoParc: document.getElementById("parc_tipo").value,
      nrParc: document.getElementById("parc_nr").value,
      vlIni: +document.getElementById("parc_vl_ini").value,
      vlStep: +document.getElementById("parc_vl_step").value,
    }
  };
}

function resolveDocumento(type) {
  if (type === "cpf") return gerarCPF();
  if (type === "cnpj") return gerarCNPJ();
  if (type === "auto") return Math.random() > 0.5 ? gerarCPF() : gerarCNPJ();
  return "";
}

/* ========= Geradores ========= */
function gerarContrato(n, start, pad, suffix, cfg) {
  const headers = ["Tipo_Registro","Cliente","Nr_Contrato","Fase"];
  const rows = [];

  for (let i = 0; i < n; i++) {
    rows.push(["6", cfg.cliente, makeNrContrato(i,start,pad,suffix), cfg.fase]);
  }
  return csv(headers, rows);
}

function gerarFinanciado(n, start, pad, suffix, cfg, docType) {
  const headers = ["Tipo_Registro","Nr_Contrato","Nome","Cpf_Cnpj","Cliente","Tipo_Pessoa"];
  const rows = [];

  for (let i = 0; i < n; i++) {
    rows.push([
      "2",
      makeNrContrato(i,start,pad,suffix),
      `${cfg.nomePrefix} ${padLeft(i+start,pad)}`,
      resolveDocumento(docType),
      cfg.cliente,
      cfg.tipoPessoa
    ]);
  }
  return csv(headers, rows);
}

function gerarParcela(n, start, pad, suffix, cfg) {
  const headers = ["Tipo_Registro","Nr_Contrato","Dt_Vencimento","Tipo_Parcela","Nr_Parcela","Vl_Original","Vl_Saldo"];
  const rows = [];

  for (let i = 0; i < n; i++) {
    const vl = cfg.vlIni + cfg.vlStep * i;
    rows.push([
      "7",
      makeNrContrato(i,start,pad,suffix),
      cfg.dtVenc,
      cfg.tipoParc,
      cfg.nrParc,
      vl,
      vl
    ]);
  }
  return csv(headers, rows);
}

/* ========= Eventos ========= */
document.getElementById("btnContrato").onclick = () => {
  const x = getInputs();
  downloadText("contrato.csv", gerarContrato(x.n,x.start,x.pad,x.suffix,x.contrato));
};

document.getElementById("btnFinanciado").onclick = () => {
  const x = getInputs();
  downloadText("financiado.csv", gerarFinanciado(x.n,x.start,x.pad,x.suffix,x.financiado,x.docType));
};

document.getElementById("btnParcela").onclick = () => {
  const x = getInputs();
  downloadText("parcela.csv", gerarParcela(x.n,x.start,x.pad,x.suffix,x.parcela));
};

document.getElementById("btnTodos").onclick = () => {
  const x = getInputs();
  downloadText("contrato.csv", gerarContrato(x.n,x.start,x.pad,x.suffix,x.contrato));
  downloadText("financiado.csv", gerarFinanciado(x.n,x.start,x.pad,x.suffix,x.financiado,x.docType));
  downloadText("parcela.csv", gerarParcela(x.n,x.start,x.pad,x.suffix,x.parcela));
};
