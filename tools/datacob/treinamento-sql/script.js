/* =====================================================================
   Track 7 - Treinamento SQL (Arriba Platform)

   Player de licoes generico (nao acopla nada especifico do Track 7 alem
   dos dados importados) + sandbox SQL via AlaSQL rodando 100% no
   navegador contra um dataset FICTICIO (nenhuma conexao com o SQL
   Server real do DataCob). Gamificacao (pontos/badges/progresso) via
   assets/js/gamification.js, generica e reutilizavel por outras trilhas.
   ===================================================================== */

import { TRACK_7_LICOES, TRACK_7_SECOES, TRACK_7_BADGES, RAFAEL, encontrarLicao } from "../../../assets/data/tracks/track-7-sql.js";
import { BOLETOS_DEMO, REMESSAS_DEMO, RETORNOS_DEMO } from "../../../assets/data/tracks/track-7-sql-dataset.js";
import {
  getProgress, marcarLicaoConcluida, licaoConcluida, registrarQuiz,
  verificarBadges, badgeDesbloqueado, calcularPercentualConcluido
} from "../../../assets/js/gamification.js";

const TRACK_ID = "track-7-sql";
let licaoAtualId = TRACK_7_LICOES[0].id;

function seedSandbox() {
  try {
    alasql("SELECT * INTO boletos FROM ?", [BOLETOS_DEMO]);
    alasql("SELECT * INTO remessas FROM ?", [REMESSAS_DEMO]);
    alasql("SELECT * INTO retornos FROM ?", [RETORNOS_DEMO]);
  } catch (error) {
    console.warn("Sandbox SQL (AlaSQL) ja estava semeado ou falhou ao iniciar.", error);
  }
}

function executarSql(sql) {
  try {
    const resultado = alasql(sql);
    return { linhas: Array.isArray(resultado) ? resultado : [], erro: null };
  } catch (error) {
    return { linhas: null, erro: error.message || String(error) };
  }
}

function formatarResultado(linhas) {
  if (!linhas.length) return "(0 linhas)";
  const colunas = Object.keys(linhas[0]);
  const larguras = colunas.map((c) => Math.max(c.length, ...linhas.map((l) => String(l[c] ?? "").length)));
  const linhaTexto = (valores) => valores.map((v, i) => String(v ?? "").padEnd(larguras[i])).join(" | ");
  const cabecalho = linhaTexto(colunas);
  const separador = larguras.map((w) => "-".repeat(w)).join("-+-");
  const corpo = linhas.map((l) => linhaTexto(colunas.map((c) => l[c]))).join("\n");
  return `${cabecalho}\n${separador}\n${corpo}\n\n(${linhas.length} linha${linhas.length === 1 ? "" : "s"})`;
}

function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

/* ---------------------------------------------------------------------
   Sidebar: progresso, lista de licoes, badges
   --------------------------------------------------------------------- */
function renderProgressoSidebar() {
  const progress = getProgress(TRACK_ID);
  const percentual = calcularPercentualConcluido(TRACK_ID, TRACK_7_LICOES.length);
  document.getElementById("sbPontos").textContent = progress.pontos;
  document.getElementById("sbBarra").style.width = `${percentual}%`;
  document.getElementById("sbPercentual").textContent = `${percentual}% concluído`;
}

function renderListaLicoes() {
  const container = document.getElementById("listaLicoes");
  container.innerHTML = TRACK_7_SECOES.map((secao) => `
    <p class="secao-nome">${escapeHtml(secao.nome)}</p>
    ${secao.licoes.map((id) => {
      const licao = encontrarLicao(id);
      if (!licao) return "";
      const concluida = licaoConcluida(TRACK_ID, id);
      return `
        <button type="button" class="licao-item ${id === licaoAtualId ? "active" : ""} ${concluida ? "concluida" : ""}" data-licao="${id}">
          <span class="check">${concluida ? "✓" : "○"}</span>
          <span>${escapeHtml(licao.titulo)}</span>
          <span class="num">${id}</span>
        </button>`;
    }).join("")}
  `).join("");

  container.querySelectorAll("[data-licao]").forEach((btn) => {
    btn.addEventListener("click", () => selecionarLicao(btn.dataset.licao));
  });
}

function renderListaBadges() {
  const container = document.getElementById("listaBadges");
  container.innerHTML = TRACK_7_BADGES.map((badge) => {
    const unlocked = badgeDesbloqueado(TRACK_ID, badge.id);
    return `<div class="badge-icon ${unlocked ? "unlocked" : ""}" title="${escapeHtml(badge.nome)}${unlocked ? "" : " (bloqueado)"}">${badge.emoji}</div>`;
  }).join("");
}

function atualizarSidebar() {
  renderProgressoSidebar();
  renderListaLicoes();
  renderListaBadges();
}

/* ---------------------------------------------------------------------
   Área principal: render de uma lição
   --------------------------------------------------------------------- */
function selecionarLicao(id) {
  const licao = encontrarLicao(id);
  if (!licao) return;
  licaoAtualId = id;
  atualizarSidebar();
  renderLicao(licao);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderLicao(licao) {
  const area = document.getElementById("lessonArea");
  const indiceAtual = TRACK_7_LICOES.findIndex((l) => l.id === licao.id);
  const anterior = TRACK_7_LICOES[indiceAtual - 1];
  const proxima = TRACK_7_LICOES[indiceAtual + 1];

  area.innerHTML = `
    <section class="panel card-section">
      <h2>${escapeHtml(licao.id)} — ${escapeHtml(licao.titulo)}</h2>
      <p class="licao-meta">⏱ ${licao.tempoMin} min · <strong>+${licao.pontosLicao} pts</strong> ao concluir${licao.pontosQuizBonus ? ` · +${licao.pontosQuizBonus} pts com quiz 100%` : ""}</p>
      <p>${escapeHtml(licao.introducao)}</p>
    </section>

    ${licao.conceitos.map((c) => `
      <section class="panel card-section">
        <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 10px">${escapeHtml(c.titulo)}</h3>
        <pre class="code-block">${escapeHtml(c.codigo)}</pre>
        <p style="color:var(--muted);margin-top:10px;line-height:1.55">${escapeHtml(c.explicacao)}</p>
      </section>
    `).join("")}

    <section class="panel card-section">
      <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 6px">🧪 Try it yourself</h3>
      <p style="color:var(--muted);margin:0 0 12px">${escapeHtml(licao.tryIt.descricao)}</p>
      <textarea class="sql-editor" id="sqlEditor">${escapeHtml(licao.tryIt.query)}</textarea>
      <div class="actions">
        <button type="button" class="btn-arriba btn-red-arriba" id="btnExecutar"><i class="fa-solid fa-play me-2"></i>Executar</button>
        <button type="button" class="btn-arriba btn-light-arriba" id="btnResetQuery">Restaurar exemplo</button>
      </div>
      <pre class="sql-result" id="sqlResultado">Clique em Executar para ver o resultado.</pre>
      ${licao.tryIt.notaSimulador ? `<div class="sim-nota">ℹ️ ${escapeHtml(licao.tryIt.notaSimulador)}</div>` : ""}
    </section>

    ${licao.quiz.length ? `
      <section class="panel card-section">
        <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 12px">📋 Quiz</h3>
        <div id="quizArea">${licao.quiz.map((q, i) => renderQuizItem(q, i)).join("")}</div>
        <div class="actions">
          <button type="button" class="btn-arriba btn-dark-arriba" id="btnCorrigirQuiz">Corrigir quiz</button>
        </div>
        <div class="validation-msg hidden" id="quizMsg"></div>
      </section>
    ` : ""}

    ${licao.exercicios.length ? `
      <section class="panel card-section">
        <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 12px">✍️ Exercícios</h3>
        ${licao.exercicios.map((ex, i) => `
          <div class="exercicio-item">
            <p class="enunciado">${i + 1}. ${escapeHtml(ex.enunciado)}</p>
            <details class="solucao">
              <summary>Ver solução</summary>
              <pre class="code-block">${escapeHtml(ex.solucao)}</pre>
            </details>
            <button type="button" class="btn-arriba btn-light-arriba btn-testar-solucao" data-solucao="${escapeHtml(ex.solucao)}" style="margin-top:8px">
              <i class="fa-solid fa-flask me-2"></i>Testar no sandbox
            </button>
          </div>
        `).join("")}
      </section>
    ` : ""}

    <section class="panel card-section">
      <div class="rafael-card">
        <div class="rafael-avatar">R</div>
        <div class="rafael-bubble"><strong>${escapeHtml(RAFAEL.nome)}:</strong> ${escapeHtml(licao.rafael)}</div>
      </div>
    </section>

    <section class="panel card-section">
      <div class="actions">
        <button type="button" class="btn-arriba btn-outline-arriba" id="btnAnterior" ${anterior ? "" : "disabled"}>← ${anterior ? escapeHtml(anterior.titulo) : "Início"}</button>
        <button type="button" class="btn-arriba btn-red-arriba" id="btnConcluir"><i class="fa-solid fa-check me-2"></i>Concluir lição</button>
        <button type="button" class="btn-arriba btn-outline-arriba" id="btnProxima" ${proxima ? "" : "disabled"}>${proxima ? escapeHtml(proxima.titulo) : "Fim do track"} →</button>
      </div>
      <div class="celebracao hidden" id="celebracaoMsg"></div>
    </section>
  `;

  wireLicaoEvents(licao, anterior, proxima);
}

function renderQuizItem(pergunta, indice) {
  return `
    <div class="quiz-item" data-quiz-index="${indice}">
      <p class="pergunta">${indice + 1}. ${escapeHtml(pergunta.pergunta)}</p>
      ${pergunta.opcoes.map((opcao, oi) => `
        <label class="quiz-opcao">
          <input type="radio" name="quiz-${indice}" value="${oi}">
          <span>${escapeHtml(opcao)}</span>
        </label>
      `).join("")}
      <div class="quiz-explicacao">${escapeHtml(pergunta.explicacao)}</div>
    </div>
  `;
}

function wireLicaoEvents(licao, anterior, proxima) {
  const editor = document.getElementById("sqlEditor");
  const resultado = document.getElementById("sqlResultado");

  document.getElementById("btnExecutar")?.addEventListener("click", () => {
    const { linhas, erro } = executarSql(editor.value);
    resultado.textContent = erro ? `Erro: ${erro}` : formatarResultado(linhas);
  });

  document.getElementById("btnResetQuery")?.addEventListener("click", () => {
    editor.value = licao.tryIt.query;
    resultado.textContent = "Clique em Executar para ver o resultado.";
  });

  document.querySelectorAll(".btn-testar-solucao").forEach((btn) => {
    btn.addEventListener("click", () => {
      editor.value = btn.dataset.solucao;
      const { linhas, erro } = executarSql(editor.value);
      resultado.textContent = erro ? `Erro: ${erro}` : formatarResultado(linhas);
      editor.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  document.getElementById("btnCorrigirQuiz")?.addEventListener("click", () => corrigirQuiz(licao));
  document.getElementById("btnAnterior")?.addEventListener("click", () => anterior && selecionarLicao(anterior.id));
  document.getElementById("btnProxima")?.addEventListener("click", () => proxima && selecionarLicao(proxima.id));
  document.getElementById("btnConcluir")?.addEventListener("click", () => concluirLicao(licao));
}

function corrigirQuiz(licao) {
  let acertos = 0;
  licao.quiz.forEach((pergunta, indice) => {
    const item = document.querySelector(`.quiz-item[data-quiz-index="${indice}"]`);
    const marcado = item.querySelector(`input[name="quiz-${indice}"]:checked`);
    const correta = marcado && Number(marcado.value) === pergunta.respostaIndex;
    item.classList.remove("correto", "incorreto");
    item.classList.add("revelado", correta ? "correto" : "incorreto");
    if (correta) acertos += 1;
  });

  const total = licao.quiz.length;
  registrarQuiz(TRACK_ID, licao.id, acertos, total, licao.pontosQuizBonus || 0);
  atualizarSidebar();

  const msg = document.getElementById("quizMsg");
  msg.classList.remove("hidden", "ok", "error");
  if (acertos === total) {
    msg.classList.add("ok");
    msg.textContent = `${acertos}/${total} corretas — 100%! +${licao.pontosQuizBonus || 0} pts de bônus.`;
  } else {
    msg.classList.add("error");
    msg.textContent = `${acertos}/${total} corretas. Reveja as explicações destacadas e tente de novo.`;
  }
}

function concluirLicao(licao) {
  marcarLicaoConcluida(TRACK_ID, licao.id, licao.pontosLicao);
  const badgesNovos = verificarBadges(TRACK_ID, TRACK_7_BADGES);
  atualizarSidebar();

  const celebracao = document.getElementById("celebracaoMsg");
  celebracao.classList.remove("hidden");
  celebracao.textContent = badgesNovos.length
    ? `🎉 Lição concluída! Badge${badgesNovos.length > 1 ? "s" : ""} desbloqueado${badgesNovos.length > 1 ? "s" : ""}: ${badgesNovos.map((b) => `${b.emoji} ${b.nome}`).join(", ")}`
    : "🎉 Lição concluída! Pontos somados ao seu progresso no Track 7.";
}

/* ---------------------------------------------------------------------
   Init
   --------------------------------------------------------------------- */
seedSandbox();
atualizarSidebar();
renderLicao(encontrarLicao(licaoAtualId));
