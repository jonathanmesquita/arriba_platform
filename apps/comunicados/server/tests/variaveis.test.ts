/* Variáveis da carta: o que acontece entre o que se escreve e o que a
   pessoa recebe. Falha aqui não derruba o servidor — manda e-mail errado
   para a lista inteira, que é pior. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  preencher, variaveisUsadas, variaveisDesconhecidas, valoresDeExemplo, escaparHtml
} from "../src/cartas/variaveis.js";

describe("variáveis da carta", () => {
  test("troca pelo valor do destinatário", () => {
    const html = preencher("<p>Olá, {{nome}}!</p>", { nome: "Ana" });
    assert.equal(html, "<p>Olá, Ana!</p>");
  });

  test("tolera espaço dentro das chaves", () => {
    assert.equal(preencher("{{ nome }}", { nome: "Ana" }), "Ana");
  });

  test("escapa o valor — nome com HTML não vira marcação", () => {
    // Um nome com "<" quebraria o layout; com <script>, viraria execução
    // no cliente de e-mail de quem recebe.
    const html = preencher("<p>{{cliente}}</p>", { cliente: '<script>alert(1)</script> & Cia' });
    assert.ok(!html.includes("<script>"), html);
    assert.ok(html.includes("&lt;script&gt;"), html);
    assert.ok(html.includes("&amp; Cia"), html);
  });

  test("no assunto não escapa — senão sai &amp; na caixa de entrada", () => {
    assert.equal(preencher("{{cliente}}", { cliente: "Alfa & Beta" }, { escapar: false }), "Alfa & Beta");
  });

  test("valor ausente vira vazio, não a palavra undefined", () => {
    assert.equal(preencher("Olá, {{nome}}.", { nome: null }), "Olá, .");
    assert.equal(preencher("Olá, {{nome}}.", {}), "Olá, .");
  });

  test("variável desconhecida fica visível em vez de sumir", () => {
    // Trocar por vazio esconderia o erro justamente de quem poderia
    // corrigi-lo antes do disparo.
    const texto = "Prezado {{nome_do_titular}},";
    assert.equal(preencher(texto, {}), texto);
    assert.deepEqual(variaveisDesconhecidas(texto), ["nome_do_titular"]);
  });

  test("lista as variáveis usadas, sem repetir", () => {
    assert.deepEqual(variaveisUsadas("{{nome}} {{cliente}} {{nome}}"), ["nome", "cliente"]);
  });

  test("os exemplos cobrem todas as variáveis declaradas", () => {
    const exemplos = valoresDeExemplo();
    for (const chave of variaveisUsadas("{{nome}}{{email}}{{cliente}}{{produto}}{{data}}{{remetente}}")) {
      assert.ok(exemplos[chave], `sem exemplo para ${chave}`);
    }
  });

  test("escaparHtml cobre os cinco caracteres que importam", () => {
    assert.equal(escaparHtml(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
});
