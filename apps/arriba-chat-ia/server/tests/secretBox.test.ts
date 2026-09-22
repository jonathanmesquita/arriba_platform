/* Testes do cofre de credenciais.

   O que importa provar aqui não é "cifra e decifra" — é que a escolha do
   GCM (autenticado) está de pé: adulterar o registro no banco tem de
   FALHAR, não devolver lixo silencioso. Se um dia alguém trocar por CBC
   "porque é mais simples", este arquivo quebra. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { SecretBox, carregarChave, CryptoConfigError, CryptoIntegrityError } from "../src/crypto/secretBox.js";

const CHAVE = randomBytes(32);
const cofre = new SecretBox(CHAVE);

describe("SecretBox", () => {
  test("ida e volta preserva o texto", () => {
    const segredo = "sk-ant-api03-exemplo-ficticio-1234567890";
    assert.equal(cofre.decrypt(cofre.encrypt(segredo)), segredo);
  });

  test("preserva acento e caractere fora do ASCII", () => {
    const texto = "çãõ—key•ключ";
    assert.equal(cofre.decrypt(cofre.encrypt(texto)), texto);
  });

  test("cifrar duas vezes o mesmo texto dá resultados diferentes (IV aleatório)", () => {
    const texto = "mesma-chave-de-sempre";
    const a = cofre.encrypt(texto);
    const b = cofre.encrypt(texto);
    assert.notEqual(a, b, "IV repetido em GCM permite recuperar o texto claro");
    assert.equal(cofre.decrypt(a), cofre.decrypt(b));
  });

  test("formato guardado é v1.<iv>.<tag>.<ct>", () => {
    const partes = cofre.encrypt("x").split(".");
    assert.equal(partes.length, 4);
    assert.equal(partes[0], "v1");
  });

  test("adulterar o texto cifrado faz decrypt LANÇAR", () => {
    const guardado = cofre.encrypt("credencial-importante");
    const partes = guardado.split(".");
    const cifrado = Buffer.from(partes[3] ?? "", "base64url");
    cifrado[0] = (cifrado[0] ?? 0) ^ 0xff; // vira um bit
    const adulterado = [partes[0], partes[1], partes[2], cifrado.toString("base64url")].join(".");

    assert.throws(() => cofre.decrypt(adulterado), CryptoIntegrityError);
  });

  test("adulterar a tag de autenticação também lança", () => {
    const partes = cofre.encrypt("outra credencial").split(".");
    const tag = Buffer.from(partes[2] ?? "", "base64url");
    tag[0] = (tag[0] ?? 0) ^ 0x01;
    assert.throws(() => cofre.decrypt([partes[0], partes[1], tag.toString("base64url"), partes[3]].join(".")), CryptoIntegrityError);
  });

  test("chave diferente não decifra", () => {
    const outro = new SecretBox(randomBytes(32));
    assert.throws(() => outro.decrypt(cofre.encrypt("segredo")), CryptoIntegrityError);
  });

  test("formato inválido é recusado sem estourar erro genérico", () => {
    assert.throws(() => cofre.decrypt("não é nada disso"), CryptoIntegrityError);
    assert.throws(() => cofre.decrypt("v2.a.b.c"), CryptoIntegrityError);
    assert.throws(() => cofre.decrypt(""), CryptoIntegrityError);
  });

  test("chave de tamanho errado é recusada na carga", () => {
    assert.throws(() => carregarChave(undefined), CryptoConfigError);
    assert.throws(() => carregarChave(Buffer.alloc(16).toString("base64")), CryptoConfigError);
    assert.doesNotThrow(() => carregarChave(randomBytes(32).toString("base64")));
    assert.doesNotThrow(() => carregarChave(randomBytes(32).toString("hex")));
  });

  test("last4 não revela chave curta", () => {
    assert.equal(SecretBox.last4("abc"), "", "chave curta não deve vazar nada");
    assert.equal(SecretBox.last4("sk-ant-1234567890"), "7890");
  });
});
