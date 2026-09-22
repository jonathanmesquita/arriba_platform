/* =====================================================================
   Tipos das respostas da API, do ponto de vista da tela

   Estes tipos descrevem o JSON que o servidor devolve — não os modelos do
   Prisma. É de propósito: o navegador só conhece o que a API resolveu
   expor (em ProviderConfig, por exemplo, não existe `apiKeyCipher`, e sim
   `apiKeyConfigurada` + `apiKeyLast4`).

   Datas chegam como string ISO (JSON não tem Date). Quem formata é
   `formatarDataHora`, em http.ts.
   ===================================================================== */

export type PapelUsuario = "ADMIN" | "USER";

/** Os cinco valores do enum do banco. O catálogo descreve todos eles. */
export type ProviderKind = "ANTHROPIC" | "OPENAI" | "GEMINI" | "OLLAMA" | "OPENROUTER";

export type PapelMensagem = "USER" | "ASSISTANT" | "SYSTEM";

/* ------------------------------ chat ------------------------------ */

export interface ResumoConversa {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  totalMensagens: number;
}

export interface MensagemSalva {
  id: string;
  role: PapelMensagem;
  content: string;
  provider?: ProviderKind | null;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  latencyMs?: number | null;
  /** Preenchidos quando aquela resposta falhou; o texto parcial fica em
   *  `content`, para o usuário ver onde parou. */
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface ConversaCompleta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: MensagemSalva[];
}

/* ------------------------- eventos do SSE -------------------------
   Os quatro eventos do contrato do backend (meta/delta/done/error).
   Todos os campos são opcionais aqui de propósito: estes tipos são o
   PARÂMETRO dos nossos handlers, e um parâmetro mais frouxo aceita
   qualquer payload que o client.ts entregue — o contrário (exigir campo
   que o client não declara) quebraria a compilação à toa.
   ------------------------------------------------------------------ */

export interface MetaDoStream {
  conversationId?: string;
  title?: string | null;
  userMessageId?: string;
  provider?: string | null;
  providerLabel?: string | null;
  model?: string | null;
}

export interface DeltaDoStream {
  text?: string;
}

export interface DoneDoStream {
  messageId?: string | null;
  createdAt?: string;
  usage?: { promptTokens?: number | null; completionTokens?: number | null } | null;
  latencyMs?: number | null;
  provider?: string | null;
  model?: string | null;
}

export interface ErroDoStream {
  code?: string;
  message?: string;
  retryable?: boolean;
  messageId?: string | null;
  textoParcial?: boolean;
}

/* ----------------------------- catálogo --------------------------- */

export interface ModeloSugerido {
  id: string;
  label: string;
  /** false = mandar `temperature` faz o provedor devolver HTTP 400. */
  supportsTemperature: boolean;
  nota?: string;
}

export interface ProvedorInfo {
  kind: ProviderKind;
  label: string;
  requerApiKey: boolean;
  requerBaseUrl: boolean;
  baseUrlPadrao?: string;
  ondeObterChave?: string;
  descricao: string;
  modelos: ModeloSugerido[];
}

export interface Catalogo {
  /** Parcial porque o acesso por chave é indexado: com
   *  `noUncheckedIndexedAccess` o resultado já vem como possivelmente
   *  indefinido, que é o tratamento honesto para um provedor novo no
   *  banco que o catálogo ainda não descreve. */
  provedores: Partial<Record<ProviderKind, ProvedorInfo>>;
  systemPromptPadrao: string;
  temperaturaPadrao?: number;
  maxTokensPadrao?: number;
}

/* ---------------------------- provedores -------------------------- */

export interface ConfigPublica {
  id: string;
  provider: ProviderKind;
  label: string;
  model: string;
  baseUrl: string | null;
  temperature: number | null;
  maxTokens: number | null;
  systemPrompt: string | null;
  isEnabled: boolean;
  isActive: boolean;
  /** A chave em si nunca chega aqui — só se existe e os 4 últimos dígitos. */
  apiKeyConfigurada: boolean;
  apiKeyLast4: string | null;
  apiKeyUpdatedAt: string | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ErroDeProvedorAdmin {
  code: string;
  provider?: string;
  message: string;
  httpStatus?: number | null;
  retryAfterSeconds?: number | null;
  retryable?: boolean;
}

export interface RespostaTeste {
  ok: boolean;
  message: string;
  latencyMs: number;
  model?: string;
  erro?: ErroDeProvedorAdmin;
  /** Só vem no teste da configuração salva (que grava o resultado). */
  config?: ConfigPublica;
}

/* ---------------------------- auditoria --------------------------- */

export interface ItemAuditoria {
  id: string;
  userId: string | null;
  user: { id: string; name: string; email: string } | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  provider: ProviderKind | null;
  model: string | null;
  conversationId: string | null;
  success: boolean;
  metadata: unknown;
  ip: string | null;
  createdAt: string;
}

export interface PaginaAuditoria {
  items: ItemAuditoria[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* ----------------------------- usuários --------------------------- */

export interface UsuarioAdmin {
  id: string;
  email: string;
  name: string;
  role: PapelUsuario;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
