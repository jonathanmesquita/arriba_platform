import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { mensagemDaFalha } from "../components/formato";

export default function Entrar() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      await entrar(email.trim(), senha);
      navegar("/", { replace: true });
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-entrar">
      <form className="painel caixa-entrar" onSubmit={aoEnviar}>
        <h1>Comunicados</h1>
        <p className="sub">Portal de envio de comunicados por e-mail.</p>

        {erro ? <div className="aviso aviso-erro">{erro}</div> : null}

        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" className="campo" type="email" autoComplete="username"
               value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label className="rotulo" htmlFor="senha">Senha</label>
        <input id="senha" className="campo" type="password" autoComplete="current-password"
               value={senha} onChange={(e) => setSenha(e.target.value)} required />

        <div className="acoes">
          <button className="botao botao-primario" type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </div>
        <p className="dica">Não tem acesso? Peça a um administrador para criar seu usuário.</p>
      </form>
    </div>
  );
}
