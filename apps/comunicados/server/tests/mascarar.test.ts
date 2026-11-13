/* A senha do servidor de e-mail aparece no diálogo SMTP que a biblioteca
   devolve no erro. Este teste é o que garante que ela não vai parar no
   banco, no log nem no resumo copiado para um chamado. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mascararSegredo, mensagemDeErro } from "../src/envios/mascarar.js";

describe("mascaramento de segredo", () => {
  test("esconde o AUTH LOGIN do diálogo SMTP", () => {
    const bruto = "535 5.7.8 Error\n> AUTH LOGIN dXN1YXJpbw==\n> c2VuaGEtc3VwZXItc2VjcmV0YQ==";
    const limpo = mascararSegredo(bruto);
    assert.ok(!limpo.includes("dXN1YXJpbw=="), limpo);
    assert.ok(limpo.includes("AUTH LOGIN ***"), limpo);
  });

  test("esconde campo nomeado em JSON", () => {
    const limpo = mascararSegredo('{"user":"ana","password":"p4ssw0rd!","host":"smtp.exemplo.com"}');
    assert.ok(!limpo.includes("p4ssw0rd!"), limpo);
    assert.ok(limpo.includes("smtp.exemplo.com"), "o que não é segredo precisa sobreviver");
  });

  test("esconde credencial embutida na URL", () => {
    assert.equal(mascararSegredo("smtp://ana:segredo@host:587"), "smtp://ana:***@host:587");
  });

  test("esconde cabeçalho de autenticação", () => {
    assert.ok(!mascararSegredo("Authorization: Bearer abc.def.ghi").includes("abc.def.ghi"));
  });

  test("corta texto gigante em vez de gravar uma página inteira", () => {
    assert.ok(mascararSegredo("x".repeat(5000)).length <= 2001);
  });

  test("mensagemDeErro junta código e resposta do servidor, já limpos", () => {
    const erro = Object.assign(new Error("Invalid login"), { code: "EAUTH", response: "535 AUTH LOGIN c2VjcmV0bw==" });
    const texto = mensagemDeErro(erro);
    assert.ok(texto.includes("EAUTH"));
    assert.ok(texto.includes("Invalid login"));
    assert.ok(!texto.includes("c2VjcmV0bw=="), texto);
  });
});
