/* =====================================================================
   Leitor de CSV (RFC 4180) + conferencias de estrutura

   Este modulo NAO sabe nada sobre DataCob nem sobre regras de negocio:
   ele le o texto e responde o que o arquivo E, com os problemas de
   ESTRUTURA que encontrar. As regras por coluna ficam em rules.js e os
   layouts prontos em schemas.js - separado de proposito, porque "o
   arquivo esta quebrado" e "o dado esta errado" sao dois assuntos.

   Por que escrever o parser em vez de usar split(";"):
   um campo entre aspas pode conter o proprio delimitador, quebra de
   linha e aspas duplicadas (`""` = uma aspa literal). Quem usa split()
   quebra no primeiro endereco com ponto e virgula dentro - e o arquivo
   parece corrompido quando o problema e o leitor.
   ===================================================================== */

"use strict";

export const DELIMITADORES = [
  { valor: ";", nome: "ponto e vírgula (;)" },
  { valor: ",", nome: "vírgula (,)" },
  { valor: "\t", nome: "tabulação" },
  { valor: "|", nome: "barra vertical (|)" }
];

export const BOM = "﻿";

/* ---------------------------------------------------------------------
   Deteccao do delimitador

   Conta cada candidato FORA de aspas nas primeiras linhas e escolhe o
   que aparece de forma mais consistente (mesma contagem em todas as
   linhas). Consistencia vale mais que volume: um arquivo com virgula
   decimal tem muitas virgulas, mas em quantidade irregular por linha,
   enquanto o delimitador de verdade aparece N vezes em toda linha.
   --------------------------------------------------------------------- */
export function detectarDelimitador(texto, amostraLinhas = 20) {
  const linhas = fatiarLinhasBrutas(texto).slice(0, amostraLinhas).filter((l) => l.trim());
  if (!linhas.length) return { delimitador: ";", confianca: "nenhuma", contagens: {} };

  const contagens = {};
  let melhor = null;

  DELIMITADORES.forEach(({ valor }) => {
    const porLinha = linhas.map((linha) => contarForaDeAspas(linha, valor));
    const total = porLinha.reduce((a, b) => a + b, 0);
    const unicos = new Set(porLinha);
    contagens[valor] = { total, consistente: unicos.size === 1 && total > 0 };
    if (!total) return;

    const nota = (contagens[valor].consistente ? 1000 : 0) + total;
    if (!melhor || nota > melhor.nota) melhor = { delimitador: valor, nota, consistente: contagens[valor].consistente };
  });

  if (!melhor) return { delimitador: ";", confianca: "nenhuma", contagens };
  return {
    delimitador: melhor.delimitador,
    confianca: melhor.consistente ? "alta" : "baixa",
    contagens
  };
}

// Quebra so para contagem: nao interpreta aspas com quebra de linha
// dentro (isso e trabalho do parser de verdade, abaixo).
function fatiarLinhasBrutas(texto) {
  return String(texto || "").split(/\r\n|\r|\n/);
}

function contarForaDeAspas(linha, caractere) {
  let dentro = false;
  let total = 0;
  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (c === '"') {
      if (dentro && linha[i + 1] === '"') { i += 1; continue; }
      dentro = !dentro;
    } else if (c === caractere && !dentro) {
      total += 1;
    }
  }
  return total;
}

/* ---------------------------------------------------------------------
   Deteccao do fim de linha
   --------------------------------------------------------------------- */
export function detectarQuebraLinha(texto) {
  const crlf = (texto.match(/\r\n/g) || []).length;
  const semCrlf = texto.replace(/\r\n/g, "");
  const lf = (semCrlf.match(/\n/g) || []).length;
  const cr = (semCrlf.match(/\r/g) || []).length;
  const tipos = [["CRLF", crlf], ["LF", lf], ["CR", cr]].filter(([, n]) => n > 0);
  if (!tipos.length) return { tipo: "nenhuma", misturado: false, contagens: { crlf, lf, cr } };
  tipos.sort((a, b) => b[1] - a[1]);
  return { tipo: tipos[0][0], misturado: tipos.length > 1, contagens: { crlf, lf, cr } };
}

/* ---------------------------------------------------------------------
   Parser RFC 4180

   Devolve as linhas ja divididas em campos, cada uma com o numero da
   linha FISICA em que comecou - e esse numero que o usuario ve no editor
   dele, entao e ele que aparece no relatorio de erros.
   --------------------------------------------------------------------- */
export function lerCsv(texto, delimitador) {
  const registros = [];
  let campos = [];
  let campo = "";
  let dentroAspas = false;
  let linhaFisica = 1;
  let linhaInicio = 1;
  let aspasAbertaEm = null;

  const fecharCampo = () => { campos.push(campo); campo = ""; };
  const fecharLinha = () => {
    fecharCampo();
    registros.push({ linha: linhaInicio, campos });
    campos = [];
    linhaInicio = linhaFisica;
  };

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];

    if (dentroAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i += 1; }
        else { dentroAspas = false; aspasAbertaEm = null; }
      } else {
        if (c === "\n") linhaFisica += 1;
        campo += c;
      }
      continue;
    }

    if (c === '"' && campo === "") { dentroAspas = true; aspasAbertaEm = linhaFisica; continue; }
    if (c === delimitador) { fecharCampo(); continue; }
    if (c === "\r") { if (texto[i + 1] === "\n") i += 1; linhaFisica += 1; fecharLinha(); continue; }
    if (c === "\n") { linhaFisica += 1; fecharLinha(); continue; }
    campo += c;
  }

  // Ultimo registro (arquivo que nao termina com quebra de linha).
  if (campo !== "" || campos.length) fecharLinha();

  return { registros, aspasAbertaEm };
}

/* ---------------------------------------------------------------------
   analisarCsv: o que a UI chama

   opcoes.delimitador = "" ou ausente -> detecta sozinho.
   opcoes.temCabecalho = true por padrao.
   --------------------------------------------------------------------- */
export function analisarCsv(textoOriginal, opcoes = {}) {
  const temBom = String(textoOriginal || "").startsWith(BOM);
  const texto = temBom ? textoOriginal.slice(BOM.length) : String(textoOriginal || "");
  const temCabecalho = opcoes.temCabecalho !== false;

  const problemas = [];
  const aviso = (tipo, mensagem, linha = null) => problemas.push({ tipo, mensagem, linha, gravidade: "aviso" });
  const erro = (tipo, mensagem, linha = null) => problemas.push({ tipo, mensagem, linha, gravidade: "erro" });

  if (!texto.trim()) {
    return { vazio: true, cabecalho: [], linhas: [], problemas: [{ tipo: "vazio", gravidade: "erro", mensagem: "Arquivo vazio.", linha: null }], meta: {} };
  }

  const deteccao = opcoes.delimitador
    ? { delimitador: opcoes.delimitador, confianca: "manual", contagens: {} }
    : detectarDelimitador(texto);
  const quebra = detectarQuebraLinha(texto);
  const { registros, aspasAbertaEm } = lerCsv(texto, deteccao.delimitador);

  if (aspasAbertaEm !== null) {
    erro("aspas", `Aspas abertas na linha ${aspasAbertaEm} e nunca fechadas. Do ponto em diante o arquivo foi lido como um campo só — corrija antes de confiar no resto.`, aspasAbertaEm);
  }
  if (deteccao.confianca === "baixa") {
    aviso("delimitador", `O delimitador "${nomeDelimitador(deteccao.delimitador)}" foi deduzido, mas não aparece o mesmo número de vezes em todas as linhas. Se a leitura sair estranha, escolha o delimitador na mão.`);
  }
  if (quebra.misturado) {
    aviso("quebra-linha", `O arquivo mistura fins de linha (${quebra.contagens.crlf} CRLF, ${quebra.contagens.lf} LF, ${quebra.contagens.cr} CR). Costuma ser sinal de arquivo editado em dois sistemas diferentes.`);
  }

  // Linhas totalmente vazias nao contam como registro.
  const naoVazias = registros.filter((r) => !(r.campos.length === 1 && r.campos[0].trim() === ""));
  const vazias = registros.length - naoVazias.length;
  if (vazias > 0) {
    aviso("linha-vazia", `${vazias} linha(s) em branco ignorada(s) na leitura.`);
  }
  if (!naoVazias.length) {
    erro("vazio", "Nenhuma linha com conteúdo.");
    return { vazio: true, cabecalho: [], linhas: [], problemas, meta: metaDe(deteccao, quebra, temBom, registros.length) };
  }

  let cabecalho;
  let linhas;
  if (temCabecalho) {
    cabecalho = naoVazias[0].campos.map((c) => c.trim());
    linhas = naoVazias.slice(1);
    conferirCabecalho(cabecalho, naoVazias[0].campos, problemas);
  } else {
    // Sem cabecalho: nomeia as colunas por posicao, para as regras terem
    // onde se apoiar.
    cabecalho = naoVazias[0].campos.map((_, i) => `Coluna ${i + 1}`);
    linhas = naoVazias;
  }

  // Conferencia de largura: a causa numero um de importacao recusada.
  const esperado = cabecalho.length;
  linhas.forEach((registro) => {
    const achado = registro.campos.length;
    if (achado === esperado) return;
    erro(
      "colunas",
      `Linha ${registro.linha}: ${achado} coluna(s), esperado ${esperado}. ` +
      (achado > esperado
        ? "Sobra de delimitador — provavelmente um campo com o próprio delimitador dentro, sem aspas."
        : "Falta delimitador — a linha terminou antes do fim do layout."),
      registro.linha
    );
  });

  return {
    vazio: false,
    cabecalho,
    linhas,
    problemas,
    meta: metaDe(deteccao, quebra, temBom, registros.length, linhas.length, cabecalho.length)
  };
}

function metaDe(deteccao, quebra, temBom, totalLinhas, totalRegistros = 0, totalColunas = 0) {
  return {
    delimitador: deteccao.delimitador,
    delimitadorNome: nomeDelimitador(deteccao.delimitador),
    confiancaDelimitador: deteccao.confianca,
    quebraLinha: quebra.tipo,
    quebraMisturada: quebra.misturado,
    bom: temBom,
    totalLinhas,
    totalRegistros,
    totalColunas
  };
}

function conferirCabecalho(cabecalho, cabecalhoBruto, problemas) {
  const vistos = new Map();
  cabecalho.forEach((nome, i) => {
    if (!nome) {
      problemas.push({ tipo: "cabecalho", gravidade: "erro", linha: 1, mensagem: `Coluna ${i + 1} do cabeçalho está sem nome.` });
      return;
    }
    if (cabecalhoBruto[i] !== nome) {
      problemas.push({ tipo: "cabecalho", gravidade: "aviso", linha: 1, mensagem: `Coluna "${nome}" tem espaço sobrando no nome. A maioria dos importadores compara o nome exato e não encontra a coluna.` });
    }
    if (vistos.has(nome)) {
      problemas.push({ tipo: "cabecalho", gravidade: "erro", linha: 1, mensagem: `Coluna "${nome}" aparece duas vezes (posições ${vistos.get(nome) + 1} e ${i + 1}). Na importação uma sobrescreve a outra.` });
    } else {
      vistos.set(nome, i);
    }
  });
}

export function nomeDelimitador(valor) {
  return DELIMITADORES.find((d) => d.valor === valor)?.nome || `"${valor}"`;
}

/* Remonta o CSV a partir dos dados lidos - usado pelo "baixar limpo"
   (mesmo conteudo, delimitador e fim de linha normalizados, sem linha
   vazia e com aspas so onde precisa). */
export function montarCsv(cabecalho, linhas, delimitador = ";", comBom = true) {
  const escapar = (valor) => {
    const texto = String(valor ?? "");
    return /["\n\r]/.test(texto) || texto.includes(delimitador)
      ? `"${texto.replace(/"/g, '""')}"`
      : texto;
  };
  const corpo = [cabecalho, ...linhas.map((l) => l.campos)]
    .map((campos) => campos.map(escapar).join(delimitador))
    .join("\r\n");
  return (comBom ? BOM : "") + corpo + "\r\n";
}
