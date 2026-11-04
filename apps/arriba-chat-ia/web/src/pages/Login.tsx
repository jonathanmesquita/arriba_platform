/* =====================================================================
   Tela de login

   O servidor devolve a MESMA mensagem para e-mail inexistente e senha
   errada (e leva o mesmo tempo, de propósito). Esta tela não tenta ser
   mais esperta que isso: mostra o que veio, sem inventar "usuário não
   encontrado" — dizer qual dos dois errou entrega a lista de e-mails
   válidos da empresa para quem estiver testando.
   ===================================================================== */

import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { mensagemDaFalha } from "../components/formato";

export default function Login() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation() as { state?: { de?: string } };

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;

    setErro("");
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      // Volta para onde a pessoa tentou ir antes de cair no login.
      navegar(local.state?.de ?? "/", { replace: true });
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
      setSenha("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-login">
      <form className="cartao caixa-login" onSubmit={aoEnviar}>
        <h1>Arriba Chat IA</h1>
        <p className="sub">Assistente interno da empresa. Entre com seu e-mail corporativo.</p>

        <label className="rotulo" htmlFor="email">E-mail</label>
        <input
          id="email"
          className="campo"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={enviando}
        />

        <label className="rotulo" htmlFor="senha">Senha</label>
        <input
          id="senha"
          className="campo"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          disabled={enviando}
        />

        {erro ? <div className="aviso aviso-erro" role="alert" style={{ marginBottom: 14 }}>{erro}</div> : null}

        <button className="botao botao-primario" type="submit" disabled={enviando} style={{ width: "100%", justifyContent: "center" }}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>

        <p className="dica" style={{ marginTop: 16 }}>
          Não tem acesso? Peça a um administrador para criar seu usuário no painel.
        </p>
      </form>
    </div>
  );
}
