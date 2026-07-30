/* =====================================================================
   SQL Query Builder DataCob - Arriba Platform

   Monta visualmente uma consulta T-SQL de referencia (schema Cob/Par do
   DataCob) e mostra um preview com dados FICTICIOS - nao conecta a
   nenhum banco real. Util para documentar/rascunhar uma query antes de
   rodar no SQL Server de verdade.

   NOTA: a query gerada (generateFullQuery) segue um template fixo
   (Contrato + Parcela + Cliente) - marcar/desmarcar tabelas na barra
   lateral afeta o diagrama e as opcoes de filtro, mas nao adiciona
   JOINs dinamicamente na query. Isso é uma limitacao conhecida da
   versao atual, mantida igual ao protótipo original.
   ===================================================================== */

"use strict";

const TABLES_STRUCTURE = {
  Contrato: {
    schema: "Cob",
    fields: ["Id_Contrato", "Id_Cliente", "Id_Grupo", "Id_Financiado", "Id_Cliente_Web", "Numero_Contrato"],
    relationships: ["Parcela", "Historico", "Cliente", "Grupo"]
  },
  Parcela: {
    schema: "Cob",
    fields: ["Id_Parcela", "Id_Cliente", "Id_Contrato", "Tipo_Parcela", "Dt_Vencimento"],
    relationships: ["Contrato", "Negociacao_Parcela", "Parcela_Acordo"]
  },
  Acordo: {
    schema: "Cob",
    fields: ["Id_Acordo", "Id_Negociacao", "Id_Agrupamento", "Id_Cliente_Web", "Dt_Acordo"],
    relationships: ["Negociacao", "Parcela_Acordo"]
  },
  Negociacao: {
    schema: "Cob",
    fields: ["Id_Negociacao", "Id_Negociacao_Parcela", "Id_Parcela", "Vl_Total", "Vl_Principal"],
    relationships: ["Parcela", "Acordo"]
  },
  Parcela_Acordo: {
    schema: "Cob",
    fields: ["Id_Parcela_Acordo", "Id_Parcela", "Id_Acordo", "Dt_Vencimento", "Vl_Parcela"],
    relationships: ["Parcela", "Acordo"]
  },
  Cliente: {
    schema: "Par",
    fields: ["Id_Cliente", "Id_Grupo", "Razao", "Nome_Ren", "Endereco", "Numero"],
    relationships: ["Contrato", "Grupo"]
  }
};

const FILTER_OPERATORS = [
  { id: "no_filter", label: "Não Filtrar", template: "" },
  { id: "null", label: "Nulos", template: "IS NULL" },
  { id: "not_null", label: "Não Nulos", template: "IS NOT NULL" },
  { id: "equal", label: "Igual", template: "= {value}" },
  { id: "different", label: "Diferente", template: "<> {value}" },
  { id: "greater", label: "Maior", template: "> {value}" },
  { id: "between", label: "Entre", template: "BETWEEN {min} AND {max}" },
  { id: "in", label: "Na Lista", template: "IN ({values})" },
  { id: "like_contains", label: "Contendo", template: "LIKE '%{value}%'" }
];

let selectedTables = ["Contrato", "Parcela"];
let conditions = [
  { field: "Nr_Parcela", table: "Parcela", operator: "equal", value: "1", caseWhen: true }
];
let caseWhenLogic = "AND";
let caseWhenResult = "Sim - Entrada Diferente";
let queryResult = [];

function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function renderTables() {
  const container = document.getElementById("tablesList");
  container.innerHTML = Object.keys(TABLES_STRUCTURE).map((table) => `
    <label class="table-check">
      <input type="checkbox" data-table="${table}" ${selectedTables.includes(table) ? "checked" : ""}>
      <span>${escapeHtml(table)}</span>
    </label>
  `).join("");

  container.querySelectorAll("[data-table]").forEach((input) => {
    input.addEventListener("change", () => toggleTable(input.dataset.table));
  });
}

function toggleTable(table) {
  selectedTables = selectedTables.includes(table)
    ? selectedTables.filter((t) => t !== table)
    : [...selectedTables, table];
  renderTables();
  renderDiagram();
  updateQuery();
}

function renderFilters() {
  const container = document.getElementById("filtersList");
  container.innerHTML = conditions.map((cond, idx) => `
    <div class="filtro-card" data-idx="${idx}">
      <div class="filtro-topo">
        <select data-prop="table">
          ${selectedTables.map((t) => `<option value="${t}" ${cond.table === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <button type="button" class="btn-remove-filtro" data-remove>✕</button>
      </div>
      <select data-prop="field">
        ${(TABLES_STRUCTURE[cond.table]?.fields || []).map((f) => `<option value="${f}" ${cond.field === f ? "selected" : ""}>${f}</option>`).join("")}
      </select>
      <select data-prop="operator">
        ${FILTER_OPERATORS.map((op) => `<option value="${op.id}" ${cond.operator === op.id ? "selected" : ""}>${op.label}</option>`).join("")}
      </select>
      ${["null", "not_null", "no_filter"].includes(cond.operator) ? "" : `
        <input type="text" data-prop="value" value="${escapeHtml(cond.value || "")}" placeholder="Valor">
      `}
      <label class="filtro-check">
        <input type="checkbox" data-prop="caseWhen" ${cond.caseWhen ? "checked" : ""}>
        Usar em CASE WHEN
      </label>
    </div>
  `).join("");

  container.querySelectorAll(".filtro-card").forEach((card) => {
    const idx = Number(card.dataset.idx);
    card.querySelector("[data-remove]").addEventListener("click", () => removeCondition(idx));
    card.querySelectorAll("[data-prop]").forEach((el) => {
      el.addEventListener("change", () => {
        const valor = el.type === "checkbox" ? el.checked : el.value;
        updateCondition(idx, el.dataset.prop, valor);
      });
    });
  });
}

function updateCondition(idx, prop, value) {
  conditions[idx][prop] = value;
  renderFilters();
  updateQuery();
}

function addCondition() {
  conditions.push({ field: "Id_Parcela", table: selectedTables[0] || "Contrato", operator: "equal", value: "", caseWhen: true });
  renderFilters();
}

function removeCondition(idx) {
  conditions.splice(idx, 1);
  renderFilters();
  updateQuery();
}

function renderDiagram() {
  const container = document.getElementById("diagramContent");
  container.innerHTML = selectedTables.map((table) => {
    const info = TABLES_STRUCTURE[table];
    return `
      <div class="diagram-card">
        <h3>${escapeHtml(table)}</h3>
        <span class="schema-tag">Schema: ${escapeHtml(info.schema)}</span>
        <div class="rel-title">Campos:</div>
        ${info.fields.map((f) => `<p class="field-line">• ${escapeHtml(f)}</p>`).join("")}
        ${info.relationships.length ? `
          <div class="rel-title">Relacionamentos:</div>
          ${info.relationships.map((r) => `<p class="rel-line">→ ${escapeHtml(r)}</p>`).join("")}
        ` : ""}
      </div>
    `;
  }).join("");
}

function generateCaseWhen() {
  const caseConditions = conditions.filter((c) => c.caseWhen);
  if (!caseConditions.length) return "";

  const condStrings = caseConditions.map((c) => {
    const op = FILTER_OPERATORS.find((o) => o.id === c.operator);
    const condicao = (op?.template || "").replace("{value}", c.value || "");
    return `[${c.table}].[${c.field}] ${condicao}`;
  });

  return `CASE\n  WHEN ${condStrings.join(` ${caseWhenLogic} `)}\n  THEN "${caseWhenResult}"\n  ELSE "Não"\nEND`;
}

function generateFullQuery() {
  const caseWhen = generateCaseWhen();
  return `SELECT
  [Contrato].[Id_Contrato],
  [Contrato].[Numero_Contrato],
  [Parcela].[Id_Parcela],
  [Parcela].[Dt_Vencimento],
  [Parcela].[Tipo_Parcela],
  ${caseWhen ? `${caseWhen} AS [Entrada_Diferenciada],` : ""}
  [Cliente].[Nome_Ren]
FROM [Cob].[Contrato]
INNER JOIN [Cob].[Parcela] ON [Contrato].[Id_Contrato] = [Parcela].[Id_Contrato]
INNER JOIN [Par].[Cliente] ON [Contrato].[Id_Cliente] = [Cliente].[Id_Cliente]`;
}

function updateQuery() {
  caseWhenLogic = document.getElementById("caseLogic")?.value || "AND";
  caseWhenResult = document.getElementById("caseResult")?.value || "Sim - Entrada Diferente";

  document.getElementById("queryOutput").textContent = generateFullQuery();

  const secaoCaseWhen = document.getElementById("caseWhenSection");
  if (conditions.some((c) => c.caseWhen)) {
    secaoCaseWhen.classList.remove("hidden");
    document.getElementById("caseWhenOutput").textContent = generateCaseWhen();
  } else {
    secaoCaseWhen.classList.add("hidden");
  }
}

function generateMockData() {
  queryResult = Array.from({ length: 10 }, (_, index) => {
    const i = index + 1;
    return {
      Id_Contrato: 1000 + i,
      Numero_Contrato: `CT-2024-${String(i).padStart(5, "0")}`,
      Id_Parcela: i,
      Dt_Vencimento: `2024-${String((i % 12) + 1).padStart(2, "0")}-15`,
      Tipo_Parcela: i === 1 ? "Entrada" : "Parcela",
      Entrada_Diferenciada: i === 1 ? "Sim - Entrada Diferente" : "Não",
      Nome_Ren: `Cliente ${i}`
    };
  });
  renderPreview();
}

function renderPreview() {
  if (!queryResult.length) return;
  const headers = Object.keys(queryResult[0]);
  document.getElementById("previewThead").innerHTML = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
  document.getElementById("previewTbody").innerHTML = queryResult.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(row[h])}</td>`).join("")}</tr>`).join("");
  document.getElementById("recordCount").textContent = queryResult.length;
}

function exportXlsx() {
  const worksheet = XLSX.utils.json_to_sheet(queryResult);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
  XLSX.writeFile(workbook, "query_result.xlsx");
}

function exportCsv() {
  const worksheet = XLSX.utils.json_to_sheet(queryResult);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  link.download = "query_result.csv";
  link.click();
}

function setViewMode(mode) {
  ["diagram", "query", "preview", "export"].forEach((v) => {
    document.getElementById(`view${capitalize(v)}`).classList.toggle("hidden", v !== mode);
  });
  document.querySelectorAll(".view-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === mode);
  });

  if (mode === "query") updateQuery();
  if (mode === "preview") renderPreview();
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

document.querySelectorAll(".view-tab").forEach((btn) => {
  btn.addEventListener("click", () => setViewMode(btn.dataset.view));
});
document.getElementById("btnAddFiltro").addEventListener("click", addCondition);
document.getElementById("btnExportXlsx").addEventListener("click", exportXlsx);
document.getElementById("btnExportCsv").addEventListener("click", exportCsv);
document.getElementById("btnGoPreview").addEventListener("click", () => setViewMode("preview"));

renderTables();
renderFilters();
renderDiagram();
generateMockData();
