/* Regras por coluna do Validador de CSV (rules.js): o "conteúdo está
   certo?", separado do "o arquivo está bem formado?" do parser. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { acharLinhasDuplicadas, normalizar, validarCnpj, validarComSchema, validarCpf, validarData } from "../../tools/dados/csv-validator/rules.js";
import { gerarCpf } from "../../assets/js/fake-data-br.js";

test("CPF: dígito verificador e sequência repetida", () => {
  assert.equal(validarCpf("529.982.247-25"), true);
  assert.equal(validarCpf("529.982.247-24"), false);
  assert.equal(validarCpf("111.111.111-11"), false);
  assert.equal(validarCpf("123"), false);
});

test("CNPJ numérico", () => {
  assert.equal(validarCnpj("11.222.333/0001-81"), true);
  assert.equal(validarCnpj("11.222.333/0001-80"), false);
  assert.equal(validarCnpj("00000000000000"), false);
});

test("data que existe de verdade, nos dois formatos", () => {
  assert.equal(validarData("29/02/2024"), "");
  assert.equal(validarData("2024-02-29"), "");
  assert.match(validarData("29/02/2023"), /não existe/);
  assert.match(validarData("31/04/2026"), /não existe/);
  assert.match(validarData("2026/04/01"), /formato inválido/);
  assert.match(validarData("10/13/2026"), /mês 13/);
});

test("schema: vazio só é cobrado pela regra obrigatório, não pelo tipo", () => {
  const dados = {
    cabecalho: ["Cpf_Cnpj", "Dt_Nascimento", "UF"],
    linhas: [
      { linha: 2, campos: ["529.982.247-25", "", "SP"] },
      { linha: 3, campos: ["", "31/02/2000", "XX"] },
      { linha: 4, campos: ["529.982.247-25", "01/01/2000", "SP"] }
    ]
  };
  const schema = { colunas: [
    { coluna: "cpf_cnpj", obrigatorio: true, unico: true },
    { coluna: "Dt_Nascimento", tipo: "data" },
    { coluna: "UF", valores: ["SP", "RJ"] },
    { coluna: "Email", obrigatorio: true }
  ] };
  const achados = validarComSchema(dados, schema);
  const por = (regra) => achados.filter((a) => a.regra === regra);
  assert.deepEqual(por("obrigatorio").map((a) => a.linha), [3]);
  assert.deepEqual(por("tipo").map((a) => a.linha), [3], "data vazia na linha 2 não é erro de tipo");
  assert.deepEqual(por("valores").map((a) => a.linha), [3]);
  assert.deepEqual(por("unico").map((a) => a.linha), [4]);
  assert.equal(por("coluna-ausente").length, 1, "coluna ausente aparece uma vez, não por linha");
});

test("nome de coluna comparado sem acento, caixa e espaço; linha duplicada inteira", () => {
  assert.equal(normalizar(" Endereço "), "endereco");
  const dup = acharLinhasDuplicadas({ linhas: [{ linha: 2, campos: ["a", "b"] }, { linha: 3, campos: [" a", "b "] }] });
  assert.deepEqual(dup.map((d) => d.linha), [3]);
});

test("o gerador de dados fictícios só produz CPF que passa na validação", () => {
  for (let i = 0; i < 500; i += 1) assert.equal(validarCpf(gerarCpf()), true);
});
