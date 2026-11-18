/* Tela do CNAB 240: lê o texto, chama a análise estrutural e desenha o
   resultado. A lógica fica em validacao240.js (com teste); aqui só DOM.
   Conteúdo do arquivo entra por textContent, nunca innerHTML. */
import { analisar240, NOME_TIPO, TAMANHO_240 } from "./validacao240.js";

const $ = (id) => document.getElementById(id);

function el(tag, { texto, classe, attrs } = {}, filhos = []) {
  const n = document.createElement(tag);
  if (texto !== undefined) n.textContent = texto;
  if (classe) n.className = classe;
  if (attrs) for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  filhos.forEach((f) => n.appendChild(f));
  return n;
}

function selo(tipo, icone, texto) {
  const s = el("span", { classe: "selo", attrs: { "data-tipo": tipo } });
  s.appendChild(el("i", { classe: `fa-solid ${icone}`, attrs: { "aria-hidden": "true" } }));
  s.appendChild(document.createTextNode(texto));
  return s;
}

function setStatus(texto, tipo) {
  const s = $("status240");
  s.textContent = texto;
  if (tipo) s.setAttribute("data-tipo", tipo); else s.removeAttribute("data-tipo");
}

function lista(titulo, tipo, problemas) {
  const caixa = el("div", { classe: "item", attrs: { "data-tipo": tipo } });
  const topo = el("div", { classe: "item-topo" });
  topo.appendChild(el("span", { classe: "item-nome", texto: titulo }));
  caixa.appendChild(topo);
  const ul = el("ul");
  problemas.forEach((p) => ul.appendChild(el("li", { texto: p.mensagem })));
  caixa.appendChild(ul);
  return caixa;
}

function tabelaLotes(lotes) {
  if (!lotes.length) return el("p", { classe: "dica", texto: "Nenhum lote encontrado." });
  const t = el("table", { classe: "tabela" });
  const cab = el("tr");
  ["Lote", "Linhas", "Detalhes", "Segmentos"].forEach((c) => cab.appendChild(el("th", { texto: c, attrs: { scope: "col" } })));
  t.appendChild(el("thead", {}, [cab]));
  const corpo = el("tbody");
  lotes.forEach((l) => {
    const seg = Object.entries(l.segmentos).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—";
    const fim = l.linhaFim ? `${l.linhaInicio}–${l.linhaFim}` : `${l.linhaInicio}–?`;
    const tr = el("tr");
    [l.numero, fim, String(l.detalhes), seg].forEach((v, i) => tr.appendChild(el("td", { texto: v, classe: i ? "" : "mono" })));
    corpo.appendChild(tr);
  });
  t.appendChild(corpo);
  return t;
}

function mostrar(r) {
  $("resultado240").classList.remove("hidden");

  const selos = $("selos240");
  selos.replaceChildren();
  if (!r.erros.length && !r.avisos.length) selos.appendChild(selo("ok", "fa-circle-check", "Estrutura sem problemas"));
  if (r.erros.length) selos.appendChild(selo("erro", "fa-circle-xmark", `${r.erros.length} ${r.erros.length === 1 ? "erro" : "erros"}`));
  if (r.avisos.length) selos.appendChild(selo("aviso", "fa-triangle-exclamation", `${r.avisos.length} ${r.avisos.length === 1 ? "aviso" : "avisos"}`));

  const dados = el("dl", { classe: "dados" });
  const par = (rot, val) => { dados.appendChild(el("dt", { texto: rot })); dados.appendChild(el("dd", { texto: val })); };
  par("Linhas", String(r.totalLinhas));
  par("Banco (posições 1–3)", r.banco || "não identificado");
  par("Lotes", String(r.lotes.length));
  par("Registros por tipo", Object.entries(r.porTipo).map(([t, q]) => `${NOME_TIPO[t] || `tipo ${t}`}: ${q}`).join(" · "));
  $("resumo240").replaceChildren(dados);

  const listas = $("listas240");
  listas.replaceChildren();
  if (r.erros.length) listas.appendChild(lista("Erros — o arquivo está errado nestes pontos", "erro", r.erros));
  if (r.avisos.length) listas.appendChild(lista("Avisos — provável problema; confira com o manual do banco", "aviso", r.avisos));
  $("lotes240").replaceChildren(el("h3", { texto: "Lotes", classe: "descricao" }), tabelaLotes(r.lotes));
}

function conferir() {
  const texto = $("texto240").value;
  if (!texto.trim()) { setStatus("Cole o conteúdo ou envie um arquivo.", "erro"); $("resultado240").classList.add("hidden"); return; }
  try {
    const r = analisar240(texto);
    mostrar(r);
    setStatus(r.erros.length ? `Conferido: ${r.erros.length} erro(s) de estrutura.` : "Conferido: nenhum erro de estrutura.", r.erros.length ? "erro" : "ok");
  } catch (e) {
    $("resultado240").classList.add("hidden");
    setStatus(e.message, "erro");
  }
}

/* Exemplo SÓ DE ESTRUTURA: os campos de dentro dos segmentos ficam em branco
   porque o projeto não os conhece. Banco "000": não é de nenhum banco. */
function exemploEstrutural() {
  const num = (v, t) => String(v).padStart(t, "0");
  const linha = ({ lote = "0001", tipo, seq, segmento, qtd, qtdLotes, qtdRegistros }) => {
    const l = Array(TAMANHO_240).fill(" ");
    const poe = (ini, t) => [...t].forEach((c, i) => { l[ini - 1 + i] = c; });
    poe(1, "000"); poe(4, lote); poe(8, String(tipo));
    if (tipo === 3) { poe(9, num(seq, 5)); poe(14, segmento); }
    if (tipo === 5) poe(18, num(qtd, 6));
    if (tipo === 9) { poe(18, num(qtdLotes, 6)); poe(24, num(qtdRegistros, 6)); }
    return l.join("");
  };
  return [
    linha({ lote: "0000", tipo: 0 }),
    linha({ tipo: 1 }),
    linha({ tipo: 3, seq: 1, segmento: "P" }),
    linha({ tipo: 3, seq: 2, segmento: "Q" }),
    linha({ tipo: 5, qtd: 4 }),
    linha({ lote: "9999", tipo: 9, qtdLotes: 1, qtdRegistros: 6 }),
  ].join("\n");
}

$("btnValidar240").addEventListener("click", conferir);
$("btnLimpar240").addEventListener("click", () => {
  $("texto240").value = "";
  $("arquivo240").value = "";
  $("resultado240").classList.add("hidden");
  setStatus("");
});
$("btnExemplo240").addEventListener("click", () => {
  $("texto240").value = exemploEstrutural();
  conferir();
});
$("arquivo240").addEventListener("change", (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = () => { $("texto240").value = leitor.result; conferir(); };
  leitor.onerror = () => setStatus("Não foi possível ler o arquivo.", "erro");
  leitor.readAsText(arquivo, "ISO-8859-1"); // arquivo de banco é ASCII/Latin-1
});
