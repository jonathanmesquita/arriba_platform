/* =====================================================================
   Rotas e cabeçalho

   Três rotas: /login (pública), / (chat, exige sessão) e /admin (exige
   sessão + papel ADMIN). As guardas de rota são conveniência de
   interface, não segurança: quem editar o estado no navegador consegue
   renderizar a tela do admin, mas todas as rotas de /api/admin exigem
   ADMIN no servidor e devolvem 403 — é lá que a permissão vale.
   ===================================================================== */

import { useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";

import Admin from "./pages/Admin";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import { RequireAdmin, RequireAuth, useAuth } from "./auth/AuthContext";

function Cabecalho() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const [saindo, setSaindo] = useState(false);

  if (!usuario) return null;

  async function aoSair() {
    setSaindo(true);
    try {
      await sair();
      navegar("/login", { replace: true });
    } finally {
      setSaindo(false);
    }
  }

  return (
    <header className="cabecalho">
      <Link to="/" className="marca">
        <span className="marca-ponto" aria-hidden="true" />
        Arriba <strong>Chat IA</strong>
      </Link>

      <nav className="cabecalho-acoes">
        {/* O link só existe para quem é admin. Quem não é nunca vê a
            tela — e, se digitar /admin na barra, RequireAdmin devolve
            para o chat. */}
        {usuario.role === "ADMIN" && (
          <NavLink to="/admin" className={({ isActive }) => `link-nav${isActive ? " link-nav-ativo" : ""}`}>
            Administração
          </NavLink>
        )}

        <span className="usuario-chip" title={usuario.email}>
          {usuario.nome}
          {usuario.role === "ADMIN" && <span className="etiqueta">admin</span>}
        </span>

        <button type="button" className="botao" onClick={aoSair} disabled={saindo}>
          {saindo ? "Saindo…" : "Sair"}
        </button>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <div className="aplicacao">
      <Cabecalho />

      <main className="conteudo">
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <Chat />
              </RequireAuth>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            }
          />

          {/* Endereço desconhecido cai no chat; se não houver sessão, a
              própria guarda leva para o login. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
