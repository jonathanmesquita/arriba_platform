const DEFAULT_API_BASE = "https://api.arriba.jm.dev.br";

export function getApiBase() {
  return (window.ARRIBA_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");
}

async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export async function getAuthStatus() {
  const response = await fetch(`${getApiBase()}/auth/status`, {
    method: "GET",
    credentials: "include",
    headers: { "Accept": "application/json" }
  });
  const data = await readResponse(response);
  if (!response.ok) throw Object.assign(new Error(data.error || "Falha ao consultar autenticação."), { data, status: response.status });
  return data;
}

export async function login(username, password) {
  const response = await fetch(`${getApiBase()}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });
  const data = await readResponse(response);
  if (!response.ok) throw Object.assign(new Error(data.error || "Usuário ou senha inválidos."), { data, status: response.status });
  return data;
}

export async function logout() {
  const response = await fetch(`${getApiBase()}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "Accept": "application/json" }
  });
  const data = await readResponse(response);
  if (!response.ok) throw Object.assign(new Error(data.error || "Falha ao sair."), { data, status: response.status });
  return data;
}

export function getReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("return") || "/";
}
