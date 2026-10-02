/* =====================================================================
   Envios: preparar, conferir, disparar e consultar

   O fluxo tem DOIS passos de propósito. "Preparar" grava o envio e
   devolve quem entra e quem fica de fora (descadastrado, repetido,
   inválido) — e só então "disparar" manda. Juntar os dois num botão só
   tiraria a última chance de conferir a lista, que é justamente onde o
   erro caro acontece.

   O disparo roda em segundo plano e a tela acompanha pelo estado no
   banco: uma requisição HTTP que espera lotes com intervalo de minutos
   seria derrubada por qualquer proxy no meio do caminho.
   ===================================================================== */

import { Router } from "express";
import { z } from "zod";
import { resolve } from "node:path";
import { join } from "node:path";
import { prisma } from "../db.js";
import type { Env } from "../env.js";
import { AppError, asyncHandler, ipDaRequisicao } from "../http/errors.js";
import { criarRequireAuth, usuarioDaRequisicao } from "../auth/middleware.js";
import { dividirEmLotes, minutosEstimados } from "./lotes.js";
import { dispararEnvio, prepararEnvio } from "./servico.js";
import { mensagemDeErro } from "./mascarar.js";

const idParam = z.string().trim().min(1).max(64);

const esquemaPreparar = z.object({
  cartaId: idParam,
  /** Ou os clientes escolhidos, ou e-mails colados à mão — ou os dois. */
  clienteIds: z.array(idParam).default([]),
  emailsAvulsos: z.array(z.string().trim()).default([]),
  agendadoPara: z.coerce.date().optional()
});

export function rotasDeEnvios(env: Env): Router {
  const router = Router();
  const requireAuth = criarRequireAuth(env);
  const pastaDados = resolve(env.PASTA_DADOS);

  router.get("/envios", requireAuth, asyncHandler(async (_req, res) => {
    const envios = await prisma.envio.findMany({
      include: {
        carta: { select: { id: true, nome: true } },
        criadoPor: { select: { id: true, nome: true } },
        _count: { select: { destinatarios: true } }
      },
      orderBy: { criadoEm: "desc" },
      take: 200
    });

    // Contagem por status num golpe só: a tela precisa de "quantos
    // enviados / quantos falharam" em cada linha da lista.
    const porStatus = await prisma.envioDestinatario.groupBy({
      by: ["envioId", "status"],
      _count: { _all: true }
    });

    res.json({
      envios: envios.map((envio) => {
        const meus = porStatus.filter((p) => p.envioId === envio.id);
        const conta = (status: string) => meus.find((m) => m.status === status)?._count._all ?? 0;
        return {
          ...envio,
          totais: {
            destinatarios: envio._count.destinatarios,
            enviados: conta("ENVIADO"),
            falhas: conta("FALHOU"),
            descadastrados: conta("DESCADASTRADO"),
            pendentes: conta("PENDENTE")
          }
        };
      })
    });
  }));

  router.get("/envios/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params["id"]);
    const envio = await prisma.envio.findUnique({
      where: { id },
      include: {
        carta: { select: { id: true, nome: true } },
        destinatarios: { orderBy: [{ status: "asc" }, { email: "asc" }] }
      }
    });
    if (!envio) throw AppError.naoEncontrado("Envio não encontrado.");
    res.json({ envio });
  }));

  router.post("/envios/preparar", requireAuth, asyncHandler(async (req, res) => {
    const usuario = usuarioDaRequisicao(req);
    const dados = esquemaPreparar.parse(req.body ?? {});

    const contatos = dados.clienteIds.length
      ? await prisma.contato.findMany({
          where: { clienteId: { in: dados.clienteIds }, ativo: true },
          include: { cliente: { select: { nome: true } } }
        })
      : [];

    const lista = [
      ...contatos.map((c) => ({ email: c.email, nome: c.nome, clienteNome: c.cliente.nome })),
      ...dados.emailsAvulsos.map((email) => ({ email, nome: null, clienteNome: null }))
    ];

    if (lista.length === 0) {
      throw AppError.requisicaoInvalida("Escolha pelo menos um cliente ou informe um e-mail.");
    }

    const preparado = await prepararEnvio({
      cartaId: dados.cartaId,
      destinatarios: lista,
      criadoPorId: usuario.id,
      agendadoPara: dados.agendadoPara
    });

    const config = await prisma.configSmtp.findUnique({ where: { id: "unica" } });
    const lotes = dividirEmLotes(new Array(preparado.aEnviar), config?.loteTamanho ?? 5).length;

    res.status(201).json({
      ...preparado,
      lotes,
      minutosEstimados: minutosEstimados(lotes, config?.loteIntervaloMin ?? 1)
    });
  }));

  router.post("/envios/:id/disparar", requireAuth, asyncHandler(async (req, res) => {
    const usuario = usuarioDaRequisicao(req);
    const id = idParam.parse(req.params["id"]);

    const envio = await prisma.envio.findUnique({ where: { id }, include: { carta: { include: { anexos: true } } } });
    if (!envio) throw AppError.naoEncontrado("Envio não encontrado.");
    if (envio.status === "ENVIANDO") throw AppError.conflito("Este envio já está em andamento.");
    if (envio.status === "CONCLUIDO") throw AppError.conflito("Este envio já foi concluído.");

    const config = await prisma.configSmtp.findUnique({ where: { id: "unica" } });
    if (!config) throw new AppError(400, "SEM_CONFIGURACAO", "Configure o servidor de e-mail antes de disparar.");

    const anexos = (envio.carta?.anexos ?? []).map((a) => ({
      filename: a.nomeArquivo,
      path: join(pastaDados, "anexos", a.caminho),
      contentType: a.tipoMime
    }));

    await prisma.auditoria.create({
      data: { usuarioId: usuario.id, acao: "envio.disparado", alvo: envio.id, ip: ipDaRequisicao(req) }
    });

    // Responde já: o disparo pode levar minutos (lotes com intervalo), e
    // segurar a conexão todo esse tempo entregaria o envio à sorte do
    // primeiro proxy que desistir.
    res.status(202).json({ ok: true, envioId: envio.id, mensagem: "Disparo iniciado. Acompanhe na tela de enviados." });

    void dispararEnvio({
      envioId: envio.id,
      config: { ...config, usuario: config.usuario, senhaCifrada: config.senhaCifrada },
      anexos,
      chave: env.chaveDeCifra,
      modoTeste: env.modoTeste,
      pastaDados
    }).catch(async (falha) => {
      // Falha fora dos lotes (configuração impossível, banco fora).
      // Precisa virar registro: ninguém está olhando o terminal.
      await prisma.auditoria.create({
        data: { usuarioId: usuario.id, acao: "envio.falhou", alvo: envio.id, detalhe: mensagemDeErro(falha) }
      }).catch(() => undefined);
    });
  }));

  router.post("/envios/:id/cancelar", requireAuth, asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params["id"]);
    const envio = await prisma.envio.update({ where: { id }, data: { status: "CANCELADO" } });
    res.json({ envio });
  }));

  return router;
}
