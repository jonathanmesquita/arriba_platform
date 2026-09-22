import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import "./styles.css";

const raiz = document.getElementById("root");
if (!raiz) {
  // Falha de montagem do index.html. Melhor estourar aqui, com o motivo,
  // do que renderizar em lugar nenhum e deixar a tela branca sem pista.
  throw new Error('Elemento #root não encontrado — confira o index.html.');
}

// AuthProvider fica DENTRO do BrowserRouter: as rotas protegidas
// (RequireAuth/RequireAdmin) usam o contexto e o roteador ao mesmo
// tempo, e o roteador precisa ser o de fora.
createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
