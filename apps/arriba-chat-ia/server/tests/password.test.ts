/* Testes do hash de senha.

   O ponto central: o hash tem de ser DIFERENTE a cada chamada para a
   mesma senha (salt aleatório). Sem isso, duas pessoas com a mesma senha
   teriam o mesmo hash no banco — e uma tabela pré-computada resolveria as
   duas de uma vez. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hashSenha, verificarSenha, validarForcaSenha, TAMANHO_MINIMO_SENHA } from "../src/auth/password.js";

describe("hash de senha", () => {
  test("o hash não contém a senha", async () => {
    const guardado = await hashSenha("SenhaSuperSecreta123");
    assert.ok(!guardado.includes("SenhaSuperSecreta123"));
  });

  test("aceita a senha certa e recusa a errada", async () => {
    const guardado = await hashSenha("SenhaSuperSecreta123");
    assert.equal(await verificarSenha("SenhaSuperSecreta123", guardado), true);
    assert.equal(await verificarSenha("SenhaSuperSecreta124", guardado), false);
    assert.equal(await verificarSenha("", guardado), false);
  });

  test("mesma senha gera hashes diferentes (salt aleatório)", async () => {
    const a = await hashSenha("mesmaSenhaDeSempre1");
    const b = await hashSenha("mesmaSenhaDeSempre1");
    assert.notEqual(a, b);
    assert.equal(await verificarSenha("mesmaSenhaDeSempre1", a), true);
    assert.equal(await verificarSenha("mesmaSenhaDeSempre1", b), true);
  });

  test("formato inválido devolve false em vez de lançar", async () => {
    for (const lixo of ["", "nada", "scrypt$x$y$z", "$$$$", "scrypt$16384$8$1$soSalt"]) {
      assert.equal(await verificarSenha("qualquer", lixo), false, `falhou em: ${lixo}`);
    }
  });

  test("hash adulterado não valida", async () => {
    const guardado = await hashSenha("SenhaSuperSecreta123");
    const partes = guardado.split("$");
    partes[partes.length - 1] = "AAAA" + (partes[partes.length - 1] ?? "").slice(4);
    assert.equal(await verificarSenha("SenhaSuperSecreta123", partes.join("$")), false);
  });

  test("força da senha cobre os limites", () => {
    assert.notEqual(validarForcaSenha("curta"), null);
    assert.notEqual(validarForcaSenha("a".repeat(TAMANHO_MINIMO_SENHA - 1)), null);
    assert.equal(validarForcaSenha("a".repeat(TAMANHO_MINIMO_SENHA)), null);
    assert.equal(validarForcaSenha("umaSenhaQueServe123"), null);
  });
});
