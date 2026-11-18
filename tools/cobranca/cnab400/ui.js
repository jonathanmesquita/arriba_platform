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
import { lerEValidar, validarValor, validarLinhas } from "./validacao.js";
import { mostrarMensagem, limparMensagem, irParaCampo, mostrarResumo, atualizarProgresso } from "../validacao-ux.js";
import { gerarNome, gerarCpf, gerarValorAleatorio, formatarNumeroBr } from "../../../assets/js/fake-data-br.js";

let currentBank = null; // { code, nome, config }
let currentDirecao = "retorno"; // "remessa" | "retorno"
let currentMode = "reader"; // "reader" | "generator"
let lastGeneratedLines = null;
let lastParsedData = null; // { header, titulos } do último arquivo lido com sucesso

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

  // Abre já pronto para montar um arquivo: primeiro banco, remessa e o modo
  // Gerar. Quem quer só conferir um arquivo troca para "Validar" com um clique.
  if (BANKS.length) {
    currentBank = BANKS[0];
    currentDirecao = "remessa";
    currentMode = "generator";
    bankSelect.value = currentBank.code;
  }
  ajustarDirecao();

  bankSelect.addEventListener("change", () => {
    currentBank = BANKS.find(b => b.code === bankSelect.value) || null;
    ajustarDirecao();
    lastParsedData = null;
    syncControls();
    renderArea();
  });

  document.getElementById("direcaoSelect").addEventListener("change", e => {
    currentDirecao = e.target.value;
    lastParsedData = null;
    syncControls();
    renderArea();
  });

  document.getElementById("btnModeReader").addEventListener("click", () => setMode("reader"));
  document.getElementById("btnModeGenerator").addEventListener("click", () => setMode("generator"));
  document.getElementById("btnComoPreencher").addEventListener("click", openHelpPanel);
  document.getElementById("helpPanelClose").addEventListener("click", closeHelpPanel);
  const janela = document.getElementById("helpPanel");
  janela.addEventListener("click", e => { if (e.target === janela) closeHelpPanel(); }); // clique fora do cartão
  document.getElementById("helpFiltro").addEventListener("input", filtrarAjuda);
  document.getElementById("helpSoObrig").addEventListener("change", filtrarAjuda);

  syncControls();
  renderArea();
}

/* Nem todo banco tem as duas direções (o layout do Paulista, por exemplo, é só
   remessa): a direção sem layout fica desabilitada e, se era a escolhida, a
   tela passa para a que existe. */
function ajustarDirecao() {
  if (!currentBank) return;
  const tem = (d) => Boolean(currentBank.config[d]);
  if (!tem(currentDirecao)) currentDirecao = tem("remessa") ? "remessa" : "retorno";
  document.querySelectorAll("#direcaoSelect option").forEach(o => { o.disabled = !tem(o.value); });
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
    ? `<strong>${bankIconHtml()}${escHtml(currentBank.nome)} (${escHtml(currentBank.code)})</strong> · ${currentDirecao === "remessa" ? "Remessa" : "Retorno"}<br>Formulário e ações liberados abaixo.`
    : (BANKS.length
      ? "Selecione um banco para liberar o formulário e as ações."
      : "<strong>Nenhum banco disponível ainda.</strong><br>Cadastre um banco em <code>banks/</code> e registre em <code>registry.js</code>.");
}

// Ícone neutro de banco, igual para todos. Até nov/2026 aqui entrava o
// LOGO de cada banco — marca registrada de terceiro, que saiu do
// repositório. O que identifica o layout é o nome e o código de
// compensação, escritos ao lado: é uso descritivo de uma especificação
// pública. Banco novo não precisa de imagem nenhuma.
function bankIconHtml() {
  return '<i class="fa-solid fa-building-columns bank-icon-badge" aria-hidden="true"></i>';
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
    <p class="hint">Cole o conteúdo do arquivo ou envie um .RET/.REM/.TXT. Nada é enviado a servidor.</p>

    <div class="drop-zone" id="dropZone">
      <i class="fa-solid fa-file-arrow-up"></i> Arraste um arquivo ou clique para selecionar
      <input type="file" id="fileInput" class="hidden" accept=".ret,.rem,.txt">
    </div>

    <textarea id="rawInput" class="form-control cnab-textarea" placeholder="Cole aqui o conteúdo do arquivo..." spellcheck="false"></textarea>

    <div class="actions">
      <button type="button" class="btn-arriba btn-red-arriba" id="btnParse"><i class="fa-solid fa-magnifying-glass me-2"></i>Validar e extrair</button>
      <button type="button" class="btn-arriba btn-light-arriba" id="btnClearReader">Limpar</button>
    </div>

    <div class="validation-msg" id="readerMsg">Aguardando arquivo de ${directionLabel().toLowerCase()}.</div>
    <div class="validation-msg warn hidden" id="readerAvisos"></div>

    <div id="readerResult" class="hidden">
      <div class="summary-grid">
        <div class="summary-item"><span>Linhas (400c)</span><strong id="chipLines">-</strong></div>
        <div class="summary-item"><span>Títulos</span><strong id="chipTitulos">-</strong></div>
        <div class="summary-item"><span>Header</span><strong id="chipHeader">-</strong></div>
      </div>
      <div class="actions">
        <button type="button" class="btn-arriba btn-outline-arriba" id="btnEditGenerate">
          <i class="fa-solid fa-pen-to-square me-2"></i>Editar e gerar novo arquivo
        </button>
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
  document.getElementById("btnEditGenerate").addEventListener("click", editAndRegenerate);
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
    const data = lerEValidar(text, direcaoConfig(), { direcao: currentDirecao });
    lastParsedData = data;

    document.getElementById("chipLines").textContent = data.totalLinhas;
    document.getElementById("chipTitulos").textContent = data.titulos.length;

    const hValid = data.header && data.header._valido;
    document.getElementById("chipHeader").innerHTML = hValid
      ? '<span class="pill ok">Válido</span>'
      : '<span class="pill bad">Inválido</span>';

    renderTitulos(data.titulos);
    document.getElementById("readerResult").classList.remove("hidden");

    const nErros = data.erros.length;
    let msg;
    let tipo;
    if (!hValid) { msg = "Header inválido — " + data.header._erros.join("; "); tipo = "error"; }
    else if (nErros) {
      msg = `Arquivo lido, mas com ${nErros} ${nErros === 1 ? "erro" : "erros"} de conteúdo: ${data.titulos.length} título(s) extraído(s).`;
      tipo = "error";
    } else {
      msg = `Arquivo lido: ${data.titulos.length} título(s) extraído(s), sem erros de conteúdo.`;
      tipo = "ok";
    }
    setMsg("readerMsg", msg, tipo);

    // Avisos ganham bloco próprio, e TODOS aparecem: antes ficavam
    // espremidos na mesma linha da mensagem, cortados nos 3 primeiros, e
    // só apareciam quando o header era válido — ou seja, num arquivo com
    // header ruim os problemas de estrutura ficavam invisíveis.
    renderAvisos(data.avisos, data.problemas);
  } catch (err) {
    lastParsedData = null;
    setMsg("readerMsg", "Erro ao processar: " + err.message, "error");
  }
}

// Mostra tudo o que a leitura encontrou, em duas listas: erros (o conteúdo
// está objetivamente errado) e avisos (provável problema ou estrutura).
function renderAvisos(avisosEstrutura = [], problemas = []) {
  const box = document.getElementById("readerAvisos");
  if (!box) return;
  const erros = problemas.filter(p => p.nivel === "erro").map(p => p.mensagem);
  const avisos = [...avisosEstrutura, ...problemas.filter(p => p.nivel === "aviso").map(p => p.mensagem)];
  if (!erros.length && !avisos.length) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }
  const lista = (titulo, itens) => itens.length
    ? `<strong>${titulo}</strong><ul>${itens.map(a => `<li>${escHtml(a)}</li>`).join("")}</ul>` : "";
  box.classList.remove("hidden");
  box.innerHTML =
    lista(`${erros.length} ${erros.length === 1 ? "erro" : "erros"} de conteúdo`, erros) +
    lista(`${avisos.length} ${avisos.length === 1 ? "aviso" : "avisos"}`, avisos);
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
  lastParsedData = null;
}

// Leva os dados do último arquivo lido (Validar) para o modo Gerar, com
// cabeçalho e um título por linha de detalhe já preenchidos — permite
// corrigir/ajustar valores do arquivo enviado e baixar uma nova versão.
function editAndRegenerate() {
  if (!lastParsedData) return;

  currentMode = "generator";
  syncControls();
  renderArea(); // desenha o formulário de gerar (já cria a 1ª linha vazia)

  const n = preencherGeradorComDados(lastParsedData);
  setMsg(
    "genMsg",
    `Arquivo carregado para edição: ${n} título(s). Ajuste os campos e clique em "Gerar e validar".`,
    ""
  );
}

// Preenche o formulário de Gerar (já renderizado na tela) com o cabeçalho e
// os títulos de um arquivo lido — usado tanto ao vir do modo Validar quanto
// ao importar um arquivo direto na tela de Gerar. Devolve a quantidade de
// títulos preenchidos.
function preencherGeradorComDados(data) {
  const headerContainer = document.getElementById("genHeader");
  if (headerContainer && data.header) {
    headerContainer.querySelectorAll("[data-k]").forEach(el => {
      preencherCampoComDadoLido(el, fieldDef(el.dataset.k, "header"), data.header[el.dataset.k]);
    });
  }

  const detRows = document.getElementById("detRows");
  detRows.innerHTML = "";
  const titulos = data.titulos && data.titulos.length ? data.titulos : [{}];
  titulos.forEach(titulo => {
    addDetRow();
    const row = detRows.lastElementChild;
    row.querySelectorAll("[data-k]").forEach(el => {
      preencherCampoComDadoLido(el, fieldDef(el.dataset.k, "detalhe"), titulo[el.dataset.k]);
    });
  });
  wireHelpButtons(detRows);
  return titulos.length;
}

// Importa um arquivo diretamente na tela de Gerar (sem precisar passar pelo
// modo Validar antes) e já preenche o formulário com o conteúdo lido.
function importarArquivoNoGerador(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    const direcaoDetectada = detectarDirecaoPeloHeader(text);
    if (direcaoDetectada && direcaoDetectada !== currentDirecao) {
      setMsg(
        "genMsg",
        `Este arquivo parece ser de ${direcaoDetectada === "remessa" ? "Remessa" : "Retorno"}, mas você selecionou ${directionLabel()}. Troque a direção na barra lateral e importe novamente.`,
        "error"
      );
      return;
    }
    try {
      const data = parseArquivo(text, direcaoConfig());
      lastParsedData = data;
      const n = preencherGeradorComDados(data);
      const hValid = data.header && data.header._valido;
      const msg = hValid
        ? `Arquivo importado: ${n} título(s) carregado(s) para edição. Ajuste os campos e clique em "Gerar e validar".`
        : `Arquivo importado com header fora do padrão esperado — confira os campos antes de gerar. ${n} título(s) carregado(s).`;
      setMsg("genMsg", msg, hValid ? "ok" : "error");
    } catch (err) {
      setMsg("genMsg", "Erro ao importar arquivo: " + err.message, "error");
    }
  };
  reader.readAsText(file, "ISO-8859-1"); // CNAB é ASCII/Latin-1
}

// Converte o valor já interpretado pelo parser (número, "DD/MM/AAAA" etc.)
// de volta para o formato que cada tipo de input do formulário espera.
function preencherCampoComDadoLido(el, def, valorLido) {
  if (!def || valorLido === undefined || valorLido === null || valorLido === "") return;
  if (el.tagName === "SELECT") {
    el.value = valorLido;
    return;
  }
  if (def.fmt === "valor") {
    el.value = Number(valorLido).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (def.fmt === "data") {
    el.value = dataBrParaIso(valorLido);
  } else {
    el.value = valorLido;
  }
}

// "DD/MM/AAAA" -> "AAAA-MM-DD" (formato exigido por <input type="date">)
function dataBrParaIso(dataBr) {
  if (!dataBr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dataBr)) return "";
  const [d, m, y] = dataBr.split("/");
  return `${y}-${m}-${d}`;
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

// Separa os campos do formulário em obrigatórios (sempre à vista) e opcionais
// (recolhidos), para a pessoa ver só o que precisa digitar para montar o arquivo.
function separarCampos(chaves, kind) {
  const obrigatorios = chaves.filter(k => fieldDef(k, kind)?.obrigatorio);
  const opcionais = chaves.filter(k => !fieldDef(k, kind)?.obrigatorio);
  return { obrigatorios, opcionais };
}

function opcionaisHtml(htmls, classeGrade) {
  if (!htmls.length) return "";
  return `<details class="opcionais">
    <summary>Campos opcionais (${htmls.length})</summary>
    <div class="${classeGrade}">${htmls.join("")}</div>
  </details>`;
}

function generatorViewHtml() {
  const cfg = direcaoConfig();
  const { obrigatorios, opcionais } = separarCampos(cfg.formFields?.header || [], "header");
  const headerFields =
    `<div class="form-grid">${obrigatorios.map(headerFieldInputHtml).join("")}</div>` +
    opcionaisHtml(opcionais.map(headerFieldInputHtml), "form-grid");
  return `
    <h2>Gerar ${directionLabel().toLowerCase()} — ${escHtml(currentBank.nome)}</h2>
    <p class="hint">Digite os campos obrigatórios (<span class="req-mark">*</span>) do cabeçalho e de cada título; os opcionais ficam recolhidos. Sem tempo? "Preencher com exemplo" completa o que falta com dados fictícios. O "?" ao lado de cada campo mostra posição, tamanho e exemplo.</p>

    <div class="drop-zone" id="genDropZone">
      <i class="fa-solid fa-file-arrow-up"></i> Já tem um arquivo .REM/.RET? Arraste ou clique para importar e editar os campos abaixo
      <input type="file" id="genFileInput" class="hidden" accept=".ret,.rem,.txt">
    </div>

    <div id="genHeader">${headerFields}</div>

    <h3 class="det-title">Títulos</h3>
    <div id="detRows"></div>
    <button type="button" class="btn-arriba btn-outline-arriba" id="btnAddRow"><i class="fa-solid fa-plus me-2"></i>Adicionar título</button>

    <div id="genProgresso" class="progresso-obrigatorios"></div>
    <div class="actions" style="margin-top:12px">
      <button type="button" class="btn-arriba btn-outline-arriba" id="btnExemplo"><i class="fa-solid fa-wand-magic-sparkles me-2"></i>Preencher com exemplo</button>
      <button type="button" class="btn-arriba btn-red-arriba" id="btnGenerate"><i class="fa-solid fa-gears me-2"></i>Gerar e validar</button>
      <button type="button" class="btn-arriba btn-dark-arriba" id="btnDownload" disabled><i class="fa-solid fa-download me-2"></i>Baixar arquivo</button>
    </div>

    <div class="validation-msg" id="genMsg" role="status" aria-live="polite">Preencha os campos e gere o arquivo, ou importe um arquivo acima para editar.</div>
    <div class="hidden" id="genProblemas"></div>
    <pre class="gen-preview hidden" id="genPreview"></pre>`;
}

function addDetRow() {
  const wrap = document.getElementById("detRows");
  const cfg = direcaoConfig();
  const row = document.createElement("div");
  row.className = "det-row";
  const { obrigatorios, opcionais } = separarCampos(cfg.formFields?.detalhe || [], "detalhe");
  const inputs = obrigatorios.map(detalheFieldInputHtml).join("");
  row.innerHTML = `${inputs}<button type="button" class="det-remove" title="Remover" aria-label="Remover título"><i class="fa-solid fa-trash"></i></button>${opcionaisHtml(opcionais.map(detalheFieldInputHtml), "opc-grade")}`;
  row.querySelector(".det-remove").addEventListener("click", () => { row.remove(); atualizarProgressoGerador(); });
  wrap.appendChild(row);
  atualizarProgressoGerador();
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
  const header = collectFields(document.getElementById("genHeader"), "header");
  const detalhes = [...document.querySelectorAll("#detRows .det-row")].map(row => collectFields(row, "detalhe"));
  return { header, detalhes };
}

// Valida o que está digitado ANTES de gerar. O gerador completa e corta sem
// avisar (letra some, número perde os dígitos da esquerda, texto é cortado),
// então a conferência olha o texto bruto do campo, não o valor já tratado.
/* Validação do gerador: a mensagem aparece junto do campo, o resumo no fim do formulário leva
   a cada campo, e ao corrigir um campo a mensagem e o item do resumo somem sozinhos
   (ver ../validacao-ux.js). A regra de o que é erro é de validacao.js. */
let resumoGerador = null;

const tipoDoCampo = el => (el.closest(".det-row") ? "detalhe" : "header");

function validarFormulario(container, kind, rotuloLinha) {
  const itens = [];
  container.querySelectorAll("[data-k]").forEach(el => {
    const def = fieldDef(el.dataset.k, kind);
    if (!def) return;
    const achados = validarValor(def, el.value);
    mostrarMensagem(el, achados);
    if (!achados.length) return;
    // erro em campo opcional recolhido não pode ficar escondido
    if (achados.some(a => a.nivel === "erro")) el.closest("details")?.setAttribute("open", "");
    for (const a of achados) itens.push({ nivel: a.nivel, onde: `${rotuloLinha} · ${def.nome || def.key}`, texto: a.mensagem, el });
  });
  return itens;
}

function mostrarProblemasDoGerador(itens) {
  const box = document.getElementById("genProblemas");
  if (!box) return;
  box.classList.remove("validation-msg", "warn", "hidden");
  resumoGerador = mostrarResumo(box, itens);
}

function atualizarProgressoGerador() {
  const caixa = document.getElementById("genProgresso");
  if (!caixa || !currentBank) return;
  const campos = [];
  document.querySelectorAll("#genHeader [data-k], #detRows [data-k]").forEach(el => {
    const def = fieldDef(el.dataset.k, tipoDoCampo(el));
    if (def) campos.push({ el, obrigatorio: Boolean(def.obrigatorio) });
  });
  atualizarProgresso(caixa, campos);
}

// Ao sair de um campo alterado, ele é conferido na hora — sem esperar o botão "Gerar".
function aoAlterarCampo(e) {
  const el = e.target;
  if (!el.matches?.("[data-k]") || !currentBank) return;
  if (e.type === "input") { atualizarProgressoGerador(); return; }
  const def = fieldDef(el.dataset.k, tipoDoCampo(el));
  if (!def) return;
  const achados = validarValor(def, el.value);
  mostrarMensagem(el, achados);
  if (!achados.some(a => a.nivel === "erro")) resumoGerador?.remover(el);
  atualizarProgressoGerador();
}

// Completa com dados FICTÍCIOS o que a pessoa ainda não digitou — só os campos
// obrigatórios (e o tipo de inscrição, que precisa combinar com o documento).
// O que já está digitado nunca é sobrescrito.
function preencherExemplo() {
  const hoje = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  const maisDias = n => { const d = new Date(hoje); d.setDate(d.getDate() + n); return iso(d); };
  const semAcento = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  const preencher = (container, kind, indice) => {
    container.querySelectorAll("[data-k]").forEach(el => {
      const def = fieldDef(el.dataset.k, kind);
      if (!def || el.value.trim()) return;
      if (!def.obrigatorio && def.key !== "codInscPagador") return;
      const tam = def.fim - def.ini + 1;
      let valor = def.exemplo ?? "";
      if (def.fmt === "data") valor = /vencimento/i.test(def.key) ? maisDias(30 + indice) : iso(hoje);
      else if (def.fmt === "valor") valor = formatarNumeroBr(gerarValorAleatorio(50, 2000));
      else if (def.key === "nomePagador") valor = semAcento(gerarNome()).slice(0, tam);
      else if (def.key === "numInscPagador") valor = gerarCpf();
      else if (def.key === "codInscPagador") valor = "01"; // 01 = CPF, o documento gerado acima
      else if (def.exemploFn) valor = def.exemploFn(indice); // exemplo que depende do título (ex.: com dígito verificador)
      else if (def.key === "nossoNumero" && /^\d+$/.test(valor)) {
        valor = String(BigInt(valor) + BigInt(indice)).padStart(valor.length, "0"); // um número por título
      }
      el.value = valor;
    });
  };

  preencher(document.getElementById("genHeader"), "header", 0);
  [...document.querySelectorAll("#detRows .det-row")].forEach((row, i) => preencher(row, "detalhe", i));
  document.querySelectorAll("#genHeader [data-k], #detRows [data-k]").forEach(limparMensagem);
  document.getElementById("genProblemas")?.classList.add("hidden");
  atualizarProgressoGerador();
  setMsg("genMsg", 'Campos obrigatórios completados com dados fictícios. Confira, ajuste o que quiser e clique em "Gerar e validar".', "ok");
}

function runGenerate() {
  const headerContainer = document.getElementById("genHeader");
  const rows = [...document.querySelectorAll("#detRows .det-row")];
  const preview = document.getElementById("genPreview");

  const bloquear = () => {
    lastGeneratedLines = null;
    document.getElementById("btnDownload").disabled = true;
    preview.classList.add("hidden");
  };

  if (!rows.length) { bloquear(); setMsg("genMsg", "Adicione ao menos um título.", "error"); return; }

  const itens = [
    ...validarFormulario(headerContainer, "header", "Cabeçalho"),
    ...rows.flatMap((row, i) => validarFormulario(row, "detalhe", `Título ${i + 1}`)),
  ];
  const erros = itens.filter(p => p.nivel === "erro");

  if (erros.length) {
    bloquear();
    mostrarProblemasDoGerador(itens);
    setMsg("genMsg", `Falta corrigir ${erros.length} ${erros.length === 1 ? "campo" : "campos"} para gerar o arquivo. Levei você ao primeiro.`, "error");
    irParaCampo(erros[0].el);
    return;
  }

  const cfg = direcaoConfig();
  const { header, detalhes } = collectGenerator();
  const linhas = gerarArquivo(cfg, { header, detalhes });
  const tamanho = cfg.tamanhoRegistro || 400;
  const allOk = linhas.every(l => l.length === tamanho);

  // Autoverificação: o arquivo gerado passa pelas mesmas regras da leitura.
  // Se aparecer erro aqui, o defeito é do gerador/layout, não de quem digitou.
  const doArquivo = validarLinhas(linhas, cfg, { direcao: currentDirecao });
  const errosArquivo = doArquivo.filter(p => p.nivel === "erro");
  // Acento já foi avisado pelo formulário, junto do campo: não repetir.
  const avisosArquivo = doArquivo.filter(p => p.nivel === "aviso" && p.codigo !== "acento");
  mostrarProblemasDoGerador([
    ...errosArquivo.map(p => ({ nivel: "erro", onde: `Arquivo gerado, linha ${p.linha}`, texto: p.mensagem.replace(/^Linha \d+(, "[^"]*" \(posições [\d–]+\))?: /, "") })),
    ...itens,
    ...avisosArquivo.map(p => ({ nivel: "aviso", onde: `Arquivo gerado, linha ${p.linha}`, texto: p.mensagem.replace(/^Linha \d+(, "[^"]*" \(posições [\d–]+\))?: /, "") })),
  ]);

  preview.textContent = linhas.join("\n");
  preview.classList.remove("hidden");

  const bom = allOk && !errosArquivo.length;
  setMsg(
    "genMsg",
    bom
      ? `Arquivo gerado: ${linhas.length} linha(s), todas com ${tamanho} posições, e conferido pelas mesmas regras da leitura: sem erros.`
      : `Arquivo gerado com problema: ${allOk ? "" : "linhas com tamanho divergente; "}${errosArquivo.length} erro(s) na conferência. Download bloqueado.`,
    bom ? "ok" : "error"
  );
  lastGeneratedLines = bom ? linhas : null;
  document.getElementById("btnDownload").disabled = !bom;
}

function downloadFile() {
  if (!lastGeneratedLines) return;
  const finalizador = String.fromCharCode(0x1a);
  const content = lastGeneratedLines.join("\r\n") + "\r\n" + finalizador;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ext = currentDirecao === "remessa" ? "REM" : "RET";
  a.download = `CB-${currentBank.code}-teste.${ext}`;
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

/* "Como preencher": janela centralizada, um cartão por campo, com busca e filtro
   "só os obrigatórios". Substitui a tabela larga que obrigava a rolar de lado. */
function cartaoDeCampo(def) {
  const tam = def.fim - def.ini + 1;
  const onde = def.ini === def.fim ? `posição ${def.ini}` : `posições ${def.ini}–${def.fim}`;
  const busca = `${def.nome || def.key} ${def.ajuda || ""}`.toLowerCase();
  return `
    <div class="help-campo" data-obrig="${def.obrigatorio ? 1 : 0}" data-busca="${escHtml(busca)}">
      <div class="help-campo-topo">
        <strong>${escHtml(def.nome || def.key)}</strong>
        <span class="help-selo ${def.obrigatorio ? "obrig" : "opc"}">${def.obrigatorio ? "Obrigatório" : "Opcional"}</span>
        <span class="help-onde">${onde} · ${tam} ${tam === 1 ? "caractere" : "caracteres"}</span>
      </div>
      ${def.ajuda ? `<p>${escHtml(def.ajuda)}</p>` : ""}
      ${def.exemplo ? `<p class="help-exemplo">Exemplo: <code>${escHtml(def.exemplo)}</code></p>` : ""}
    </div>`;
}

function openHelpPanel() {
  if (!currentBank) return;
  const cfg = direcaoConfig();
  const secoes = [
    ["header", "Cabeçalho do arquivo", "Preenchido uma vez, no começo do arquivo."],
    ["detalhe", "Cada título", "Repetido para cada título (linha de detalhe) do arquivo."],
  ];
  const html = secoes.map(([kind, titulo, sub]) => {
    const cartoes = (cfg.formFields?.[kind] || []).map(k => fieldDef(k, kind)).filter(Boolean).map(cartaoDeCampo);
    return cartoes.length ? `<section class="help-secao"><h3>${titulo}</h3><p>${sub}</p>${cartoes.join("")}</section>` : "";
  }).join("");

  document.getElementById("helpPanelTitulo").textContent = `${currentBank.nome} — ${directionLabel()}`;
  document.getElementById("helpPanelBody").innerHTML = html + '<p class="help-vazio hidden" id="helpVazio">Nenhum campo encontrado. Tente outra palavra ou desmarque “Só os obrigatórios”.</p>';
  document.getElementById("helpFiltro").value = "";
  document.getElementById("helpSoObrig").checked = false;
  filtrarAjuda();

  const dlg = document.getElementById("helpPanel");
  if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); }
  else dlg.setAttribute("open", "");
}

function filtrarAjuda() {
  const termo = document.getElementById("helpFiltro").value.trim().toLowerCase();
  const soObrig = document.getElementById("helpSoObrig").checked;
  let visiveis = 0;
  document.querySelectorAll("#helpPanelBody .help-campo").forEach(c => {
    const mostra = (!soObrig || c.dataset.obrig === "1") && (!termo || c.dataset.busca.includes(termo));
    c.hidden = !mostra;
    if (mostra) visiveis++;
  });
  document.querySelectorAll("#helpPanelBody .help-secao").forEach(sec => {
    sec.hidden = !sec.querySelector(".help-campo:not([hidden])");
  });
  document.getElementById("helpVazio")?.classList.toggle("hidden", visiveis > 0);
}

function closeHelpPanel() {
  const dlg = document.getElementById("helpPanel");
  if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open");
}

/* ---------------------------------------------------------------------
   Eventos por view + utilidades
   --------------------------------------------------------------------- */

function wireViewEvents() {
  const area = document.getElementById("formArea");
  if (currentMode === "reader") {
    wireReaderEvents();
  } else {
    const genDropZone = document.getElementById("genDropZone");
    const genFileInput = document.getElementById("genFileInput");
    genDropZone.addEventListener("click", () => genFileInput.click());
    genDropZone.addEventListener("dragover", e => { e.preventDefault(); genDropZone.classList.add("drag"); });
    genDropZone.addEventListener("dragleave", () => genDropZone.classList.remove("drag"));
    genDropZone.addEventListener("drop", e => {
      e.preventDefault(); genDropZone.classList.remove("drag");
      if (e.dataTransfer.files[0]) importarArquivoNoGerador(e.dataTransfer.files[0]);
    });
    genFileInput.addEventListener("change", e => { if (e.target.files[0]) importarArquivoNoGerador(e.target.files[0]); });

    document.getElementById("btnAddRow").addEventListener("click", () => {
      addDetRow();
      wireHelpButtons(document.getElementById("detRows"));
    });
    document.getElementById("btnExemplo").addEventListener("click", preencherExemplo);
    area.addEventListener("change", aoAlterarCampo);
    area.addEventListener("input", aoAlterarCampo);
    document.getElementById("btnGenerate").addEventListener("click", runGenerate);
    document.getElementById("btnDownload").addEventListener("click", downloadFile);
    addDetRow(); // primeira linha
    atualizarProgressoGerador();
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
