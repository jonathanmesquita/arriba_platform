/* Testes da normalização de erro dos provedores.

   O teste que mais importa é o do vazamento: a mensagem do USUÁRIO nunca
   pode conter o texto cru do provedor. É por ali que detalhe de
   infraestrutura (e às vezes pedaço de credencial na URL) chega na tela
   de quem só queria conversar. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ProviderError, classificarPorStatus, refinarPorTexto, comoProviderError
} from "../src/providers/errors.js";

describe("classificação por status HTTP", () => {
  test("mapeia os status conhecidos", () => {
    assert.equal(classificarPorStatus(401), "AUTH_INVALID");
    assert.equal(classificarPorStatus(403), "AUTH_INVALID");
    assert.equal(classificarPorStatus(404), "MODEL_NOT_FOUND");
    assert.equal(classificarPorStatus(408), "TIMEOUT");
    assert.equal(classificarPorStatus(413), "CONTEXT_LENGTH");
    assert.equal(classificarPorStatus(429), "RATE_LIMIT");
    assert.equal(classificarPorStatus(400), "BAD_REQUEST");
    assert.equal(classificarPorStatus(500), "PROVIDER_UNAVAILABLE");
    assert.equal(classificarPorStatus(503), "PROVIDER_UNAVAILABLE");
    assert.equal(classificarPorStatus(undefined), "UNKNOWN");
  });
});

describe("refino pelo texto", () => {
  test("reconhece contexto estourado", () => {
    assert.equal(refinarPorTexto("BAD_REQUEST", "prompt is too long: 250000 tokens"), "CONTEXT_LENGTH");
    assert.equal(refinarPorTexto("BAD_REQUEST", "maximum context length is 128000"), "CONTEXT_LENGTH");
  });

  test("reconhece modelo inexistente", () => {
    assert.equal(refinarPorTexto("BAD_REQUEST", "model gpt-9 does not exist"), "MODEL_NOT_FOUND");
    assert.equal(refinarPorTexto("UNKNOWN", "invalid model id"), "MODEL_NOT_FOUND");
  });

  test("separa cota esgotada de rate limit", () => {
    assert.equal(refinarPorTexto("RATE_LIMIT", "You exceeded your current quota, check billing"), "QUOTA_EXCEEDED");
    assert.equal(refinarPorTexto("UNKNOWN", "rate limit reached for requests"), "RATE_LIMIT");
  });

  test("reconhece credencial e filtro de conteúdo", () => {
    assert.equal(refinarPorTexto("UNKNOWN", "invalid api key provided"), "AUTH_INVALID");
    assert.equal(refinarPorTexto("UNKNOWN", "blocked by safety settings"), "CONTENT_FILTERED");
  });

  test("texto vazio não muda a classificação", () => {
    assert.equal(refinarPorTexto("RATE_LIMIT", undefined), "RATE_LIMIT");
    assert.equal(refinarPorTexto("UNKNOWN", ""), "UNKNOWN");
  });
});

describe("conversão para ProviderError", () => {
  test("AbortError vira CANCELLED", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    assert.equal(comoProviderError(abort, "OPENAI").code, "CANCELLED");
  });

  test("erro com status é classificado", () => {
    const erro = Object.assign(new Error("Unauthorized"), { status: 401 });
    const convertido = comoProviderError(erro, "ANTHROPIC");
    assert.equal(convertido.code, "AUTH_INVALID");
    assert.equal(convertido.provider, "ANTHROPIC");
  });

  test("ProviderError passa direto, sem reembrulhar", () => {
    const original = new ProviderError({ code: "RATE_LIMIT", provider: "GEMINI" });
    assert.equal(comoProviderError(original, "GEMINI"), original);
  });
});

describe("separação entre mensagem de usuário e de admin", () => {
  const SEGREDO = "organização acme-prod, chave sk-proj-abc123, host interno 10.0.0.9";

  test("a mensagem do usuário NÃO contém o texto do provedor", () => {
    for (const code of ["AUTH_INVALID", "RATE_LIMIT", "BAD_REQUEST", "UNKNOWN"] as const) {
      const erro = new ProviderError({ code, provider: "OPENAI", providerMessage: SEGREDO });
      assert.ok(!erro.mensagemUsuario.includes("sk-proj-abc123"), `${code} vazou a chave`);
      assert.ok(!erro.mensagemUsuario.includes("10.0.0.9"), `${code} vazou o host`);
      assert.ok(erro.mensagemUsuario.length > 0);
    }
  });

  test("a mensagem do admin contém o texto do provedor", () => {
    const erro = new ProviderError({ code: "BAD_REQUEST", provider: "OPENAI", providerMessage: SEGREDO });
    assert.ok(erro.mensagemAdmin.includes(SEGREDO));
  });

  test("o payload do usuário só tem code, message e retryable", () => {
    const erro = new ProviderError({ code: "RATE_LIMIT", provider: "OPENAI", providerMessage: SEGREDO });
    assert.deepEqual(Object.keys(erro.toUserPayload()).sort(), ["code", "message", "retryable"]);
    assert.equal(erro.toUserPayload().retryable, true);
  });

  test("só falha transitória é marcada como retryable", () => {
    const transitorios = ["RATE_LIMIT", "PROVIDER_UNAVAILABLE", "TIMEOUT"] as const;
    const definitivos = ["AUTH_INVALID", "MODEL_NOT_FOUND", "BAD_REQUEST", "CONTEXT_LENGTH"] as const;
    for (const code of transitorios) {
      assert.equal(new ProviderError({ code, provider: "OPENAI" }).retryable, true, code);
    }
    for (const code of definitivos) {
      assert.equal(new ProviderError({ code, provider: "OPENAI" }).retryable, false, code);
    }
  });
});
