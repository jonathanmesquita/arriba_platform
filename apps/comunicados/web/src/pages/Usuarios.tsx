import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../api/client";
import { dataHora, mensagemDaFalha } from "../components/formato";
import type { UsuarioAdmin } from "../components/tipos";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [novo, setNovo] = useState({ nome: "", email: "", senha: "", papel: "OPERADOR" as "ADMIN" | "OPERADOR" });
  const [erro, setErro] = useState("");
  const [recado, setRecado] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const { usuarios } = await apiGet<{ usuarios: UsuarioAdmin[] }>("/usuarios");
      setUsuarios(usuarios ?? []);
    } catch (falha) { setErro(mensagemDaFalha(falha)); }
    finally { setCarregando(false); }
  }

  useEffect(() => { void carregar(); }, []);

  async function criar() {
    setErro(""); setRecado("");
    try {
      await apiPost("/usuarios", novo);
      setNovo({ nome: "", email: "", senha: "", papel: "OPERADOR" });
      setRecado("Usuário criado.");
      await carregar();
    } catch (falha) { setErro(mensagemDaFalha(falha)); }
  }

  if (carregando) return <p className="carregando">Carregando…</p>;

  return (
    <>
      <h1>Usuários</h1>
      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}
      {recado ? <div className="aviso aviso-ok">{recado}</div> : null}

      <div className="painel">
        <p className="secao-titulo">Novo usuário</p>
        <div className="grade">
          <div>
            <label className="rotulo" htmlFor="nomeU">Nome</label>
            <input id="nomeU" className="campo" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          </div>
          <div>
            <label className="rotulo" htmlFor="emailU">E-mail</label>
            <input id="emailU" className="campo" type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          </div>
          <div>
            <label className="rotulo" htmlFor="senhaU">Senha inicial</label>
            <input id="senhaU" className="campo" type="password" autoComplete="new-password"
                   value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
            <p className="dica">Peça para a pessoa trocar depois de entrar.</p>
          </div>
          <div>
            <label className="rotulo" htmlFor="papelU">Papel</label>
            <select id="papelU" className="campo" value={novo.papel}
                    onChange={(e) => setNovo({ ...novo, papel: e.target.value as "ADMIN" | "OPERADOR" })}>
              <option value="OPERADOR">Operador — escreve e dispara</option>
              <option value="ADMIN">Administrador — também configura</option>
            </select>
          </div>
        </div>
        <div className="acoes">
          <button className="botao botao-primario" onClick={() => void criar()}
                  disabled={!novo.nome.trim() || !novo.email.trim() || !novo.senha}>
            Criar usuário
          </button>
        </div>
      </div>

      <table className="tabela">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Último acesso</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nome}</td>
              <td>{u.email}</td>
              <td><span className="pilula">{u.papel === "ADMIN" ? "Administrador" : "Operador"}</span></td>
              <td>{dataHora(u.ultimoLoginEm)}</td>
              <td><span className={`pilula ${u.ativo ? "pilula-ok" : "pilula-alerta"}`}>{u.ativo ? "ativo" : "inativo"}</span></td>
              <td>
                <button className="link" onClick={() => {
                  void apiPatch(`/usuarios/${u.id}`, { ativo: !u.ativo })
                    .then(carregar)
                    .catch((falha) => setErro(mensagemDaFalha(falha)));
                }}>{u.ativo ? "Desativar" : "Reativar"}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
