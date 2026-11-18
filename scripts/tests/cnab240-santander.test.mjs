/* CNAB 240 — Santander cobrança (layouts/santander.js), a partir do manual H7815 v8.1 (jun/2024).
   Não há arquivo real: o que se prova aqui é (1) o layout cobre as 240 posições de
   cada registro sem buraco nem sobreposição, (2) os exemplos do manual (DV do nosso
   número), (3) ida e volta — o que o gerador monta, o validador aceita sem aviso — e
   (4) cada defeito plantado é pego na linha certa. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fld, parseDataDMA, formatDataDMA } from "../../tools/cobranca/cnab400/engine.js";
import { santander240, nossoNumeroComDv } from "../../tools/cobranca/cnab240/layouts/santander.js";
import { dvNossoNumeroSantander } from "../../tools/cobranca/cnab240/layouts/santander-regras.js";
import { analisar240, chaveDoSegmento } from "../../tools/cobranca/cnab240/validacao240.js";
import { gerarArquivo240 } from "../../tools/cobranca/cnab240/gerar240.js";
import { gerarCpf } from "../../assets/js/fake-data-br.js";

const S = santander240;

test("cada registro do layout cobre as posições 1–240 sem buraco nem sobreposição", () => {
  const confere = (nome, defs) => {
    const uso = Array(241).fill(0);
    defs.forEach((d) => { for (let p = d.ini; p <= d.fim; p++) uso[p] += 1; });
    const ruins = [];
    for (let p = 1; p <= 240; p++) if (uso[p] !== 1) ruins.push(`${p}:${uso[p]}`);
    assert.deepEqual(ruins, [], nome);
  };
  for (const dir of ["remessa", "retorno"]) {
    const L = S[dir];
    confere(`${dir} header de arquivo`, L.headerArquivo);
    confere(`${dir} header de lote`, L.headerLote);
    confere(`${dir} trailer de lote`, L.trailerLote);
    confere(`${dir} trailer de arquivo`, L.trailerArquivo);
    for (const [k, defs] of Object.entries(L.segmentos)) confere(`${dir} segmento ${k}`, defs);
  }
});

test("DV do nosso número: os dois exemplos do manual (nota 15)", () => {
  assert.equal(dvNossoNumeroSantander("3147578"), 7);
  assert.equal(dvNossoNumeroSantander("4870184"), 0);
  assert.equal(nossoNumeroComDv(3147578), "0000031475787");
});

test("data DDMMAAAA: ida e volta", () => {
  assert.equal(formatDataDMA("2026-12-10"), "10122026");
  assert.equal(formatDataDMA("10/12/2026"), "10122026");
  assert.equal(parseDataDMA("10122026"), "10/12/2026");
  assert.equal(parseDataDMA("00000000"), "");
});

/* ----- um arquivo de remessa "como a tela gera" ----- */
const exemplo = (defs, chaves, i = 0) => Object.fromEntries(chaves
  .map((k) => defs.find((d) => d.key === k))
  .filter((d) => d && d.obrigatorio)
  .map((d) => {
    let v = d.exemploFn ? d.exemploFn(i) : d.exemplo;
    if (d.fmt === "valor") v = Number(String(v ?? "0").replace(/\./g, "").replace(",", ".")) || 0;
    return [d.key, v];
  }));

function remessa(sobrepor = {}, nTitulos = 2) {
  const R = S.remessa;
  const arquivo = { ...exemplo(R.headerArquivo, R.formulario.arquivo), numInscricao: "11222333000181" };
  const lote = { ...exemplo(R.headerLote, R.formulario.lote), numInscricao: "11222333000181" };
  const titulos = Array.from({ length: nTitulos }, (_, i) => ({
    P: { ...exemplo(R.segmentos.P, R.formulario.titulo.P, i), ...(sobrepor.P || {}) },
    Q: { ...exemplo(R.segmentos.Q, R.formulario.titulo.Q, i), tipoInscPagador: "1", numInscPagador: gerarCpf(), nomePagador: "MARIA APARECIDA DA SILVA", ...(sobrepor.Q || {}) },
  }));
  return gerarArquivo240(S, "remessa", { arquivo: { ...arquivo, ...(sobrepor.arquivo || {}) }, lote: { ...lote, ...(sobrepor.lote || {}) }, titulos });
}
const ler = (linhas, direcao = "remessa") => analisar240(linhas.join("\r\n"), { layout: S, direcao });
const achou = (r, nivel, linha, trecho) => r.problemas.some((p) => p.nivel === nivel && p.linha === linha && p.mensagem.includes(trecho));

test("remessa gerada: 240 posições, nas posições do manual, e sem nenhum aviso na leitura", () => {
  const ls = remessa();
  assert.equal(ls.length, 2 + 4 + 2, "header arquivo + header lote + (P+Q)×2 + trailer lote + trailer arquivo");
  ls.forEach((l, i) => assert.equal(l.length, 240, `linha ${i + 1}`));
  const [ha, hl, p1, q1, , , tl, ta] = ls;
  assert.equal(ha.slice(0, 8), "03300000", "banco 033, lote 0000, tipo 0");
  assert.equal(ha.slice(102, 117).trim(), "BANCO SANTANDER".slice(0, 15), "nome do banco em 103");
  assert.equal(ha.slice(142, 143), "1", "código remessa em 143");
  assert.equal(ha.slice(163, 166), "040", "versão do layout em 164–166");
  assert.equal(hl.slice(7, 9), "1R", "tipo 1 e operação R");
  assert.equal(hl.slice(13, 16), "030", "versão do lote em 14–16");
  assert.equal(p1.slice(0, 14), "03300013" + "00001P", "banco, lote 0001, tipo 3, seq 1, segmento P");
  assert.equal(p1.slice(44, 57), "0000031475787", "nosso número em 45–57");
  assert.equal(p1.slice(85, 100), "000000000015000", "valor nominal em 86–100");
  assert.equal(q1.slice(0, 14), "03300013" + "00002Q", "segundo registro do lote é o Q");
  assert.equal(tl.slice(0, 8), "03300015", "trailer de lote");
  assert.equal(tl.slice(17, 23), "000006", "6 registros no lote (header + 4 detalhes + trailer)");
  assert.equal(ta.slice(0, 8), "03399999", "trailer de arquivo, lote 9999, tipo 9");
  assert.equal(ta.slice(17, 23), "000001", "1 lote");
  assert.equal(ta.slice(23, 29), "000008", "8 registros no arquivo");
  const r = ler(ls);
  assert.deepEqual(r.problemas, [], r.problemas.map((p) => p.mensagem).join(" | "));
  assert.equal(r.lotes.length, 1);
  assert.deepEqual(r.lotes[0].segmentos, { P: 2, Q: 2 });
});

test("chaveDoSegmento escolhe a lista pelo segmento e pelo discriminador (S, Y)", () => {
  const linha = (seg, extra = {}) => {
    const l = Array(240).fill(" ");
    l[13] = seg;
    Object.entries(extra).forEach(([pos, t]) => { l[pos - 1] = t; });
    return l.join("");
  };
  assert.equal(chaveDoSegmento(linha("P")), "P");
  assert.equal(chaveDoSegmento(linha("S", { 18: "1" })), "S1");
  assert.equal(chaveDoSegmento(linha("S", { 18: "2" })), "S2");
  const y = (id) => { const l = linha("Y").split(""); l[17] = id[0]; l[18] = id[1]; return l.join(""); };
  assert.equal(chaveDoSegmento(y("03")), "Y03");
  assert.equal(chaveDoSegmento(y("53")), "Y53");
});

const trocar = (linha, ini, fim, texto) => linha.slice(0, ini - 1) + texto.padEnd(fim - ini + 1, " ").slice(0, fim - ini + 1) + linha.slice(fim);

const DEFEITOS = [
  ["letra em campo numérico (valor nominal)", "erro", (ls) => { ls[2] = trocar(ls[2], 86, 100, "ABC"); return [3, "dígito"]; }],
  ["data de vencimento impossível", "erro", (ls) => { ls[2] = trocar(ls[2], 78, 85, "32132026"); return [3, "data impossível"]; }],
  ["vencimento 99999999 (rejeitado pelo banco)", "erro", (ls) => { ls[2] = trocar(ls[2], 78, 85, "99999999"); return [3, "rejeitado pelo banco"]; }],
  ["vencimento anterior à emissão", "erro", (ls) => { ls[2] = trocar(ls[2], 78, 85, "01012020"); return [3, "anterior à data de emissão"]; }],
  ["campo fixo errado (versão do layout)", "erro", (ls) => { ls[0] = trocar(ls[0], 164, 166, "030"); return [1, "o layout fixa"]; }],
  ["lote do trailer de arquivo diferente de 9999", "erro", (ls) => { ls[7] = trocar(ls[7], 4, 7, "0001"); return [8, "o layout fixa"]; }],
  ["quantidade de registros do lote errada (nota 37)", "erro", (ls) => { ls[6] = trocar(ls[6], 18, 23, "000009"); return [7, "rejeita o lote inteiro"]; }],
  ["quantidade de lotes do arquivo errada", "erro", (ls) => { ls[7] = trocar(ls[7], 18, 23, "000002"); return [8, "declara 2 lote(s)"]; }],
  ["quantidade de registros do arquivo errada", "erro", (ls) => { ls[7] = trocar(ls[7], 24, 29, "000099"); return [8, "declara 99 registro(s)"]; }],
  ["CPF do pagador com dígito verificador errado", "erro", (ls) => { ls[3] = trocar(ls[3], 19, 33, "000000012345678"); return [4, "dígito verificador"]; }],
  ["UF do pagador inexistente", "erro", (ls) => { ls[3] = trocar(ls[3], 152, 153, "XX"); return [4, "existente e válida"]; }],
  ["endereço do pagador em branco", "erro", (ls) => { ls[3] = trocar(ls[3], 74, 113, ""); return [4, "endereço do pagador é obrigatório"]; }],
  ["tipo de cobrança fora da tabela", "erro", (ls) => { ls[2] = trocar(ls[2], 58, 58, "Z"); return [3, "aceita só"]; }],
  ["espécie fora da tabela", "erro", (ls) => { ls[2] = trocar(ls[2], 107, 108, "99"); return [3, "aceita só"]; }],
  ["código de movimento desconhecido", "aviso", (ls) => { ls[2] = trocar(ls[2], 16, 17, "77"); return [3, "não consta na tabela"]; }],
  ["DV do nosso número errado (só recomendado)", "aviso", (ls) => { ls[2] = trocar(ls[2], 45, 57, "0000031475788"); return [3, "módulo 11"]; }],
  ["segmento Q ausente após P (movimento 01)", "aviso", (ls) => { ls.splice(3, 1); return [3, "não é seguido do segmento Q"]; }],
  ["acento no nome do pagador", "aviso", (ls) => { ls[3] = trocar(ls[3], 34, 73, "JOÃO DA SILVA"); return [4, "acento"]; }],
  ["sequencial do detalhe fora de ordem", "aviso", (ls) => { ls[3] = trocar(ls[3], 9, 13, "00007"); return [4, "esperado é 2"]; }],
  ["número do lote fora de ordem", "aviso", (ls) => { for (const i of [1, 2, 3, 4, 5, 6]) ls[i] = trocar(ls[i], 4, 7, "0005"); return [2, "esperado é 1"]; }],
];

for (const [descricao, nivel, aplicar] of DEFEITOS) {
  test(`defeito pego na linha certa — ${descricao}`, () => {
    const ls = remessa({}, 2);
    const [linha, trecho] = aplicar(ls);
    const r = ler(ls);
    assert.ok(achou(r, nivel, linha, trecho), `esperava ${nivel} na linha ${linha} com "${trecho}"; veio ${JSON.stringify(r.problemas.map((p) => [p.nivel, p.linha, p.mensagem.slice(0, 90)]))}`);
  });
}

test("juros, desconto e valor zerado: o código manda o que é obrigatório (notas 18, 21, 23)", () => {
  assert.ok(achou(ler(remessa({ P: { codJuros: "1" } })), "erro", 3, "valor por dia"), "mora 1 sem valor");
  assert.ok(achou(ler(remessa({ P: { codDesconto: "1", valorDesconto: 10 } })), "erro", 3, "data do desconto é obrigatória"));
  assert.ok(achou(ler(remessa({ P: { codDesconto: "1", dataDesconto: "2026-12-05", valorDesconto: 200 } })), "erro", 3, "menor que o valor nominal"));
  assert.ok(achou(ler(remessa({ P: { valorNominal: 0 } })), "erro", 3, "só é permitido nas espécies 31"));
  assert.deepEqual(ler(remessa({ P: { codDesconto: "1", dataDesconto: "2026-12-05", valorDesconto: 10 } })).problemas, []);
});

test("pagador com o mesmo documento do beneficiário é rejeitado (nota 29)", () => {
  const r = ler(remessa({ Q: { tipoInscPagador: "2", numInscPagador: "11222333000181" } }));
  assert.ok(achou(r, "erro", 4, "igual ao do beneficiário"));
});

test("retorno: gera T e U, lê de volta; T sem U é erro", () => {
  const T = S.retorno;
  const arquivo = { ...exemplo(T.headerArquivo, T.formulario.arquivo), numInscricao: "11222333000181" };
  const lote = { ...exemplo(T.headerLote, T.formulario.lote), numInscricao: "11222333000181" };
  const titulo = { T: { ...exemplo(T.segmentos.T, T.formulario.titulo.T), codMovimento: "06", tipoInscPagador: "1", numInscPagador: gerarCpf(), nomePagador: "MARIA APARECIDA DA SILVA" },
    U: { ...exemplo(T.segmentos.U, T.formulario.titulo.U), codMovimento: "06" } };
  const ls = gerarArquivo240(S, "retorno", { arquivo, lote, titulos: [titulo] });
  ls.forEach((l) => assert.equal(l.length, 240));
  assert.equal(ls[2].slice(13, 14), "T");
  assert.equal(ls[2].slice(15, 17), "06", "movimento em 16–17");
  assert.equal(ls[2].slice(40, 53), "0000031475787", "nosso número em 41–53");
  assert.equal(ls[3].slice(13, 14), "U");
  assert.equal(ls[3].slice(77, 92), "000000000015000", "valor pago em 78–92");
  const r = ler(ls, "retorno");
  assert.deepEqual(r.erros, [], r.erros.map((p) => p.mensagem).join(" | "));
  assert.equal(r.avisos.length, 0, r.avisos.map((p) => p.mensagem).join(" | "));

  const semU = [...ls];
  semU.splice(3, 1);
  const r2 = ler(semU, "retorno");
  assert.ok(r2.erros.some((p) => /não é seguido do segmento U/.test(p.mensagem)));
});

test("segmentos opcionais da remessa (R, S, Y03, Y53) são lidos e conferidos", () => {
  const R = S.remessa;
  const base = remessa({}, 1);
  const seg = (chave, valores, seq) => gerarArquivo240(S, "remessa", { arquivo: {}, lote: {}, titulos: [{ [chave]: { codMovimento: "01", ...valores } }] })[2]
    .replace(/^(.{8})\d{5}/, `$1${String(seq).padStart(5, "0")}`);
  const r = seg("R", { codMulta: "2", dataMulta: "2026-12-11", valorMulta: 2 }, 3);
  const y03 = seg("Y03", { tipoChavePix: "4", chavePix: "pix@exemplo.com.br", txid: "TXID0000000000000000000000001" }, 4);
  const ls = [...base.slice(0, 4), r, y03, ...base.slice(4)];
  // recalcula trailers para o arquivo fechar
  ls[ls.length - 2] = trocar(ls[ls.length - 2], 18, 23, String(ls.length - 2).padStart(6, "0"));
  ls[ls.length - 1] = trocar(ls[ls.length - 1], 24, 29, String(ls.length).padStart(6, "0"));
  const ok = ler(ls);
  assert.deepEqual(ok.erros, [], ok.erros.map((p) => p.mensagem).join(" | "));
  const ruim = [...ls];
  ruim[4] = trocar(ruim[4], 66, 66, "7");
  assert.ok(achou(ler(ruim), "erro", 5, "aceita só"));
  assert.equal(R.segmentos.R.find((d) => d.key === "codMulta").opcoes.length, 2);
});
