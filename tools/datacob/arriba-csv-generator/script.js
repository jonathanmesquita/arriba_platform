const SEP = ";";
const NL = "\r\n";

const LAYOUT_SEQUENCE = [
  { key: "configuracao", label: "Configuração", tipoRegistro: 0, primary: false, description: "Diretivas operacionais do lote." },
  { key: "loja", label: "Loja", tipoRegistro: 1, primary: false, description: "Dados de loja/origem." },
  { key: "financiado", label: "Financiado", tipoRegistro: 2, primary: true, description: "Dados cadastrais do financiado." },
  { key: "email", label: "E-mail", tipoRegistro: 3, primary: false, description: "E-mails vinculados ao financiado." },
  { key: "telefone", label: "Telefone", tipoRegistro: 4, primary: false, description: "Telefones vinculados ao financiado." },
  { key: "endereco", label: "Endereço", tipoRegistro: 5, primary: false, description: "Endereços vinculados ao financiado." },
  { key: "contrato", label: "Contrato", tipoRegistro: 6, primary: true, description: "Dados do contrato e vínculo principal." },
  { key: "parcela", label: "Parcela", tipoRegistro: 7, primary: true, description: "Vencimento, valor e número da parcela." },
  { key: "historico", label: "Histórico", tipoRegistro: 8, primary: false, description: "Histórico operacional." },
  { key: "garantia", label: "Garantia", tipoRegistro: 10, primary: false, description: "Garantias associadas ao contrato." },
  { key: "avalista", label: "Avalista", tipoRegistro: 11, primary: false, description: "Avalistas vinculados ao contrato." },
  { key: "dados_auxiliares", label: "Dados Auxiliares", tipoRegistro: 12, primary: false, description: "Campos auxiliares do layout." },
  { key: "processo", label: "Processo", tipoRegistro: 13, primary: false, description: "Dados de processo." },
  { key: "processo_andamento", label: "Processo Andamento", tipoRegistro: 14, primary: false, description: "Andamentos do processo." },
  { key: "processo_data", label: "Processo Data", tipoRegistro: 15, primary: false, description: "Datas do processo." },
  { key: "processo_localizador", label: "Processo Localizador", tipoRegistro: 16, primary: false, description: "Localizadores do processo." },
  { key: "despesa", label: "Despesa", tipoRegistro: 17, primary: false, description: "Despesas vinculadas." },
  { key: "mensagem_operacao", label: "Mensagem Operação", tipoRegistro: 18, primary: false, description: "Mensagens operacionais do lote." }
];

const FIELD_LABELS = {
  recordCount: "Quantidade de registros",
  cliente: "Cliente",
  contratoInicial: "Contrato inicial",
  contratoSufixo: "Sufixo do contrato",
  fase: "Fase",
  nomeBase: "Nome base do financiado",
  tipoPessoa: "Tipo pessoa",
  documentMode: "Documento",
  documentoManual: "CPF/CNPJ manual",
  dataVencimento: "Data de vencimento",
  valorOriginal: "Valor original",
  tipoParcela: "Tipo parcela",
  numeroParcela: "Número da parcela",
  devolucaoGeral: "Devolução geral",
  lojaCodLoja: "Código da loja",
  lojaNome: "Nome da loja",
  emailValor: "E-mail",
  dddTelefone: "DDD",
  telefoneNumero: "Telefone",
  logradouro: "Logradouro",
  cidade: "Cidade",
  uf: "UF",
  historicoTexto: "Histórico",
  tipoGarantia: "Tipo garantia",
  descricaoGarantia: "Descrição da garantia",
  avalistaNome: "Nome do avalista",
  dadosAuxDescricao: "Descrição auxiliar",
  dadosAuxValor: "Valor auxiliar",
  numeroProcesso: "Número do processo",
  andamentoDescricao: "Andamento",
  dataPrazo: "Data do prazo",
  localizador: "Localizador",
  despesaCodigo: "Código da despesa",
  despesaValor: "Valor da despesa",
  mensagemOperacao: "Mensagem"
};

const FILES = {
  configuracao: {
    label: "Configuração",
    filename: "configuracao.csv",
    required: ["devolucaoGeral"],
    headers: [
      "Tipo_Registro", "Devolucao_Geral", "Devolucao_Por_Contrato", "Redefinir_Agrupamento",
      "Cadastrar_CPF_CNPJ_Invalido", "Batimento_Geral_Por_Cliente"
    ]
  },
  loja: {
    label: "Loja",
    filename: "loja.csv",
    required: ["recordCount", "cliente", "lojaCodLoja", "lojaNome"],
    headers: ["Tipo_Registro", "Cliente", "Cod_Loja", "Nome_Loja", "Cnpj", "Regional"]
  },
  financiado: {
    label: "Financiado",
    filename: "financiado.csv",
    required: ["recordCount", "cliente", "contratoInicial", "contratoSufixo", "nomeBase", "tipoPessoa", "documentMode"],
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Nome", "Cpf_Cnpj", "Cliente", "Dt_Nascimento", "Sexo", "Tipo_Pessoa",
      "Estado_Civil", "Conjuge", "Pai", "Mae", "Rg", "Rg_Orgao_Emiss", "Rg_Uf_Emiss", "Rg_Dt_Emiss",
      "Score_Serasa", "Profissao", "Renda", "Score_Adicional"
    ]
  },
  email: {
    label: "E-mail",
    filename: "email.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "documentMode", "emailValor"],
    headers: ["Tipo_Registro", "Nr_Contrato", "Cpf_Cnpj", "Email", "Cliente"]
  },
  telefone: {
    label: "Telefone",
    filename: "telefone.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "documentMode", "dddTelefone", "telefoneNumero"],
    headers: ["Tipo_Registro", "Nr_Contrato", "Cpf_Cnpj", "Tipo_Telefone", "DDD", "Fone", "Ramal", "Cliente"]
  },
  endereco: {
    label: "Endereço",
    filename: "endereco.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "documentMode", "logradouro", "cidade", "uf"],
    headers: ["Tipo_Registro", "Nr_Contrato", "Cpf_Cnpj", "Tipo_Endereco", "Logradouro", "Numero", "Complemento", "Bairro", "Cidade", "UF", "CEP", "Cliente"]
  },
  contrato: {
    label: "Contrato",
    filename: "contrato.csv",
    required: ["recordCount", "cliente", "contratoInicial", "contratoSufixo", "fase"],
    headers: [
      "Tipo_Registro", "Cliente", "Nr_Contrato", "Filial", "Plano", "Fase", "Regional", "Regua",
      "Vl_Contrato", "Dt_Contrato", "Tx_Contrato", "Dt_Para_Notificacao", "Dt_Solicitacao_Documento",
      "Dt_Ajuizamento", "Cod_Loja", "Grupo", "Moeda", "SubRegua", "Cpf_Cnpj"
    ]
  },
  parcela: {
    label: "Parcela",
    filename: "parcela.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "dataVencimento", "valorOriginal", "tipoParcela", "numeroParcela"],
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Dt_Vencimento", "Tipo_Parcela", "Nr_Parcela", "Vl_Original", "Vl_Saldo",
      "Vl_Tarifa", "Cliente", "Dt_Inclusao", "Dt_Devolucao", "Dt_Inibicao", "Motivo", "Dt_Notificacao",
      "Marcar_Dt_Lote", "Dt_Lote", "Documento", "Cpf_Cnpj", "Plano"
    ]
  },
  historico: {
    label: "Histórico",
    filename: "historico.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "historicoTexto"],
    headers: ["Tipo_Registro", "Nr_Contrato", "Historico", "Cliente"]
  },
  garantia: {
    label: "Garantia",
    filename: "garantia.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "tipoGarantia", "descricaoGarantia"],
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Tipo_Garantia", "Marca", "Modelo", "Descricao", "Dt_Aquisicao", "Observacao",
      "Vl_Garantia", "Vl_Corrigido", "Cpf_Cnpj"
    ]
  },
  avalista: {
    label: "Avalista",
    filename: "avalista.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "avalistaNome", "tipoPessoa", "documentMode"],
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Nome", "Cpf_Cnpj", "Dt_Nascimento", "Sexo", "Tipo_Pessoa",
      "Estado_Civil", "Conjuge", "Pai", "Mae", "Rg", "Rg_Orgao_Emiss", "Rg_Uf_Emiss", "Rg_Dt_Emiss",
      "Tipo_Telefone_1", "DDD_1", "Fone_1", "Tipo_Endereco", "Logradouro", "Numero", "Bairro", "Cidade", "UF", "CEP"
    ]
  },
  dados_auxiliares: {
    label: "Dados Auxiliares",
    filename: "dados_auxiliares.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "dadosAuxDescricao", "dadosAuxValor"],
    headers: ["Tipo_Registro", "Nr_Contrato", "Descricao", "Valor", "Cpf_Cnpj"]
  },
  processo: {
    label: "Processo",
    filename: "processo.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "numeroProcesso"],
    headers: ["Tipo_Registro", "Nr_Contrato", "Nr_Processo", "Tipo_Processo", "Comarca", "Vara", "Uf", "Processo_Digital"]
  },
  processo_andamento: {
    label: "Processo Andamento",
    filename: "processo_andamento.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "numeroProcesso", "andamentoDescricao"],
    headers: ["Tipo_Registro", "Nr_Contrato", "Nr_Processo", "Dt_Andamento", "Complemento", "Observacao"]
  },
  processo_data: {
    label: "Processo Data",
    filename: "processo_data.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "numeroProcesso", "dataPrazo"],
    headers: ["Tipo_Registro", "Nr_Contrato", "Nr_Processo", "Dt_Prazo", "Observacao"]
  },
  processo_localizador: {
    label: "Processo Localizador",
    filename: "processo_localizador.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "numeroProcesso", "localizador"],
    headers: ["Tipo_Registro", "Nr_Contrato", "Nr_Processo", "Dt_Localizacao", "Localizador", "Tipo_Retorno"]
  },
  despesa: {
    label: "Despesa",
    filename: "despesa.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "despesaCodigo", "despesaValor"],
    headers: ["Tipo_Registro", "Nr_Contrato", "Cod_Despesa_Sistema", "Tipo_Comprovante", "Dt_Despesa", "Vl_Despesa", "Cpf_Cnpj"]
  },
  mensagem_operacao: {
    label: "Mensagem Operação",
    filename: "mensagem_operacao.csv",
    required: ["recordCount", "contratoInicial", "contratoSufixo", "mensagemOperacao"],
    headers: ["Tipo_Registro", "Cpf_Cnpj", "Nr_Contrato", "Mensagem", "Status_Msg"]
  }
};

const NAMES = ["Joao", "Maria", "Ana", "Carlos", "Fernanda", "Pedro", "Julia", "Marcos", "Patricia", "Lucas"];
const SURNAMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira", "Almeida", "Ferreira", "Rocha"];

const state = {
  selectedTypes: ["financiado", "contrato", "parcela"],
  fileType: "financiado",
  activePreview: "financiado",
  generated: {},
  validationByType: {},
  validation: { isValid: false, messages: [] }
};

const $ = id => document.getElementById(id);
const value = id => ($(id)?.value ?? "").trim();

function onlyDigits(text = "") {
  return String(text).replace(/\D/g, "");
}

function padLeft(value, size = 4) {
  const text = String(value);
  return text.length >= size ? text : "0".repeat(size - text.length) + text;
}

function makeContract(index = 0) {
  const start = Number(value("contratoInicial") || 0);
  const suffix = value("contratoSufixo") || "";
  return `${padLeft(start + index, 4)}${suffix}`;
}

function normalizeDate(dateText) {
  const text = String(dateText || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [yyyy, mm, dd] = text.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  return text;
}

function normalizeMoney(money) {
  const text = String(money ?? "").trim();
  if (!text) return "";
  return text.replace(/\./g, "").replace(",", ".");
}

function moneyForCsv(money) {
  const normalized = normalizeMoney(money);
  if (!normalized) return "";
  const number = Number(normalized);
  return Number.isFinite(number) ? String(number).replace(".", ",") : money;
}

function escapeCsv(cell = "") {
  const text = String(cell ?? "");
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers, rows) {
  return [headers.join(SEP), ...rows.map(row => row.map(escapeCsv).join(SEP))].join(NL);
}

function randomDigit() {
  return Math.floor(Math.random() * 10);
}

function gerarCPF() {
  const nums = Array.from({ length: 9 }, randomDigit);
  let d1 = nums.reduce((sum, n, i) => sum + n * (10 - i), 0) % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  let d2 = [...nums, d1].reduce((sum, n, i) => sum + n * (11 - i), 0) % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return [...nums, d1, d2].join("");
}

function gerarCNPJ() {
  const nums = Array.from({ length: 12 }, randomDigit);
  const calc = (base, weights) => base.reduce((sum, n, i) => sum + n * weights[i], 0) % 11;
  let d1 = calc(nums, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  d1 = d1 < 2 ? 0 : 11 - d1;
  let d2 = calc([...nums, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  d2 = d2 < 2 ? 0 : 11 - d2;
  return [...nums, d1, d2].join("");
}

function resolveDocument(index = 0) {
  const mode = value("documentMode");
  const manual = value("documentoManual");
  const personType = value("tipoPessoa") || "F";
  if (mode === "manual") return manual;
  if (personType === "J") return gerarCNPJ();
  return gerarCPF();
}

function fakeName(index) {
  const base = value("nomeBase") || "Cliente Generico";
  const mode = value("generationMode");
  if (mode === "manual") return base;
  return `${base} ${padLeft(Number(value("contratoInicial") || 0) + index, 4)}`;
}

function getCount(forPreview = false, type = state.fileType) {
  if (type === "configuracao") return 1;
  const raw = Number(value("recordCount") || 1);
  const count = Math.max(1, Math.min(raw, 60000));
  return forPreview ? Math.min(count, 20) : count;
}

function getLayoutItem(key) {
  return LAYOUT_SEQUENCE.find(item => item.key === key);
}

function sortTypes(types = []) {
  const order = new Map(LAYOUT_SEQUENCE.map(item => [item.key, item.tipoRegistro]));
  return [...new Set(types)].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

function rowCommon(type, index) {
  const doc = resolveDocument(index);
  const contrato = makeContract(index);
  return { doc, contrato };
}

function buildRows(type, forPreview = false) {
  const rows = [];
  const count = getCount(forPreview, type);

  for (let i = 0; i < count; i++) {
    const { doc, contrato } = rowCommon(type, i);

    const rowMap = {
      configuracao: [
        "0", value("devolucaoGeral") || "N", value("devolucaoPorContrato") || "N",
        value("redefinirAgrupamento") || "N", value("cadastrarCpfCnpjInvalido") || "N", "N"
      ],
      loja: [
        "1", value("cliente"), value("lojaCodLoja") || padLeft(i + 1, 3), value("lojaNome") || `Loja ${i + 1}`,
        value("lojaCnpj") || gerarCNPJ(), value("lojaRegional")
      ],
      financiado: [
        "2", contrato, fakeName(i), doc, value("cliente"), normalizeDate(value("dataNascimento")),
        value("sexo"), value("tipoPessoa"), value("estadoCivil"), value("conjuge"), value("pai"), value("mae"),
        value("rg"), value("rgOrgao"), value("rgUf"), normalizeDate(value("rgData")), value("scoreSerasa"),
        value("profissao"), moneyForCsv(value("renda")), moneyForCsv(value("scoreAdicional"))
      ],
      email: ["3", contrato, doc, value("emailValor"), value("cliente")],
      telefone: ["4", contrato, doc, value("tipoTelefone") || "1", value("dddTelefone"), value("telefoneNumero"), value("ramalTelefone"), value("cliente")],
      endereco: ["5", contrato, doc, "1", value("logradouro"), value("enderecoNumero"), "", value("bairro"), value("cidade"), value("uf"), value("cep"), value("cliente")],
      contrato: [
        "6", value("cliente"), contrato, value("filial"), value("planoContrato"), value("fase"), value("regional"),
        value("regua"), moneyForCsv(value("valorContrato")), normalizeDate(value("dataContrato")),
        value("taxaContrato"), normalizeDate(value("dataParaNotificacao")), normalizeDate(value("dataSolicitacaoDocumento")),
        normalizeDate(value("dataAjuizamento")), value("codLoja"), value("grupo"), value("moeda"), value("subRegua"), doc
      ],
      parcela: [
        "7", contrato, normalizeDate(value("dataVencimento")), value("tipoParcela"),
        String(Number(value("numeroParcela") || 1) + (value("generationMode") === "manual" ? 0 : i)),
        moneyForCsv(value("valorOriginal")), moneyForCsv(value("valorSaldo") || value("valorOriginal")),
        moneyForCsv(value("valorTarifa")), value("clienteParcela") || value("cliente"),
        normalizeDate(value("dataInclusao")), normalizeDate(value("dataDevolucao")), normalizeDate(value("dataInibicao")),
        value("motivo"), normalizeDate(value("dataNotificacao")), value("marcarDataLote"), normalizeDate(value("dataLote")),
        value("documentoParcela"), doc, value("planoParcela")
      ],
      historico: ["8", contrato, value("historicoTexto"), value("cliente")],
      garantia: [
        "10", contrato, value("tipoGarantia"), value("marcaGarantia"), value("modeloGarantia"),
        value("descricaoGarantia"), "", "", "", "", doc
      ],
      avalista: [
        "11", contrato, value("avalistaNome"), doc, normalizeDate(value("dataNascimento")), value("sexo"), value("tipoPessoa"),
        value("estadoCivil"), value("conjuge"), value("pai"), value("mae"), value("rg"), value("rgOrgao"), value("rgUf"),
        normalizeDate(value("rgData")), value("tipoTelefone") || "1", value("dddTelefone"), value("telefoneNumero"),
        "1", value("logradouro"), value("enderecoNumero"), value("bairro"), value("cidade"), value("uf"), value("cep")
      ],
      dados_auxiliares: ["12", contrato, value("dadosAuxDescricao"), value("dadosAuxValor"), doc],
      processo: ["13", contrato, value("numeroProcesso"), value("tipoProcesso"), value("comarca"), value("vara"), value("ufProcesso"), "N"],
      processo_andamento: ["14", contrato, value("numeroProcesso"), normalizeDate(value("andamentoData")), value("andamentoDescricao"), ""],
      processo_data: ["15", contrato, value("numeroProcesso"), normalizeDate(value("dataPrazo")), ""],
      processo_localizador: ["16", contrato, value("numeroProcesso"), normalizeDate(value("dataPrazo")), value("localizador"), ""],
      despesa: ["17", contrato, value("despesaCodigo"), "", normalizeDate(value("despesaData")), moneyForCsv(value("despesaValor")), doc],
      mensagem_operacao: ["18", doc, contrato, value("mensagemOperacao"), value("statusMsg")]
    };

    rows.push(rowMap[type] || []);
  }

  return rows;
}

function buildCsv(type, forPreview = false) {
  return toCsv(FILES[type].headers, buildRows(type, forPreview));
}

function selectedFiles() {
  return sortTypes(state.selectedTypes.filter(key => FILES[key]));
}

function validate(type = state.fileType) {
  const file = FILES[type];
  const messages = [];

  if (!file) {
    return { isValid: false, messages: [{ type: "error", text: "Tipo de registro inválido." }] };
  }

  file.required.forEach(field => {
    if (!value(field)) {
      messages.push({
        type: "error",
        field,
        text: `${file.label}: campo obrigatório ausente: ${FIELD_LABELS[field] || field}.`
      });
    }
  });

  const count = Number(value("recordCount") || 0);
  if (type !== "configuracao") {
    if (!Number.isFinite(count) || count < 1) messages.push({ type: "error", field: "recordCount", text: `${file.label}: quantidade de registros deve ser maior que zero.` });
    if (count > 60000) messages.push({ type: "warn", field: "recordCount", text: `${file.label}: quantidade acima de 60.000 foi limitada para proteger o navegador.` });
  }

  if (file.required.includes("documentMode") && value("documentMode") === "manual") {
    const doc = onlyDigits(value("documentoManual"));
    if (![11, 14].includes(doc.length)) {
      messages.push({ type: "error", field: "documentoManual", text: `${file.label}: CPF/CNPJ manual deve ter 11 ou 14 dígitos.` });
    }
  }

  if (type === "contrato" && value("fase") && value("fase").length > 2) {
    messages.push({ type: "warn", field: "fase", text: "Contrato: fase costuma ter até 2 caracteres, conforme layout." });
  }

  if (type === "parcela") {
    if (value("dataVencimento") && !/^\d{2}\/\d{2}\/\d{4}$/.test(value("dataVencimento"))) {
      messages.push({ type: "warn", field: "dataVencimento", text: "Parcela: data de vencimento deve seguir dd/mm/aaaa." });
    }
    if (value("valorOriginal") && !Number.isFinite(Number(normalizeMoney(value("valorOriginal"))))) {
      messages.push({ type: "error", field: "valorOriginal", text: "Parcela: valor original inválido." });
    }
  }

  if (!messages.some(msg => msg.type === "error")) {
    messages.push({ type: "ok", text: `${file.label}.csv pronto para preview/exportação.` });
  }

  return { isValid: !messages.some(msg => msg.type === "error"), messages };
}

function validateSelected() {
  const result = {};
  selectedFiles().forEach(type => {
    result[type] = validate(type);
  });
  state.validationByType = result;

  const messages = Object.values(result).flatMap(item => item.messages);
  state.validation = {
    isValid: Object.values(result).every(item => item.isValid),
    messages
  };

  return state.validation;
}

function clearRequiredMarks() {
  document.querySelectorAll(".required-missing").forEach(el => el.classList.remove("required-missing"));
  document.querySelectorAll(".required-message").forEach(el => el.remove());
}

function markRequiredFields() {
  clearRequiredMarks();

  const activeValidation = validate(state.fileType);

  activeValidation.messages
    .filter(msg => msg.type === "error" && msg.field)
    .forEach(msg => {
      const field = $(msg.field);
      if (!field) return;

      field.classList.add("required-missing");

      const wrapper = field.closest(".field") || field.parentElement;
      if (wrapper) {
        wrapper.classList.add("required-missing");
        const small = document.createElement("small");
        small.className = "required-message";
        small.textContent = "Obrigatório para este Tipo_Registro.";
        wrapper.appendChild(small);
      }
    });
}

function generateAllPreviews() {
  state.generated = {};
  selectedFiles().forEach(type => {
    state.generated[type] = buildCsv(type, true);
  });
}

function updateFieldVisibility() {
  document.querySelectorAll("[data-applies]").forEach(el => {
    const applies = el.dataset.applies.split(" ");
    el.classList.toggle("hidden", !applies.includes(state.fileType));
  });

  document.querySelectorAll("[data-applies-box]").forEach(el => {
    const applies = el.dataset.appliesBox.split(" ");
    el.classList.toggle("hidden", !applies.includes(state.fileType));
  });

  const manualDocField = $("manualDocField");
  if (manualDocField) manualDocField.classList.toggle("hidden", value("documentMode") !== "manual");
}

function renderTipoRegistroGrid() {
  const grid = $("tipoRegistroGrid");
  if (!grid) return;

  grid.innerHTML = LAYOUT_SEQUENCE.map(item => `
    <label class="tipo-registro-card ${item.primary ? "primary" : ""} ${state.selectedTypes.includes(item.key) ? "selected" : ""}" data-registro-card="${item.key}">
      <input type="checkbox" value="${item.key}" ${state.selectedTypes.includes(item.key) ? "checked" : ""}>
      <span class="tipo-registro-number">${item.tipoRegistro}</span>
      <span>
        <strong>${item.label}</strong>
        <small>${item.description}</small>
      </span>
    </label>
  `).join("");

  grid.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener("change", () => {
      const selected = Array.from(grid.querySelectorAll('input[type="checkbox"]:checked')).map(item => item.value);
      state.selectedTypes = sortTypes(selected.length ? selected : ["financiado"]);

      if (!state.selectedTypes.includes(state.fileType)) state.fileType = state.selectedTypes[0];
      if (!state.selectedTypes.includes(state.activePreview)) state.activePreview = state.fileType;

      updateAll();
    });
  });
}

function renderEditTabs() {
  const tabs = $("recordEditTabs");
  if (!tabs) return;

  tabs.innerHTML = selectedFiles().map(type => `
    <button type="button" class="record-edit-tab ${state.fileType === type ? "active" : ""}" data-edit-record="${type}">
      ${getLayoutItem(type)?.tipoRegistro ?? ""} · ${FILES[type].label}
    </button>
  `).join("");

  tabs.querySelectorAll("[data-edit-record]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.fileType = btn.dataset.editRecord;
      if (!state.selectedTypes.includes(state.activePreview)) state.activePreview = state.fileType;
      updateAll();
      $("step-required")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderRecordContext() {
  const box = $("recordContext");
  const item = getLayoutItem(state.fileType);
  const file = FILES[state.fileType];

  if (!box || !item || !file) return;

  const requiredLabels = file.required.map(field => FIELD_LABELS[field] || field).join(", ");

  box.innerHTML = `
    <strong>${item.tipoRegistro} · ${file.label}</strong>
    <span>${item.description}</span>
    <div class="form-text mt-1">Obrigatórios deste registro: ${requiredLabels || "nenhum campo obrigatório manual"}.</div>
  `;
}

function renderValidation() {
  const list = $("validationList");
  if (!list) return;

  const visibleMessages = state.validation.messages.filter(msg => msg.type !== "ok");
  const okMessages = state.validation.messages.filter(msg => msg.type === "ok");

  const messages = visibleMessages.length ? visibleMessages : okMessages;

  list.innerHTML = messages.map(msg => `<div class="validation-msg ${msg.type}">${msg.text}</div>`).join("");
}

function renderPreviewTabs() {
  const tabs = $("previewTabs");
  if (!tabs) return;

  const files = selectedFiles();

  if (!files.includes(state.activePreview)) state.activePreview = files[0];

  tabs.innerHTML = files.map(type => {
    const validation = state.validationByType[type] || validate(type);
    return `
      <button type="button" class="preview-tab ${state.activePreview === type ? "active" : ""} ${validation.isValid ? "valid" : "invalid"}" data-preview="${type}">
        ${getLayoutItem(type)?.tipoRegistro ?? ""} · ${FILES[type].label}
      </button>
    `;
  }).join("");

  tabs.querySelectorAll("[data-preview]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activePreview = btn.dataset.preview;
      renderPreviewTabs();
      renderPreview();
    });
  });
}

function renderSelectedExportList() {
  const box = $("selectedExportList");
  if (!box) return;
  box.innerHTML = selectedFiles().map(type => {
    const item = getLayoutItem(type);
    return `<span>${item.tipoRegistro} · ${FILES[type].label}</span>`;
  }).join("");
}

function renderPreview() {
  const box = $("csvPreview");
  if (!box) return;
  box.textContent = state.generated[state.activePreview] || "Nenhum preview gerado.";
}

function syncChips() {
  $("chipRecords").textContent = value("recordCount") || "-";
  $("chipClient").textContent = value("cliente") || value("clienteParcela") || "-";
  $("chipPhase").textContent = value("fase") || "-";
  $("chipDueDate").textContent = value("dataVencimento") || value("dataPrazo") || "-";
  $("chipValue").textContent = value("valorOriginal") || value("valorContrato") || value("despesaValor") || "-";
}

function updateDownloadLabels() {
  const selected = selectedFiles();
  const allLabel = selected.length === 3 && selected.every(type => ["financiado", "contrato", "parcela"].includes(type))
    ? "Baixar primeira recepção"
    : `Baixar selecionados (${selected.length})`;

  if ($("btnDownloadAll")) $("btnDownloadAll").innerHTML = `<i class="fa-solid fa-file-arrow-down me-2"></i>${allLabel}`;
  if ($("btnDownloadCurrent") && FILES[state.activePreview]) {
    $("btnDownloadCurrent").innerHTML = `<i class="fa-solid fa-download me-2"></i>Baixar ${FILES[state.activePreview].label}`;
  }
}

function updateAll() {
  state.selectedTypes = selectedFiles();
  if (!state.selectedTypes.length) state.selectedTypes = ["financiado"];
  if (!state.selectedTypes.includes(state.fileType)) state.fileType = state.selectedTypes[0];
  if (!state.selectedTypes.includes(state.activePreview)) state.activePreview = state.fileType;

  renderTipoRegistroGrid();
  renderEditTabs();
  renderRecordContext();
  updateFieldVisibility();
  validateSelected();
  markRequiredFields();
  generateAllPreviews();
  renderValidation();
  renderSelectedExportList();
  renderPreviewTabs();
  renderPreview();
  syncChips();
  updateDownloadLabels();
}

function downloadText(filename, content) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCurrent() {
  const validation = validate(state.activePreview);
  validateSelected();
  renderValidation();
  markRequiredFields();

  if (!validation.isValid) {
    state.fileType = state.activePreview;
    updateAll();
    document.getElementById("step-required")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  downloadText(FILES[state.activePreview].filename, buildCsv(state.activePreview, false));
}

function downloadAll() {
  validateSelected();
  renderValidation();
  markRequiredFields();

  if (!state.validation.isValid) {
    const firstInvalid = selectedFiles().find(type => !(state.validationByType[type]?.isValid));
    if (firstInvalid) {
      state.fileType = firstInvalid;
      state.activePreview = firstInvalid;
      updateAll();
    }
    document.getElementById("step-required")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  selectedFiles().forEach((type, index) => {
    setTimeout(() => downloadText(FILES[type].filename, buildCsv(type, false)), index * 350);
  });
}

function fillExample() {
  $("recordCount").value = "100";
  $("cliente").value = "1320";
  $("contratoInicial").value = "30";
  $("contratoSufixo").value = "-ARRIBA";
  $("fase").value = "AM";
  $("nomeBase").value = "Cliente Generico";
  $("tipoPessoa").value = "F";
  $("documentMode").value = "auto";
  $("dataVencimento").value = "09/02/2026";
  $("valorOriginal").value = "100";
  $("tipoParcela").value = "0";
  $("numeroParcela").value = "1";
  $("devolucaoGeral").value = "N";
  $("lojaCodLoja").value = "001";
  $("lojaNome").value = "Loja Arriba";
  $("emailValor").value = "cliente.arriba@email.com";
  $("dddTelefone").value = "11";
  $("telefoneNumero").value = "999999999";
  $("logradouro").value = "Rua Arriba";
  $("cidade").value = "São Paulo";
  $("uf").value = "SP";
  $("historicoTexto").value = "Histórico gerado pela Arriba Platform";
  $("tipoGarantia").value = "V";
  $("descricaoGarantia").value = "Garantia gerada pela Arriba Platform";
  $("avalistaNome").value = "Avalista Generico";
  $("dadosAuxDescricao").value = "Campo auxiliar";
  $("dadosAuxValor").value = "Valor auxiliar";
  $("numeroProcesso").value = "0000000-00.2026.8.26.0000";
  $("andamentoDescricao").value = "Andamento gerado pela Arriba Platform";
  $("dataPrazo").value = "09/02/2026";
  $("localizador").value = "Localizador padrão";
  $("despesaCodigo").value = "DESP001";
  $("despesaValor").value = "10";
  $("mensagemOperacao").value = "Mensagem operacional gerada pela Arriba Platform";
  updateAll();
}

function clearForm() {
  document.querySelectorAll("input").forEach(input => {
    if (input.type !== "checkbox") input.value = "";
  });
  document.querySelectorAll("select").forEach(select => select.selectedIndex = 0);

  $("recordCount").value = "100";
  $("contratoInicial").value = "30";
  $("contratoSufixo").value = "-ARRIBA";

  state.selectedTypes = ["financiado", "contrato", "parcela"];
  state.fileType = "financiado";
  state.activePreview = "financiado";

  updateAll();
}

function copyPreview() {
  const text = $("csvPreview")?.textContent || "";
  navigator.clipboard?.writeText(text);
}

document.addEventListener("DOMContentLoaded", () => {
  $("btnPrimeiraRecepcao")?.addEventListener("click", () => {
    state.selectedTypes = ["financiado", "contrato", "parcela"];
    state.fileType = "financiado";
    state.activePreview = "financiado";
    updateAll();
    document.getElementById("step-required")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll("[data-scroll-to]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".step").forEach(step => step.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("input", updateAll);
    el.addEventListener("change", updateAll);
  });

  $("btnValidateTop")?.addEventListener("click", () => {
    updateAll();
    document.getElementById("step-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("btnFillExample")?.addEventListener("click", fillExample);
  $("btnClear")?.addEventListener("click", clearForm);
  $("btnDownloadCurrent")?.addEventListener("click", downloadCurrent);
  $("btnDownloadAll")?.addEventListener("click", downloadAll);
  $("btnCopyPreview")?.addEventListener("click", copyPreview);

  updateAll();
});
