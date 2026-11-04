#!/usr/bin/env node
/* =====================================================================
 * conferir-contraste.mjs — conferência de contraste REAL, nos dois temas.
 *
 * Por que existe: a paleta no papel não diz se o site passa. O que vale é
 * o que está pintado na tela — um texto oliva que passa sobre a areia pode
 * reprovar dentro de um chip de mostarda a 14%, e uma cor fixa esquecida
 * em `color:` só aparece quando o tema vira. Este script abre cada página
 * no navegador, nos dois temas, e mede par a par.
 *
 * COMO RODAR
 *   python3 -m http.server 8899     # na raiz do repositório
 *   npx playwright@1 ... || node scripts/conferir-contraste.mjs
 *
 * Precisa do Playwright disponível (`npx playwright install chromium` ou um
 * Chromium já instalado, apontado por PLAYWRIGHT_CHROMIUM). Não há
 * `package.json` na raiz de propósito: o site não tem build, e esta
 * conferência é ferramenta de manutenção, não dependência do site.
 *
 * Variáveis: BASE (padrão http://localhost:8899/), PLAYWRIGHT_CHROMIUM.
 * Sai com código 1 se algum texto ficar abaixo do mínimo da WCAG 2.1
 * (4,5:1 normal; 3:1 para texto grande e para limite de controle).
 *
 * DUAS ARMADILHAS DE QUEM MEXER AQUI
 *  1. O fundo precisa ser COMPOSTO camada a camada até achar uma opaca, e
 *     o texto com alfa também — senão um creme a 72% sobre marrom é lido
 *     como creme sobre marrom e o número sai errado.
 *  2. Medir o texto PRÓPRIO do nó. Pular todo elemento que tem filho
 *     descarta qualquer botão com ícone — e era exatamente ali que estava
 *     o branco fixo sobre a terracota clara do tema escuro.
 * ===================================================================== */
import { chromium } from "playwright";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BASE = process.env.BASE || "http://localhost:8899/";
const IGNORAR = new Set(["node_modules", "apps", ".git", "assets", "scripts", "tasks", ".claude"]);

/** Todas as páginas do site, descobertas no disco — para a lista não
 *  envelhecer a cada ferramenta nova. `apps/` fica de fora: tem build
 *  próprio e não carrega o tokens.css. */
function paginas(dir = RAIZ, achadas = []) {
  for (const nome of readdirSync(dir)) {
    if (IGNORAR.has(nome)) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) paginas(caminho, achadas);
    else if (nome.endsWith(".html")) achadas.push(relative(RAIZ, caminho).split(sep).join("/"));
  }
  return achadas.sort();
}

const medir = (p) => p.evaluate(() => {
  /* `rgb(from var(--x) r g b / .72)` é serializado como
     `color(srgb 0.95 0.9 0.86 / 0.72)` — componentes de 0 a 1. */
  const canais = (cor) => {
    const n = (cor.match(/[\d.]+(?:e-?\d+)?/g) || []).map(Number);
    const esc = cor.startsWith("color(") ? 255 : 1;
    return { r: (n[0] ?? 0) * esc, g: (n[1] ?? 0) * esc, b: (n[2] ?? 0) * esc, a: n.length > 3 ? n[3] : 1 };
  };
  const lum = (c) => {
    const [r, g, b] = [c.r, c.g, c.b].map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const sobre = (frente, fundo) => ({
    r: frente.r * frente.a + fundo.r * (1 - frente.a),
    g: frente.g * frente.a + fundo.g * (1 - frente.a),
    b: frente.b * frente.a + fundo.b * (1 - frente.a),
    a: 1,
  });

  const fundoDe = (el) => {
    const camadas = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const c = canais(getComputedStyle(n).backgroundColor || "");
      if (c.a > 0) { camadas.push(c); if (c.a === 1) break; }
      n = n.parentElement;
    }
    if (!camadas.length) return { r: 255, g: 255, b: 255, a: 1 };
    let base = camadas.pop();
    while (camadas.length) base = sobre(camadas.pop(), base);
    return base;
  };

  /** Assinatura que identifica a REGRA, e não o texto: o mesmo seletor
   *  costuma reprovar em dez páginas e o conserto é um só. */
  const assinatura = (el) => {
    const classe = String(el.className || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
    const pai = String(el.parentElement?.className || "").trim().split(/\s+/).filter(Boolean)[0] || "";
    return `${el.tagName.toLowerCase()}${classe ? "." + classe : ""}${pai ? " < ." + pai : ""}`;
  };

  const fmt = (c) => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
  const achados = [];
  for (const el of document.querySelectorAll("h1,h2,h3,h4,p,a,button,label,span,strong,em,li,td,th,small,code,option,summary")) {
    const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (!texto || texto.length < 2) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || !el.offsetParent) continue;
    if (parseFloat(s.opacity) < 0.3) continue;

    const fundo = fundoDe(el);
    const frente = sobre(canais(s.color), fundo);
    const [l1, l2] = [lum(frente), lum(fundo)].sort((a, b) => b - a);
    const razao = (l1 + 0.05) / (l2 + 0.05);

    const tam = parseFloat(s.fontSize);
    const peso = Number(s.fontWeight) || 400;
    const minimo = tam >= 24 || (tam >= 18.66 && peso >= 700) ? 3 : 4.5;

    if (razao < minimo) {
      achados.push({
        assinatura: assinatura(el), texto: texto.slice(0, 38),
        razao: Number(razao.toFixed(2)), minimo, cor: fmt(frente), fundo: fmt(fundo),
      });
    }
  }
  return achados;
});

const lista = paginas();
const navegador = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined });
const pagina = await navegador.newPage({ viewport: { width: 1360, height: 900 } });

const porRegra = new Map();
let total = 0;
let limpas = 0;

for (const caminho of lista) {
  for (const tema of ["claro", "escuro"]) {
    await pagina.goto(BASE + caminho, { waitUntil: "domcontentloaded" });
    if (tema === "escuro") await pagina.evaluate(() => document.body.classList.add("dark-mode"));
    await pagina.waitForTimeout(350);

    let achados = [];
    try {
      achados = await medir(pagina);
    } catch (erro) {
      console.error(`erro ao medir ${caminho} (${tema}): ${erro}`);
      continue;
    }
    if (!achados.length) { limpas += 1; continue; }
    total += achados.length;
    for (const a of achados) {
      const chave = `${a.assinatura} | ${tema}`;
      if (!porRegra.has(chave)) porRegra.set(chave, { ...a, paginas: new Set(), ocorrencias: 0 });
      const reg = porRegra.get(chave);
      reg.paginas.add(caminho);
      reg.ocorrencias += 1;
      if (a.razao < reg.razao) Object.assign(reg, { razao: a.razao, texto: a.texto, cor: a.cor, fundo: a.fundo });
    }
  }
}

console.log(`${lista.length} páginas × 2 temas · ${limpas} combinações limpas · ${total} textos abaixo do mínimo\n`);
for (const [chave, reg] of [...porRegra].sort((a, b) => b[1].ocorrencias - a[1].ocorrencias)) {
  console.log(`${String(reg.ocorrencias).padStart(3)}x  ${chave}`);
  console.log(`      pior: ${reg.razao} (mín. ${reg.minimo})  "${reg.texto}"  ${reg.cor} sobre ${reg.fundo}`);
  const p = [...reg.paginas];
  console.log(`      em: ${p.slice(0, 3).join(", ")}${p.length > 3 ? ` +${p.length - 3}` : ""}`);
}

await navegador.close();
process.exit(total > 0 ? 1 : 0);
