/* Motor do CNAB 400 (engine.js + banks/). Posições do manual são
   1-indexadas e inclusivas; slice() é 0-indexado e exclusivo — o erro de
   uma posição desloca o arquivo inteiro, e é isso que estes testes pegam. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fld, formatData, formatValor, gerarArquivo, parseArquivo, parseData, parseValor } from "../../tools/cobranca/cnab400/engine.js";
import { BANKS } from "../../tools/cobranca/cnab400/banks/registry.js";

/* Cada banco tem um layout por direção (remessa e retorno), cada um com
   header, detalhe e trailer. Os testes percorrem todos. */
const LAYOUTS = BANKS.flatMap(({ nome, config }) =>
  Object.entries(config)
    .filter(([, v]) => v && typeof v === "object" && !Array.isArray(v) && v.detalheFields)
    .map(([direcao, layout]) => ({ nome: `${nome} (${direcao})`, config: layout })));

test("campo 1-indexado e inclusivo", () => {
  const linha = "0123456789";
  assert.equal(fld(linha, { ini: 1, fim: 1 }), "0");
  assert.equal(fld(linha, { ini: 3, fim: 5 }), "234");
});

test("valor com 2 decimais implícitas, ida e volta", () => {
  assert.equal(formatValor(150, 13), "0000000015000");
  assert.equal(parseValor("0000000015000"), 150);
  assert.equal(formatValor(0.1 + 0.2, 13), "0000000000030", "arredonda centavo de ponto flutuante");
});

test("data DDMMAA com pivô de século", () => {
  assert.equal(parseData("010170"), "01/01/2070");
  assert.equal(parseData("010171"), "01/01/1971");
  assert.equal(parseData("000000"), "");
  assert.equal(formatData("2026-11-06"), "061126");
});

test("todo banco, nas duas direções: registros de 400 posições, lidos de volta", () => {
  assert.ok(LAYOUTS.length >= 3, `layouts: ${LAYOUTS.map((l) => l.nome)}`);
  for (const { nome, config } of LAYOUTS) {
    const detalhes = [{ valorTitulo: 150.25 }, { valorTitulo: 99.9 }];
    const linhas = gerarArquivo(config, { header: {}, detalhes });
    const tamanho = config.tamanhoRegistro || 400;
    linhas.forEach((l, i) => assert.equal(l.length, tamanho, `${nome}, linha ${i + 1}`));

    const lido = parseArquivo(linhas.join("\r\n"), config);
    assert.equal(lido.titulos.length, 2, nome);
    assert.equal(lido.avisos.filter((a) => /caracteres/.test(a)).length, 0, `${nome}: nenhuma linha com tamanho errado`);
    if (config.trailerFields && config.trailerConferencia) {
      assert.equal(lido.avisos.filter((a) => /Trailer/.test(a)).length, 0, `${nome}: trailer gerado fecha com o lido`);
    }
  }
});

test("trailer que não fecha com o arquivo vira aviso (arquivo truncado)", () => {
  const banco = LAYOUTS.find((b) => b.config.trailerConferencia && b.config.trailerFields);
  assert.ok(banco, "ao menos um banco confere o trailer");
  const linhas = gerarArquivo(banco.config, { header: {}, detalhes: [{ valorTitulo: 10 }, { valorTitulo: 20 }, { valorTitulo: 30 }] });
  const semUmDetalhe = [linhas[0], linhas[1], linhas[2], linhas[linhas.length - 1]];
  const lido = parseArquivo(semUmDetalhe.join("\n"), banco.config);
  assert.ok(lido.avisos.some((a) => /Trailer declara/.test(a)), JSON.stringify(lido.avisos));
});

test("arquivo sem trailer é avisado", () => {
  const banco = LAYOUTS.find((b) => b.config.trailerFields);
  const linhas = gerarArquivo(banco.config, { header: {}, detalhes: [{ valorTitulo: 1 }] });
  const lido = parseArquivo(linhas.slice(0, -1).join("\n"), banco.config);
  assert.ok(lido.avisos.some((a) => /sem registro Trailer/.test(a)));
});
