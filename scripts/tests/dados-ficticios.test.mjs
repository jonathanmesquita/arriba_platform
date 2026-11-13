/* Gerador de dados fictícios (assets/js/fake-data-br.js), usado pela massa
   de dados e pelos exemplos da tela da API. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { digitoRg, formatarDataBr, formatarRg, gerarCelular, gerarCep, gerarDataEntre, gerarEmail, gerarRg, validarRg } from "../../assets/js/fake-data-br.js";

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

/* O verificador do RG (padrão de São Paulo) conferido por um caminho
   independente do código: com ele no fim valendo peso 100, a soma inteira
   tem de ser múltipla de 11 ("X" vale 10). */
function somaDeConferencia(rg) {
  const valor = (c) => (c === "X" ? 10 : Number(c));
  return [...rg.slice(0, 8)].reduce((acc, d, i) => acc + Number(d) * (i + 2), 0) + valor(rg[8]) * 100;
}

test("RG: dígito calculado à mão, inclusive o X e o zero", () => {
  // 1×2 + 0×3 + ... + 0×9 = 2 -> faltam 9 para 11.
  assert.equal(digitoRg("10000000"), "9");
  // 0×2 + ... + 1×9 = 9 -> faltam 2.
  assert.equal(digitoRg("00000001"), "2");
  // 6×2 + 0... = 12 -> resto 1 -> faltam 10 -> X.
  assert.equal(digitoRg("60000000"), "X");
  // 0... + 1×5 + 1×6 = 11 -> não falta nada -> 0.
  assert.equal(digitoRg("00011000"), "0");
  // Conferido contra um RG saído de um gerador de referência (24.013.068-6).
  assert.equal(digitoRg("24013068"), "6");
  assert.throws(() => digitoRg("123"));
});

test("RG gerado: 8 dígitos + verificador, e a soma fecha em múltiplo de 11", () => {
  let comX = 0;
  for (let i = 0; i < 2000; i += 1) {
    const rg = gerarRg();
    assert.match(rg, /^[1-9]\d{7}[\dX]$/);
    assert.equal(somaDeConferencia(rg) % 11, 0, rg);
    assert.equal(validarRg(rg), true, rg);
    if (rg.endsWith("X")) comX += 1;
  }
  assert.ok(comX > 0, "em 2000 sorteios o X aparece (1 em 11)");
});

test("RG: pontuação e validação", () => {
  assert.equal(formatarRg("600000000"), "60.000.000-0");
  assert.equal(formatarRg("60000000X"), "60.000.000-X");
  assert.equal(validarRg("60.000.000-X"), true);
  assert.equal(validarRg("60.000.000-x"), true);
  assert.equal(validarRg("60.000.000-1"), false);
  assert.equal(validarRg("123"), false);
  assert.equal(validarRg(""), false);
});
