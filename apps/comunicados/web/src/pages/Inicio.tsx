import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client";
import { dataHora } from "../components/formato";
import type { Carta, ConfigSmtp, Envio } from "../components/tipos";

export default function Inicio() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [config, setConfig] = useState<ConfigSmtp | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<{ envios: Envio[] }>("/envios"),
      apiGet<{ cartas: Carta[] }>("/cartas"),
      apiGet<{ config: ConfigSmtp | null }>("/config/smtp")
    ])
      .then(([e, c, s]) => {
        setEnvios(e.envios ?? []);
        setCartas(c.cartas ?? []);
        setConfig(s.config);
      })
      .catch(() => undefined)
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <p className="carregando">Carregando…</p>;

  const ultimos = envios.slice(0, 5);

  return (
    <>
      <h1>Início</h1>

      {!config ? (
        <div className="aviso">
          O servidor de e-mail ainda não foi configurado — nenhum disparo funciona antes disso.{" "}
          <Link to="/smtp">Configurar agora</Link>.
        </div>
      ) : null}

      <div className="grade">
        <div className="painel">
          <p className="secao-titulo">Cartas modelo</p>
          <p style={{ fontSize: "1.8rem", fontWeight: 300, margin: 0 }}>{cartas.length}</p>
          <p className="dica">Prontas para usar num envio.</p>
          <div className="acoes"><Link className="botao" to="/cartas">Ver cartas</Link></div>
        </div>

        <div className="painel">
          <p className="secao-titulo">Envios</p>
          <p style={{ fontSize: "1.8rem", fontWeight: 300, margin: 0 }}>{envios.length}</p>
          <p className="dica">Histórico completo, com quem recebeu e quem falhou.</p>
          <div className="acoes"><Link className="botao botao-primario" to="/novo-envio">Novo envio</Link></div>
        </div>
      </div>

      <h2>Últimos envios</h2>
      {ultimos.length === 0 ? (
        <p className="dica">Nenhum envio ainda.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr><th>Assunto</th><th>Quando</th><th>Enviados</th><th>Falhas</th><th>Status</th></tr>
          </thead>
          <tbody>
            {ultimos.map((envio) => (
              <tr key={envio.id}>
                <td><Link to={`/enviados/${envio.id}`}>{envio.assunto}</Link></td>
                <td>{dataHora(envio.criadoEm)}</td>
                <td>{envio.totais?.enviados ?? 0}</td>
                <td>{envio.totais?.falhas ?? 0}</td>
                <td><span className="pilula">{envio.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
