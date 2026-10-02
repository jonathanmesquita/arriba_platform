/* =====================================================================
   Servidor de e-mail — a tela de configuração

   DUAS REGRAS DE SEGURANÇA, não de layout:

   1. A SENHA NUNCA VOLTA. Nem cifrada. A tela sabe apenas se existe uma
      senha salva; o campo começa vazio, e vazio significa "mantém a que
      está lá" — não "apaga". Quem quiser trocar, digita.

   2. TESTAR ANTES DE SALVAR. O botão de teste aceita uma senha de
      rascunho, para conferir a credencial sem gravá-la. Gravar primeiro e
      descobrir no disparo que a senha está errada é o pior caminho: a
      carta já foi escrita e a lista já foi escolhida.
   ===================================================================== */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import type { Env } from "../env.js";
import { AppError, asyncHandler, ipDaRequisicao } from "../http/errors.js";
import { criarRequireAuth, requireAdmin, usuarioDaRequisicao } from "../auth/middleware.js";
import { SecretBox } from "../crypto/secretBox.js";
import { mensagemDeErro } from "../envios/mascarar.js";
import { testarConexao, type ConfiguracaoDeEnvio } from "../envios/transporte.js";

const ID_UNICO = "unica";

const esquemaConfig = z.object({
  host: z.string().trim().min(1, "Informe o servidor (host)."),
  porta: z.coerce.number().int().min(1).max(65535),
  sslDireto: z.boolean().default(false),
  aceitarCertificadoInvalido: z.boolean().default(false),
  usuario: z.string().trim().max(320).optional().nullable(),
  /** Vazio ou ausente = mantém a senha atual. */
  senha: z.string().max(500).optional(),
  remetenteEmail: z.string().trim().email("E-mail do remetente inválido."),
  remetenteNome: z.string().trim().min(1, "Informe o nome exibido."),
  loteTamanho: z.coerce.number().int().min(1).max(500).default(5),
  loteIntervaloMin: z.coerce.number().int().min(0).max(240).default(1),
  anexoMaxMb: z.coerce.number().int().min(1).max(50).default(10)
});

/** O que a tela recebe: tudo menos o segredo. */
function paraTela(config: Awaited<ReturnType<typeof prisma.configSmtp.findUnique>>) {
  if (!config) return null;
  const { senhaCifrada, ...resto } = config;
  return { ...resto, senhaSalva: Boolean(senhaCifrada) };
}

export function rotasDeConfiguracao(env: Env): Router {
  const router = Router();
  const requireAuth = criarRequireAuth(env);

  router.get(
    "/config/smtp",
    requireAuth,
    asyncHandler(async (_req, res) => {
      const config = await prisma.configSmtp.findUnique({ where: { id: ID_UNICO } });
      res.json({ config: paraTela(config) });
    })
  );

  router.put(
    "/config/smtp",
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const dados = esquemaConfig.parse(req.body ?? {});
      const caixa = new SecretBox(env.chaveDeCifra);

      const senhaInformada = dados.senha?.trim();
      const cifrada = senhaInformada ? caixa.encrypt(senhaInformada) : undefined;

      const comum = {
        host: dados.host,
        porta: dados.porta,
        sslDireto: dados.sslDireto,
        aceitarCertificadoInvalido: dados.aceitarCertificadoInvalido,
        usuario: dados.usuario ?? null,
        remetenteEmail: dados.remetenteEmail,
        remetenteNome: dados.remetenteNome,
        loteTamanho: dados.loteTamanho,
        loteIntervaloMin: dados.loteIntervaloMin,
        anexoMaxMb: dados.anexoMaxMb
      };

      const config = await prisma.configSmtp.upsert({
        where: { id: ID_UNICO },
        create: { id: ID_UNICO, ...comum, ...(cifrada ? { senhaCifrada: cifrada } : {}) },
        update: { ...comum, ...(cifrada ? { senhaCifrada: cifrada } : {}) }
      });

      await prisma.auditoria.create({
        data: {
          usuarioId: usuario.id,
          acao: "config.smtp.salva",
          detalhe: `${dados.host}:${dados.porta}`,
          ip: ipDaRequisicao(req)
        }
      });

      res.json({ config: paraTela(config) });
    })
  );

  router.post(
    "/config/smtp/testar",
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      // Rascunho: testa o que está na tela, sem salvar. Sem corpo, testa
      // o que já está gravado.
      const rascunho = Object.keys(req.body ?? {}).length > 0 ? esquemaConfig.parse(req.body) : null;
      const salva = await prisma.configSmtp.findUnique({ where: { id: ID_UNICO } });

      if (!rascunho && !salva) {
        throw new AppError(400, "SEM_CONFIGURACAO", "Nenhum servidor de e-mail configurado ainda.");
      }

      const caixa = new SecretBox(env.chaveDeCifra);
      const senhaDoRascunho = rascunho?.senha?.trim();

      const config: ConfiguracaoDeEnvio = {
        host: rascunho?.host ?? salva!.host,
        porta: rascunho?.porta ?? salva!.porta,
        sslDireto: rascunho?.sslDireto ?? salva!.sslDireto,
        aceitarCertificadoInvalido: rascunho?.aceitarCertificadoInvalido ?? salva!.aceitarCertificadoInvalido,
        usuario: rascunho?.usuario ?? salva?.usuario ?? null,
        senhaCifrada: senhaDoRascunho ? caixa.encrypt(senhaDoRascunho) : salva?.senhaCifrada ?? null,
        remetenteEmail: rascunho?.remetenteEmail ?? salva!.remetenteEmail,
        remetenteNome: rascunho?.remetenteNome ?? salva!.remetenteNome,
        anexoMaxMb: rascunho?.anexoMaxMb ?? salva!.anexoMaxMb
      };

      const inicio = Date.now();
      try {
        await testarConexao(config, env.chaveDeCifra);
        const mensagem = "Conexão e autenticação funcionaram.";

        if (salva) {
          await prisma.configSmtp.update({
            where: { id: ID_UNICO },
            data: { ultimoTesteEm: new Date(), ultimoTesteOk: true, ultimoTesteMensagem: mensagem }
          });
        }
        await prisma.auditoria.create({
          data: { usuarioId: usuario.id, acao: "config.smtp.teste.ok", ip: ipDaRequisicao(req) }
        });

        res.json({ ok: true, mensagem, duracaoMs: Date.now() - inicio });
      } catch (falha) {
        // A mensagem do servidor é o que resolve o problema — e é também
        // onde a senha apareceria. Passa pelo mascaramento antes de ir
        // para a tela, para o banco e para o log.
        const mensagem = mensagemDeErro(falha);

        if (salva) {
          await prisma.configSmtp.update({
            where: { id: ID_UNICO },
            data: { ultimoTesteEm: new Date(), ultimoTesteOk: false, ultimoTesteMensagem: mensagem }
          });
        }
        await prisma.auditoria.create({
          data: { usuarioId: usuario.id, acao: "config.smtp.teste.falha", detalhe: mensagem, ip: ipDaRequisicao(req) }
        });

        res.status(502).json({ ok: false, mensagem, duracaoMs: Date.now() - inicio });
      }
    })
  );

  return router;
}
