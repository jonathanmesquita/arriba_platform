/* Editor da carta com pré-visualização.
   A prévia é feita no servidor, pela MESMA função que preenche a carta no
   disparo — se fosse reimplementada aqui em JavaScript, a tela mostraria
   uma coisa e o e-mail sairia outra. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from "../api/client";
import { mensagemDaFalha, tamanho } from "../components/formato";
import type { AnexoCarta, Carta, Produto, Variavel } from "../components/tipos";

interface Previa { assunto: string; corpoHtml: string; variaveisDesconhecidas: string[] }

export default function CartaEditor() {
  const { id } = useParams();
  const navegar = useNavigate();
  const ehNova = !id;

  const [form, setForm] = useState({ nome: "", assunto: "", corpoHtml: "", produtoId: "" });
  const [anexos, setAnexos] = useState<AnexoCarta[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variaveis, setVariaveis] = useState<Variavel[]>([]);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [erro, setErro] = useState("");
  const [recado, setRecado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const corpoRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void apiGet<{ produtos: Produto[] }>("/produtos").then((r) => setProdutos(r.produtos ?? [])).catch(() => undefined);
    void apiGet<{ variaveis: Variavel[] }>("/cartas/variaveis").then((r) => setVariaveis(r.variaveis ?? [])).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    void apiGet<{ carta: Carta }>(`/cartas/${id}`)
      .then(({ carta }) => {
        setForm({ nome: carta.nome, assunto: carta.assunto, corpoHtml: carta.corpoHtml, produtoId: carta.produtoId ?? "" });
        setAnexos(carta.anexos ?? []);
      })
      .catch((falha) => setErro(mensagemDaFalha(falha)));
  }, [id]);

  const atualizarPrevia = useCallback(async () => {
    try {
      setPrevia(await apiPost<Previa>("/cartas/previa", { assunto: form.assunto, corpoHtml: form.corpoHtml }));
    } catch { /* a prévia é conveniência: falhar nela não atrapalha a edição */ }
  }, [form.assunto, form.corpoHtml]);

  // Espera o usuário parar de digitar: uma chamada por tecla seria um
  // pedido por caractere para o servidor.
  useEffect(() => {
    const t = setTimeout(() => void atualizarPrevia(), 400);
    return () => clearTimeout(t);
  }, [atualizarPrevia]);

  const desconhecidas = previa?.variaveisDesconhecidas ?? [];

  function inserirVariavel(chave: string) {
    const area = corpoRef.current;
    const marca = `{{${chave}}}`;
    if (!area) {
      setForm((atual) => ({ ...atual, corpoHtml: atual.corpoHtml + marca }));
      return;
    }
    const { selectionStart: ini, selectionEnd: fim, value } = area;
    const novo = value.slice(0, ini) + marca + value.slice(fim);
    setForm((atual) => ({ ...atual, corpoHtml: novo }));
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(ini + marca.length, ini + marca.length);
    });
  }

  async function salvar() {
    setSalvando(true); setErro(""); setRecado("");
    const corpo = { ...form, produtoId: form.produtoId || null };
    try {
      if (ehNova) {
        const { carta } = await apiPost<{ carta: Carta }>("/cartas", corpo);
        navegar(`/cartas/${carta.id}`, { replace: true });
      } else {
        await apiPut(`/cartas/${id}`, corpo);
        setRecado("Carta salva.");
      }
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setSalvando(false);
    }
  }

  async function anexar(arquivo: File) {
    setErro("");
    try {
      const { anexo } = await apiUpload<{ anexo: AnexoCarta }>(`/cartas/${id}/anexos`, arquivo);
      setAnexos((atual) => [...atual, anexo]);
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    }
  }

  const htmlDaPrevia = useMemo(() => previa?.corpoHtml ?? "", [previa]);

  return (
    <>
      <h1>{ehNova ? "Nova carta" : "Editar carta"}</h1>
      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}
      {recado ? <div className="aviso aviso-ok">{recado}</div> : null}
      {desconhecidas.length ? (
        <div className="aviso">
          Variável que não existe: {desconhecidas.map((v) => `{{${v}}}`).join(", ")} — vai sair como texto
          cru para quem receber. Confira a lista de variáveis abaixo do corpo.
        </div>
      ) : null}

      <div className="painel">
        <div className="grade">
          <div>
            <label className="rotulo" htmlFor="nome">Nome da carta</label>
            <input id="nome" className="campo" value={form.nome}
                   onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <p className="dica">Só aparece aqui no portal, para você achar depois.</p>
          </div>
          <div>
            <label className="rotulo" htmlFor="produto">Produto</label>
            <select id="produto" className="campo" value={form.produtoId}
                    onChange={(e) => setForm({ ...form, produtoId: e.target.value })}>
              <option value="">Geral (qualquer produto)</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="inteira">
            <label className="rotulo" htmlFor="assunto">Assunto do e-mail</label>
            <input id="assunto" className="campo" value={form.assunto}
                   onChange={(e) => setForm({ ...form, assunto: e.target.value })} />
          </div>
          <div className="inteira">
            <label className="rotulo" htmlFor="corpo">Corpo (HTML)</label>
            <textarea id="corpo" className="campo" ref={corpoRef} value={form.corpoHtml}
                      onChange={(e) => setForm({ ...form, corpoHtml: e.target.value })} />
            <div className="variaveis">
              {variaveis.map((v) => (
                <button key={v.chave} type="button" title={v.descricao} onClick={() => inserirVariavel(v.chave)}>
                  {`{{${v.chave}}}`}
                </button>
              ))}
            </div>
            <p className="dica">Clique numa variável para inseri-la onde o cursor está.</p>
          </div>
        </div>

        <div className="acoes">
          <button className="botao botao-primario" onClick={() => void salvar()} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          <button className="botao" onClick={() => navegar("/cartas")}>Voltar</button>
        </div>
      </div>

      {!ehNova ? (
        <div className="painel">
          <p className="secao-titulo">Anexos</p>
          {anexos.length === 0 ? <p className="dica">Nenhum anexo.</p> : (
            <table className="tabela">
              <tbody>
                {anexos.map((a) => (
                  <tr key={a.id}>
                    <td>{a.nomeArquivo}</td>
                    <td>{tamanho(a.tamanhoBytes)}</td>
                    <td>
                      <button className="link" onClick={() => {
                        void apiDelete(`/anexos/${a.id}`).then(() => setAnexos((x) => x.filter((y) => y.id !== a.id)));
                      }}>Remover</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="acoes">
            <input type="file" onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) void anexar(arquivo);
              e.target.value = "";
            }} />
          </div>
        </div>
      ) : null}

      <div className="painel">
        <p className="secao-titulo">Pré-visualização</p>
        <div className="previa">
          <div className="previa-cabecalho">
            <span><strong>Assunto:</strong> {previa?.assunto || form.assunto || "—"}</span>
            <span>Valores de exemplo — no disparo, cada destinatário recebe os dele.</span>
          </div>
          {/* O HTML é escrito por quem opera o portal (usuário autenticado),
              e os VALORES das variáveis já vêm escapados do servidor. */}
          <div dangerouslySetInnerHTML={{ __html: htmlDaPrevia }} />
        </div>
      </div>
    </>
  );
}
