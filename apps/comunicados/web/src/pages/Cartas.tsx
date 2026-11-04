import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiDelete, apiGet, apiPost } from "../api/client";
import { dataHora, mensagemDaFalha } from "../components/formato";
import type { Carta } from "../components/tipos";

export default function Cartas() {
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const { cartas } = await apiGet<{ cartas: Carta[] }>("/cartas");
      setCartas(cartas ?? []);
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  async function duplicar(id: string) {
    try { await apiPost(`/cartas/${id}/duplicar`); await carregar(); }
    catch (falha) { setErro(mensagemDaFalha(falha)); }
  }

  async function excluir(carta: Carta) {
    if (!confirm(`Excluir a carta "${carta.nome}"? Os envios já feitos continuam no histórico.`)) return;
    try { await apiDelete(`/cartas/${carta.id}`); await carregar(); }
    catch (falha) { setErro(mensagemDaFalha(falha)); }
  }

  if (carregando) return <p className="carregando">Carregando…</p>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Cartas modelo</h1>
        <Link className="botao botao-primario" to="/cartas/nova">Nova carta</Link>
      </div>

      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}

      {cartas.length === 0 ? (
        <p className="dica">Nenhuma carta ainda. Comece criando a primeira.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr><th>Nome</th><th>Produto</th><th>Assunto</th><th>Anexos</th><th>Atualizada em</th><th></th></tr>
          </thead>
          <tbody>
            {cartas.map((carta) => (
              <tr key={carta.id}>
                <td><Link to={`/cartas/${carta.id}`}>{carta.nome}</Link></td>
                <td>{carta.produto?.nome ? <span className="pilula">{carta.produto.nome}</span> : "—"}</td>
                <td>{carta.assunto}</td>
                <td>{carta.anexos.length || "—"}</td>
                <td>{dataHora(carta.atualizadoEm)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <Link to={`/cartas/${carta.id}`}>Editar</Link>{" · "}
                  <button className="link" onClick={() => void duplicar(carta.id)}>Duplicar</button>{" · "}
                  <button className="link" onClick={() => void excluir(carta)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
