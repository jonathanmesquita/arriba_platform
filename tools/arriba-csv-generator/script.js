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

function toMoney2(v) {
  // Garante padrão 2 casas (100 => 100.00)
  const num = Number(v);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2);
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
  const docFixedEl = document.getElementById("docFixed");
  const vlSaldoModeEl = document.getElementById("parc_vl_saldo_mode");
  const vlSaldoFixedEl = document.getElementById("parc_vl_saldo_fixed");

  return {
    n: +document.getElementById("n").value,
    start: +document.getElementById("start").value,
    pad: +document.getElementById("pad").value,
    suffix: document.getElementById("suffix").value || "-ARRIBA",

    // Documento
    docType: document.getElementById("docType")?.value || "none",
    docFixed: (docFixedEl?.value || "").trim(),

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

      // novo
      vlSaldoMode: vlSaldoModeEl?.value || "igual",
      vlSaldoFixed: vlSaldoFixedEl?.value ? +vlSaldoFixedEl.value : NaN,
    }
  };
}

function resolveDocumento(docType, docFixed) {
  // docFixed manda. Se veio preenchido, acabou a discussão.
  if (docFixed && docFixed.length > 0) return docFixed;

  if (docType === "cpf") return gerarCPF();
  if (docType === "cnpj") return gerarCNPJ();
  if (docType === "auto") return Math.random() > 0.5 ? gerarCPF() : gerarCNPJ();
  return "";
}

/* ========= Geradores ========= */
function gerarContrato(n, start, pad, suffix, cfg) {
  // Layout: CONTRATO obrigatório (Cliente, Nr_Contrato, Fase)
  const headers = ["Tipo_Registro","Cliente","Nr_Contrato","Fase"];
  const rows = [];

  for (let i = 0; i < n; i++) {
    rows.push([
      "6",
      cfg.cliente,
      makeNrContrato(i, start, pad, suffix),
      cfg.fase
    ]);
  }
  return csv(headers, rows);
}

function gerarFinanciado(n, start, pad, suffix, cfg, docType, docFixed) {
  // Layout: FINANCIADO obrigatório (Nr_Contrato, Nome, Cpf_Cnpj, Cliente, Tipo_Pessoa)
  const headers = ["Tipo_Registro","Nr_Contrato","Nome","Cpf_Cnpj","Cliente","Tipo_Pessoa"];
  const rows = [];

  for (let i = 0; i < n; i++) {
    rows.push([
      "2",
      makeNrContrato(i, start, pad, suffix),
      `${cfg.nomePrefix} ${padLeft(i + start, pad)}`,
      resolveDocumento(docType, docFixed),
      cfg.cliente,
      cfg.tipoPessoa
    ]);
  }
  return csv(headers, rows);
}

function gerarParcela(n, start, pad, suffix, cfg) {
  // Layout: PARCELA obrigatório (Nr_Contrato, Dt_Vencimento, Tipo_Parcela, Nr_Parcela, Vl_Original, Vl_Saldo)
  const headers = ["Tipo_Registro","Nr_Contrato","Dt_Vencimento","Tipo_Parcela","Nr_Parcela","Vl_Original","Vl_Saldo"];
  const rows = [];

  for (let i = 0; i < n; i++) {
    const vlOriginal = cfg.vlIni + cfg.vlStep * i;

    let vlSaldo;
    if (cfg.vlSaldoMode === "fixo") {
      // se fixo estiver vazio/NaN, cai pro original (pra não gerar lixo)
      vlSaldo = Number.isFinite(cfg.vlSaldoFixed) ? cfg.vlSaldoFixed : vlOriginal;
    } else {
      vlSaldo = vlOriginal;
    }

    rows.push([
      "7",
      makeNrContrato(i, start, pad, suffix),
      cfg.dtVenc,
      cfg.tipoParc,
      cfg.nrParc,
      toMoney2(vlOriginal),
      toMoney2(vlSaldo)
    ]);
  }
  return csv(headers, rows);
}

/* ========= Eventos ========= */
function bindClick(id, fn) {
  const el = document.getElementById(id);
  if (el) el.onclick = fn;
}

bindClick("btnContrato", () => {
  const x = getInputs();
  downloadText("contrato.csv", gerarContrato(x.n, x.start, x.pad, x.suffix, x.contrato));
});

bindClick("btnFinanciado", () => {
  const x = getInputs();
  downloadText(
    "financiado.csv",
    gerarFinanciado(x.n, x.start, x.pad, x.suffix, x.financiado, x.docType, x.docFixed)
  );
});

bindClick("btnParcela", () => {
  const x = getInputs();
  downloadText("parcela.csv", gerarParcela(x.n, x.start, x.pad, x.suffix, x.parcela));
});

bindClick("btnTodos", () => {
  const x = getInputs();
  downloadText("contrato.csv", gerarContrato(x.n, x.start, x.pad, x.suffix, x.contrato));
  downloadText("financiado.csv", gerarFinanciado(x.n, x.start, x.pad, x.suffix, x.financiado, x.docType, x.docFixed));
  downloadText("parcela.csv", gerarParcela(x.n, x.start, x.pad, x.suffix, x.parcela));
});