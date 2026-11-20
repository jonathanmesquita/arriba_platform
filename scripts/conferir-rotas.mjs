/* Conferência do roteador das páginas de pages/ (assets/js/router.js).
 *
 * O que ela pega: o roteador carrega um TRECHO de HTML dentro da home e mostra
 * `/#/pages/...` na barra. Se alguém voltar a usar pushState para o endereço do
 * trecho, F5 e link copiado abrem o HTML cru, sem estilo — e nenhum teste de lógica
 * enxerga isso, só o navegador.
 *
 * Uso (com o site servido em BASE, padrão http://localhost:8899/):
 *   cd scripts && npm run rotas
 * Variáveis: BASE e PLAYWRIGHT_CHROMIUM (caminho do Chromium, se não for o do Playwright).
 * Não depende do CDN: só a lógica de navegação é medida. */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:8899/";
const navegador = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}
);
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } });
// Só o site local interessa; CDN fora do ar não pode mudar o resultado.
await pagina.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());

const estado = () => pagina.evaluate(() => ({
  hash: location.hash,
  caminho: location.pathname,
  h1: document.querySelector("#appContent h1")?.textContent || "",
  ehHome: Boolean(document.querySelector("#appContent #tools-section")),
}));

let falhas = 0;
const confere = (nome, condicao) => {
  console.log(`${condicao ? "ok " : "FALHOU"}  ${nome}`);
  if (!condicao) falhas++;
};
const espera = (ms) => pagina.waitForTimeout(ms);

await pagina.goto(BASE);
await espera(400);

await pagina.click('a[href="pages/case-study/index.html"][data-route]');
await espera(500);
let e = await estado();
confere("clicar num link de rota muda o hash e carrega o trecho", e.hash === "#/pages/case-study/index.html" && /Estudos de caso/.test(e.h1));

await pagina.reload();
await espera(600);
e = await estado();
confere("F5 mantém a página (não abre o HTML cru)", e.caminho === "/" && /Estudos de caso/.test(e.h1));

await pagina.click('#appContent a[href="/pages/case-study/chatbot-ai.html"]');
await espera(500);
e = await estado();
confere("link dentro do trecho navega", /Chatbot/.test(e.h1));

await pagina.goBack();
await espera(600);
e = await estado();
confere("voltar mostra o trecho anterior", /Estudos de caso/.test(e.h1));

await pagina.goBack();
await espera(800);
e = await estado();
confere("voltar até o começo recarrega a home", e.hash === "" && e.ehHome);

await pagina.goto(`${BASE}pages/about/about_jonathan.html`);
await espera(900);
e = await estado();
confere("endereço antigo do trecho redireciona para a rota nova", e.caminho === "/" && /Jonathan/.test(e.h1));
confere("o trecho aparece com estilo da home", await pagina.evaluate(() => document.styleSheets.length > 0));

await pagina.click('#appContent a:has-text("estudos de caso")');
await espera(500);
e = await estado();
confere("link da página Sobre para os estudos de caso funciona", /Estudos de caso/.test(e.h1));

await pagina.goto(`${BASE}#/pages/docs/blog/index.html#dx001`);
await espera(700);
confere("âncora depois da rota rola até o elemento", await pagina.evaluate(() => Boolean(document.getElementById("dx001"))));

await pagina.goto(`${BASE}#//outro.exemplo/pages/x.html`);
await espera(300);
e = await estado();
confere("rota para outra origem é ignorada", e.ehHome);

await navegador.close();
if (falhas) { console.error(`\n${falhas} conferência(s) falharam.`); process.exit(1); }
console.log("\nRotas conferidas.");
