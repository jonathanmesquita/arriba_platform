/* Testes do catálogo de modelos.

   Aqui mora a regra que quebra integração com Claude na primeira
   mensagem: os modelos de raciocínio atuais recusam `temperature` com
   HTTP 400. Se alguém marcar supportsTemperature: true para um deles, o
   chat para de responder — e o erro aparece só em produção. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PROVEDORES, PROVIDER_KINDS, capacidadesDoModelo,
  TEMPERATURA_PADRAO, SYSTEM_PROMPT_PADRAO
} from "../src/providers/catalog.js";

describe("catálogo", () => {
  test("descreve os cinco provedores", () => {
    assert.equal(PROVIDER_KINDS.length, 5);
    for (const kind of PROVIDER_KINDS) {
      const info = PROVEDORES[kind];
      assert.ok(info, `sem descrição para ${kind}`);
      assert.equal(info.kind, kind);
      assert.ok(info.label.length > 0);
      assert.ok(info.modelos.length > 0, `${kind} sem modelo sugerido`);
    }
  });

  test("Ollama é o único que não exige API key", () => {
    assert.equal(PROVEDORES.OLLAMA.requerApiKey, false);
    assert.equal(PROVEDORES.ANTHROPIC.requerApiKey, true);
    assert.equal(PROVEDORES.OPENAI.requerApiKey, true);
    assert.equal(PROVEDORES.GEMINI.requerApiKey, true);
    assert.equal(PROVEDORES.OPENROUTER.requerApiKey, true);
  });

  test("quem precisa de endereço próprio traz um padrão", () => {
    for (const kind of PROVIDER_KINDS) {
      const info = PROVEDORES[kind];
      if (info.requerBaseUrl) {
        assert.ok(info.baseUrlPadrao, `${kind} exige baseUrl e não sugere nenhuma`);
      }
    }
  });
});

describe("capacidade de temperature", () => {
  test("modelos de raciocínio da Anthropic NÃO aceitam", () => {
    for (const id of ["claude-opus-5", "claude-sonnet-5", "claude-opus-4-8", "claude-fable-5-1"]) {
      assert.equal(capacidadesDoModelo("ANTHROPIC", id).supportsTemperature, false, `${id} deveria recusar temperature`);
    }
  });

  test("Haiku 4.5 aceita", () => {
    assert.equal(capacidadesDoModelo("ANTHROPIC", "claude-haiku-4-5").supportsTemperature, true);
  });

  test("modelo desconhecido da Anthropic cai na heurística", () => {
    // Não está no catálogo: família de raciocínio -> recusa; haiku/antigo -> aceita.
    assert.equal(capacidadesDoModelo("ANTHROPIC", "claude-opus-9").supportsTemperature, false);
    assert.equal(capacidadesDoModelo("ANTHROPIC", "claude-haiku-9").supportsTemperature, true);
    assert.equal(capacidadesDoModelo("ANTHROPIC", "claude-3-opus-20240229").supportsTemperature, true);
  });

  test("o prefixo anthropic/ no OpenRouter segue a mesma regra", () => {
    assert.equal(capacidadesDoModelo("OPENROUTER", "anthropic/claude-opus-5").supportsTemperature, false);
    assert.equal(capacidadesDoModelo("OPENROUTER", "openai/gpt-4o").supportsTemperature, true);
  });

  test("modelo desconhecido de outro provedor assume que aceita", () => {
    assert.equal(capacidadesDoModelo("OPENAI", "gpt-modelo-que-nao-existe").supportsTemperature, true);
    assert.equal(capacidadesDoModelo("OLLAMA", "qualquer:7b").supportsTemperature, true);
  });
});

describe("padrões", () => {
  test("temperatura padrão é baixa (resposta previsível)", () => {
    assert.ok(TEMPERATURA_PADRAO <= 0.3, "temperatura alta gera invenção em uso técnico");
  });

  test("o system prompt padrão tem regras numeradas e não é vazio", () => {
    assert.ok(SYSTEM_PROMPT_PADRAO.includes("REGRAS"));
    assert.ok(/1\./.test(SYSTEM_PROMPT_PADRAO));
    assert.ok(SYSTEM_PROMPT_PADRAO.length > 200);
  });
});
