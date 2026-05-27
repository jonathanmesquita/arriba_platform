import { getAuthStatus } from "./auth-client.js";

function isLoginPage() {
  return window.location.pathname.endsWith("/login.html") || window.location.pathname === "/login";
}

function buildLoginUrl() {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/login.html?return=${encodeURIComponent(current || "/")}`;
}

async function guardPage() {
  try {
    const status = await getAuthStatus();
    if (status.enabled && !status.authenticated && !isLoginPage()) {
      window.location.replace(buildLoginUrl());
    }
  } catch (error) {
    if (!isLoginPage()) {
      console.warn("Arriba Auth indisponível:", error);
    }
  }
}

guardPage();
