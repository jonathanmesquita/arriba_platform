/* Gerador de dados fictícios (assets/js/fake-data-br.js), usado pela massa
   de dados e pelos exemplos da tela da API. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarDataBr, gerarCelular, gerarCep, gerarDataEntre, gerarEmail } from "../../assets/js/fake-data-br.js";

test("celular: DDD + 9 + 8 dígitos", () => {
  for (let i = 0; i < 200; i += 1) assert.match(gerarCelular(), /^\d{2}9\d{8}$/);
});

test("CEP com 8 dígitos e e-mail sempre no domínio de exemplo", () => {
  for (let i = 0; i < 100; i += 1) assert.match(String(gerarCep()).replace(/\D/g, ""), /^\d{8}$/);
  assert.equal(gerarEmail("José da Silva", 3), "jose.da.silva3@exemplo.com");
});

test("data sorteada dentro do intervalo", () => {
  for (let i = 0; i < 100; i += 1) {
    const d = gerarDataEntre("2020-01-01", "2020-12-31");
    assert.ok(d >= "2020-01-01" && d <= "2020-12-31", d);
  }
  assert.equal(formatarDataBr("2026-11-06"), "06/11/2026");
});
