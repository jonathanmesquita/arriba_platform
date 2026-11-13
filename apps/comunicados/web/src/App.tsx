/* Layout do portal: barra lateral fixa com os grupos (Envio e
   Configuração) e o conteúdo à direita — a mesma divisão que a
   ferramenta de referência usa, porque funciona: quem opera vive em
   "Novo envio" e "Enviados", e a configuração fica fora do caminho. */

import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ExigeAdmin, ExigeSessao, useAuth } from "./auth/AuthContext";
import Entrar from "./pages/Entrar";
import Inicio from "./pages/Inicio";
import Cartas from "./pages/Cartas";
import CartaEditor from "./pages/CartaEditor";
import NovoEnvio from "./pages/NovoEnvio";
import Enviados from "./pages/Enviados";
import Smtp from "./pages/Smtp";
import Clientes from "./pages/Clientes";
import Descadastros from "./pages/Descadastros";
import Usuarios from "./pages/Usuarios";

function Lateral() {
  const { usuario, ehAdmin, sair } = useAuth();

  return (
    <aside className="lateral">
      <div className="marca">
        <span className="marca-icone" aria-hidden="true">✉</span>
        <div>
          <strong>Comunicados</strong>
          <small>Protótipo</small>
        </div>
      </div>

      <nav>
        <NavLink to="/" end>Início</NavLink>

        <span className="grupo">Envio</span>
        <NavLink to="/novo-envio">Novo envio</NavLink>
        <NavLink to="/enviados">Enviados</NavLink>

        <span className="grupo">Configuração</span>
        <NavLink to="/clientes">Clientes</NavLink>
        <NavLink to="/cartas">Cartas modelo</NavLink>
        {ehAdmin ? <NavLink to="/smtp">Servidor de e-mail</NavLink> : null}
        <NavLink to="/descadastros">Descadastros</NavLink>
        {ehAdmin ? <NavLink to="/usuarios">Usuários</NavLink> : null}
      </nav>

      <div className="rodape-lateral">
        <strong>{usuario?.nome}</strong>
        <small>{usuario?.papel === "ADMIN" ? "Administrador" : "Operador"}</small>
        <button type="button" className="link" onClick={() => void sair()}>Sair</button>
      </div>
    </aside>
  );
}

export default function App() {
  const { usuario } = useAuth();

  return (
    <Routes>
      <Route path="/entrar" element={usuario ? <Navigate to="/" replace /> : <Entrar />} />
      <Route
        path="*"
        element={
          <ExigeSessao>
            <div className="portal">
              <Lateral />
              <main className="conteudo">
                <Routes>
                  <Route path="/" element={<Inicio />} />
                  <Route path="/novo-envio" element={<NovoEnvio />} />
                  <Route path="/enviados" element={<Enviados />} />
                  <Route path="/enviados/:id" element={<Enviados />} />
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/cartas" element={<Cartas />} />
                  <Route path="/cartas/nova" element={<CartaEditor />} />
                  <Route path="/cartas/:id" element={<CartaEditor />} />
                  <Route path="/descadastros" element={<Descadastros />} />
                  <Route path="/smtp" element={<ExigeAdmin><Smtp /></ExigeAdmin>} />
                  <Route path="/usuarios" element={<ExigeAdmin><Usuarios /></ExigeAdmin>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </ExigeSessao>
        }
      />
    </Routes>
  );
}
