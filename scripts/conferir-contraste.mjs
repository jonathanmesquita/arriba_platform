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
 * Mede cada página no carregamento E uma lista de estados abertos (chat,
 * mega-menu, busca — ver ESTADOS), que a medição de carregamento não vê.
 *
 * Variáveis: BASE (padrão http://localhost:8899/), PLAYWRIGHT_CHROMIUM e
 * CDN_LOCAL (abaixo).
 * Sai com código 1 se algum texto ficar abaixo do mínimo da WCAG 2.1
 * (4,5:1 normal; 3:1 para texto grande e para limite de controle) e com
 * código 2 se alguma folha de estilo não carregou.
 *
 * SEM REDE PARA O CDN, A MEDIÇÃO NÃO VALE
 *   Metade das páginas pega o Bootstrap do CDN. Se o CDN não responde, a
 *   página é pintada SEM ele e a conferência mede outra tela: o rosa do
 *   `<code>` e o cinza do `.text-muted`, que vêm do Bootstrap, simplesmente
 *   não existem — foi assim que 74 reprovações passaram como "0" numa
 *   máquina com o CDN bloqueado e só apareceram no GitHub. Por isso folha
 *   de estilo que falha derruba a conferência em vez de passar em silêncio.
 *   Para medir numa máquina assim, baixe os pacotes e aponte CDN_LOCAL:
 *     mkdir -p /tmp/cdn/bootstrap@5.3.3 && cd /tmp/cdn
 *     tar -xzf "$(npm pack bootstrap@5.3.3)" -C bootstrap@5.3.3 --strip-components=1
 *     CDN_LOCAL=/tmp/cdn npm run contraste
 *   A pasta espelha o caminho depois de `cdn.jsdelivr.net/npm/`.
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
import { existsSync, readdirSync, statSync } from "node:fs";
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

/* Estados abertos: a medição de carregamento nunca vê o que só aparece
   depois de um clique — e foi ali que estavam os piores defeitos de tema
   (o "X" preto do mega-menu no escuro, o chat, as modais). Cada estado
   diz a página, como abrir e o nome que sai no relatório. Estado novo de
   interface com cor própria entra nesta lista. */
const ESTADOS = [
  { pagina: "index.html", nome: "chat aberto", abrir: async (p) => { await p.click("#chatbotBtn"); } },
  {
    pagina: "index.html", nome: "chat respondendo", abrir: async (p) => {
      await p.click("#chatbotBtn");
      await p.fill("#chatInput", "validar csv");
      await p.press("#chatInput", "Enter");
      await p.waitForTimeout(700);
      await p.$$eval("#chatWindow details", (ds) => ds.forEach((d) => { d.open = true; }));
    }
  },
  {
    pagina: "index.html", nome: "chat do administrador (engrenagem acesa)", abrir: async (p) => {
      await p.evaluate(() => {
        localStorage.setItem("arribaAdmin:atalho", "1");
        localStorage.setItem("arribaLLM:config", JSON.stringify({ provedor: "openai", modelo: "x", chave: "y", url: "" }));
      });
      await p.reload({ waitUntil: "domcontentloaded" });
      await p.waitForTimeout(350);
      await p.click("#chatbotBtn");
    },
    limpar: async (p) => p.evaluate(() => { localStorage.removeItem("arribaAdmin:atalho"); localStorage.removeItem("arribaLLM:config"); })
  },
  {
    pagina: "index.html", nome: "mega-menu aberto (Ferramentas › Código e SQL)", abrir: async (p) => {
      await p.click("#enterpriseMenuToggle");
      await p.click('[data-section="ferramentas"]');
      await p.waitForTimeout(150);
      await p.evaluate(() => [...document.querySelectorAll("#enterpriseMenu button")].find((b) => b.textContent.includes("Código e SQL"))?.click());
    }
  },
  {
    pagina: "index.html", nome: "busca com resultados", abrir: async (p) => {
      await p.fill("#topbarSearchInput", "csv");
      await p.waitForTimeout(400);
    }
  },
  {
    /* Botão "Copiado" e a linha de estado em verde só existem depois do clique. */
    pagina: "tools/cobranca/massa-dados/massa-dados.html", nome: "dados copiados", abrir: async (p) => {
      await p.click("#btnCopy");
      await p.waitForSelector('#btnCopy[data-estado="copiado"]');
    }
  }
];

/* Liga o tema escuro SEM animação. O site anima a troca de cor; medir
   no meio da transição lia um marrom intermediário e reprovava texto que
   passa — falso alarme que aparecia numa rodada e sumia na outra. */
async function ativarEscuro(p) {
  await p.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  await p.evaluate(() => document.body.classList.add("dark-mode"));
}

const lista = paginas();
const navegador = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined });
const pagina = await navegador.newPage({ viewport: { width: 1360, height: 900 } });

/* Bibliotecas do CDN servidas de uma pasta local, quando CDN_LOCAL existe. */
const CDN = "https://cdn.jsdelivr.net/npm/";
if (process.env.CDN_LOCAL) {
  await pagina.route(`${CDN}**`, (rota) => {
    const arquivo = join(process.env.CDN_LOCAL, decodeURIComponent(new URL(rota.request().url()).pathname.replace(/^\/npm\//, "")));
    return existsSync(arquivo) ? rota.fulfill({ path: arquivo }) : rota.continue();
  });
}

/* Folha de estilo que não chegou: a tela medida não é a tela de verdade. */
const estilosPerdidos = new Set();
pagina.on("requestfailed", (pedido) => {
  if (pedido.resourceType() === "stylesheet") estilosPerdidos.add(pedido.url());
});
pagina.on("response", (resposta) => {
  if (resposta.request().resourceType() === "stylesheet" && resposta.status() >= 400) estilosPerdidos.add(resposta.url());
});

const porRegra = new Map();
let total = 0;
let limpas = 0;

for (const caminho of lista) {
  for (const tema of ["claro", "escuro"]) {
    await pagina.goto(BASE + caminho, { waitUntil: "domcontentloaded" });
    if (tema === "escuro") await ativarEscuro(pagina);
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

let estadosLimpos = 0;
for (const estado of ESTADOS) {
  for (const tema of ["claro", "escuro"]) {
    const rotulo = `${estado.pagina} [${estado.nome}]`;
    let achados = [];
    try {
      await pagina.goto(BASE + estado.pagina, { waitUntil: "domcontentloaded" });
      await pagina.waitForTimeout(350);
      await estado.abrir(pagina);
      if (tema === "escuro") await ativarEscuro(pagina);
      await pagina.waitForTimeout(350);
      achados = await medir(pagina);
    } catch (erro) {
      /* Estado que não abre mais (botão renomeado, página mudou) é falha da
         conferência, não "limpo": senão a lista envelhece em silêncio. */
      console.error(`não consegui abrir o estado ${rotulo} (${tema}): ${erro.message}`);
      total += 1;
      continue;
    } finally {
      if (estado.limpar) await estado.limpar(pagina).catch(() => {});
    }
    if (!achados.length) { estadosLimpos += 1; continue; }
    total += achados.length;
    for (const a of achados) {
      const chave = `${a.assinatura} | ${tema}`;
      if (!porRegra.has(chave)) porRegra.set(chave, { ...a, paginas: new Set(), ocorrencias: 0 });
      const reg = porRegra.get(chave);
      reg.paginas.add(rotulo);
      reg.ocorrencias += 1;
      if (a.razao < reg.razao) Object.assign(reg, { razao: a.razao, texto: a.texto, cor: a.cor, fundo: a.fundo });
    }
  }
}

console.log(`${lista.length} páginas × 2 temas · ${limpas} combinações limpas`);
console.log(`${ESTADOS.length} estados abertos × 2 temas · ${estadosLimpos} combinações limpas`);
console.log(`${total} textos abaixo do mínimo\n`);
for (const [chave, reg] of [...porRegra].sort((a, b) => b[1].ocorrencias - a[1].ocorrencias)) {
  console.log(`${String(reg.ocorrencias).padStart(3)}x  ${chave}`);
  console.log(`      pior: ${reg.razao} (mín. ${reg.minimo})  "${reg.texto}"  ${reg.cor} sobre ${reg.fundo}`);
  const p = [...reg.paginas];
  console.log(`      em: ${p.slice(0, 3).join(", ")}${p.length > 3 ? ` +${p.length - 3}` : ""}`);
}

await navegador.close();

if (estilosPerdidos.size) {
  console.error(`\nMEDIÇÃO INVÁLIDA: ${estilosPerdidos.size} folha(s) de estilo não carregaram — as páginas foram medidas sem elas.`);
  for (const url of estilosPerdidos) console.error(`  ${url}`);
  console.error("Libere o acesso ao CDN ou aponte CDN_LOCAL (ver o cabeçalho deste arquivo).");
  process.exit(2);
}
process.exit(total > 0 ? 1 : 0);
