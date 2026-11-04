/* =====================================================================
   Regras do chat que não são HTTP

   Separado de routes.ts de propósito: aqui não existe `req`, `res` nem
   SSE. São as três decisões que o chat toma antes de falar com o
   provedor — qual configuração usar, que histórico mandar junto e como
   nomear a conversa —, e cada uma delas tem um porquê que vale escrever.
   ===================================================================== */

import type { Conversation, ProviderConfig } from "../../generated/prisma/client.js";
import { prisma } from "../db.js";
import { AppError } from "../http/errors.js";
import type { ChatMessage } from "../providers/types.js";

/** Configuração de provedor que o chat deve usar agora.
 *
 *  `isActive` é a escolha do admin ("é esta que responde") e `isEnabled`
 *  é o interruptor de manutenção ("esta configuração pode ser usada").
 *  Os dois precisam valer: desligar uma configuração ativa tem de tirar
 *  o chat do ar em vez de continuar chamando o provedor.
 *
 *  Sem provedor ativo a resposta é 409 (conflito de estado), não 500: o
 *  servidor está funcionando, o que falta é configuração — e quem
 *  resolve é o admin, então a mensagem diz isso em vez de "erro interno". */
export async function obterProvedorAtivo(): Promise<ProviderConfig> {
  const config = await prisma.providerConfig.findFirst({
    where: { isActive: true, isEnabled: true },
    // O schema garante "só uma ativa" por transação no admin, não por
    // constraint do banco. Se duas escaparem, a mais recente vence — é
    // o desfecho menos surpreendente para quem acabou de salvar.
    orderBy: { updatedAt: "desc" }
  });

  if (!config) {
    throw new AppError(
      409,
      "PROVEDOR_NAO_CONFIGURADO",
      "Nenhum provedor de IA está ativo. Um administrador precisa cadastrar e ativar um provedor na área de administração antes de usar o chat."
    );
  }

  return config;
}

/** Histórico que viaja junto com a próxima pergunta.
 *
 *  O limite NÃO é economia de rede: a conversa inteira é reenviada a
 *  cada mensagem (as APIs de chat não têm memória do lado delas), e isso
 *  cobra em dois lugares.
 *
 *  1. Janela de contexto: o modelo não presta a mesma atenção em tudo ao
 *     mesmo tempo. Histórico gigante empurra a instrução do sistema e o
 *     assunto atual para o meio do texto, onde o modelo erra mais — e,
 *     passando da janela, a chamada volta com CONTEXT_LENGTH.
 *  2. Custo: a n-ésima mensagem paga o token de todas as anteriores. Com
 *     histórico ilimitado, o custo de uma conversa cresce ao quadrado do
 *     número de mensagens.
 *
 *  Por isso vai uma janela deslizante das últimas N (env.CHAT_HISTORY_LIMIT).
 *
 *  Duas exclusões deliberadas na consulta:
 *  - `role: SYSTEM` fica fora. A instrução de sistema vem da
 *    ProviderConfig e é entregue pelo campo próprio de cada API
 *    (ver ProviderRuntimeConfig.systemPrompt), não como mensagem.
 *  - mensagem com `errorCode` fica fora. Ela existe no histórico para o
 *    usuário ver o que aconteceu, mas reenviá-la ao modelo ensinaria o
 *    assistente a imitar as próprias falhas. */
export async function montarHistorico(conversationId: string, limite: number): Promise<ChatMessage[]> {
  const registros = await prisma.message.findMany({
    where: {
      conversationId,
      role: { in: ["USER", "ASSISTANT"] },
      errorCode: null,
      content: { not: "" }
    },
    // Ordem decrescente + take pega as ÚLTIMAS N; a ordem cronológica é
    // restaurada no reverse() abaixo. Ordenar crescente e cortar traria
    // as primeiras, que é o oposto do que se quer.
    orderBy: { createdAt: "desc" },
    take: Math.max(1, limite),
    select: { role: true, content: true }
  });

  const historico = registros
    .reverse()
    .map<ChatMessage>((registro) => ({
      role: registro.role === "ASSISTANT" ? "assistant" : "user",
      content: registro.content
    }));

  // A janela pode começar numa resposta do assistente (a pergunta que a
  // originou caiu fora do corte). Anthropic e Gemini recusam histórico
  // que abre com "assistant", então o trecho órfão é descartado.
  while (historico.length > 0 && historico[0]?.role === "assistant") {
    historico.shift();
  }

  return historico;
}

const TAMANHO_TITULO = 48;

/** Título da conversa a partir da primeira mensagem.
 *
 *  Nome de conversa é item de lista lateral: precisa caber numa linha e
 *  não pode quebrar o layout com um texto colado de várias linhas. Por
 *  isso toda sequência de espaço/quebra vira um espaço só antes do corte. */
export function tituloDaConversa(primeiraMensagem: string): string {
  const limpo = String(primeiraMensagem ?? "").replace(/\s+/g, " ").trim();
  if (!limpo) return "Nova conversa";
  if (limpo.length <= TAMANHO_TITULO) return limpo;
  return `${limpo.slice(0, TAMANHO_TITULO).trimEnd()}…`;
}

/** Conversa do usuário logado, ou nada.
 *
 *  O filtro por `userId` está aqui, e não no chamador, para que seja
 *  impossível esquecer: o id da URL é palpite de quem chamou, e sem o
 *  dono na cláusula qualquer usuário autenticado leria a conversa de
 *  qualquer outro só trocando o cuid. */
export async function conversaDoUsuario(conversationId: string, userId: string): Promise<Conversation | null> {
  return prisma.conversation.findFirst({ where: { id: conversationId, userId } });
}
