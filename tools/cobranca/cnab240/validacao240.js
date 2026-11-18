/* =====================================================================
   CNAB 240 — validação ESTRUTURAL (sem DOM)

   O que este módulo confere é só o que as fontes consultadas confirmam
   para o padrão FEBRABAN de 240 posições (links na página de referência,
   pages/docs/padroes-cnab.html). Nada vem de memória:

     pos.   1–3   código do banco (numérico)
     pos.   4–7   lote de serviço (numérico; "0000" no header do arquivo)
     pos.   8     tipo de registro: 0 header de arquivo, 1 header de lote,
                  3 detalhe, 5 trailer de lote, 9 trailer de arquivo
     tipo 3: pos. 9–13 nº sequencial do registro no lote (numérico) e
             pos. 14 código do segmento (uma letra: P, Q, R, S, T, U, Y…)
     tipo 5: pos. 18–23 quantidade de registros do lote
     tipo 9: pos. 18–23 quantidade de lotes e 24–29 quantidade de
             registros do arquivo (todos, header e trailers incluídos)

   O QUE NÃO É CONFERIDO — e a tela diz isso: os campos de dentro de cada
   segmento (valores, datas, nosso número, ocorrências). Cada banco adapta
   o layout, e sem o manual do banco qualquer regra ali seria chute. Por
   isso aqui não há "validar o segmento P do banco X".

   Três níveis, como no CNAB 400: "erro" é o que é certo (linha de outro
   tamanho, banco ou lote que não é número, trailer do arquivo que não
   fecha); "aviso" é o provável (sequencial fora de ordem, lote de
   trailer que não fecha, tipo de registro fora dos cinco conhecidos).
   ===================================================================== */

"use strict";

export const TAMANHO_240 = 240;

const TIPOS = {
  "0": "Header de arquivo",
  "1": "Header de lote",
  "3": "Detalhe",
  "5": "Trailer de lote",
  "9": "Trailer de arquivo",
};
export const NOME_TIPO = TIPOS;

/* Posições do manual são 1-indexadas e inclusivas; slice() é 0-indexado
   exclusivo — a mesma armadilha do CNAB 400. */
const campo = (linha, ini, fim) => linha.slice(ini - 1, fim);
const ehNumero = (t) => /^\d+$/.test(t);

export function dividirLinhas240(texto) {
  return String(texto || "")
    .split(String.fromCharCode(0x1a)).join("")
    .split(/\r\n|\r|\n/)
    .filter((l) => l.length > 0);
}

export function analisar240(texto) {
  const linhas = dividirLinhas240(texto);
  const problemas = [];
  const add = (nivel, linha, mensagem) => problemas.push({ nivel, linha, mensagem });

  const resultado = {
    totalLinhas: linhas.length,
    banco: "",
    lotes: [],
    porTipo: {},
    problemas,
    erros: [],
    avisos: [],
  };
  if (!linhas.length) throw new Error("Arquivo vazio.");

  let loteAberto = null;
  let viuHeaderArquivo = false;
  let trailerArquivo = null;
  const bancos = new Set();

  linhas.forEach((texto240, idx) => {
    const n = idx + 1;
    const tipo = texto240.charAt(7);
    resultado.porTipo[tipo || "?"] = (resultado.porTipo[tipo || "?"] || 0) + 1;

    if (texto240.length !== TAMANHO_240) {
      add("erro", n, `Linha ${n}: tem ${texto240.length} caracteres e o padrão tem ${TAMANHO_240}. Os campos abaixo dela ficam deslocados, então o conteúdo desta linha não foi conferido.`);
      return;
    }

    const banco = campo(texto240, 1, 3);
    const lote = campo(texto240, 4, 7);
    if (!ehNumero(banco)) add("erro", n, `Linha ${n}: o código do banco (posições 1–3) não é numérico: "${banco}".`);
    else bancos.add(banco);
    if (!ehNumero(lote)) add("erro", n, `Linha ${n}: o lote de serviço (posições 4–7) não é numérico: "${lote}".`);

    if (!(tipo in TIPOS)) {
      add("aviso", n, `Linha ${n}: tipo de registro "${tipo}" (posição 8) não é um dos cinco do padrão (0, 1, 3, 5, 9); o conteúdo desta linha não foi conferido.`);
      return;
    }

    /* Ordem dos registros: 0 abre o arquivo, 9 fecha, e dentro dele cada
       lote é 1 → 3… → 5. */
    if (tipo === "0") {
      if (idx !== 0) add("erro", n, `Linha ${n}: Header de arquivo fora da primeira linha.`);
      else if (lote !== "0000") add("erro", n, `Linha ${n}: o Header de arquivo deve ter lote "0000" (posições 4–7) e veio "${lote}".`);
      if (viuHeaderArquivo) add("erro", n, `Linha ${n}: há mais de um Header de arquivo.`);
      viuHeaderArquivo = true;
    } else if (idx === 0) {
      add("erro", n, `Linha 1: o arquivo não começa com Header de arquivo (tipo 0): veio tipo ${tipo}.`);
    }

    if (tipo === "1") {
      if (loteAberto) add("erro", n, `Linha ${n}: novo Header de lote sem fechar o lote ${loteAberto.numero} (aberto na linha ${loteAberto.linhaInicio}): falta o Trailer de lote.`);
      loteAberto = { numero: lote, linhaInicio: n, linhaFim: null, detalhes: 0, segmentos: {}, registros: 1, proximoSeq: 1 };
      resultado.lotes.push(loteAberto);
    } else if (tipo === "3" || tipo === "5") {
      if (!loteAberto) {
        add("erro", n, `Linha ${n}: ${TIPOS[tipo]} fora de um lote (sem Header de lote antes).`);
      } else {
        loteAberto.registros += 1;
        if (lote !== loteAberto.numero) {
          add("erro", n, `Linha ${n}: o lote desta linha é "${lote}", mas ela está dentro do lote "${loteAberto.numero}" (aberto na linha ${loteAberto.linhaInicio}).`);
        }
      }
    }

    if (tipo === "3" && loteAberto) {
      loteAberto.detalhes += 1;
      const seq = campo(texto240, 9, 13);
      const segmento = campo(texto240, 14, 14);
      if (ehNumero(seq)) {
        if (Number(seq) !== loteAberto.proximoSeq) {
          add("aviso", n, `Linha ${n}: o sequencial do registro no lote (posições 9–13) é ${Number(seq)}, e o esperado é ${loteAberto.proximoSeq}.`);
        }
        loteAberto.proximoSeq = Number(seq) + 1;
      } else {
        add("aviso", n, `Linha ${n}: o sequencial do registro no lote (posições 9–13) não é numérico: "${seq}".`);
        loteAberto.proximoSeq += 1;
      }
      if (/^[A-Za-z]$/.test(segmento)) {
        const letra = segmento.toUpperCase();
        loteAberto.segmentos[letra] = (loteAberto.segmentos[letra] || 0) + 1;
      } else {
        add("aviso", n, `Linha ${n}: o código do segmento (posição 14) deveria ser uma letra e veio "${segmento}".`);
      }
    }

    if (tipo === "5" && loteAberto) {
      loteAberto.linhaFim = n;
      const declarado = campo(texto240, 18, 23);
      if (!ehNumero(declarado)) {
        add("erro", n, `Linha ${n}: a quantidade de registros do lote (posições 18–23) não é numérica: "${declarado}".`);
      } else if (Number(declarado) !== loteAberto.registros) {
        // Aviso, não erro: a contagem inclui header e trailer do lote no padrão
        // FEBRABAN, mas alguns bancos contam diferente e o manual do banco manda.
        add("aviso", n, `Linha ${n}: o Trailer do lote ${loteAberto.numero} declara ${Number(declarado)} registros e o lote tem ${loteAberto.registros} (contando o Header e o Trailer do lote).`);
      }
      loteAberto = null;
    }

    if (tipo === "9") {
      if (trailerArquivo) add("erro", n, `Linha ${n}: há mais de um Trailer de arquivo.`);
      trailerArquivo = { linha: n, texto: texto240 };
      if (idx !== linhas.length - 1) add("erro", n, `Linha ${n}: Trailer de arquivo antes do fim do arquivo (há ${linhas.length - n} linha(s) depois dele).`);
    }
  });

  if (loteAberto) {
    add("erro", loteAberto.linhaInicio, `O lote ${loteAberto.numero} (aberto na linha ${loteAberto.linhaInicio}) não tem Trailer de lote — o arquivo parece truncado.`);
  }
  if (!trailerArquivo) {
    add("erro", linhas.length, "O arquivo não tem Trailer de arquivo (tipo 9) — provavelmente está incompleto.");
  } else {
    const { linha: n, texto: t } = trailerArquivo;
    if (t.length === TAMANHO_240) {
      const qtdLotes = campo(t, 18, 23);
      const qtdRegistros = campo(t, 24, 29);
      if (!ehNumero(qtdLotes)) add("erro", n, `Linha ${n}: a quantidade de lotes (posições 18–23) não é numérica: "${qtdLotes}".`);
      else if (Number(qtdLotes) !== resultado.lotes.length) {
        add("erro", n, `Linha ${n}: o Trailer de arquivo declara ${Number(qtdLotes)} lote(s) e o arquivo tem ${resultado.lotes.length}.`);
      }
      if (!ehNumero(qtdRegistros)) add("erro", n, `Linha ${n}: a quantidade de registros (posições 24–29) não é numérica: "${qtdRegistros}".`);
      else if (Number(qtdRegistros) !== linhas.length) {
        add("erro", n, `Linha ${n}: o Trailer de arquivo declara ${Number(qtdRegistros)} registro(s) e o arquivo tem ${linhas.length} linha(s) — a conta inclui o Header e os Trailers.`);
      }
    }
  }

  // O mesmo número de lote em dois lotes é estranho, mas há quem reutilize: aviso.
  const vistos = new Map();
  for (const l of resultado.lotes) {
    if (vistos.has(l.numero)) add("aviso", l.linhaInicio, `O lote ${l.numero} (linha ${l.linhaInicio}) repete o número de um lote anterior (linha ${vistos.get(l.numero)}).`);
    else vistos.set(l.numero, l.linhaInicio);
  }

  if (bancos.size > 1) add("aviso", 1, `O arquivo mistura mais de um código de banco (posições 1–3): ${[...bancos].join(", ")}.`);
  resultado.banco = bancos.size === 1 ? [...bancos][0] : "";

  problemas.sort((a, b) => a.linha - b.linha);
  resultado.erros = problemas.filter((p) => p.nivel === "erro");
  resultado.avisos = problemas.filter((p) => p.nivel === "aviso");
  return resultado;
}
