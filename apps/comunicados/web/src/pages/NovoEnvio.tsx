/* Novo envio em dois passos de propósito: "conferir" grava e mostra quem
   entra e quem fica de fora; "disparar" manda. Um botão só tiraria a
   última chance de olhar a lista — que é onde o erro caro acontece. */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";
import { mensagemDaFalha } from "../components/formato";
import type { Carta, Cliente } from "../components/tipos";

interface Preparado {
  envioId: string; aEnviar: number; descadastrados: number; repetidos: number; invalidos: number;
  lotes: number; minutosEstimados: number;
}

export default function NovoEnvio() {
  const navegar = useNavigate();
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cartaId, setCartaId] = useState("");
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [avulsos, setAvulsos] = useState("");
  const [preparado, setPreparado] = useState<Preparado | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiGet<{ cartas: Carta[] }>("/cartas"),
      apiGet<{ clientes: Cliente[] }>("/clientes")
    ]).then(([c, cl]) => {
      setCartas(c.cartas ?? []);
      setClientes(cl.clientes ?? []);
    }).catch((falha) => setErro(mensagemDaFalha(falha)));
  }, []);

  function alternar(id: string) {
    setEscolhidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
    setPreparado(null);
  }

  async function conferir() {
    setOcupado(true); setErro("");
    try {
      const emails = avulsos.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean);
      setPreparado(await apiPost<Preparado>("/envios/preparar", {
        cartaId,
        clienteIds: [...escolhidos],
        emailsAvulsos: emails
      }));
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setOcupado(false);
    }
  }

  async function disparar() {
    if (!preparado) return;
    if (!confirm(`Disparar para ${preparado.aEnviar} destinatário(s) em ${preparado.lotes} lote(s)?`)) return;
    setOcupado(true); setErro("");
    try {
      await apiPost(`/envios/${preparado.envioId}/disparar`);
      navegar(`/enviados/${preparado.envioId}`);
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
      setOcupado(false);
    }
  }

  const totalContatos = clientes
    .filter((c) => escolhidos.has(c.id))
    .reduce((soma, c) => soma + c.contatos.filter((x) => x.ativo).length, 0);

  return (
    <>
      <h1>Novo envio</h1>
      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}

      <div className="painel">
        <p className="secao-titulo">1. Qual carta</p>
        <select className="campo" value={cartaId} onChange={(e) => { setCartaId(e.target.value); setPreparado(null); }}>
          <option value="">Escolha a carta modelo…</option>
          {cartas.map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.assunto}</option>)}
        </select>
      </div>

      <div className="painel">
        <p className="secao-titulo">2. Para quem</p>
        {clientes.length === 0 ? (
          <p className="dica">Nenhum cliente cadastrado ainda.</p>
        ) : (
          <table className="tabela">
            <thead><tr><th></th><th>Cliente</th><th>Produto</th><th>Contatos</th></tr></thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>
                    <input type="checkbox" checked={escolhidos.has(cliente.id)}
                           onChange={() => alternar(cliente.id)} aria-label={`Selecionar ${cliente.nome}`} />
                  </td>
                  <td>{cliente.nome}</td>
                  <td>{cliente.produto?.nome ?? "—"}</td>
                  <td>{cliente.contatos.filter((c) => c.ativo).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <label className="rotulo" style={{ marginTop: 14 }} htmlFor="avulsos">E-mails avulsos</label>
        <textarea id="avulsos" className="campo" style={{ minHeight: 80 }} value={avulsos}
                  placeholder="um por linha, ou separados por vírgula"
                  onChange={(e) => { setAvulsos(e.target.value); setPreparado(null); }} />
        <p className="dica">
          {totalContatos} contato(s) pelos clientes escolhidos. Quem pediu descadastro é retirado
          automaticamente, mesmo que esteja na lista colada aqui.
        </p>

        <div className="acoes">
          <button className="botao" onClick={() => void conferir()} disabled={!cartaId || ocupado}>
            {ocupado ? "Conferindo…" : "Conferir lista"}
          </button>
        </div>
      </div>

      {preparado ? (
        <div className="painel">
          <p className="secao-titulo">3. Conferência</p>
          <div className="grade">
            <div>
              <p style={{ fontSize: "1.6rem", fontWeight: 300, margin: 0 }}>{preparado.aEnviar}</p>
              <p className="dica">vão receber, em {preparado.lotes} lote(s)
                {preparado.minutosEstimados > 0 ? ` — cerca de ${preparado.minutosEstimados} min no total` : ""}</p>
            </div>
            <div>
              <p className="dica" style={{ marginTop: 0 }}>Ficaram de fora:</p>
              <span className="pilula">{preparado.descadastrados} descadastrado(s)</span>{" "}
              <span className="pilula">{preparado.repetidos} repetido(s)</span>{" "}
              <span className="pilula">{preparado.invalidos} inválido(s)</span>
            </div>
          </div>
          <div className="acoes">
            <button className="botao botao-primario" onClick={() => void disparar()} disabled={ocupado || preparado.aEnviar === 0}>
              Disparar agora
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
