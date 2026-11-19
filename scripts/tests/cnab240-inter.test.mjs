/* CNAB 240 — Inter, pagamentos (layouts/inter-pagamentos.js), a partir do manual v1.10 (23/08/2024).
   Sem arquivo real: prova = cobertura das 240 posições, ida e volta por tipo de lote, um arquivo
   com dois tipos de lote lido pelo layout completo, e cada defeito pego na linha certa. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { inter240, variantePagamento } from "../../tools/cobranca/cnab240/layouts/inter-pagamentos.js";
import { analisar240 } from "../../tools/cobranca/cnab240/validacao240.js";
import { gerarArquivo240 } from "../../tools/cobranca/cnab240/gerar240.js";
import { gerarCpf } from "../../assets/js/fake-data-br.js";

const I = inter240;

test("cada registro cobre as posições 1–240 sem buraco nem sobreposição", () => {
  const confere = (nome, defs) => {
    const uso = Array(241).fill(0);
    defs.forEach((d) => { for (let p = d.ini; p <= d.fim; p++) uso[p] += 1; });
    const ruins = [];
    for (let p = 1; p <= 240; p++) if (uso[p] !== 1) ruins.push(`${p}:${uso[p]}`);
    assert.deepEqual(ruins, [], nome);
  };
  for (const dir of ["remessa", "retorno"]) {
    const L = I[dir];
    confere(`${dir} header de arquivo`, L.headerArquivo);
    confere(`${dir} trailer de arquivo`, L.trailerArquivo);
    confere(`${dir} header de lote`, L.headerLote);
    confere(`${dir} trailer de lote`, L.trailerLote);
    for (const [id, lote] of Object.entries(L.lotes)) for (const [k, defs] of Object.entries(lote.segmentos)) confere(`${dir} lote ${id}, segmento ${k}`, defs);
  }
});

const exemplo = (defs, chaves, i = 0) => Object.fromEntries((chaves || [])
  .map((k) => defs.find((d) => d.key === k)).filter((d) => d && (d.obrigatorio || d.exemploPreenche))
  .map((d) => {
    let v = d.exemploFn ? d.exemploFn(i) : d.exemplo;
    if (d.fmt === "valor") v = Number(String(v ?? "150").replace(/\./g, "").replace(",", ".")) || 150;
    return [d.key, v];
  }));

const DOC = "11222333000181";
function arquivo(idLote, { titulos = 2, sobrepor = {}, nLote = "1" } = {}) {
  const V = variantePagamento(I, "remessa", idLote);
  const L = V.remessa;
  const base = (defs, chaves, i) => exemplo(defs, chaves, i);
  const lista = Array.from({ length: titulos }, (_, i) => {
    const t = {};
    for (const [seg, chaves] of Object.entries(L.formulario.titulo)) {
      t[seg] = { ...base(L.segmentos[seg], chaves, i), dataPagamento: "2026-12-10", dataVencimento: "2026-12-05", valorPagamento: 100 + i, ...(sobrepor[seg] || {}) };
    }
    if (t.B_TED) t.B_TED.favDoc = gerarCpf();
    if (t.B_PIX) { t.B_PIX.favDoc = gerarCpf(); }
    if (t.A_TED) t.A_TED.favNome = "MARIA APARECIDA DA SILVA";
    if (t.A_PIX) t.A_PIX.favNome = "MARIA APARECIDA DA SILVA";
    return t;
  });
  const linhas = gerarArquivo240(V, "remessa", {
    arquivo: { ...base(L.headerArquivo, L.formulario.arquivo), numInscricao: DOC },
    lote: { ...base(L.headerLote, L.formulario.lote), numInscricao: DOC, lote: nLote, ...(sobrepor.lote || {}) },
    titulos: lista,
  });
  return { V, linhas };
}
const ler = (linhas, layout = I, direcao = "remessa") => analisar240(linhas.join("\r\n"), { layout, direcao });
const achou = (r, nivel, linha, trecho) => r.problemas.some((p) => p.nivel === nivel && p.linha === linha && p.mensagem.includes(trecho));
const trocar = (l, ini, fim, t) => l.slice(0, ini - 1) + t.padEnd(fim - ini + 1, " ").slice(0, fim - ini + 1) + l.slice(fim);

for (const id of ["ted", "pix", "cobranca", "qr", "tributos"]) {
  test(`lote "${id}": gerado, 240 posições e lido sem nenhum aviso pelo layout completo`, () => {
    const { linhas } = arquivo(id);
    linhas.forEach((l, i) => assert.equal(l.length, 240, `linha ${i + 1}`));
    const r = ler(linhas);
    assert.deepEqual(r.problemas, [], r.problemas.map((p) => p.mensagem).join(" | "));
    assert.equal(r.lotes.length, 1);
  });
}

test("posições do manual: header de arquivo, header de lote, segmento A (TED) e trailers", () => {
  const { linhas: ls } = arquivo("ted", { titulos: 1 });
  const [ha, hl, a, b, tl, ta] = ls;
  assert.equal(ha.slice(0, 8), "07700000");
  assert.equal(ha.slice(17, 18), "2", "tipo de documento da empresa em 18");
  assert.equal(ha.slice(52, 58), "000019".slice(0, 5) + "9", "agência 00001 e DV 9 em 53–58");
  assert.equal(ha.slice(102, 113), "BANCO INTER", "nome do banco em 103");
  assert.equal(ha.slice(142, 143), "1", "código de remessa em 143");
  assert.equal(ha.slice(163, 171), "10701600", "versão 107 em 164–166 e densidade 01600 em 167–171");
  assert.equal(hl.slice(7, 9), "1C", "tipo 1 e operação C");
  assert.equal(hl.slice(11, 13), "03", "forma de lançamento TED em 12–13");
  assert.equal(hl.slice(13, 16), "046", "versão do lote em 14–16");
  assert.equal(a.slice(0, 14), "07700013" + "00001A", "banco, lote 0001, tipo 3, seq 1, segmento A");
  assert.equal(a.slice(101, 104), "BRL", "moeda em 102–104");
  assert.equal(a.slice(119 - 15, 119), "000000000000000", "quantidade da moeda zerada em 105–119");
  assert.equal(a.slice(119, 134), "000000000010000", "valor do pagamento em 120–134");
  assert.equal(a.slice(219, 224), "00005", "finalidade da TED em 220–224");
  assert.equal(b.slice(13, 14), "B");
  assert.equal(tl.slice(17, 23), "000004", "4 registros (header + A + B + trailer)");
  assert.equal(tl.slice(23, 41), "000000000000010000", "somatória dos valores em 24–41");
  assert.equal(ta.slice(0, 8), "07799999");
  assert.equal(ta.slice(17, 29), "000001000006", "1 lote e 6 registros");
});

function dois() {
  const ted = arquivo("ted", { titulos: 1 }).linhas;
  const pix = arquivo("pix", { titulos: 1, nLote: "2" }).linhas;
  const lotes = [ted.slice(1, -1), pix.slice(1, -1)].flat();
  const ls = [ted[0], ...lotes];
  const total = ls.length + 1;
  ls.push(trocar(trocar(ted[ted.length - 1], 18, 23, "000002"), 24, 29, String(total).padStart(6, "0")));
  return ls;
}

test("arquivo com dois tipos de lote (TED e Pix) é lido pelo layout completo", () => {
  const r = ler(dois());
  assert.deepEqual(r.problemas, [], r.problemas.map((p) => p.mensagem).join(" | "));
  assert.equal(r.lotes.length, 2);
  assert.deepEqual(r.lotes[0].segmentos, { A: 1, B: 1 });
});

const DEFEITOS = [
  ["letra no valor do pagamento (A)", "erro", (ls) => { ls[2] = trocar(ls[2], 120, 134, "ABC"); return [3, "dígito"]; }],
  ["data de pagamento impossível", "erro", (ls) => { ls[2] = trocar(ls[2], 94, 101, "31022026"); return [3, "data impossível"]; }],
  ["moeda diferente de BRL", "erro", (ls) => { ls[2] = trocar(ls[2], 102, 104, "USD"); return [3, "o layout fixa"]; }],
  ["finalidade da TED fora de 00004/00005/00010", "erro", (ls) => { ls[2] = trocar(ls[2], 220, 224, "00099"); return [3, "aceita só"]; }],
  ["tipo de conta fora de 01/02/03", "erro", (ls) => { ls[2] = trocar(ls[2], 200, 201, "09"); return [3, "aceita só"]; }],
  ["forma de lançamento desconhecida", "erro", (ls) => { ls[1] = trocar(ls[1], 12, 13, "99"); return [2, "aceita só"]; }],
  ["versão do layout do arquivo errada", "erro", (ls) => { ls[0] = trocar(ls[0], 164, 166, "106"); return [1, "o layout fixa"]; }],
  ["tipo de documento da empresa diferente de 2", "erro", (ls) => { ls[0] = trocar(ls[0], 18, 18, "1"); return [1, "o layout fixa"]; }],
  ["quantidade de registros do lote errada", "erro", (ls) => { ls[4] = trocar(ls[4], 18, 23, "000009"); return [5, "declara 9 registros"]; }],
  ["quantidade de registros do arquivo errada", "erro", (ls) => { ls[5] = trocar(ls[5], 24, 29, "000099"); return [6, "declara 99 registro(s)"]; }],
  ["A sem o B que o manual manda", "erro", (ls) => { ls.splice(3, 1); return [3, "não é seguido do segmento B"]; }],
  ["somatória dos valores do trailer não bate", "aviso", (ls) => { ls[4] = trocar(ls[4], 24, 41, "000000000000099999"); return [5, "somatória dos valores"]; }],
  ["acento no nome do favorecido", "aviso", (ls) => { ls[2] = trocar(ls[2], 44, 73, "JOÃO DA SILVA"); return [3, "acento"]; }],
  ["código de ocorrência fora da nota 05 (retorno)", "aviso", (ls) => { ls[2] = trocar(ls[2], 231, 240, "00ZZ"); return [3, "tabela de ocorrências"]; }],
  ["segmento C (sem layout no manual)", "aviso", (ls) => { ls[3] = trocar(ls[3], 14, 14, "C"); return [4, 'segmento "C"']; }],
  ["CPF do favorecido com dígito verificador errado", "aviso", (ls) => { ls[3] = trocar(ls[3], 19, 32, "00012345678900"); return [4, "dígito verificador"]; }],
];
for (const [descricao, nivel, aplicar] of DEFEITOS) {
  test(`defeito pego na linha certa — ${descricao}`, () => {
    const ls = arquivo("ted", { titulos: 1 }).linhas;
    const [linha, trecho] = aplicar(ls);
    const r = ler(ls);
    assert.ok(achou(r, nivel, linha, trecho), `esperava ${nivel} na linha ${linha} com "${trecho}"; veio ${JSON.stringify(r.problemas.map((p) => [p.nivel, p.linha, p.mensagem.slice(0, 80)]))}`);
  });
}

test("Pix: a forma de iniciação decide se a chave, o CPF/CNPJ ou o ISPB são obrigatórios", () => {
  const { linhas } = arquivo("pix", { titulos: 1 });
  const b = 3; // índice do segmento B
  const comForma = (forma, extra = {}) => {
    const ls = [...linhas];
    ls[b] = trocar(ls[b], 15, 17, forma);
    for (const [[ini, fim], t] of Object.entries(extra).map(([k, v]) => [k.split("-").map(Number), v])) ls[b] = trocar(ls[b], ini, fim, t);
    return ler(ls);
  };
  assert.ok(achou(comForma("01", { "128-226": "" }), "erro", 4, "chave Pix é obrigatória"));
  assert.ok(achou(comForma("03", { "128-226": "", "19-32": "" }), "erro", 4, "CPF/CNPJ do favorecido é obrigatório"));
  assert.ok(achou(comForma("05", { "128-226": "", "233-240": "" }), "erro", 4, "ISPB do favorecido é obrigatório"));
  assert.ok(achou(comForma("03", { "128-226": "x@y.com", "19-32": "00052998224725" }), "aviso", 4, "deixar a chave Pix em branco"));
});

test("QR Code Pix: J-52 Pix (URL em 132–210) é reconhecido e conferido", () => {
  const { linhas } = arquivo("qr", { titulos: 1 });
  assert.equal(linhas.length, 7, "header de arquivo, header de lote, J, J-52, J-52 Pix, trailer de lote e trailer de arquivo");
  assert.equal(linhas[4].slice(131, 135), "PIX.", "a URL/chave vai em 132–210 (campo alfa: caixa alta)");
  const r = ler(linhas);
  assert.deepEqual(r.lotes[0].segmentos, { J: 3 }, "o resumo conta pela letra da posição 14");
  const ruim = [...linhas];
  ruim[4] = trocar(ruim[4], 76, 76, "7");
  assert.ok(achou(ler(ruim), "erro", 5, "aceita só"));
});

test("retorno: mesma estrutura; o código de remessa do header não é conferido", () => {
  const { linhas } = arquivo("ted", { titulos: 1 });
  const ret = [...linhas];
  ret[0] = trocar(ret[0], 143, 143, "2");
  assert.deepEqual(ler(ret, I, "retorno").problemas, []);
  assert.ok(achou(ler(ret, I, "remessa"), "erro", 1, "o layout fixa"), "na remessa, só o 1 vale");
});
