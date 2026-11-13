/* Separação da lista e divisão em lotes — as duas regras que protegem o
   disparo de mandar para quem não devia e de derrubar a conta no
   provedor. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { separarDestinatarios, dividirEmLotes, minutosEstimados, ehEmailPlausivel } from "../src/envios/lotes.js";

const d = (email: string, nome?: string) => ({ email, nome: nome ?? null, clienteNome: null });

describe("separação de destinatários", () => {
  test("quem pediu para sair não recebe — nem com a lista colada à mão", () => {
    const r = separarDestinatarios([d("ana@exemplo.com"), d("bruno@exemplo.com")], ["bruno@exemplo.com"]);
    assert.deepEqual(r.aEnviar.map((x) => x.email), ["ana@exemplo.com"]);
    assert.deepEqual(r.descadastrados.map((x) => x.email), ["bruno@exemplo.com"]);
  });

  test("descadastro compara sem ligar para maiúscula nem espaço", () => {
    const r = separarDestinatarios([d("  ANA@Exemplo.COM ")], ["ana@exemplo.com"]);
    assert.equal(r.aEnviar.length, 0);
    assert.equal(r.descadastrados.length, 1);
  });

  test("e-mail repetido na mesma lista entra uma vez só", () => {
    const r = separarDestinatarios([d("ana@exemplo.com"), d("ANA@exemplo.com")], []);
    assert.equal(r.aEnviar.length, 1);
    assert.equal(r.repetidos.length, 1);
  });

  test("texto que não é e-mail sai como inválido", () => {
    const r = separarDestinatarios([d("sem arroba"), d("falta@dominio"), d("ok@exemplo.com")], []);
    assert.equal(r.invalidos.length, 2);
    assert.equal(r.aEnviar.length, 1);
  });

  test("formato: aceita o comum, recusa o quebrado", () => {
    assert.ok(ehEmailPlausivel("a.b-c@sub.exemplo.com.br"));
    assert.ok(!ehEmailPlausivel("a@b"));
    assert.ok(!ehEmailPlausivel(""));
  });
});

describe("lotes", () => {
  test("divide no tamanho configurado", () => {
    assert.deepEqual(dividirEmLotes([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  test("tamanho inválido vira 1 em vez de dividir por zero", () => {
    assert.equal(dividirEmLotes([1, 2, 3], 0).length, 3);
    assert.equal(dividirEmLotes([1, 2, 3], Number.NaN).length, 3);
  });

  test("o intervalo conta ENTRE lotes", () => {
    // 3 lotes com 1 minuto esperam 2 minutos, não 3 — a tela promete
    // esse número e tem de bater com o relógio.
    assert.equal(minutosEstimados(3, 1), 2);
    assert.equal(minutosEstimados(1, 5), 0);
    assert.equal(minutosEstimados(0, 5), 0);
  });
});
