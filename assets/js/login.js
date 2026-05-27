import { getAuthStatus, getReturnUrl, login } from "./auth-client.js";

const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const message = document.getElementById("loginMessage");
const submitButton = document.getElementById("loginSubmit");
const themeButton = document.getElementById("loginThemeToggle");
const year = document.getElementById("loginYear");

function setMessage(text, type = "info") {
  if (!message) return;
  message.textContent = text || "";
  message.dataset.type = type;
  message.hidden = !text;
}

function setLoading(isLoading) {
  if (!submitButton) return;
  submitButton.disabled = isLoading;
  submitButton.innerHTML = isLoading
    ? '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Entrando...</span>'
    : '<span>Entrar</span><i class="fa-solid fa-arrow-right"></i>';
}

function applyTheme(theme) {
  document.documentElement.dataset.authTheme = theme;
  localStorage.setItem("arriba-login-theme", theme);
  const icon = themeButton?.querySelector("i");
  if (icon) icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

function initTheme() {
  const saved = localStorage.getItem("arriba-login-theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

async function redirectIfAlreadyAuthenticated() {
  try {
    const status = await getAuthStatus();
    if (!status.enabled || status.authenticated) {
      window.location.replace(getReturnUrl());
    }
  } catch {
    setMessage("Não foi possível validar a sessão agora. Tente entrar normalmente.", "warn");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput?.value.trim();
  const password = passwordInput?.value || "";

  if (!username || !password) {
    setMessage("Informe usuário e senha para continuar.", "warn");
    return;
  }

  try {
    setLoading(true);
    setMessage("Validando credenciais...", "info");
    await login(username, password);
    setMessage("Login aprovado. Abrindo a Arriba Platform...", "success");
    window.setTimeout(() => window.location.replace(getReturnUrl()), 450);
  } catch (error) {
    setMessage(error.message || "Usuário ou senha inválidos.", "error");
  } finally {
    setLoading(false);
  }
});

themeButton?.addEventListener("click", () => {
  const current = document.documentElement.dataset.authTheme || "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

if (year) year.textContent = new Date().getFullYear();
initTheme();
redirectIfAlreadyAuthenticated();
