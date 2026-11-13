/* =====================================================================
   Editor Web (HTML/CSS/JS) - Arriba Platform

   O "Try it Yourself" clássico: três documentos (HTML, CSS e JS) que
   viram uma página só, renderizada ao vivo num <iframe>.

   ISOLAMENTO — por que o preview é um iframe com `sandbox` e SEM
   `allow-same-origin`: o código do usuário executa de verdade, mas numa
   origem opaca, então não alcança o `localStorage` nem o DOM desta
   página. É o que permite deixar qualquer um digitar JavaScript aqui
   sem risco de mexer no resto do site.

   Como o iframe está em outra origem, o console dele não é acessível
   direto — por isso injetamos uma ponte que captura os métodos de
   console e os erros, mandando pro pai via postMessage (ver PONTE_CONSOLE).

   Tudo client-side: nada é enviado a servidor, e o rascunho fica só no
   localStorage deste navegador.
   ===================================================================== */

const STORAGE_KEY = "arribaEditorWeb:rascunho";
const ATRASO_AUTO_MS = 600;

const ABAS = ["html", "css", "js"];
let abaAtual = "html";
let exemploAtual = "pagina-basica";
let timerAuto = null;

/* ---------------------------------------------------------------------
   Exemplos prontos
   --------------------------------------------------------------------- */
const EXEMPLOS = [
  {
    id: "pagina-basica",
    nome: "Página básica",
    html: `<h1>Olá, mundo!</h1>
<p>Este é um parágrafo. Edite o HTML ao lado e veja o resultado mudar.</p>
<button id="btn">Clique em mim</button>
<p id="saida"></p>`,
    css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  color: #2b2b2b;
}

h1 {
  color: #c0392b;
}

button {
  background: #c0392b;
  color: #fff;
  border: 0;
  border-radius: 5px;
  padding: 10px 18px;
  font-weight: 700;
  cursor: pointer;
}`,
    js: `document.getElementById("btn").addEventListener("click", () => {
  document.getElementById("saida").textContent = "Você clicou! " + new Date().toLocaleTimeString("pt-BR");
  console.log("Botão clicado");
});`
  },
  {
    id: "css-box",
    nome: "CSS: caixa e cores",
    html: `<div class="cartao">
  <h2>Modelo de caixa</h2>
  <p>Toda caixa tem conteúdo, <em>padding</em>, borda e <em>margin</em>.</p>
  <span class="etiqueta">CSS</span>
</div>`,
    css: `body {
  font-family: system-ui, sans-serif;
  background: #f5f2ee;
  padding: 30px;
}

.cartao {
  background: #fff;
  border: 1px solid #e0d9d1;
  border-radius: 12px;
  padding: 22px;
  max-width: 360px;
  box-shadow: 0 6px 18px rgba(0,0,0,.06);
}

.cartao h2 {
  margin: 0 0 8px;
  color: #8b3a2f;
}

.etiqueta {
  display: inline-block;
  background: #f0e6d8;
  color: #7a5c1e;
  border-radius: 999px;
  padding: 3px 12px;
  font-size: .8rem;
  font-weight: 800;
}`,
    js: `// Sem JavaScript neste exemplo — mexa no CSS ao lado.
console.log("Exemplo de CSS carregado");`
  },
  {
    id: "tabela",
    nome: "Tabela de dados",
    html: `<h2>Acordos por carteira</h2>
<table id="tabela">
  <thead>
    <tr><th>Carteira</th><th>Acordos</th><th>Valor</th></tr>
  </thead>
  <tbody></tbody>
</table>`,
    css: `body { font-family: system-ui, sans-serif; padding: 24px; }

table {
  border-collapse: collapse;
  width: 100%;
  max-width: 480px;
  font-size: .92rem;
}

th, td {
  text-align: left;
  padding: 9px 12px;
  border-bottom: 1px solid #e3ddd6;
}

th { background: #f5f2ee; font-weight: 800; }

td.num { text-align: right; font-variant-numeric: tabular-nums; }

tr:hover td { background: #faf8f5; }`,
    js: `// Dados fictícios só para o exemplo
const dados = [
  { carteira: "Varejo Amigável", acordos: 12, valor: 18400.5 },
  { carteira: "Varejo Pré-Jurídico", acordos: 7, valor: 9250 },
  { carteira: "Atacado Amigável", acordos: 4, valor: 32100.75 },
  { carteira: "Jurídico", acordos: 2, valor: 5000 }
];

const corpo = document.querySelector("#tabela tbody");

dados.forEach(linha => {
  const tr = document.createElement("tr");
  tr.innerHTML =
    "<td>" + linha.carteira + "</td>" +
    "<td class='num'>" + linha.acordos + "</td>" +
    "<td class='num'>" + linha.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "</td>";
  corpo.appendChild(tr);
});

console.log("Tabela montada com", dados.length, "linhas");`
  },
  {
    id: "formulario",
    nome: "Formulário e validação",
    html: `<form id="form">
  <label>CPF (só números)
    <input id="cpf" maxlength="11" placeholder="11122233396">
  </label>
  <button type="submit">Validar</button>
</form>
<p id="resultado"></p>`,
    css: `body { font-family: system-ui, sans-serif; padding: 24px; }

label { display: block; font-weight: 700; margin-bottom: 10px; }

input {
  display: block;
  margin-top: 6px;
  padding: 9px 12px;
  border: 1px solid #d9d2ca;
  border-radius: 5px;
  font-size: 1rem;
  width: 220px;
}

button {
  background: #2b2b2b; color: #fff; border: 0; border-radius: 5px;
  padding: 10px 18px; font-weight: 700; cursor: pointer;
}

#resultado { font-weight: 800; margin-top: 14px; }
.ok { color: #198754; }
.erro { color: #dc3545; }`,
    js: `// Mesmo cálculo (módulo 11) que o sistema usa pra recusar CPF inválido
function cpfValido(cpf) {
  if (!/^\\d{11}$/.test(cpf) || /^(\\d)\\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let d1 = (soma * 10) % 11 % 10;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  let d2 = (soma * 10) % 11 % 10;
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

document.getElementById("form").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const cpf = document.getElementById("cpf").value.trim();
  const saida = document.getElementById("resultado");
  const valido = cpfValido(cpf);
  saida.textContent = valido ? "CPF válido ✓" : "CPF inválido ✗";
  saida.className = valido ? "ok" : "erro";
  console.log("CPF", cpf, valido ? "válido" : "inválido");
});`
  },
  {
    id: "vazio",
    nome: "Começar do zero",
    html: `<h1>Sua página</h1>
`,
    css: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
}
`,
    js: `console.log("Pronto para começar");
`
  }
];

// Documento em edição (começa no primeiro exemplo).
let doc = { html: "", css: "", js: "" };

/* ---------------------------------------------------------------------
   Ponte de console: injetada DENTRO do iframe. Captura console.* e
   erros e reenvia pro pai, já que o iframe roda em origem opaca e o
   console dele não é acessível daqui.
   --------------------------------------------------------------------- */
const PONTE_CONSOLE = `
<script>
(function () {
  function enviar(nivel, args) {
    try {
      var texto = Array.prototype.map.call(args, function (a) {
        if (a instanceof Error) return a.message;
        if (typeof a === "object" && a !== null) {
          try { return JSON.stringify(a); } catch (e) { return String(a); }
        }
        return String(a);
      }).join(" ");
      parent.postMessage({ __editorWeb: true, nivel: nivel, texto: texto }, "*");
    } catch (e) { /* nunca deixar a ponte derrubar a pagina do usuario */ }
  }
  ["log", "info", "warn", "error"].forEach(function (nivel) {
    var original = console[nivel];
    console[nivel] = function () {
      enviar(nivel, arguments);
      if (original) original.apply(console, arguments);
    };
  });
  window.addEventListener("error", function (evento) {
    enviar("error", [evento.message + " (linha " + evento.lineno + ")"]);
  });
  window.addEventListener("unhandledrejection", function (evento) {
    enviar("error", ["Promise rejeitada: " + (evento.reason && evento.reason.message ? evento.reason.message : evento.reason)]);
  });
})();
<\/script>`;

function montarDocumento({ comPonte = true } = {}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${doc.css}
</style>
</head>
<body>
${doc.html}
${comPonte ? PONTE_CONSOLE : ""}
<script>
${doc.js}
<\/script>
</body>
</html>`;
}

/* ---------------------------------------------------------------------
   Execução / preview
   --------------------------------------------------------------------- */
function executar() {
  limparConsole({ silencioso: true });
  document.getElementById("preview").srcdoc = montarDocumento();
}

function agendarAuto() {
  if (!document.getElementById("chkAuto").checked) return;
  clearTimeout(timerAuto);
  timerAuto = setTimeout(executar, ATRASO_AUTO_MS);
}

/* ---------------------------------------------------------------------
   Console (mensagens vindas do iframe)
   --------------------------------------------------------------------- */
function limparConsole({ silencioso = false } = {}) {
  const box = document.getElementById("console");
  box.innerHTML = silencioso
    ? ""
    : `<p class="console-vazio">console.log() e erros do seu código aparecem aqui.</p>`;
}

function escreverNoConsole(nivel, texto) {
  const box = document.getElementById("console");
  const vazio = box.querySelector(".console-vazio");
  if (vazio) vazio.remove();
  const linha = document.createElement("div");
  linha.className = "console-linha" + (nivel === "error" ? " erro" : "");
  linha.textContent = (nivel === "error" ? "✗ " : nivel === "warn" ? "⚠ " : "› ") + texto;
  box.appendChild(linha);
  box.parentElement.scrollTop = box.parentElement.scrollHeight;
}

window.addEventListener("message", (evento) => {
  // O iframe é sandbox sem same-origin, então evento.origin vem "null":
  // conferir a janela de origem é o que identifica a mensagem com segurança.
  const preview = document.getElementById("preview");
  if (!preview || evento.source !== preview.contentWindow) return;
  const dados = evento.data;
  if (!dados || dados.__editorWeb !== true) return;
  escreverNoConsole(dados.nivel, dados.texto);
});

/* ---------------------------------------------------------------------
   Abas do editor
   --------------------------------------------------------------------- */
function trocarAba(aba) {
  if (!ABAS.includes(aba)) return;
  doc[abaAtual] = document.getElementById("editor").value;
  abaAtual = aba;
  document.querySelectorAll("[data-aba]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.aba === aba);
  });
  document.getElementById("editor").value = doc[aba];
}

function sincronizarDocDoEditor() {
  doc[abaAtual] = document.getElementById("editor").value;
}

/* ---------------------------------------------------------------------
   Exemplos
   --------------------------------------------------------------------- */
function renderExemplos() {
  document.getElementById("exemplosBotoes").innerHTML = EXEMPLOS.map((ex) => `
    <button type="button" class="exemplo-btn ${ex.id === exemploAtual ? "active" : ""}" data-exemplo="${ex.id}">
      ${escHtml(ex.nome)}
    </button>
  `).join("");

  document.querySelectorAll("[data-exemplo]").forEach((btn) => {
    btn.addEventListener("click", () => carregarExemplo(btn.dataset.exemplo));
  });
}

function carregarExemplo(id) {
  const ex = EXEMPLOS.find((e) => e.id === id);
  if (!ex) return;
  exemploAtual = id;
  doc = { html: ex.html, css: ex.css, js: ex.js };
  document.getElementById("editor").value = doc[abaAtual];
  renderExemplos();
  salvarRascunho();
  executar();
}

/* ---------------------------------------------------------------------
   Rascunho no localStorage (não perder o trabalho ao recarregar)
   --------------------------------------------------------------------- */
function salvarRascunho() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ doc, exemploAtual, abaAtual }));
  } catch {
    // Modo privado/cota cheia: segue sem persistir.
  }
}

function carregarRascunho() {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!salvo || !salvo.doc) return false;
    doc = { html: salvo.doc.html || "", css: salvo.doc.css || "", js: salvo.doc.js || "" };
    exemploAtual = salvo.exemploAtual || exemploAtual;
    abaAtual = ABAS.includes(salvo.abaAtual) ? salvo.abaAtual : "html";
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------------
   Download / abrir em nova aba
   --------------------------------------------------------------------- */
function baixarHtml() {
  // Sem a ponte de console: o arquivo baixado é a página do usuário, limpa.
  const blob = new Blob([montarDocumento({ comPonte: false })], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pagina.html";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function abrirEmNovaAba() {
  const blob = new Blob([montarDocumento({ comPonte: false })], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/* ---------------------------------------------------------------------
   Utilidades + eventos
   --------------------------------------------------------------------- */
function escHtml(valor = "") {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function wireEventos() {
  const editor = document.getElementById("editor");

  document.querySelectorAll("[data-aba]").forEach((btn) => {
    btn.addEventListener("click", () => trocarAba(btn.dataset.aba));
  });

  editor.addEventListener("input", () => {
    sincronizarDocDoEditor();
    salvarRascunho();
    agendarAuto();
  });

  editor.addEventListener("keydown", (evento) => {
    if ((evento.ctrlKey || evento.metaKey) && evento.key === "Enter") {
      evento.preventDefault();
      sincronizarDocDoEditor();
      executar();
      return;
    }
    // Tab indenta em vez de pular o foco pro próximo controle.
    if (evento.key === "Tab") {
      evento.preventDefault();
      const inicio = editor.selectionStart;
      const fim = editor.selectionEnd;
      editor.value = editor.value.slice(0, inicio) + "  " + editor.value.slice(fim);
      editor.selectionStart = editor.selectionEnd = inicio + 2;
      sincronizarDocDoEditor();
      salvarRascunho();
      agendarAuto();
    }
  });

  document.getElementById("btnExecutar").addEventListener("click", () => {
    sincronizarDocDoEditor();
    executar();
  });

  document.getElementById("btnRestaurar").addEventListener("click", () => carregarExemplo(exemploAtual));

  document.getElementById("btnLimparAba").addEventListener("click", () => {
    editor.value = "";
    sincronizarDocDoEditor();
    salvarRascunho();
    agendarAuto();
  });

  document.getElementById("btnLimparConsole").addEventListener("click", () => limparConsole());
  document.getElementById("btnBaixar").addEventListener("click", baixarHtml);
  document.getElementById("btnAbrirNova").addEventListener("click", abrirEmNovaAba);

  document.getElementById("chkAuto").addEventListener("change", (evento) => {
    if (evento.target.checked) agendarAuto();
  });
}

/* ---------------------------------------------------------------------
   Init
   --------------------------------------------------------------------- */
const tinhaRascunho = carregarRascunho();
if (!tinhaRascunho) {
  const primeiro = EXEMPLOS[0];
  doc = { html: primeiro.html, css: primeiro.css, js: primeiro.js };
}
renderExemplos();
document.querySelectorAll("[data-aba]").forEach((btn) => {
  btn.classList.toggle("active", btn.dataset.aba === abaAtual);
});
document.getElementById("editor").value = doc[abaAtual];
wireEventos();
executar();
