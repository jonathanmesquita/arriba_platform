const state = {
  generator: "nomes",
  preview: "",
  headers: [],
  sampleRows: [],
  lastQuantity: 10
};

const MAX_ROWS = 1000000;
const PREVIEW_LIMIT = 100;
const DOWNLOAD_CHUNK = 5000;

const generatorMeta = {
  nomes: {
    label: "Nomes",
    title: "Gerador de nomes",
    description: "Use nosso gerador de nomes para gerar nomes fictícios. Escolha a quantidade e gere o preview antes de baixar."
  },
  cpf: {
    label: "CPF",
    title: "Gerador de CPF válido",
    description: "Utilize nosso gerador de CPF. Um novo número válido será gerado com ou sem pontuação."
  },
  cnpj: {
    label: "CNPJ",
    title: "Gerador de CNPJ válido",
    description: "Gere CNPJ numérico atual ou CNPJ alfanumérico novo para testes de massa de dados."
  },
  telefone: {
    label: "Telefone",
    title: "Gerador de telefone",
    description: "Gere telefones fictícios para testes de cadastro, importação e validação."
  },
  email: {
    label: "E-mail",
    title: "Gerador de e-mail",
    description: "Gere e-mails fictícios usando nomes de teste e domínios controlados."
  },
  cep: {
    label: "CEP",
    title: "Gerador de CEP",
    description: "Gere CEPs fictícios para testes. Você pode refinar por estado."
  },
  endereco: {
    label: "Endereço",
    title: "Gerador de endereço",
    description: "Gere logradouro, número, bairro, cidade, UF e CEP para testes."
  },
  pessoa: {
    label: "Pessoa",
    title: "Gerador de documentos de pessoas",
    description: "Gere pessoa completa com nome, CPF, RG, CEP, endereço, telefone e e-mail."
  },
  empresa: {
    label: "Empresa",
    title: "Gerador de documentos de empresas",
    description: "Gere empresa completa com razão social, CNPJ, inscrição estadual, endereço e telefone."
  },
  lorem: {
    label: "Lorem",
    title: "Gerador de Texto Lorem Ipsum",
    description: "Gere texto Lorem Ipsum para testar telas, relatórios e documentação."
  }
};

const nomesMasculinos = ["João", "Carlos", "Pedro", "Lucas", "Marcos", "Rafael", "André", "Bruno", "Felipe", "Gustavo", "Caio", "Eduardo"];
const nomesFemininos = ["Maria", "Ana", "Juliana", "Fernanda", "Patrícia", "Beatriz", "Camila", "Larissa", "Mariana", "Aline", "Bianca", "Clara"];
const sobrenomes = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira", "Almeida", "Ferreira", "Rocha", "Mesquita", "Duarte"];
const empresas = ["Tech", "Dados", "Soluções", "Digital", "Serviços", "Cloud", "Sistemas", "Consultoria"];
const logradouros = ["Rua das Acácias", "Avenida Brasil", "Rua do Comércio", "Alameda Santos", "Rua São Bento", "Avenida Paulista", "Rua das Palmeiras"];
const bairros = ["Centro", "Jardim América", "Vila Nova", "Bela Vista", "Santa Cecília", "Moema", "Liberdade"];
const cidadesPorUf = {
  SP: ["São Paulo", "Campinas", "Santos", "Osasco", "Guarulhos"],
  RJ: ["Rio de Janeiro", "Niterói", "Petrópolis", "Macaé"],
  MG: ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora"],
  RS: ["Porto Alegre", "Caxias do Sul", "Canoas"],
  PR: ["Curitiba", "Londrina", "Maringá"],
  SC: ["Florianópolis", "Joinville", "Blumenau"],
  BA: ["Salvador", "Feira de Santana", "Vitória da Conquista"],
  PE: ["Recife", "Olinda", "Caruaru"]
};
const ufs = Object.keys(cidadesPorUf);
const loremWords = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(" ");

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  setGenerator("nomes");
});

function bindEvents() {
  document.querySelectorAll("[data-generator]").forEach(button => {
    button.addEventListener("click", () => setGenerator(button.dataset.generator));
  });

  document.getElementById("btnGenerate")?.addEventListener("click", generatePreview);
  document.getElementById("btnHeroGenerate")?.addEventListener("click", () => {
    document.getElementById("generatorSection")?.scrollIntoView({ behavior: "smooth" });
    generatePreview();
  });
  document.getElementById("btnHeroPreview")?.addEventListener("click", () => {
    document.getElementById("previewSection")?.scrollIntoView({ behavior: "smooth" });
  });
  document.getElementById("btnDownload")?.addEventListener("click", downloadFullFile);
  document.getElementById("btnCopy")?.addEventListener("click", copyPreview);
  document.getElementById("btnClear")?.addEventListener("click", clearPreview);
  document.getElementById("quantity")?.addEventListener("input", updateChips);
  document.getElementById("outputFormat")?.addEventListener("change", updateChips);
}

function setGenerator(generator) {
  state.generator = generator;

  document.querySelectorAll("[data-generator]").forEach(button => {
    button.classList.toggle("active", button.dataset.generator === generator);
  });

  const meta = generatorMeta[generator];
  document.getElementById("generatorTitle").textContent = meta.title;
  document.getElementById("generatorDescription").textContent = meta.description;
  document.getElementById("chipGenerator").textContent = meta.label;

  toggleField("punctuationField", ["cpf", "cnpj", "cep"].includes(generator));
  toggleField("cnpjFormatField", generator === "cnpj");
  toggleField("genderField", ["nomes", "pessoa"].includes(generator));
  toggleField("stateField", ["cep", "endereco", "pessoa", "empresa"].includes(generator));
  toggleField("loremTypeField", generator === "lorem");

  clearPreview(false);
  updateChips();
}

function toggleField(id, show) {
  document.getElementById(id)?.classList.toggle("hidden", !show);
}

function getQuantity() {
  const value = Number(document.getElementById("quantity")?.value || 10);
  return clamp(Number.isFinite(value) ? Math.floor(value) : 10, 1, MAX_ROWS);
}

function updateChips() {
  const quantity = getQuantity();
  const format = document.getElementById("outputFormat")?.value?.toUpperCase() || "CSV";

  document.getElementById("chipQuantity").textContent = String(quantity);
  document.getElementById("chipFormat").textContent = format;
}

function generatePreview() {
  const quantity = getQuantity();
  const previewQuantity = Math.min(quantity, PREVIEW_LIMIT);

  state.lastQuantity = quantity;
  state.headers = getHeaders(state.generator);
  state.sampleRows = Array.from({ length: previewQuantity }, (_, index) => generateRow(state.generator, index + 1));
  state.preview = buildOutput(state.headers, state.sampleRows);

  document.getElementById("previewBox").textContent = state.preview;
  document.getElementById("chipStatus").textContent = "Gerado";
  document.getElementById("chipStatus").style.color = "var(--ok)";

  const extra = quantity > PREVIEW_LIMIT
    ? ` Preview exibindo ${PREVIEW_LIMIT} de ${quantity.toLocaleString("pt-BR")} registros.`
    : ` Preview exibindo ${quantity} registro(s).`;

  setMessage(`Dados prontos para geração.${extra}`, false);
  document.getElementById("previewSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearPreview(showMessage = true) {
  state.preview = "";
  state.sampleRows = [];
  document.getElementById("previewBox").textContent = "Nenhum dado gerado ainda.";
  document.getElementById("chipStatus").textContent = "Pronto";
  document.getElementById("chipStatus").style.color = "";
  if (showMessage) setMessage("Preview limpo. Configure as opções e gere novamente.", true);
}

async function copyPreview() {
  if (!state.preview) generatePreview();
  await copyText(state.preview);
}

function getHeaders(generator) {
  const map = {
    nomes: ["Nome"],
    cpf: ["CPF"],
    cnpj: ["CNPJ"],
    telefone: ["DDD", "Telefone"],
    email: ["Nome", "Email"],
    cep: ["CEP", "UF", "Cidade"],
    endereco: ["Logradouro", "Numero", "Bairro", "Cidade", "UF", "CEP"],
    pessoa: ["Nome", "CPF", "RG", "CEP", "Endereco", "Numero", "Bairro", "Cidade", "UF", "Telefone", "Email"],
    empresa: ["Razao_Social", "CNPJ", "Inscricao_Estadual", "Data_Abertura", "Endereco", "Numero", "Cidade", "UF", "CEP", "Telefone"],
    lorem: ["Texto"]
  };

  return map[generator] || ["Valor"];
}

function generateRow(generator, index) {
  const uf = selectedUf();
  const cidade = randomFrom(cidadesPorUf[uf]);
  const nome = generateName();
  const empresa = generateCompanyName();

  const map = {
    nomes: [nome],
    cpf: [formatCpf(generateCpf(), punctuationEnabled())],
    cnpj: [generateCnpjValue()],
    telefone: [generateDdd(), generatePhone(false)],
    email: [nome, generateEmail(nome, index)],
    cep: [formatCep(generateCep(), punctuationEnabled()), uf, cidade],
    endereco: [randomFrom(logradouros), randomInt(10, 9999), randomFrom(bairros), cidade, uf, formatCep(generateCep(), true)],
    pessoa: [
      nome,
      formatCpf(generateCpf(), true),
      generateRg(true),
      formatCep(generateCep(), true),
      randomFrom(logradouros),
      randomInt(10, 9999),
      randomFrom(bairros),
      cidade,
      uf,
      `${generateDdd()} ${generatePhone(true)}`,
      generateEmail(nome, index)
    ],
    empresa: [
      empresa,
      generateCnpjValue(true),
      String(randomInt(100000000, 999999999)),
      pastDate(randomInt(365, 3650)),
      randomFrom(logradouros),
      randomInt(10, 9999),
      cidade,
      uf,
      formatCep(generateCep(), true),
      `${generateDdd()} ${generatePhone(true)}`
    ],
    lorem: [generateLorem()]
  };

  return map[generator] || [nome];
}

function buildOutput(headers, rows) {
  const format = document.getElementById("outputFormat")?.value || "csv";

  if (format === "txt") {
    return rows.map(row => row.join(" | ")).join("\n");
  }

  return `${headers.join(";")}\n${rows.map(row => row.map(escapeCsv).join(";")).join("\n")}`;
}

async function downloadFullFile() {
  const quantity = getQuantity();
  const headers = getHeaders(state.generator);
  const format = document.getElementById("outputFormat")?.value || "csv";
  const extension = format === "txt" ? "txt" : "csv";
  const filename = `massa_${state.generator}_${quantity}.${extension}`;

  setMessage(`Gerando arquivo com ${quantity.toLocaleString("pt-BR")} registro(s). Aguarde...`, false);

  const parts = [];
  if (format === "csv") {
    parts.push("\uFEFF" + headers.join(";") + "\n");
  }

  for (let start = 1; start <= quantity; start += DOWNLOAD_CHUNK) {
    const end = Math.min(start + DOWNLOAD_CHUNK - 1, quantity);
    const lines = [];

    for (let i = start; i <= end; i++) {
      const row = generateRow(state.generator, i);
      lines.push(format === "csv" ? row.map(escapeCsv).join(";") : row.join(" | "));
    }

    parts.push(lines.join("\n") + (end < quantity ? "\n" : ""));
    await nextFrame();
  }

  const mime = format === "csv" ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;";
  downloadBlob(parts, filename, mime);
  setMessage(`Arquivo ${filename} gerado com sucesso.`, false);
}

function generateCnpjValue(forcePunctuated = null) {
  const format = document.getElementById("cnpjFormat")?.value || "numerico";
  const punctuated = forcePunctuated === null ? punctuationEnabled() : forcePunctuated;

  if (format === "alfanumerico") {
    return formatCnpj(generateCnpjAlphanumeric(), punctuated);
  }

  return formatCnpj(generateCnpjNumeric(), punctuated);
}

function punctuationEnabled() {
  return (document.getElementById("punctuationMode")?.value || "pontuado") === "pontuado";
}

function selectedUf() {
  return document.getElementById("stateMode")?.value || randomFrom(ufs);
}

function generateName() {
  const gender = document.getElementById("genderMode")?.value || "aleatorio";
  const list = gender === "masculino" ? nomesMasculinos : gender === "feminino" ? nomesFemininos : randomFrom([nomesMasculinos, nomesFemininos]);
  return `${randomFrom(list)} ${randomFrom(sobrenomes)} ${randomFrom(sobrenomes)}`;
}

function generateCompanyName() {
  return `${randomFrom(sobrenomes)} ${randomFrom(empresas)} LTDA`;
}

function generateCpf() {
  const nums = Array.from({ length: 9 }, () => randomInt(0, 9));
  nums.push(cpfDigit(nums));
  nums.push(cpfDigit(nums));
  return nums.join("");
}

function cpfDigit(nums) {
  let sum = 0;
  const factorStart = nums.length + 1;
  nums.forEach((num, index) => sum += num * (factorStart - index));
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

function formatCpf(cpf, punctuated = true) {
  return punctuated ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : cpf;
}

function generateCnpjNumeric() {
  const n = Array.from({ length: 8 }, () => randomInt(0, 9)).concat([0, 0, 0, 1]);
  n.push(cnpjDigit(n));
  n.push(cnpjDigit(n));
  return n.join("");
}

function generateCnpjAlphanumeric() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const base = Array.from({ length: 12 }, (_, index) => {
    if (index >= 8 && index <= 10) return "0";
    if (index === 11) return "1";
    return chars[randomInt(0, chars.length - 1)];
  });

  base.push(cnpjAlphaDigit(base));
  base.push(cnpjAlphaDigit(base));

  return base.join("");
}

function cnpjDigit(nums) {
  const weights = nums.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = nums.reduce((acc, num, index) => acc + Number(num) * weights[index], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function cnpjAlphaDigit(chars) {
  const weights = chars.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = chars.reduce((acc, char, index) => acc + charValue(char) * weights[index], 0);
  const rest = sum % 11;
  return String(rest < 2 ? 0 : 11 - rest);
}

function charValue(char) {
  return String(char).toUpperCase().charCodeAt(0) - 48;
}

function formatCnpj(cnpj, punctuated = true) {
  return punctuated ? cnpj.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, "$1.$2.$3/$4-$5") : cnpj;
}

function generateRg(punctuated = true) {
  const base = `${randomInt(10,99)}${randomInt(100,999)}${randomInt(100,999)}${randomInt(0,9)}`;
  return punctuated ? base.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, "$1.$2.$3-$4") : base;
}

function generateCep() {
  return `${randomInt(10000,99999)}${randomInt(100,999)}`;
}

function formatCep(cep, punctuated = true) {
  return punctuated ? cep.replace(/(\d{5})(\d{3})/, "$1-$2") : cep;
}

function generateDdd() {
  return randomFrom(["11", "21", "31", "41", "47", "51", "61", "71", "81"]);
}

function generatePhone(withDash = true) {
  const phone = `9${randomInt(1000,9999)}${randomInt(1000,9999)}`;
  return withDash ? phone.replace(/(\d{5})(\d{4})/, "$1-$2") : phone;
}

function generateEmail(name, index) {
  return `${slugify(name)}.${index}@exemplo.com`;
}

function generateLorem() {
  const type = document.getElementById("loremType")?.value || "paragrafos";
  const sentence = () => {
    const words = Array.from({ length: randomInt(12, 24) }, () => randomFrom(loremWords));
    return capitalize(words.join(" ")) + ".";
  };

  if (type === "palavras") {
    return Array.from({ length: 12 }, () => randomFrom(loremWords)).join(" ");
  }

  if (type === "html") {
    return `<p>${sentence()} ${sentence()}</p>`;
  }

  return `${sentence()} ${sentence()}`;
}

function pastDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function setMessage(text, warning = false) {
  const box = document.getElementById("messageBox");
  box.textContent = text;
  box.classList.toggle("warn", warning);
  box.classList.toggle("error", false);
}

async function copyPreview() {
  if (!state.preview) generatePreview();
  await copyText(document.getElementById("previewBox").textContent || "");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    setMessage("Preview copiado para a área de transferência.", false);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    setMessage("Preview copiado para a área de transferência.", false);
  }
}

function downloadBlob(parts, filename, type) {
  const blob = new Blob(parts, { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value = "") {
  const text = String(value ?? "");
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function nextFrame() {
  return new Promise(resolve => setTimeout(resolve, 0));
}
