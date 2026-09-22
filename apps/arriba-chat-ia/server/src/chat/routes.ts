/* =====================================================================
   Rotas do chat: conversas e envio de mensagem (com streaming SSE)

   Duas coisas estruturam este arquivo.

   1. TODA consulta filtra por `userId`. O id que vem na URL é palpite de
      quem chamou; sem o dono na cláusula, qualquer usuário autenticado
      leria (ou apagaria) a conversa de outro só trocando o cuid. Por
      isso não existe `findUnique({ where: { id } })` aqui — é sempre
      `findFirst({ where: { id, userId } })`, e "não é sua" responde 404,
      não 403: 403 confirmaria que aquele id existe.

   2. A resposta do modelo sai por SSE (Server-Sent Events), não por JSON
      no final. É o que faz o texto aparecer aos poucos, e o motivo não é
      só estética: uma resposta longa leva dezenas de segundos, e uma
      requisição calada nesse tempo é candidata a morrer em timeout de
      proxy. Escolhemos SSE em vez de WebSocket porque o tráfego é de mão
      única (servidor -> navegador) e SSE é HTTP comum — atravessa proxy
      corporativo e reconecta sozinho, sem protocolo novo.

      Quatro eventos, e só eles:
        meta   -> { provider, model, ... }  quem vai responder
        delta  -> { text }                  pedaço de texto
        done   -> { messageId, usage, ... } terminou, id para salvar
        error  -> { code, message, ... }    falhou (payload de USUÁRIO)

   Ponto delicado: depois do primeiro byte enviado não dá mais para
   trocar status HTTP nem devolver JSON de erro (o middleware de erro
   respeita `res.headersSent`). Então tudo que pode falhar com resposta
   normal — validação, conversa inexistente, provedor não configurado,
   credencial ilegível — acontece ANTES de abrir o stream.
   ===================================================================== */

import { Router, type Response } from "express";
import { z } from "zod";

import { prisma } from "../db.js";
import type { Env } from "../env.js";
import type { SecretBox } from "../crypto/secretBox.js";
import { AppError, asyncHandler } from "../http/errors.js";
import { criarRequireAuth, usuarioDaRequisicao } from "../auth/middleware.js";
import { ipDaRequisicao, registrarAuditoria } from "../audit/log.js";
import { resolverProvedor } from "../providers/registry.js";
import { SYSTEM_PROMPT_PADRAO } from "../providers/catalog.js";
import { comoProviderError, ProviderError } from "../providers/errors.js";
import type { CompletionUsage, ProviderKind as ProviderKindDoContrato } from "../providers/types.js";
import { conversaDoUsuario, montarHistorico, obterProvedorAtivo, tituloDaConversa } from "./service.js";
import { buscarTrechos } from "../knowledge/search.js";
import { comContexto, montarContexto, type ContextoMontado } from "../knowledge/context.js";
import { configuracaoDaBase } from "../knowledge/settings.js";

/** Teto do que uma mensagem pode ter. Não é regra de negócio: é para o
 *  servidor não gastar memória e tokens com um colar acidental de
 *  arquivo inteiro. Acima disso o provedor devolveria CONTEXT_LENGTH de
 *  qualquer jeito, e mais caro. */
const TAMANHO_MAXIMO_MENSAGEM = 32_000;

/** De quanto em quanto tempo mandar um comentário SSE enquanto o modelo
 *  ainda está "pensando". Proxy e load balancer derrubam conexão ociosa
 *  (o padrão costuma ser 30-60 s), e modelo de raciocínio passa fácil
 *  desse tempo antes do primeiro token. Linha iniciada por ":" é
 *  comentário no protocolo SSE: mantém o cano vivo sem virar evento. */
const INTERVALO_KEEPALIVE_MS = 15_000;

const esquemaNovaConversa = z.object({
  title: z.string().trim().min(1).max(120).optional()
});

const esquemaMensagem = z.object({
  content: z
    .string({ message: "Informe o conteúdo da mensagem." })
    .trim()
    .min(1, "A mensagem não pode ficar vazia.")
    .max(TAMANHO_MAXIMO_MENSAGEM, `A mensagem passou de ${TAMANHO_MAXIMO_MENSAGEM} caracteres. Divida em partes menores.`)
});

/** O `:id` da rota.
 *
 *  Dois detalhes de tipo que viram bug se forem ignorados: com
 *  `noUncheckedIndexedAccess` o acesso ao dicionário devolve
 *  `undefined` junto, e o tipo de parâmetro do Express 5 admite
 *  `string[]` (rota com o mesmo nome repetido). Nos dois casos o
 *  caminho é virar 404 ou pegar o primeiro valor — nunca deixar
 *  `undefined`/array chegar na cláusula `where` da consulta. */
function idDaRota(valor: string | string[] | undefined): string {
  const id = Array.isArray(valor) ? valor[0] : valor;
  if (!id) throw AppError.naoEncontrado("Conversa não encontrada.");
  return id;
}

/** As fontes vão para uma coluna Json. O tipo de entrada do Prisma exige
 *  estrutura com index signature, que uma interface nomeada não tem — e
 *  `as any` aqui esconderia um erro real no dia em que o formato mudar.
 *  Converter para objeto simples mantém a checagem de verdade. */
function fontesParaJson(fontes: ContextoMontado["fontes"]) {
  if (fontes.length === 0) return undefined;
  return fontes.map((f) => ({
    numero: f.numero,
    id: f.id,
    title: f.title,
    url: f.url,
    source: f.source
  }));
}

function enviarEvento(res: Response, evento: string, dados: unknown): void {
  // Depois que o cliente sumiu, escrever é no-op no Node — mas conferir
  // deixa o fluxo explícito e evita empilhar buffer à toa.
  if (res.writableEnded) return;
  res.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`);
}

function abrirStream(res: Response): void {
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // nginx (e o proxy do Render) fazem buffer da resposta por padrão:
    // sem este cabeçalho o "streaming" chega todo de uma vez no fim, que
    // é justamente o que se quer evitar.
    "X-Accel-Buffering": "no"
  });
  res.flushHeaders();
  // Sem Nagle: pedaço pequeno de texto deve sair na hora, não esperar
  // encher um pacote.
  res.socket?.setNoDelay(true);
}

export function criarChatRouter(env: Env, secretBox: SecretBox): Router {
  const router = Router();
  const requireAuth = criarRequireAuth(env);

  /* ---------------------------------------------------------------
     Lista de conversas do usuário logado
     --------------------------------------------------------------- */
  router.get(
    "/chat/conversations",
    requireAuth,
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);

      const conversas = await prisma.conversation.findMany({
        where: { userId: usuario.id },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          // Contagem no banco em vez de carregar as mensagens só para
          // medir o tamanho da lista.
          _count: { select: { messages: true } }
        }
      });

      res.json({
        conversations: conversas.map((conversa) => ({
          id: conversa.id,
          title: conversa.title,
          createdAt: conversa.createdAt,
          updatedAt: conversa.updatedAt,
          totalMensagens: conversa._count.messages
        }))
      });
    })
  );

  /* ---------------------------------------------------------------
     Nova conversa (vazia)
     --------------------------------------------------------------- */
  router.post(
    "/chat/conversations",
    requireAuth,
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const { title } = esquemaNovaConversa.parse(req.body ?? {});

      // Sem título vem o default do schema ("Nova conversa"); ele é
      // trocado pela primeira mensagem, em POST .../messages.
      const conversa = await prisma.conversation.create({
        data: { userId: usuario.id, ...(title ? { title } : {}) },
        select: { id: true, title: true, createdAt: true, updatedAt: true }
      });

      await registrarAuditoria({
        userId: usuario.id,
        action: "chat.conversation.create",
        targetType: "Conversation",
        targetId: conversa.id,
        conversationId: conversa.id,
        ip: ipDaRequisicao(req)
      });

      res.status(201).json({ conversation: { ...conversa, totalMensagens: 0 } });
    })
  );

  /* ---------------------------------------------------------------
     Uma conversa, com as mensagens
     --------------------------------------------------------------- */
  router.get(
    "/chat/conversations/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const id = idDaRota(req.params["id"]);

      const conversa = await prisma.conversation.findFirst({
        where: { id, userId: usuario.id },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              content: true,
              provider: true,
              model: true,
              promptTokens: true,
              completionTokens: true,
              latencyMs: true,
              errorCode: true,
              errorMessage: true,
              // As fontes citadas voltam junto: sem isto, reabrir a
              // conversa mostraria a resposta sem a origem dela, e a
              // pessoa não teria como conferir de onde saiu o
              // procedimento.
              knowledgeUsed: true,
              createdAt: true
            }
          }
        }
      });

      if (!conversa) throw AppError.naoEncontrado("Conversa não encontrada.");

      res.json({ conversation: conversa });
    })
  );

  /* ---------------------------------------------------------------
     Apagar conversa
     --------------------------------------------------------------- */
  router.delete(
    "/chat/conversations/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const id = idDaRota(req.params["id"]);

      // deleteMany com os dois filtros resolve "existe?" e "é minha?" em
      // uma consulta só, sem janela entre conferir e apagar. As
      // mensagens vão junto por onDelete: Cascade.
      const { count } = await prisma.conversation.deleteMany({ where: { id, userId: usuario.id } });

      if (count === 0) throw AppError.naoEncontrado("Conversa não encontrada.");

      await registrarAuditoria({
        userId: usuario.id,
        action: "chat.conversation.delete",
        targetType: "Conversation",
        targetId: id,
        conversationId: id,
        ip: ipDaRequisicao(req)
      });

      res.json({ ok: true });
    })
  );

  /* ---------------------------------------------------------------
     Enviar mensagem e receber a resposta em streaming
     --------------------------------------------------------------- */
  router.post(
    "/chat/conversations/:id/messages",
    requireAuth,
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const ip = ipDaRequisicao(req);
      const conversationId = idDaRota(req.params["id"]);
      const { content } = esquemaMensagem.parse(req.body);

      // --- tudo que pode falhar "em JSON" acontece antes do stream ---

      const conversa = await conversaDoUsuario(conversationId, usuario.id);
      if (!conversa) throw AppError.naoEncontrado("Conversa não encontrada.");

      const config = await obterProvedorAtivo();
      // Pode lançar ProviderError (config sem API key) ou erro de cifra
      // (ENCRYPTION_KEY trocada). Nos dois casos o middleware de erro
      // ainda consegue responder um JSON decente, porque nada foi escrito.
      const { adapter, runtime } = resolverProvedor(config, secretBox, env.PROVIDER_TIMEOUT_MS);

      // Configuração sem system prompt cai no padrão do catálogo: sem
      // instrução nenhuma o modelo responde como assistente genérico, em
      // inglês inclusive.
      if (!runtime.systemPrompt) runtime.systemPrompt = SYSTEM_PROMPT_PADRAO;

      // Primeira mensagem? Então é ela que nomeia a conversa. A contagem
      // vem ANTES de gravar a nova mensagem, senão nunca daria zero.
      const mensagensAnteriores = await prisma.message.count({ where: { conversationId } });

      const mensagemUsuario = await prisma.message.create({
        data: { conversationId, role: "USER", content },
        select: { id: true, createdAt: true }
      });

      const tituloNovo = mensagensAnteriores === 0 ? tituloDaConversa(content) : null;
      const conversaAtualizada = await prisma.conversation.update({
        where: { id: conversationId },
        // `updatedAt` explícito para a conversa subir na lista mesmo
        // quando o título não muda (@updatedAt só reage a um update, e
        // este update precisa existir).
        data: { updatedAt: new Date(), ...(tituloNovo ? { title: tituloNovo } : {}) },
        select: { title: true }
      });

      // A mensagem recém-gravada é a última do histórico — por isso o
      // histórico é montado depois de gravá-la, e não há "mensagem
      // atual" separada para o adapter.
      const historico = await montarHistorico(conversationId, env.CHAT_HISTORY_LIMIT);

      /* Base de conhecimento: procura antes de chamar o provedor e junta
         os trechos ao system prompt.

         Roda ANTES de abrir o stream de propósito — é rápido (busca
         textual em ~100 documentos) e, se falhar, ainda dá para
         responder com um erro HTTP decente. Falha aqui NÃO derruba a
         mensagem: o chat segue sem contexto, porque ficar sem responder
         é pior do que responder sem a base. */
      const configBase = await configuracaoDaBase();
      let contexto: ContextoMontado = { bloco: "", fontes: [], caracteres: 0 };

      if (configBase.ativo) {
        try {
          contexto = montarContexto(await buscarTrechos(content, configBase.trechos));
          runtime.systemPrompt = comContexto(runtime.systemPrompt ?? SYSTEM_PROMPT_PADRAO, contexto);
        } catch (falha) {
          console.error("[chat] busca na base de conhecimento falhou; seguindo sem contexto:", falha);
        }
      }

      // --- a partir daqui é SSE: erro vira evento, não status HTTP ---

      abrirStream(res);

      const controlador = new AbortController();
      let clienteDesconectou = false;

      req.on("close", () => {
        // Este 'close' também dispara no fim normal da resposta; o
        // `writableEnded` distingue "o usuário sumiu" de "acabou bem".
        if (res.writableEnded) return;
        clienteDesconectou = true;
        controlador.abort();
      });

      const keepalive = setInterval(() => {
        if (!res.writableEnded) res.write(": keep-alive\n\n");
      }, INTERVALO_KEEPALIVE_MS);

      enviarEvento(res, "meta", {
        conversationId,
        title: conversaAtualizada.title,
        userMessageId: mensagemUsuario.id,
        provider: config.provider,
        providerLabel: config.label,
        model: config.model,
        // As fontes vão no meta, e não só no done, para a tela poder
        // mostrar "consultando: manual X" ANTES da resposta começar a
        // aparecer — e para o usuário conferir a origem se a resposta
        // parecer estranha.
        fontes: contexto.fontes,
        baseConsultada: configBase.ativo
      });

      let texto = "";
      let usage: CompletionUsage | undefined;
      const inicio = Date.now();

      try {
        const stream = adapter.streamMessage(historico, runtime, controlador.signal);

        // Iteração manual em vez de `for await`: o `usage` vem no VALOR
        // DE RETORNO do generator (ver AIProvider.streamMessage), e
        // `for await` descarta esse valor.
        for (;;) {
          const passo = await stream.next();
          if (passo.done) {
            usage = passo.value;
            break;
          }

          const pedaco = passo.value;
          // `reasoning` é resumo de raciocínio, não resposta: não entra
          // no texto salvo nem vira `delta` — o contrato de eventos
          // acordado com o front é meta/delta/done/error, e misturar os
          // dois textos estragaria a resposta gravada.
          if (pedaco.type !== "text" || !pedaco.text) continue;

          texto += pedaco.text;
          enviarEvento(res, "delta", { text: pedaco.text });
        }

        const latencyMs = Date.now() - inicio;

        const mensagemAssistente = await prisma.message.create({
          data: {
            conversationId,
            role: "ASSISTANT",
            content: texto,
            providerConfigId: config.id,
            provider: config.provider,
            model: config.model,
            promptTokens: usage?.promptTokens ?? null,
            completionTokens: usage?.completionTokens ?? null,
            latencyMs,
            // Rastro de qual documento embasou a resposta. Sem isto,
            // auditar "de onde saiu isso" depois é impossivel.
            knowledgeUsed: fontesParaJson(contexto.fontes)
          },
          select: { id: true, createdAt: true }
        });

        // Só empurra a conversa para o topo da lista. Falhar aqui não
        // pode derrubar uma resposta que já foi gerada, paga e gravada —
        // seria cair no `catch` de baixo e gravar uma segunda mensagem,
        // agora de erro, para uma resposta que deu certo.
        try {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
          });
        } catch (erroAoTocar) {
          console.error("[chat] não consegui atualizar updatedAt da conversa:", erroAoTocar);
        }

        enviarEvento(res, "done", {
          messageId: mensagemAssistente.id,
          createdAt: mensagemAssistente.createdAt,
          usage: {
            promptTokens: usage?.promptTokens ?? null,
            completionTokens: usage?.completionTokens ?? null
          },
          latencyMs,
          provider: config.provider,
          model: config.model
        });

        await registrarAuditoria({
          userId: usuario.id,
          action: "chat.completion",
          targetType: "Message",
          targetId: mensagemAssistente.id,
          conversationId,
          provider: config.provider,
          model: config.model,
          success: true,
          ip,
          // Só medidas. O conteúdo da conversa já está na tabela de
          // mensagens; duplicá-lo no log de auditoria espalharia dado de
          // cliente por mais um lugar sem necessidade.
          metadata: {
            promptTokens: usage?.promptTokens ?? null,
            completionTokens: usage?.completionTokens ?? null,
            latencyMs,
            caracteresResposta: texto.length,
            mensagensNoHistorico: historico.length,
            providerConfigId: config.id
          }
        });
      } catch (erro) {
        const latencyMs = Date.now() - inicio;
        // O `provider` do ProviderError é o do contrato dos adapters, que
        // é um subconjunto do enum do banco — daí o cast.
        const falha: ProviderError =
          erro instanceof ProviderError
            ? erro
            : comoProviderError(erro, config.provider as unknown as ProviderKindDoContrato);

        // Persiste o que já chegou. Duas razões: o usuário vê onde a
        // resposta parou (em vez de a mensagem sumir) e o token gasto
        // até ali fica registrado. Vale também quando ele fechou a aba
        // no meio — o provedor já cobrou.
        let mensagemAssistenteId: string | null = null;
        try {
          const registro = await prisma.message.create({
            data: {
              conversationId,
              role: "ASSISTANT",
              content: texto,
              providerConfigId: config.id,
              provider: config.provider,
              model: config.model,
              promptTokens: usage?.promptTokens ?? null,
              completionTokens: usage?.completionTokens ?? null,
              latencyMs,
              knowledgeUsed: fontesParaJson(contexto.fontes),
              errorCode: falha.code,
              // A frase do USUÁRIO, não a do admin: esta coluna volta no
              // GET da conversa e aparece na tela de quem conversa. O
              // texto cru do provedor (host, chave, id de requisição)
              // fica só na auditoria.
              errorMessage: falha.mensagemUsuario
            },
            select: { id: true }
          });
          mensagemAssistenteId = registro.id;
        } catch (erroAoGravar) {
          // Falhar ao gravar a falha não pode virar uma segunda exceção
          // no meio de um stream já aberto.
          console.error("[chat] não consegui gravar a mensagem de erro:", erroAoGravar);
        }

        enviarEvento(res, "error", {
          ...falha.toUserPayload(),
          messageId: mensagemAssistenteId,
          textoParcial: texto.length > 0
        });

        await registrarAuditoria({
          userId: usuario.id,
          action: "chat.error",
          targetType: "Message",
          targetId: mensagemAssistenteId,
          conversationId,
          provider: config.provider,
          model: config.model,
          success: false,
          ip,
          metadata: {
            code: falha.code,
            httpStatus: falha.httpStatus ?? null,
            retryable: falha.retryable,
            // Texto cru do provedor: é o que o admin precisa para
            // diagnosticar. Passa pelo saneador do audit/log.ts antes de
            // ir para o banco.
            providerMessage: falha.providerMessage ?? null,
            latencyMs,
            caracteresParciais: texto.length,
            clienteDesconectou,
            providerConfigId: config.id
          }
        });
      } finally {
        clearInterval(keepalive);
        if (!res.writableEnded) res.end();
      }
    })
  );

  return router;
}
