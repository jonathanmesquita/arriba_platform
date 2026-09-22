/* =====================================================================
   Painel de administração

   Três coisas desta tela são regra de segurança, não escolha de layout:

   1. A API KEY NUNCA É CARREGADA. O servidor não devolve nem a versão
      cifrada — só `apiKeyConfigurada` e os 4 últimos dígitos. Por isso o
      campo de chave começa sempre vazio, mesmo editando uma configuração
      existente: vazio significa "mantém a que está lá", e não "apaga".

   2. TEMPERATURE SOME QUANDO O MODELO NÃO ACEITA. Os modelos de
      raciocínio atuais da Anthropic devolvem HTTP 400 se o campo vier.
      O catálogo do servidor diz quais aceitam; aqui o campo é desabilitado
      com a explicação, em vez de deixar o usuário configurar algo que vai
      quebrar só na primeira mensagem do chat.

   3. TESTAR ANTES DE SALVAR. O botão usa /providers/test-draft quando a
      configuração ainda não existe — é o pedido de "validar se a API key
      funciona antes de salvar", e evita gravar credencial que não serve.
   ===================================================================== */

import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../api/client";
import { formatarDataHora, formatarLatencia, mensagemDaFalha } from "../components/formato";
import type {
  Catalogo, ConfigPublica, ItemAuditoria, PaginaAuditoria,
  ProviderKind, RespostaTeste, UsuarioAdmin
} from "../components/tipos";

type Aba = "provedores" | "auditoria" | "usuarios";

const VAZIO = {
  provider: "ANTHROPIC" as ProviderKind,
  label: "",
  model: "",
  apiKey: "",
  baseUrl: "",
  temperature: "",
  maxTokens: "",
  systemPrompt: ""
};

export default function Admin() {
  const [aba, setAba] = useState<Aba>("provedores");
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [configs, setConfigs] = useState<ConfigPublica[]>([]);
  const [erro, setErro] = useState("");
  const [recado, setRecado] = useState("");
  const [carregando, setCarregando] = useState(true);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VAZIO });
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<RespostaTeste | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [cat, lista] = await Promise.all([
        apiGet<Catalogo>("/admin/catalog"),
        apiGet<{ configs: ConfigPublica[] }>("/admin/providers")
      ]);
      setCatalogo(cat);
      setConfigs(lista.configs ?? []);
      setErro("");
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const infoProvedor = catalogo?.provedores?.[form.provider];
  const modeloEscolhido = infoProvedor?.modelos.find((m) => m.id === form.model);
  // Modelo fora da lista: não dá para afirmar que recusa temperature,
  // então liberamos o campo (o servidor decide na hora da chamada).
  const aceitaTemperature = modeloEscolhido ? modeloEscolhido.supportsTemperature : true;

  function editar(config: ConfigPublica) {
    setEditandoId(config.id);
    setResultadoTeste(null);
    setForm({
      provider: config.provider,
      label: config.label,
      model: config.model,
      apiKey: "", // nunca pré-preenchido: ver comentário 1 no topo
      baseUrl: config.baseUrl ?? "",
      temperature: config.temperature === null ? "" : String(config.temperature),
      maxTokens: config.maxTokens === null ? "" : String(config.maxTokens),
      systemPrompt: config.systemPrompt ?? ""
    });
  }

  function novo() {
    setEditandoId(null);
    setResultadoTeste(null);
    setForm({ ...VAZIO, systemPrompt: catalogo?.systemPromptPadrao ?? "" });
  }

  function corpoDoForm() {
    const corpo: Record<string, unknown> = {
      provider: form.provider,
      label: form.label.trim(),
      model: form.model.trim(),
      baseUrl: form.baseUrl.trim() || null,
      maxTokens: form.maxTokens ? Number(form.maxTokens) : null,
      systemPrompt: form.systemPrompt.trim() || null,
      temperature: aceitaTemperature && form.temperature !== "" ? Number(form.temperature) : null
    };
    // Chave vazia na edição = manter a atual. Na criação, o servidor
    // cobra quando o provedor exige.
    if (form.apiKey.trim()) corpo["apiKey"] = form.apiKey.trim();
    return corpo;
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    setRecado("");
    try {
      if (editandoId) {
        await apiPatch(`/admin/providers/${editandoId}`, corpoDoForm());
        setRecado("Configuração atualizada.");
      } else {
        await apiPost("/admin/providers", corpoDoForm());
        setRecado("Configuração criada.");
      }
      setEditandoId(null);
      setForm({ ...VAZIO });
      await carregar();
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setSalvando(false);
    }
  }

  async function testar() {
    setTestando(true);
    setResultadoTeste(null);
    setErro("");
    try {
      const resposta = editandoId
        ? await apiPost<RespostaTeste>(`/admin/providers/${editandoId}/test`)
        : await apiPost<RespostaTeste>("/admin/providers/test-draft", corpoDoForm());
      setResultadoTeste(resposta);
      if (editandoId) await carregar();
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setTestando(false);
    }
  }

  async function ativar(id: string) {
    try {
      await apiPost(`/admin/providers/${id}/activate`);
      setRecado("Provedor ativado. O chat passa a usar esta configuração.");
      await carregar();
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta configuração? O histórico das conversas é preservado.")) return;
    try {
      await apiDelete(`/admin/providers/${id}`);
      setRecado("Configuração excluída.");
      if (editandoId === id) { setEditandoId(null); setForm({ ...VAZIO }); }
      await carregar();
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    }
  }

  return (
    <div className="admin">
      <h1>Administração</h1>

      <div className="abas">
        <button className={`aba${aba === "provedores" ? " ativa" : ""}`} onClick={() => setAba("provedores")}>Provedores</button>
        <button className={`aba${aba === "auditoria" ? " ativa" : ""}`} onClick={() => setAba("auditoria")}>Auditoria</button>
        <button className={`aba${aba === "usuarios" ? " ativa" : ""}`} onClick={() => setAba("usuarios")}>Usuários</button>
      </div>

      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}
      {recado ? <div className="aviso aviso-ok">{recado}</div> : null}

      {aba === "provedores" ? (
        <>
          <div className="tabela-envolta">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Provedor</th><th>Identificação</th><th>Modelo</th><th>Chave</th>
                  <th>Estado</th><th>Último teste</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan={7} className="carregando">Carregando…</td></tr>
                ) : configs.length === 0 ? (
                  <tr><td colSpan={7} className="carregando">Nenhum provedor configurado. O chat só funciona depois que houver um ativo.</td></tr>
                ) : configs.map((config) => (
                  <tr key={config.id}>
                    <td>{catalogo?.provedores?.[config.provider]?.label ?? config.provider}</td>
                    <td>{config.label}</td>
                    <td>{config.model}</td>
                    <td>{config.apiKeyConfigurada ? `•••• ${config.apiKeyLast4 ?? ""}` : <span className="pilula">sem chave</span>}</td>
                    <td>
                      {config.isActive ? <span className="pilula pilula-ok">ativo</span> : null}
                      {!config.isEnabled ? <span className="pilula pilula-alerta">desabilitado</span> : null}
                      {!config.isActive && config.isEnabled ? <span className="pilula">inativo</span> : null}
                    </td>
                    <td>
                      {config.lastTestAt ? (
                        <>
                          <span className={`pilula ${config.lastTestOk ? "pilula-ok" : "pilula-erro"}`}>
                            {config.lastTestOk ? "ok" : "falhou"}
                          </span>{" "}
                          {formatarDataHora(config.lastTestAt)}
                        </>
                      ) : "—"}
                    </td>
                    <td>
                      <div className="celula-acoes">
                        {!config.isActive ? <button className="botao" onClick={() => ativar(config.id)}>Ativar</button> : null}
                        <button className="botao" onClick={() => editar(config)}>Editar</button>
                        <button className="botao botao-perigo" onClick={() => excluir(config.id)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="cartao">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem" }}>
                {editandoId ? "Editar configuração" : "Nova configuração"}
              </h2>
              <button className="botao botao-discreto" onClick={novo} style={{ marginLeft: "auto" }}>Limpar</button>
            </div>

            <div className="grade-form">
              <div>
                <label className="rotulo" htmlFor="provider">Provedor</label>
                <select
                  id="provider"
                  className="campo"
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value as ProviderKind, model: "" })}
                >
                  {Object.values(catalogo?.provedores ?? {}).map((info) =>
                    info ? <option key={info.kind} value={info.kind}>{info.label}</option> : null
                  )}
                </select>
                {infoProvedor ? <p className="dica">{infoProvedor.descricao}</p> : null}
              </div>

              <div>
                <label className="rotulo" htmlFor="label">Identificação</label>
                <input id="label" className="campo" value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="ex: Claude produção" />
              </div>

              <div>
                <label className="rotulo" htmlFor="model">Modelo</label>
                <input
                  id="model" className="campo" list="modelos-sugeridos" value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="escolha ou digite o id do modelo"
                />
                <datalist id="modelos-sugeridos">
                  {infoProvedor?.modelos.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </datalist>
                <p className="dica">
                  {modeloEscolhido?.nota ?? "Aceita qualquer id que a sua conta tenha — a lista é só sugestão."}
                </p>
              </div>

              <div>
                <label className="rotulo" htmlFor="apiKey">
                  API key {editandoId && configs.find((c) => c.id === editandoId)?.apiKeyConfigurada ? "(configurada)" : ""}
                </label>
                <input
                  id="apiKey" className="campo" type="password" autoComplete="off" value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editandoId ? "deixe em branco para manter a atual" : infoProvedor?.requerApiKey ? "obrigatória" : "não usa chave"}
                  disabled={!infoProvedor?.requerApiKey}
                />
                {infoProvedor?.ondeObterChave ? <p className="dica">Onde obter: {infoProvedor.ondeObterChave}</p> : null}
              </div>

              {infoProvedor?.requerBaseUrl ? (
                <div>
                  <label className="rotulo" htmlFor="baseUrl">Endereço do serviço</label>
                  <input id="baseUrl" className="campo" value={form.baseUrl}
                    onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                    placeholder={infoProvedor.baseUrlPadrao ?? ""} />
                </div>
              ) : null}

              <div>
                <label className="rotulo" htmlFor="temperature">Temperature</label>
                <input
                  id="temperature" className="campo" type="number" min="0" max="2" step="0.1"
                  value={aceitaTemperature ? form.temperature : ""}
                  onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                  placeholder={String(catalogo?.temperaturaPadrao ?? 0.2)}
                  disabled={!aceitaTemperature}
                />
                <p className="dica">
                  {aceitaTemperature
                    ? "Baixa (0,1–0,2) para resposta previsível; alta inventa mais."
                    : "Este modelo recusa o parâmetro (HTTP 400), então o sistema não envia."}
                </p>
              </div>

              <div>
                <label className="rotulo" htmlFor="maxTokens">Máximo de tokens na resposta</label>
                <input id="maxTokens" className="campo" type="number" min="256" step="256"
                  value={form.maxTokens}
                  onChange={(e) => setForm({ ...form, maxTokens: e.target.value })}
                  placeholder={String(catalogo?.maxTokensPadrao ?? 4096)} />
              </div>

              <div className="coluna-inteira">
                <label className="rotulo" htmlFor="systemPrompt">Instrução de sistema</label>
                <textarea id="systemPrompt" className="campo" rows={7} value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} />
                <p className="dica">
                  Persona + regras numeradas funcionam melhor que um parágrafo solto. Vale lembrar que,
                  em conversa longa, o modelo dá menos atenção ao que ficou no começo.
                </p>
              </div>
            </div>

            {resultadoTeste ? (
              <div className={`aviso ${resultadoTeste.ok ? "aviso-ok" : "aviso-erro"}`} style={{ marginTop: 14 }}>
                <strong>{resultadoTeste.ok ? "Conexão OK" : "Falhou"}</strong> — {resultadoTeste.message}
                {resultadoTeste.latencyMs !== undefined ? ` (${formatarLatencia(resultadoTeste.latencyMs)})` : ""}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button className="botao botao-primario" onClick={salvar} disabled={salvando || !form.label || !form.model}>
                {salvando ? "Salvando…" : editandoId ? "Salvar alterações" : "Criar configuração"}
              </button>
              <button className="botao" onClick={testar} disabled={testando || !form.model}>
                {testando ? "Testando…" : "Testar conexão"}
              </button>
            </div>
          </section>
        </>
      ) : null}

      {aba === "auditoria" ? <Auditoria /> : null}
      {aba === "usuarios" ? <Usuarios /> : null}
    </div>
  );
}

/* ------------------------------ auditoria ------------------------------ */

function Auditoria() {
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<PaginaAuditoria | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    apiGet<PaginaAuditoria>(`/admin/audit?page=${pagina}&pageSize=25`)
      .then(setDados)
      .catch((falha) => setErro(mensagemDaFalha(falha)));
  }, [pagina]);

  if (erro) return <div className="aviso aviso-erro">{erro}</div>;
  if (!dados) return <p className="carregando">Carregando…</p>;

  const itens: ItemAuditoria[] = dados.items ?? [];

  return (
    <>
      <div className="tabela-envolta">
        <table className="tabela">
          <thead>
            <tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Provedor / modelo</th><th>Resultado</th></tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr><td colSpan={5} className="carregando">Nada registrado ainda.</td></tr>
            ) : itens.map((item) => (
              <tr key={item.id}>
                <td>{formatarDataHora(item.createdAt)}</td>
                <td>{item.user?.name ?? item.user?.email ?? "—"}</td>
                <td><code>{item.action}</code></td>
                <td>{item.provider ? `${item.provider}${item.model ? ` · ${item.model}` : ""}` : "—"}</td>
                <td>
                  <span className={`pilula ${item.success ? "pilula-ok" : "pilula-erro"}`}>
                    {item.success ? "ok" : "falha"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="paginacao">
        <button className="botao" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
        <span>Página {dados.page} de {dados.totalPages || 1} · {dados.total} registros</span>
        <button className="botao" disabled={pagina >= (dados.totalPages || 1)} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
      </div>
    </>
  );
}

/* ------------------------------- usuários ------------------------------ */

function Usuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "USER" });
  const [erro, setErro] = useState("");
  const [recado, setRecado] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    apiGet<{ users: UsuarioAdmin[] }>("/admin/users")
      .then((d) => setUsuarios(d.users ?? []))
      .catch((falha) => setErro(mensagemDaFalha(falha)));
  }, []);

  useEffect(carregar, [carregar]);

  async function criar() {
    setSalvando(true);
    setErro("");
    setRecado("");
    try {
      await apiPost("/admin/users", form);
      setRecado(`Usuário ${form.email} criado.`);
      setForm({ name: "", email: "", password: "", role: "USER" });
      carregar();
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}
      {recado ? <div className="aviso aviso-ok">{recado}</div> : null}

      <div className="tabela-envolta">
        <table className="tabela">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Último acesso</th></tr></thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr><td colSpan={4} className="carregando">Nenhum usuário.</td></tr>
            ) : usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td>{usuario.name}</td>
                <td>{usuario.email}</td>
                <td><span className={`pilula${usuario.role === "ADMIN" ? " pilula-alerta" : ""}`}>{usuario.role}</span></td>
                <td>{formatarDataHora(usuario.lastLoginAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="cartao">
        <h2 style={{ margin: "0 0 14px", fontSize: "1.05rem" }}>Novo usuário</h2>
        <div className="grade-form">
          <div>
            <label className="rotulo" htmlFor="u-nome">Nome</label>
            <input id="u-nome" className="campo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="rotulo" htmlFor="u-email">E-mail</label>
            <input id="u-email" className="campo" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="rotulo" htmlFor="u-senha">Senha provisória</label>
            <input id="u-senha" className="campo" type="password" autoComplete="new-password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="dica">Mínimo de 12 caracteres.</p>
          </div>
          <div>
            <label className="rotulo" htmlFor="u-papel">Papel</label>
            <select id="u-papel" className="campo" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="USER">Usuário comum</option>
              <option value="ADMIN">Administrador</option>
            </select>
            <p className="dica">Administrador enxerga e altera esta tela inteira.</p>
          </div>
        </div>
        <button className="botao botao-primario" onClick={criar} style={{ marginTop: 16 }}
          disabled={salvando || !form.email || !form.password || !form.name}>
          {salvando ? "Criando…" : "Criar usuário"}
        </button>
      </section>
    </>
  );
}
