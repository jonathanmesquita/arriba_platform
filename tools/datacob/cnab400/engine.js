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
    // O código de motivo só é inequívoco combinado com a ocorrência (o
    // mesmo código "07", por exemplo, significa coisas diferentes em
    // ocorrências diferentes) — se config.motivos[ocorrencia] existir como
    // objeto, usa a tabela escopada por ocorrência; senão cai no mapa
    // plano config.motivos[cod] (formato usado por outros bancos).
    const tabelaOcorrencia = config.motivos[t.ocorrencia];
    const raw = String(t.motivosRejeicao).padEnd(10, "0");
    for (let i = 0; i < 10; i += 2) {
      const cod = raw.slice(i, i + 2);
      if ((cod && cod !== "00") || i === 0) {
        if (/^\d{2}$/.test(cod)) {
          const desc = (tabelaOcorrencia && typeof tabelaOcorrencia === "object" ? tabelaOcorrencia[cod] : undefined)
            ?? config.motivos[cod];
          t.motivosList.push({ cod, desc: desc || "—" });
        }
      }
    }
  }
  return t;
}

/* ---------------------------------------------------------------------
   Conferência do Trailer

   O próprio arquivo declara no Trailer quantos títulos e que valor total
   ele carrega. Comparar isso com o que foi lido pega arquivo truncado ou
   editado à mão — exatamente o que um validador precisa avisar (um
   arquivo recebido de teste declarava 36 títulos e tinha 1 linha de
   detalhe, e nada na tela dizia isso).

   Só confere o que o config do banco declarar em `trailerConferencia`
   ({ quantidadeKey, valorKey }); banco cujo Trailer tem outra forma
   (ex.: Itaú, com totais separados por tipo de cobrança) simplesmente
   não declara, e aí não há aviso falso. O valor esperado sai da MESMA
   regra usada na geração (trailerTotalFn / trailerTotalKey), pra
   validação e geração não divergirem com o tempo.
   --------------------------------------------------------------------- */
function conferirTrailer(result, config) {
  if (!config.trailerFields) return;

  if (!result.trailer) {
    result.avisos.push("Arquivo sem registro Trailer (tipo 9) — provavelmente está incompleto.");
    return;
  }

  const conf = config.trailerConferencia;
  if (!conf) return;

  if (conf.quantidadeKey) {
    const declarada = Number(result.trailer[conf.quantidadeKey]);
    if (Number.isFinite(declarada) && declarada !== result.titulos.length) {
      result.avisos.push(
        `Trailer declara ${declarada} título(s), mas o arquivo tem ${result.titulos.length} linha(s) de detalhe.`
      );
    }
  }

  if (conf.valorKey) {
    const totalFn = config.trailerTotalFn
      || (det => Number(det[config.trailerTotalKey || "valorTitulo"]) || 0);
    const esperado = result.titulos.reduce((soma, det) => soma + totalFn(det), 0);
    const declarado = Number(result.trailer[conf.valorKey]);
    // Tolerância de 1 centavo: os valores vêm de inteiros em centavos, mas
    // a soma em ponto flutuante pode fechar com resto mínimo.
    if (Number.isFinite(declarado) && Math.abs(declarado - esperado) > 0.01) {
      result.avisos.push(
        `Trailer declara valor total de ${formatarReais(declarado)}, mas a soma dos títulos dá ${formatarReais(esperado)}.`
      );
    }
  }
}

function formatarReais(valor) {
  return `R$ ${(Number(valor) || 0).toFixed(2).replace(".", ",")}`;
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

  conferirTrailer(result, config);
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
    // Cada banco decide como somar o total do trailer: por padrão soma
    // config.trailerTotalKey (default "valorTitulo"); se o banco precisar de
    // uma regra diferente (ex.: valor pago quando existir, senão o título),
    // pode fornecer trailerTotalFn(detalhe) => number.
    const totalFn = config.trailerTotalFn
      || (det => Number(det[config.trailerTotalKey || "valorTitulo"]) || 0);
    const valorTotal = detalhes.reduce((sum, d) => sum + totalFn(d), 0);
    linhas.push(buildLine(config.trailerFields, {
      quantidadeTitulos: detalhes.length,
      valorTotal,
      seqRegistro: seq
    }));
  }

  return linhas;
}
