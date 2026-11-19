/* Santander (033) — regras de cálculo do manual H7815 v8.1, sem dependência de layout.
   Separado de santander.js para o layout poder importar sem ciclo. */

"use strict";

/* Nota 15 — DV do nosso número, módulo 11: multiplica cada dígito, da direita
   para a esquerda, por 2, 3, … 9 (e volta ao 2); soma os produtos; resto da
   divisão por 11. Regras do manual: resto 0 → DV 0; resto 1 → DV 0 ("11 − 1 = 10,
   unidades 0"); resto 10 → DV 1; demais: 11 − resto.
   Exemplos do manual: 3147578 → 7; 4870184 → 0. */
export function dvNossoNumeroSantander(digitos) {
  const d = String(digitos).replace(/\D/g, "");
  let soma = 0;
  for (let i = 0; i < d.length; i++) {
    const peso = 2 + (i % 8);
    soma += Number(d[d.length - 1 - i]) * peso;
  }
  const resto = soma % 11;
  if (resto === 0 || resto === 1) return 0;
  return 11 - resto;
}

/* =====================================================================
   Regras entre campos (segmentos P e Q da remessa) — cada uma cita a nota
   do manual de onde sai. Recebem { campos (texto cru por chave), contexto }
   e devolvem [{ nivel, mensagem, campo? }]. Campo em branco/zerado só é
   cobrado quando o manual diz que o campo é obrigatório.
   ===================================================================== */
import { documentoValido } from "../../../../assets/js/validar-documentos.js";

const UFS = new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);

const vazio = (t) => !String(t ?? "").trim() || /^0+$/.test(String(t).trim());

/** "DDMMAAAA" → Date (meia-noite UTC) ou null se zerado/impossível. */
function dma(raw) {
  const t = String(raw ?? "").trim();
  if (!/^\d{8}$/.test(t) || /^0+$/.test(t)) return null;
  const d = new Date(Date.UTC(+t.slice(4, 8), +t.slice(2, 4) - 1, +t.slice(0, 2)));
  return d.getUTCDate() === +t.slice(0, 2) && d.getUTCMonth() === +t.slice(2, 4) - 1 ? d : null;
}

const digitosSemZeros = (t) => String(t ?? "").replace(/\D/g, "").replace(/^0+/, "");

const REGRAS_P = [
  // Nota 17 — vencimento.
  ({ campos }) => {
    const v = String(campos.dataVencimento).trim();
    const saida = [];
    if (v === "11111111" || v === "99999999") {
      return [{ nivel: "erro", campo: "dataVencimento", mensagem: `o vencimento ${v} é rejeitado pelo banco (nota 17).` }];
    }
    const venc = dma(v);
    const emis = dma(campos.dataEmissao);
    if (venc && emis) {
      if (venc < emis) saida.push({ nivel: "erro", campo: "dataVencimento", mensagem: "o vencimento é anterior à data de emissão (nota 17: deve ser igual ou posterior)." });
      const limite = new Date(Date.UTC(emis.getUTCFullYear() + 10, emis.getUTCMonth(), emis.getUTCDate()));
      if (venc > limite) saida.push({ nivel: "erro", campo: "dataVencimento", mensagem: "o vencimento passa de 10 anos depois da emissão (nota 17: prazo máximo de 10 anos)." });
    }
    return saida;
  },
  // Nota 15 — DV do nosso número: o manual só RECOMENDA, então é aviso.
  ({ campos }) => {
    const nn = String(campos.nossoNumero).trim();
    if (!/^\d{13}$/.test(nn) || /^0+$/.test(nn)) return [];
    const esperado = dvNossoNumeroSantander(nn.slice(0, 12));
    return Number(nn[12]) === esperado
      ? []
      : [{ nivel: "aviso", campo: "nossoNumero", mensagem: `o dígito verificador do nosso número ${nn} é ${nn[12]}, e o cálculo módulo 11 do manual dá ${esperado} (o manual recomenda o DV, mas não o exige).` }];
  },
  // Nota 18 — valor zerado, desconto e abatimento.
  ({ campos }) => {
    const centavos = (k) => (/^\d+$/.test(String(campos[k]).trim()) ? Number(String(campos[k]).trim()) : 0);
    const nominal = centavos("valorNominal");
    const saida = [];
    if (nominal === 0 && !["31", "32"].includes(String(campos.especie).trim())) {
      saida.push({ nivel: "erro", campo: "valorNominal", mensagem: "valor nominal zerado só é permitido nas espécies 31 (BCC) e 32 (BDP) (nota 18)." });
    }
    if (nominal > 0) {
      const desc = centavos("valorDesconto");
      const abat = centavos("valorAbatimento");
      const desconto = String(campos.codDesconto).trim() === "1" ? desc : 0;   // só o valor fixo é comparável com o nominal
      if (desconto >= nominal && desconto > 0) saida.push({ nivel: "erro", campo: "valorDesconto", mensagem: "o valor do desconto deve ser menor que o valor nominal (nota 18)." });
      if (abat >= nominal && abat > 0) saida.push({ nivel: "erro", campo: "valorAbatimento", mensagem: "o valor do abatimento deve ser menor que o valor nominal (nota 18)." });
      else if (desconto + abat >= nominal && desconto + abat > 0) saida.push({ nivel: "erro", campo: "valorAbatimento", mensagem: "a soma de desconto e abatimento deve ser menor que o valor nominal (nota 18)." });
    }
    return saida;
  },
  // Nota 21/22 — juros de mora.
  ({ campos }) => {
    const cod = String(campos.codJuros).trim();
    const venc = dma(campos.dataVencimento);
    const dj = dma(campos.dataJuros);
    const saida = [];
    if (["1", "2", "4"].includes(cod) && venc && dj && dj.getTime() !== venc.getTime()) {
      saida.push({ nivel: "aviso", campo: "dataJuros", mensagem: `com código de mora ${cod}, a data de juros de mora deve ser a data de vencimento (nota 22).` });
    }
    if (["5", "6"].includes(cod) && venc && dj && dj <= venc) {
      saida.push({ nivel: "erro", campo: "dataJuros", mensagem: `com tolerância de juros (código ${cod}), a data de juros de mora deve ser maior que o vencimento (nota 22).` });
    }
    if (["1", "2"].includes(cod) && vazio(campos.valorJuros)) {
      saida.push({ nivel: "erro", campo: "valorJuros", mensagem: `com código de mora ${cod}, é preciso informar o ${cod === "1" ? "valor por dia" : "percentual mensal"} (nota 21).` });
    }
    return saida;
  },
  // Nota 23 — desconto: códigos 1 e 2 exigem data entre a emissão (exclusive) e o vencimento (inclusive).
  ({ campos }) => {
    const cod = String(campos.codDesconto).trim();
    const saida = [];
    const venc = dma(campos.dataVencimento);
    const emis = dma(campos.dataEmissao);
    const dd = dma(campos.dataDesconto);
    if (["1", "2"].includes(cod)) {
      if (!dd) saida.push({ nivel: "erro", campo: "dataDesconto", mensagem: `com código de desconto ${cod}, a data do desconto é obrigatória (nota 23).` });
      else if ((emis && dd <= emis) || (venc && dd > venc)) saida.push({ nivel: "erro", campo: "dataDesconto", mensagem: "a data do desconto deve ser maior que a emissão e menor ou igual ao vencimento (nota 23)." });
    }
    if (["3", "4"].includes(cod) && venc && dd && dd.getTime() !== venc.getTime()) {
      saida.push({ nivel: "erro", campo: "dataDesconto", mensagem: `com código de desconto ${cod}, a data deve ser igual ao vencimento (nota 23).` });
    }
    if (["1", "2", "3", "4"].includes(cod) && vazio(campos.valorDesconto)) {
      saida.push({ nivel: "erro", campo: "valorDesconto", mensagem: `com código de desconto ${cod}, o valor ou percentual do desconto é obrigatório (nota 23).` });
    }
    return saida;
  },
  // Nota 25/26 — protesto e baixa: dias só fazem sentido com o código certo (aviso).
  ({ campos }) => {
    const saida = [];
    if (["1", "2"].includes(String(campos.codProtesto).trim()) && vazio(campos.diasProtesto)) {
      saida.push({ nivel: "aviso", campo: "diasProtesto", mensagem: "com protesto em dias corridos ou úteis, o número de dias para protesto não foi informado (nota 25)." });
    }
    return saida;
  },
];

const REGRAS_Q = [
  // Nota 29 — dígito verificador do CPF/CNPJ do pagador; não pode ser igual ao do beneficiário.
  ({ campos, contexto }) => {
    const saida = [];
    const tipo = String(campos.tipoInscPagador).trim();
    const num = campos.numInscPagador;
    if (!vazio(num)) {
      const ok = documentoValido(tipo, num);
      if (ok === false) saida.push({ nivel: "erro", campo: "numInscPagador", mensagem: `o ${tipo === "1" ? "CPF" : "CNPJ"} do pagador não passa na conferência do dígito verificador (nota 29: o banco rejeita a entrada).` });
      const benef = digitosSemZeros(contexto?.numInscricaoBeneficiario);
      if (benef && digitosSemZeros(num) === benef) saida.push({ nivel: "erro", campo: "numInscPagador", mensagem: "o documento do pagador é igual ao do beneficiário (nota 29: o banco rejeita)." });
    } else {
      saida.push({ nivel: "erro", campo: "numInscPagador", mensagem: "o número de inscrição do pagador é obrigatório (nota 29: sem ele a entrada é rejeitada)." });
    }
    return saida;
  },
  // Nota 28 — endereço obrigatório e UF válida.
  ({ campos }) => {
    const saida = [];
    for (const [k, rotulo] of [["nomePagador", "o nome do pagador"], ["enderecoPagador", "o endereço do pagador"], ["bairroPagador", "o bairro do pagador"], ["cidadePagador", "a cidade do pagador"]]) {
      if (!String(campos[k]).trim()) saida.push({ nivel: "erro", campo: k, mensagem: `${rotulo} é obrigatório (nota 28).` });
    }
    if (vazio(campos.cepPagador)) saida.push({ nivel: "erro", campo: "cepPagador", mensagem: "o CEP do pagador é obrigatório (nota 28)." });
    const uf = String(campos.ufPagador).trim().toUpperCase();
    if (!uf || !UFS.has(uf)) saida.push({ nivel: "erro", campo: "ufPagador", mensagem: `a UF do pagador (${uf ? `"${uf}"` : "em branco"}) deve ser existente e válida (nota 28).` });
    return saida;
  },
];

export const regrasSantander = { remessa: { P: REGRAS_P, Q: REGRAS_Q }, retorno: {} };
