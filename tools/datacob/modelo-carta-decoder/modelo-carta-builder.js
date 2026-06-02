const appState = { quill: null, imageDataUrl: "", source: "editor" };
const DATACOB_EXAMPLE_HTML = "<div style=\"background-color:#ffffff;\">\n  <table cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background-color:#ffffff;\" width=\"100%\">\n    <tbody>\n      <tr>\n        <td align=\"center\" style=\"padding:0;margin:0;\">\n          <table cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background-color:#ffffff;\" width=\"600\">\n            <tbody>\n              <tr>\n                <td align=\"center\" style=\"padding:30px 20px 15px 20px;\">\n                  <img alt=\"DataCob - PH3A\" src=\"https://www.ph3a.com.br/Content/site/images/logo-datacob.png\" style=\"max-width:340px;width:100%;height:auto;\" width=\"340\" />\n                </td>\n              </tr>\n              <tr>\n                <td align=\"center\" style=\"padding:0 20px 10px 20px;\">\n                  <table cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background-color:#FFF3EC;border-radius:20px;\" width=\"100%\">\n                    <tbody>\n                      <tr>\n                        <td align=\"center\" style=\"padding:24px 20px;\">\n                          <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:30px;line-height:36px;color:#E85A24;font-weight:700;margin:0;\">Lembrete de Acordo</p>\n                          <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#6E7882;padding-top:6px;margin:0;\">Comunicação enviada pela plataforma DataCob</p>\n                        </td>\n                      </tr>\n                    </tbody>\n                  </table>\n                </td>\n              </tr>\n              <tr>\n                <td align=\"center\" style=\"padding:10px;\">\n                  <table cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background-color:#F9F9F9;border-radius:20px;\" width=\"580\">\n                    <tbody>\n                      <tr>\n                        <td align=\"left\" style=\"padding:30px 30px 20px 30px;\">\n                          <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:18px;line-height:27px;color:#6E7882;margin:0;\">Olá, <strong>¿Financiado*Nome*2¿</strong>. Tudo bem?</p>\n                          <br />\n                          <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:18px;line-height:27px;color:#6E7882;margin:0;\">Estamos passando para lembrar que o pagamento do seu acordo vence em breve.</p>\n                          <br />\n                          <table cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background-color:#ffffff;border-left:6px solid #E85A24;border-radius:14px;\" width=\"100%\">\n                            <tbody>\n                              <tr>\n                                <td style=\"padding:18px 20px;\">\n                                  <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#6E7882;margin:0;\"><strong style=\"color:#E85A24;\">Dados da parcela</strong></p>\n                                  <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:18px;line-height:28px;color:#2D3C46;padding-top:8px;margin:0;\">¿Parcela_Acordo*Nr_Parcela*2¿ª parcela — <strong>¿Parcela_Acordo*Vl_Parcela*2*M¿</strong></p>\n                                  <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#6E7882;margin:0;\">Vencimento em ¿Parcela_Acordo*Dt_Venc_Boleto*2¿</p>\n                                </td>\n                              </tr>\n                            </tbody>\n                          </table>\n                          <br />\n                          <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:18px;line-height:27px;color:#6E7882;margin:0;\">Para evitar atrasos, restrições ou quebra do acordo, realize o pagamento até a data de vencimento informada.</p>\n                          <br />\n                          <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:18px;line-height:27px;color:#6E7882;margin:0;\">Caso você já tenha feito o pagamento, desconsidere este aviso. A identificação pode depender do prazo de compensação bancária.</p>\n                          <br />\n                          <table align=\"center\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"margin:20px auto 10px auto;\">\n                            <tbody>\n                              <tr>\n                                <td align=\"center\" bgcolor=\"#E85A24\" style=\"border-radius:30px;\">\n                                  <a href=\"https://www.ph3a.com.br/produto/datacob\" style=\"display:inline-block;padding:14px 32px;font-family:Lato,Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;color:#ffffff;text-decoration:none;font-weight:700;border-radius:30px;\" target=\"_blank\">Acessar DataCob</a>\n                                </td>\n                              </tr>\n                            </tbody>\n                          </table>\n                          <br />\n                          <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:18px;line-height:27px;color:#6E7882;margin:0;\">Atenciosamente,<br /><strong style=\"color:#E85A24;\">PH3A | DataCob</strong></p>\n                        </td>\n                      </tr>\n                    </tbody>\n                  </table>\n                </td>\n              </tr>\n              <tr>\n                <td align=\"center\" bgcolor=\"#2D3C46\" style=\"padding:12px 10px;\">\n                  <p style=\"font-family:Lato,Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#ffffff;margin:0;\">Este é um e-mail automático. Por favor, não responda.</p>\n                </td>\n              </tr>\n            </tbody>\n          </table>\n        </td>\n      </tr>\n    </tbody>\n  </table>\n</div>";

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  initEditor();
});

function bindEvents() {
  document.querySelectorAll("[data-scroll-to]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".step").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("[data-insert]").forEach((button) => {
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
  document.getElementById("btnCopyHex")?.addEventListener("click", () => copyText(document.getElementById("hexOutput")?.value || ""));
  document.getElementById("btnLoadHtmlExample")?.addEventListener("click", loadHtmlExample);
  document.getElementById("btnPreviewRawHtml")?.addEventListener("click", () => previewRawHtml(true));
  document.getElementById("btnApplyRawToEditor")?.addEventListener("click", applyRawHtmlToEditor);
  document.getElementById("btnCopyHtml")?.addEventListener("click", () => copyText(getHtml()));
  document.getElementById("btnGenerateHexFromRaw")?.addEventListener("click", generateHexFromRaw);
  document.getElementById("rawHtmlInput")?.addEventListener("input", () => { appState.source = "raw"; syncModePills(); });
  document.getElementById("htmlOutput")?.addEventListener("input", () => { appState.source = "output"; updatePreview(document.getElementById("htmlOutput")?.value || ""); syncModePills(); });
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
  loadHtmlExample();
}

function loadHtmlExample() {
  const rawInput = document.getElementById("rawHtmlInput");
  if (rawInput) rawInput.value = DATACOB_EXAMPLE_HTML.trim();
  appState.source = "raw";
  previewRawHtml(false);
  const name = document.getElementById("templateName");
  if (name) name.value = "Comunicado de Acordo DataCob";
  setMessage("Modelo exemplo DataCob carregado no modo HTML técnico. Gere Hex/GZIP direto deste HTML para preservar tabelas e estilos inline.", "ok");
}

function getEditorHtml() { return appState.quill ? appState.quill.root.innerHTML.trim() : ""; }
function getRawHtml() { return document.getElementById("rawHtmlInput")?.value.trim() || ""; }
function getOutputHtml() { return document.getElementById("htmlOutput")?.value.trim() || ""; }

function getHtml() {
  if (appState.source === "raw" && getRawHtml()) return getRawHtml();
  if (appState.source === "output" && getOutputHtml()) return getOutputHtml();
  return getEditorHtml();
}

function syncModePills() {
  document.getElementById("rawModePill")?.classList.toggle("active", appState.source === "raw" || appState.source === "output");
  document.getElementById("editorModePill")?.classList.toggle("active", appState.source === "editor");
}

function refreshPreview(showMessage = true) {
  appState.source = "editor";
  const html = getEditorHtml();
  setPreviewAndOutput(html);
  syncModePills();
  if (showMessage) setMessage("Prévia do editor atualizada.", "ok");
}

function updatePreview(html) {
  const preview = document.getElementById("preview");
  if (preview) preview.innerHTML = html || "<em>Nenhum modelo criado ainda.</em>";
}

function setPreviewAndOutput(html) {
  updatePreview(html);
  const htmlOutput = document.getElementById("htmlOutput");
  if (htmlOutput) htmlOutput.value = html;
}

function previewRawHtml(showMessage = true) {
  const html = getRawHtml();
  if (!html) {
    setMessage("Cole um HTML ou carregue o exemplo antes de pré-visualizar.", "error");
    return;
  }
  appState.source = "raw";
  const rawPreview = document.getElementById("rawHtmlPreview");
  if (rawPreview) rawPreview.innerHTML = html;
  setPreviewAndOutput(html);
  syncModePills();
  if (showMessage) setMessage("HTML técnico carregado na prévia e pronto para converter em Hex/GZIP.", "ok");
}

function applyRawHtmlToEditor() {
  const html = getRawHtml();
  if (!html) {
    setMessage("Cole um HTML antes de aplicar no editor.", "error");
    return;
  }
  if (!appState.quill) return;
  appState.quill.clipboard.dangerouslyPasteHTML(html);
  appState.source = "editor";
  refreshPreview(false);
  setMessage("HTML aplicado ao editor visual. Atenção: editores visuais podem simplificar tabelas e estilos inline.", "ok");
}

function insertText(text) {
  appState.source = "editor";
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
  appState.source = "editor";
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

function getLogo() { return appState.imageDataUrl || document.getElementById("logoUrl")?.value.trim() || ""; }

function applyFontSize() {
  const fontSize = document.getElementById("fontSize")?.value || "14px";
  const editor = document.querySelector(".ql-editor");
  if (editor) editor.style.fontSize = fontSize;
  setMessage(`Fonte base ajustada para ${fontSize}.`, "ok");
}

function printPdf() {
  const html = getHtml();
  if (!html) {
    setMessage("Crie ou cole um modelo antes de gerar PDF.", "error");
    return;
  }
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    setMessage("O navegador bloqueou a impressão. Libere pop-ups para esta página.", "error");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapeHtml(document.getElementById("templateName")?.value || "Modelo Carta")}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111;line-height:1.6}img{max-width:100%}@page{margin:20mm}</style></head><body>${html}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  setMessage("Janela de impressão aberta. Escolha Salvar como PDF.", "ok");
}

function downloadHtml() {
  const html = getHtml();
  if (!html) {
    setMessage("Crie ou cole um modelo antes de baixar.", "error");
    return;
  }
  downloadTextFile(`${slugify(document.getElementById("templateName")?.value || "modelo-carta")}.html`, "﻿" + html, "text/html;charset=utf-8;");
  setMessage("HTML baixado com sucesso.", "ok");
}

async function generateHexFromRaw() {
  const html = getRawHtml() || getOutputHtml();
  if (!html) {
    setMessage("Cole um HTML técnico antes de converter.", "error");
    return;
  }
  try {
    appState.source = "raw";
    if (getRawHtml()) previewRawHtml(false);
    const hex = await gzipHtmlToHex(html);
    document.getElementById("hexOutput").value = hex;
    setMessage("HTML técnico convertido para Hex/GZIP com sucesso.", "ok");
  } catch (error) {
    console.error(error);
    setMessage(error.message || "Falha ao converter HTML para Hex/GZIP.", "error");
  }
}

async function generateHex() {
  const html = getHtml();
  if (!html) {
    setMessage("Crie ou cole um modelo antes de gerar Hex/GZIP.", "error");
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
  const hex = Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join("");
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
  if (!box) return;
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
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
