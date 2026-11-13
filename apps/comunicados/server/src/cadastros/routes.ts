/* =====================================================================
   Cadastros: produtos, clientes (com contatos), descadastros e usuários

   São quatro CRUDs sem segredo nenhum — o que vale explicar é o que NÃO
   é CRUD comum:

   - Cliente não é apagado quando tem histórico; é desativado. Apagar
     levaria junto o rastro de quem recebeu o quê.
   - Descadastro é o único cadastro que qualquer operador pode criar: é
     pedido do destinatário, e atrasar isso é o tipo de coisa que vira
     reclamação.
   - Usuário só é tocado por ADMIN, e ninguém se desativa sozinho (o
     portal ficaria sem dono).
   ===================================================================== */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import type { Env } from "../env.js";
import { AppError, asyncHandler, ipDaRequisicao } from "../http/errors.js";
import { criarRequireAuth, requireAdmin, usuarioDaRequisicao } from "../auth/middleware.js";
import { hashSenha, validarForcaSenha } from "../auth/password.js";
import { normalizarEmail, ehEmailPlausivel } from "../envios/lotes.js";

const idParam = z.string().trim().min(1).max(64);

export function rotasDeCadastros(env: Env): Router {
  const router = Router();
  const requireAuth = criarRequireAuth(env);

  /* ----------------------------- produtos ---------------------------- */

  router.get("/produtos", requireAuth, asyncHandler(async (_req, res) => {
    const produtos = await prisma.produto.findMany({ orderBy: { nome: "asc" } });
    res.json({ produtos });
  }));

  router.post("/produtos", requireAuth, asyncHandler(async (req, res) => {
    const { nome } = z.object({ nome: z.string().trim().min(1).max(120) }).parse(req.body ?? {});
    const existente = await prisma.produto.findUnique({ where: { nome } });
    if (existente) throw AppError.conflito("Já existe um produto com esse nome.");
    const produto = await prisma.produto.create({ data: { nome } });
    res.status(201).json({ produto });
  }));

  router.patch("/produtos/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params["id"]);
    const dados = z.object({ nome: z.string().trim().min(1).max(120).optional(), ativo: z.boolean().optional() }).parse(req.body ?? {});
    const produto = await prisma.produto.update({ where: { id }, data: dados });
    res.json({ produto });
  }));

  /* ----------------------------- clientes ---------------------------- */

  const esquemaContato = z.object({
    nome: z.string().trim().max(160).optional().nullable(),
    email: z.string().trim().min(1, "Informe o e-mail.")
  });

  router.get("/clientes", requireAuth, asyncHandler(async (req, res) => {
    const { produtoId, busca } = z.object({
      produtoId: z.string().trim().optional(),
      busca: z.string().trim().optional()
    }).parse(req.query ?? {});

    const clientes = await prisma.cliente.findMany({
      where: {
        ...(produtoId ? { produtoId } : {}),
        ...(busca ? { nome: { contains: busca } } : {})
      },
      include: { contatos: { orderBy: { email: "asc" } }, produto: { select: { id: true, nome: true } } },
      orderBy: { nome: "asc" }
    });
    res.json({ clientes });
  }));

  router.post("/clientes", requireAuth, asyncHandler(async (req, res) => {
    const dados = z.object({
      nome: z.string().trim().min(1).max(200),
      produtoId: z.string().trim().optional().nullable(),
      contatos: z.array(esquemaContato).default([])
    }).parse(req.body ?? {});

    for (const contato of dados.contatos) {
      if (!ehEmailPlausivel(contato.email)) {
        throw AppError.requisicaoInvalida(`E-mail inválido: ${contato.email}`);
      }
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome: dados.nome,
        produtoId: dados.produtoId ?? null,
        contatos: {
          create: dados.contatos.map((c) => ({ nome: c.nome ?? null, email: normalizarEmail(c.email) }))
        }
      },
      include: { contatos: true }
    });
    res.status(201).json({ cliente });
  }));

  router.patch("/clientes/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params["id"]);
    const dados = z.object({
      nome: z.string().trim().min(1).max(200).optional(),
      produtoId: z.string().trim().nullable().optional(),
      ativo: z.boolean().optional()
    }).parse(req.body ?? {});
    const cliente = await prisma.cliente.update({ where: { id }, data: dados, include: { contatos: true } });
    res.json({ cliente });
  }));

  router.post("/clientes/:id/contatos", requireAuth, asyncHandler(async (req, res) => {
    const clienteId = idParam.parse(req.params["id"]);
    const dados = esquemaContato.parse(req.body ?? {});
    if (!ehEmailPlausivel(dados.email)) throw AppError.requisicaoInvalida("E-mail inválido.");

    const contato = await prisma.contato.create({
      data: { clienteId, nome: dados.nome ?? null, email: normalizarEmail(dados.email) }
    });
    res.status(201).json({ contato });
  }));

  router.delete("/contatos/:id", requireAuth, asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params["id"]);
    await prisma.contato.delete({ where: { id } });
    res.status(204).end();
  }));

  /* --------------------------- descadastros -------------------------- */

  router.get("/descadastros", requireAuth, asyncHandler(async (_req, res) => {
    const descadastros = await prisma.descadastro.findMany({ orderBy: { criadoEm: "desc" } });
    res.json({ descadastros });
  }));

  router.post("/descadastros", requireAuth, asyncHandler(async (req, res) => {
    const usuario = usuarioDaRequisicao(req);
    const dados = z.object({
      email: z.string().trim().min(1),
      motivo: z.string().trim().max(500).optional()
    }).parse(req.body ?? {});

    if (!ehEmailPlausivel(dados.email)) throw AppError.requisicaoInvalida("E-mail inválido.");
    const email = normalizarEmail(dados.email);

    const descadastro = await prisma.descadastro.upsert({
      where: { email },
      create: { email, motivo: dados.motivo ?? null },
      update: { motivo: dados.motivo ?? null }
    });

    await prisma.auditoria.create({
      data: { usuarioId: usuario.id, acao: "descadastro.criado", alvo: email, ip: ipDaRequisicao(req) }
    });

    res.status(201).json({ descadastro });
  }));

  router.delete("/descadastros/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const usuario = usuarioDaRequisicao(req);
    const id = idParam.parse(req.params["id"]);
    const removido = await prisma.descadastro.delete({ where: { id } });
    await prisma.auditoria.create({
      data: { usuarioId: usuario.id, acao: "descadastro.removido", alvo: removido.email, ip: ipDaRequisicao(req) }
    });
    res.status(204).end();
  }));

  /* ----------------------------- usuários ---------------------------- */

  router.get("/usuarios", requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, email: true, nome: true, papel: true, ativo: true, ultimoLoginEm: true, criadoEm: true },
      orderBy: { nome: "asc" }
    });
    res.json({ usuarios });
  }));

  router.post("/usuarios", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const autor = usuarioDaRequisicao(req);
    const dados = z.object({
      nome: z.string().trim().min(1).max(160),
      email: z.string().trim().toLowerCase().email("E-mail inválido."),
      senha: z.string().min(1, "Informe a senha."),
      papel: z.enum(["ADMIN", "OPERADOR"]).default("OPERADOR")
    }).parse(req.body ?? {});

    const fraca = validarForcaSenha(dados.senha);
    if (fraca) throw AppError.requisicaoInvalida(fraca);

    const existente = await prisma.usuario.findUnique({ where: { email: dados.email } });
    if (existente) throw AppError.conflito("Já existe um usuário com esse e-mail.");

    const usuario = await prisma.usuario.create({
      data: { nome: dados.nome, email: dados.email, papel: dados.papel, senhaHash: await hashSenha(dados.senha) },
      select: { id: true, email: true, nome: true, papel: true, ativo: true, criadoEm: true }
    });

    await prisma.auditoria.create({
      data: { usuarioId: autor.id, acao: "usuario.criado", alvo: usuario.email, ip: ipDaRequisicao(req) }
    });

    res.status(201).json({ usuario });
  }));

  router.patch("/usuarios/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const autor = usuarioDaRequisicao(req);
    const id = idParam.parse(req.params["id"]);
    const dados = z.object({
      nome: z.string().trim().min(1).max(160).optional(),
      papel: z.enum(["ADMIN", "OPERADOR"]).optional(),
      ativo: z.boolean().optional(),
      senha: z.string().min(1).optional()
    }).parse(req.body ?? {});

    // Ninguém se desativa nem se rebaixa: o portal pode ficar sem
    // administrador, e recuperar isso exige mexer no banco à mão.
    if (id === autor.id && (dados.ativo === false || dados.papel === "OPERADOR")) {
      throw AppError.requisicaoInvalida("Você não pode remover o próprio acesso de administrador.");
    }

    if (dados.senha) {
      const fraca = validarForcaSenha(dados.senha);
      if (fraca) throw AppError.requisicaoInvalida(fraca);
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        ...(dados.nome ? { nome: dados.nome } : {}),
        ...(dados.papel ? { papel: dados.papel } : {}),
        ...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
        // Trocar senha de outro usuário também derruba as sessões dele.
        ...(dados.senha ? { senhaHash: await hashSenha(dados.senha), tokenVersion: { increment: 1 } } : {})
      },
      select: { id: true, email: true, nome: true, papel: true, ativo: true }
    });

    await prisma.auditoria.create({
      data: { usuarioId: autor.id, acao: "usuario.alterado", alvo: usuario.email, ip: ipDaRequisicao(req) }
    });

    res.json({ usuario });
  }));

  return router;
}
