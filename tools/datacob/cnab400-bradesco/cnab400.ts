/* =====================================================================
 * cnab400.ts — Parser + Gerador CNAB 400 (Bradesco / 237)
 * Módulo TypeScript PURO e agnóstico de framework.
 * Funciona igual em React, Vue, ou HTML/JS puro (basta compilar/importar).
 *
 * REGRA DE OURO
 * -------------
 * O manual CNAB é 1-indexado e inclusivo ("071 a 082").
 * String.prototype.slice() é 0-indexado e exclusivo no fim.
 * Portanto, para um campo "ini..fim":  linha.slice(ini - 1, fim)
 * Esse ajuste vive numa ÚNICA função (fld) — nunca se repete.
 * ===================================================================== */

// ---------- Tipos públicos ----------

export type FieldType = "N" | "A"; // Numérico (zeros à esq.) | Alfanumérico (espaços à dir.)
export type FieldFmt = "valor" | "data" | undefined;

export interface FieldDef {
  ini: number;
  fim: number;
  key: string;
  nome: string;
  type: FieldType;
  fmt?: FieldFmt;
  fixo?: string;
}

export interface CnabTitulo {
  linha: number;
  nossoNumero: string;
  numDocumento: string;
  ocorrencia: string;
  ocorrenciaDesc: string;
  dataVencimento: string; // DD/MM/AAAA
  valorTitulo: number; // reais
  valorPago: number; // reais
  dataCredito: string; // DD/MM/AAAA
  motivos: Array<{ cod: string; desc: string }>;
}

export interface CnabHeader {
  codEmpresa: string;
  nomeEmpresa: string;
  dataGravacao: string;
  avisoBancario: string;
  dataCredito: string;
  valido: boolean;
  erros: string[];
}

export interface CnabParseResult {
  header: CnabHeader | null;
  titulos: CnabTitulo[];
  totalLinhas: number;
  avisos: string[];
}

// ---------- Dicionário de campos (fonte única: lê E gera) ----------

/**
 * Nota sobre a "Coluna de Medição (396-401)" que apareceu no protótipo:
 * é inválida — o registro termina em 400. As posições 395-400 são o
 * Nº Seqüencial do Registro. Mapeamos o correto.
 */
export const HEADER_FIELDS: FieldDef[] = [
  { ini: 1, fim: 1, key: "idRegistro", nome: "Identificação do Registro", type: "N", fixo: "0" },
  { ini: 2, fim: 2, key: "idArquivo", nome: "Identificação Arquivo Retorno", type: "N", fixo: "2" },
  { ini: 3, fim: 9, key: "literalRetorno", nome: "Literal Retorno", type: "A", fixo: "RETORNO" },
  { ini: 10, fim: 11, key: "codServico", nome: "Código do Serviço", type: "N", fixo: "01" },
  { ini: 12, fim: 26, key: "literalServico", nome: "Literal Serviço", type: "A", fixo: "COBRANCA" },
  { ini: 27, fim: 46, key: "codEmpresa", nome: "Código da Empresa", type: "N" },
  { ini: 47, fim: 76, key: "nomeEmpresa", nome: "Nome da Empresa", type: "A" },
  { ini: 77, fim: 79, key: "numBradesco", nome: "Nº Bradesco (Compensação)", type: "N", fixo: "237" },
  { ini: 80, fim: 94, key: "nomeBanco", nome: "Nome do Banco", type: "A", fixo: "BRADESCO" },
  { ini: 95, fim: 100, key: "dataGravacao", nome: "Data da Gravação", type: "N", fmt: "data" },
  { ini: 101, fim: 108, key: "densidade", nome: "Densidade de Gravação", type: "N", fixo: "01600000" },
  { ini: 109, fim: 113, key: "avisoBancario", nome: "Nº Aviso Bancário", type: "N" },
  { ini: 114, fim: 379, key: "branco1", nome: "Branco", type: "A" },
  { ini: 380, fim: 385, key: "dataCredito", nome: "Data do Crédito", type: "N", fmt: "data" },
  { ini: 386, fim: 394, key: "branco2", nome: "Branco", type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro", nome: "Nº Seqüencial do Registro", type: "N", fixo: "000001" },
];

export const DETALHE_FIELDS: FieldDef[] = [
  { ini: 1, fim: 1, key: "idRegistro", nome: "Identificação do Registro", type: "N", fixo: "1" },
  { ini: 2, fim: 3, key: "tipoInscEmpresa", nome: "Tipo Inscrição Empresa", type: "N" },
  { ini: 4, fim: 17, key: "numInscEmpresa", nome: "Nº Inscrição Empresa", type: "N" },
  { ini: 18, fim: 20, key: "zeros1", nome: "Zeros", type: "N" },
  { ini: 21, fim: 37, key: "idEmpresaBanco", nome: "Ident. Empresa no Banco", type: "N" },
  { ini: 38, fim: 62, key: "controleParticip", nome: "Nº Controle do Participante", type: "A" },
  { ini: 63, fim: 70, key: "zeros2", nome: "Zeros", type: "N" },
  { ini: 71, fim: 82, key: "nossoNumero", nome: "Identificação do Título no Banco", type: "A" },
  { ini: 83, fim: 92, key: "usoBanco1", nome: "Uso do Banco", type: "A" },
  { ini: 93, fim: 104, key: "usoBanco2", nome: "Uso do Banco", type: "N" },
  { ini: 105, fim: 105, key: "indRateio", nome: "Indicador de Rateio", type: "A" },
  { ini: 106, fim: 107, key: "zeros3", nome: "Zeros", type: "N" },
  { ini: 108, fim: 108, key: "carteira", nome: "Carteira", type: "N" },
  { ini: 109, fim: 110, key: "ocorrencia", nome: "Identificação de Ocorrência", type: "N" },
  { ini: 111, fim: 116, key: "dataOcorrencia", nome: "Data Ocorrência no Banco", type: "N", fmt: "data" },
  { ini: 117, fim: 126, key: "numDocumento", nome: "Número do Documento", type: "A" },
  { ini: 127, fim: 146, key: "idTituloBanco20", nome: "Ident. Título no Banco (20)", type: "A" },
  { ini: 147, fim: 152, key: "dataVencimento", nome: "Data Vencimento do Título", type: "N", fmt: "data" },
  { ini: 153, fim: 165, key: "valorTitulo", nome: "Valor do Título", type: "N", fmt: "valor" },
  { ini: 166, fim: 168, key: "bancoCobrador", nome: "Banco Cobrador", type: "N" },
  { ini: 169, fim: 173, key: "agenciaCobradora", nome: "Agência Cobradora", type: "N" },
  { ini: 174, fim: 175, key: "especieTitulo", nome: "Espécie do Título", type: "A" },
  { ini: 176, fim: 188, key: "despesasCobranca", nome: "Despesas de Cobrança", type: "N", fmt: "valor" },
  { ini: 189, fim: 201, key: "outrasDespesas", nome: "Outras Despesas / Custas", type: "N", fmt: "valor" },
  { ini: 202, fim: 214, key: "jurosAtraso", nome: "Juros Operação em Atraso", type: "N", fmt: "valor" },
  { ini: 215, fim: 227, key: "iofDevido", nome: "IOF Devido", type: "N", fmt: "valor" },
  { ini: 228, fim: 240, key: "abatimento", nome: "Abatimento Concedido", type: "N", fmt: "valor" },
  { ini: 241, fim: 253, key: "descontoConc", nome: "Desconto Concedido", type: "N", fmt: "valor" },
  { ini: 254, fim: 266, key: "valorPago", nome: "Valor Pago", type: "N", fmt: "valor" },
  { ini: 267, fim: 279, key: "jurosMora", nome: "Juros de Mora", type: "N", fmt: "valor" },
  { ini: 280, fim: 292, key: "outrosCreditos", nome: "Outros Créditos", type: "N", fmt: "valor" },
  { ini: 293, fim: 294, key: "brancos1", nome: "Brancos", type: "A" },
  { ini: 295, fim: 295, key: "motivoProtesto", nome: "Motivo Ocorrência 19", type: "A" },
  { ini: 296, fim: 301, key: "dataCredito", nome: "Data do Crédito", type: "N", fmt: "data" },
  { ini: 302, fim: 304, key: "origemPagamento", nome: "Origem Pagamento", type: "A" },
  { ini: 305, fim: 314, key: "brancos2", nome: "Brancos", type: "A" },
  { ini: 315, fim: 318, key: "codBancoCheque", nome: "Banco do Cheque (0237)", type: "N" },
  { ini: 319, fim: 328, key: "motivosRejeicao", nome: "Motivos das Rejeições", type: "A" },
  { ini: 329, fim: 368, key: "brancos3", nome: "Brancos", type: "A" },
  { ini: 369, fim: 370, key: "numCartorio", nome: "Número do Cartório", type: "N" },
  { ini: 371, fim: 380, key: "numProtocolo", nome: "Número do Protocolo", type: "N" },
  { ini: 381, fim: 394, key: "brancos4", nome: "Brancos", type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro", nome: "Nº Seqüencial de Registro", type: "N" },
];

// ---------- Tabelas de domínio ----------

export const OCORRENCIAS: Record<string, string> = {
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
  "23": "Entrada do Título em Cartório",
  "28": "Débito de Tarifas / Custas",
};

const OCORRENCIA_COM_MOTIVO = ["02", "03", "09", "10", "24", "27", "28", "30", "32", "35"];

const MOTIVOS: Record<string, string> = {
  "00": "Ocorrência aceita / pago em dinheiro",
  "01": "Código do Banco inválido",
  "08": "Nosso número inválido",
  "09": "Nosso número duplicado",
  "10": "Carteira inválida",
  "15": "Pago com cheque / características incompatíveis",
  "16": "Data de vencimento inválida",
  "20": "Valor do título inválido",
  "21": "Espécie do título inválida",
  "46": "Tipo/nº de inscrição do sacado inválidos",
  "48": "CEP inválido",
  "63": "Título já cadastrado",
};

// ---------- Helpers de baixo nível ----------

/** Extrai o campo respeitando o ajuste 1-indexado → slice (0-indexado). */
export function fld(line: string, def: FieldDef): string {
  return line.slice(def.ini - 1, def.fim);
}

/** "0000000015000" (2 decimais implícitas) → 150 */
export function parseValor(raw: string): number {
  const digits = (raw || "").replace(/\D/g, "") || "0";
  return parseInt(digits, 10) / 100;
}

/** 150 → "0000000015000" em `size` posições, sem ponto/vírgula */
export function formatValor(value: number, size: number): string {
  const cents = Math.round((Number(value) || 0) * 100);
  return String(cents).padStart(size, "0").slice(-size);
}

/** "DDMMAA" → "DD/MM/AAAA" (pivô de século em 70) */
export function parseData(raw: string): string {
  if (!raw || !/^\d{6}$/.test(raw) || raw === "000000") return "";
  const dd = raw.slice(0, 2);
  const mm = raw.slice(2, 4);
  const aa = parseInt(raw.slice(4, 6), 10);
  const yyyy = aa <= 70 ? 2000 + aa : 1900 + aa;
  if (+dd < 1 || +dd > 31 || +mm < 1 || +mm > 12) return raw;
  return `${dd}/${mm}/${yyyy}`;
}

/** "AAAA-MM-DD" → "DDMMAA" */
export function formatData(isoDate: string): string {
  if (!isoDate) return "000000";
  const [y, m, d] = isoDate.split("-");
  return `${d}${m}${y.slice(-2)}`;
}

/** Preenche um campo conforme o tipo. */
export function padField(value: unknown, def: FieldDef): string {
  const size = def.fim - def.ini + 1;
  let v = value === undefined || value === null ? "" : String(value);
  if (def.type === "N") {
    v = v.replace(/\D/g, "");
    return v.padStart(size, "0").slice(-size);
  }
  return v.toUpperCase().padEnd(size, " ").slice(0, size);
}

// ---------- PARSER (leitura) ----------

export function parseCnab400(text: string): CnabParseResult {
  const lines = text
    .replace(/\u001a/g, "") // remove finalizador 0x1A
    .split(/\r\n|\r|\n/)
    .filter((l) => l.length > 0);

  if (lines.length === 0) throw new Error("Arquivo vazio.");

  const result: CnabParseResult = { header: null, titulos: [], totalLinhas: lines.length, avisos: [] };

  lines.forEach((line, idx) => {
    if (line.length !== 400) {
      result.avisos.push(`Linha ${idx + 1}: ${line.length} caracteres (esperado 400).`);
    }
    const tipo = line.charAt(0);
    if (idx === 0 || tipo === "0") {
      result.header = parseHeader(line);
    } else if (tipo === "1") {
      result.titulos.push(parseDetalhe(line, idx + 1));
    }
    // Trailer (9) e Rateio (3) não são necessários para a triagem de suporte.
  });

  return result;
}

function parseHeader(line: string): CnabHeader {
  const get = (key: string) => {
    const def = HEADER_FIELDS.find((f) => f.key === key)!;
    const raw = fld(line, def);
    return def.fmt === "data" ? parseData(raw) : raw.trim();
  };

  const header: CnabHeader = {
    codEmpresa: get("codEmpresa"),
    nomeEmpresa: get("nomeEmpresa"),
    dataGravacao: get("dataGravacao"),
    avisoBancario: get("avisoBancario"),
    dataCredito: get("dataCredito"),
    valido: true,
    erros: [],
  };

  const fixos: Array<[string, string]> = [
    ["idRegistro", "0"], ["idArquivo", "2"], ["literalRetorno", "RETORNO"],
    ["codServico", "01"], ["numBradesco", "237"],
  ];
  for (const [key, esperado] of fixos) {
    const def = HEADER_FIELDS.find((f) => f.key === key)!;
    const val = fld(line, def).trim().toUpperCase();
    if (val !== esperado) {
      header.valido = false;
      header.erros.push(`${def.nome}="${val}" (esperado "${esperado}")`);
    }
  }
  return header;
}

function parseDetalhe(line: string, numLinha: number): CnabTitulo {
  const raw = (key: string) => fld(line, DETALHE_FIELDS.find((f) => f.key === key)!);

  const ocorrencia = raw("ocorrencia");
  const motivos: CnabTitulo["motivos"] = [];
  if (OCORRENCIA_COM_MOTIVO.includes(ocorrencia)) {
    const m = raw("motivosRejeicao").padEnd(10, "0");
    for (let i = 0; i < 10; i += 2) {
      const cod = m.slice(i, i + 2);
      if (/^\d{2}$/.test(cod) && (cod !== "00" || i === 0)) {
        motivos.push({ cod, desc: MOTIVOS[cod] || "—" });
      }
    }
  }

  return {
    linha: numLinha,
    nossoNumero: raw("nossoNumero").trim(),
    numDocumento: raw("numDocumento").trim(),
    ocorrencia,
    ocorrenciaDesc: OCORRENCIAS[ocorrencia] || "Desconhecida",
    dataVencimento: parseData(raw("dataVencimento")),
    valorTitulo: parseValor(raw("valorTitulo")),
    valorPago: parseValor(raw("valorPago")),
    dataCredito: parseData(raw("dataCredito")),
    motivos,
  };
}

// ---------- GERADOR (escrita) ----------

export interface GeradorHeader {
  codEmpresa: string;
  nomeEmpresa: string;
  dataGravacao: string; // ISO AAAA-MM-DD
  aviso: string;
  dataCredito: string; // ISO
}

export interface GeradorTitulo {
  nossoNumero: string;
  carteira?: string;
  ocorrencia: string;
  numDocumento?: string;
  dataVencimento: string; // ISO
  valorTitulo: number;
  valorPago?: number;
  dataCredito?: string; // ISO
  motivos?: string;
}

function buildLine(defs: FieldDef[], values: Record<string, unknown>): string {
  let line = "";
  for (const def of defs) {
    const v = def.fixo !== undefined ? def.fixo : values[def.key] ?? "";
    line += padField(v, def);
  }
  return line.padEnd(400, " ").slice(0, 400);
}

export function gerarHeader(cfg: GeradorHeader): string {
  return buildLine(HEADER_FIELDS, {
    codEmpresa: cfg.codEmpresa,
    nomeEmpresa: cfg.nomeEmpresa,
    dataGravacao: formatData(cfg.dataGravacao),
    avisoBancario: cfg.aviso,
    dataCredito: formatData(cfg.dataCredito),
  });
}

export function gerarDetalhe(t: GeradorTitulo, seq: number): string {
  return buildLine(DETALHE_FIELDS, {
    nossoNumero: t.nossoNumero,
    carteira: t.carteira ?? "09",
    ocorrencia: t.ocorrencia,
    dataOcorrencia: formatData(t.dataCredito || t.dataVencimento),
    numDocumento: t.numDocumento ?? "",
    dataVencimento: formatData(t.dataVencimento),
    valorTitulo: formatValor(t.valorTitulo, 13),
    bancoCobrador: "237",
    valorPago: formatValor(t.valorPago ?? 0, 13),
    dataCredito: formatData(t.dataCredito ?? ""),
    motivosRejeicao: t.motivos ?? "",
    seqRegistro: String(seq).padStart(6, "0"),
  });
}

export function gerarTrailer(qtd: number, valorTotal: number, seq: number): string {
  let line = "9" + "2" + "01" + "237" + " ".repeat(10);
  line += String(qtd).padStart(8, "0");
  line += formatValor(valorTotal, 14);
  line = line.padEnd(394, " ");
  line += String(seq).padStart(6, "0");
  return line.padEnd(400, " ").slice(0, 400);
}

export function gerarArquivo(cfg: GeradorHeader, titulos: GeradorTitulo[]): string[] {
  const linhas = [gerarHeader(cfg)];
  let seq = 1;
  let total = 0;
  for (const t of titulos) {
    seq++;
    total += Number(t.valorPago || t.valorTitulo || 0);
    linhas.push(gerarDetalhe(t, seq));
  }
  linhas.push(gerarTrailer(titulos.length, total, seq + 1));
  return linhas;
}
