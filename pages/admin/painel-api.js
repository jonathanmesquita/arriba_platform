/* =====================================================================
   Painel da API - área de administração

   Lê /v1/painel/resumo e /v1/painel/chamadas da Arriba API (só
   administrador, pelo cookie de sessão) e mostra:
   - quatro números (chamadas, erros do servidor, tempo p95, cache);
   - o volume no período, em colunas (uma série, sem legenda: o título
     diz o que é; passar o mouse ou focar mostra o valor);
   - tabelas por rota, por API pública e das últimas chamadas — que são
     também a versão em tabela do gráfico.

   Tudo que vem da API entra na página por textContent.
   ===================================================================== */

import { chamarApi, MENSAGEM_DEMORA } from "../../assets/js/arriba-api.js";
import { iniciarAcessoAdmin } from "../../assets/js/acesso-admin.js";

const $ = (id) => document.getElementById(id);
let controleAcesso = null;

function el(tag, props = {}, filhos = []) {
  const no = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === "texto") no.textContent = v;
    else if (k === "classe") no.className = v;
    else if (k in no) no[k] = v;
    else no.setAttribute(k, v);
  });
  [].concat(filhos).filter(Boolean).forEach((f) => no.append(f));
  return no;
}

/* ---------------------------------------------------------------------
   Formatação
   --------------------------------------------------------------------- */
const numero = (n) => (n ?? 0).toLocaleString("pt-BR");
const pct = (fracao) => (fracao === null || fracao === undefined ? "—" : `${(fracao * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const tempo = (ms) => (ms === null || ms === undefined ? "—" : ms < 1000 ? `${numero(ms)} ms` : `${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`);
const quando = (iso, comData = true) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", comData ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit" });
};

/* ---------------------------------------------------------------------
   Números do topo
   --------------------------------------------------------------------- */
function tile(rotulo, valor, detalhe) {
  return el("div", { classe: "tile" }, [
    el("p", { classe: "rotulo", texto: rotulo }),
    el("p", { classe: "valor", texto: valor }),
    detalhe ? el("p", { classe: "detalhe", texto: detalhe }) : null
  ]);
}

function montarTiles(g) {
  const taxaErro = g.total ? g.erros / g.total : null;
  $("tiles").replaceChildren(
    tile("Chamadas", numero(g.total), g.recusas ? `${numero(g.recusas)} recusada(s) por acesso ou entrada` : "nenhuma recusada"),
    tile("Erros do servidor", pct(taxaErro), `${numero(g.erros)} com status 5xx`),
    tile("Tempo (p95)", tempo(g.p95), `metade responde em até ${tempo(g.p50)}`),
    tile("Respostas do cache", pct(g.cache), "só consultas a APIs públicas contam")
  );
}

/* ---------------------------------------------------------------------
   Volume no período (colunas)
   --------------------------------------------------------------------- */
/* Mais de 48 horas em colunas por hora vira serrilhado: junta por dia. */
function agruparPorDia(horas) {
  const dias = new Map();
  for (const h of horas) {
    const chave = h.hora.slice(0, 10);
    const d = dias.get(chave) || { hora: `${chave}T00:00:00.000Z`, total: 0, erros: 0 };
    d.total += h.total; d.erros += h.erros;
    dias.set(chave, d);
  }
  return [...dias.values()];
}

function montarGrafico(porHora, horasPeriodo) {
  const porDia = horasPeriodo > 48;
  const pontos = porDia ? agruparPorDia(porHora) : porHora;
  const rotuloPonto = (p) => porDia
    ? new Date(p.hora).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })
    : `${quando(p.hora, horasPeriodo > 24)}`;
  const maximo = Math.max(1, ...pontos.map((p) => p.total));
  const total = pontos.reduce((s, p) => s + p.total, 0);

  const area = el("div", { classe: "grafico-area", role: "img", "aria-label": `Chamadas ${porDia ? "por dia" : "por hora"}: ${numero(total)} no período; pico de ${numero(maximo)}.` });
  const dica = el("div", { classe: "dica-grafico", hidden: true });
  const grafico = el("div", { classe: "grafico" }, [
    el("div", { classe: "grade-topo" }, el("span", { texto: numero(maximo) })),
    area, dica
  ]);

  const mostrar = (coluna, p) => {
    dica.textContent = `${rotuloPonto(p)} — ${numero(p.total)} chamada(s)${p.erros ? `, ${numero(p.erros)} com erro` : ""}`;
    const r = coluna.getBoundingClientRect();
    const g = grafico.getBoundingClientRect();
    const barra = coluna.firstChild.getBoundingClientRect();
    dica.style.left = `${Math.min(Math.max(r.left - g.left + r.width / 2, 90), g.width - 90)}px`;
    dica.style.top = `${barra.top - g.top}px`;
    dica.hidden = false;
  };

  pontos.forEach((p) => {
    const altura = p.total ? Math.max(2, (p.total / maximo) * 100) : 0;
    const barra = el("span");
    barra.style.height = `${altura}%`;
    const coluna = el("div", { classe: "coluna", tabIndex: 0, "aria-label": `${rotuloPonto(p)}: ${numero(p.total)} chamada(s), ${numero(p.erros)} com erro` }, barra);
    coluna.addEventListener("mouseenter", () => mostrar(coluna, p));
    coluna.addEventListener("focus", () => mostrar(coluna, p));
    coluna.addEventListener("mouseleave", () => { dica.hidden = true; });
    coluna.addEventListener("blur", () => { dica.hidden = true; });
    area.append(coluna);
  });

  const eixo = el("div", { classe: "eixo", "aria-hidden": "true" }, [
    el("span", { texto: pontos.length ? rotuloPonto(pontos[0]) : "" }),
    el("span", { texto: pontos.length ? rotuloPonto(pontos[pontos.length - 1]) : "" })
  ]);

  /* A mesma informação em tabela, para quem não lê gráfico. */
  const tabela = tabelaSimples(
    [porDia ? "Dia" : "Hora", "Chamadas", "Com erro"],
    pontos.filter((p) => p.total).map((p) => [rotuloPonto(p), numero(p.total), numero(p.erros)]),
    [false, true, true]
  );
  const alt = el("details", { classe: "alt" }, [el("summary", { texto: "Ver em tabela" }), tabela || el("p", { classe: "vazio", texto: "Nenhuma chamada no período." })]);

  $("grafico").replaceChildren(
    total ? grafico : el("p", { classe: "vazio", texto: "Nenhuma chamada no período." }),
    total ? eixo : null,
    total ? alt : null
  );
}

/* ---------------------------------------------------------------------
   Tabelas
   --------------------------------------------------------------------- */
function tabelaSimples(cabecalho, linhas, numericas = [], classesExtras = []) {
  if (!linhas.length) return null;
  return el("div", { classe: "tabela-wrap" }, el("table", {}, [
    el("thead", {}, el("tr", {}, cabecalho.map((t, i) => el("th", { scope: "col", texto: t, classe: numericas[i] ? "num" : null })))),
    el("tbody", {}, linhas.map((l) => el("tr", {}, l.map((t, i) => el("td", { texto: t, classe: [numericas[i] ? "num" : "", classesExtras[i] || ""].join(" ").trim() || null })))))
  ]));
}

/* Por rota cabem todas as colunas; por API pública, que fica na coluna
   estreita, só o que importa sobre uma fonte externa: volume, falha,
   lentidão e quanto o cache poupou (recusa e p50 não dizem nada dela). */
function montarGrupos(alvo, grupos, rotuloNome, vazio, compacto = false) {
  const colunas = compacto
    ? [[rotuloNome, (g) => g.nome, false], ["Chamadas", (g) => numero(g.total), true], ["Erros", (g) => numero(g.erros), true], ["p95", (g) => tempo(g.p95), true], ["Cache", (g) => pct(g.cache), true]]
    : [[rotuloNome, (g) => g.nome, false], ["Chamadas", (g) => numero(g.total), true], ["Erros", (g) => numero(g.erros), true], ["Recusas", (g) => numero(g.recusas), true], ["p50", (g) => tempo(g.p50), true], ["p95", (g) => tempo(g.p95), true], ["Cache", (g) => pct(g.cache), true]];
  const t = tabelaSimples(
    colunas.map((c) => c[0]),
    grupos.map((g) => colunas.map((c) => c[1](g))),
    colunas.map((c) => c[2]),
    [compacto ? "" : "rota"]
  );
  $(alvo).replaceChildren(t || el("p", { classe: "vazio", texto: vazio }));
}

function montarUltimas(chamadas) {
  const t = tabelaSimples(
    ["Quando", "Rota", "Status", "Tempo", "Fonte", "Cache", "Acesso"],
    chamadas.map((c) => [
      quando(c.em), `${c.metodo} ${c.rota}`, String(c.status), tempo(c.ms),
      c.fonte || "—", c.cache === null || c.cache === undefined ? "—" : (c.cache ? "sim" : "não"),
      c.acesso === "chave" ? "chave" : c.acesso === "sessao" ? "sessão" : "—"
    ]),
    [false, false, true, true, false, false, false],
    ["", "rota"]
  );
  $("ultimas").replaceChildren(t || el("p", { classe: "vazio", texto: "Nenhuma chamada registrada ainda." }));
}

/* ---------------------------------------------------------------------
   Carregar
   --------------------------------------------------------------------- */
async function carregar() {
  const horas = Number($("periodo").value);
  const botao = $("btnAtualizar");
  botao.disabled = true;
  const opcoes = { aoDemorar: () => controleAcesso?.aviso("info", MENSAGEM_DEMORA) };
  const [resumo, ultimas] = await Promise.all([
    chamarApi("GET", `/v1/painel/resumo?horas=${horas}`, opcoes),
    chamarApi("GET", "/v1/painel/chamadas?limite=30", opcoes)
  ]);
  botao.disabled = false;
  controleAcesso?.aviso(null);

  if (resumo.status !== 200 || !resumo.dados?.ok) {
    const motivo = resumo.falhaRede || resumo.dados?.error || `A API respondeu ${resumo.status}.`;
    controleAcesso?.aviso("erro", `Não foi possível ler o painel: ${motivo}`);
    return;
  }
  const r = resumo.dados;
  $("origem").replaceChildren(
    document.createTextNode("Histórico guardado em: "), el("strong", { texto: r.armazenamento }),
    document.createTextNode(`. Desde ${quando(r.desde)}.`)
  );
  montarTiles(r.geral);
  montarGrafico(r.porHora, horas);
  montarGrupos("porRota", r.porRota, "Rota", "Nenhuma chamada no período.");
  montarGrupos("porFonte", r.porFonte, "Fonte", "Nenhuma consulta a API pública no período.", true);
  montarUltimas(ultimas.dados?.chamadas || []);
}

document.addEventListener("DOMContentLoaded", () => {
  $("btnAtualizar").addEventListener("click", carregar);
  $("periodo").addEventListener("change", carregar);
  controleAcesso = iniciarAcessoAdmin({
    aoLiberar: () => { $("painel").hidden = false; carregar(); },
    aoFechar: () => { $("painel").hidden = true; }
  });
});
