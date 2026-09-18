/* =====================================================================
   Serasa - UI da ferramenta (agnostica de layout)

   Mesma divisao do Validador CNAB 400: o motor (../cnab400/engine.js) faz
   parse/geracao, os layouts (layouts/*.js) descrevem os campos, e este
   arquivo so le a tela e desenha o resultado. Nenhum campo de PEFIN ou
   REFIN aparece escrito aqui - tudo vem de config.formFields +
   headerFields/detalheFields.

   O que e especifico do Serasa (e nao existe no CNAB):

   1. Deteccao do layout pelo identificador do proprio arquivo
      (registry.js/detectarLayout), porque PEFIN e REFIN guardam esse
      identificador em posicoes diferentes.
   2. Decodificacao dos codigos de erro do retorno: o campo 534-593 traz
      ate 20 codigos de 3 digitos (codigos.js/decodificarErros).
   3. Conferencia da sequencia de status do DataCob (processo.js). Isso NAO
      vai para o arquivo - e a regra de processo que mais gera chamado
      ("negativacao que nao sai" quase sempre e acao fora de ordem), e a
      ferramenta avisa antes de gerar.
   ===================================================================== */

import { LAYOUTS, detectarLayout } from "./layouts/registry.js";
import { parseArquivo, gerarArquivo } from "../cnab400/engine.js";
import { MOTIVOS_BAIXA, MOTIVOS_POR_COD, ERROS, decodificarErros } from "./layouts/codigos.js";
import { OPERACOES, STATUS_POSSIVEIS, FLUXO_STATUS, conferirTransicao } from "./processo.js";

const TAMANHO = 600;

let currentLayout = null; // { code, nome, config }
let currentMode = "reader"; // "reader" | "generator" | "tabelas"
let lastGeneratedLines = null;
let lastParsedData = null;

function cfg() {
  return currentLayout ? currentLayout.config : null;
}

export function initUI() {
  const select = document.getElementById("layoutSelect");
  LAYOUTS.forEach((layout) => {
    const opt = document.createElement("option");
    opt.value = layout.code;
    opt.textContent = layout.nome;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    currentLayout = LAYOUTS.find((l) => l.code === select.value) || null;
    lastParsedData = null;
    if (currentMode !== "tabelas") currentMode = "reader";
    syncControls();
    renderArea();
  });

  document.getElementById("btnModeReader").addEventListener("click", () => setMode("reader"));
  document.getElementById("btnModeGenerator").addEventListener("click", () => setMode("generator"));
  document.getElementById("btnModeTabelas").addEventListener("click", () => setMode("tabelas"));
  document.getElementById("btnComoPreencher").addEventListener("click", openHelpPanel);
  document.getElementById("helpPanelClose").addEventListener("click", closeHelpPanel);
  document.getElementById("helpPanelBackdrop").addEventListener("click", closeHelpPanel);

  syncControls();
  renderArea();
}

function setMode(mode) {
  // As tabelas de codigo nao dependem de layout selecionado; os outros
  // modos sim (sem layout nao ha campo para montar).
  if (mode !== "tabelas" && !currentLayout) return;
  currentMode = mode;
  syncControls();
  renderArea();
}

function syncControls() {
  const habilitado = Boolean(currentLayout);
  document.getElementById("btnModeReader").disabled = !habilitado;
  document.getElementById("btnModeGenerator").disabled = !habilitado;
  document.getElementById("btnComoPreencher").disabled = !habilitado;

  document.getElementById("btnModeReader").classList.toggle("active", currentMode === "reader");
  document.getElementById("btnModeGenerator").classList.toggle("active", currentMode === "generator");
  document.getElementById("btnModeTabelas").classList.toggle("active", currentMode === "tabelas");

  document.getElementById("sideNote").innerHTML = habilitado
    ? `<strong>${escHtml(currentLayout.nome)}</strong><br>${escHtml(cfg().descricao || "")}<br>
       Registro de <strong>${TAMANHO}</strong> posições · identificador <code>${escHtml(cfg().identificador)}</code>.`
    : "Selecione o layout (PEFIN ou REFIN) para liberar o formulário. As tabelas de códigos funcionam sem escolher layout.";
}

function renderArea() {
  const area = document.getElementById("formArea");
  if (currentMode === "tabelas") {
    area.innerHTML = tabelasViewHtml();
    wireTabelasEvents();
    return;
  }
  if (!currentLayout) {
    area.innerHTML = `
      <h2>Nenhum layout selecionado</h2>
      <p class="hint">Escolha PEFIN ou REFIN na barra lateral. Se o que você quer é consultar um código de erro que a Serasa devolveu, abra <strong>Tabelas de códigos</strong> — não precisa de layout.</p>
      <div class="empty-form-area">
        <i class="fa-solid fa-file-shield"></i>
        Os campos do layout aparecerão aqui.
      </div>`;
    return;
  }
  area.innerHTML = currentMode === "reader" ? readerViewHtml() : generatorViewHtml();
  wireViewEvents();
}

/* =====================================================================
   Modo Validar
   ===================================================================== */

function readerViewHtml() {
  return `
    <h2>Validar arquivo — ${escHtml(currentLayout.nome)}</h2>
    <p class="hint">
      Cole o conteúdo ou envie o arquivo. O layout é reconhecido pelo identificador do próprio arquivo,
      então um arquivo do layout errado é apontado em vez de ser lido torto.
      <strong>Processamento 100% local:</strong> nada sai do navegador — importante, porque arquivo de
      negativação carrega nome, CPF e endereço de pessoa real.
    </p>

    <div class="drop-zone" id="dropZone">
      <i class="fa-solid fa-file-arrow-up"></i> Arraste o arquivo ou clique para selecionar
      <input type="file" id="fileInput" class="hidden" accept=".txt,.ret,.rem,.ser">
    </div>

    <textarea id="rawInput" class="serasa-textarea form-control" placeholder="Cole aqui as linhas de 600 posições..." spellcheck="false"></textarea>

    <div class="actions">
      <button type="button" class="btn-arriba btn-red-arriba" id="btnParse"><i class="fa-solid fa-magnifying-glass me-2"></i>Validar e extrair</button>
      <button type="button" class="btn-arriba btn-light-arriba" id="btnClearReader">Limpar</button>
    </div>

    <div class="validation-msg" id="readerMsg">Aguardando arquivo.</div>
    <div class="validation-msg warn hidden" id="readerAvisos"></div>

    <div id="readerResult" class="hidden">
      <div class="summary-grid">
        <div class="summary-item"><span>Linhas (${TAMANHO}c)</span><strong id="chipLines">-</strong></div>
        <div class="summary-item"><span>Registros</span><strong id="chipRegistros">-</strong></div>
        <div class="summary-item"><span>Header</span><strong id="chipHeader">-</strong></div>
        <div class="summary-item"><span>Com erro da Serasa</span><strong id="chipErros">-</strong></div>
      </div>
      <div class="actions">
        <button type="button" class="btn-arriba btn-outline-arriba" id="btnEditGenerate">
          <i class="fa-solid fa-pen-to-square me-2"></i>Editar e gerar novo arquivo
        </button>
      </div>
      <div class="table-wrap">
        <table class="serasa-table">
          <thead>
            <tr>
              <th>#</th><th>Op.</th><th>Documento</th><th>Nome</th>
              <th>Vencimento</th><th>Valor</th><th>Contrato</th><th>Motivo da baixa</th><th>Erros da Serasa</th>
            </tr>
          </thead>
          <tbody id="regBody"></tbody>
        </table>
      </div>
    </div>`;
}

function wireReaderEvents() {
  const dz = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  dz.addEventListener("click", () => fileInput.click());
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault(); dz.classList.remove("drag");
    if (e.dataTransfer.files[0]) lerArquivo(e.dataTransfer.files[0], "reader");
  });
  fileInput.addEventListener("change", (e) => { if (e.target.files[0]) lerArquivo(e.target.files[0], "reader"); });

  document.getElementById("btnParse").addEventListener("click", runParse);
  document.getElementById("btnClearReader").addEventListener("click", clearReader);
  document.getElementById("btnEditGenerate").addEventListener("click", editAndRegenerate);
}

function lerArquivo(file, destino) {
  const reader = new FileReader();
  reader.onload = () => {
    if (destino === "reader") {
      document.getElementById("rawInput").value = reader.result;
      runParse();
    } else {
      importarNoGerador(String(reader.result));
    }
  };
  reader.readAsText(file, "ISO-8859-1"); // arquivo posicional e ASCII/Latin-1
}

// Confere o identificador do arquivo contra o layout escolhido. Devolve
// uma mensagem de erro, ou "" quando esta coerente.
function conferirLayoutDoArquivo(texto) {
  const detectado = detectarLayout(texto);
  if (!detectado) {
    return "Não reconheci o identificador do arquivo (nem SERASA-CONVEM04/PEFIN nem SERASA-CONVEM01/REFIN). "
      + "Confira se o arquivo está completo e se as linhas têm 600 posições.";
  }
  if (detectado.code !== currentLayout.code) {
    const outro = LAYOUTS.find((l) => l.code === detectado.code);
    return `Este arquivo é ${outro ? outro.nome : detectado.code}, mas o layout selecionado é ${currentLayout.nome}. `
      + "Troque o layout na barra lateral e valide de novo.";
  }
  return "";
}

function runParse() {
  const texto = document.getElementById("rawInput").value;
  if (!texto.trim()) { setMsg("readerMsg", "Cole o conteúdo ou envie um arquivo.", "error"); return; }

  const problema = conferirLayoutDoArquivo(texto);
  if (problema) { setMsg("readerMsg", problema, "error"); return; }

  try {
    const data = parseArquivo(texto, cfg());
    lastParsedData = data;

    document.getElementById("chipLines").textContent = data.totalLinhas;
    document.getElementById("chipRegistros").textContent = data.titulos.length;

    const headerOk = data.header && data.header._valido;
    document.getElementById("chipHeader").innerHTML = headerOk
      ? '<span class="pill ok">Válido</span>'
      : '<span class="pill bad">Inválido</span>';

    const comErro = renderRegistros(data.titulos);
    document.getElementById("chipErros").innerHTML = comErro
      ? `<span class="pill bad">${comErro}</span>`
      : '<span class="pill ok">nenhum</span>';

    document.getElementById("readerResult").classList.remove("hidden");

    const msg = headerOk
      ? `Arquivo lido: ${data.titulos.length} registro(s) extraído(s)${comErro ? `, ${comErro} com código de erro da Serasa.` : "."}`
      : "Header fora do padrão — " + data.header._erros.join("; ");
    setMsg("readerMsg", msg, headerOk ? "ok" : "error");
    renderAvisos(data.avisos);
  } catch (err) {
    lastParsedData = null;
    setMsg("readerMsg", "Erro ao processar: " + err.message, "error");
  }
}

function renderAvisos(avisos = []) {
  const box = document.getElementById("readerAvisos");
  if (!box) return;
  if (!avisos.length) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }
  box.classList.remove("hidden");
  box.innerHTML = `
    <strong>⚠️ ${avisos.length} ${avisos.length === 1 ? "aviso de estrutura" : "avisos de estrutura"}</strong>
    <ul>${avisos.map((a) => `<li>${escHtml(a)}</li>`).join("")}</ul>`;
}

// Desenha a tabela de registros e devolve quantos vieram com erro.
function renderRegistros(registros) {
  const body = document.getElementById("regBody");
  body.innerHTML = "";
  let comErro = 0;

  registros.forEach((reg, i) => {
    const erros = decodificarErros(reg.codigosErro);
    const rejeicoes = erros.filter((e) => !e.informacional);
    if (rejeicoes.length) comErro += 1;

    const errosHtml = erros.length
      ? erros.map((e) => `<span class="pill ${e.informacional ? "warn" : "bad"}" title="${escHtml(e.desc)}">${e.cod}</span> ${escHtml(e.desc)}`).join("<br>")
      : '<span class="pill ok">aceito</span>';

    const motivo = reg.motivoBaixa ? MOTIVOS_POR_COD[reg.motivoBaixa] : null;
    const opLabel = OPERACOES[String(reg.operacao || "").toUpperCase()] || "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><span class="pill ${reg.operacao === "E" ? "warn" : "ok"}" title="${escHtml(opLabel)}">${escHtml(reg.operacao || "—")}</span></td>
      <td>${escHtml(formatarDocumento(reg.doc1, reg.tipoPessoa))}</td>
      <td>${escHtml(reg.nomeDevedor || "—")}</td>
      <td>${escHtml(reg.dataOcorrencia || "—")}</td>
      <td class="num">${money(reg.valor)}</td>
      <td>${escHtml(reg.numeroContrato || "—")}</td>
      <td>${reg.motivoBaixa ? `${escHtml(reg.motivoBaixa)} — ${escHtml(motivo ? motivo.nome : "código não catalogado")}` : "—"}</td>
      <td>${errosHtml}</td>`;
    body.appendChild(tr);
  });

  return comErro;
}

/* CPF/CNPJ com a pontuacao de sempre.

   O campo tem 15 posicoes e vem alinhado a direita com zeros a esquerda,
   ou seja, um CPF chega como "000011122233396". Nao da para simplesmente
   cortar os zeros da frente: CPF pode comecar com zero de verdade
   (012.345.678-90). O tipo de pessoa (F/J) diz quantos digitos sao
   significativos, entao pegamos os ULTIMOS 11 (CPF) ou 14 (CNPJ). Sem o
   tipo, cai no palpite conservador pelo tamanho apos tirar o excesso. */
function formatarDocumento(valor, tipoPessoa) {
  const digitos = String(valor || "").replace(/\D/g, "");
  if (!digitos) return "—";

  const tipo = String(tipoPessoa || "").toUpperCase();
  let nucleo = digitos;
  if (tipo === "F" && digitos.length >= 11) nucleo = digitos.slice(-11);
  else if (tipo === "J" && digitos.length >= 14) nucleo = digitos.slice(-14);
  else nucleo = digitos.replace(/^0+(?=\d{11,}$)/, ""); // tira só o excesso de padding

  if (nucleo.length === 11) return nucleo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (nucleo.length === 14) return nucleo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return nucleo;
}

function clearReader() {
  document.getElementById("rawInput").value = "";
  document.getElementById("readerResult").classList.add("hidden");
  document.getElementById("readerAvisos").classList.add("hidden");
  setMsg("readerMsg", "Aguardando arquivo.", "");
  lastParsedData = null;
}

/* =====================================================================
   Modo Gerar
   ===================================================================== */

function fieldDef(key, kind) {
  const lista = kind === "header" ? cfg().headerFields : cfg().detalheFields;
  return lista.find((d) => d.key === key);
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

function inputHtml(def, kind) {
  const key = def.key;
  if (key === "operacao") {
    const opts = Object.entries(OPERACOES)
      .map(([cod, desc]) => `<option value="${cod}">${cod} — ${escHtml(desc)}</option>`).join("");
    return `<select class="form-select" data-k="${key}">${opts}</select>`;
  }
  if (key === "motivoBaixa") {
    // Só os motivos que o credor pode enviar: os marcados soSerasa são de
    // uso exclusivo da Serasa e seriam rejeitados se fossemos nós a mandar.
    const opts = MOTIVOS_BAIXA.filter((m) => !m.soSerasa)
      .map((m) => `<option value="${m.cod}">${m.cod} — ${escHtml(m.nome)}</option>`).join("");
    return `<select class="form-select" data-k="${key}"><option value="">— sem motivo (só para inclusão) —</option>${opts}</select>`;
  }
  if (def.fmt === "data8" || def.fmt === "data") {
    return `<input type="date" class="form-control" data-k="${key}">`;
  }
  if (def.fmt === "valor" || def.fmt === "valorVirgula") {
    return `<input class="form-control" data-k="${key}" placeholder="0,00">`;
  }
  return `<input class="form-control" data-k="${key}" placeholder="${escHtml(def.exemplo || "")}">`;
}

function fieldBlockHtml(key, kind) {
  const def = fieldDef(key, kind);
  if (!def) return "";
  const req = def.obrigatorio ? '<span class="req-mark">*</span>' : "";
  return `<div class="field">
    <label>${escHtml(def.nome || key)}${req} ${helpButtonHtml(def)}</label>
    ${inputHtml(def, kind)}
    <div class="field-help-box hidden"></div>
  </div>`;
}

function generatorViewHtml() {
  const headerHtml = (cfg().formFields?.header || []).map((k) => fieldBlockHtml(k, "header")).join("");
  return `
    <h2>Gerar arquivo — ${escHtml(currentLayout.nome)}</h2>
    <p class="hint">
      Preencha o cabeçalho e um registro por devedor. Campos com <span class="req-mark">*</span> são obrigatórios;
      o "?" mostra posição, tamanho e exemplo. Use dados fictícios para teste — o arquivo gerado tem o mesmo
      formato do que vai para a Serasa.
    </p>

    <div class="drop-zone" id="genDropZone">
      <i class="fa-solid fa-file-arrow-up"></i> Já tem um arquivo? Arraste ou clique para importar e editar os campos abaixo
      <input type="file" id="genFileInput" class="hidden" accept=".txt,.ret,.rem,.ser">
    </div>

    <div class="form-grid">${headerHtml}</div>

    <h3 class="det-title">Registros (um por devedor)</h3>
    <div id="detRows"></div>
    <button type="button" class="btn-arriba btn-outline-arriba" id="btnAddRow"><i class="fa-solid fa-plus me-2"></i>Adicionar registro</button>

    <div class="actions" style="margin-top:18px">
      <button type="button" class="btn-arriba btn-red-arriba" id="btnGenerate"><i class="fa-solid fa-gears me-2"></i>Gerar e validar</button>
      <button type="button" class="btn-arriba btn-dark-arriba" id="btnDownload" disabled><i class="fa-solid fa-download me-2"></i>Baixar arquivo</button>
    </div>

    <div class="validation-msg" id="genMsg">Preencha os campos e gere o arquivo, ou importe um arquivo acima para editar.</div>
    <div class="validation-msg warn hidden" id="genFluxoMsg"></div>
    <pre class="gen-preview hidden" id="genPreview"></pre>`;
}

function addDetRow() {
  const wrap = document.getElementById("detRows");
  const row = document.createElement("div");
  row.className = "det-row";
  const campos = (cfg().formFields?.detalhe || []).map((k) => fieldBlockHtml(k, "detalhe")).join("");
  // O status atual NAO e campo do arquivo: e a conferencia da sequencia do
  // DataCob (processo.js). Fica marcado como tal para ninguem procurar
  // essa informacao no layout depois.
  const statusOpts = STATUS_POSSIVEIS.map((s) => `<option value="${escHtml(s)}">${escHtml(s)}</option>`).join("");
  row.innerHTML = `${campos}
    <div class="field">
      <label>Status atual no DataCob <span class="tag-fora">não vai no arquivo</span></label>
      <select class="form-select" data-status><option value="">— não conferir —</option>${statusOpts}</select>
      <div class="field-help-box hidden"></div>
    </div>
    <button type="button" class="det-remove" title="Remover registro"><i class="fa-solid fa-trash"></i></button>`;
  row.querySelector(".det-remove").addEventListener("click", () => row.remove());
  wrap.appendChild(row);
}

function parseMoneyInput(raw) {
  if (raw === undefined || raw === null || raw === "") return 0;
  return parseFloat(String(raw).replace(/\./g, "").replace(",", ".")) || 0;
}

function collectFields(container, kind) {
  const values = {};
  container.querySelectorAll("[data-k]").forEach((el) => {
    const def = fieldDef(el.dataset.k, kind);
    const ehValor = def?.fmt === "valor" || def?.fmt === "valorVirgula";
    values[el.dataset.k] = ehValor ? parseMoneyInput(el.value) : el.value.trim();
  });
  return values;
}

function validarObrigatorios(container, kind) {
  let ok = true;
  container.querySelectorAll("[data-k]").forEach((el) => {
    const def = fieldDef(el.dataset.k, kind);
    const invalido = Boolean(def?.obrigatorio) && !String(el.value || "").trim();
    el.classList.toggle("field-invalid", invalido);
    if (invalido) ok = false;
  });
  return ok;
}

/* Regras que o layout nao pega e que a Serasa rejeitaria depois:
   - exclusao (E) sem motivo da baixa -> registro recusado;
   - operacao fora da sequencia de status do DataCob (processo.js).
   Devolve uma lista de textos para mostrar antes do download. */
function conferirRegras(rows) {
  const problemas = [];
  rows.forEach((row, i) => {
    const operacao = row.querySelector('[data-k="operacao"]')?.value || "";
    const motivo = row.querySelector('[data-k="motivoBaixa"]')?.value || "";
    const status = row.querySelector("[data-status]")?.value || "";

    if (operacao.toUpperCase() === "E" && !motivo) {
      problemas.push(`Registro ${i + 1}: operação E (exclusão) exige o motivo da baixa — a Serasa rejeita sem ele.`);
    }
    if (operacao.toUpperCase() !== "E" && motivo) {
      problemas.push(`Registro ${i + 1}: motivo da baixa preenchido numa operação ${operacao || "?"} — o motivo só vale na exclusão.`);
    }
    const transicao = conferirTransicao(operacao, status);
    if (!transicao.ok) problemas.push(`Registro ${i + 1}: ${transicao.mensagem}`);
  });
  return problemas;
}

function runGenerate() {
  const headerContainer = document.querySelector(".form-grid");
  const rows = [...document.querySelectorAll("#detRows .det-row")];

  if (!rows.length) { setMsg("genMsg", "Adicione ao menos um registro.", "error"); return; }

  const headerOk = validarObrigatorios(headerContainer, "header");
  const rowsOk = rows.every((row) => validarObrigatorios(row, "detalhe"));
  if (!headerOk || !rowsOk) {
    setMsg("genMsg", "Preencha os campos obrigatórios destacados em vermelho.", "error");
    return;
  }

  const header = collectFields(headerContainer, "header");
  const detalhes = rows.map((row) => collectFields(row, "detalhe"));
  const linhas = gerarArquivo(cfg(), { header, detalhes });
  const todasOk = linhas.every((l) => l.length === TAMANHO);

  const preview = document.getElementById("genPreview");
  preview.textContent = linhas.join("\n");
  preview.classList.remove("hidden");

  setMsg(
    "genMsg",
    `Arquivo gerado: ${linhas.length} linha(s). Comprimento: ${todasOk ? `todas com ${TAMANHO} ✓` : "DIVERGENTE ✗"}.`,
    todasOk ? "ok" : "error"
  );

  // Avisos de processo nao impedem o download: o arquivo esta valido no
  // formato, e quem conhece o caso decide. Mas aparecem em destaque.
  const problemas = conferirRegras(rows);
  const boxFluxo = document.getElementById("genFluxoMsg");
  if (problemas.length) {
    boxFluxo.classList.remove("hidden");
    boxFluxo.innerHTML = `<strong>⚠️ ${problemas.length} ponto(s) de atenção no processo</strong>
      <ul>${problemas.map((p) => `<li>${escHtml(p)}</li>`).join("")}</ul>`;
  } else {
    boxFluxo.classList.add("hidden");
    boxFluxo.innerHTML = "";
  }

  lastGeneratedLines = todasOk ? linhas : null;
  document.getElementById("btnDownload").disabled = !todasOk;
}

function downloadFile() {
  if (!lastGeneratedLines) return;
  const content = lastGeneratedLines.join("\r\n") + "\r\n";
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SERASA-${currentLayout.code.toUpperCase()}-teste.TXT`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------------------------------------------------------------
   Importar / editar um arquivo lido no modo Gerar
   --------------------------------------------------------------------- */

function editAndRegenerate() {
  if (!lastParsedData) return;
  currentMode = "generator";
  syncControls();
  renderArea();
  const n = preencherGerador(lastParsedData);
  setMsg("genMsg", `Arquivo carregado para edição: ${n} registro(s). Ajuste os campos e clique em "Gerar e validar".`, "");
}

function importarNoGerador(texto) {
  const problema = conferirLayoutDoArquivo(texto);
  if (problema) { setMsg("genMsg", problema, "error"); return; }
  try {
    const data = parseArquivo(texto, cfg());
    lastParsedData = data;
    const n = preencherGerador(data);
    const headerOk = data.header && data.header._valido;
    setMsg(
      "genMsg",
      headerOk
        ? `Arquivo importado: ${n} registro(s) carregado(s) para edição.`
        : `Arquivo importado com header fora do padrão — confira os campos antes de gerar. ${n} registro(s) carregado(s).`,
      headerOk ? "ok" : "error"
    );
  } catch (err) {
    setMsg("genMsg", "Erro ao importar arquivo: " + err.message, "error");
  }
}

function preencherGerador(data) {
  const headerContainer = document.querySelector(".form-grid");
  if (headerContainer && data.header) {
    headerContainer.querySelectorAll("[data-k]").forEach((el) => {
      preencherCampo(el, fieldDef(el.dataset.k, "header"), data.header[el.dataset.k]);
    });
  }

  const detRows = document.getElementById("detRows");
  detRows.innerHTML = "";
  const registros = data.titulos && data.titulos.length ? data.titulos : [{}];
  registros.forEach((reg) => {
    addDetRow();
    const row = detRows.lastElementChild;
    row.querySelectorAll("[data-k]").forEach((el) => {
      preencherCampo(el, fieldDef(el.dataset.k, "detalhe"), reg[el.dataset.k]);
    });
  });
  wireHelpButtons(detRows);
  return registros.length;
}

function preencherCampo(el, def, valorLido) {
  if (!def || valorLido === undefined || valorLido === null || valorLido === "") return;
  if (el.tagName === "SELECT") { el.value = valorLido; return; }
  if (def.fmt === "valor" || def.fmt === "valorVirgula") {
    el.value = Number(valorLido).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (def.fmt === "data8" || def.fmt === "data") {
    el.value = dataBrParaIso(valorLido);
  } else {
    el.value = valorLido;
  }
}

function dataBrParaIso(dataBr) {
  if (!dataBr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dataBr)) return "";
  const [d, m, y] = String(dataBr).split("/");
  return `${y}-${m}-${d}`;
}

/* =====================================================================
   Modo Tabelas de códigos (erros + motivos de baixa)
   ===================================================================== */

function tabelasViewHtml() {
  return `
    <h2>Tabelas de códigos do Serasa</h2>
    <p class="hint">
      As duas tabelas que o suporte consulta o tempo todo: os <strong>códigos de erro</strong> que a Serasa
      devolve (campo 534-593 do retorno, em grupos de 3 dígitos) e os <strong>motivos da baixa</strong>
      (obrigatórios na exclusão). Busque por código ou por texto.
    </p>

    <div class="tab-switch">
      <button type="button" class="btn-arriba btn-light-arriba active" data-tabela="erros">Erros (${ERROS.length})</button>
      <button type="button" class="btn-arriba btn-light-arriba" data-tabela="motivos">Motivos da baixa (${MOTIVOS_BAIXA.length})</button>
    </div>

    <input class="form-control" id="tabelaBusca" placeholder="Buscar: 017, data decursada, pagamento..." autocomplete="off">

    <div class="fluxo-box">
      <strong>Sequência obrigatória de status no DataCob</strong>
      <ol>
        ${FLUXO_STATUS.map((f) => `<li><strong>${escHtml(f.acao)}</strong> — exige "${escHtml(f.statusExigido)}" e deixa em "${escHtml(f.statusResultante)}".</li>`).join("")}
      </ol>
      Ação fora dessa ordem é a causa mais comum de "a negativação não saiu".
    </div>

    <div class="table-wrap">
      <table class="serasa-table">
        <thead id="tabelaHead"></thead>
        <tbody id="tabelaBody"></tbody>
      </table>
    </div>
    <p class="hint" id="tabelaRodape"></p>`;
}

let tabelaAtiva = "erros";

function wireTabelasEvents() {
  document.querySelectorAll("[data-tabela]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tabelaAtiva = btn.dataset.tabela;
      document.querySelectorAll("[data-tabela]").forEach((b) => b.classList.toggle("active", b === btn));
      renderTabela();
    });
  });
  document.getElementById("tabelaBusca").addEventListener("input", renderTabela);
  renderTabela();
}

function renderTabela() {
  const termo = normalizar(document.getElementById("tabelaBusca")?.value || "");
  const head = document.getElementById("tabelaHead");
  const body = document.getElementById("tabelaBody");
  const rodape = document.getElementById("tabelaRodape");

  if (tabelaAtiva === "erros") {
    const lista = ERROS.filter((e) => !termo || normalizar(`${e.cod} ${e.desc}`).includes(termo));
    head.innerHTML = "<tr><th>Código</th><th>Descrição</th><th>Tipo</th></tr>";
    body.innerHTML = lista.map((e) => `
      <tr>
        <td><strong>${escHtml(e.cod)}</strong></td>
        <td class="wrap">${escHtml(e.desc)}</td>
        <td>${e.informacional ? '<span class="pill warn">informacional</span>' : (e.retorno ? '<span class="pill bad">rejeição</span>' : '<span class="pill">sem marca na fonte</span>')}</td>
      </tr>`).join("") || '<tr><td colspan="3">Nenhum código encontrado.</td></tr>';
    rodape.textContent = `${lista.length} de ${ERROS.length} códigos de erro.`;
    return;
  }

  const lista = MOTIVOS_BAIXA.filter((m) => !termo || normalizar(`${m.cod} ${m.nome} ${m.desc}`).includes(termo));
  head.innerHTML = "<tr><th>Código</th><th>Motivo</th><th>O que significa</th><th>Quem envia</th></tr>";
  body.innerHTML = lista.map((m) => `
    <tr>
      <td><strong>${escHtml(m.cod)}</strong></td>
      <td class="wrap">${escHtml(m.nome)}</td>
      <td class="wrap">${escHtml(m.desc || "—")}</td>
      <td>${m.soSerasa ? '<span class="pill warn">só Serasa</span>' : '<span class="pill ok">o credor</span>'}</td>
    </tr>`).join("") || '<tr><td colspan="4">Nenhum motivo encontrado.</td></tr>';
  rodape.textContent = `${lista.length} de ${MOTIVOS_BAIXA.length} motivos. Os marcados "só Serasa" não podem ser enviados pelo credor.`;
}

function normalizar(valor) {
  return String(valor || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/* =====================================================================
   Ajuda de preenchimento
   ===================================================================== */

function wireHelpButtons(root) {
  root.querySelectorAll("[data-help]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const box = btn.closest("div").querySelector(".field-help-box");
      if (!box) return;
      if (!box.classList.contains("hidden")) { box.classList.add("hidden"); return; }
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
  if (!currentLayout) return;
  const linhas = [];
  ["header", "detalhe"].forEach((kind) => {
    (cfg().formFields?.[kind] || []).forEach((key) => {
      const def = fieldDef(key, kind);
      if (!def) return;
      linhas.push(`
        <tr>
          <td class="wrap">${escHtml(def.nome || def.key)}</td>
          <td>${def.ini}–${def.fim}</td>
          <td>${def.fim - def.ini + 1}</td>
          <td>${def.obrigatorio ? '<span class="pill bad">Sim</span>' : '<span class="pill warn">Não</span>'}</td>
          <td class="wrap">${escHtml(def.ajuda || "—")}</td>
          <td>${escHtml(def.exemplo || "—")}</td>
        </tr>`);
    });
  });

  document.getElementById("helpPanelBody").innerHTML = `
    <h3>${escHtml(currentLayout.nome)}</h3>
    <p class="hint">${escHtml(cfg().descricao || "")} Registro de ${TAMANHO} posições, identificador <code>${escHtml(cfg().identificador)}</code>.</p>
    <div class="table-wrap">
      <table class="serasa-table">
        <thead><tr><th>Campo</th><th>Posição</th><th>Tam.</th><th>Obrigatório</th><th>Ajuda</th><th>Exemplo</th></tr></thead>
        <tbody>${linhas.join("")}</tbody>
      </table>
    </div>`;

  document.getElementById("helpPanel").classList.remove("hidden");
  document.getElementById("helpPanelBackdrop").classList.remove("hidden");
}

function closeHelpPanel() {
  document.getElementById("helpPanel").classList.add("hidden");
  document.getElementById("helpPanelBackdrop").classList.add("hidden");
}

/* =====================================================================
   Eventos por view + utilidades
   ===================================================================== */

function wireViewEvents() {
  const area = document.getElementById("formArea");
  if (currentMode === "reader") {
    wireReaderEvents();
  } else {
    const dz = document.getElementById("genDropZone");
    const input = document.getElementById("genFileInput");
    dz.addEventListener("click", () => input.click());
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault(); dz.classList.remove("drag");
      if (e.dataTransfer.files[0]) lerArquivo(e.dataTransfer.files[0], "generator");
    });
    input.addEventListener("change", (e) => { if (e.target.files[0]) lerArquivo(e.target.files[0], "generator"); });

    document.getElementById("btnAddRow").addEventListener("click", () => {
      addDetRow();
      wireHelpButtons(document.getElementById("detRows"));
    });
    document.getElementById("btnGenerate").addEventListener("click", runGenerate);
    document.getElementById("btnDownload").addEventListener("click", downloadFile);
    addDetRow(); // primeiro registro
  }
  wireHelpButtons(area);
}

function setMsg(id, msg, kind) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = "validation-msg" + (kind ? " " + kind : "");
}

function money(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
