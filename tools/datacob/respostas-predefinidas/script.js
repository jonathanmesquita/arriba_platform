/* =====================================================================
   Respostas Predefinidas - Arriba Platform

   Biblioteca de respostas prontas para tickets DataCob. Consome a MESMA
   fonte de dados usada pela aba "Respostas Prontas" do Support Copilot
   (assets/data/respostas-predefinidas.js) — editar esse arquivo atualiza
   as duas telas, nada aqui duplica conteudo.
   ===================================================================== */

import { RESPOSTAS_PREDEFINIDAS } from "../../../assets/data/respostas-predefinidas.js";

let grupoAtual = "todos";
let buscaAtiva = "";

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderGrupos() {
  const container = document.getElementById("listaGrupos");
  const totalGeral = RESPOSTAS_PREDEFINIDAS.reduce((sum, g) => sum + g.respostas.length, 0);
  const chips = [{ id: "todos", nome: "Todos", icone: "🗂️", total: totalGeral }, ...RESPOSTAS_PREDEFINIDAS.map((g) => ({ ...g, total: g.respostas.length }))];

  container.innerHTML = chips.map((grupo) => `
    <button type="button" class="side-item ${grupo.id === grupoAtual ? "active" : ""}" data-grupo="${escapeHtml(grupo.id)}">
      <span>${escapeHtml(grupo.icone || "")}</span>
      <span>${escapeHtml(grupo.nome)}</span>
      <span class="count">${grupo.total}</span>
    </button>
  `).join("");

  container.querySelectorAll("[data-grupo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      grupoAtual = btn.dataset.grupo;
      renderGrupos();
      renderRespostas();
    });
  });
}

function renderRespostas() {
  const target = document.getElementById("listaRespostas");
  const query = normalizeText(buscaAtiva);

  const grupos = grupoAtual === "todos"
    ? RESPOSTAS_PREDEFINIDAS
    : RESPOSTAS_PREDEFINIDAS.filter((g) => g.id === grupoAtual);

  const cards = [];
  grupos.forEach((grupo) => {
    grupo.respostas.forEach((resposta) => {
      if (query) {
        const haystack = normalizeText(`${resposta.titulo} ${resposta.mensagem} ${grupo.nome}`);
        if (!haystack.includes(query)) return;
      }
      cards.push({ grupo, resposta });
    });
  });

  if (!cards.length) {
    target.innerHTML = `
      <div class="empty-msg">
        <i class="fa-solid fa-magnifying-glass"></i>
        Nenhuma resposta encontrada para esse filtro.
      </div>`;
    return;
  }

  target.innerHTML = cards.map(({ grupo, resposta }) => `
    <article class="resposta-card">
      <span class="grupo-tag">${escapeHtml(grupo.icone || "")} ${escapeHtml(grupo.nome)}</span>
      <h3>${escapeHtml(resposta.titulo)}</h3>
      <p class="resposta-msg">${escapeHtml(resposta.mensagem)}</p>
      <button type="button" class="btn-arriba btn-dark-arriba" data-copiar="${escapeHtml(grupo.id)}:${escapeHtml(resposta.id)}">
        <i class="fa-regular fa-copy me-2"></i>Copiar
      </button>
    </article>
  `).join("");

  target.querySelectorAll("[data-copiar]").forEach((btn) => {
    btn.addEventListener("click", () => copiarResposta(btn));
  });
}

function findResposta(grupoId, respostaId) {
  const grupo = RESPOSTAS_PREDEFINIDAS.find((g) => g.id === grupoId);
  return grupo?.respostas.find((r) => r.id === respostaId) || null;
}

async function copiarResposta(btn) {
  const [grupoId, respostaId] = btn.dataset.copiar.split(":");
  const resposta = findResposta(grupoId, respostaId);
  if (!resposta) return;

  try {
    await navigator.clipboard.writeText(resposta.mensagem);
    const original = btn.innerHTML;
    btn.classList.add("copiado");
    btn.innerHTML = `<i class="fa-solid fa-check me-2"></i>Copiado!`;
    setTimeout(() => {
      btn.classList.remove("copiado");
      btn.innerHTML = original;
    }, 1600);
  } catch {
    alert("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
  }
}

document.getElementById("buscaInput").addEventListener("input", (e) => {
  buscaAtiva = e.target.value;
  renderRespostas();
});

renderGrupos();
renderRespostas();
