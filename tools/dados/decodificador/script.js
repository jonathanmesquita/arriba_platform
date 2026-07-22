/* =====================================================================
   Decodificador Universal - Arriba Platform

   Um codec por formato (decode/encode), tudo client-side. Cada codec
   é uma função pura { decode(texto), encode(texto) } — a UI só liga o
   formato + ação escolhidos na sidebar ao codec correspondente.
   ===================================================================== */

"use strict";

const FORMATOS = {
  base64: {
    label: "Base64",
    descricao: "Aceita texto Base64 puro (com ou sem quebras de linha).",
    decode: (txt) => {
      const clean = txt.trim().replace(/\s+/g, "");
      if (!clean) throw new Error("Cole um texto Base64.");
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error("Contém caracteres que não são Base64 válido.");
      const binary = atob(clean);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    },
    encode: (txt) => {
      const bytes = new TextEncoder().encode(txt);
      let binary = "";
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      return btoa(binary);
    }
  },

  url: {
    label: "URL",
    descricao: "encodeURIComponent / decodeURIComponent — para query strings e parâmetros de URL.",
    decode: (txt) => decodeURIComponent(txt.trim()),
    encode: (txt) => encodeURIComponent(txt)
  },

  html: {
    label: "HTML Entities",
    descricao: "Converte entidades como &amp;, &lt;, &#39; de volta ao caractere original (e vice-versa).",
    decode: (txt) => {
      const el = document.createElement("textarea");
      el.innerHTML = txt;
      return el.value;
    },
    encode: (txt) => txt.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]))
  },

  hex: {
    label: "Hexadecimal",
    descricao: "Bytes em hexadecimal (aceita espaços e prefixo 0x) → texto UTF-8.",
    decode: (txt) => {
      const clean = txt.trim().replace(/0x/gi, "").replace(/\s+/g, "");
      if (!clean) throw new Error("Cole um texto em hexadecimal.");
      if (!/^[0-9a-fA-F]+$/.test(clean)) throw new Error("Contém caracteres que não são hexadecimais.");
      if (clean.length % 2 !== 0) throw new Error("Quantidade ímpar de dígitos — cada byte precisa de 2 dígitos hex.");
      const bytes = clean.match(/.{2}/g).map((h) => parseInt(h, 16));
      return new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(bytes));
    },
    encode: (txt) => {
      const bytes = new TextEncoder().encode(txt);
      return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    }
  },

  binary: {
    label: "Binário",
    descricao: "Bytes em binário (grupos de 8 bits, com ou sem espaços) → texto UTF-8.",
    decode: (txt) => {
      const clean = txt.trim().replace(/\s+/g, "");
      if (!clean) throw new Error("Cole um texto em binário.");
      if (!/^[01]+$/.test(clean)) throw new Error("Contém caracteres que não são 0 ou 1.");
      if (clean.length % 8 !== 0) throw new Error("Quantidade de bits não é múltipla de 8 (cada byte precisa de 8 bits).");
      const bytes = clean.match(/.{8}/g).map((b) => parseInt(b, 2));
      return new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(bytes));
    },
    encode: (txt) => {
      const bytes = new TextEncoder().encode(txt);
      return [...bytes].map((b) => b.toString(2).padStart(8, "0")).join(" ");
    }
  },

  rot13: {
    label: "ROT13",
    descricao: "Cifra de César de 13 posições — a mesma operação decodifica e codifica (simétrica).",
    decode: (txt) => rot13(txt),
    encode: (txt) => rot13(txt)
  },

  unicode: {
    label: "Unicode Escape",
    descricao: "Sequências \\uXXXX ↔ caracteres reais (útil para strings de JSON/JS escapadas).",
    decode: (txt) => txt.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))),
    encode: (txt) => [...txt].map((ch) => {
      const code = ch.codePointAt(0);
      return (code > 126 || code < 32) ? "\\u" + code.toString(16).padStart(4, "0") : ch;
    }).join("")
  },

  jwt: {
    label: "JWT",
    descricao: "Decodifica header e payload de um JSON Web Token. A assinatura NÃO é verificada (só o backend que a emitiu tem a chave secreta).",
    decode: (txt) => decodeJwt(txt),
    encode: null // JWT não é "codificado" aqui — assinar exige uma chave secreta.
  }
};

function rot13(str) {
  return str.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function base64UrlDecodeToJson(part) {
  let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const json = new TextDecoder("utf-8").decode(bytes);
  return JSON.parse(json);
}

function decodeJwt(txt) {
  const parts = txt.trim().split(".");
  if (parts.length < 2) throw new Error("Não parece um JWT (esperado header.payload.assinatura).");

  let header, payload;
  try {
    header = base64UrlDecodeToJson(parts[0]);
    payload = base64UrlDecodeToJson(parts[1]);
  } catch {
    throw new Error("Header ou payload não são Base64URL/JSON válidos.");
  }

  const linhas = [`// HEADER`, JSON.stringify(header, null, 2), "", `// PAYLOAD`, JSON.stringify(payload, null, 2)];
  if (payload.exp) linhas.push("", `// exp (expira em): ${new Date(payload.exp * 1000).toLocaleString("pt-BR")}`);
  if (payload.iat) linhas.push(`// iat (emitido em): ${new Date(payload.iat * 1000).toLocaleString("pt-BR")}`);
  linhas.push("", "// Assinatura NÃO verificada — esta ferramenta só decodifica, não valida a chave secreta.");
  return linhas.join("\n");
}

/* ---------------------------------------------------------------------
   Exemplos prontos (um par decode/encode por formato) — usados pelo
   botão "Carregar exemplo" para o usuário ver a ferramenta funcionando
   sem precisar digitar nada.
   --------------------------------------------------------------------- */
const EXEMPLOS = {
  base64: { decode: "QXJyaWJhIFBsYXRmb3JtIQ==", encode: "Arriba Platform!" },
  url: { decode: "Ol%C3%A1%2C%20mundo%21%20%3Fq%3Dteste%26x%3D1", encode: "Olá, mundo! ?q=teste&x=1" },
  html: { decode: "Suporte &amp; Manuten&ccedil;&atilde;o &lt;VIP&gt;", encode: '<script>alert("XSS")</script> & \'aspas\'' },
  hex: { decode: "41727269626121", encode: "Arriba!" },
  binary: { decode: "01000001 01110010 01110010 01101001 01100010 01100001 00100001", encode: "Arriba!" },
  rot13: { decode: "Neevon Cyngsbez!", encode: "Arriba Platform!" },
  unicode: { decode: "Arriba \\u2192 Plataforma", encode: "Arriba → Plataforma" },
  jwt: { decode: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" }
};

/* ---------------------------------------------------------------------
   Detecção automática de formato (heurística por "assinatura" do texto)
   --------------------------------------------------------------------- */
function detectarFormato(texto) {
  const t = texto.trim();
  if (!t) return null;

  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(t)) return "jwt";

  const semEspacos = t.replace(/\s+/g, "");
  if (/^[01]+$/.test(semEspacos) && semEspacos.length % 8 === 0) return "binary";
  if (/^[0-9a-fA-F]+$/.test(semEspacos) && semEspacos.length % 2 === 0 && /[a-fA-F]/.test(semEspacos)) return "hex";

  if (/%[0-9a-fA-F]{2}/.test(t)) return "url";
  if (/&[a-zA-Z]+;|&#\d+;/.test(t)) return "html";
  if (/\\u[0-9a-fA-F]{4}/.test(t)) return "unicode";
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(semEspacos) && semEspacos.length % 4 === 0 && semEspacos.length > 0) return "base64";

  return null;
}

/* ---------------------------------------------------------------------
   UI
   --------------------------------------------------------------------- */
let currentFormato = "base64";
let currentAcao = "decode"; // "decode" | "encode"

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#formatList .side-item").forEach((btn) => {
    btn.addEventListener("click", () => setFormato(btn.dataset.formato));
  });

  document.getElementById("btnAcaoDecode").addEventListener("click", () => setAcao("decode"));
  document.getElementById("btnAcaoEncode").addEventListener("click", () => setAcao("encode"));
  document.getElementById("btnDetectar").addEventListener("click", runDetectar);
  document.getElementById("btnExemplo").addEventListener("click", runExemplo);
  document.getElementById("btnRun").addEventListener("click", runExecutar);
  document.getElementById("btnSwap").addEventListener("click", runSwap);
  document.getElementById("btnClear").addEventListener("click", runClear);
  document.getElementById("btnCopy").addEventListener("click", runCopy);

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

  syncUI();
});

function readFile(file) {
  const reader = new FileReader();
  reader.onload = () => { document.getElementById("inputText").value = reader.result; };
  reader.readAsText(file, "UTF-8");
}

function setFormato(formato) {
  currentFormato = formato;
  if (formato === "jwt") currentAcao = "decode"; // JWT só decodifica
  document.querySelectorAll("#formatList .side-item").forEach((b) => b.classList.toggle("active", b.dataset.formato === formato));
  syncUI();
}

function setAcao(acao) {
  if (currentFormato === "jwt" && acao === "encode") return; // sem-op: JWT não codifica
  currentAcao = acao;
  syncUI();
}

function syncUI() {
  const cfg = FORMATOS[currentFormato];
  const btnEncode = document.getElementById("btnAcaoEncode");
  const btnDecode = document.getElementById("btnAcaoDecode");

  btnEncode.disabled = !cfg.encode;
  btnDecode.classList.toggle("active", currentAcao === "decode");
  btnEncode.classList.toggle("active", currentAcao === "encode");

  const acaoLabel = currentAcao === "decode" ? "Decodificar" : "Codificar";
  document.getElementById("tituloAcao").textContent = `${acaoLabel} — ${cfg.label}`;
  document.getElementById("descricaoFormato").textContent = cfg.descricao;
  document.getElementById("btnRun").innerHTML = `<i class="fa-solid fa-play me-2"></i>${acaoLabel}`;
}

function runDetectar() {
  const texto = document.getElementById("inputText").value;
  const formato = detectarFormato(texto);
  if (!formato) {
    setMsg("Não foi possível detectar o formato automaticamente. Selecione manualmente na barra lateral.", "error");
    return;
  }
  setFormato(formato);
  currentAcao = "decode";
  syncUI();
  setMsg(`Formato detectado: ${FORMATOS[formato].label}. Ajustado automaticamente.`, "ok");
  runExecutar();
}

function runExemplo() {
  const cfg = FORMATOS[currentFormato];
  const valor = EXEMPLOS[currentFormato]?.[currentAcao];
  if (!valor) {
    setMsg(`Sem exemplo de ${currentAcao === "decode" ? "decodificação" : "codificação"} cadastrado para ${cfg.label}.`, "error");
    return;
  }
  document.getElementById("inputText").value = valor;
  document.getElementById("outputText").value = "";
  runExecutar();
}

function runExecutar() {
  const cfg = FORMATOS[currentFormato];
  const fn = currentAcao === "decode" ? cfg.decode : cfg.encode;
  const input = document.getElementById("inputText").value;
  const output = document.getElementById("outputText");

  if (!fn) { setMsg(`${cfg.label} não suporta codificação nesta ferramenta.`, "error"); return; }
  if (!input.trim()) { setMsg("Cole ou envie um conteúdo antes de executar.", "error"); return; }

  try {
    output.value = fn(input);
    setMsg(`${currentAcao === "decode" ? "Decodificado" : "Codificado"} com sucesso.`, "ok");
  } catch (err) {
    output.value = "";
    setMsg("Erro: " + err.message, "error");
  }
}

function runSwap() {
  const input = document.getElementById("inputText");
  const output = document.getElementById("outputText");
  if (!output.value) return;
  input.value = output.value;
  output.value = "";
  setMsg("Saída movida para a entrada. Ajuste o formato/ação se necessário.", "");
}

function runClear() {
  document.getElementById("inputText").value = "";
  document.getElementById("outputText").value = "";
  setMsg("", "");
  document.getElementById("msg").classList.add("hidden");
}

function runCopy() {
  const output = document.getElementById("outputText");
  if (!output.value) { setMsg("Nada para copiar ainda.", "error"); return; }
  navigator.clipboard.writeText(output.value)
    .then(() => setMsg("Saída copiada para a área de transferência.", "ok"))
    .catch(() => setMsg("Não foi possível copiar automaticamente — selecione e copie manualmente.", "error"));
}

function setMsg(msg, kind) {
  const el = document.getElementById("msg");
  if (!msg) { el.classList.add("hidden"); return; }
  el.textContent = msg;
  el.className = "validation-msg" + (kind ? " " + kind : "");
  el.classList.remove("hidden");
}
