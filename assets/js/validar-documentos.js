/* =====================================================================
   Validação de CPF e CNPJ (numéricos) — módulo sem DOM.

   Algoritmo público da Receita Federal (módulo 11): o CPF tem 2 dígitos
   verificadores sobre 9 dígitos; o CNPJ, 2 sobre 12. Número com todos os
   dígitos iguais ("11111111111") passa na conta mas não é um documento
   válido, então é recusado. Aqui só entra o formato numérico; o CNPJ com
   letras (nova regra) não é tratado.
   ===================================================================== */

const soDigitos = (t) => String(t ?? "").replace(/\D/g, "");

function digitoModulo11(digitos, pesos) {
  const soma = digitos.reduce((acc, d, i) => acc + d * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(valor) {
  const t = soDigitos(valor);
  if (t.length !== 11 || /^(\d)\1{10}$/.test(t)) return false;
  const n = [...t].map(Number);
  const d1 = digitoModulo11(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoModulo11(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === n[9] && d2 === n[10];
}

export function cnpjValido(valor) {
  const t = soDigitos(valor);
  if (t.length !== 14 || /^(\d)\1{13}$/.test(t)) return false;
  const n = [...t].map(Number);
  const d1 = digitoModulo11(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoModulo11(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === n[12] && d2 === n[13];
}

/** `tipo` do CNAB: "1" ou "01" = CPF, "2" ou "02" = CNPJ. Aceita zeros à esquerda (campo de 14/15 posições). */
export function documentoValido(tipo, numero) {
  const t = String(tipo).replace(/^0+/, "");
  const digitos = soDigitos(numero);
  if (t === "1") return cpfValido(digitos.slice(-11).padStart(11, "0")) && digitos.replace(/^0+/, "").length <= 11;
  if (t === "2") return cnpjValido(digitos.slice(-14).padStart(14, "0")) && digitos.replace(/^0+/, "").length <= 14;
  return null; // tipo desconhecido: não há o que conferir
}
