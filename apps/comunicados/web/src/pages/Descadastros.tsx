/* Descadastro: quem pediu para não receber mais. Qualquer operador pode
   registrar — atrasar isso vira reclamação. Só administrador remove, e a
   remoção fica na auditoria. */

import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { dataHora, mensagemDaFalha } from "../components/formato";
import type { Descadastro } from "../components/tipos";

export default function Descadastros() {
  const { ehAdmin } = useAuth();
  const [lista, setLista] = useState<Descadastro[]>([]);
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const { descadastros } = await apiGet<{ descadastros: Descadastro[] }>("/descadastros");
      setLista(descadastros ?? []);
    } catch (falha) { setErro(mensagemDaFalha(falha)); }
    finally { setCarregando(false); }
  }

  useEffect(() => { void carregar(); }, []);

  async function registrar() {
    setErro("");
    try {
      await apiPost("/descadastros", { email: email.trim(), motivo: motivo.trim() || undefined });
      setEmail(""); setMotivo("");
      await carregar();
    } catch (falha) { setErro(mensagemDaFalha(falha)); }
  }

  if (carregando) return <p className="carregando">Carregando…</p>;

  return (
    <>
      <h1>Descadastros</h1>
      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}

      <div className="painel">
        <p className="secao-titulo">Registrar pedido</p>
        <div className="grade">
          <div>
            <label className="rotulo" htmlFor="emailDesc">E-mail</label>
            <input id="emailDesc" className="campo" type="email" value={email}
                   onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="rotulo" htmlFor="motivoDesc">Motivo (opcional)</label>
            <input id="motivoDesc" className="campo" value={motivo}
                   onChange={(e) => setMotivo(e.target.value)} />
          </div>
        </div>
        <div className="acoes">
          <button className="botao botao-primario" onClick={() => void registrar()} disabled={!email.trim()}>
            Registrar
          </button>
        </div>
        <p className="dica">
          A partir daqui este endereço é retirado de todo disparo — inclusive de lista colada à mão.
        </p>
      </div>

      <table className="tabela">
        <thead><tr><th>E-mail</th><th>Motivo</th><th>Desde</th>{ehAdmin ? <th></th> : null}</tr></thead>
        <tbody>
          {lista.length === 0 ? (
            <tr><td colSpan={ehAdmin ? 4 : 3} className="dica">Nenhum descadastro.</td></tr>
          ) : lista.map((d) => (
            <tr key={d.id}>
              <td>{d.email}</td>
              <td>{d.motivo ?? "—"}</td>
              <td>{dataHora(d.criadoEm)}</td>
              {ehAdmin ? (
                <td>
                  <button className="link" onClick={() => {
                    if (confirm(`Remover o descadastro de ${d.email}? Ele volta a receber comunicados.`)) {
                      void apiDelete(`/descadastros/${d.id}`).then(carregar);
                    }
                  }}>Remover</button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
