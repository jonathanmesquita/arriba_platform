/* =====================================================================
   Rotas do painel administrativo

   Tudo aqui exige sessão válida E papel ADMIN — a cadeia é montada uma
   vez, em `router.use("/admin", ...)`, em vez de repetida rota a rota.
   Repetir é o tipo de coisa que funciona até alguém acrescentar a
   próxima rota e esquecer o middleware.

   A regra que manda neste arquivo: A API KEY NÃO SAI DAQUI. Nem em
   texto puro (que o servidor nem guarda), nem cifrada, nem em mensagem
   de erro, nem em log de auditoria. O que a tela recebe é
   `apiKeyConfigurada` (tem ou não tem), `apiKeyLast4` (para o admin
   reconhecer qual chave está lá) e `apiKeyUpdatedAt`.

   Formato das respostas (o front monta em cima disto):

     GET    /admin/providers              -> { configs: ConfigPublica[] }
     GET    /admin/catalog                -> { provedores, systemPromptPadrao, ... }
     POST   /admin/providers              -> 201 { config }
     PATCH  /admin/providers/:id          -> { config, aviso? }
     DELETE /admin/providers/:id          -> { ok, id, deixouSemProvedorAtivo, aviso? }
     POST   /admin/providers/:id/activate -> { config }
     POST   /admin/providers/:id/test     -> { ok, message, latencyMs, model?, erro?, config }
     POST   /admin/providers/test-draft   -> { ok, message, latencyMs, model?, erro? }
     GET    /admin/audit                  -> { items, page, pageSize, total, totalPages }
     GET    /admin/users                  -> { users }
     POST   /admin/users                  -> 201 { user }

   Duas invariantes do sistema moram neste arquivo, e é por isso que elas
   aparecem comentadas onde são aplicadas:

   1. SÓ UMA configuração ativa. O banco não tem como declarar isso de
      forma portável (ver comentário no schema.prisma), então a troca
      acontece dentro de `prisma.$transaction`.
   2. "Ativa" implica "habilitada". Ativar liga o `isEnabled` junto, e
      desabilitar a ativa a tira de ativa — senão o chat ficaria apontando
      para uma configuração que ele mesmo recusa a usar.
   ===================================================================== */

import { Router } from "express";
import { z } from "zod";

// Prisma 7 gera o client num caminho nosso (ver schema.prisma): tipos e
// enums vêm de generated/prisma, nunca de "@prisma/client".
import { ProviderKind, Role } from "../../generated/prisma/client.js";
import type { Prisma, ProviderConfig } from "../../generated/prisma/client.js";

import { prisma } from "../db.js";
import type { Env } from "../env.js";
import { SecretBox } from "../crypto/secretBox.js";
// `ipDaRequisicao` vem do módulo de auditoria de propósito: ele já sabe
// ler o x-forwarded-for do proxy, e duas versões da mesma regra acabariam
// registrando IPs diferentes para a mesma requisição.
import { ipDaRequisicao, registrarAuditoria } from "../audit/log.js";
import { AppError, asyncHandler } from "../http/errors.js";
import { criarRequireAuth, requireAdmin, usuarioDaRequisicao } from "../auth/middleware.js";
import { hashSenha, validarForcaSenha } from "../auth/password.js";
import {
  MAX_TOKENS_PADRAO,
  PROVEDORES,
  SYSTEM_PROMPT_PADRAO,
  TEMPERATURA_PADRAO,
  type ProvedorInfo
} from "../providers/catalog.js";
import { comoProviderError } from "../providers/errors.js";
import { mascararSegredo, resolverProvedor } from "../providers/registry.js";
import type { TestConnectionResult } from "../providers/types.js";
import { importarBase } from "../knowledge/ingest.js";
import { estatisticasDaBase } from "../knowledge/search.js";
import { configuracaoDaBase, salvarConfiguracaoDaBase } from "../knowledge/settings.js";

/** Teto do teste de conexão. O PROVIDER_TIMEOUT_MS serve para uma
 *  resposta de chat inteira (pode ser minutos); prender a tela do admin
 *  todo esse tempo só para dizer "a chave não funciona" é ruim — o teste
 *  desiste antes. */
const TIMEOUT_TESTE_MS = 30_000;

/** Corte do texto guardado em `lastTestMessage`. Provedor atrás de proxy
 *  às vezes devolve uma página HTML inteira no corpo do erro, e isso não
 *  precisa virar linha gigante no banco. */
const MAX_MENSAGEM_TESTE = 2_000;

const PAGINA_PADRAO_AUDIT = 25;
const MAX_PAGINA_AUDIT = 100;
const MAX_USUARIOS_LISTADOS = 500;

/* ---------------------------------------------------------------------
   Catálogo x enum do banco

   O enum `ProviderKind` do Prisma tem cinco valores (os três provedores
   diretos + Ollama e OpenRouter) e o catálogo descreve os cinco, mas o
   union exportado por providers/types.ts nomeia só os três principais.
   A conversão fica isolada nestas duas funções, para não espalhar `as`
   pelo arquivo.
   ------------------------------------------------------------------ */

type KindDoCatalogo = keyof typeof PROVEDORES;

function comoKindDoCatalogo(kind: ProviderKind): KindDoCatalogo {
  return kind as KindDoCatalogo;
}

function infoDoProvedor(kind: ProviderKind): ProvedorInfo | undefined {
  return PROVEDORES[comoKindDoCatalogo(kind)] as ProvedorInfo | undefined;
}

/* ---------------------------------------------------------------------
   Forma pública de uma configuração
   ------------------------------------------------------------------ */

/** Monta o objeto que a tela recebe.
 *
 *  ATENÇÃO: este mapeamento é escrito campo a campo DE PROPÓSITO — nada
 *  de `...config`. `apiKeyCipher` é justamente um campo da linha, e um
 *  spread faria a credencial cifrada viajar para o navegador na primeira
 *  distração. Coluna nova só aparece na API se alguém a escrever aqui,
 *  que é o comportamento que queremos. */
function emFormaPublica(config: ProviderConfig) {
  return {
    id: config.id,
    provider: config.provider,
    label: config.label,
    model: config.model,
    baseUrl: config.baseUrl,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    systemPrompt: config.systemPrompt,
    isEnabled: config.isEnabled,
    isActive: config.isActive,
    // Booleano em vez do segredo: a tela precisa saber se há chave
    // cadastrada, não qual é — nem cifrada.
    apiKeyConfigurada: Boolean(config.apiKeyCipher),
    apiKeyLast4: config.apiKeyLast4,
    apiKeyUpdatedAt: config.apiKeyUpdatedAt,
    lastTestAt: config.lastTestAt,
    lastTestOk: config.lastTestOk,
    lastTestMessage: config.lastTestMessage,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt
  };
}

/* ---------------------------------------------------------------------
   Validação de entrada
   ------------------------------------------------------------------ */

function ehUrlHttp(valor: string): boolean {
  if (valor.trim().length === 0) return true; // vazio = usar o padrão do catálogo
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const esquemaBaseUrl = z
  .string()
  .trim()
  .max(500, "A URL passou de 500 caracteres.")
  .refine(ehUrlHttp, "Informe uma URL http(s) válida, como http://127.0.0.1:11434.");

const esquemaCriarProvider = z.object({
  provider: z.enum(ProviderKind),
  label: z.string().trim().min(1, "Dê um nome para esta configuração.").max(120, "O nome passou de 120 caracteres."),
  // Texto livre por decisão do catálogo: modelo novo do provedor não
  // deve depender de deploy nosso para ser usado.
  model: z.string().trim().min(1, "Informe o modelo.").max(200, "O id do modelo passou de 200 caracteres."),
  apiKey: z.string().trim().max(500, "A API key passou de 500 caracteres.").optional(),
  baseUrl: esquemaBaseUrl.optional(),
  temperature: z.number().min(0, "A temperatura vai de 0 a 2.").max(2, "A temperatura vai de 0 a 2.").nullable().optional(),
  maxTokens: z.number().int().min(1).max(200_000, "maxTokens passou do teto de 200000.").nullable().optional(),
  systemPrompt: z.string().max(20_000, "O prompt de sistema passou de 20000 caracteres.").nullable().optional(),
  isEnabled: z.boolean().optional()
});

/* `isActive` não entra aqui nem no PATCH: ativar é a rota /activate, que
   é a única que sabe desativar as outras na mesma transação. Deixar o
   campo entrar por aqui abriria caminho para duas configurações ativas. */
const esquemaAtualizarProvider = esquemaCriarProvider.partial();

const esquemaTesteRascunho = z.object({
  provider: z.enum(ProviderKind),
  model: z.string().trim().min(1, "Informe o modelo.").max(200),
  apiKey: z.string().trim().max(500).optional(),
  baseUrl: esquemaBaseUrl.optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxTokens: z.number().int().min(1).max(200_000).nullable().optional(),
  systemPrompt: z.string().max(20_000).nullable().optional()
});

const esquemaAudit = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGINA_AUDIT).default(PAGINA_PADRAO_AUDIT),
  action: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(64).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
});

const esquemaCriarUsuario = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120, "O nome passou de 120 caracteres."),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
  role: z.enum(Role).default(Role.USER)
});

const esquemaId = z.string().trim().min(1, "Id não informado.").max(64);

/* ---------------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------------ */

/** Texto em branco vira null: `""` no banco confunde com "configurado". */
function textoOuNulo(valor: string | null | undefined): string | null {
  const limpo = valor?.trim();
  return limpo ? limpo : null;
}

/** O catálogo é explícito: prompt de sistema vazio faz o modelo responder
 *  como assistente genérico. Campo em branco cai no padrão. */
function promptOuPadrao(valor: string | null | undefined): string {
  return textoOuNulo(valor) ?? SYSTEM_PROMPT_PADRAO;
}

function ehViolacaoDeUnico(erro: unknown): boolean {
  return typeof erro === "object" && erro !== null && (erro as { code?: string }).code === "P2002";
}

/** Tira do texto do provedor qualquer coisa com cara de credencial.
 *
 *  Necessário porque a mensagem de erro de alguns provedores ECOA a chave
 *  enviada (a OpenAI devolve "Incorrect API key provided: sk-..."). Esse
 *  texto vai para a tela do admin, para o banco (`lastTestMessage`) e
 *  para a auditoria — ou seja, exatamente os três lugares onde a regra
 *  diz que a chave não pode aparecer. Redige o valor exato quando o
 *  conhecemos (teste de rascunho) e, de qualquer forma, o que casa com os
 *  formatos conhecidos de chave. */
function semSegredos(texto: string | null | undefined, apiKey?: string): string {
  if (!texto) return "";
  let limpo = String(texto);

  if (apiKey && apiKey.length >= 8) {
    limpo = limpo.split(apiKey).join(mascararSegredo(apiKey));
  }

  // sk-/rk-/gsk-/xai- (OpenAI, Anthropic, OpenRouter, Groq, xAI) e AIza… (Google).
  limpo = limpo.replace(/\b(?:sk|rk|gsk|xai)-[A-Za-z0-9_-]{8,}/g, "••••");
  limpo = limpo.replace(/\bAIza[0-9A-Za-z_-]{16,}/g, "••••");

  return limpo;
}

function cortar(texto: string, limite: number): string {
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}

/* ---------------------------------------------------------------------
   Teste de conexão

   O mesmo caminho serve para a configuração salva e para o rascunho: em
   ambos os casos quem monta o runtime é `resolverProvedor`. Isso é de
   propósito — se o rascunho usasse regras próprias, daria para um teste
   passar e a configuração salva falhar (ou o contrário), que é o pior
   resultado possível para um botão chamado "Testar conexão".
   ------------------------------------------------------------------ */

interface ResultadoTeste {
  resultado: TestConnectionResult;
  erroAdmin?: ReturnType<ReturnType<typeof comoProviderError>["toAdminPayload"]>;
}

async function testarConfiguracao(
  config: ProviderConfig,
  secretBox: SecretBox,
  timeoutMs: number,
  apiKeyConhecida?: string
): Promise<ResultadoTeste> {
  const inicio = Date.now();
  try {
    const { adapter, runtime } = resolverProvedor(config, secretBox, timeoutMs);
    const resultado = await adapter.testConnection(runtime);
    return {
      resultado: { ...resultado, message: semSegredos(resultado.message, apiKeyConhecida) }
    };
  } catch (erro) {
    // O adapter promete não lançar em testConnection, mas o caminho até
    // ele lança: chave ausente, cifra adulterada, ENCRYPTION_KEY trocada.
    const providerError = comoProviderError(erro, comoKindDoCatalogo(config.provider));
    const payload = providerError.toAdminPayload();
    return {
      resultado: {
        ok: false,
        message: semSegredos(providerError.mensagemAdmin, apiKeyConhecida),
        latencyMs: Date.now() - inicio
      },
      erroAdmin: { ...payload, message: semSegredos(payload.message, apiKeyConhecida) }
    };
  }
}

/** Linha de ProviderConfig que existe só na memória, para testar uma
 *  configuração que o admin ainda não salvou. A chave é cifrada aqui e
 *  decifrada logo em seguida pelo `resolverProvedor` — parece rodeio, mas
 *  é o que garante que o rascunho percorra exatamente o mesmo caminho da
 *  configuração salva (inclusive a regra de omitir `temperature` em
 *  modelo que não aceita). Nada disto toca o banco. */
function rascunhoComoConfig(
  dados: z.infer<typeof esquemaTesteRascunho>,
  secretBox: SecretBox
): ProviderConfig {
  const agora = new Date();
  const apiKey = dados.apiKey?.trim() ?? "";

  return {
    id: "rascunho",
    provider: dados.provider,
    label: "Rascunho (não salvo)",
    model: dados.model,
    apiKeyCipher: apiKey ? secretBox.encrypt(apiKey) : null,
    apiKeyLast4: apiKey ? SecretBox.last4(apiKey) : null,
    apiKeyUpdatedAt: apiKey ? agora : null,
    baseUrl: textoOuNulo(dados.baseUrl),
    temperature: dados.temperature ?? null,
    maxTokens: dados.maxTokens ?? null,
    systemPrompt: textoOuNulo(dados.systemPrompt),
    isEnabled: true,
    isActive: false,
    lastTestAt: null,
    lastTestOk: null,
    lastTestMessage: null,
    createdById: null,
    createdAt: agora,
    updatedAt: agora
  };
}

/* ---------------------------------------------------------------------
   Router
   ------------------------------------------------------------------ */

export function criarAdminRouter(env: Env, secretBox: SecretBox): Router {
  const router = Router();
  const requireAuth = criarRequireAuth(env);

  // Prefixo no `use` de propósito: as rotas abaixo declaram o caminho
  // completo, e sem o "/admin" aqui a cadeia rodaria também nas rotas de
  // outros módulos montados no mesmo app.
  router.use("/admin", requireAuth, requireAdmin);

  const timeoutTeste = Math.min(env.PROVIDER_TIMEOUT_MS, TIMEOUT_TESTE_MS);

  /* ----------------------------- catálogo ------------------------- */

  router.get(
    "/admin/catalog",
    asyncHandler(async (_req, res) => {
      // A tela monta os selects a partir daqui em vez de repetir a lista
      // de provedores/modelos no front — fonte única é o catalog.ts.
      res.json({
        provedores: PROVEDORES,
        systemPromptPadrao: SYSTEM_PROMPT_PADRAO,
        temperaturaPadrao: TEMPERATURA_PADRAO,
        maxTokensPadrao: MAX_TOKENS_PADRAO
      });
    })
  );

  /* ---------------------------- listagem -------------------------- */

  router.get(
    "/admin/providers",
    asyncHandler(async (_req, res) => {
      const configs = await prisma.providerConfig.findMany({
        orderBy: [{ isActive: "desc" }, { label: "asc" }]
      });

      // `emFormaPublica` é a fronteira: o campo cifrado (apiKeyCipher) NÃO
      // sai desta rota por decisão de segurança — nem cifrado. Quem
      // precisa do segredo é o servidor, na hora de chamar o provedor.
      res.json({ configs: configs.map(emFormaPublica) });
    })
  );

  /* ------------------------------ criar --------------------------- */

  router.post(
    "/admin/providers",
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const dados = esquemaCriarProvider.parse(req.body);

      const info = infoDoProvedor(dados.provider);
      const apiKey = dados.apiKey?.trim() ?? "";

      if (info?.requerApiKey && !apiKey) {
        throw AppError.requisicaoInvalida(
          `${info.label} exige uma API key.${info.ondeObterChave ? ` Você a obtém em: ${info.ondeObterChave}.` : ""}`
        );
      }

      const criado = await prisma.providerConfig.create({
        data: {
          provider: dados.provider,
          label: dados.label,
          model: dados.model,
          apiKeyCipher: apiKey ? secretBox.encrypt(apiKey) : null,
          apiKeyLast4: apiKey ? SecretBox.last4(apiKey) : null,
          apiKeyUpdatedAt: apiKey ? new Date() : null,
          baseUrl: textoOuNulo(dados.baseUrl),
          temperature: dados.temperature ?? null,
          maxTokens: dados.maxTokens ?? null,
          systemPrompt: promptOuPadrao(dados.systemPrompt),
          isEnabled: dados.isEnabled ?? true,
          // Nasce inativa: quem decide qual responde é a rota /activate,
          // dona da invariante "só uma ativa".
          isActive: false,
          createdById: usuario.id
        }
      });

      await registrarAuditoria({
        userId: usuario.id,
        action: "provider.create",
        targetType: "providerConfig",
        targetId: criado.id,
        provider: criado.provider,
        model: criado.model,
        success: true,
        ip: ipDaRequisicao(req),
        // mascararSegredo em vez da chave: auditoria registra QUE uma
        // credencial foi cadastrada, nunca qual.
        metadata: { label: criado.label, apiKey: mascararSegredo(apiKey), baseUrl: criado.baseUrl }
      });

      res.status(201).json({ config: emFormaPublica(criado) });
    })
  );

  /* ---------------------------- atualizar ------------------------- */

  router.patch(
    "/admin/providers/:id",
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const id = esquemaId.parse(req.params["id"]);
      const dados = esquemaAtualizarProvider.parse(req.body);

      const atual = await prisma.providerConfig.findUnique({ where: { id } });
      if (!atual) throw AppError.naoEncontrado("Configuração de provedor não encontrada.");

      const provider = dados.provider ?? atual.provider;
      const trocouProvedor = provider !== atual.provider;
      const apiKeyNova = dados.apiKey?.trim() ?? "";
      const info = infoDoProvedor(provider);

      // Chave que continua valendo depois desta edição: a nova, se veio;
      // a atual, se o provedor não mudou. Ao TROCAR de provedor a chave
      // guardada é descartada — ela pertence a outro serviço, e mantê-la
      // só serviria para o teste falhar com uma mensagem confusa.
      const temChaveDepois = apiKeyNova.length > 0 || (!trocouProvedor && Boolean(atual.apiKeyCipher));

      if (info?.requerApiKey && !temChaveDepois) {
        throw AppError.requisicaoInvalida(
          trocouProvedor
            ? `Ao trocar para ${info.label}, informe a API key do novo provedor (a anterior não serve).`
            : `${info.label} exige uma API key.`
        );
      }

      // apiKey vazia/ausente MANTÉM a atual: o formulário do admin não tem
      // como reexibir o segredo, então ele volta em branco a cada edição.
      // Tratar branco como "apagar" faria toda edição de rótulo derrubar a
      // credencial.
      const camposDaChave = apiKeyNova
        ? {
            apiKeyCipher: secretBox.encrypt(apiKeyNova),
            apiKeyLast4: SecretBox.last4(apiKeyNova),
            apiKeyUpdatedAt: new Date()
          }
        : trocouProvedor
          ? { apiKeyCipher: null, apiKeyLast4: null, apiKeyUpdatedAt: null }
          : {};

      const data: Prisma.ProviderConfigUpdateInput = { ...camposDaChave };

      if (dados.provider !== undefined) data.provider = dados.provider;
      if (dados.label !== undefined) data.label = dados.label;
      if (dados.model !== undefined) data.model = dados.model;
      if (dados.baseUrl !== undefined) data.baseUrl = textoOuNulo(dados.baseUrl);
      if (dados.temperature !== undefined) data.temperature = dados.temperature;
      if (dados.maxTokens !== undefined) data.maxTokens = dados.maxTokens;
      if (dados.systemPrompt !== undefined) data.systemPrompt = promptOuPadrao(dados.systemPrompt);
      if (dados.isEnabled !== undefined) data.isEnabled = dados.isEnabled;

      // Desabilitar a configuração ativa a tira de ativa: "ativa porém
      // desabilitada" é um estado que o chat não sabe usar.
      const desativouAAtiva = dados.isEnabled === false && atual.isActive;
      if (desativouAAtiva) data.isActive = false;

      const atualizado = await prisma.providerConfig.update({ where: { id }, data });

      await registrarAuditoria({
        userId: usuario.id,
        action: "provider.update",
        targetType: "providerConfig",
        targetId: atualizado.id,
        provider: atualizado.provider,
        model: atualizado.model,
        success: true,
        ip: ipDaRequisicao(req),
        metadata: {
          camposAlterados: Object.keys(data),
          apiKeySubstituida: apiKeyNova.length > 0,
          apiKey: apiKeyNova ? mascararSegredo(apiKeyNova) : null,
          trocouProvedor
        }
      });

      res.json({
        config: emFormaPublica(atualizado),
        ...(desativouAAtiva
          ? { aviso: "A configuração foi desabilitada e por isso deixou de ser a ativa. Ative outra para o chat voltar a responder." }
          : {})
      });
    })
  );

  /* ----------------------------- apagar --------------------------- */

  router.delete(
    "/admin/providers/:id",
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const id = esquemaId.parse(req.params["id"]);

      const alvo = await prisma.providerConfig.findUnique({ where: { id } });
      if (!alvo) throw AppError.naoEncontrado("Configuração de provedor não encontrada.");

      // As mensagens já trocadas NÃO vão junto: o vínculo em Message é
      // SetNull e provider/model ficam desnormalizados lá, justamente para
      // o histórico sobreviver a esta exclusão.
      await prisma.providerConfig.delete({ where: { id } });

      await registrarAuditoria({
        userId: usuario.id,
        action: "provider.delete",
        targetType: "providerConfig",
        targetId: alvo.id,
        provider: alvo.provider,
        model: alvo.model,
        success: true,
        ip: ipDaRequisicao(req),
        metadata: { label: alvo.label, eraAtiva: alvo.isActive }
      });

      res.json({
        ok: true,
        id: alvo.id,
        deixouSemProvedorAtivo: alvo.isActive,
        ...(alvo.isActive
          ? { aviso: "Esta era a configuração ativa. Nenhuma ficou ativa — o chat só volta a responder depois que você ativar outra." }
          : {})
      });
    })
  );

  /* ----------------------------- ativar --------------------------- */

  router.post(
    "/admin/providers/:id/activate",
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const id = esquemaId.parse(req.params["id"]);

      // Transação porque "só uma ativa" é invariante: se o desligar das
      // outras passasse e o ligar desta falhasse (ou vice-versa), o
      // sistema ficaria sem provedor ou com dois. O rollback ao lançar o
      // 404 aqui dentro é intencional pelo mesmo motivo.
      const ativado = await prisma.$transaction(async (tx) => {
        const alvo = await tx.providerConfig.findUnique({ where: { id } });
        if (!alvo) throw AppError.naoEncontrado("Configuração de provedor não encontrada.");

        await tx.providerConfig.updateMany({
          where: { isActive: true, id: { not: id } },
          data: { isActive: false }
        });

        // `isEnabled: true` junto: ativar uma configuração desabilitada é
        // um pedido claro de "use esta", e deixar o par inconsistente só
        // renderia um chat mudo sem explicação.
        return tx.providerConfig.update({
          where: { id },
          data: { isActive: true, isEnabled: true }
        });
      });

      await registrarAuditoria({
        userId: usuario.id,
        action: "provider.activate",
        targetType: "providerConfig",
        targetId: ativado.id,
        provider: ativado.provider,
        model: ativado.model,
        success: true,
        ip: ipDaRequisicao(req),
        metadata: { label: ativado.label }
      });

      res.json({ config: emFormaPublica(ativado) });
    })
  );

  /* ------------------------ testar (salva) ------------------------ */

  router.post(
    "/admin/providers/:id/test",
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const id = esquemaId.parse(req.params["id"]);

      const config = await prisma.providerConfig.findUnique({ where: { id } });
      if (!config) throw AppError.naoEncontrado("Configuração de provedor não encontrada.");

      const { resultado, erroAdmin } = await testarConfiguracao(config, secretBox, timeoutTeste);
      const mensagem = cortar(resultado.message, MAX_MENSAGEM_TESTE);

      const atualizado = await prisma.providerConfig.update({
        where: { id },
        data: { lastTestAt: new Date(), lastTestOk: resultado.ok, lastTestMessage: mensagem }
      });

      await registrarAuditoria({
        userId: usuario.id,
        action: "provider.test",
        targetType: "providerConfig",
        targetId: config.id,
        provider: config.provider,
        model: config.model,
        success: resultado.ok,
        ip: ipDaRequisicao(req),
        metadata: { latencyMs: resultado.latencyMs, mensagem, codigo: erroAdmin?.code ?? null }
      });

      // 200 mesmo quando o teste falha: a REQUISIÇÃO do admin funcionou, o
      // que falhou foi o provedor. Devolver 4xx/5xx aqui faria o front
      // tratar como "o painel caiu" em vez de mostrar o diagnóstico.
      res.json({
        ok: resultado.ok,
        message: mensagem,
        latencyMs: resultado.latencyMs,
        ...(resultado.model ? { model: resultado.model } : {}),
        // Payload de ADMIN: pode trazer o texto cru do provedor (é o que
        // resolve o chamado), já passado pelo filtro de credenciais.
        ...(erroAdmin ? { erro: erroAdmin } : {}),
        config: emFormaPublica(atualizado)
      });
    })
  );

  /* ------------------------ testar (rascunho) --------------------- */

  router.post(
    "/admin/providers/test-draft",
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const dados = esquemaTesteRascunho.parse(req.body);

      const info = infoDoProvedor(dados.provider);
      const apiKey = dados.apiKey?.trim() ?? "";

      if (info?.requerApiKey && !apiKey) {
        throw AppError.requisicaoInvalida(`${info.label} exige uma API key para o teste.`);
      }

      // Nada é gravado: o objetivo é saber se a chave funciona ANTES de
      // salvar, para não deixar credencial inválida no banco.
      const config = rascunhoComoConfig(dados, secretBox);
      const { resultado, erroAdmin } = await testarConfiguracao(config, secretBox, timeoutTeste, apiKey);
      const mensagem = cortar(resultado.message, MAX_MENSAGEM_TESTE);

      // Não há linha de ProviderConfig para apontar, mas o teste consome
      // cota do provedor e é feito com uma credencial: fica registrado
      // quem testou o quê, marcado como rascunho.
      await registrarAuditoria({
        userId: usuario.id,
        action: "provider.test",
        targetType: "providerConfigRascunho",
        provider: dados.provider,
        model: dados.model,
        success: resultado.ok,
        ip: ipDaRequisicao(req),
        metadata: {
          rascunho: true,
          latencyMs: resultado.latencyMs,
          mensagem,
          apiKey: mascararSegredo(apiKey),
          codigo: erroAdmin?.code ?? null
        }
      });

      res.json({
        ok: resultado.ok,
        message: mensagem,
        latencyMs: resultado.latencyMs,
        ...(resultado.model ? { model: resultado.model } : {}),
        ...(erroAdmin ? { erro: erroAdmin } : {})
      });
    })
  );

  /* ---------------------------- auditoria ------------------------- */

  router.get(
    "/admin/audit",
    asyncHandler(async (req, res) => {
      const filtros = esquemaAudit.parse(req.query);

      const where: Prisma.AuditLogWhereInput = {};
      if (filtros.action) where.action = filtros.action;
      if (filtros.userId) where.userId = filtros.userId;
      if (filtros.from || filtros.to) {
        where.createdAt = {
          ...(filtros.from ? { gte: filtros.from } : {}),
          ...(filtros.to ? { lte: filtros.to } : {})
        };
      }

      // Contagem e página na mesma transação para o total não descrever um
      // estado diferente do da lista quando algo é gravado no meio.
      const [total, items] = await prisma.$transaction([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (filtros.page - 1) * filtros.pageSize,
          take: filtros.pageSize,
          include: { user: { select: { id: true, name: true, email: true } } }
        })
      ]);

      res.json({
        items,
        page: filtros.page,
        pageSize: filtros.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filtros.pageSize))
      });
    })
  );

  /* ----------------------------- usuários ------------------------- */

  router.get(
    "/admin/users",
    asyncHandler(async (_req, res) => {
      const users = await prisma.user.findMany({
        orderBy: [{ name: "asc" }],
        take: MAX_USUARIOS_LISTADOS,
        // `select` explícito: passwordHash não tem por que sair do banco,
        // muito menos chegar ao navegador. tokenVersion também fica —
        // é detalhe interno de revogação de sessão.
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({ users });
    })
  );

  router.post(
    "/admin/users",
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const dados = esquemaCriarUsuario.parse(req.body);

      const problema = validarForcaSenha(dados.senha);
      if (problema) throw AppError.requisicaoInvalida(problema);

      const jaExiste = await prisma.user.findUnique({ where: { email: dados.email }, select: { id: true } });
      if (jaExiste) throw AppError.conflito("Já existe um usuário com este e-mail.");

      const passwordHash = await hashSenha(dados.senha);

      let criado;
      try {
        criado = await prisma.user.create({
          data: { name: dados.name, email: dados.email, passwordHash, role: dados.role },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true
          }
        });
      } catch (erro) {
        // Duas criações simultâneas com o mesmo e-mail passam pela
        // verificação acima e só colidem aqui, no índice único.
        if (ehViolacaoDeUnico(erro)) throw AppError.conflito("Já existe um usuário com este e-mail.");
        throw erro;
      }

      await registrarAuditoria({
        userId: usuario.id,
        action: "user.create",
        targetType: "user",
        targetId: criado.id,
        success: true,
        ip: ipDaRequisicao(req),
        // E-mail e papel ficam registrados (é o que serve para investigar
        // "quem criou esse acesso"); a senha, jamais — nem o hash.
        metadata: { email: criado.email, role: criado.role }
      });

      res.status(201).json({ user: criado });
    })
  );

  /* ---------------------------------------------------------------
     Base de conhecimento

     A busca na base acontece a cada mensagem do chat, então ligar e
     desligar precisa ser possível com o sistema no ar — por isso a
     configuração mora na tabela `settings`, e não no .env.
     --------------------------------------------------------------- */

  router.get(
    "/admin/knowledge",
    asyncHandler(async (_req, res) => {
      const [estatisticas, configuracao, amostra] = await Promise.all([
        estatisticasDaBase(),
        configuracaoDaBase(),
        // Amostra só para a tela mostrar o que entrou; o conteúdo
        // inteiro não vai por HTTP — são ~80 mil caracteres.
        prisma.knowledgeDoc.findMany({
          orderBy: [{ source: "asc" }, { title: "asc" }],
          select: { id: true, source: true, title: true, category: true, url: true, charCount: true, indexedAt: true },
          take: 200
        })
      ]);

      res.json({ estatisticas, configuracao, documentos: amostra });
    })
  );

  router.patch(
    "/admin/knowledge/config",
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const corpo = z
        .object({ ativo: z.boolean().optional(), trechos: z.number().int().min(1).max(8).optional() })
        .parse(req.body ?? {});

      const configuracao = await salvarConfiguracaoDaBase(corpo);

      await registrarAuditoria({
        userId: usuario.id,
        action: "knowledge.config",
        success: true,
        ip: ipDaRequisicao(req),
        metadata: { ...corpo }
      });

      res.json({ configuracao });
    })
  );

  router.post(
    "/admin/knowledge/reindex",
    asyncHandler(async (req, res) => {
      const usuario = usuarioDaRequisicao(req);
      const inicio = Date.now();

      try {
        const resultado = await importarBase();
        const duracaoMs = Date.now() - inicio;

        await registrarAuditoria({
          userId: usuario.id,
          action: "knowledge.reindex",
          success: true,
          ip: ipDaRequisicao(req),
          metadata: { ...resultado, duracaoMs }
        });

        res.json({ ...resultado, duracaoMs, estatisticas: await estatisticasDaBase() });
      } catch (falha) {
        await registrarAuditoria({
          userId: usuario.id,
          action: "knowledge.reindex",
          success: false,
          ip: ipDaRequisicao(req),
          metadata: { erro: falha instanceof Error ? falha.message : String(falha) }
        });
        throw falha;
      }
    })
  );

  return router;
}
