/* =====================================================================
   CNAB 400 - UI genérica (agnóstica de banco e de direção)

   Lê o banco selecionado (banks/registry.js) e a direção (Remessa ou
   Retorno) e monta o formulário a partir de config[direcao].formFields
   + headerFields/detalheFields — nenhum HTML aqui é específico de um
   banco. O motor (engine.js) faz todo o parse/geração; este arquivo só
   lê a tela e desenha o resultado.

   Ajuda de preenchimento: cada campo listado em formFields pode ter
   `obrigatorio`/`ajuda`/`exemplo` no seu field def. A UI só lê essas
   propriedades — nenhum texto de ajuda fica hard-coded aqui.
   ===================================================================== */

import { BANKS } from "./banks/registry.js";
import { parseArquivo, gerarArquivo } from "./engine.js";

let currentBank = null; // { code, nome, config }
let currentDirecao = "retorno"; // "remessa" | "retorno"
let currentMode = "reader"; // "reader" | "generator"
let lastGeneratedLines = null;

function direcaoConfig() {
  return currentBank ? currentBank.config[currentDirecao] : null;
}

export function initUI() {
  const bankSelect = document.getElementById("bankSelect");
  BANKS.forEach(bank => {
    const opt = document.createElement("option");
    opt.value = bank.code;
    opt.textContent = `${bank.nome} (${bank.code})`;
    bankSelect.appendChild(opt);
  });

  bankSelect.addEventListener("change", () => {
    currentBank = BANKS.find(b => b.code === bankSelect.value) || null;
    currentMode = "reader";
    syncControls();
    renderArea();
  });

  document.getElementById("direcaoSelect").addEventListener("change", e => {
    currentDirecao = e.target.value;
    syncControls();
    renderArea();
  });

  document.getElementById("btnModeReader").addEventListener("click", () => setMode("reader"));
  document.getElementById("btnModeGenerator").addEventListener("click", () => setMode("generator"));
  document.getElementById("btnComoPreencher").addEventListener("click", openHelpPanel);
  document.getElementById("helpPanelClose").addEventListener("click", closeHelpPanel);
  document.getElementById("helpPanelBackdrop").addEventListener("click", closeHelpPanel);

  syncControls();
  renderArea();
}

function setMode(mode) {
  if (!currentBank) return;
  currentMode = mode;
  syncControls();
  renderArea();
}

function syncControls() {
  const direcaoSelect = document.getElementById("direcaoSelect");
  const btnReader = document.getElementById("btnModeReader");
  const btnGenerator = document.getElementById("btnModeGenerator");
  const btnHelp = document.getElementById("btnComoPreencher");
  const enabled = Boolean(currentBank);

  direcaoSelect.disabled = !enabled;
  direcaoSelect.value = currentDirecao;
  btnReader.disabled = !enabled;
  btnGenerator.disabled = !enabled;
  btnHelp.disabled = !enabled;
  btnReader.classList.toggle("active", currentMode === "reader");
  btnGenerator.classList.toggle("active", currentMode === "generator");

  const sideNote = document.getElementById("sideNote");
  sideNote.innerHTML = enabled
    ? `<strong>${escHtml(currentBank.nome)} (${escHtml(currentBank.code)})</strong> · ${currentDirecao === "remessa" ? "Remessa" : "Retorno"}<br>Formulário e ações liberados abaixo.`
    : (BANKS.length
      ? "Selecione um banco para liberar o formulário e as ações."
      : "<strong>Nenhum banco disponível ainda.</strong><br>Cadastre um banco em <code>banks/</code> e registre em <code>registry.js</code>.");
}

/* ---------------------------------------------------------------------
   Área principal (Validar / Gerar)
   --------------------------------------------------------------------- */

function renderArea() {
  const area = document.getElementById("formArea");
  if (!currentBank) {
    area.innerHTML = `
      <h2>Nenhum banco selecionado</h2>
      <p class="hint">Escolha um banco e uma direção (Remessa ou Retorno) na barra lateral.</p>
      <div class="empty-form-area">
        <i class="fa-solid fa-building-columns"></i>
        Os campos deste banco aparecerão aqui.
      </div>`;
    return;
  }
  area.innerHTML = currentMode === "reader" ? readerViewHtml() : generatorViewHtml();
  wireViewEvents();
}

function directionLabel() {
  return currentDirecao === "remessa" ? "Remessa" : "Retorno";
}

/* ---------------------------------------------------------------------
   Modo Validar (leitor)
   --------------------------------------------------------------------- */

function readerViewHtml() {
  return `
    <h2>Validar ${directionLabel().toLowerCase()} — ${escHtml(currentBank.nome)}</h2>
    <p class="hint">Cole o conteúdo do arquivo ou envie um .RET/.TXT. Nada é enviado a servidor.</p>

    <div class="drop-zone" id="dropZone">
      <i class="fa-solid fa-file-arrow-up"></i> Arraste um arquivo ou clique para selecionar
      <input type="file" id="fileInput" class="hidden" accept=".ret,.txt">
    </div>

    <textarea id="rawInput" class="form-control cnab-textarea" placeholder="Cole aqui o conteúdo do arquivo..." spellcheck="false"></textarea>

    <div class="actions">
      <button type="button" class="btn-arriba btn-red-arriba" id="btnParse"><i class="fa-solid fa-magnifying-glass me-2"></i>Validar e extrair</button>
      <button type="button" class="btn-arriba btn-light-arriba" id="btnClearReader">Limpar</button>
    </div>

    <div class="validation-msg" id="readerMsg">Aguardando arquivo de ${directionLabel().toLowerCase()}.</div>

    <div id="readerResult" class="hidden">
      <div class="summary-grid">
        <div class="summary-item"><span>Linhas (400c)</span><strong id="chipLines">-</strong></div>
        <div class="summary-item"><span>Títulos</span><strong id="chipTitulos">-</strong></div>
        <div class="summary-item"><span>Header</span><strong id="chipHeader">-</strong></div>
      </div>
      <div class="table-wrap">
        <table class="cnab-table">
          <thead>
            <tr><th>#</th><th>Nosso Número</th><th>Ocorrência</th><th>Vencimento</th><th>Valor Título</th><th>Valor Pago</th><th>Data Crédito</th><th>Motivos</th></tr>
          </thead>
          <tbody id="retBody"></tbody>
        </table>
      </div>
    </div>`;
}

function wireReaderEvents() {
  const dz = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  dz.addEventListener("click", () => fileInput.click());
  dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("drag"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
  dz.addEventListener("drop", e => {
    e.preventDefault(); dz.classList.remove("drag");
    if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", e => { if (e.target.files[0]) readFile(e.target.files[0]); });

  document.getElementById("btnParse").addEventListener("click", runParse);
  document.getElementById("btnClearReader").addEventListener("click", clearReader);
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("rawInput").value = reader.result;
    runParse();
  };
  reader.readAsText(file, "ISO-8859-1"); // CNAB é ASCII/Latin-1
}

// Marcador universal do CNAB 400: posição 3-9 do Header diz "REMESSA" ou
// "RETORNO" — isso NÃO é específico de banco, então mora na UI, não no config.
function detectarDirecaoPeloHeader(texto) {
  const primeiraLinha = texto.replace(/\r\n|\r|\n/g, "\n").split("\n")[0] || "";
  const marcador = primeiraLinha.slice(2, 9).trim().toUpperCase();
  if (marcador === "REMESSA") return "remessa";
  if (marcador === "RETORNO") return "retorno";
  return null;
}

function runParse() {
  const text = document.getElementById("rawInput").value;
  if (!text.trim()) { setMsg("readerMsg", "Cole o conteúdo ou envie um arquivo.", "error"); return; }

  const direcaoDetectada = detectarDirecaoPeloHeader(text);
  if (direcaoDetectada && direcaoDetectada !== currentDirecao) {
    setMsg(
      "readerMsg",
      `Este arquivo parece ser de ${direcaoDetectada === "remessa" ? "Remessa" : "Retorno"}, mas você selecionou ${directionLabel()}. Troque a direção na barra lateral e valide novamente.`,
      "error"
    );
    return;
  }

  try {
    const data = parseArquivo(text, direcaoConfig());

    document.getElementById("chipLines").textContent = data.totalLinhas;
    document.getElementById("chipTitulos").textContent = data.titulos.length;

    const hValid = data.header && data.header._valido;
    document.getElementById("chipHeader").innerHTML = hValid
      ? '<span class="pill ok">Válido</span>'
      : '<span class="pill bad">Inválido</span>';

    renderTitulos(data.titulos);
    document.getElementById("readerResult").classList.remove("hidden");

    let msg = `Arquivo lido: ${data.titulos.length} título(s) extraído(s).`;
    let kind = "ok";
    if (!hValid) {
      kind = "error";
      msg = "Header inválido — " + data.header._erros.join("; ");
    } else if (data.avisos.length) {
      msg += " Avisos: " + data.avisos.slice(0, 3).join(" ");
    }
    setMsg("readerMsg", msg, kind);
  } catch (err) {
    setMsg("readerMsg", "Erro ao processar: " + err.message, "error");
  }
}

function renderTitulos(titulos) {
  const body = document.getElementById("retBody");
  body.innerHTML = "";
  // Nem todo banco chama o campo de "valor pago" da mesma forma (ex.: Itaú
  // usa valorPrincipal) — cada config de retorno pode apontar a chave real
  // via valorPagoKey; sem isso, cai no nome padrão "valorPago" (Bradesco).
  const valorPagoKey = direcaoConfig()?.valorPagoKey || "valorPago";
  titulos.forEach((t, i) => {
    const motivos = t.motivosList && t.motivosList.length
      ? t.motivosList.map(m => `${m.cod} (${escHtml(m.desc)})`).join("<br>")
      : "—";
    const valorPago = t[valorPagoKey];
    const ocPill = t.ocorrencia === "06" ? "ok" : (["03", "27", "30", "32"].includes(t.ocorrencia) ? "bad" : "warn");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escHtml(t.nossoNumero)}</td>
      <td><span class="pill ${ocPill}">${escHtml(t.ocorrencia)}</span> ${escHtml(t.ocorrenciaDesc || "")}</td>
      <td>${escHtml(t.dataVencimento) || "—"}</td>
      <td class="num">${money(t.valorTitulo)}</td>
      <td class="num">${valorPago !== undefined ? money(valorPago) : "—"}</td>
      <td>${escHtml(t.dataCredito) || "—"}</td>
      <td>${motivos}</td>`;
    body.appendChild(tr);
  });
}

function clearReader() {
  document.getElementById("rawInput").value = "";
  document.getElementById("readerResult").classList.add("hidden");
  setMsg("readerMsg", `Aguardando arquivo de ${directionLabel().toLowerCase()}.`, "");
}

/* ---------------------------------------------------------------------
   Modo Gerar
   --------------------------------------------------------------------- */

function fieldDef(key, kind) {
  const cfg = direcaoConfig();
  const list = kind === "header" ? cfg.headerFields : cfg.detalheFields;
  return list.find(d => d.key === key);
}

function helpButtonHtml(def) {
  const tamanho = def.fim - def.ini + 1;
  return `<button type="button" class="field-help-btn" data-help
    data-nome="${escHtml(def.nome || def.key)}"
    data-posicao="${def.ini}–${def.fim}"
    data-tamanho="${tamanho}"
    data-ajuda="${escHtml(def.ajuda || "Sem ajuda cadastrada para este campo.")}"
    data-exemplo="${escHtml(def.exemplo || "")}"
    aria-label="Ajuda sobre ${escHtml(def.nome || def.key)}">?</button>`;
}

function headerFieldInputHtml(key) {
  const def = fieldDef(key, "header");
  if (!def) return "";
  const label = def.nome || key;
  const id = `gen_${key}`;
  const req = def.obrigatorio ? '<span class="req-mark">*</span>' : "";
  const input = def.fmt === "data"
    ? `<input type="date" class="form-control" id="${id}" data-k="${key}">`
    : `<input class="form-control" id="${id}" data-k="${key}" placeholder="${escHtml(def.exemplo || "")}">`;
  return `<div class="field">
    <label for="${id}">${escHtml(label)}${req} ${helpButtonHtml(def)}</label>
    ${input}
    <div class="field-help-box hidden"></div>
  </div>`;
}

function detalheFieldInputHtml(key) {
  const def = fieldDef(key, "detalhe");
  if (!def) return "";
  const label = def.nome || key;
  const req = def.obrigatorio ? '<span class="req-mark">*</span>' : "";
  const cfg = direcaoConfig();

  let input;
  if (key === "ocorrencia" && cfg.ocorrencias) {
    const options = Object.entries(cfg.ocorrencias)
      .map(([code, desc]) => `<option value="${code}">${code} — ${escHtml(desc)}</option>`).join("");
    input = `<select class="form-select" data-k="${key}">${options}</select>`;
  } else if (def.fmt === "data") {
    input = `<input type="date" class="form-control" data-k="${key}">`;
  } else if (def.fmt === "valor") {
    input = `<input class="form-control" data-k="${key}" placeholder="0,00">`;
  } else {
    input = `<input class="form-control" data-k="${key}" placeholder="${escHtml(def.exemplo || "")}">`;
  }

  return `<div>
    <label>${escHtml(label)}${req} ${helpButtonHtml(def)}</label>
    ${input}
    <div class="field-help-box hidden"></div>
  </div>`;
}

function generatorViewHtml() {
  const cfg = direcaoConfig();
  const headerFields = (cfg.formFields?.header || []).map(headerFieldInputHtml).join("");
  return `
    <h2>Gerar ${directionLabel().toLowerCase()} — ${escHtml(currentBank.nome)}</h2>
    <p class="hint">Preencha o cabeçalho e adicione um ou mais títulos. Campos com <span class="req-mark">*</span> são obrigatórios. Use o "?" ao lado de cada campo para ver posição, tamanho e exemplo.</p>

    <div class="form-grid">${headerFields}</div>

    <h3 class="det-title">Títulos</h3>
    <div id="detRows"></div>
    <button type="button" class="btn-arriba btn-outline-arriba" id="btnAddRow"><i class="fa-solid fa-plus me-2"></i>Adicionar título</button>

    <div class="actions" style="margin-top:18px">
      <button type="button" class="btn-arriba btn-red-arriba" id="btnGenerate"><i class="fa-solid fa-gears me-2"></i>Gerar e validar</button>
      <button type="button" class="btn-arriba btn-dark-arriba" id="btnDownload" disabled><i class="fa-solid fa-download me-2"></i>Baixar arquivo</button>
    </div>

    <div class="validation-msg" id="genMsg">Preencha os campos e gere o arquivo.</div>
    <pre class="gen-preview hidden" id="genPreview"></pre>`;
}

function addDetRow() {
  const wrap = document.getElementById("detRows");
  const cfg = direcaoConfig();
  const row = document.createElement("div");
  row.className = "det-row";
  const inputs = (cfg.formFields?.detalhe || []).map(detalheFieldInputHtml).join("");
  row.innerHTML = `${inputs}<button type="button" class="det-remove" title="Remover"><i class="fa-solid fa-trash"></i></button>`;
  row.querySelector(".det-remove").addEventListener("click", () => row.remove());
  wrap.appendChild(row);
}

function parseMoneyInput(raw) {
  if (raw === undefined || raw === null || raw === "") return 0;
  return parseFloat(String(raw).replace(/\./g, "").replace(",", ".")) || 0;
}

function collectFields(container, kind) {
  const values = {};
  container.querySelectorAll("[data-k]").forEach(el => {
    const def = fieldDef(el.dataset.k, kind);
    values[el.dataset.k] = def?.fmt === "valor" ? parseMoneyInput(el.value) : el.value.trim();
  });
  return values;
}

// Marca em vermelho os campos obrigatórios vazios; devolve true se tudo ok.
function validarObrigatorios(container, kind) {
  let ok = true;
  container.querySelectorAll("[data-k]").forEach(el => {
    const def = fieldDef(el.dataset.k, kind);
    const vazio = !String(el.value || "").trim();
    const invalido = Boolean(def?.obrigatorio) && vazio;
    el.classList.toggle("field-invalid", invalido);
    if (invalido) ok = false;
  });
  return ok;
}

function collectGenerator() {
  const header = collectFields(document.querySelector(".form-grid"), "header");
  const detalhes = [...document.querySelectorAll("#detRows .det-row")].map(row => collectFields(row, "detalhe"));
  return { header, detalhes };
}

function runGenerate() {
  const headerContainer = document.querySelector(".form-grid");
  const rows = [...document.querySelectorAll("#detRows .det-row")];

  const headerOk = validarObrigatorios(headerContainer, "header");
  const rowsOk = rows.every(row => validarObrigatorios(row, "detalhe"));

  if (!rows.length) { setMsg("genMsg", "Adicione ao menos um título.", "error"); return; }
  if (!headerOk || !rowsOk) { setMsg("genMsg", "Preencha os campos obrigatórios destacados em vermelho.", "error"); return; }

  const { header, detalhes } = collectGenerator();
  const linhas = gerarArquivo(direcaoConfig(), { header, detalhes });
  const allOk = linhas.every(l => l.length === 400);
  const preview = document.getElementById("genPreview");
  preview.textContent = linhas.join("\n");
  preview.classList.remove("hidden");
  setMsg(
    "genMsg",
    `Arquivo gerado: ${linhas.length} linha(s). Comprimento das linhas: ${allOk ? "todas com 400 ✓" : "DIVERGENTE ✗"}.`,
    allOk ? "ok" : "error"
  );
  lastGeneratedLines = allOk ? linhas : null;
  document.getElementById("btnDownload").disabled = !allOk;
}

function downloadFile() {
  if (!lastGeneratedLines) return;
  const finalizador = String.fromCharCode(0x1a);
  const content = lastGeneratedLines.join("\r\n") + "\r\n" + finalizador;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CB-${currentBank.code}-${currentDirecao}-teste.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------------------------------------------------------------
   Ajuda de preenchimento: botão "?" por campo + painel "Como preencher"
   --------------------------------------------------------------------- */

function wireHelpButtons(root) {
  root.querySelectorAll("[data-help]").forEach(btn => {
    btn.addEventListener("click", () => {
      const box = btn.closest("div").querySelector(".field-help-box");
      if (!box) return;
      const isOpen = !box.classList.contains("hidden");
      if (isOpen) {
        box.classList.add("hidden");
        return;
      }
      const { nome, posicao, tamanho, ajuda, exemplo } = btn.dataset;
      box.innerHTML = `
        <strong>${escHtml(nome)}</strong> · posição ${escHtml(posicao)} · ${escHtml(tamanho)} caractere(s)<br>
        ${escHtml(ajuda)}
        ${exemplo ? `<br><em>Exemplo: ${escHtml(exemplo)}</em>` : ""}`;
      box.classList.remove("hidden");
    });
  });
}

function openHelpPanel() {
  if (!currentBank) return;
  const cfg = direcaoConfig();
  const panel = document.getElementById("helpPanelBody");
  const rows = [];
  ["header", "detalhe"].forEach(kind => {
    (cfg.formFields?.[kind] || []).forEach(key => {
      const def = fieldDef(key, kind);
      if (!def) return;
      rows.push(`
        <tr>
          <td>${escHtml(def.nome || def.key)}</td>
          <td>${def.ini}–${def.fim}</td>
          <td>${def.fim - def.ini + 1}</td>
          <td>${def.obrigatorio ? '<span class="pill bad">Sim</span>' : '<span class="pill warn">Não</span>'}</td>
          <td>${escHtml(def.ajuda || "—")}</td>
          <td>${escHtml(def.exemplo || "—")}</td>
        </tr>`);
    });
  });

  panel.innerHTML = `
    <h3>${escHtml(currentBank.nome)} — ${directionLabel()}</h3>
    <div class="table-wrap">
      <table class="cnab-table">
        <thead><tr><th>Campo</th><th>Posição</th><th>Tamanho</th><th>Obrigatório</th><th>Ajuda</th><th>Exemplo</th></tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>`;

  document.getElementById("helpPanel").classList.remove("hidden");
  document.getElementById("helpPanelBackdrop").classList.remove("hidden");
}

function closeHelpPanel() {
  document.getElementById("helpPanel").classList.add("hidden");
  document.getElementById("helpPanelBackdrop").classList.add("hidden");
}

/* ---------------------------------------------------------------------
   Eventos por view + utilidades
   --------------------------------------------------------------------- */

function wireViewEvents() {
  const area = document.getElementById("formArea");
  if (currentMode === "reader") {
    wireReaderEvents();
  } else {
    document.getElementById("btnAddRow").addEventListener("click", () => {
      addDetRow();
      wireHelpButtons(document.getElementById("detRows"));
    });
    document.getElementById("btnGenerate").addEventListener("click", runGenerate);
    document.getElementById("btnDownload").addEventListener("click", downloadFile);
    addDetRow(); // primeira linha
  }
  wireHelpButtons(area);
}

function setMsg(id, msg, kind) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = "validation-msg" + (kind ? " " + kind : "");
}

function money(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
