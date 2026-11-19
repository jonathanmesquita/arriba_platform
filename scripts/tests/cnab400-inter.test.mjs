/* CNAB 400 do Inter (banks/inter.js), a partir do manual v2.2 de 26/08/2024.
   Não há arquivo real deste banco: o que se prova aqui é o exemplo do próprio
   manual (DV do nosso número), a ida e volta (gerar → ler) e as regras que o
   manual declara (carteira, valor mínimo, multa/juros, tipos de registro). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fld, gerarArquivo, parseArquivo } from "../../tools/cobranca/cnab400/engine.js";
import { inter, dvNossoNumeroInter, nossoNumeroComDv } from "../../tools/cobranca/cnab400/banks/inter.js";
import { validarLinhas } from "../../tools/cobranca/cnab400/validacao.js";

const R = inter.remessa;
const campo = (chave, cfg = R) => cfg.detalheFields.find((d) => d.key === chave);
const trocar = (linha, def, texto) => {
  const tam = def.fim - def.ini + 1;
  return linha.slice(0, def.ini - 1) + texto.padEnd(tam, " ").slice(0, tam) + linha.slice(def.fim);
};
const base = (extra = {}) => ({
  carteira: "110", conta: "123456789", dvConta: "0", nossoNumero: nossoNumeroComDv(4309540),
  ocorrencia: "01", numDocumento: "DOC0000001", dataVencimento: "2026-12-10", valorTitulo: 150,
  diasLimitePagamento: "30", codInscPagador: "01", numInscPagador: "31076450288",
  nomePagador: "MARIA APARECIDA DA SILVA", enderecoPagador: "RUA DAS FLORES 100", ufPagador: "SP",
  cepPagador: "12345678", ...extra,
});
const arquivo = (detalhe = base()) => gerarArquivo(R, {
  header: { nomeEmpresa: "EMPRESA EXEMPLO LTDA", dataGravacao: "2026-11-18", seqRemessa: "1" }, detalhes: [detalhe],
});
const problemas = (ls) => validarLinhas(ls, R, { direcao: "remessa" });
const achou = (ls, nivel, trecho) => problemas(ls).some((p) => p.nivel === nivel && p.mensagem.includes(trecho));

test("DV do nosso número: o exemplo do manual (0001 + 110 + 0004309540 → 1)", () => {
  assert.equal(dvNossoNumeroInter("0001", "110", "0004309540"), 1);
  assert.equal(nossoNumeroComDv(4309540), "00043095401");
});

test("DV: resto zero dá DV zero, e o DV nunca passa de 9", () => {
  const vistos = new Set();
  for (let n = 1; n < 400; n++) vistos.add(dvNossoNumeroInter("0001", "110", String(n).padStart(10, "0")));
  assert.ok(vistos.has(0), "algum nosso número tem resto 0");
  assert.ok([...vistos].every((d) => d >= 0 && d <= 9));
});

test("remessa: linhas de 400 posições, campos nas posições do manual", () => {
  const ls = arquivo();
  assert.equal(ls.length, 3);
  ls.forEach((l, i) => assert.equal(l.length, 400, `linha ${i + 1}`));
  const [h, d, t] = ls;
  assert.equal(h.slice(0, 26), "01REMESSA01COBRANCA".padEnd(26, " "));
  assert.equal(h.slice(76, 79), "077");
  assert.equal(h.slice(79, 94).trim(), "INTER");
  assert.equal(fld(h, R.headerFields.find((x) => x.key === "seqRemessa")), "0000001");
  assert.equal(d.slice(20, 23), "110", "carteira em 21–23");
  assert.equal(d.slice(23, 27), "0001", "agência em 24–27");
  assert.equal(d.slice(89, 100), "00043095401", "nosso número em 90–100");
  assert.equal(d.slice(126, 139), "0000000015000", "valor em 127–139");
  assert.equal(d.slice(147, 149), "01", "espécie em 148–149");
  assert.equal(d.slice(149, 150), "N", "identificação em 150");
  assert.equal(t.slice(0, 7), "9000001", "trailer: quantidade de boletos em 2–7");
});

test("número de controle vazio vai zerado, como o manual manda", () => {
  const d = arquivo()[1];
  assert.equal(d.slice(37, 62), "0".repeat(25));
});

test("remessa gerada passa na leitura e na validação, sem aviso", () => {
  const ls = arquivo();
  assert.deepEqual(problemas(ls), []);
  const lido = parseArquivo(ls.join("\r\n"), R);
  assert.equal(lido.titulos.length, 1);
  assert.equal(lido.titulos[0].valorTitulo, 150);
  assert.equal(lido.avisos.length, 0);
  assert.equal(lido.header._valido, true);
});

test("DV errado do nosso número na carteira 110 é erro; na 112 não se confere", () => {
  const errado = arquivo(base({ nossoNumero: "00043095409" }));
  assert.ok(achou(errado, "erro", "dígito verificador"));
  const c112 = arquivo(base({ carteira: "112", nossoNumero: "00000000000" }));
  assert.deepEqual(problemas(c112), []);
});

test("carteira fora de 110/112 é erro", () => {
  assert.ok(achou(arquivo(base({ carteira: "109" })), "erro", 'aceita só "110", "112"'));
});

test("valor do título abaixo de R$ 2,50 é erro; R$ 2,50 passa", () => {
  assert.ok(achou(arquivo(base({ valorTitulo: 2.49 })), "erro", "mínimo de R$ 2,50"));
  assert.deepEqual(problemas(arquivo(base({ valorTitulo: 2.5 }))), []);
});

test("dias limite de pagamento: 01 a 60", () => {
  assert.ok(achou(arquivo(base({ diasLimitePagamento: "61" })), "erro", "entre 01 e 60"));
  assert.deepEqual(problemas(arquivo(base({ diasLimitePagamento: "60" }))), []);
});

test("multa e juros: o tipo decide o que é obrigatório", () => {
  assert.ok(achou(arquivo(base({ tipoMulta: "1" })), "erro", "data da multa é obrigatória"));
  assert.ok(achou(arquivo(base({ tipoMulta: "1", dataMulta: "2026-12-11" })), "erro", "valor da multa é obrigatório"));
  assert.deepEqual(problemas(arquivo(base({ tipoMulta: "1", dataMulta: "2026-12-11", valorMulta: 5 }))), []);
  assert.ok(achou(arquivo(base({ tipoMulta: "2", dataMulta: "2026-12-11" })), "erro", "percentual da multa é obrigatório"));
  assert.ok(achou(arquivo(base({ tipoJuros: "2" })), "erro", "data da mora é obrigatória"));
  assert.deepEqual(problemas(arquivo(base({ tipoJuros: "2", dataJuros: "2026-12-11", taxaJuros: 1 }))), []);
});

test("campos com valores permitidos: tipo de multa e de inscrição", () => {
  assert.ok(achou(arquivo(base({ tipoMulta: "3" })), "erro", 'aceita só "0", "1", "2"'));
  assert.ok(achou(arquivo(base({ codInscPagador: "03" })), "erro", 'aceita só "01", "02"'));
});

test("ocorrência fora de 01/07 é aviso", () => {
  assert.ok(achou(arquivo(base({ ocorrencia: "09" })), "aviso", "não consta na tabela"));
});

test("registros tipo 2 e 3 são lidos e conferidos, sem aviso de tipo desconhecido", () => {
  const [h, d, t] = arquivo();
  const T2 = R.registrosExtras["2"].fields;
  const T3 = R.registrosExtras["3"].fields;
  const seq = (l, n) => trocar(l, T2.find((x) => x.key === "seqRegistro"), String(n).padStart(6, "0"));
  const tipo2 = seq(trocar(" ".repeat(400), T2[0], "2"), 3);
  const tipo3 = seq(trocar(trocar(" ".repeat(400), T3[0], "3"), T3.find((x) => x.key === "emailPagador"), "TESTE@EXEMPLO.COM.BR"), 4);
  const trailer = trocar(t, R.trailerFields.find((x) => x.key === "seqRegistro"), "000005");
  const ls = [h, d, tipo2, tipo3, trailer];
  assert.deepEqual(problemas(ls), []);

  const ruim = [h, d, trocar(tipo2, T2.find((x) => x.key === "valorDesconto2"), "ABC"), tipo3, trailer];
  assert.ok(problemas(ruim).some((p) => p.nivel === "erro" && p.linha === 3));
  const tipoErrado = [h, d, tipo2, trocar(tipo3, T3.find((x) => x.key === "tipoDocBenefFinal"), "07"), trailer];
  assert.ok(problemas(tipoErrado).some((p) => p.nivel === "erro" && p.linha === 4));
});

test("retorno: gera, lê de volta e confere ocorrências", () => {
  const C = inter.retorno;
  const ls = gerarArquivo(C, {
    header: { nomeEmpresa: "EMPRESA EXEMPLO LTDA", dataGravacao: "2026-11-18" },
    detalhes: [{ carteira: "110", nossoNumero: "00043095401", ocorrencia: "06", seuNumero: "DOC0000001",
      dataVencimento: "2026-12-10", valorTitulo: 150, valorPago: 150, dataCredito: "2026-12-11" }],
  });
  ls.forEach((l) => assert.equal(l.length, 400));
  const lido = parseArquivo(ls.join("\n"), C);
  assert.equal(lido.titulos[0].ocorrenciaDesc, "Pago");
  assert.equal(lido.titulos[0].valorPago, 150);
  assert.equal(fld(ls[1], C.detalheFields.find((x) => x.key === "ocorrencia")), "06", "ocorrência em 90–91");
  assert.equal(fld(ls[1], C.detalheFields.find((x) => x.key === "valorPago")), "0000000015000", "valor pago em 160–172");
  assert.deepEqual(validarLinhas(ls, C, { direcao: "retorno" }).filter((p) => p.nivel === "erro"), []);
});
