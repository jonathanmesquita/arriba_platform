/* Servidor de e-mail.
   Duas coisas desta tela são regra, não layout:
   - o campo de senha começa SEMPRE vazio, mesmo com senha salva: vazio
     significa "mantém a atual", não "apaga";
   - dá para testar antes de salvar, com a senha digitada agora — gravar
     credencial que não funciona e descobrir no disparo é o pior caminho. */

import { useEffect, useState, type FormEvent } from "react";
import { apiGet, apiPost, apiPut } from "../api/client";
import { dataHora, mensagemDaFalha } from "../components/formato";
import type { ConfigSmtp } from "../components/tipos";

const VAZIO = {
  host: "", porta: 587, sslDireto: false, aceitarCertificadoInvalido: false,
  usuario: "", senha: "", remetenteEmail: "", remetenteNome: "",
  loteTamanho: 5, loteIntervaloMin: 1, anexoMaxMb: 10
};

export default function Smtp() {
  const [form, setForm] = useState({ ...VAZIO });
  const [salva, setSalva] = useState<ConfigSmtp | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [recado, setRecado] = useState("");
  const [testando, setTestando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    apiGet<{ config: ConfigSmtp | null }>("/config/smtp")
      .then(({ config }) => {
        setSalva(config);
        if (config) {
          setForm({
            host: config.host, porta: config.porta, sslDireto: config.sslDireto,
            aceitarCertificadoInvalido: config.aceitarCertificadoInvalido,
            usuario: config.usuario ?? "", senha: "",
            remetenteEmail: config.remetenteEmail, remetenteNome: config.remetenteNome,
            loteTamanho: config.loteTamanho, loteIntervaloMin: config.loteIntervaloMin,
            anexoMaxMb: config.anexoMaxMb
          });
        }
      })
      .catch((falha) => setErro(mensagemDaFalha(falha)))
      .finally(() => setCarregando(false));
  }, []);

  function corpo() {
    return { ...form, usuario: form.usuario.trim() || null, senha: form.senha.trim() || undefined };
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true); setErro(""); setRecado("");
    try {
      const { config } = await apiPut<{ config: ConfigSmtp }>("/config/smtp", corpo());
      setSalva(config);
      setForm((atual) => ({ ...atual, senha: "" }));
      setRecado("Configuração salva.");
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setSalvando(false);
    }
  }

  async function testar() {
    setTestando(true); setErro(""); setRecado("");
    try {
      const r = await apiPost<{ ok: boolean; mensagem: string }>("/config/smtp/testar", corpo());
      setRecado(r.mensagem);
    } catch (falha) {
      setErro(mensagemDaFalha(falha));
    } finally {
      setTestando(false);
    }
  }

  if (carregando) return <p className="carregando">Carregando…</p>;

  return (
    <>
      <h1>Servidor de e-mail</h1>
      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}
      {recado ? <div className="aviso aviso-ok">{recado}</div> : null}

      <form onSubmit={salvar}>
        <div className="painel">
          <p className="secao-titulo">Conexão</p>
          <div className="grade">
            <div>
              <label className="rotulo" htmlFor="host">Servidor (host)</label>
              <input id="host" className="campo" value={form.host} required
                     onChange={(e) => setForm({ ...form, host: e.target.value })} />
            </div>
            <div>
              <label className="rotulo" htmlFor="porta">Porta</label>
              <input id="porta" className="campo" type="number" min={1} max={65535} value={form.porta}
                     onChange={(e) => setForm({ ...form, porta: Number(e.target.value) })} />
            </div>

            <label className="inteira" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".9rem" }}>
              <input type="checkbox" checked={form.sslDireto}
                     onChange={(e) => setForm({ ...form, sslDireto: e.target.checked })} />
              Usar SSL direto (normalmente porta 465)
            </label>
            <p className="dica inteira" style={{ marginTop: -8 }}>
              Sem essa opção, a conexão sobe para TLS com STARTTLS — que é o que a porta 587 usa.
            </p>

            <label className="inteira" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".9rem" }}>
              <input type="checkbox" checked={form.aceitarCertificadoInvalido}
                     onChange={(e) => setForm({ ...form, aceitarCertificadoInvalido: e.target.checked })} />
              Aceitar certificado não confiável
            </label>
            <p className="dica inteira" style={{ marginTop: -8 }}>
              Use só com servidor interno de certificado próprio. Ligar isso num provedor comercial é
              desligar a verificação à toa.
            </p>

            <div>
              <label className="rotulo" htmlFor="usuario">Usuário</label>
              <input id="usuario" className="campo" value={form.usuario}
                     onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
            </div>
            <div>
              <label className="rotulo" htmlFor="senha">Senha</label>
              <input id="senha" className="campo" type="password" autoComplete="new-password"
                     placeholder={salva?.senhaSalva ? "•••••••• (salva)" : "Informe a senha"}
                     value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
              <p className="dica">Deixe em branco para manter a senha salva.</p>
            </div>
          </div>
        </div>

        <div className="painel">
          <p className="secao-titulo">Remetente</p>
          <div className="grade">
            <div>
              <label className="rotulo" htmlFor="remetenteEmail">E-mail do remetente</label>
              <input id="remetenteEmail" className="campo" type="email" required value={form.remetenteEmail}
                     onChange={(e) => setForm({ ...form, remetenteEmail: e.target.value })} />
            </div>
            <div>
              <label className="rotulo" htmlFor="remetenteNome">Nome exibido</label>
              <input id="remetenteNome" className="campo" required value={form.remetenteNome}
                     onChange={(e) => setForm({ ...form, remetenteNome: e.target.value })} />
            </div>
            <p className="dica inteira">
              Nos disparos este e-mail vai no campo "Para" e todos os destinatários em cópia oculta (CCO) —
              é o que impede um cliente de ver a lista dos outros.
            </p>
          </div>
        </div>

        <div className="painel">
          <p className="secao-titulo">Disparo em massa</p>
          <div className="grade">
            <div>
              <label className="rotulo" htmlFor="loteTamanho">Destinatários por lote</label>
              <input id="loteTamanho" className="campo" type="number" min={1} max={500} value={form.loteTamanho}
                     onChange={(e) => setForm({ ...form, loteTamanho: Number(e.target.value) })} />
            </div>
            <div>
              <label className="rotulo" htmlFor="loteIntervalo">Intervalo entre lotes (minutos)</label>
              <input id="loteIntervalo" className="campo" type="number" min={0} max={240} value={form.loteIntervaloMin}
                     onChange={(e) => setForm({ ...form, loteIntervaloMin: Number(e.target.value) })} />
            </div>
            <p className="dica inteira">
              Consulte o limite do seu provedor. Estourar o limite não atrasa o envio: bloqueia a conta
              no meio dele, com metade da lista avisada.
            </p>
            <div>
              <label className="rotulo" htmlFor="anexoMax">Tamanho máximo de anexo (MB)</label>
              <input id="anexoMax" className="campo" type="number" min={1} max={50} value={form.anexoMaxMb}
                     onChange={(e) => setForm({ ...form, anexoMaxMb: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        <div className="acoes">
          <button className="botao botao-primario" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          <button className="botao" type="button" onClick={() => void testar()} disabled={testando}>
            {testando ? "Testando…" : "Testar conexão"}
          </button>
          {salva?.ultimoTesteEm ? (
            <span className={`pilula ${salva.ultimoTesteOk ? "pilula-ok" : "pilula-erro"}`}>
              último teste: {dataHora(salva.ultimoTesteEm)}
            </span>
          ) : null}
        </div>
        {salva?.ultimoTesteMensagem ? <p className="dica">{salva.ultimoTesteMensagem}</p> : null}
      </form>
    </>
  );
}
