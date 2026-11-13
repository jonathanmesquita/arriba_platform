/* Módulo: o RG vem de assets/js/fake-data-br.js, a fonte única dos
   geradores de dado fictício (lá ele tem teste automático). */
import { formatarRg, gerarRg } from "../../../assets/js/fake-data-br.js";

const state = {
  generator: "nomes",
  preview: "",
  dados: "",
  headers: [],
  sampleRows: [],
  lastQuantity: 10,
  assinatura: ""
};

const MAX_ROWS = 1000000;
const PREVIEW_LIMIT = 100;
const DOWNLOAD_CHUNK = 5000;

/* `label` é o que aparece no menu e no título: a palavra que a pessoa
   procura vem primeiro (era "Gerador de..." repetido onze vezes). A
   descrição diz o que sai, não convida a usar. */
const generatorMeta = {
  nomes: {
    label: "Nome",
    description: "Nomes completos inventados: um nome e dois sobrenomes."
  },
  cpf: {
    label: "CPF",
    description: "CPF com os dois dígitos verificadores calculados. Passa na validação, mas não pertence a ninguém."
  },
  rg: {
    label: "RG",
    description: "RG com dígito verificador no padrão de São Paulo: 8 dígitos e 1 verificador, que pode ser X. Outros estados têm regras próprias."
  },
  cnpj: {
    label: "CNPJ",
    description: "CNPJ com os dígitos verificadores calculados, no formato numérico atual ou no alfanumérico novo."
  },
  telefone: {
    label: "Telefone",
    description: "DDD e número de celular fictícios, em colunas separadas."
  },
  email: {
    label: "E-mail",
    description: "Nome e e-mail fictícios, sempre num domínio de exemplo."
  },
  cep: {
    label: "CEP",
    description: "CEP sorteado, com UF e cidade. O número não corresponde a um endereço real."
  },
  endereco: {
    label: "Endereço",
    description: "Logradouro, número, bairro, cidade, UF e CEP fictícios."
  },
  pessoa: {
    label: "Pessoa completa",
    description: "Um cadastro inteiro por linha: nome, CPF, RG, CEP, endereço, telefone e e-mail."
  },
  empresa: {
    label: "Empresa completa",
    description: "Um cadastro inteiro por linha: razão social, CNPJ, inscrição estadual, data de abertura, endereço e telefone."
  },
  lorem: {
    label: "Lorem Ipsum",
    description: "Texto de preenchimento para testar telas, relatórios e documentos."
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

/* As opções de quem usa viram o padrão dela: quem sempre gera 1 CPF sem
   pontuação não precisa escolher isso toda vez. Fica só neste navegador
   e, se o armazenamento estiver bloqueado, a tela funciona igual. */
const CHAVE_OPCOES = "arribaMassaDados:opcoes";
const CAMPOS_LEMBRADOS = ["quantity", "outputFormat", "punctuationMode", "cnpjFormat", "genderMode", "stateMode", "loremType"];

function lerOpcoesSalvas() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_OPCOES) || "{}");
    return salvo && typeof salvo === "object" ? salvo : {};
  } catch {
    return {};
  }
}

function salvarOpcoes() {
  const opcoes = { generator: state.generator };
  CAMPOS_LEMBRADOS.forEach(id => { opcoes[id] = document.getElementById(id)?.value ?? ""; });
  try {
    localStorage.setItem(CHAVE_OPCOES, JSON.stringify(opcoes));
  } catch {
    /* sem armazenamento: só não lembra na próxima visita */
  }
}

function aplicarOpcoesSalvas(salvo) {
  CAMPOS_LEMBRADOS.forEach(id => {
    const campo = document.getElementById(id);
    const valor = salvo[id];
    if (!campo || typeof valor !== "string" || valor === "") return;
    // Em <select>, só aceita valor que existe na lista.
    if (campo.tagName === "SELECT" && ![...campo.options].some(o => o.value === valor)) return;
    campo.value = valor;
  });
  document.getElementById("quantity").value = String(getQuantity());
}

document.addEventListener("DOMContentLoaded", () => {
  const salvo = lerOpcoesSalvas();
  montarSeletorDeCelular();
  aplicarOpcoesSalvas(salvo);
  bindEvents();
  setGenerator(generatorMeta[salvo.generator] ? salvo.generator : "nomes");
});

/* O mesmo menu, como <select>, para telas estreitas. Sai da mesma lista
   (generatorMeta), então gerador novo aparece nos dois sem lembrar. */
function montarSeletorDeCelular() {
  const seletor = document.getElementById("generatorSelect");
  seletor.replaceChildren(...Object.entries(generatorMeta).map(([id, meta]) => {
    const opcao = document.createElement("option");
    opcao.value = id;
    opcao.textContent = meta.label;
    return opcao;
  }));
}

function bindEvents() {
  document.querySelectorAll("[data-generator]").forEach(button => {
    button.addEventListener("click", () => setGenerator(button.dataset.generator));
  });
  document.getElementById("generatorSelect").addEventListener("change", evento => setGenerator(evento.target.value));

  // "Gerar novos" e o Enter em qualquer campo: sorteia outro lote.
  document.getElementById("formOpcoes").addEventListener("submit", evento => {
    evento.preventDefault();
    generatePreview();
  });
  document.getElementById("btnDownload").addEventListener("click", downloadFullFile);
  document.getElementById("btnCopy").addEventListener("click", copyPreview);

  /* Qualquer opção muda o resultado na hora: o que está na tela é sempre
     o que as opções pedem, e "Copiar" nunca leva dado velho. A quantidade
     espera a pessoa parar de digitar. */
  const formulario = document.getElementById("formOpcoes");
  let espera = 0;
  formulario.addEventListener("input", evento => {
    if (evento.target.id !== "quantity") return;
    clearTimeout(espera);
    espera = setTimeout(gerarSeMudou, 250);
  });
  formulario.addEventListener("change", evento => {
    clearTimeout(espera);
    // Ao sair do campo, ele mostra o número que vale (1 a 1.000.000).
    if (evento.target.id === "quantity") evento.target.value = String(getQuantity());
    gerarSeMudou();
  });
}

/* As opções em vigor, numa linha só, para saber se algo mudou de verdade. */
function assinaturaDasOpcoes() {
  return [state.generator, getQuantity(), ...CAMPOS_LEMBRADOS.slice(1).map(id => document.getElementById(id)?.value)].join("|");
}

/* Sair do campo de quantidade dispara "change" mesmo sem mudar o número.
   Sem esta conferência, clicar em Copiar logo depois de digitar trocava
   os dados debaixo do dedo — a pessoa copiava outro registro, não o que viu. */
function gerarSeMudou() {
  if (assinaturaDasOpcoes() !== state.assinatura) generatePreview();
}

function setGenerator(generator) {
  state.generator = generator;

  document.querySelectorAll("[data-generator]").forEach(button => {
    const ativo = button.dataset.generator === generator;
    button.classList.toggle("active", ativo);
    button.setAttribute("aria-pressed", String(ativo));
  });
  document.getElementById("generatorSelect").value = generator;

  const meta = generatorMeta[generator];
  document.getElementById("generatorTitle").textContent = meta.label;
  document.getElementById("generatorDescription").textContent = meta.description;

  toggleField("punctuationField", ["cpf", "rg", "cnpj", "cep"].includes(generator));
  toggleField("cnpjFormatField", generator === "cnpj");
  toggleField("genderField", ["nomes", "pessoa"].includes(generator));
  toggleField("stateField", ["cep", "endereco", "pessoa", "empresa"].includes(generator));
  toggleField("loremTypeField", generator === "lorem");

  generatePreview();
}

function toggleField(id, show) {
  document.getElementById(id)?.classList.toggle("hidden", !show);
}

function getQuantity() {
  const value = Number(document.getElementById("quantity")?.value || 10);
  return clamp(Number.isFinite(value) ? Math.floor(value) : 10, 1, MAX_ROWS);
}

function formatoEscolhido() {
  return document.getElementById("outputFormat")?.value === "txt" ? "txt" : "csv";
}

/* Gera e mostra. É chamada ao abrir a página, ao trocar de gerador e a
   cada opção mexida — a tela nunca fica vazia nem desatualizada. */
function generatePreview() {
  const quantity = getQuantity();
  const previewQuantity = Math.min(quantity, PREVIEW_LIMIT);
  const formato = formatoEscolhido();

  state.lastQuantity = quantity;
  state.assinatura = assinaturaDasOpcoes();
  state.headers = getHeaders(state.generator);
  state.sampleRows = Array.from({ length: previewQuantity }, (_, index) => generateRow(state.generator, index + 1));
  state.dados = buildBody(state.sampleRows);
  state.preview = buildOutput(state.headers, state.sampleRows);

  /* A linha de título do CSV aparece apagada: ela vai no arquivo, mas não
     na cópia. Montado com nós de texto, nunca com HTML em texto. */
  const caixa = document.getElementById("previewBox");
  if (formato === "csv") {
    const titulo = document.createElement("span");
    titulo.className = "titulo-csv";
    titulo.textContent = state.headers.join(";") + "\n";
    caixa.replaceChildren(titulo, document.createTextNode(state.dados));
  } else {
    caixa.textContent = state.dados;
  }
  caixa.scrollTop = 0;

  const registros = (n) => `${n.toLocaleString("pt-BR")} ${n === 1 ? "registro" : "registros"}`;
  document.getElementById("resultadoInfo").textContent = quantity > PREVIEW_LIMIT
    ? `Mostrando ${PREVIEW_LIMIT} de ${registros(quantity)}. O arquivo traz todos.`
    : registros(quantity) + (formato === "csv" ? ". A primeira linha é o título das colunas." : ".");
  document.getElementById("btnDownloadTexto").textContent = `Baixar ${formato.toUpperCase()}`;

  restaurarBotaoCopiar();
  setMessage("");
  salvarOpcoes();
}

function getHeaders(generator) {
  const map = {
    nomes: ["Nome"],
    cpf: ["CPF"],
    rg: ["RG"],
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
    rg: [generateRg(punctuationEnabled())],
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

/* Só os dados, sem a linha de título — é o que "Copiar dados" leva para a
   área de transferência: quem copia quer colar o valor num campo ou numa
   planilha, e o "CPF" da primeira linha ia junto. */
function buildBody(rows) {
  const format = document.getElementById("outputFormat")?.value || "csv";

  if (format === "txt") {
    return rows.map(row => row.join(" | ")).join("\n");
  }

  return rows.map(row => row.map(escapeCsv).join(";")).join("\n");
}

/* O que aparece no preview: igual ao arquivo baixado, que em CSV começa
   pela linha de título. */
function buildOutput(headers, rows) {
  const format = document.getElementById("outputFormat")?.value || "csv";
  const body = buildBody(rows);

  return format === "txt" ? body : `${headers.join(";")}\n${body}`;
}

async function downloadFullFile() {
  const quantity = getQuantity();
  const headers = getHeaders(state.generator);
  const format = document.getElementById("outputFormat")?.value || "csv";
  const extension = format === "txt" ? "txt" : "csv";
  const filename = `massa_${state.generator}_${quantity}.${extension}`;

  const botao = document.getElementById("btnDownload");
  botao.disabled = true;
  setMessage(`Gerando o arquivo com ${quantity.toLocaleString("pt-BR")} ${quantity === 1 ? "registro" : "registros"}…`);

  const parts = [];
  if (format === "csv") {
    parts.push("\uFEFF" + headers.join(";") + "\n");
  }

  for (let start = 1; start <= quantity; start += DOWNLOAD_CHUNK) {
    const end = Math.min(start + DOWNLOAD_CHUNK - 1, quantity);
    const lines = [];

    for (let i = start; i <= end; i++) {
      // As linhas que estão na tela vão para o arquivo como estão: o que
      // a pessoa conferiu é o que ela baixa. Daí em diante, sorteia.
      const row = state.sampleRows[i - 1] || generateRow(state.generator, i);
      lines.push(format === "csv" ? row.map(escapeCsv).join(";") : row.join(" | "));
    }

    parts.push(lines.join("\n") + (end < quantity ? "\n" : ""));
    await nextFrame();
  }

  const mime = format === "csv" ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;";
  downloadBlob(parts, filename, mime);
  botao.disabled = false;
  setMessage(`Arquivo ${filename} baixado.`, "ok");
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

/* Antes eram 9 dígitos sorteados, sem verificador: o RG da "pessoa
   completa" não passava em nenhuma conferência. */
function generateRg(punctuated = true) {
  const rg = gerarRg();
  return punctuated ? formatarRg(rg) : rg;
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

/* Linha de estado, lida por leitor de tela (role="status"). Vazia, some. */
function setMessage(text, tipo = "") {
  const box = document.getElementById("messageBox");
  box.textContent = text;
  box.dataset.tipo = tipo;
}

let voltaDoCopiar = 0;

function restaurarBotaoCopiar() {
  clearTimeout(voltaDoCopiar);
  const botao = document.getElementById("btnCopy");
  botao.dataset.estado = "";
  document.getElementById("btnCopyTexto").textContent = "Copiar";
  document.getElementById("btnCopyIcone").className = "fa-regular fa-copy";
}

/* Copia só os registros, sem a linha de título. A resposta aparece no
   próprio botão — é para onde a pessoa está olhando — e na linha de estado. */
async function copyPreview() {
  const copiados = state.sampleRows.length;
  const pedidos = state.lastQuantity || copiados;
  const quantos = copiados === 1 ? "1 registro copiado" : `${copiados.toLocaleString("pt-BR")} registros copiados`;
  const semTitulo = formatoEscolhido() === "csv" ? ", sem a linha de título" : "";
  const resto = pedidos > copiados
    ? ` São os ${copiados} da tela; para os ${pedidos.toLocaleString("pt-BR")}, baixe o arquivo.`
    : "";

  const copiou = await copyText(state.dados);
  if (!copiou) {
    setMessage("Não foi possível copiar. Selecione o texto do resultado e use Ctrl+C.", "erro");
    return;
  }

  const botao = document.getElementById("btnCopy");
  botao.dataset.estado = "copiado";
  document.getElementById("btnCopyTexto").textContent = "Copiado";
  document.getElementById("btnCopyIcone").className = "fa-solid fa-check";
  setMessage(`${quantos}${semTitulo}.${resto}`, "ok");
  clearTimeout(voltaDoCopiar);
  voltaDoCopiar = setTimeout(restaurarBotaoCopiar, 2000);
}

/* Devolve se copiou. O segundo caminho é para navegador sem a API de
   área de transferência (ou página fora de HTTPS). */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copiou = false;
    try { copiou = document.execCommand("copy"); } catch { copiou = false; }
    textarea.remove();
    return copiou;
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
