/* =====================================================================
 * Boleto Base64 → PDF — decodificador focado
 * Processamento 100% no navegador (nada trafega na rede).
 *
 * Aceita 3 entradas comuns em chamados de suporte:
 *   1) Base64 puro:            JVBERi0xLjQK...
 *   2) Data URI:               data:application/pdf;base64,JVBERi0x...
 *   3) JSON com o Base64:       { "boleto": "JVBERi0x...", ... }
 * ===================================================================== */

"use strict";

const state = { blob: null, objectUrl: null, fileName: "boleto.pdf" };

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnConvert").addEventListener("click", convert);
  document.getElementById("btnClear").addEventListener("click", clearAll);
  document.getElementById("btnDownload").addEventListener("click", downloadPdf);
  document.getElementById("btnOpen").addEventListener("click", openPdf);

  const dz = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  dz.addEventListener("click", () => fileInput.click());
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault(); dz.classList.remove("drag");
    if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", (e) => { if (e.target.files[0]) readFile(e.target.files[0]); });
});

function readFile(file) {
  const reader = new FileReader();
  reader.onload = () => { document.getElementById("b64Input").value = String(reader.result); convert(); };
  reader.readAsText(file);
}

/* -------------------- Extração do Base64 -------------------- */

// Localiza o Base64 na entrada, seja ela pura, Data URI ou JSON.
function extractBase64(raw) {
  const input = (raw || "").trim();
  if (!input) throw new Error("Cole o Base64 do boleto primeiro.");

  // 1) Data URI
  const dataUri = input.match(/data:([^;,]+)?;base64,([A-Za-z0-9+/=\s\r\n]+)/i);
  if (dataUri) return { b64: dataUri[2].replace(/\s/g, ""), source: "Data URI" };

  // 2) JSON — procura a string mais "parecida com Base64/PDF" entre os valores
  if (/^\s*[{[]/.test(input)) {
    try {
      const obj = JSON.parse(input);
      const best = pickBase64FromJson(obj);
      if (best) return { b64: best.value.replace(/\s/g, ""), source: `JSON: ${best.path}` };
    } catch {
      // JSON inválido → cai para tratamento como Base64 puro
    }
  }

  // 3) Base64 puro (remove espaços/quebras)
  return { b64: input.replace(/\s/g, ""), source: "Base64 puro" };
}

// Varre o JSON e escolhe o melhor candidato a Base64 (prioriza início de PDF "JVBER").
function pickBase64FromJson(obj) {
  const candidates = [];
  const walk = (value, path) => {
    if (typeof value === "string") {
      const clean = value.replace(/^data:[^,]*,/, "").replace(/\s/g, "");
      if (clean.length >= 40 && /^[A-Za-z0-9+/=]+$/.test(clean)) {
        let score = clean.length;
        if (clean.startsWith("JVBER")) score += 1_000_000; // "%PDF" em Base64
        if (/boleto|pdf|arquivo|file|base64|documento/i.test(path)) score += 10_000;
        candidates.push({ path, value: clean, score });
      }
    } else if (value && typeof value === "object") {
      for (const k of Object.keys(value)) walk(value[k], path ? `${path}.${k}` : k);
    }
  };
  walk(obj, "");
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

/* -------------------- Decode + validação -------------------- */

function base64ToBytes(b64) {
  // normaliza base64url e padding
  let s = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  if (!s || !/^[A-Za-z0-9+/]+=*$/.test(s)) {
    throw new Error("Base64 inválido: há caracteres fora do padrão. Confira se copiou o conteúdo inteiro do chamado.");
  }
  let binary;
  try {
    binary = atob(s);
  } catch {
    throw new Error("Base64 inválido ou incompleto — confira se o conteúdo veio inteiro do chamado.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function sniffMime(bytes) {
  const head = Array.from(bytes.slice(0, 5)).map((b) => String.fromCharCode(b)).join("");
  if (head.startsWith("%PDF")) return "application/pdf";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  return "application/octet-stream";
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/* -------------------- Fluxo principal -------------------- */

function convert() {
  try {
    const { b64, source } = extractBase64(document.getElementById("b64Input").value);
    const bytes = base64ToBytes(b64);
    if (!bytes.length) throw new Error("Nada foi decodificado. O Base64 parece vazio.");

    const mime = sniffMime(bytes);

    // limpa URL anterior
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.blob = new Blob([bytes], { type: mime });
    state.objectUrl = URL.createObjectURL(state.blob);
    state.fileName = mime === "application/pdf" ? "boleto.pdf" : "arquivo.bin";

    document.getElementById("metaType").textContent = mime;
    document.getElementById("metaSize").textContent = formatBytes(bytes.length);
    document.getElementById("metaSource").textContent = source;

    const frame = document.getElementById("pdfFrame");
    if (mime === "application/pdf") {
      frame.src = state.objectUrl;
      frame.classList.remove("hidden");
      setMsg(`Boleto decodificado com sucesso (${formatBytes(bytes.length)}). Prévia abaixo.`, "ok");
    } else {
      frame.classList.add("hidden");
      frame.removeAttribute("src");
      setMsg(
        `Atenção: o conteúdo NÃO começa com a assinatura de PDF (%PDF) — foi detectado "${mime}". ` +
        `Pode ser um Base64 truncado, de outro tipo de arquivo, ou com dados extras antes do boleto. ` +
        `Você ainda pode baixar para inspecionar.`,
        "error"
      );
    }
    document.getElementById("resultSection").classList.remove("hidden");
  } catch (err) {
    setMsg(err.message, "error");
    document.getElementById("resultSection").classList.add("hidden");
  }
}

function downloadPdf() {
  if (!state.blob) return setMsg("Converta um Base64 antes de baixar.", "error");
  const a = document.createElement("a");
  a.href = state.objectUrl;
  a.download = state.fileName;
  a.click();
}

function openPdf() {
  if (!state.objectUrl) return setMsg("Converta um Base64 antes de abrir.", "error");
  window.open(state.objectUrl, "_blank", "noopener,noreferrer");
}

function clearAll() {
  document.getElementById("b64Input").value = "";
  document.getElementById("resultSection").classList.add("hidden");
  const frame = document.getElementById("pdfFrame");
  frame.removeAttribute("src");
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.blob = null; state.objectUrl = null;
  setMsg("Aguardando o Base64 do boleto.", "");
}

function setMsg(text, kind) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = "validation-msg" + (kind ? " " + kind : "");
}
