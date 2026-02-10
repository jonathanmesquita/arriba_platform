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

function resolveDocumento(docType, tipoPessoa) {
  // docType: none|cpf|cnpj|auto
  if (docType === "cpf") return gerarCPF();
  if (docType === "cnpj") return gerarCNPJ();
  if (docType === "auto") return (tipoPessoa === "J") ? gerarCNPJ() : gerarCPF();
  return "";
}

/* ========= Inputs ========= */
function v(id) {
  return (document.getElementById(id)?.value ?? "").trim();
}

function getInputs() {
  return {
    n: Number(v("n") || 60000),
    start: Number(v("start") || 30),
    pad: Number(v("pad") || 4),
    suffix: v("suffix") || "-ARRIBA",

    contrato: {
      cliente: v("contrato_cliente") || "1320",
      fase: v("contrato_fase") || "AM",
      filial: v("contrato_filial"),
      plano: v("contrato_plano"),
      regional: v("contrato_regional"),
      regua: v("contrato_regua"),
      vlContrato: v("contrato_vl_contrato"),
      dtContrato: v("contrato_dt_contrato"),
      txContrato: v("contrato_tx_contrato"),
      dtParaNotificacao: v("contrato_dt_para_notificacao"),
      dtSolicDoc: v("contrato_dt_solic_doc"),
      dtAjuizamento: v("contrato_dt_ajuizamento"),
      codLoja: v("contrato_cod_loja"),
      grupo: v("contrato_grupo"),
      moeda: v("contrato_moeda"),
      subRegua: v("contrato_subregua"),
      cpfCnpj: v("contrato_cpf_cnpj"),
    },

    financiado: {
      cliente: v("fin_cliente") || "1320",
      nome: v("fin_nome") || "Cliente Generico",
      tipoPessoa: v("fin_tipo_pessoa") || "F", // F/J
      cpfCnpjManual: v("fin_cpf_cnpj_manual"),
      docType: v("docType") || "auto",

      dtNascimento: v("fin_dt_nascimento"),
      sexo: v("fin_sexo"),
      estadoCivil: v("fin_estado_civil"),
      conjuge: v("fin_conjuge"),
      pai: v("fin_pai"),
      mae: v("fin_mae"),
      rg: v("fin_rg"),
      rgOrgao: v("fin_rg_orgao"),
      rgUf: v("fin_rg_uf"),
      rgDt: v("fin_rg_dt"),
      scoreSerasa: v("fin_score_serasa"),
      profissao: v("fin_profissao"),
      renda: v("fin_renda"),
      scoreAdicional: v("fin_score_adicional"),
    },

    parcela: {
      dtVenc: v("parc_dt_venc"),
      tipoParcela: v("parc_tipo"),
      nrParcela: v("parc_nr"),
      vlOriginalIni: v("parc_vl_ini"),
      vlSaldoManual: v("parc_vl_saldo"),
      vlStep: v("parc_vl_step"),

      vlTarifa: v("parc_vl_tarifa"),
      cliente: v("parc_cliente"),
      dtInclusao: v("parc_dt_inclusao"),
      dtDevolucao: v("parc_dt_devolucao"),
      dtInibicao: v("parc_dt_inibicao"),
      motivo: v("parc_motivo"),
      dtNotificacao: v("parc_dt_notificacao"),
      marcarDtLote: v("parc_marcar_dt_lote"),
      dtLote: v("parc_dt_lote"),
      documento: v("parc_documento"),
      cpfCnpj: v("parc_cpf_cnpj"),
      plano: v("parc_plano"),
    }
  };
}

/* ========= Geradores ========= */
function gerarContrato(n, start, pad, suffix, cfg) {
  const headers = [
    "Tipo_Registro","Cliente","Nr_Contrato","Filial","Plano","Fase","Regional","Regua",
    "Vl_Contrato","Dt_Contrato","Tx_Contrato","Dt_Para_Notificacao","Dt_Solicitacao_Documento",
    "Dt_Ajuizamento","Cod_Loja","Grupo","Moeda","SubRegua","Cpf_Cnpj"
  ];

  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push([
      "6",
      cfg.cliente,
      makeNrContrato(i, start, pad, suffix),
      cfg.filial || "",
      cfg.plano || "",
      cfg.fase,
      cfg.regional || "",
      cfg.regua || "",
      cfg.vlContrato || "",
      cfg.dtContrato || "",
      cfg.txContrato || "",
      cfg.dtParaNotificacao || "",
      cfg.dtSolicDoc || "",
      cfg.dtAjuizamento || "",
      cfg.codLoja || "",
      cfg.grupo || "",
      cfg.moeda || "",
      cfg.subRegua || "",
      cfg.cpfCnpj || ""
    ]);
  }
  return csv(headers, rows);
}

function gerarFinanciado(n, start, pad, suffix, cfg) {
  const headers = [
    "Tipo_Registro","Nr_Contrato","Nome","Cpf_Cnpj","Cliente","Dt_Nascimento","Sexo","Tipo_Pessoa",
    "Estado_Civil","Conjuge","Pai","Mae","Rg","Rg_Orgao_Emiss","Rg_Uf_Emiss","Rg_Dt_Emiss",
    "Score_Serasa","Profissao","Renda","Score_Adicional"
  ];

  const rows = [];
  for (let i = 0; i < n; i++) {
    const nrContrato = makeNrContrato(i, start, pad, suffix);

    // Cpf_Cnpj: prioridade para o manual; se vazio, gera conforme docType
    const doc = cfg.cpfCnpjManual
      ? cfg.cpfCnpjManual
      : resolveDocumento(cfg.docType, cfg.tipoPessoa);

    rows.push([
      "2",
      nrContrato,
      `${cfg.nome} ${padLeft(i + start, pad)}`,
      doc,
      cfg.cliente,

      cfg.dtNascimento || "",
      cfg.sexo || "",
      cfg.tipoPessoa, // F/J

      cfg.estadoCivil || "",
      cfg.conjuge || "",
      cfg.pai || "",
      cfg.mae || "",
      cfg.rg || "",
      cfg.rgOrgao || "",
      cfg.rgUf || "",
      cfg.rgDt || "",
      cfg.scoreSerasa || "",
      cfg.profissao || "",
      cfg.renda || "",
      cfg.scoreAdicional || ""
    ]);
  }

  return csv(headers, rows);
}

function gerarParcela(n, start, pad, suffix, cfg) {
  const headers = [
    "Tipo_Registro","Nr_Contrato","Dt_Vencimento","Tipo_Parcela","Nr_Parcela","Vl_Original","Vl_Saldo",
    "Vl_Tarifa","Cliente","Dt_Inclusao","Dt_Devolucao","Dt_Inibicao","Motivo","Dt_Notificacao",
    "Marcar_Dt_Lote","Dt_Lote","Documento","Cpf_Cnpj","Plano"
  ];

  const rows = [];
  const step = cfg.vlStep ? Number(cfg.vlStep) : 0;
  const ini = cfg.vlOriginalIni ? Number(cfg.vlOriginalIni) : 0;

  for (let i = 0; i < n; i++) {
    const nrContrato = makeNrContrato(i, start, pad, suffix);

    const vlOriginal = (cfg.vlOriginalIni !== "") ? (ini + step * i) : "";
    // se Vl_Saldo manual vazio, copia o original
    const vlSaldo = cfg.vlSaldoManual !== ""
      ? cfg.vlSaldoManual
      : (vlOriginal !== "" ? vlOriginal : "");

    rows.push([
      "7",
      nrContrato,
      cfg.dtVenc,
      cfg.tipoParcela,
      cfg.nrParcela,
      vlOriginal,
      vlSaldo,

      cfg.vlTarifa || "",
      cfg.cliente || "",
      cfg.dtInclusao || "",
      cfg.dtDevolucao || "",
      cfg.dtInibicao || "",
      cfg.motivo || "",
      cfg.dtNotificacao || "",
      cfg.marcarDtLote || "",
      cfg.dtLote || "",
      cfg.documento || "",
      cfg.cpfCnpj || "",
      cfg.plano || ""
    ]);
  }

  return csv(headers, rows);
}

/* ========= Eventos ========= */
document.getElementById("btnContrato").onclick = () => {
  const x = getInputs();
  downloadText("contrato.csv", gerarContrato(x.n, x.start, x.pad, x.suffix, x.contrato));
};

document.getElementById("btnFinanciado").onclick = () => {
  const x = getInputs();
  downloadText("financiado.csv", gerarFinanciado(x.n, x.start, x.pad, x.suffix, x.financiado));
};

document.getElementById("btnParcela").onclick = () => {
  const x = getInputs();
  downloadText("parcela.csv", gerarParcela(x.n, x.start, x.pad, x.suffix, x.parcela));
};

document.getElementById("btnTodos").onclick = () => {
  const x = getInputs();
  downloadText("contrato.csv", gerarContrato(x.n, x.start, x.pad, x.suffix, x.contrato));
  downloadText("financiado.csv", gerarFinanciado(x.n, x.start, x.pad, x.suffix, x.financiado));
  downloadText("parcela.csv", gerarParcela(x.n, x.start, x.pad, x.suffix, x.parcela));
};
