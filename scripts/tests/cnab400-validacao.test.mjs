/* Validação de conteúdo do CNAB 400 (validacao.js). Dois lados que não se
   misturam: arquivo BOM não pode gerar alarme falso, e cada defeito plantado
   tem de ser pego na linha certa. Os testes percorrem todos os layouts. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarArquivo } from "../../tools/cobranca/cnab400/engine.js";
import { BANKS } from "../../tools/cobranca/cnab400/banks/registry.js";
import { dataValida, lerEValidar, validarDados, validarLinhas, validarValor } from "../../tools/cobranca/cnab400/validacao.js";

const LAYOUTS = BANKS.flatMap(({ nome, config }) =>
  Object.entries(config)
    .filter(([, v]) => v && typeof v === "object" && !Array.isArray(v) && v.detalheFields)
    .map(([direcao, layout]) => ({ nome: `${nome} (${direcao})`, direcao, config: layout })));

const trocar = (linha, def, texto) => {
  const tam = def.fim - def.ini + 1;
  return linha.slice(0, def.ini - 1) + texto.padEnd(tam, " ").slice(0, tam) + linha.slice(def.fim);
};
const campo = (cfg, chave) => cfg.detalheFields.find((d) => d.key === chave);
/* Arquivo "como a tela gera": cada campo obrigatório com o exemplo declarado no
   layout (ou o exemplo calculado por título, como o nosso número com DV). Só o
   nosso número muda de um título para o outro: repetido seria aviso legítimo. */
const exemploDe = (def, i) => {
  if (def.exemploFn) return def.exemploFn(i);
  if (def.fmt === "valor") return Number(String(def.exemplo ?? "0").replace(/\./g, "").replace(",", ".")) || 0;
  return def.exemplo;
};
const gerar = (cfg) => {
  const doBloco = (chaves, defs, i) => Object.fromEntries(
    (chaves || [])
      .map((k) => defs.find((d) => d.key === k))
      .filter((d) => d && d.obrigatorio && exemploDe(d, i) !== undefined)
      .map((d) => [d.key, exemploDe(d, i)]));
  const detalhes = [1, 2].map((i) => {
    const d = { valorTitulo: 100 + i, ...doBloco(cfg.formFields?.detalhe, cfg.detalheFields, i) };
    const nn = campo(cfg, "nossoNumero");
    if (nn && !nn.exemploFn) d.nossoNumero = String(i);
    const oc = campo(cfg, "ocorrencia");
    const codigo = Object.keys(cfg.ocorrencias || {})[0];
    if (oc && codigo) d.ocorrencia = codigo;   // vazio viraria "00", que não consta na tabela
    return d;
  });
  return gerarArquivo(cfg, { header: doBloco(cfg.formFields?.header, cfg.headerFields, 0), detalhes });
};

test("arquivo gerado pelo próprio site não gera erro nem aviso (sem falso alarme)", () => {
  for (const { nome, direcao, config } of LAYOUTS) {
    const p = validarLinhas(gerar(config), config, { direcao });
    assert.deepEqual(p, [], `${nome}: ${p.map((x) => x.mensagem).join(" | ")}`);
  }
});

test("lerEValidar junta o resultado do motor com os problemas", () => {
  const { config, direcao } = LAYOUTS[0];
  const r = lerEValidar(gerar(config).join("\r\n"), config, { direcao });
  assert.equal(r.titulos.length, 2);
  assert.deepEqual(r.erros, []);
});

const DEFEITOS = [
  ["letra no valor do título", "erro", (cfg, ls) => { ls[1] = trocar(ls[1], campo(cfg, "valorTitulo"), "ABC"); return 2; }],
  ["data impossível (99/99/99)", "erro", (cfg, ls) => { const d = cfg.detalheFields.find((x) => x.fmt === "data"); if (!d) return null; ls[1] = trocar(ls[1], d, "999999"); return 2; }],
  ["campo fixo do detalhe diferente", "erro", (cfg, ls) => { const f = cfg.detalheFields.find((x) => x.fixo !== undefined && x.key !== "idRegistro"); if (!f) return null; ls[1] = trocar(ls[1], f, "X".repeat(f.fim - f.ini + 1)); return 2; }],
  ["campo fixo do trailer diferente", "erro", (cfg, ls) => { const f = cfg.trailerFields?.find((x) => x.fixo !== undefined && x.key !== "idRegistro"); if (!f) return null; ls[ls.length - 1] = trocar(ls[ls.length - 1], f, "X".repeat(f.fim - f.ini + 1)); return ls.length; }],
  ["sequencial duplicado", "aviso", (cfg, ls) => { const s = campo(cfg, "seqRegistro"); if (!s) return null; ls[2] = trocar(ls[2], s, ls[1].slice(s.ini - 1, s.fim)); return 3; }],
  ["tipo de registro não descrito", "aviso", (cfg, ls) => { ls[1] = "5" + ls[1].slice(1); return 2; }],
  ["ocorrência fora da tabela", "aviso", (cfg, ls) => { const o = campo(cfg, "ocorrencia"); if (!o) return null; ls[1] = trocar(ls[1], o, "99"); return 2; }],
  ["acento em campo de texto", "aviso", (cfg, ls) => { const a = cfg.detalheFields.find((x) => x.type === "A" && x.fixo === undefined && x.fim - x.ini >= 5); if (!a) return null; ls[1] = trocar(ls[1], a, "JOÃO"); return 2; }],
];

for (const [descricao, nivel, aplicar] of DEFEITOS) {
  test(`defeito pego na linha certa: ${descricao}`, () => {
    let vistos = 0;
    for (const { nome, direcao, config } of LAYOUTS) {
      const ls = gerar(config);
      const linha = aplicar(config, ls);
      if (linha === null) continue;
      vistos++;
      const p = validarLinhas(ls, config, { direcao });
      assert.ok(p.some((x) => x.nivel === nivel && x.linha === linha), `${nome}: esperava ${nivel} na linha ${linha}, veio ${JSON.stringify(p)}`);
    }
    assert.ok(vistos > 0, "o defeito não se aplicou a nenhum layout");
  });
}

test("nosso número repetido: aviso na remessa, normal no retorno", () => {
  for (const { nome, direcao, config } of LAYOUTS) {
    const nn = campo(config, "nossoNumero");
    if (!nn) continue;
    const ls = gerarArquivo(config, { header: {}, detalhes: [{ valorTitulo: 1, nossoNumero: "7" }, { valorTitulo: 2, nossoNumero: "7" }] });
    const repetido = validarLinhas(ls, config, { direcao }).filter((x) => /nosso número/.test(x.mensagem));
    assert.equal(repetido.length, direcao === "remessa" ? 1 : 0, nome);
  }
});

test("linha de tamanho errado não gera enxurrada de mensagens falsas", () => {
  const { config, direcao } = LAYOUTS[0];
  const ls = gerar(config);
  ls[1] = ls[1].slice(0, 300);
  assert.deepEqual(validarLinhas(ls, config, { direcao }), []);
});

test("campo numérico em branco não é reportado (não há fonte dizendo zero ou branco)", () => {
  const { config, direcao } = LAYOUTS[0];
  const ls = gerar(config);
  const num = config.detalheFields.find((x) => x.type === "N" && !x.fmt && x.fixo === undefined && !["seqRegistro", "ocorrencia"].includes(x.key) && x.fim - x.ini >= 3);
  ls[1] = trocar(ls[1], num, "");
  assert.deepEqual(validarLinhas(ls, config, { direcao }).filter((x) => x.campo === num.key), []);
});

test("dataValida: calendário, bissexto, zeros e pivô de século", () => {
  assert.equal(dataValida("290224"), true, "2024 é bissexto");
  assert.equal(dataValida("290223"), false, "2023 não é");
  assert.equal(dataValida("310424"), false, "abril tem 30 dias");
  assert.equal(dataValida("000000"), true, "zeros = sem data");
  assert.equal(dataValida(""), true);
  assert.equal(dataValida("32 124"), false);
  assert.equal(dataValida("290200"), true, "00 → 2000, bissexto");
  assert.equal(dataValida("290200".replace("00", "00")), true);
  assert.equal(dataValida("29021900"), false, "AAAAMMDD enviado como DDMMAA");
  assert.equal(dataValida("20240229", { anoComQuatroDigitos: true }), true);
  assert.equal(dataValida("20230229", { anoComQuatroDigitos: true }), false);
});

/* ---- gerador: os seis jeitos de gravar dado errado em silêncio ---- */

const def = (extra) => ({ ini: 1, fim: 7, key: "k", nome: "Campo", type: "N", ...extra });
const nivelDe = (def_, v) => validarValor(def_, v).map((p) => p.nivel);

test("gerador: letra em campo numérico é erro (antes sumia e deslocava os números)", () => {
  assert.deepEqual(nivelDe(def(), "12A45"), ["erro"]);
});

test("gerador: dígitos a mais que o campo é erro (antes perdia os da esquerda)", () => {
  const p = validarValor(def(), "123456789");
  assert.equal(p[0].nivel, "erro");
  assert.match(p[0].mensagem, /9 dígitos.*comporta 7/);
});

test("gerador: pontuação de CPF/CEP é tolerada, não é erro", () => {
  assert.deepEqual(validarValor(def({ ini: 1, fim: 11 }), "123.456.789-09"), []);
  assert.deepEqual(validarValor(def({ ini: 1, fim: 8 }), "01310-100"), []);
});

test("gerador: texto maior que o campo é erro (antes era cortado)", () => {
  const p = validarValor(def({ type: "A", fim: 10 }), "NOME MUITO COMPRIDO");
  assert.equal(p[0].nivel, "erro");
  assert.match(p[0].mensagem, /cortado/);
});

test("gerador: acento é aviso, e texto limpo não gera nada", () => {
  assert.deepEqual(nivelDe(def({ type: "A", fim: 20 }), "JOÃO DA SILVA"), ["aviso"]);
  assert.deepEqual(nivelDe(def({ type: "A", fim: 20 }), "JOAO DA SILVA"), []);
});

test("gerador: valor negativo, não numérico ou grande demais é erro", () => {
  const v = def({ type: "N", fmt: "valor", fim: 13 });
  assert.deepEqual(nivelDe(v, "-5"), ["erro"]);
  assert.deepEqual(nivelDe(v, "12abc"), ["erro"]);
  assert.deepEqual(nivelDe(v, "100000000000,00"), ["erro"], "não cabe em 13 posições");
  assert.deepEqual(nivelDe(v, "1.234,56"), []);
  assert.deepEqual(nivelDe(v, 150.25), []);
});

test("gerador: '12.5' avisa que o ponto é milhar", () => {
  assert.deepEqual(nivelDe(def({ type: "N", fmt: "valor", fim: 13 }), "12.5"), ["aviso"]);
});

test("gerador: data inexistente e ano fora de 1971–2070 são erros (DDMMAA)", () => {
  const d = def({ type: "N", fmt: "data", fim: 6 });
  assert.deepEqual(nivelDe(d, "2024-02-30"), ["erro"]);
  assert.deepEqual(nivelDe(d, "2075-01-10"), ["erro"], "viraria 1975 ao reler");
  assert.deepEqual(nivelDe(d, "2026-11-17"), []);
  assert.deepEqual(nivelDe(def({ type: "N", fmt: "data8", fim: 8 }), "2075-01-10"), [], "AAAAMMDD comporta o ano");
});

test("gerador: obrigatório vazio é erro; opcional vazio, não", () => {
  assert.deepEqual(nivelDe(def({ obrigatorio: true }), ""), ["erro"]);
  assert.deepEqual(nivelDe(def(), ""), []);
});

test("validarDados percorre cabeçalho e títulos e diz onde está o erro", () => {
  const { config } = LAYOUTS[0];
  const r = validarDados(config, { header: {}, detalhes: [{ valorTitulo: 10 }, { valorTitulo: "ABC" }] });
  assert.equal(r.temErro, true);
  const p = r.problemas.find((x) => x.chave === "valorTitulo");
  assert.equal(p.onde, "detalhe");
  assert.equal(p.indice, 1);
});
