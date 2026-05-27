const state = {
  bytes: null,
  blob: null,
  objectUrl: null,
  cleanBase64: "",
  mime: "application/octet-stream",
  source: "-",
  fileName: "boleto-decodificado.pdf",
  encodedBase64: "",
  encodedDataUri: ""
};

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
});

function bindEvents() {
  document.querySelectorAll("[data-scroll-to]").forEach(button => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  document.getElementById("btnDecode")?.addEventListener("click", decodeInput);
  document.getElementById("btnExample")?.addEventListener("click", useExample);
  document.getElementById("btnClear")?.addEventListener("click", clearAll);
  document.getElementById("btnDownloadPdf")?.addEventListener("click", downloadDecodedFile);
  document.getElementById("btnOpenPdf")?.addEventListener("click", openDecodedFile);
  document.getElementById("btnCopyClean")?.addEventListener("click", () => copyText(state.cleanBase64));
  document.getElementById("fileInput")?.addEventListener("change", encodeSelectedFile);
  document.getElementById("btnCopyEncoded")?.addEventListener("click", () => copyText(state.encodedBase64));
  document.getElementById("btnCopyDataUri")?.addEventListener("click", () => copyText(state.encodedDataUri));
}

function decodeInput() {
  const raw = document.getElementById("base64Input").value.trim();
  const jsonPath = document.getElementById("jsonPath").value.trim();
  const outputName = document.getElementById("outputName").value.trim();

  if (!raw) {
    setMessage("Cole um Base64, Data URI ou JSON antes de decodificar.", "error");
    return;
  }

  try {
    const extracted = extractBase64(raw, jsonPath);
    const clean = normalizeBase64(extracted.value);
    const bytes = base64ToBytes(clean);
    const mime = sniffMime(bytes, extracted.mime);
    const blob = new Blob([bytes], { type: mime });

    revokeObjectUrl();

    state.bytes = bytes;
    state.blob = blob;
    state.objectUrl = URL.createObjectURL(blob);
    state.cleanBase64 = clean;
    state.mime = mime;
    state.source = extracted.source;
    state.fileName = outputName || defaultFileName(mime);

    renderDecoded(bytes, mime, clean);
    updateMeta(bytes, mime, extracted.source, clean);
    updateChips(bytes, mime, extracted.source);

    setMessage("Base64 decodificado com sucesso.", "ok");
    document.getElementById("step-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    setMessage(error.message || "Não foi possível decodificar o conteúdo.", "error");
    updateChips(null, "-", "-");
  }
}

function extractBase64(raw, jsonPath = "") {
  const dataUri = raw.match(/data:([^;,]+)?;base64,([A-Za-z0-9+/=_\-\s\r\n]+)/i);
  if (dataUri) {
    return {
      value: dataUri[2],
      mime: dataUri[1] || "application/octet-stream",
      source: "Data URI"
    };
  }

  const maybeJson = tryParseJson(raw);
  if (maybeJson.ok) {
    if (jsonPath) {
      const selected = getByPath(maybeJson.value, jsonPath);
      if (typeof selected !== "string") {
        throw new Error("Campo informado no JSON não encontrado ou não é texto Base64.");
      }

      return { value: selected, mime: "", source: `JSON: ${jsonPath}` };
    }

    const candidates = collectStringCandidates(maybeJson.value);
    const sorted = rankBase64Candidates(candidates);

    if (!sorted.length) {
      throw new Error("JSON lido, mas nenhum campo Base64 foi encontrado.");
    }

    return {
      value: sorted[0].value,
      mime: sorted[0].mime || "",
      source: `JSON: ${sorted[0].path}`
    };
  }

  return {
    value: raw,
    mime: "",
    source: "Texto/Base64 puro"
  };
}

function tryParseJson(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, value: null };
  }
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, obj);
}

function collectStringCandidates(value, path = "root", acc = []) {
  if (typeof value === "string") {
    if (looksLikeBase64(value)) {
      acc.push({ path, value, mime: detectDataUriMime(value) });
    }
    return acc;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStringCandidates(item, `${path}[${index}]`, acc));
    return acc;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => collectStringCandidates(item, `${path}.${key}`, acc));
  }

  return acc;
}

function rankBase64Candidates(candidates) {
  return candidates
    .map(candidate => {
      let score = candidate.value.length;
      try {
        const clean = normalizeBase64(candidate.value);
        const sample = base64ToBytes(clean.slice(0, Math.min(clean.length, 2000)));
        const mime = sniffMime(sample, candidate.mime);
        if (mime === "application/pdf") score += 1000000;
        if (/pdf|boleto|arquivo|base64|documento/i.test(candidate.path)) score += 200000;
        return { ...candidate, score, detectedMime: mime };
      } catch {
        return { ...candidate, score: 0 };
      }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

function looksLikeBase64(value) {
  const text = String(value).trim();
  if (text.startsWith("data:")) return /;base64,/i.test(text);
  const compact = text.replace(/\s+/g, "");
  return compact.length >= 80 && /^[A-Za-z0-9+/=_-]+$/.test(compact);
}

function detectDataUriMime(value) {
  const match = String(value).match(/^data:([^;,]+)?;base64,/i);
  return match ? match[1] : "";
}

function normalizeBase64(input) {
  let text = String(input || "").trim();
  const dataUri = text.match(/^data:[^,]*,([\s\S]+)$/i);
  if (dataUri) text = dataUri[1];

  text = text
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const pad = text.length % 4;
  if (pad) text += "=".repeat(4 - pad);

  if (!/^[A-Za-z0-9+/=]+$/.test(text)) {
    throw new Error("Base64 inválido: existem caracteres fora do padrão esperado.");
  }

  return text;
}

function base64ToBytes(base64) {
  let binary;
  try {
    binary = atob(base64);
  } catch {
    throw new Error("Base64 inválido ou incompleto. Verifique se o conteúdo veio inteiro do JSON.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function sniffMime(bytes, declared = "") {
  if (declared) return declared;
  if (!bytes || !bytes.length) return "application/octet-stream";

  const head = asciiHead(bytes, 16);

  if (head.startsWith("%PDF")) return "application/pdf";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "application/zip";

  const text = decodeBytesToText(bytes.slice(0, 800));
  if (/^\s*\{/.test(text)) return "application/json";
  if (/^\s*</.test(text)) return "text/html";
  if (/^[\s\S]*[\w\dÀ-ÿ]/.test(text)) return "text/plain";

  return "application/octet-stream";
}

function asciiHead(bytes, length) {
  return Array.from(bytes.slice(0, length)).map(byte => String.fromCharCode(byte)).join("");
}

function renderDecoded(bytes, mime, clean) {
  const pdfFrame = document.getElementById("pdfFrame");
  const textOutput = document.getElementById("textOutput");
  const cleanOutput = document.getElementById("cleanOutput");

  cleanOutput.textContent = clean;

  if (mime === "application/pdf") {
    pdfFrame.src = state.objectUrl;
    textOutput.textContent = "Conteúdo detectado como PDF. Use a aba PDF para visualizar ou baixe o arquivo.";
    activateTab("pdf");
    return;
  }

  pdfFrame.removeAttribute("src");
  textOutput.textContent = decodeBytesToText(bytes);
  activateTab("text");
}

function decodeBytesToText(bytes) {
  const charset = document.getElementById("charset")?.value || "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function updateMeta(bytes, mime, source, clean) {
  const container = document.getElementById("metaOutput");
  const rows = [
    ["Origem", source],
    ["MIME detectado", mime],
    ["Tamanho decodificado", formatBytes(bytes.length)],
    ["Caracteres Base64", clean.length.toLocaleString("pt-BR")],
    ["Assinatura", asciiHead(bytes, 8).replace(/[^\x20-\x7E]/g, ".")],
    ["É PDF?", mime === "application/pdf" ? "Sim" : "Não"]
  ];

  container.innerHTML = rows.map(([label, value]) => `
    <div class="meta-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");
}

function updateChips(bytes, mime, source) {
  document.getElementById("chipType").textContent = mime || "-";
  document.getElementById("chipSize").textContent = bytes ? formatBytes(bytes.length) : "-";
  document.getElementById("chipSource").textContent = source || "-";
  document.getElementById("chipStatus").textContent = bytes ? "Decodificado" : "Aguardando";
  document.getElementById("chipStatus").style.color = bytes ? "var(--ok)" : "";
}

function activateTab(tab) {
  document.querySelectorAll("[data-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  document.getElementById("pdfFrame").classList.toggle("hidden", tab !== "pdf");
  document.getElementById("textOutput").classList.toggle("hidden", tab !== "text");
  document.getElementById("metaOutput").classList.toggle("hidden", tab !== "meta");
  document.getElementById("cleanOutput").classList.toggle("hidden", tab !== "clean");
}

function downloadDecodedFile() {
  if (!state.blob) {
    setMessage("Decodifique um Base64 antes de baixar.", "error");
    return;
  }

  downloadBlob(state.blob, state.fileName || defaultFileName(state.mime));
}

function openDecodedFile() {
  if (!state.objectUrl) {
    setMessage("Decodifique um Base64 antes de abrir.", "error");
    return;
  }

  window.open(state.objectUrl, "_blank", "noopener,noreferrer");
}

function encodeSelectedFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || "");
    const [, base64 = ""] = result.split(",");
    state.encodedBase64 = base64;
    state.encodedDataUri = result;
    document.getElementById("cleanOutput").textContent = base64;
    updateChips(new Uint8Array(file.size), file.type || "application/octet-stream", "Arquivo local");
    setMessage("Arquivo convertido para Base64. Use os botões para copiar.", "ok");
    activateTab("clean");
    document.getElementById("step-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  reader.readAsDataURL(file);
}

function useExample() {
  const pdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 92 >>\nstream\nBT /F1 22 Tf 72 720 Td (Boleto em Base64 - exemplo Arriba) Tj 0 -36 Td /F1 12 Tf (PDF gerado para teste local.) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000241 00000 n \n0000000383 00000 n \ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n453\n%%EOF`;

  const base64 = btoa(pdf);
  const json = {
    idBoleto: 47873,
    origem: "DataCob / API teste",
    arquivo: {
      nome: "boleto-exemplo.pdf",
      contentType: "application/pdf",
      base64
    }
  };

  document.getElementById("base64Input").value = JSON.stringify(json, null, 2);
  document.getElementById("jsonPath").value = "arquivo.base64";
  document.getElementById("outputName").value = "boleto-exemplo.pdf";
  decodeInput();
}

function clearAll() {
  revokeObjectUrl();
  state.bytes = null;
  state.blob = null;
  state.cleanBase64 = "";
  state.encodedBase64 = "";
  state.encodedDataUri = "";

  document.getElementById("base64Input").value = "";
  document.getElementById("jsonPath").value = "";
  document.getElementById("pdfFrame").removeAttribute("src");
  document.getElementById("textOutput").textContent = "Nenhum conteúdo textual decodificado ainda.";
  document.getElementById("cleanOutput").textContent = "Nenhum Base64 limpo ainda.";
  document.getElementById("metaOutput").innerHTML = "";
  document.getElementById("fileInput").value = "";
  updateChips(null, "-", "-");
  setMessage("Aguardando Base64 ou JSON para conversão.", "warn");
  activateTab("pdf");
}

function revokeObjectUrl() {
  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = null;
  }
}

function defaultFileName(mime) {
  if (mime === "application/pdf") return "arquivo-decodificado.pdf";
  if (mime === "image/png") return "arquivo-decodificado.png";
  if (mime === "image/jpeg") return "arquivo-decodificado.jpg";
  if (mime === "application/json") return "arquivo-decodificado.json";
  if (mime === "text/html") return "arquivo-decodificado.html";
  if (mime === "text/plain") return "arquivo-decodificado.txt";
  return "arquivo-decodificado.bin";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  if (!text) {
    setMessage("Nada para copiar ainda.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setMessage("Conteúdo copiado para a área de transferência.", "ok");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    setMessage("Conteúdo copiado para a área de transferência.", "ok");
  }
}

function setMessage(text, type = "warn") {
  const box = document.getElementById("messageBox");
  box.textContent = text;
  box.classList.toggle("ok", type === "ok");
  box.classList.toggle("error", type === "error");
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
