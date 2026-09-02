/* =====================================================================
   SQL Playground DataCob (Arriba Platform)

   Simulador SQL livre: roda AlaSQL 100% no navegador contra o dataset
   FICTÍCIO com o schema real do DataCob (assets/data/datacob-sandbox-schema.js).
   Nenhuma conexão com o SQL Server real — igual ao sandbox do Track 7.

   Histórico, consultas salvas e estatísticas vêm do módulo genérico
   assets/js/sql-query-store.js (localStorage, sem backend).

   O navegador de tabelas é montado a partir de DATACOB_SCHEMA — fonte
   única do schema; nada de lista de tabelas hard-coded aqui.
   ===================================================================== */

import { DATACOB_SCHEMA, CONSULTAS_EXEMPLO } from "../../../assets/data/datacob-sandbox-schema.js";
import { semearTabelas, executarQuery } from "../../../assets/js/sql-sandbox.js";
import {
  registrarExecucao, getHistorico, limparHistorico,
  salvarConsulta, getConsultasSalvas, removerConsulta,
  getEstatisticas
} from "../../../assets/js/sql-query-store.js";

const TOOL_ID = "sql-playground";

// Último resultado bem-sucedido, para o export CSV.
let ultimoResultado = null;

/* ---------------------------------------------------------------------
   Sandbox AlaSQL
   --------------------------------------------------------------------- */

// Semeadura via módulo compartilhado (assets/js/sql-sandbox.js) — é lá que
// mora o "como criar tabela no AlaSQL 4", junto com o motivo.
function seedSandbox() {
  const { falhas } = semearTabelas(DATACOB_SCHEMA);
  if (falhas.length) {
    // Falha aqui deixaria toda consulta respondendo "Table does not exist",
    // então avisa na tela em vez de morrer em silêncio no console.
    setMsg(
      `Não foi possível preparar o banco de treino (${falhas.map((f) => f.tabela).join(", ")}). Recarregue a página.`,
      "error"
    );
  }
}

/* ---------------------------------------------------------------------
   Render de resultado
   --------------------------------------------------------------------- */

function renderResultTable(linhas) {
  if (!linhas.length) return `<p class="sql-empty">Consulta executada — 0 linhas retornadas.</p>`;
  const colunas = Object.keys(linhas[0]);
  const cabecalho = `<tr>${colunas.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;
  const corpo = linhas
    .map((linha) => `<tr>${colunas.map((c) => `<td>${escapeHtml(formatarValor(linha[c]))}</td>`).join("")}</tr>`)
    .join("");
  return `
    <div class="sql-result-meta">Número de registros: <strong>${linhas.length}</strong></div>
    <div class="table-wrap"><table class="preview-table"><thead>${cabecalho}</thead><tbody>${corpo}</tbody></table></div>
  `;
}

function formatarValor(valor) {
  if (valor === null || valor === undefined) return "NULL";
  if (typeof valor === "number") {
    return Number.isInteger(valor) ? String(valor) : valor.toFixed(2).replace(".", ",");
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function setMsg(texto, tipo) {
  const el = document.getElementById("editorMsg");
  if (!texto) {
    el.classList.add("hidden");
    return;
  }
  el.className = "validation-msg" + (tipo ? ` ${tipo}` : "");
  el.textContent = texto;
}

/* ---------------------------------------------------------------------
   Navegador de schema (sidebar)
   --------------------------------------------------------------------- */

function renderSchemaBrowser() {
  const container = document.getElementById("schemaBrowser");
  const grupos = [
    { origem: "Cob", rotulo: "Cob · cobrança" },
    { origem: "Par", rotulo: "Par · cadastro/parâmetros" }
  ];

  container.innerHTML = grupos.map(({ origem, rotulo }) => {
    const tabelas = DATACOB_SCHEMA.filter((t) => t.origem === origem);
    if (!tabelas.length) return "";
    return `
      <p class="schema-group">${escapeHtml(rotulo)}</p>
      ${tabelas.map((t) => renderSchemaTable(t)).join("")}
    `;
  }).join("");

  container.querySelectorAll("[data-select-table]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabela = btn.dataset.selectTable;
      carregarNoEditor(`SELECT * FROM ${tabela};`);
      rodarDoEditor();
    });
  });

  container.querySelectorAll("[data-count-table]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabela = btn.dataset.countTable;
      // "Total" é palavra reservada no parser do AlaSQL — usar outro alias.
      carregarNoEditor(`SELECT COUNT(*) AS Qtd_Linhas FROM ${tabela};`);
      rodarDoEditor();
    });
  });
}

function renderSchemaTable(t) {
  const fkPorColuna = {};
  (t.fks || []).forEach((fk) => { fkPorColuna[fk.coluna] = fk.referencia; });

  return `
    <details class="schema-table">
      <summary>
        <span>${escapeHtml(t.tabela)}</span>
        <span class="qtd">${t.dados.length} linhas</span>
      </summary>
      <div class="schema-body">
        <p class="schema-desc">${escapeHtml(t.descricao)}</p>
        ${t.colunas.map((col) => {
          const tags = [];
          if (col === t.pk) tags.push('<span class="tag tag-pk">PK</span>');
          if (fkPorColuna[col]) tags.push(`<span class="tag tag-fk" title="→ ${escapeHtml(fkPorColuna[col])}">FK</span>`);
          return `<div class="schema-col">${tags.join("")}<span>${escapeHtml(col)}</span></div>`;
        }).join("")}
        <div class="schema-actions">
          <button type="button" class="mini-btn" data-select-table="${escapeHtml(t.tabela)}">SELECT *</button>
          <button type="button" class="mini-btn" data-count-table="${escapeHtml(t.tabela)}">COUNT(*)</button>
        </div>
      </div>
    </details>
  `;
}

/* ---------------------------------------------------------------------
   Exemplos prontos
   --------------------------------------------------------------------- */

function renderExemplos() {
  const grid = document.getElementById("exemplosGrid");
  grid.innerHTML = CONSULTAS_EXEMPLO.map((ex) => `
    <button type="button" class="exemplo-card" data-exemplo="${escapeHtml(ex.id)}">
      <strong>${escapeHtml(ex.titulo)}</strong>
      <span>${escapeHtml(ex.descricao)}</span>
    </button>
  `).join("");

  grid.querySelectorAll("[data-exemplo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const exemplo = CONSULTAS_EXEMPLO.find((e) => e.id === btn.dataset.exemplo);
      if (!exemplo) return;
      carregarNoEditor(exemplo.sql);
      document.getElementById("nomeConsulta").value = "";
      rodarDoEditor();
      document.getElementById("sqlEditor").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

/* ---------------------------------------------------------------------
   Editor + execução
   --------------------------------------------------------------------- */

function carregarNoEditor(sql) {
  document.getElementById("sqlEditor").value = sql;
}

function rodarDoEditor() {
  const sql = document.getElementById("sqlEditor").value.trim();
  const resultadoEl = document.getElementById("sqlResultado");

  if (!sql) {
    setMsg("Escreva uma consulta antes de executar.", "error");
    return;
  }
  setMsg("");

  const { linhas, erro, duracaoMs } = executarQuery(sql);

  if (erro) {
    ultimoResultado = null;
    document.getElementById("btnExportarCsv").disabled = true;
    resultadoEl.innerHTML = `<p class="sql-error">Erro: ${escapeHtml(erro)}</p>`;
  } else {
    ultimoResultado = linhas;
    document.getElementById("btnExportarCsv").disabled = linhas.length === 0;
    resultadoEl.innerHTML = `
      ${renderResultTable(linhas)}
      <div class="sql-result-meta" style="margin-top:8px">Tempo de execução: ${duracaoMs} ms</div>
    `;
  }

  registrarExecucao(TOOL_ID, {
    sql,
    ok: !erro,
    linhas: linhas ? linhas.length : 0,
    erro,
    duracaoMs
  });

  renderHistorico();
  renderStats();
}

/* ---------------------------------------------------------------------
   Consultas salvas
   --------------------------------------------------------------------- */

function renderSalvas() {
  const container = document.getElementById("listaSalvas");
  const salvas = getConsultasSalvas(TOOL_ID);

  if (!salvas.length) {
    container.innerHTML = `<p class="lista-vazia">Nenhuma consulta salva ainda. Escreva uma consulta, dê um nome e clique em "Salvar consulta".</p>`;
    return;
  }

  container.innerHTML = salvas
    .slice()
    .sort((a, b) => String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)))
    .map((c) => `
      <div class="lista-item">
        <div class="meta">
          <strong style="color:var(--ink);font-size:.88rem">${escapeHtml(c.nome)}</strong>
          <span>salva em ${formatarData(c.atualizadoEm)}</span>
        </div>
        <pre>${escapeHtml(c.sql)}</pre>
        <div class="row-actions">
          <button type="button" class="mini-btn" data-carregar-salva="${escapeHtml(c.id)}">Carregar no editor</button>
          <button type="button" class="mini-btn danger" data-remover-salva="${escapeHtml(c.id)}">Remover</button>
        </div>
      </div>
    `).join("");

  container.querySelectorAll("[data-carregar-salva]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const consulta = getConsultasSalvas(TOOL_ID).find((c) => c.id === btn.dataset.carregarSalva);
      if (!consulta) return;
      carregarNoEditor(consulta.sql);
      document.getElementById("nomeConsulta").value = consulta.nome;
      rodarDoEditor();
      document.getElementById("sqlEditor").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  container.querySelectorAll("[data-remover-salva]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removerConsulta(TOOL_ID, btn.dataset.removerSalva);
      renderSalvas();
      renderStats();
    });
  });
}

/* ---------------------------------------------------------------------
   Histórico
   --------------------------------------------------------------------- */

function renderHistorico() {
  const container = document.getElementById("listaHistorico");
  const historico = getHistorico(TOOL_ID);

  if (!historico.length) {
    container.innerHTML = `<p class="lista-vazia">Nenhuma execução registrada neste navegador ainda.</p>`;
    return;
  }

  container.innerHTML = historico.map((h) => `
    <div class="lista-item">
      <div class="meta">
        <span class="pill ${h.ok ? "ok" : "bad"}">${h.ok ? "OK" : "ERRO"}</span>
        <span>${formatarData(h.em)}</span>
        <span>· ${h.ok ? `${h.linhas} linha(s)` : "falhou"}</span>
        <span>· ${h.duracaoMs} ms</span>
      </div>
      <pre>${escapeHtml(h.sql)}</pre>
      ${h.erro ? `<div class="meta" style="color:var(--danger)">${escapeHtml(h.erro)}</div>` : ""}
      <div class="row-actions">
        <button type="button" class="mini-btn" data-reexecutar="${escapeHtml(h.id)}">Reexecutar</button>
      </div>
    </div>
  `).join("");

  container.querySelectorAll("[data-reexecutar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = getHistorico(TOOL_ID).find((h) => h.id === btn.dataset.reexecutar);
      if (!item) return;
      carregarNoEditor(item.sql);
      rodarDoEditor();
      document.getElementById("sqlEditor").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function formatarData(iso) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(iso || "");
  }
}

/* ---------------------------------------------------------------------
   Estatísticas
   --------------------------------------------------------------------- */

function renderStats() {
  const stats = getEstatisticas(TOOL_ID);
  document.getElementById("statsGrid").innerHTML = `
    <div class="stat-item"><strong>${stats.execucoes}</strong><span>Execuções</span></div>
    <div class="stat-item"><strong style="color:var(--ok)">${stats.sucessos}</strong><span>Sucessos</span></div>
    <div class="stat-item"><strong style="color:var(--danger)">${stats.erros}</strong><span>Erros</span></div>
    <div class="stat-item"><strong>${stats.taxaSucesso}%</strong><span>Taxa de acerto</span></div>
    <div class="stat-item"><strong>${stats.duracaoMediaMs} ms</strong><span>Tempo médio</span></div>
    <div class="stat-item"><strong>${stats.totalSalvas}</strong><span>Consultas salvas</span></div>
  `;

  const cmdList = document.getElementById("cmdList");
  cmdList.innerHTML = stats.comandos.length
    ? stats.comandos.map((c) => `<span class="cmd-chip">${escapeHtml(c.comando)} <em>${c.total}×</em></span>`).join("")
    : `<span class="lista-vazia">Os comandos mais usados aparecem aqui depois da primeira execução.</span>`;
}

/* ---------------------------------------------------------------------
   Export CSV do último resultado
   --------------------------------------------------------------------- */

function exportarCsv() {
  if (!ultimoResultado || !ultimoResultado.length) return;
  const colunas = Object.keys(ultimoResultado[0]);
  const escaparCampo = (v) => {
    const texto = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  // Separador ";" — é o que o Excel em pt-BR abre direto, sem assistente.
  const linhas = [
    colunas.join(";"),
    ...ultimoResultado.map((linha) => colunas.map((c) => escaparCampo(linha[c])).join(";"))
  ];
  const blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "consulta-sql-playground.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------------------------------------------------------------
   Eventos + init
   --------------------------------------------------------------------- */

function wireEventos() {
  document.getElementById("btnExecutar").addEventListener("click", rodarDoEditor);

  document.getElementById("btnLimparEditor").addEventListener("click", () => {
    carregarNoEditor("");
    document.getElementById("sqlResultado").textContent = "Escolha um exemplo abaixo ou escreva sua consulta e clique em Executar.";
    document.getElementById("btnExportarCsv").disabled = true;
    ultimoResultado = null;
    setMsg("");
  });

  document.getElementById("btnExportarCsv").addEventListener("click", exportarCsv);

  document.getElementById("btnSalvarConsulta").addEventListener("click", () => {
    const nome = document.getElementById("nomeConsulta").value;
    const sql = document.getElementById("sqlEditor").value.trim();
    if (!sql) {
      setMsg("Escreva a consulta antes de salvar.", "error");
      return;
    }
    const { erro, atualizada } = salvarConsulta(TOOL_ID, { nome, sql });
    if (erro) {
      setMsg(erro, "error");
      return;
    }
    setMsg(atualizada ? "Consulta atualizada." : "Consulta salva neste navegador.", "ok");
    renderSalvas();
    renderStats();
  });

  document.getElementById("btnLimparHistorico").addEventListener("click", () => {
    limparHistorico(TOOL_ID);
    renderHistorico();
  });

  // Ctrl/Cmd + Enter executa, como na maioria dos clientes SQL.
  document.getElementById("sqlEditor").addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      rodarDoEditor();
    }
  });
}

seedSandbox();
renderSchemaBrowser();
renderExemplos();
renderSalvas();
renderHistorico();
renderStats();
wireEventos();
carregarNoEditor(CONSULTAS_EXEMPLO[0].sql);
