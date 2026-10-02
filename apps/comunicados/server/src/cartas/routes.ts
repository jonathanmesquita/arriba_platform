/* =====================================================================
   Cartas modelo

   A carta é escrita uma vez e reusada. Três coisas desta rota existem
   por causa disso:

   - PRÉ-VISUALIZAÇÃO com valores de exemplo, para quem escreve ver o
     resultado antes de qualquer destinatário receber;
   - CONFERÊNCIA de variável desconhecida, devolvida junto com a carta: é
     o que impede `{{nome_do_titular}}` (que ninguém declarou) de sair
     como texto cru para a lista inteira;
   - DUPLICAR, porque na prática a carta nova quase sempre começa de uma
     anterior.

   Anexo é arquivo em disco (`dados/anexos/`), não coluna no banco: anexo
   de alguns MB em SQLite deixa a tabela lenta e o backup confuso.
   ===================================================================== */

import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../db.js";
import type { Env } from "../env.js";
import { AppError, asyncHandler, ipDaRequisicao } from "../http/errors.js";
import { criarRequireAuth, usuarioDaRequisicao } from "../auth/middleware.js";
import { preencher, valoresDeExemplo, variaveisDesconhecidas, VARIAVEIS } from "./variaveis.js";

const idParam = z.string().trim().min(1).max(64);

const esquemaCarta = z.object({
  nome: z.string().trim().min(1, "Dê um nome para a carta.").max(200),
  assunto: z.string().trim().min(1, "Informe o assunto do e-mail.").max(300),
  corpoHtml: z.string().min(1, "A carta está vazia.").max(500_000),
  produtoId: z.string().trim().nullable().optional()
});

export function rotasDeCartas(env: Env): Router {
  const router = Router();
  const requireAuth = criarRequireAuth(env);
  const pastaAnexos = resolve(env.PASTA_DADOS, "anexos");

  // Memória, e não disco direto: o arquivo só é gravado depois de passar
  // pelo limite configurado e pela checagem de dono da carta.
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  router.get("/cartas/variaveis", requireAuth, asyncHandler(async (_req, res) => {
    res.json({ variaveis: VARIAVEIS });
  }));

  router.get("/cartas", requireAuth, asyncHandler(async (_req, res) => {
    const cartas = await prisma.cartaModelo.findMany({
      include: {
        produto: { select: { id: true, nome: true } },
        anexos: { select: { id: true, nomeArquivo: true, tamanhoBytes: true } }
      },
      orderBy: { atualizadoEm: "desc" }
    });
    res.json({ cartas });
  }));

  router.get("/cartas/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params["id"]);
    const carta = await prisma.cartaModelo.findUnique({
      where: { id },
      include: { produto: true, anexos: true }
    });
    if (!carta) throw AppError.naoEncontrado("Carta não encontrada.");

    res.json({
      carta,
      // Vai junto para a tela não precisar de uma segunda chamada só
      // para saber se a carta tem variável errada.
      variaveisDesconhecidas: variaveisDesconhecidas(`${carta.assunto}\n${carta.corpoHtml}`)
    });
  }));

  router.post("/cartas/previa", requireAuth, asyncHandler(async (req, res) => {
    const { assunto, corpoHtml } = z.object({
      assunto: z.string().max(300).default(""),
      corpoHtml: z.string().max(500_000).default("")
    }).parse(req.body ?? {});

    const valores = valoresDeExemplo();
    res.json({
      assunto: preencher(assunto, valores, { escapar: false }),
      corpoHtml: preencher(corpoHtml, valores),
      variaveisDesconhecidas: variaveisDesconhecidas(`${assunto}\n${corpoHtml}`)
    });
  }));

  router.post("/cartas", requireAuth, asyncHandler(async (req, res) => {
    const usuario = usuarioDaRequisicao(req);
    const dados = esquemaCarta.parse(req.body ?? {});

    const carta = await prisma.cartaModelo.create({
      data: { ...dados, produtoId: dados.produtoId ?? null, criadoPorId: usuario.id },
      include: { anexos: true }
    });

    await prisma.auditoria.create({
      data: { usuarioId: usuario.id, acao: "carta.criada", alvo: carta.nome, ip: ipDaRequisicao(req) }
    });

    res.status(201).json({ carta });
  }));

  router.put("/cartas/:id", requireAuth, asyncHandler(async (req, res) => {
    const usuario = usuarioDaRequisicao(req);
    const id = idParam.parse(req.params["id"]);
    const dados = esquemaCarta.parse(req.body ?? {});

    const carta = await prisma.cartaModelo.update({
      where: { id },
      data: { ...dados, produtoId: dados.produtoId ?? null },
      include: { anexos: true }
    });

    await prisma.auditoria.create({
      data: { usuarioId: usuario.id, acao: "carta.alterada", alvo: carta.nome, ip: ipDaRequisicao(req) }
    });

    res.json({ carta });
  }));

  router.post("/cartas/:id/duplicar", requireAuth, asyncHandler(async (req, res) => {
    const usuario = usuarioDaRequisicao(req);
    const id = idParam.parse(req.params["id"]);

    const original = await prisma.cartaModelo.findUnique({ where: { id } });
    if (!original) throw AppError.naoEncontrado("Carta não encontrada.");

    const copia = await prisma.cartaModelo.create({
      data: {
        nome: `${original.nome} (cópia)`,
        assunto: original.assunto,
        corpoHtml: original.corpoHtml,
        produtoId: original.produtoId,
        criadoPorId: usuario.id
      }
    });

    res.status(201).json({ carta: copia });
  }));

  router.delete("/cartas/:id", requireAuth, asyncHandler(async (req, res) => {
    const usuario = usuarioDaRequisicao(req);
    const id = idParam.parse(req.params["id"]);

    const anexos = await prisma.anexo.findMany({ where: { cartaId: id } });
    await prisma.cartaModelo.delete({ where: { id } });

    // Apagar o registro sem apagar o arquivo deixaria lixo acumulando em
    // disco até alguém estranhar o tamanho da pasta.
    for (const anexo of anexos) {
      await unlink(join(pastaAnexos, anexo.caminho)).catch(() => undefined);
    }

    await prisma.auditoria.create({
      data: { usuarioId: usuario.id, acao: "carta.apagada", alvo: id, ip: ipDaRequisicao(req) }
    });

    res.status(204).end();
  }));

  router.post("/cartas/:id/anexos", requireAuth, upload.single("arquivo"), asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params["id"]);
    const arquivo = (req as unknown as { file?: Express.Multer.File }).file;
    if (!arquivo) throw AppError.requisicaoInvalida("Nenhum arquivo enviado.");

    const carta = await prisma.cartaModelo.findUnique({ where: { id } });
    if (!carta) throw AppError.naoEncontrado("Carta não encontrada.");

    // O teto é o do servidor de e-mail, configurado na tela — não um
    // número fixo aqui. Provedor recusa acima do limite dele, e a mensagem
    // volta só no disparo, quando já é tarde.
    const config = await prisma.configSmtp.findUnique({ where: { id: "unica" } });
    const limiteMb = config?.anexoMaxMb ?? 10;
    if (arquivo.size > limiteMb * 1024 * 1024) {
      throw AppError.requisicaoInvalida(`O anexo passou do limite de ${limiteMb} MB configurado.`);
    }

    await mkdir(pastaAnexos, { recursive: true });
    const nomeEmDisco = `${randomUUID()}${extname(arquivo.originalname)}`;
    await writeFile(join(pastaAnexos, nomeEmDisco), arquivo.buffer);

    const anexo = await prisma.anexo.create({
      data: {
        cartaId: id,
        nomeArquivo: arquivo.originalname,
        caminho: nomeEmDisco,
        tamanhoBytes: arquivo.size,
        tipoMime: arquivo.mimetype
      }
    });

    res.status(201).json({ anexo });
  }));

  router.delete("/anexos/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params["id"]);
    const anexo = await prisma.anexo.delete({ where: { id } });
    await unlink(join(pastaAnexos, anexo.caminho)).catch(() => undefined);
    res.status(204).end();
  }));

  return router;
}
