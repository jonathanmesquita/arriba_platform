/* =====================================================================
   CNAB 400 - UI genérica (agnóstica de banco)

   Lê o banco selecionado (banks/registry.js) e monta o formulário a
   partir de config.formFields + config.headerFields/detalheFields —
   nenhum HTML aqui é específico de um banco. O motor (engine.js) faz
   todo o parse/geração; este arquivo só lê a tela e desenha o resultado.
   ===================================================================== */

import { BANKS } from "./banks/registry.js";
import { parseArquivo, gerarArquivo } from "./engine.js";

let currentBank = null; // { code, nome, config }
let currentMode = "reader"; // "reader" | "generator"
let lastGeneratedLines = null;

export function initUI() {
  const select = document.getElementById("bankSelect");
  BANKS.forEach(bank => {
    const opt = document.createElement("option");
    opt.value = bank.code;
    opt.textContent = `${bank.nome} (${bank.code})`;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    currentBank = BANKS.find(b => b.code === select.value) || null;
    currentMode = "reader";
    syncModeButtons();
    renderArea();
  });

  document.getElementById("btnModeReader").addEventListener("click", () => setMode("reader"));
  document.getElementById("btnModeGenerator").addEventListener("click", () => setMode("generator"));

  syncModeButtons();
  renderArea();
}

function setMode(mode) {
  if (!currentBank) return;
  currentMode = mode;
  syncModeButtons();
  renderArea();
}

function syncModeButtons() {
  const btnReader = document.getElementById("btnModeReader");
  const btnGenerator = document.getElementById("btnModeGenerator");
  const enabled = Boolean(currentBank);
  btnReader.disabled = !enabled;
  btnGenerator.disabled = !enabled;
  btnReader.classList.toggle("active", currentMode === "reader");
  btnGenerator.classList.toggle("active", currentMode === "generator");

  const sideNote = document.getElementById("sideNote");
  sideNote.innerHTML = enabled
    ? `<strong>${escHtml(currentBank.nome)} (${escHtml(currentBank.code)})</strong><br>Formulário e ações liberados abaixo.`
    : (BANKS.length
      ? "Selecione um banco para liberar o formulário e as ações."
      : "<strong>Nenhum banco disponível ainda.</strong><br>Cadastre um banco em <code>banks/</code> e registre em <code>registry.js</code>.");
}

function renderArea() {
  const area = document.getElementById("formArea");
  if (!currentBank) {
    area.innerHTML = `
      <h2>Nenhum banco selecionado</h2>
      <p class="hint">Escolha um banco na barra lateral para carregar o formulário correspondente.</p>
      <div class="empty-form-area">
        <i class="fa-solid fa-building-columns"></i>
        Os campos deste banco aparecerão aqui.
      </div>`;
    return;
  }
  area.innerHTML = currentMode === "reader" ? readerViewHtml() : generatorViewHtml();
  wireViewEvents();
}

/* ---------------------------------------------------------------------
   Modo Validar (leitor)
   --------------------------------------------------------------------- */

function readerViewHtml() {
  return `
    <h2>Validar retorno — ${escHtml(currentBank.nome)}</h2>
    <p class="hint">Cole o conteúdo do arquivo ou envie um .RET/.TXT. Nada é enviado a servidor.</p>

    <div class="drop-zone" id="dropZone">
      <i class="fa-solid fa-file-arrow-up"></i> Arraste um arquivo ou clique para selecionar
      <input type="file" id="fileInput" class="hidden" accept=".ret,.txt">
    </div>

    <textarea id="rawInput" class="form-control cnab-textarea" placeholder="Cole aqui o conteúdo do retorno..." spellcheck="false"></textarea>

    <div class="actions">
      <button type="button" class="btn-arriba btn-red-arriba" id="btnParse"><i class="fa-solid fa-magnifying-glass me-2"></i>Validar e extrair</button>
      <button type="button" class="btn-arriba btn-light-arriba" id="btnClearReader">Limpar</button>
    </div>

    <div class="validation-msg" id="readerMsg">Aguardando arquivo de retorno.</div>

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

function runParse() {
  const text = document.getElementById("rawInput").value;
  if (!text.trim()) { setMsg("readerMsg", "Cole o conteúdo ou envie um arquivo.", "error"); return; }

  try {
    const data = parseArquivo(text, currentBank.config);

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
  titulos.forEach((t, i) => {
    const motivos = t.motivosList.length
      ? t.motivosList.map(m => `${m.cod} (${escHtml(m.desc)})`).join("<br>")
      : "—";
    const ocPill = t.ocorrencia === "06" ? "ok" : (["03", "27", "30", "32"].includes(t.ocorrencia) ? "bad" : "warn");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escHtml(t.nossoNumero)}</td>
      <td><span class="pill ${ocPill}">${escHtml(t.ocorrencia)}</span> ${escHtml(t.ocorrenciaDesc || "")}</td>
      <td>${escHtml(t.dataVencimento) || "—"}</td>
      <td class="num">${money(t.valorTitulo)}</td>
      <td class="num">${money(t.valorPago)}</td>
      <td>${escHtml(t.dataCredito) || "—"}</td>
      <td>${motivos}</td>`;
    body.appendChild(tr);
  });
}

function clearReader() {
  document.getElementById("rawInput").value = "";
  document.getElementById("readerResult").classList.add("hidden");
  setMsg("readerMsg", "Aguardando arquivo de retorno.", "");
}

/* ---------------------------------------------------------------------
   Modo Gerar
   --------------------------------------------------------------------- */

function fieldDef(key, kind) {
  const list = kind === "header" ? currentBank.config.headerFields : currentBank.config.detalheFields;
  return list.find(d => d.key === key);
}

function headerFieldInputHtml(key) {
  const def = fieldDef(key, "header");
  const label = def?.nome || key;
  const id = `gen_${key}`;
  if (def?.fmt === "data") {
    return `<div class="field"><label for="${id}">${escHtml(label)}</label><input type="date" class="form-control" id="${id}" data-k="${key}"></div>`;
  }
  return `<div class="field"><label for="${id}">${escHtml(label)}</label><input class="form-control" id="${id}" data-k="${key}"></div>`;
}

function detalheFieldInputHtml(key) {
  const def = fieldDef(key, "detalhe");
  const label = def?.nome || key;

  if (key === "ocorrencia" && currentBank.config.ocorrencias) {
    const options = Object.entries(currentBank.config.ocorrencias)
      .map(([code, desc]) => `<option value="${code}">${code} — ${escHtml(desc)}</option>`).join("");
    return `<div><label>${escHtml(label)}</label><select class="form-select" data-k="${key}">${options}</select></div>`;
  }
  if (def?.fmt === "data") {
    return `<div><label>${escHtml(label)}</label><input type="date" class="form-control" data-k="${key}"></div>`;
  }
  if (def?.fmt === "valor") {
    return `<div><label>${escHtml(label)}</label><input class="form-control" data-k="${key}" placeholder="0,00"></div>`;
  }
  return `<div><label>${escHtml(label)}</label><input class="form-control" data-k="${key}"></div>`;
}

function generatorViewHtml() {
  const headerFields = (currentBank.config.formFields?.header || []).map(headerFieldInputHtml).join("");
  return `
    <h2>Gerar arquivo — ${escHtml(currentBank.nome)}</h2>
    <p class="hint">Preencha o cabeçalho e adicione um ou mais títulos. Valores em reais (ex.: 1.234,56).</p>

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
  const row = document.createElement("div");
  row.className = "det-row";
  const inputs = (currentBank.config.formFields?.detalhe || []).map(detalheFieldInputHtml).join("");
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

function collectGenerator() {
  const header = collectFields(document.querySelector(".form-grid"), "header");
  const detalhes = [...document.querySelectorAll("#detRows .det-row")].map(row => collectFields(row, "detalhe"));
  return { header, detalhes };
}

function runGenerate() {
  const { header, detalhes } = collectGenerator();
  const requiredHeader = currentBank.config.formFields?.header || [];
  const errs = [];
  requiredHeader.forEach(key => {
    if (!header[key]) errs.push(`Campo obrigatório: ${fieldDef(key, "header")?.nome || key}.`);
  });
  if (!detalhes.length) errs.push("Adicione ao menos um título.");
  if (errs.length) { setMsg("genMsg", errs.join(" "), "error"); return; }

  const linhas = gerarArquivo(currentBank.config, { header, detalhes });
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
  a.download = `CB-${currentBank.code}-retorno-teste.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------------------------------------------------------------
   Eventos por view + utilidades
   --------------------------------------------------------------------- */

function wireViewEvents() {
  if (currentMode === "reader") {
    wireReaderEvents();
  } else {
    document.getElementById("btnAddRow").addEventListener("click", addDetRow);
    document.getElementById("btnGenerate").addEventListener("click", runGenerate);
    document.getElementById("btnDownload").addEventListener("click", downloadFile);
    addDetRow(); // primeira linha
  }
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
  return String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
