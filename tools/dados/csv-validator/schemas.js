/* =====================================================================
   Schemas prontos

   Os layouts do DataCob NAO sao redigitados aqui: vem de
   tools/datacob/arriba-csv-generator/layouts-datacob.js, a mesma fonte
   que o Gerador CSV usa para montar os arquivos. Assim um CSV gerado
   pelo site sempre passa no validador do site - se divergirem, e bug de
   verdade, e nao duas listas de coluna que envelheceram diferente.

   O que ESTE arquivo acrescenta e o TIPO de cada coluna, que o layout
   nao traz. E inferido pela convencao de nome do DataCob:

     Dt_*          -> data          Vl_* / Tx_*  -> decimal
     Cpf_Cnpj      -> CPF ou CNPJ   Email        -> e-mail
     UF / Uf       -> sigla de UF   CEP          -> CEP
     DDD / Fone    -> telefone      Nr_Parcela   -> inteiro
     Tipo_Registro -> valor fixo do layout

   ATENCAO: isso e INFERENCIA a partir do nome, nao um dicionario de
   dados oficial do DataCob. Por isso as regras inferidas sao conferencias
   de formato (o que quase sempre barra a importacao) e nao regra de
   negocio, e a tela deixa o usuario desligar ou ajustar cada uma. Se um
   dia vier o dicionario oficial, ele substitui a inferencia aqui, num
   lugar so.
   ===================================================================== */

"use strict";

import { DATACOB_CSV_LAYOUTS } from "../../datacob/arriba-csv-generator/layouts-datacob.js";

/* Tipo por nome exato de coluna (ganha do padrao por prefixo). */
const TIPO_POR_NOME = {
  cpf_cnpj: "cpfCnpj",
  cnpj: "cnpj",
  email: "email",
  uf: "uf",
  rg_uf_emiss: "uf",
  cep: "cep",
  ddd: "telefone",
  ddd_1: "telefone",
  fone: "telefone",
  fone_1: "telefone",
  nr_parcela: "inteiro",
  tipo_registro: "inteiro",
  renda: "decimal",
  valor: "decimal",
  numero: "texto" // numero de endereco aceita "S/N"
};

/* Tipo por prefixo, na ordem em que deve ser testado. */
const TIPO_POR_PREFIXO = [
  ["dt_", "data"],
  ["vl_", "decimal"],
  ["tx_", "decimal"]
];

function tipoDaColuna(nome) {
  const chave = String(nome).trim().toLowerCase();
  if (TIPO_POR_NOME[chave]) return TIPO_POR_NOME[chave];
  const prefixo = TIPO_POR_PREFIXO.find(([p]) => chave.startsWith(p));
  return prefixo ? prefixo[1] : "texto";
}

/* Colunas que o DataCob usa para amarrar os arquivos entre si: sem elas
   a linha nao tem a quem pertencer. Sao as unicas marcadas como
   obrigatorias por padrao - o resto o proprio cliente decide. */
const CHAVES_OBRIGATORIAS = ["tipo_registro", "nr_contrato"];

export function montarSchemaDataCob(key) {
  const layout = DATACOB_CSV_LAYOUTS[key];
  if (!layout) return null;

  return {
    id: `datacob:${key}`,
    nome: `DataCob · ${layout.label} (Tipo_Registro ${layout.tipoRegistro})`,
    origem: "Layout do Gerador CSV DataCob",
    arquivo: layout.filename,
    colunas: layout.headers.map((coluna) => {
      const chave = coluna.trim().toLowerCase();
      const regra = {
        coluna,
        obrigatorio: CHAVES_OBRIGATORIAS.includes(chave),
        tipo: tipoDaColuna(coluna),
        unico: false
      };
      // A primeira coluna identifica o layout: valor fixo, e o erro mais
      // comum e mandar o arquivo de parcela com o tipo do contrato.
      if (chave === "tipo_registro") {
        regra.valores = [String(layout.tipoRegistro)];
        regra.ajuda = `Precisa ser ${layout.tipoRegistro} neste arquivo (${layout.label}).`;
      }
      return regra;
    })
  };
}

/* Lista para o seletor da tela, na ordem oficial de recepcao. */
export function listarSchemasDataCob() {
  return Object.entries(DATACOB_CSV_LAYOUTS)
    .sort((a, b) => a[1].tipoRegistro - b[1].tipoRegistro)
    .map(([key, layout]) => ({
      key,
      label: `${layout.tipoRegistro} · ${layout.label}`,
      headers: layout.headers
    }));
}

/* Reconhece o layout de um arquivo lido, sem o usuario dizer qual e.

   Duas pistas, nesta ordem:
   1. o valor de Tipo_Registro na primeira linha de dados (e o campo que
      existe justamente para isso);
   2. o cabecalho, quando o Tipo_Registro nao ajuda (arquivo so com
      cabecalho, ou valor fora da tabela) - escolhe o layout com mais
      colunas em comum, desde que bata em pelo menos 70% delas.

   Devolve { key, motivo, confianca } ou null. */
export function reconhecerLayout(dados) {
  const indiceTipo = dados.cabecalho.findIndex((c) => c.trim().toLowerCase() === "tipo_registro");
  if (indiceTipo >= 0 && dados.linhas.length) {
    const valor = String(dados.linhas[0].campos[indiceTipo] || "").trim();
    const achado = Object.entries(DATACOB_CSV_LAYOUTS).find(([, l]) => String(l.tipoRegistro) === valor);
    if (achado) {
      return { key: achado[0], confianca: "alta", motivo: `Tipo_Registro = ${valor} na primeira linha de dados.` };
    }
  }

  const doArquivo = new Set(dados.cabecalho.map((c) => c.trim().toLowerCase()));
  let melhor = null;
  Object.entries(DATACOB_CSV_LAYOUTS).forEach(([key, layout]) => {
    const esperadas = layout.headers.map((h) => h.toLowerCase());
    const acertos = esperadas.filter((h) => doArquivo.has(h)).length;
    const proporcao = acertos / esperadas.length;
    if (!melhor || proporcao > melhor.proporcao) melhor = { key, proporcao, acertos, total: esperadas.length };
  });

  if (melhor && melhor.proporcao >= 0.7) {
    return {
      key: melhor.key,
      confianca: melhor.proporcao === 1 ? "alta" : "média",
      motivo: `${melhor.acertos} de ${melhor.total} colunas do layout batem com o cabeçalho.`
    };
  }
  return null;
}

/* Compara o cabecalho do arquivo com o do layout: o que falta, o que
   sobra e o que esta fora de ordem. E a conferencia que o pessoal faz
   no olho hoje. */
export function conferirCabecalhoContraLayout(cabecalho, key) {
  const layout = DATACOB_CSV_LAYOUTS[key];
  if (!layout) return null;

  const doArquivo = cabecalho.map((c) => c.trim());
  const esperado = layout.headers;
  const chave = (v) => v.toLowerCase();
  const setArquivo = new Set(doArquivo.map(chave));
  const setEsperado = new Set(esperado.map(chave));

  const faltando = esperado.filter((h) => !setArquivo.has(chave(h)));
  const sobrando = doArquivo.filter((h) => h && !setEsperado.has(chave(h)));

  // Ordem: so faz sentido comparar as colunas que existem nos dois.
  const comuns = esperado.filter((h) => setArquivo.has(chave(h)));
  const ordemArquivo = doArquivo.filter((h) => setEsperado.has(chave(h)));
  const foraDeOrdem = comuns.some((h, i) => chave(h) !== chave(ordemArquivo[i] || ""));

  return { layout, faltando, sobrando, foraDeOrdem, esperado, doArquivo };
}
