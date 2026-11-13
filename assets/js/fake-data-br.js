// Geradores de dados ficticios brasileiros (nome, CPF valido, telefone, CEP,
// endereco, e-mail) - modulo compartilhado, sem dependencia de DOM.
// Mesma logica/algoritmos (digito verificador de CPF etc.) já usados em
// tools/cobranca/massa-dados/script.js, extraidos aqui para reuso por outras
// ferramentas (ex.: geradores de layout CSV com massa ficticia).

const NOMES_MASCULINOS = ["Joao", "Carlos", "Pedro", "Lucas", "Marcos", "Rafael", "Andre", "Bruno", "Felipe", "Gustavo", "Caio", "Eduardo", "Anderson", "Ricardo", "Marcelo"];
const NOMES_FEMININOS = ["Maria", "Ana", "Juliana", "Fernanda", "Patricia", "Beatriz", "Camila", "Larissa", "Mariana", "Aline", "Bianca", "Clara", "Caroline", "Priscila", "Natalia"];
const SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira", "Almeida", "Ferreira", "Rocha", "Mesquita", "Duarte", "Ramos", "Barbosa", "Nascimento", "Cardoso"];
const LOGRADOUROS = ["Rua das Acacias", "Avenida Brasil", "Rua do Comercio", "Alameda Santos", "Rua Sao Bento", "Avenida Paulista", "Rua das Palmeiras", "Rua Um", "Travessa Sao Jose"];
const BAIRROS = ["Centro", "Jardim America", "Vila Nova", "Bela Vista", "Santa Cecilia", "Jardim Modelo", "Vila Suissa", "Boa Vista"];
const CIDADES_POR_UF = {
  SP: ["Sao Paulo", "Campinas", "Santos", "Mogi das Cruzes", "Suzano", "Diadema", "Jacarei"],
  RJ: ["Rio de Janeiro", "Niteroi", "Petropolis"],
  MG: ["Belo Horizonte", "Uberlandia", "Conselheiro Lafaiete"],
  ES: ["Vitoria", "Vila Velha", "Serra"],
  CE: ["Fortaleza", "Caucaia"]
};
const UFS = Object.keys(CIDADES_POR_UF);

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFrom(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

export function gerarNome() {
  const primeiro = Math.random() < 0.5 ? randomFrom(NOMES_MASCULINOS) : randomFrom(NOMES_FEMININOS);
  return `${primeiro} ${randomFrom(SOBRENOMES)} ${randomFrom(SOBRENOMES)}`;
}

// CPF numerico com digitos verificadores validos (mesmo algoritmo do
// gerador de massa de dados: modulo 11 sobre os 9 dígitos base).
export function gerarCpf() {
  const nums = Array.from({ length: 9 }, () => randomInt(0, 9));
  nums.push(cpfDigito(nums));
  nums.push(cpfDigito(nums));
  return nums.join("");
}

function cpfDigito(nums) {
  let soma = 0;
  const inicioFator = nums.length + 1;
  nums.forEach((num, index) => { soma += num * (inicioFator - index); });
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/* RG no padrão de São Paulo: 8 dígitos e 1 dígito verificador, que pode ser
   "X". Não existe regra nacional — cada estado emite o seu, e vários não
   têm dígito nenhum; este é o cálculo mais usado em massa de teste.
   Conta: cada dígito vezes o peso 2, 3, ... 9 (da esquerda para a direita);
   o verificador é o que falta para a soma chegar a um múltiplo de 11.
   Faltando 10, vira "X"; não faltando nada, "0". */
export function digitoRg(base) {
  const digitos = String(base).replace(/\D/g, "");
  if (digitos.length !== 8) throw new Error("A base do RG tem 8 dígitos.");
  const soma = [...digitos].reduce((acc, d, i) => acc + Number(d) * (i + 2), 0);
  const falta = (11 - (soma % 11)) % 11;
  return falta === 10 ? "X" : String(falta);
}

// Devolve os 9 caracteres sem pontuação (ex.: "27488212X").
export function gerarRg() {
  const base = String(randomInt(10000000, 99999999));
  return base + digitoRg(base);
}

// "27488212X" -> "27.488.212-X". O que não tiver o formato volta como veio.
export function formatarRg(rg) {
  return String(rg).replace(/^(\d{2})(\d{3})(\d{3})([\dXx])$/, "$1.$2.$3-$4");
}

export function validarRg(rg) {
  const limpo = String(rg ?? "").replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{8}[\dX]$/.test(limpo)) return false;
  return digitoRg(limpo.slice(0, 8)) === limpo[8];
}

export function gerarDdd() {
  return randomFrom(["11", "21", "27", "31", "41", "47", "51", "61", "71", "81"]);
}

// Celular sem formatacao: DDD + 9 + 8 dígitos (padrao brasileiro atual).
export function gerarCelular() {
  return `${gerarDdd()}9${randomInt(1000, 9999)}${randomInt(1000, 9999)}`;
}

export function gerarEmail(nome, indice) {
  const slug = String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
  return `${slug}${indice}@exemplo.com`;
}

export function gerarUf() {
  return randomFrom(UFS);
}

export function gerarCidade(uf) {
  return randomFrom(CIDADES_POR_UF[uf] || CIDADES_POR_UF.SP);
}

export function gerarBairro() {
  return randomFrom(BAIRROS);
}

export function gerarLogradouro() {
  return randomFrom(LOGRADOUROS);
}

export function gerarCep() {
  return `${randomInt(10000, 99999)}${randomInt(0, 999)}`.padStart(8, "0");
}

// Data aleatoria (string "YYYY-MM-DD") entre duas datas (inclusive).
export function gerarDataEntre(dataInicioISO, dataFimISO) {
  const inicio = new Date(dataInicioISO).getTime();
  const fim = new Date(dataFimISO).getTime();
  const escolhida = new Date(inicio + Math.random() * Math.max(0, fim - inicio));
  return escolhida.toISOString().slice(0, 10);
}

// "YYYY-MM-DD" -> "DD/MM/YYYY" (formato usado nos layouts CSV brasileiros).
export function formatarDataBr(isoDate) {
  const [ano, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Numero -> string com virgula decimal (padrao BR), N casas.
export function formatarNumeroBr(valor, casas = 2) {
  return Number(valor).toFixed(casas).replace(".", ",");
}

export function gerarValorAleatorio(min, max, casas = 2) {
  const valor = min + Math.random() * (max - min);
  return Number(valor.toFixed(casas));
}
