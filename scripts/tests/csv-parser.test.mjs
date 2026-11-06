/* Leitor de CSV do site (tools/dados/csv-validator/parser.js). É a regra
   mais sutil do projeto: aspas, "" escapado, delimitador e quebra de
   linha dentro do campo. A Arriba API usa uma cópia deste arquivo — se um
   teste daqui mudar, o de lá muda junto. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { analisarCsv, detectarDelimitador, detectarQuebraLinha, lerCsv, montarCsv } from "../../tools/dados/csv-validator/parser.js";

test("aspas protegem delimitador, aspas escapadas e quebra de linha", () => {
  const { registros, aspasAbertaEm } = lerCsv('a;b\n"Rua A; 10";"diz ""oi"""\n"linha 1\nlinha 2";x\n', ";");
  assert.equal(aspasAbertaEm, null);
  assert.deepEqual(registros[1].campos, ["Rua A; 10", 'diz "oi"']);
  assert.deepEqual(registros[2].campos, ["linha 1\nlinha 2", "x"]);
  assert.equal(registros[2].linha, 3, "a linha física de início é a que o editor mostra");
});

test("aspas abertas e nunca fechadas viram erro com a linha", () => {
  const r = analisarCsv('a;b\n1;"2\n3;4\n');
  const erro = r.problemas.find((p) => p.tipo === "aspas");
  assert.ok(erro);
  assert.equal(erro.linha, 2);
});

test("delimitador detectado pela consistência, não pelo volume", () => {
  // vírgula decimal em quantidade irregular; ponto e vírgula igual em toda linha
  const texto = "nome;valor;obs\nAna;1,50;a,b,c\nBia;2,75;x\n";
  assert.equal(detectarDelimitador(texto).delimitador, ";");
  assert.equal(detectarDelimitador(texto).confianca, "alta");
});

test("conta colunas, acusa sobra e falta de delimitador", () => {
  const r = analisarCsv("a;b;c\n1;2;3\n1;2\n1;2;3;4\n", { delimitador: ";" });
  const colunas = r.problemas.filter((p) => p.tipo === "colunas");
  assert.deepEqual(colunas.map((p) => p.linha), [3, 4]);
  assert.match(colunas[0].mensagem, /Falta delimitador/);
  assert.match(colunas[1].mensagem, /Sobra de delimitador/);
});

test("cabeçalho duplicado, sem nome e com espaço sobrando", () => {
  const r = analisarCsv("a;a; ;b \n1;2;3;4\n", { delimitador: ";" });
  const cab = r.problemas.filter((p) => p.tipo === "cabecalho");
  assert.ok(cab.some((p) => /duas vezes/.test(p.mensagem)));
  assert.ok(cab.some((p) => /sem nome/.test(p.mensagem)));
  assert.ok(cab.some((p) => /espaço sobrando/.test(p.mensagem)));
});

test("BOM, fim de linha misturado e linha em branco", () => {
  const r = analisarCsv("﻿a;b\r\n1;2\n\n3;4\r\n", { delimitador: ";" });
  assert.equal(r.meta.bom, true);
  assert.equal(r.meta.quebraMisturada, true);
  assert.ok(r.problemas.some((p) => p.tipo === "linha-vazia"));
  assert.equal(r.linhas.length, 2);
  assert.deepEqual(detectarQuebraLinha("a\r\nb\r\n"), { tipo: "CRLF", misturado: false, contagens: { crlf: 2, lf: 0, cr: 0 } });
});

test("montarCsv é o inverso da leitura (ida e volta)", () => {
  const cabecalho = ["nome", "endereco"];
  const linhas = [{ campos: ["Ana", 'Rua "A"; 10'] }, { campos: ["Bia", "linha 1\nlinha 2"] }];
  const texto = montarCsv(cabecalho, linhas, ";", false);
  const volta = analisarCsv(texto, { delimitador: ";" });
  assert.deepEqual(volta.cabecalho, cabecalho);
  assert.deepEqual(volta.linhas.map((l) => l.campos), linhas.map((l) => l.campos));
  assert.equal(volta.problemas.filter((p) => p.gravidade === "erro").length, 0);
});
