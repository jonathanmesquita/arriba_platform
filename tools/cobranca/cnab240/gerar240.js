/* =====================================================================
   CNAB 240 — gerador (sem DOM)

   Monta o arquivo a partir de um layout (layouts/<banco>.js) e dos valores
   digitados. A estrutura é a do manual: header de arquivo, um lote (header de
   lote, os detalhes, trailer de lote) e trailer de arquivo. O que o gerador
   calcula sozinho, para o arquivo fechar:
     - o número do lote e o sequencial de cada detalhe dentro do lote;
     - a quantidade de registros do lote (header e trailer incluídos);
     - a quantidade de lotes e de registros do arquivo.
   Cada título é um conjunto de segmentos: { P: {...}, Q: {...}, … } na remessa,
   { T: {...}, U: {...} } no retorno. O código de movimento digitado no primeiro
   segmento vale para os seguintes que o deixarem em branco.

   Limite: grava os segmentos que a tela pede (P e Q na remessa, T e U no
   retorno) e os que vierem em `titulo` (R, S1, S2, Y03, Y53; Y03 e Y04 no
   retorno); os totais por tipo de cobrança do trailer de lote do retorno
   ficam zerados (o manual não diz como se ligam aos movimentos).
   ===================================================================== */

"use strict";

import { buildLine } from "../cnab400/engine.js";
import { TAMANHO_240 } from "./validacao240.js";

const ORDEM_PADRAO = { remessa: ["P", "Q", "R", "S1", "S2", "Y03", "Y53"], retorno: ["T", "U", "Y03", "Y04"] };

export function gerarArquivo240(layout, direcao, dados) {
  const L = layout[direcao];
  const { arquivo = {}, lote = {}, titulos = [] } = dados;
  const numeroLote = lote.lote ?? "1";
  const linhas = [];

  linhas.push(buildLine(L.headerArquivo, arquivo, TAMANHO_240));
  linhas.push(buildLine(L.headerLote, { ...lote, lote: numeroLote }, TAMANHO_240));

  let seq = 0;
  let soma = 0;
  for (const titulo of titulos) {
    let movimento = null;
    for (const chave of L.ordem || ORDEM_PADRAO[direcao]) {
      const valores = titulo[chave];
      if (!valores || !L.segmentos[chave]) continue;
      seq += 1;
      if (L.somaCampo?.[chave]) soma += Number(valores[L.somaCampo[chave]]) || 0;
      movimento = valores.codMovimento || movimento;
      linhas.push(buildLine(L.segmentos[chave], {
        ...valores,
        codMovimento: valores.codMovimento || movimento || "",
        lote: numeroLote,
        seqRegistro: seq,
      }, TAMANHO_240));
    }
  }

  linhas.push(buildLine(L.trailerLote, { lote: numeroLote, qtdRegistros: seq + 2, somatoriaValores: soma }, TAMANHO_240));
  linhas.push(buildLine(L.trailerArquivo, { qtdLotes: 1, qtdRegistros: linhas.length + 1 }, TAMANHO_240));
  return linhas;
}
