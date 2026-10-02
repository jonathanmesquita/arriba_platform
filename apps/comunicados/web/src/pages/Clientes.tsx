import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../api/client";
import { mensagemDaFalha } from "../components/formato";
import type { Cliente, Produto } from "../components/tipos";

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [novo, setNovo] = useState({ nome: "", produtoId: "", email: "" });
  const [novoProduto, setNovoProduto] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const [c, p] = await Promise.all([
        apiGet<{ clientes: Cliente[] }>("/clientes"),
        apiGet<{ produtos: Produto[] }>("/produtos")
      ]);
      setClientes(c.clientes ?? []);
      setProdutos(p.produtos ?? []);
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  async function criarCliente() {
    setErro("");
    try {
      await apiPost("/clientes", {
        nome: novo.nome.trim(),
        produtoId: novo.produtoId || null,
        contatos: novo.email.trim() ? [{ email: novo.email.trim() }] : []
      });
      setNovo({ nome: "", produtoId: "", email: "" });
      await carregar();
    } catch (falha) { setErro(mensagemDaFalha(falha)); }
  }

  async function criarProduto() {
    setErro("");
    try {
      await apiPost("/produtos", { nome: novoProduto.trim() });
      setNovoProduto("");
      await carregar();
    } catch (falha) { setErro(mensagemDaFalha(falha)); }
  }

  async function adicionarContato(clienteId: string, email: string) {
    setErro("");
    try { await apiPost(`/clientes/${clienteId}/contatos`, { email }); await carregar(); }
    catch (falha) { setErro(mensagemDaFalha(falha)); }
  }

  if (carregando) return <p className="carregando">Carregando…</p>;

  return (
    <>
      <h1>Clientes</h1>
      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}

      <div className="painel">
        <p className="secao-titulo">Novo cliente</p>
        <div className="grade">
          <div>
            <label className="rotulo" htmlFor="nomeCliente">Nome</label>
            <input id="nomeCliente" className="campo" value={novo.nome}
                   onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          </div>
          <div>
            <label className="rotulo" htmlFor="produtoCliente">Produto</label>
            <select id="produtoCliente" className="campo" value={novo.produtoId}
                    onChange={(e) => setNovo({ ...novo, produtoId: e.target.value })}>
              <option value="">Sem produto</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="inteira">
            <label className="rotulo" htmlFor="emailCliente">E-mail do primeiro contato</label>
            <input id="emailCliente" className="campo" type="email" value={novo.email}
                   onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          </div>
        </div>
        <div className="acoes">
          <button className="botao botao-primario" onClick={() => void criarCliente()} disabled={!novo.nome.trim()}>
            Adicionar cliente
          </button>
        </div>
      </div>

      <div className="painel">
        <p className="secao-titulo">Produtos</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {produtos.length === 0 ? <span className="dica">Nenhum produto ainda.</span>
            : produtos.map((p) => <span key={p.id} className="pilula">{p.nome}</span>)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="campo" placeholder="Nome do produto" value={novoProduto}
                 onChange={(e) => setNovoProduto(e.target.value)} />
          <button className="botao" onClick={() => void criarProduto()} disabled={!novoProduto.trim()}>Adicionar</button>
        </div>
      </div>

      {clientes.map((cliente) => (
        <div className="painel" key={cliente.id}>
          <p className="secao-titulo">
            {cliente.nome} {cliente.produto ? <span className="pilula">{cliente.produto.nome}</span> : null}
          </p>
          {cliente.contatos.length === 0 ? <p className="dica">Sem contatos — este cliente não recebe nada.</p> : (
            <table className="tabela">
              <tbody>
                {cliente.contatos.map((contato) => (
                  <tr key={contato.id}>
                    <td>{contato.email}</td>
                    <td>{contato.nome ?? "—"}</td>
                    <td>
                      <button className="link" onClick={() => {
                        void apiDelete(`/contatos/${contato.id}`).then(carregar);
                      }}>Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form className="acoes" onSubmit={(e) => {
            e.preventDefault();
            const campo = e.currentTarget.elements.namedItem("email") as HTMLInputElement;
            if (campo.value.trim()) { void adicionarContato(cliente.id, campo.value.trim()); campo.value = ""; }
          }}>
            <input name="email" className="campo" style={{ maxWidth: 320 }} type="email" placeholder="novo contato" />
            <button className="botao" type="submit">Adicionar contato</button>
          </form>
        </div>
      ))}
    </>
  );
}
