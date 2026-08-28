/* =====================================================================
   SQL Query T-SQL - Relatórios - Arriba Platform

   Monta visualmente uma consulta T-SQL de referencia (schema Cob/Par do
   DataCob) e mostra um preview com dados FICTICIOS - nao conecta a
   nenhum banco real. Util para documentar/rascunhar uma query antes de
   rodar no SQL Server de verdade.

   NOTA: a query gerada (generateFullQuery) segue um template fixo
   (Contrato + Parcela + Cliente) - marcar/desmarcar tabelas na barra
   lateral afeta o diagrama, mas nao adiciona JOINs dinamicamente na
   query. Isso e uma limitacao conhecida, mantida igual ao prototipo
   original.

   Regras (CASE WHEN): cada regra e uma coluna calculada independente,
   no espirito do "Nova Formula" da tela real de Extracao de Dados do
   DataCob - alias, condicoes (AND/OR) e, opcionalmente, uma verificacao
   EXISTS/NOT EXISTS em outra tabela (para casos como "parcela com
   multiplos acordos", "cliente com todas as parcelas pagas" etc.).
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
    fields: ["Id_Parcela_Acordo", "Id_Parcela", "Id_Acordo", "Nr_Parcela", "Dt_Vencimento", "Vl_Parcela"],
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
  { id: "null", label: "Nulos (IS NULL)", template: "IS NULL" },
  { id: "not_null", label: "Não Nulos (IS NOT NULL)", template: "IS NOT NULL" },
  { id: "equal", label: "Igual (=)", template: "= {value}" },
  { id: "different", label: "Diferente (<>)", template: "<> {value}" },
  { id: "greater", label: "Maior (>)", template: "> {value}" },
  { id: "greater_equal", label: "Maior ou igual (>=)", template: ">= {value}" },
  { id: "less", label: "Menor (<)", template: "< {value}" },
  { id: "less_equal", label: "Menor ou igual (<=)", template: "<= {value}" },
  { id: "between", label: "Entre (BETWEEN)", template: "BETWEEN {min} AND {max}" },
  { id: "in", label: "Na lista (IN)", template: "IN ({values})" },
  { id: "like_contains", label: "Contendo (LIKE)", template: "LIKE '%{value}%'" }
];

let selectedTables = ["Contrato", "Parcela"];
let ruleIdCounter = 1;
let rules = [
  {
    id: ruleIdCounter++,
    alias: "Contrato_Com_Parcela_Pendente",
    logic: "AND",
    conditions: [
      { table: "Contrato", field: "Id_Contrato", operator: "not_null", value: "" }
    ],
    useExists: true,
    existsNegate: false,
    existsTable: "Parcela",
    existsBaseTable: "Contrato",
    existsBaseField: "Id_Contrato",
    existsField: "Id_Contrato",
    existsConditions: [
      { field: "Tipo_Parcela", operator: "different", value: "'Paga'" }
    ],
    thenText: "Sim - Tem parcela pendente",
    elseText: "Não"
  }
];
let activeRuleId = rules[0].id;
let queryResult = [];

function escapeHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function findRule(id) {
  return rules.find((r) => r.id === id);
}

/* ---------------------------- Tabelas ---------------------------- */

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

/* --------------------------- Regras (sidebar) --------------------------- */

function renderRulesList() {
  const container = document.getElementById("rulesList");
  if (!rules.length) {
    container.innerHTML = `<p style="font-size:.8rem;color:var(--muted);margin:0">Nenhuma regra ainda.</p>`;
    return;
  }
  container.innerHTML = rules.map((rule) => `
    <div class="regra-item ${rule.id === activeRuleId ? "active" : ""}" data-rule="${rule.id}">
      <span class="regra-nome">${escapeHtml(rule.alias || "(sem nome)")}</span>
      <button type="button" class="btn-remove-filtro" data-remove-rule title="Remover regra">✕</button>
    </div>
  `).join("");

  container.querySelectorAll(".regra-item").forEach((item) => {
    const id = Number(item.dataset.rule);
    item.addEventListener("click", (event) => {
      if (event.target.closest("[data-remove-rule]")) return;
      selectRule(id);
    });
    item.querySelector("[data-remove-rule]").addEventListener("click", () => removeRule(id));
  });
}

function addRule() {
  const novaRegra = {
    id: ruleIdCounter++,
    alias: `Regra_${rules.length + 1}`,
    logic: "AND",
    conditions: [{ table: selectedTables[0] || "Contrato", field: TABLES_STRUCTURE[selectedTables[0] || "Contrato"].fields[0], operator: "equal", value: "" }],
    useExists: false,
    existsNegate: false,
    existsTable: "",
    existsBaseTable: selectedTables[0] || "Contrato",
    existsBaseField: "",
    existsField: "",
    existsConditions: [],
    thenText: "Sim",
    elseText: "Não"
  };
  rules.push(novaRegra);
  selectRule(novaRegra.id);
}

function removeRule(id) {
  rules = rules.filter((r) => r.id !== id);
  if (activeRuleId === id) activeRuleId = rules[0]?.id ?? null;
  renderRulesList();
  renderRuleEditor();
  updateQuery();
}

function selectRule(id) {
  activeRuleId = id;
  setViewMode("rules");
  renderRulesList();
  renderRuleEditor();
}

/* --------------------------- Editor de regra --------------------------- */

function conditionRowHtml(cond, idx, tableOptions, prefix) {
  const fields = TABLES_STRUCTURE[cond.table]?.fields || [];
  return `
    <div class="filtro-card" data-idx="${idx}">
      <div class="filtro-topo">
        ${tableOptions ? `
          <select data-prop="table">
            ${tableOptions.map((t) => `<option value="${t}" ${cond.table === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        ` : ""}
        <button type="button" class="btn-remove-filtro" data-remove-${prefix}>✕</button>
      </div>
      <select data-prop="field">
        ${fields.map((f) => `<option value="${f}" ${cond.field === f ? "selected" : ""}>${f}</option>`).join("")}
      </select>
      <select data-prop="operator">
        ${FILTER_OPERATORS.map((op) => `<option value="${op.id}" ${cond.operator === op.id ? "selected" : ""}>${op.label}</option>`).join("")}
      </select>
      ${cond.operator === "between" ? `
        <input type="text" data-prop="min" value="${escapeHtml(cond.min || "")}" placeholder="Valor mínimo" style="margin-bottom:6px">
        <input type="text" data-prop="max" value="${escapeHtml(cond.max || "")}" placeholder="Valor máximo">
      ` : ["null", "not_null", "no_filter"].includes(cond.operator) ? "" : `
        <input type="text" data-prop="value" value="${escapeHtml(cond.value || "")}" placeholder="${cond.operator === "in" ? "Ex.: 'Ativo','Pendente'" : "Valor"}">
      `}
    </div>
  `;
}

function renderRuleEditor() {
  const wrap = document.getElementById("ruleEditorWrap");
  const empty = document.getElementById("ruleEditorEmpty");
  const rule = findRule(activeRuleId);

  if (!rule) {
    wrap.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }
  wrap.classList.remove("hidden");
  empty.classList.add("hidden");

  document.getElementById("ruleAlias").value = rule.alias;
  document.getElementById("ruleLogic").value = rule.logic;
  document.getElementById("ruleThen").value = rule.thenText;
  document.getElementById("ruleElse").value = rule.elseText;
  document.getElementById("ruleUseExists").checked = rule.useExists;
  document.getElementById("existsBlock").classList.toggle("hidden", !rule.useExists);
  document.getElementById("ruleExistsNegate").checked = rule.existsNegate;

  document.getElementById("ruleConditions").innerHTML = rule.conditions
    .map((cond, idx) => conditionRowHtml(cond, idx, selectedTables, "cond")).join("");
  wireConditionRows("ruleConditions", "cond", rule.conditions, () => { renderRuleEditor(); updateQuery(); });

  const existsTableOptions = Object.keys(TABLES_STRUCTURE);
  document.getElementById("existsTable").innerHTML = existsTableOptions
    .map((t) => `<option value="${t}" ${rule.existsTable === t ? "selected" : ""}>${t}</option>`).join("");
  document.getElementById("existsBaseTable").innerHTML = selectedTables
    .map((t) => `<option value="${t}" ${rule.existsBaseTable === t ? "selected" : ""}>${t}</option>`).join("");
  document.getElementById("existsBaseField").innerHTML = (TABLES_STRUCTURE[rule.existsBaseTable]?.fields || [])
    .map((f) => `<option value="${f}" ${rule.existsBaseField === f ? "selected" : ""}>${f}</option>`).join("");
  document.getElementById("existsField").innerHTML = (TABLES_STRUCTURE[rule.existsTable]?.fields || [])
    .map((f) => `<option value="${f}" ${rule.existsField === f ? "selected" : ""}>${f}</option>`).join("");

  document.getElementById("existsConditions").innerHTML = rule.existsConditions
    .map((cond, idx) => conditionRowHtml({ ...cond, table: rule.existsTable }, idx, null, "exists")).join("");
  wireConditionRows("existsConditions", "exists", rule.existsConditions, () => { renderRuleEditor(); updateQuery(); }, true);

  document.getElementById("ruleCaseOutput").textContent = generateRuleCaseWhen(rule);
}

function wireConditionRows(containerId, prefix, list, onChange, noTableProp) {
  const container = document.getElementById(containerId);
  container.querySelectorAll(".filtro-card").forEach((card) => {
    const idx = Number(card.dataset.idx);
    card.querySelector(`[data-remove-${prefix}]`).addEventListener("click", () => {
      list.splice(idx, 1);
      onChange();
    });
    card.querySelectorAll("[data-prop]").forEach((el) => {
      el.addEventListener("change", () => {
        const prop = el.dataset.prop;
        if (prop === "table" && noTableProp) return;
        list[idx][prop] = el.value;
        if (prop === "table") {
          list[idx].field = (TABLES_STRUCTURE[el.value]?.fields || [])[0] || "";
        }
        onChange();
      });
    });
  });
}

function bindRuleFieldInputs() {
  const bind = (id, prop, isCheckbox) => {
    document.getElementById(id).addEventListener("change", (event) => {
      const rule = findRule(activeRuleId);
      if (!rule) return;
      rule[prop] = isCheckbox ? event.target.checked : event.target.value;
      if (prop === "useExists") document.getElementById("existsBlock").classList.toggle("hidden", !rule.useExists);
      if (prop === "existsTable") {
        rule.existsField = (TABLES_STRUCTURE[rule.existsTable]?.fields || [])[0] || "";
      }
      if (prop === "existsBaseTable") {
        rule.existsBaseField = (TABLES_STRUCTURE[rule.existsBaseTable]?.fields || [])[0] || "";
      }
      renderRulesList();
      renderRuleEditor();
      updateQuery();
    });
  };
  bind("ruleAlias", "alias");
  bind("ruleLogic", "logic");
  bind("ruleThen", "thenText");
  bind("ruleElse", "elseText");
  bind("ruleUseExists", "useExists", true);
  bind("ruleExistsNegate", "existsNegate", true);
  bind("existsTable", "existsTable");
  bind("existsBaseTable", "existsBaseTable");
  bind("existsBaseField", "existsBaseField");
  bind("existsField", "existsField");

  document.getElementById("btnAddRuleCondition").addEventListener("click", () => {
    const rule = findRule(activeRuleId);
    if (!rule) return;
    const table = selectedTables[0] || "Contrato";
    rule.conditions.push({ table, field: TABLES_STRUCTURE[table].fields[0], operator: "equal", value: "" });
    renderRuleEditor();
    updateQuery();
  });

  document.getElementById("btnAddExistsCondition").addEventListener("click", () => {
    const rule = findRule(activeRuleId);
    if (!rule || !rule.existsTable) return;
    rule.existsConditions.push({ field: TABLES_STRUCTURE[rule.existsTable].fields[0], operator: "equal", value: "" });
    renderRuleEditor();
    updateQuery();
  });
}

/* ------------------------------ Geração SQL ------------------------------ */

function conditionToSql(cond) {
  const op = FILTER_OPERATORS.find((o) => o.id === cond.operator);
  let clause = op?.template || "";
  if (cond.operator === "between") {
    clause = clause.replace("{min}", cond.min || "").replace("{max}", cond.max || "");
  } else if (cond.operator === "in") {
    clause = clause.replace("{values}", cond.value || "");
  } else {
    clause = clause.replace("{value}", cond.value || "");
  }
  return `[${cond.table}].[${cond.field}] ${clause}`.trim();
}

// NOTA: a geracao nao usa alias de tabela (mesmo padrao do resto do arquivo).
// Se "Tabela relacionada" e "Corresponde à tabela" forem a MESMA tabela (um
// self-join, ex.: comparar duas parcelas do mesmo acordo), a condicao de
// ligacao vira uma tautologia ([T].[Campo] = [T].[Campo]) sem alias - nesse
// caso o EXISTS so funciona de verdade se as condicoes extras forem
// suficientes para distinguir a linha interna da externa.
function generateExistsSql(rule) {
  if (!rule.useExists || !rule.existsTable || !rule.existsBaseField || !rule.existsField) return "";

  const linkClause = `[${rule.existsTable}].[${rule.existsField}] = [${rule.existsBaseTable}].[${rule.existsBaseField}]`;
  const extra = rule.existsConditions.map((c) => conditionToSql({ ...c, table: rule.existsTable }));
  const todasCondicoes = [linkClause, ...extra].join("\n        AND ");

  return `${rule.existsNegate ? "NOT " : ""}EXISTS (\n      SELECT 1 FROM [${TABLES_STRUCTURE[rule.existsTable]?.schema || "Cob"}].[${rule.existsTable}]\n      WHERE ${todasCondicoes}\n    )`;
}

function generateRuleCaseWhen(rule) {
  const partesPrincipais = rule.conditions.map(conditionToSql);
  const existsSql = generateExistsSql(rule);
  const todasPartes = existsSql ? [...partesPrincipais, existsSql] : partesPrincipais;
  if (!todasPartes.length) return "";

  return `CASE\n  WHEN ${todasPartes.join(`\n    ${rule.logic} `)}\n  THEN "${rule.thenText}"\n  ELSE "${rule.elseText}"\nEND`;
}

function generateFullQuery() {
  const colunasRegras = rules
    .map((rule) => {
      const caseSql = generateRuleCaseWhen(rule);
      return caseSql ? `  ${caseSql.replace(/\n/g, "\n  ")} AS [${rule.alias || "Regra"}],` : "";
    })
    .filter(Boolean)
    .join("\n");

  return `SELECT
  [Contrato].[Id_Contrato],
  [Contrato].[Numero_Contrato],
  [Parcela].[Id_Parcela],
  [Parcela].[Dt_Vencimento],
  [Parcela].[Tipo_Parcela],
${colunasRegras ? colunasRegras + "\n" : ""}  [Cliente].[Nome_Ren]
FROM [Cob].[Contrato]
INNER JOIN [Cob].[Parcela] ON [Contrato].[Id_Contrato] = [Parcela].[Id_Contrato]
INNER JOIN [Par].[Cliente] ON [Contrato].[Id_Cliente] = [Cliente].[Id_Cliente]`;
}

function updateQuery() {
  document.getElementById("queryOutput").textContent = generateFullQuery();
  const editorAtivo = findRule(activeRuleId);
  if (editorAtivo) {
    const output = document.getElementById("ruleCaseOutput");
    if (output) output.textContent = generateRuleCaseWhen(editorAtivo);
  }
}

/* ------------------------------- Preview -------------------------------- */

function generateMockData() {
  queryResult = Array.from({ length: 10 }, (_, index) => {
    const i = index + 1;
    const row = {
      Id_Contrato: 1000 + i,
      Numero_Contrato: `CT-2024-${String(i).padStart(5, "0")}`,
      Id_Parcela: i,
      Dt_Vencimento: `2024-${String((i % 12) + 1).padStart(2, "0")}-15`,
      Tipo_Parcela: i === 1 ? "Entrada" : "Parcela"
    };
    rules.forEach((rule) => {
      row[rule.alias || "Regra"] = i === 1 ? rule.thenText : rule.elseText;
    });
    row.Nome_Ren = `Cliente ${i}`;
    return row;
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

/* ------------------------------- Navegação ------------------------------- */

function setViewMode(mode) {
  ["diagram", "query", "rules", "preview", "export"].forEach((v) => {
    document.getElementById(`view${capitalize(v)}`).classList.toggle("hidden", v !== mode);
  });
  document.querySelectorAll(".view-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === mode);
  });

  if (mode === "query") updateQuery();
  if (mode === "rules") renderRuleEditor();
  if (mode === "preview") { generateMockData(); }
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

document.querySelectorAll(".view-tab").forEach((btn) => {
  btn.addEventListener("click", () => setViewMode(btn.dataset.view));
});
document.getElementById("btnAddRule").addEventListener("click", addRule);
document.getElementById("btnExportXlsx").addEventListener("click", exportXlsx);
document.getElementById("btnExportCsv").addEventListener("click", exportCsv);
document.getElementById("btnGoPreview").addEventListener("click", () => setViewMode("preview"));

renderTables();
renderRulesList();
bindRuleFieldInputs();
renderRuleEditor();
renderDiagram();
generateMockData();
updateQuery();
