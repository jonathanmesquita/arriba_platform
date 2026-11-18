/* CPF e CNPJ (assets/js/validar-documentos.js). Documentos de teste, sem dono. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpfValido, cnpjValido, documentoValido } from "../../assets/js/validar-documentos.js";
import { gerarCpf } from "../../assets/js/fake-data-br.js";

test("CPF: o gerador de dados fictícios só produz CPF que este módulo aceita", () => {
  for (let i = 0; i < 300; i++) assert.ok(cpfValido(gerarCpf()));
});

test("CPF: dígito errado, tamanho errado e sequência repetida", () => {
  const bom = gerarCpf();
  const ruim = bom.slice(0, 10) + String((Number(bom[10]) + 1) % 10);
  assert.equal(cpfValido(ruim), false);
  assert.equal(cpfValido("1234567890"), false);
  assert.equal(cpfValido("11111111111"), false);
  assert.equal(cpfValido("529.982.247-25"), true, "com pontuação");
});

test("CNPJ: caso conhecido da Receita (documento de exemplo público) e erros", () => {
  assert.equal(cnpjValido("11.222.333/0001-81"), true);
  assert.equal(cnpjValido("11222333000182"), false);
  assert.equal(cnpjValido("00000000000000"), false);
  assert.equal(cnpjValido("1122233300018"), false);
});

test("documentoValido: tipo do CNAB, zeros à esquerda e tipo desconhecido", () => {
  const cpf = gerarCpf();
  assert.equal(documentoValido("1", "0000" + cpf), true);
  assert.equal(documentoValido("01", cpf.padStart(14, "0")), true);
  assert.equal(documentoValido("2", "0011222333000181"), true);
  assert.equal(documentoValido("2", "11222333000182"), false);
  assert.equal(documentoValido("9", cpf), null);
});
