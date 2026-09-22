/* Testes da base de conhecimento.

   Três coisas são testadas aqui porque falham em silêncio quando
   quebram — nenhuma delas derruba o servidor, todas pioram a resposta:

   1. A limpeza dos termos da pergunta. Se um operador de tsquery
      escapar, a consulta estoura com erro de sintaxe (ou, no pior caso,
      vira injeção) e a busca some — o chat continua respondendo, só que
      sem base.

   2. A remoção do texto de template. Sem ela, 48% do corpus é o mesmo
      parágrafo repetido em 61 manuais e qualquer palavra comum casa com
      tudo.

   3. O orçamento do contexto. Estourar não dá erro: só empurra o trecho
      certo para longe da atenção do modelo e encarece cada mensagem.

   Nenhum destes testes toca o banco — são funções puras de propósito,
   justamente para poderem ser testadas assim. */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { termosDaPergunta } from "../src/knowledge/search.js";
import { montarContexto, comContexto, LIMITE_CARACTERES_CONTEXTO } from "../src/knowledge/context.js";
import { textoDeHtml, removerRepetido } from "../src/knowledge/ingest.js";
import type { TrechoEncontrado } from "../src/knowledge/search.js";

function trecho(parcial: Partial<TrechoEncontrado> = {}): TrechoEncontrado {
  return {
    id: "1",
    source: "MANUAL",
    title: "Título",
    category: null,
    url: null,
    content: "conteúdo",
    rank: 0.5,
    ...parcial
  };
}

describe("termos da pergunta", () => {
  test("derruba operador de tsquery", () => {
    // Estes caracteres são sintaxe para o to_tsquery. Se algum passar, a
    // consulta quebra no banco.
    const termos = termosDaPergunta("negativação & cliente | (erro) !falha :* 'aspas'");
    for (const termo of termos) {
      assert.match(termo, /^[\p{L}\p{N}]+$/u, `termo com caractere perigoso: ${termo}`);
    }
    assert.ok(termos.includes("negativação"));
    assert.ok(termos.includes("cliente"));
  });

  test("descarta palavra curta e repetida", () => {
    const termos = termosDaPergunta("de la o token token TOKEN");
    assert.deepEqual(termos, ["token"]);
  });

  test("pergunta sem letra nem dígito devolve nada", () => {
    // Importa porque buscarTrechos usa isso para nem ir ao banco.
    assert.deepEqual(termosDaPergunta("??? !!! ..."), []);
    assert.deepEqual(termosDaPergunta(""), []);
  });

  test("limita a quantidade de termos", () => {
    const pergunta = Array.from({ length: 40 }, (_, i) => `palavra${i}`).join(" ");
    assert.ok(termosDaPergunta(pergunta).length <= 12);
  });
});

describe("extração de texto de HTML", () => {
  test("descarta script, style e navegação", () => {
    const texto = textoDeHtml(`
      <nav>Menu inteiro do portal</nav>
      <script>var x = 1;</script>
      <style>.a{color:red}</style>
      <p>Conteúdo que importa.</p>
    `);
    assert.equal(texto, "Conteúdo que importa.");
  });

  test("fim de bloco vira quebra de linha", () => {
    // É disso que depende o corte de template: sem a quebra, o nome do
    // arquivo (único) gruda no parágrafo repetido.
    const texto = textoDeHtml("<p>Arquivo de origem</p><p>ROTINA_X.pdf</p><p>Guarde o PDF.</p>");
    assert.deepEqual(texto.split("\n"), ["Arquivo de origem", "ROTINA_X.pdf", "Guarde o PDF."]);
  });

  test("traduz entidade e colapsa espaço dentro da linha", () => {
    assert.equal(textoDeHtml("<p>a&nbsp;&amp;   b</p>"), "a & b");
  });
});

describe("remoção de texto repetido", () => {
  test("tira o que se repete e mantém o que é próprio de cada documento", () => {
    const comum = "Passo a passo de triagem.\nConfirmar cliente e carteira.";
    const textos = Array.from({ length: 20 }, (_, i) => `Rotina ${i}.\n${comum}`);

    const limpos = removerRepetido(textos);

    for (const [i, limpo] of limpos.entries()) {
      assert.equal(limpo, `Rotina ${i}.`);
    }
  });

  test("não mexe em conjunto pequeno demais para ter estatística", () => {
    // Com 3 documentos, repetição pode ser coincidência — cortar ali
    // apagaria conteúdo verdadeiro.
    const textos = ["Mesma frase.", "Mesma frase.", "Mesma frase."];
    assert.deepEqual(removerRepetido(textos), textos);
  });

  test("frase repetida dentro do mesmo documento não conta duas vezes", () => {
    const textos = Array.from({ length: 20 }, (_, i) =>
      i === 0 ? "Repete aqui.\nRepete aqui.\nRepete aqui." : `Documento ${i}.`
    );
    assert.equal(removerRepetido(textos)[0], "Repete aqui.\nRepete aqui.\nRepete aqui.");
  });
});

describe("montagem do contexto", () => {
  test("sem trecho, não monta bloco", () => {
    const contexto = montarContexto([]);
    assert.equal(contexto.bloco, "");
    assert.deepEqual(contexto.fontes, []);
  });

  test("numera as fontes na ordem e cita o número no bloco", () => {
    const contexto = montarContexto([
      trecho({ id: "a", title: "Primeiro" }),
      trecho({ id: "b", title: "Segundo" })
    ]);
    assert.deepEqual(contexto.fontes.map((f) => f.numero), [1, 2]);
    assert.ok(contexto.bloco.includes("[1] Primeiro"));
    assert.ok(contexto.bloco.includes("[2] Segundo"));
  });

  test("respeita o orçamento de caracteres", () => {
    const gigante = "x".repeat(50_000);
    const contexto = montarContexto([
      trecho({ id: "a", content: gigante }),
      trecho({ id: "b", content: gigante }),
      trecho({ id: "c", content: gigante }),
      trecho({ id: "d", content: gigante })
    ]);
    assert.ok(
      contexto.caracteres <= LIMITE_CARACTERES_CONTEXTO * 1.1,
      `contexto estourou: ${contexto.caracteres}`
    );
    // O primeiro trecho entra sempre, mesmo sendo maior que o orçamento —
    // responder com um trecho é melhor do que responder sem nenhum.
    assert.ok(contexto.fontes.length >= 1);
    assert.ok(contexto.fontes.length < 4);
  });

  test("fonte sem acerto avisa o modelo de que está sem apoio", () => {
    const prompt = comContexto("Persona.", montarContexto([]));
    assert.ok(prompt.includes("Persona."));
    assert.match(prompt, /NÃO veio da documentação interna/i);
  });

  test("com acerto, manda citar a fonte e não inventar", () => {
    const prompt = comContexto("Persona.", montarContexto([trecho()]));
    assert.match(prompt, /entre colchetes/i);
    assert.match(prompt, /não preencha lacuna com suposição/i);
  });
});
