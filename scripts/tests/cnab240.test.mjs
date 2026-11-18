/* CNAB 240 — validação estrutural (tools/cobranca/cnab240/validacao240.js).
   As linhas são montadas aqui só com as posições que o módulo confere; o
   resto é branco. Nenhum dado de banco, empresa ou pessoa. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { analisar240 } from "../../tools/cobranca/cnab240/validacao240.js";

const num = (v, t) => String(v).padStart(t, "0");
function linha({ banco = "001", lote = "0001", tipo, seq, segmento, qtd, qtdLotes, qtdRegistros }) {
  const l = Array(240).fill(" ");
  const poe = (ini, texto) => [...texto].forEach((c, i) => { l[ini - 1 + i] = c; });
  poe(1, banco); poe(4, lote); poe(8, String(tipo));
  if (tipo === 3) { poe(9, num(seq, 5)); poe(14, segmento); }
  if (tipo === 5) poe(18, num(qtd, 6));
  if (tipo === 9) { poe(18, num(qtdLotes, 6)); poe(24, num(qtdRegistros, 6)); }
  return l.join("");
}

/* 1 lote com 2 títulos (segmentos P e Q cada) = 0 + 1 + 4 + 5 + 9 = 8 linhas. */
function arquivoValido() {
  return [
    linha({ lote: "0000", tipo: 0 }),
    linha({ tipo: 1 }),
    linha({ tipo: 3, seq: 1, segmento: "P" }),
    linha({ tipo: 3, seq: 2, segmento: "Q" }),
    linha({ tipo: 3, seq: 3, segmento: "P" }),
    linha({ tipo: 3, seq: 4, segmento: "Q" }),
    linha({ tipo: 5, qtd: 6 }),
    linha({ lote: "9999", tipo: 9, qtdLotes: 1, qtdRegistros: 8 }),
  ];
}
const analisar = (ls) => analisar240(ls.join("\r\n"));
const achou = (r, nivel, linhaN, trecho) =>
  r.problemas.some((p) => p.nivel === nivel && p.linha === linhaN && p.mensagem.includes(trecho));

test("arquivo bem formado: nenhum problema, e o resumo bate", () => {
  const r = analisar(arquivoValido());
  assert.deepEqual(r.problemas, []);
  assert.equal(r.banco, "001");
  assert.equal(r.totalLinhas, 8);
  assert.equal(r.lotes.length, 1);
  assert.equal(r.lotes[0].detalhes, 4);
  assert.deepEqual(r.lotes[0].segmentos, { P: 2, Q: 2 });
});

test("aceita o SUB (0x1A) no fim e quebras de linha misturadas", () => {
  const texto = arquivoValido().join("\n") + "\r\n" + String.fromCharCode(0x1a);
  assert.deepEqual(analisar240(texto).problemas, []);
});

test("linha com tamanho diferente de 240 é erro e não gera enxurrada de mensagens", () => {
  const ls = arquivoValido();
  ls[3] = ls[3].slice(0, 200);
  const r = analisar(ls);
  assert.ok(achou(r, "erro", 4, "200 caracteres"));
  assert.equal(r.erros.filter((p) => p.linha === 4).length, 1);
});

test("banco e lote não numéricos são erro", () => {
  const ls = arquivoValido();
  ls[2] = "A01" + ls[2].slice(3);
  ls[3] = ls[3].slice(0, 3) + "00X1" + ls[3].slice(7);
  const r = analisar(ls);
  assert.ok(achou(r, "erro", 3, "código do banco"));
  assert.ok(achou(r, "erro", 4, "lote de serviço"));
});

test("header de arquivo precisa ser a 1ª linha e ter lote 0000", () => {
  const semHeader = arquivoValido().slice(1);
  assert.ok(achou(analisar(semHeader), "erro", 1, "não começa com Header de arquivo"));

  const ls = arquivoValido();
  ls[0] = linha({ lote: "0001", tipo: 0 });
  assert.ok(achou(analisar(ls), "erro", 1, 'lote "0000"'));
});

test("arquivo sem trailer de arquivo (truncado) é erro", () => {
  const r = analisar(arquivoValido().slice(0, 7));
  assert.ok(r.erros.some((p) => /não tem Trailer de arquivo/.test(p.mensagem)));
});

test("trailer de arquivo que não fecha: lotes e registros", () => {
  const ls = arquivoValido();
  ls[7] = linha({ lote: "9999", tipo: 9, qtdLotes: 2, qtdRegistros: 9 });
  const r = analisar(ls);
  assert.ok(achou(r, "erro", 8, "declara 2 lote(s) e o arquivo tem 1"));
  assert.ok(achou(r, "erro", 8, "declara 9 registro(s) e o arquivo tem 8"));
});

test("detalhe e trailer de lote sem header de lote", () => {
  const ls = arquivoValido();
  ls.splice(1, 1); // tira o header do lote
  const r = analisar(ls);
  assert.ok(achou(r, "erro", 2, "fora de um lote"));
  assert.ok(achou(r, "erro", 5, "fora de um lote"), "o trailer de lote também fica sem header");
});

test("lote aberto até o fim do arquivo é erro", () => {
  const ls = arquivoValido();
  ls.splice(6, 1); // tira o trailer do lote
  const r = analisar(ls);
  assert.ok(r.erros.some((p) => /não tem Trailer de lote/.test(p.mensagem)));
});

test("detalhe com número de lote diferente do lote em que está", () => {
  const ls = arquivoValido();
  ls[3] = linha({ lote: "0002", tipo: 3, seq: 2, segmento: "Q" });
  assert.ok(achou(analisar(ls), "erro", 4, 'desta linha é "0002"'));
});

test("sequencial fora de ordem e segmento que não é letra são avisos", () => {
  const ls = arquivoValido();
  ls[3] = linha({ tipo: 3, seq: 7, segmento: "Q" });
  ls[4] = linha({ tipo: 3, seq: 8, segmento: "1" });
  const r = analisar(ls);
  assert.ok(achou(r, "aviso", 4, "esperado é 2"));
  assert.ok(achou(r, "aviso", 5, "deveria ser uma letra"));
  assert.equal(r.erros.length, 0);
});

test("trailer de lote que não fecha é aviso, não erro", () => {
  const ls = arquivoValido();
  ls[6] = linha({ tipo: 5, qtd: 5 });
  const r = analisar(ls);
  assert.ok(achou(r, "aviso", 7, "declara 5 registros e o lote tem 6"));
  assert.equal(r.erros.length, 0);
});

test("tipo de registro fora dos cinco conhecidos é aviso", () => {
  const ls = arquivoValido();
  ls.splice(6, 0, linha({ tipo: 4 }));
  const r = analisar(ls);
  assert.ok(achou(r, "aviso", 7, 'tipo de registro "4"'));
});

test("dois lotes: contagem do arquivo e número repetido de lote", () => {
  const lote = (n) => [
    linha({ lote: n, tipo: 1 }),
    linha({ lote: n, tipo: 3, seq: 1, segmento: "P" }),
    linha({ lote: n, tipo: 5, qtd: 3 }),
  ];
  const ok = [linha({ lote: "0000", tipo: 0 }), ...lote("0001"), ...lote("0002"),
    linha({ lote: "9999", tipo: 9, qtdLotes: 2, qtdRegistros: 8 })];
  assert.deepEqual(analisar(ok).problemas, []);

  const repetido = [linha({ lote: "0000", tipo: 0 }), ...lote("0001"), ...lote("0001"),
    linha({ lote: "9999", tipo: 9, qtdLotes: 2, qtdRegistros: 8 })];
  assert.ok(analisar(repetido).avisos.some((p) => /repete o número/.test(p.mensagem)));
});

test("mais de um código de banco no mesmo arquivo é aviso", () => {
  const ls = arquivoValido();
  ls[3] = linha({ banco: "237", tipo: 3, seq: 2, segmento: "Q" });
  assert.ok(analisar(ls).avisos.some((p) => /mais de um código de banco/.test(p.mensagem)));
});

test("arquivo vazio lança erro claro", () => {
  assert.throws(() => analisar240(""), /vazio/i);
});
