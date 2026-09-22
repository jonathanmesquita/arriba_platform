/* =====================================================================
   Tela de chat

   Três decisões que valem explicar, porque não se descobre lendo o JSX:

   1. ROLAGEM AUTOMÁTICA SÓ QUANDO JÁ ESTÁ NO FIM. Se a pessoa subiu para
      reler algo enquanto a resposta chega, rolar para baixo a cada pedaço
      rouba a leitura dela. Guardamos se estava colada no fim ANTES do
      texto crescer e só então acompanhamos.

   2. O TEXTO QUE ESTÁ CHEGANDO NÃO É ESTADO DE REACT A CADA LETRA.
      Um setState por token faria a árvore inteira re-renderizar dezenas
      de vezes por segundo. O texto vai para um ref e a tela é atualizada
      em ritmo de quadro (requestAnimationFrame) — fica igual na tela e
      muito mais barato.

   3. CANCELAR É ABORTAR A REQUISIÇÃO, não só parar de mostrar. O servidor
      escuta o fechamento da conexão, interrompe o provedor e grava o que
      já tinha vindo — o que evita pagar por texto que ninguém vai ler.
   ===================================================================== */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { apiDelete, apiGet, apiPost, abrirStreamDeMensagem } from "../api/client";
import { formatarHora, formatarLatencia, mensagemDaFalha } from "../components/formato";
import Fontes from "../components/Fontes";
import type { ConversaCompleta, FonteCitada, MensagemSalva, ResumoConversa } from "../components/tipos";

interface RespostaLista { conversations: ResumoConversa[] }
interface RespostaConversa { conversation: ConversaCompleta }

export default function Chat() {
  const [conversas, setConversas] = useState<ResumoConversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemSalva[]>([]);
  const [rascunho, setRascunho] = useState("");
  const [respondendo, setRespondendo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [origem, setOrigem] = useState<{ provider: string; model: string } | null>(null);
  // Fontes da resposta que está chegando. Ficam separadas das mensagens
  // porque aparecem no `meta` (antes do primeiro token) e só viram parte
  // da mensagem quando o `done` chega.
  const [fontesEmCurso, setFontesEmCurso] = useState<FonteCitada[]>([]);
  const [erroTela, setErroTela] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [lateralAberta, setLateralAberta] = useState(false);

  const areaRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textoRef = useRef("");
  const quadroRef = useRef<number | null>(null);
  // Mesmas fontes do estado acima, em ref: os handlers do stream são
  // criados uma vez e leriam o estado de quando o envio começou (vazio).
  const fontesRef = useRef<FonteCitada[]>([]);

  /* ------------------------ rolagem ------------------------ */

  const estaNoFim = useCallback(() => {
    const area = areaRef.current;
    if (!area) return true;
    // 48px de tolerância: "quase no fim" conta como no fim.
    return area.scrollHeight - area.scrollTop - area.clientHeight < 48;
  }, []);

  const rolarSeEstavaNoFim = useCallback((estava: boolean) => {
    if (!estava) return;
    requestAnimationFrame(() => {
      const area = areaRef.current;
      if (area) area.scrollTop = area.scrollHeight;
    });
  }, []);

  /* ------------------------ carga ------------------------ */

  const carregarConversas = useCallback(async () => {
    try {
      const dados = await apiGet<RespostaLista>("/chat/conversations");
      setConversas(dados.conversations ?? []);
      return dados.conversations ?? [];
    } catch (falha) {
      setErroTela(mensagemDaFalha(falha));
      return [];
    }
  }, []);

  const abrirConversa = useCallback(async (id: string) => {
    setConversaAtiva(id);
    setLateralAberta(false);
    setParcial("");
    setOrigem(null);
    setFontesEmCurso([]);
    try {
      const dados = await apiGet<RespostaConversa>(`/chat/conversations/${encodeURIComponent(id)}`);
      setMensagens(dados.conversation?.messages ?? []);
      rolarSeEstavaNoFim(true);
    } catch (falha) {
      setErroTela(mensagemDaFalha(falha));
      setMensagens([]);
    }
  }, [rolarSeEstavaNoFim]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const lista = await carregarConversas();
      if (!vivo) return;
      const primeira = lista[0];
      if (primeira) await abrirConversa(primeira.id);
      if (vivo) setCarregando(false);
    })();
    return () => {
      vivo = false;
      abortRef.current?.abort();
      if (quadroRef.current !== null) cancelAnimationFrame(quadroRef.current);
    };
  }, [carregarConversas, abrirConversa]);

  /* ------------------------ ações ------------------------ */

  async function novaConversa() {
    try {
      const dados = await apiPost<RespostaConversa>("/chat/conversations");
      const criada = dados.conversation;
      setConversas((atual) => [{ ...criada, totalMensagens: 0 }, ...atual]);
      setConversaAtiva(criada.id);
      setMensagens([]);
      setParcial("");
      setOrigem(null);
      setFontesEmCurso([]);
      setLateralAberta(false);
    } catch (falha) {
      setErroTela(mensagemDaFalha(falha));
    }
  }

  async function apagarConversa(id: string) {
    if (!confirm("Apagar esta conversa? O histórico dela não volta.")) return;
    try {
      await apiDelete(`/chat/conversations/${encodeURIComponent(id)}`);
      setConversas((atual) => atual.filter((c) => c.id !== id));
      if (conversaAtiva === id) {
        setConversaAtiva(null);
        setMensagens([]);
      }
    } catch (falha) {
      setErroTela(mensagemDaFalha(falha));
    }
  }

  function pararResposta() {
    abortRef.current?.abort();
  }

  async function enviar() {
    const texto = rascunho.trim();
    if (!texto || respondendo) return;

    let alvo = conversaAtiva;
    if (!alvo) {
      try {
        const dados = await apiPost<RespostaConversa>("/chat/conversations");
        alvo = dados.conversation.id;
        setConversaAtiva(alvo);
        setConversas((atual) => [{ ...dados.conversation, totalMensagens: 0 }, ...atual]);
      } catch (falha) {
        setErroTela(mensagemDaFalha(falha));
        return;
      }
    }

    const agora = new Date().toISOString();
    const minha: MensagemSalva = { id: `local-${agora}`, role: "USER", content: texto, createdAt: agora };
    const estava = estaNoFim();
    setMensagens((atual) => [...atual, minha]);
    setRascunho("");
    setErroTela("");
    setRespondendo(true);
    setParcial("");
    setOrigem(null);
    setFontesEmCurso([]);
    textoRef.current = "";
    rolarSeEstavaNoFim(estava);

    const controlador = new AbortController();
    abortRef.current = controlador;

    // Atualiza a tela em ritmo de quadro em vez de a cada token (ver
    // comentário 2 no topo).
    const agendarPintura = () => {
      if (quadroRef.current !== null) return;
      quadroRef.current = requestAnimationFrame(() => {
        quadroRef.current = null;
        const colado = estaNoFim();
        setParcial(textoRef.current);
        rolarSeEstavaNoFim(colado);
      });
    };

    try {
      await abrirStreamDeMensagem(
        alvo,
        texto,
        {
          meta: (dados) => {
            setOrigem({ provider: dados.providerLabel || dados.provider, model: dados.model });
            const fontes = dados.fontes ?? [];
            fontesRef.current = fontes;
            setFontesEmCurso(fontes);
          },
          delta: (pedaco) => { textoRef.current += pedaco; agendarPintura(); },
          done: (fim) => {
            const completa: MensagemSalva = {
              id: fim.messageId,
              role: "ASSISTANT",
              content: textoRef.current,
              provider: (fim.provider as MensagemSalva["provider"]) ?? null,
              model: fim.model ?? null,
              promptTokens: fim.usage?.promptTokens ?? null,
              completionTokens: fim.usage?.completionTokens ?? null,
              latencyMs: fim.latencyMs ?? null,
              knowledgeUsed: fontesRef.current.length ? fontesRef.current : null,
              createdAt: fim.createdAt ?? new Date().toISOString()
            };
            setMensagens((atual) => [...atual, completa]);
            setParcial("");
            textoRef.current = "";
            fontesRef.current = [];
            setFontesEmCurso([]);
          },
          error: (falha) => {
            // O texto que chegou antes do erro não se perde: vira uma
            // mensagem com o aviso junto, como o servidor gravou.
            const parcialTexto = textoRef.current;
            setMensagens((atual) => [
              ...atual,
              {
                id: falha.messageId || `erro-${Date.now()}`,
                role: "ASSISTANT",
                content: parcialTexto,
                errorCode: falha.code,
                errorMessage: falha.message,
                // O trecho que chegou antes da falha saiu das mesmas
                // fontes: mantê-las ajuda a conferir o que foi dito.
                knowledgeUsed: fontesRef.current.length ? fontesRef.current : null,
                createdAt: new Date().toISOString()
              }
            ]);
            setParcial("");
            textoRef.current = "";
            fontesRef.current = [];
            setFontesEmCurso([]);
          }
        },
        controlador.signal
      );
    } catch (falha) {
      setErroTela(mensagemDaFalha(falha));
      setParcial("");
    } finally {
      setRespondendo(false);
      abortRef.current = null;
      if (quadroRef.current !== null) { cancelAnimationFrame(quadroRef.current); quadroRef.current = null; }
      carregarConversas();
    }
  }

  function aoTeclar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia; Shift+Enter quebra linha — a convenção que todo mundo
    // já tem na mão de outros chats.
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      enviar();
    }
  }

  /* ------------------------ render ------------------------ */

  return (
    <div className="chat">
      <aside className={`chat-lateral${lateralAberta ? " aberta" : ""}`}>
        <div className="chat-lateral-topo">
          <button className="botao botao-primario" onClick={novaConversa} style={{ width: "100%", justifyContent: "center" }}>
            + Nova conversa
          </button>
        </div>
        <div className="chat-lista">
          {conversas.length === 0 && !carregando ? (
            <p className="dica" style={{ padding: "8px 10px" }}>Nenhuma conversa ainda.</p>
          ) : null}
          {conversas.map((conversa) => (
            <div
              key={conversa.id}
              className={`conversa-item${conversa.id === conversaAtiva ? " ativa" : ""}`}
              onClick={() => abrirConversa(conversa.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") abrirConversa(conversa.id); }}
            >
              <span>
                <span className="conversa-titulo">{conversa.title}</span>
                <br />
                <span className="conversa-data">{formatarHora(conversa.updatedAt)} · {conversa.totalMensagens} msg</span>
              </span>
              <button
                className="conversa-apagar"
                title="Apagar conversa"
                onClick={(e) => { e.stopPropagation(); apagarConversa(conversa.id); }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="chat-principal">
        <div className="chat-mensagens" ref={areaRef}>
          {carregando ? <p className="carregando">Carregando…</p> : null}

          {!carregando && mensagens.length === 0 && !parcial ? (
            <div className="chat-vazio">
              <h2>Em que posso ajudar?</h2>
              <p>Pergunte sobre rotinas, erros e procedimentos. As conversas ficam salvas na sua conta.</p>
            </div>
          ) : null}

          {mensagens.map((mensagem) => {
            const ehErro = Boolean(mensagem.errorCode);
            const classe = mensagem.role === "USER" ? "bolha-usuario" : ehErro ? "bolha-erro" : "bolha-assistente";
            return (
              <div key={mensagem.id} className={`bolha ${classe}`}>
                {mensagem.content}
                {ehErro ? (
                  <>
                    {mensagem.content ? <br /> : null}
                    <strong>{mensagem.errorMessage}</strong>
                  </>
                ) : null}
                {mensagem.role !== "USER" && mensagem.knowledgeUsed?.length ? (
                  <Fontes fontes={mensagem.knowledgeUsed} />
                ) : null}
                <div className="bolha-rodape">
                  <span>{formatarHora(mensagem.createdAt)}</span>
                  {mensagem.model ? <span>{mensagem.model}</span> : null}
                  {mensagem.latencyMs ? <span>{formatarLatencia(mensagem.latencyMs)}</span> : null}
                  {mensagem.completionTokens ? <span>{mensagem.completionTokens} tokens</span> : null}
                </div>
              </div>
            );
          })}

          {parcial || respondendo ? (
            <div className="bolha bolha-assistente">
              {parcial}
              <span className="cursor-digitando" aria-hidden="true" />
              {/* As fontes aparecem já no meta, antes do texto: dá para
                  conferir a origem enquanto a resposta ainda escreve. */}
              {fontesEmCurso.length ? <Fontes fontes={fontesEmCurso} /> : null}
              {origem ? <div className="bolha-rodape"><span>{origem.provider} · {origem.model}</span></div> : null}
            </div>
          ) : null}
        </div>

        {erroTela ? <div className="aviso aviso-erro" style={{ margin: "0 22px" }}>{erroTela}</div> : null}

        <div className="chat-envio">
          <div className="chat-envio-linha">
            <textarea
              className="campo"
              rows={2}
              placeholder="Escreva sua pergunta…  (Enter envia, Shift+Enter quebra linha)"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={aoTeclar}
              disabled={respondendo}
            />
            {respondendo ? (
              <button className="botao botao-perigo" onClick={pararResposta}>Parar</button>
            ) : (
              <button className="botao botao-primario" onClick={enviar} disabled={!rascunho.trim()}>Enviar</button>
            )}
          </div>
          <p className="chat-aviso-privacidade">
            O texto desta conversa é enviado ao provedor de IA configurado pelo administrador.
            Não cole CPF, nome completo, telefone ou endereço de cliente.
          </p>
        </div>
      </section>
    </div>
  );
}
