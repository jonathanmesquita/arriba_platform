const appState = { quill: null, imageDataUrl: "" };

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  initEditor();
});

function bindEvents() {
  document.querySelectorAll("[data-scroll-to]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".step").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("[data-insert]").forEach(button => {
    button.addEventListener("click", () => insertText(button.dataset.insert));
  });

  document.getElementById("imageFile")?.addEventListener("change", handleImageUpload);
  document.getElementById("fontSize")?.addEventListener("change", applyFontSize);
  document.getElementById("btnInsertLogo")?.addEventListener("click", insertLogo);
  document.getElementById("btnLoadTemplate")?.addEventListener("click", loadBaseTemplate);
  document.getElementById("btnPreview")?.addEventListener("click", () => refreshPreview(true));
  document.getElementById("btnPrint")?.addEventListener("click", printPdf);
  document.getElementById("btnDownloadHtml")?.addEventListener("click", downloadHtml);
  document.getElementById("btnGenerateHex")?.addEventListener("click", generateHex);
  document.getElementById("btnCopyHex")?.addEventListener("click", () => copyText(document.getElementById("hexOutput").value));
}

function initEditor() {
  if (!window.Quill) {
    setMessage("Não consegui carregar o Quill. Verifique a conexão com o CDN.", "error");
    return;
  }

  appState.quill = new Quill("#editor", {
    theme: "snow",
    modules: {
      toolbar: {
        container: "#toolbar",
        handlers: {
          image: () => {
            const url = prompt("Informe a URL da imagem:");
            if (url) insertImage(url);
          }
        }
      },
      history: { delay: 800, maxStack: 100, userOnly: true }
    },
    placeholder: "Monte a carta aqui..."
  });

  appState.quill.on("text-change", () => refreshPreview(false));
  loadBaseTemplate();
}

function loadBaseTemplate() {
  const logo = getLogo();
  const fontSize = document.getElementById("fontSize").value || "14px";

  const html = `
<div style="font-family: Arial, sans-serif; font-size: ${fontSize}; color: #111;">
  ${logo ? `<p><img alt="Logo" src="${escapeAttribute(logo)}" style="max-width: 180px; height: auto;" /></p>` : ""}
  <p>&nbsp;</p>
  <p><strong>Neocob Soluções Financeiras</strong></p>
  <div>
    <div><strong>Rua Sete de Setembro, nº 1760, 6º andar, Bairro Centro, Blumenau/SC</strong></div>
    <div><strong>Telefone: (47) 3237-2570</strong></div>
    <div><span style="color: rgb(0, 0, 255);"><strong>www.neocob.com.br</strong></span></div>
  </div>
  <p>&nbsp;</p>
  <p>¿Financiado*Nome*2¿, boleto do acordo número <strong>¿Acordo*Nr_Acordo*2¿</strong> referente à empresa <strong>¿Cliente*Nome_Res*2¿</strong>.</p>
  <p><strong>Teste Pix QRCODE:</strong></p>
  <p style="background-color:#ffff00;">¿Funcoes_Carta*QrCode_Pix*2¿</p>
  <p><strong>Teste Pix COPIA E COLA:</strong></p>
  <p style="background-color:#ffff00;">¿Funcoes_Carta*Pix_CopiaCola*2¿</p>
  <p style="font-size: 6px;">¿Funcoes_Carta*Pix_CopiaCola*2¿</p>
</div>`.trim();

  appState.quill.clipboard.dangerouslyPasteHTML(html);
  refreshPreview(false);
  setMessage("Modelo base carregado. Edite e gere as saídas quando estiver pronto.", "ok");
}

function getHtml() {
  return appState.quill ? appState.quill.root.innerHTML.trim() : "";
}

function refreshPreview(showMessage = true) {
  const html = getHtml();
  document.getElementById("preview").innerHTML = html || "<em>Nenhum modelo criado ainda.</em>";
  document.getElementById("htmlOutput").value = html;
  if (showMessage) setMessage("Prévia atualizada.", "ok");
}

function insertText(text) {
  if (!appState.quill) return;
  const range = appState.quill.getSelection(true);
  const index = range ? range.index : appState.quill.getLength();
  appState.quill.insertText(index, text, "user");
  appState.quill.setSelection(index + text.length, 0);
  refreshPreview(false);
}

function insertLogo() {
  const logo = getLogo();
  if (!logo) {
    setMessage("Informe uma URL ou carregue uma imagem local.", "error");
    return;
  }
  insertImage(logo);
}

function insertImage(src) {
  if (!appState.quill) return;
  const range = appState.quill.getSelection(true);
  const index = range ? range.index : appState.quill.getLength();
  appState.quill.insertEmbed(index, "image", src, "user");
  appState.quill.insertText(index + 1, "\n", "user");
  appState.quill.setSelection(index + 2, 0);
  refreshPreview(false);
}

function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setMessage("Selecione uma imagem válida.", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    appState.imageDataUrl = String(reader.result || "");
    setMessage("Imagem local carregada. Clique em Inserir logo para usar.", "ok");
  };
  reader.readAsDataURL(file);
}

function getLogo() {
  return appState.imageDataUrl || document.getElementById("logoUrl").value.trim();
}

function applyFontSize() {
  const fontSize = document.getElementById("fontSize").value || "14px";
  const editor = document.querySelector(".ql-editor");
  if (editor) editor.style.fontSize = fontSize;
  setMessage(`Fonte base ajustada para ${fontSize}.`, "ok");
}

function printPdf() {
  const html = getHtml();
  if (!html) {
    setMessage("Crie um modelo antes de gerar PDF.", "error");
    return;
  }

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    setMessage("O navegador bloqueou a impressão. Libere pop-ups para esta página.", "error");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapeHtml(document.getElementById("templateName").value || "Modelo Carta")}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111;line-height:1.6}img{max-width:100%}@page{margin:20mm}</style></head><body>${html}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  setMessage("Janela de impressão aberta. Escolha Salvar como PDF.", "ok");
}

function downloadHtml() {
  const html = getHtml();
  if (!html) {
    setMessage("Crie um modelo antes de baixar.", "error");
    return;
  }
  downloadTextFile(`${slugify(document.getElementById("templateName").value || "modelo-carta")}.html`, "\uFEFF" + html, "text/html;charset=utf-8;");
  setMessage("HTML baixado com sucesso.", "ok");
}

async function generateHex() {
  const html = getHtml();
  if (!html) {
    setMessage("Crie um modelo antes de gerar Hex/GZIP.", "error");
    return;
  }
  try {
    const hex = await gzipHtmlToHex(html);
    document.getElementById("hexOutput").value = hex;
    setMessage("Hex/GZIP gerado com sucesso.", "ok");
  } catch (error) {
    console.error(error);
    setMessage(error.message || "Falha ao gerar Hex/GZIP.", "error");
  }
}

async function gzipHtmlToHex(html) {
  if (!("CompressionStream" in window)) {
    throw new Error("Este navegador não suporta CompressionStream. Use Chrome ou Edge atualizado.");
  }
  const bytes = new TextEncoder().encode(html);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  const hex = Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, "0").toUpperCase()).join("");
  return `0x${hex}`;
}

async function copyText(text) {
  if (!text) {
    setMessage("Nada para copiar ainda.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  setMessage("Conteúdo copiado.", "ok");
}

function setMessage(text, type = "ok") {
  const box = document.getElementById("messageBox");
  box.textContent = text;
  box.classList.toggle("ok", type === "ok");
  box.classList.toggle("error", type === "error");
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeAttribute(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function slugify(text) {
  return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
