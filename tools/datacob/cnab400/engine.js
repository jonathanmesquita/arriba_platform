/* =====================================================================
   CNAB 400 - Motor genérico (agnóstico de banco)
   Consome um "config" por banco (banks/<banco>.js) e faz o parse/geração.

   PRINCÍPIO CENTRAL (herdado de tools/datacob/cnab400-bradesco/script.js)
   -----------------
   As posições do manual são 1-indexadas e inclusivas ("071 a 082").
   Em JS, string.slice() é 0-indexado e exclusivo no fim.
   Logo, para um campo "ini a fim":  linha.slice(ini - 1, fim)
   Esse ajuste fica isolado em uma única função (fld) para nunca errar.

   Nenhuma função aqui conhece um banco específico — tudo vem do config:
   config.headerFields / detalheFields / trailerFields (mapas de campo),
   config.ocorrencias / ocorrenciaComMotivo / motivos (tabelas de domínio,
   opcionais). Um "banks/<banco>.js" só precisa exportar esse objeto.
   ===================================================================== */

"use strict";

/* ---------------------------------------------------------------------
   1) HELPERS DE BAIXO NÍVEL (slice posicional + conversões)
   --------------------------------------------------------------------- */

// Extrai um campo da linha respeitando o ajuste 1-indexado → slice.
export function fld(line, def) {
  return line.slice(def.ini - 1, def.fim);
}

// "0000000015000" (13, 2 decimais implícitas) -> 150.00 (number)
export function parseValor(raw) {
  const digits = (raw || "").replace(/\D/g, "") || "0";
  return parseInt(digits, 10) / 100;
}

// 150.00 -> "0000000015000" preenchido em `size` posições, sem ponto/vírgula
export function formatValor(value, size) {
  const cents = Math.round((Number(value) || 0) * 100);
  return String(cents).padStart(size, "0").slice(-size);
}

// "DDMMAA" -> "DD/MM/AAAA"  (pivô de século: <=70 => 2000+, senão 1900+)
export function parseData(raw) {
  if (!raw || !/^\d{6}$/.test(raw) || raw === "000000") return "";
  const dd = raw.slice(0, 2), mm = raw.slice(2, 4), aa = parseInt(raw.slice(4, 6), 10);
  const yyyy = aa <= 70 ? 2000 + aa : 1900 + aa;
  if (+dd < 1 || +dd > 31 || +mm < 1 || +mm > 12) return raw; // devolve cru se suspeito
  return `${dd}/${mm}/${yyyy}`;
}

// "AAAA-MM-DD" (input date) -> "DDMMAA"
export function formatData(isoDate) {
  if (!isoDate) return "000000";
  const [y, m, d] = isoDate.split("-");
  return `${d}${m}${y.slice(-2)}`;
}

// preenche um campo conforme o tipo (N = zeros à esq., A = espaços à dir.)
export function padField(value, def) {
  const size = def.fim - def.ini + 1;
  let v = (value === undefined || value === null) ? "" : String(value);
  if (def.type === "N") {
    v = v.replace(/\D/g, "");
    return v.padStart(size, "0").slice(-size);
  }
  // alfanumérico: caixa alta, espaços à direita, trunca
  v = v.toUpperCase();
  return v.padEnd(size, " ").slice(0, size);
}

// Resolve o valor "bruto" de um campo antes do padding: aplica fixo/fmt.
function resolveFieldValue(rawValue, def) {
  if (def.fixo !== undefined) return def.fixo;
  if (def.fmt === "valor") return formatValor(rawValue, def.fim - def.ini + 1);
  if (def.fmt === "data") return formatData(rawValue);
  return rawValue;
}

// Monta uma linha de 400 posições a partir de um mapa de campos + valores.
export function buildLine(fieldDefs, values) {
  let line = "";
  fieldDefs.forEach(def => {
    const raw = values[def.key];
    line += padField(resolveFieldValue(raw, def), def);
  });
  return line.length === 400 ? line : line.padEnd(400, " ").slice(0, 400);
}

/* =====================================================================
   2) PARSER (LEITURA) — recebe texto + config, devolve estrutura validada
   ===================================================================== */

function parseRegistro(line, fieldDefs) {
  const obj = {};
  fieldDefs.forEach(def => {
    const raw = fld(line, def);
    if (def.fmt === "valor") obj[def.key] = parseValor(raw);
    else if (def.fmt === "data") obj[def.key] = parseData(raw);
    else obj[def.key] = raw.trim();
  });
  return obj;
}

function parseHeader(line, config) {
  const h = parseRegistro(line, config.headerFields);
  h._valido = true;
  h._erros = [];
  config.headerFields.forEach(def => {
    if (def.fixo === undefined) return;
    const raw = fld(line, def).trim();
    if (raw.toUpperCase() !== String(def.fixo).toUpperCase()) {
      h._valido = false;
      h._erros.push(`Campo "${def.key}" = "${raw}" (esperado "${def.fixo}")`);
    }
  });
  return h;
}

function parseDetalhe(line, numLinha, config) {
  const t = { _linha: numLinha, ...parseRegistro(line, config.detalheFields) };

  if (config.ocorrencias) {
    t.ocorrenciaDesc = config.ocorrencias[t.ocorrencia] || "Desconhecida";
  }

  t.motivosList = [];
  if (config.ocorrenciaComMotivo && config.motivos
      && config.ocorrenciaComMotivo.includes(t.ocorrencia) && t.motivosRejeicao) {
    const raw = String(t.motivosRejeicao).padEnd(10, "0");
    for (let i = 0; i < 10; i += 2) {
      const cod = raw.slice(i, i + 2);
      if ((cod && cod !== "00") || i === 0) {
        if (/^\d{2}$/.test(cod)) t.motivosList.push({ cod, desc: config.motivos[cod] || "—" });
      }
    }
  }
  return t;
}

// Lê um arquivo de retorno CNAB 400 conforme o config do banco escolhido.
export function parseArquivo(texto, config) {
  const lines = String(texto || "")
    .split(String.fromCharCode(0x1a)).join("")
    .split(/\r\n|\r|\n/)
    .filter(l => l.length > 0);

  if (lines.length === 0) throw new Error("Arquivo vazio.");

  const result = { header: null, titulos: [], trailer: null, avisos: [], totalLinhas: lines.length };

  lines.forEach((line, idx) => {
    if (line.length !== 400) {
      result.avisos.push(`Linha ${idx + 1}: tem ${line.length} caracteres (esperado 400).`);
    }
    const tipo = line.charAt(0);
    if (idx === 0 || tipo === "0") {
      result.header = parseHeader(line, config);
    } else if (tipo === "1") {
      result.titulos.push(parseDetalhe(line, idx + 1, config));
    } else if (tipo === "9" && config.trailerFields) {
      result.trailer = parseRegistro(line, config.trailerFields);
    }
    // outros tipos de registro (ex.: 3 - rateio) não são suportados nesta versão.
  });

  return result;
}

/* =====================================================================
   3) GERADOR (ESCRITA) — monta linhas de exatamente 400 caracteres
   ===================================================================== */

// dados = { header: {...campos...}, detalhes: [{...campos...}, ...] }
export function gerarArquivo(config, dados) {
  const { header = {}, detalhes = [] } = dados;
  const linhas = [];

  if (config.headerFields) linhas.push(buildLine(config.headerFields, header));

  let seq = linhas.length;
  detalhes.forEach(det => {
    seq += 1;
    linhas.push(buildLine(config.detalheFields, { ...det, seqRegistro: det.seqRegistro ?? seq }));
  });

  if (config.trailerFields) {
    seq += 1;
    const totalKey = config.trailerTotalKey || "valorTitulo";
    const valorTotal = detalhes.reduce((sum, d) => sum + (Number(d[totalKey]) || 0), 0);
    linhas.push(buildLine(config.trailerFields, {
      quantidadeTitulos: detalhes.length,
      valorTotal,
      seqRegistro: seq
    }));
  }

  return linhas;
}
