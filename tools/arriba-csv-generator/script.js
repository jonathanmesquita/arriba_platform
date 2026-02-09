const SEP = ";";
const NL = "\r\n";

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

function getInputs() {
  const n = parseInt(document.getElementById("n").value, 10);
  const start = parseInt(document.getElementById("start").value, 10);
  const pad = parseInt(document.getElementById("pad").value, 10);
  const suffix = document.getElementById("suffix").value || "-ARRIBA";

  return {
    n, start, pad, suffix,

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
      dtVenc: document.getElementById("parc_dt_venc").value || "09/02/2026",
      tipoParc: document.getElementById("parc_tipo").value || "0",
      nrParc: String(parseInt(document.getElementById("parc_nr").value, 10) || 1),
      vlIni: parseFloat(document.getElementById("parc_vl_ini").value || "100"),
      vlStep: parseFloat(document.getElementById("parc_vl_step").value || "0"),
    }
  };
}

/* =========================
   CONTRATO (layout real)
   Campos vermelhos: Cliente, Nr_Contrato
   ========================= */
function gerarContrato(n, start, pad, suffix, cfg) {
  const headers = [
    "Tipo_Registro","Cliente","Nr_Contrato","Filial","Plano","Fase","Regional","Regua",
    "Vl_Contrato","Dt_Contrato","Tx_Contrato","Dt_Para_Notificacao","Dt_Solicitacao_Documento",
    "Dt_Ajuizamento","Cod_Loja","Grupo","Moeda","SubRegua","Cpf_Cnpj"
  ];

  const rows = [];
  for (let i = 0; i < n; i++) {
    const nr = makeNrContrato(i, start, pad, suffix);
    rows.push([
      "6",
      cfg.cliente,     // vermelho
      nr,              // vermelho
      "",
      "",
      cfg.fase,        // no seu template está "AM"
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""               // Cpf_Cnpj vazio (como no seu exemplo)
    ]);
  }

  return csv(headers, rows);
}

/* =========================
   FINANCIADO (layout real)
   Campos vermelhos: Nr_Contrato, Nome (e Cliente você também usou)
   ========================= */
function gerarFinanciado(n, start, pad, suffix, cfg) {
  const headers = [
    "Tipo_Registro","Nr_Contrato","Nome","Cpf_Cnpj","Cliente","Dt_Nascimento","Sexo","Tipo_Pessoa",
    "Estado_Civil","Conjuge","Pai","Mae","Rg","Rg_Orgao_Emiss","Rg_Uf_Emiss","Rg_Dt_Emiss",
    "Score_Serasa","Profissao","Renda","Score_Adicional"
  ];

  const rows = [];
  for (let i = 0; i < n; i++) {
    const nr = makeNrContrato(i, start, pad, suffix);

    // CPF genérico “ok pra teste” (não valida dígito, mas mantém padrão)
    const cpfBase = padLeft(((i + 1) % 99999999999), 11);
    const cpfFmt = `${cpfBase.slice(0,3)}.${cpfBase.slice(3,6)}.${cpfBase.slice(6,9)}-${cpfBase.slice(9,11)}`;

    rows.push([
      "2",
      nr,                                   // vermelho
      `${cfg.nomePrefix} ${padLeft(i+start, pad)}`, // vermelho
      cpfFmt,
      cfg.cliente,                          // você também destacou
      "",
      "",
      cfg.tipoPessoa,                       // "Fisica"
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
    ]);
  }

  return csv(headers, rows);
}

/* =========================
   PARCELA (layout real)
   Campos vermelhos: Nr_Contrato, Dt_Vencimento, Tipo_Parcela, Nr_Parcela, Vl_Original, Vl_Saldo
   ========================= */
function gerarParcela(n, start, pad, suffix, cfg) {
  const headers = [
    "Tipo_Registro","Nr_Contrato","Dt_Vencimento","Tipo_Parcela","Nr_Parcela","Vl_Original","Vl_Saldo",
    "Vl_Tarifa","Cliente","Dt_Inclusao","Dt_Devolucao","Dt_Inibicao","Motivo","Dt_Notificacao",
    "Marcar_Dt_Lote","Dt_Lote","Documento","Cpf_Cnpj","Plano"
  ];

  const rows = [];
  for (let i = 0; i < n; i++) {
    const nr = makeNrContrato(i, start, pad, suffix);
    const vl = (cfg.vlIni + (cfg.vlStep * i));

    rows.push([
      "7",
      nr,                 // vermelho
      cfg.dtVenc,          // vermelho
      cfg.tipoParc,        // vermelho
      cfg.nrParc,          // vermelho
      String(vl),          // vermelho
      String(vl),          // vermelho (igual ao original, como no exemplo)
      "",
      "",
      cfg.dtVenc,          // no seu template Dt_Inclusao = Dt_Vencimento
      "",
      "",
      "Teste Pagamento",   // mantém padrão do seu template
      "",
      "S",                 // mantém
      "21/01/2026",        // mantém padrão do seu template (se quiser, vira input depois)
      "",
      "",                  // Cpf_Cnpj (vazio ou gere igual ao financiado se quiser amarrar)
      ""
    ]);
  }

  return csv(headers, rows);
}

/* ======== Eventos ======== */
document.getElementById("btnContrato").addEventListener("click", () => {
  const x = getInputs();
  const content = gerarContrato(x.n, x.start, x.pad, x.suffix, x.contrato);
  downloadText("contrato.csv", content);
});

document.getElementById("btnFinanciado").addEventListener("click", () => {
  const x = getInputs();
  const content = gerarFinanciado(x.n, x.start, x.pad, x.suffix, x.financiado);
  downloadText("financiado.csv", content);
});

document.getElementById("btnParcela").addEventListener("click", () => {
  const x = getInputs();
  const content = gerarParcela(x.n, x.start, x.pad, x.suffix, x.parcela);
  downloadText("parcela.csv", content);
});

document.getElementById("btnTodos").addEventListener("click", () => {
  const x = getInputs();
  downloadText("contrato.csv", gerarContrato(x.n, x.start, x.pad, x.suffix, x.contrato));
  downloadText("financiado.csv", gerarFinanciado(x.n, x.start, x.pad, x.suffix, x.financiado));
  downloadText("parcela.csv", gerarParcela(x.n, x.start, x.pad, x.suffix, x.parcela));
});
