import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../api/client";
import { dataHora, mensagemDaFalha } from "../components/formato";
import type { Envio } from "../components/tipos";

function pilulaDoStatus(status: string): string {
  if (status === "ENVIADO" || status === "CONCLUIDO") return "pilula pilula-ok";
  if (status === "FALHOU") return "pilula pilula-erro";
  if (status === "DESCADASTRADO" || status === "CANCELADO") return "pilula pilula-alerta";
  return "pilula";
}

export default function Enviados() {
  const { id } = useParams();
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    const requisicao = id
      ? apiGet<{ envio: Envio }>(`/envios/${id}`).then((r) => { setEnvio(r.envio); })
      : apiGet<{ envios: Envio[] }>("/envios").then((r) => { setEnvios(r.envios ?? []); setEnvio(null); });

    void requisicao.catch((falha) => setErro(mensagemDaFalha(falha))).finally(() => setCarregando(false));
  }, [id]);

  // Envio em andamento: a tela se atualiza sozinha, senão quem disparou
  // fica apertando F5 para saber se terminou.
  useEffect(() => {
    if (!envio || envio.status !== "ENVIANDO") return;
    const t = setInterval(() => {
      void apiGet<{ envio: Envio }>(`/envios/${envio.id}`).then((r) => setEnvio(r.envio)).catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [envio]);

  if (carregando) return <p className="carregando">Carregando…</p>;
  if (erro) return <div className="aviso aviso-erro">{erro}</div>;

  if (envio) {
    const destinatarios = envio.destinatarios ?? [];
    const falhas = destinatarios.filter((d) => d.status === "FALHOU");

    return (
      <>
        <h1>{envio.assunto}</h1>
        <p className="dica">
          {dataHora(envio.criadoEm)} · <span className={pilulaDoStatus(envio.status)}>{envio.status}</span>
          {envio.carta ? ` · carta "${envio.carta.nome}"` : ""}
        </p>

        {falhas.length ? (
          <div className="aviso aviso-erro">
            {falhas.length} destinatário(s) não receberam. O motivo de cada um está na tabela — a mensagem
            do servidor vem sem senha nem credencial.
          </div>
        ) : null}

        <table className="tabela">
          <thead><tr><th>E-mail</th><th>Cliente</th><th>Lote</th><th>Status</th><th>Quando</th><th>Motivo</th></tr></thead>
          <tbody>
            {destinatarios.map((d) => (
              <tr key={d.id}>
                <td>{d.email}</td>
                <td>{d.clienteNome ?? "—"}</td>
                <td>{d.lote ?? "—"}</td>
                <td><span className={pilulaDoStatus(d.status)}>{d.status}</span></td>
                <td>{dataHora(d.enviadoEm)}</td>
                <td>{d.erro ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="acoes"><Link className="botao" to="/enviados">Voltar</Link></div>
      </>
    );
  }

  return (
    <>
      <h1>Enviados</h1>
      {envios.length === 0 ? <p className="dica">Nenhum envio ainda.</p> : (
        <table className="tabela">
          <thead>
            <tr><th>Assunto</th><th>Quando</th><th>Destinatários</th><th>Enviados</th><th>Falhas</th><th>Status</th></tr>
          </thead>
          <tbody>
            {envios.map((e) => (
              <tr key={e.id}>
                <td><Link to={`/enviados/${e.id}`}>{e.assunto}</Link></td>
                <td>{dataHora(e.criadoEm)}</td>
                <td>{e.totais?.destinatarios ?? 0}</td>
                <td>{e.totais?.enviados ?? 0}</td>
                <td>{e.totais?.falhas ?? 0}</td>
                <td><span className={pilulaDoStatus(e.status)}>{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
