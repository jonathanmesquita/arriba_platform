/* =====================================================================
   Cliente HTTP — o único lugar do front que chama a API

   Três coisas moram aqui, e nenhuma delas deve ser reescrita em tela:

   1. `credentials: "include"` em TODA requisição. A sessão é um cookie
      HttpOnly emitido pelo servidor: o JavaScript não consegue lê-lo nem
      reenviá-lo à mão, então basta esquecer essa opção em um fetch para
      aquela chamada sair sem sessão e voltar 401.

   2. Tradução do erro. O servidor responde sempre no mesmo formato
      ({ error: "CODIGO", message: "frase em pt-BR", ... }, ver
      server/src/http/errors.ts). Aqui isso vira um `ApiError` com
      `.code` (estável, para decidir) e `.message` (para mostrar).

   3. Quem decide que "a sessão caiu". Esta é a parte delicada. No
      support-copilot, tratar todo 401 como sessão expirada jogava o
      usuário na tela de login por erro de terceiro. Aqui o servidor já
      separa os casos: sessão morta é `NAO_AUTENTICADO` (401), login com
      senha errada é `CREDENCIAIS_INVALIDAS` (401) e falha do provedor de
      IA é 502/503 — nunca 401. Então só o primeiro caso derruba a
      sessão, e o próprio login pede para ser ignorado
      (`ignorarSessaoExpirada`).

   Não há import de React neste arquivo de propósito: o contexto de
   autenticação se registra em `definirAoPerderSessao()`. Se o cliente
   importasse o contexto e o contexto importasse o cliente, o ciclo
   apareceria como `undefined` em tempo de execução.
   ===================================================================== */

/** Prefixo de todas as rotas. Em dev o Vite faz proxy de /api para o
 *  servidor (ver vite.config.ts); em produção os dois ficam no mesmo
 *  domínio. Caminho relativo nos dois casos — é o que mantém o cookie
 *  SameSite=Lax funcionando sem CORS. */
const BASE = "/api";

/** Códigos 401 que NÃO são sessão caída. Hoje só um: e-mail/senha
 *  errados no login — quem está na tela de login não tinha sessão para
 *  perder. Qualquer outro 401 vem do middleware de autenticação
 *  (`NAO_AUTENTICADO`) e significa sessão morta. Se o servidor ganhar um
 *  novo 401 que não seja sessão, registre o código aqui. */
const CODIGOS_401_SEM_SESSAO = new Set(["CREDENCIAIS_INVALIDAS"]);

export type MetodoHttp = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Falha vinda da API (ou da rede) já em forma de UI: `code` para o
 *  código decidir, `message` em pt-BR para a tela mostrar. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  /** Detalhe opcional que a API mandou (ex.: `campos` de validação do
   *  Zod). Nunca contém segredo — o servidor não devolve API key. */
  readonly detalhes?: unknown;

  constructor(params: { code: string; status: number; message: string; detalhes?: unknown }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    if (params.detalhes !== undefined) this.detalhes = params.detalhes;
  }

  /** A requisição foi abortada por nós (usuário cancelou, tela
   *  desmontou). Vale checar antes de mostrar erro na tela. */
  get cancelado(): boolean {
    return this.code === "CANCELADO";
  }
}

export interface OpcoesRequisicao {
  metodo?: MetodoHttp;
  /** Serializado como JSON. Omita em GET/DELETE sem corpo. */
  corpo?: unknown;
  signal?: AbortSignal;
  /** Não derruba a sessão em caso de 401. Usado pelo próprio
   *  /auth/login e pelo /auth/me da montagem — nos dois o 401 é
   *  resposta esperada, não sessão perdida. */
  ignorarSessaoExpirada?: boolean;
}

type AoPerderSessao = () => void;

let aoPerderSessao: AoPerderSessao | null = null;

/** O contexto de autenticação registra aqui o que fazer quando qualquer
 *  chamada descobrir que a sessão morreu (limpar o usuário e voltar para
 *  o login). Passe `null` para desregistrar ao desmontar. */
export function definirAoPerderSessao(callback: AoPerderSessao | null): void {
  aoPerderSessao = callback;
}

function ehAbort(erro: unknown): boolean {
  return erro instanceof DOMException && erro.name === "AbortError";
}

function erroDeRede(): ApiError {
  return new ApiError({
    code: "REDE",
    status: 0,
    message: "Não consegui falar com o servidor. Verifique a conexão e tente de novo."
  });
}

function erroCancelado(): ApiError {
  return new ApiError({ code: "CANCELADO", status: 0, message: "Requisição cancelada." });
}

/** Lê o corpo de uma resposta de erro sem nunca estourar: um 502 do
 *  proxy chega em HTML, e `res.json()` em cima disso lançaria um erro de
 *  parse no lugar do erro de verdade. */
async function corpoDeErro(res: Response): Promise<{ code: string; message: string; detalhes?: unknown }> {
  const generico = {
    code: `HTTP_${res.status}`,
    message: "Algo deu errado por aqui. Tente de novo em instantes."
  };

  let texto: string;
  try {
    texto = await res.text();
  } catch {
    return generico;
  }
  if (!texto.trim()) return generico;

  try {
    const dados = JSON.parse(texto) as {
      error?: unknown;
      message?: unknown;
      campos?: unknown;
      detalhes?: unknown;
    };
    const code = typeof dados.error === "string" ? dados.error : generico.code;
    const message = typeof dados.message === "string" ? dados.message : generico.message;
    const detalhes = dados.campos ?? dados.detalhes;
    return detalhes === undefined ? { code, message } : { code, message, detalhes };
  } catch {
    // Corpo que não é JSON (HTML de proxy, texto de gateway). O conteúdo
    // não vai para a tela: pode trazer host interno e nome de serviço.
    return generico;
  }
}

/** Decide se este 401 significa "sua sessão acabou" e, se sim, avisa o
 *  contexto de autenticação uma única vez. */
function tratarPossivelFimDeSessao(status: number, code: string, ignorar: boolean | undefined): void {
  if (status !== 401 || ignorar) return;
  // 401 sem código legível (corpo em HTML de proxy, por exemplo) também
  // conta: deixar a tela operando com sessão morta é pior do que pedir
  // um login a mais.
  if (CODIGOS_401_SEM_SESSAO.has(code)) return;
  aoPerderSessao?.();
}

/**
 * Helper único de fetch. Devolve o JSON já tipado (`T`) e lança
 * `ApiError` em qualquer falha — de validação, de sessão, de rede.
 */
export async function api<T>(caminho: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
  const { metodo = "GET", corpo, signal, ignorarSessaoExpirada } = opcoes;

  const init: RequestInit = {
    method: metodo,
    // O ponto que não pode faltar em nenhuma chamada.
    credentials: "include",
    headers: { Accept: "application/json" }
  };
  if (signal) init.signal = signal;
  if (corpo !== undefined) {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = JSON.stringify(corpo);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${caminho}`, init);
  } catch (erro) {
    throw ehAbort(erro) ? erroCancelado() : erroDeRede();
  }

  if (!res.ok) {
    const { code, message, detalhes } = await corpoDeErro(res);
    tratarPossivelFimDeSessao(res.status, code, ignorarSessaoExpirada);
    throw new ApiError({ code, status: res.status, message, detalhes });
  }

  // 204 e afins não têm corpo; `res.json()` ali lançaria.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  try {
    return (await res.json()) as T;
  } catch (erro) {
    if (ehAbort(erro)) throw erroCancelado();
    throw new ApiError({
      code: "RESPOSTA_INVALIDA",
      status: res.status,
      message: "O servidor respondeu em um formato inesperado."
    });
  }
}

export const apiGet = <T,>(caminho: string, opcoes: Omit<OpcoesRequisicao, "metodo" | "corpo"> = {}): Promise<T> =>
  api<T>(caminho, { ...opcoes, metodo: "GET" });

export const apiPost = <T,>(caminho: string, corpo?: unknown, opcoes: Omit<OpcoesRequisicao, "metodo" | "corpo"> = {}): Promise<T> =>
  api<T>(caminho, { ...opcoes, metodo: "POST", ...(corpo === undefined ? {} : { corpo }) });

export const apiPatch = <T,>(caminho: string, corpo?: unknown, opcoes: Omit<OpcoesRequisicao, "metodo" | "corpo"> = {}): Promise<T> =>
  api<T>(caminho, { ...opcoes, metodo: "PATCH", ...(corpo === undefined ? {} : { corpo }) });

export const apiDelete = <T,>(caminho: string, opcoes: Omit<OpcoesRequisicao, "metodo" | "corpo"> = {}): Promise<T> =>
  api<T>(caminho, { ...opcoes, metodo: "DELETE" });

/* =====================================================================
   Streaming da resposta do chat (SSE lido por fetch)
   ===================================================================== */

/** Primeiro evento: quem vai responder — e com que apoio. */
export interface MetaDoStream {
  conversationId: string;
  title: string;
  userMessageId: string;
  provider: string;
  providerLabel?: string | null;
  model: string;
  /** Documentos da base interna que entraram no contexto. Chega no
   *  `meta` (e não no `done`) para a tela poder mostrar a origem
   *  enquanto a resposta ainda está sendo escrita. */
  fontes?: { numero: number; id: string; title: string; url: string | null; source: string }[];
  /** false = a consulta à base está desligada pelo admin. */
  baseConsultada?: boolean;
}

/** Último evento do caminho feliz. */
export interface FimDoStream {
  messageId: string;
  createdAt?: string;
  usage?: { promptTokens: number | null; completionTokens: number | null };
  latencyMs?: number;
  provider?: string;
  model?: string;
}

/** O servidor mandou `error`: a resposta falhou no meio (ou nem
 *  começou). Já vem com frase pronta para o usuário. */
export interface ErroDoStream {
  code: string;
  message: string;
  retryable?: boolean;
  /** Id da mensagem parcial que o servidor gravou, se conseguiu gravar. */
  messageId?: string | null;
  /** Havia texto antes de falhar (a tela pode manter o que apareceu). */
  textoParcial?: boolean;
}

export interface ManipuladoresDoStream {
  meta?: (dados: MetaDoStream) => void;
  /** Recebe o texto do pedaço já desembrulhado (o evento na rede é
   *  `delta { text }`; aqui chega só a string, que é o que a tela
   *  concatena). */
  delta?: (texto: string) => void;
  done?: (dados: FimDoStream) => void;
  /** Erro de protocolo, vindo como evento. NÃO é exceção: o stream
   *  termina normalmente depois dele. Falha ANTES do stream abrir (sem
   *  sessão, conversa inexistente, provedor não configurado) sai como
   *  `ApiError` lançado por esta função. */
  error?: (dados: ErroDoStream) => void;
}

/**
 * Envia a mensagem e consome a resposta em streaming.
 *
 * Por que fetch e não `EventSource`: o EventSource só faz GET e não
 * manda corpo nem cabeçalho — e aqui é um POST com o texto da mensagem.
 * Ele também reconecta sozinho, o que neste caso seria um desastre:
 * reconexão silenciosa reenviaria a mensagem e geraria (e cobraria)
 * outra resposta. Com fetch + ReadableStream nós controlamos os dois.
 */
export async function abrirStreamDeMensagem(
  conversaId: string,
  conteudo: string,
  handlers: ManipuladoresDoStream,
  signal?: AbortSignal
): Promise<void> {
  const init: RequestInit = {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    // O campo do corpo se chama `content` — é o nome que o esquema do
    // servidor valida (server/src/chat/routes.ts).
    body: JSON.stringify({ content: conteudo })
  };
  if (signal) init.signal = signal;

  let res: Response;
  try {
    res = await fetch(`${BASE}/chat/conversations/${encodeURIComponent(conversaId)}/messages`, init);
  } catch (erro) {
    if (ehAbort(erro)) return; // cancelar não é falha: nada a mostrar.
    throw erroDeRede();
  }

  // Tudo que pode dar errado com resposta normal (validação, 404, 401,
  // provedor sem configuração) acontece ANTES de o servidor abrir o
  // stream — então ainda chega como JSON com status de erro.
  if (!res.ok) {
    const { code, message, detalhes } = await corpoDeErro(res);
    tratarPossivelFimDeSessao(res.status, code, false);
    throw new ApiError({ code, status: res.status, message, detalhes });
  }

  if (!res.body) {
    throw new ApiError({
      code: "SEM_STREAM",
      status: res.status,
      message: "O servidor não enviou a resposta em streaming."
    });
  }

  const leitor = res.body.getReader();
  const decodificador = new TextDecoder("utf-8");
  // O buffer vive FORA do laço de propósito: a rede corta o fluxo onde
  // quiser, e um evento pode chegar partido em dois pedaços (metade num
  // chunk, metade no seguinte). Processar chunk a chunk perderia
  // exatamente esses eventos.
  let buffer = "";

  const consumirBlocosCompletos = (): void => {
    let corte = buffer.indexOf("\n\n");
    while (corte !== -1) {
      const bloco = buffer.slice(0, corte);
      buffer = buffer.slice(corte + 2);
      despachar(bloco, handlers);
      corte = buffer.indexOf("\n\n");
    }
  };

  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      // `stream: true` para não quebrar caractere multibyte (acento,
      // emoji) que caia na fronteira entre dois chunks.
      buffer += normalizarQuebras(decodificador.decode(value, { stream: true }));
      consumirBlocosCompletos();
    }
    buffer += normalizarQuebras(decodificador.decode());
    consumirBlocosCompletos();
  } catch (erro) {
    if (ehAbort(erro) || signal?.aborted) return;
    throw erroDeRede();
  } finally {
    // Se saímos no meio (erro, cancelamento), soltar o corpo evita
    // deixar a conexão pendurada.
    try {
      await leitor.cancel();
    } catch {
      /* já estava fechado */
    }
  }
}

/** SSE separa eventos por linha em branco, e a linha pode terminar em
 *  "\r\n" dependendo de quem está no meio do caminho. Normalizar na
 *  entrada deixa o resto do parser trabalhar só com "\n". */
function normalizarQuebras(texto: string): string {
  return texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function despachar(bloco: string, handlers: ManipuladoresDoStream): void {
  let evento = "message";
  const linhasDeDados: string[] = [];

  for (const linha of bloco.split("\n")) {
    // Linha iniciada por ":" é comentário — é o keep-alive que o
    // servidor manda a cada 15 s para o proxy não derrubar a conexão.
    if (linha === "" || linha.startsWith(":")) continue;

    const separador = linha.indexOf(":");
    const campo = separador === -1 ? linha : linha.slice(0, separador);
    let valor = separador === -1 ? "" : linha.slice(separador + 1);
    if (valor.startsWith(" ")) valor = valor.slice(1);

    if (campo === "event") evento = valor;
    else if (campo === "data") linhasDeDados.push(valor);
  }

  if (linhasDeDados.length === 0) return;

  let dados: unknown;
  try {
    dados = JSON.parse(linhasDeDados.join("\n"));
  } catch {
    // Evento ilegível não pode derrubar o resto da resposta.
    console.warn("[stream] evento SSE com JSON inválido foi ignorado.");
    return;
  }

  switch (evento) {
    case "meta":
      handlers.meta?.(dados as MetaDoStream);
      return;
    case "delta": {
      const texto = (dados as { text?: unknown }).text;
      if (typeof texto === "string" && texto.length > 0) handlers.delta?.(texto);
      return;
    }
    case "done":
      handlers.done?.(dados as FimDoStream);
      return;
    case "error":
      handlers.error?.(dados as ErroDoStream);
      return;
    default:
      // Evento novo criado no servidor: ignorar é o comportamento certo,
      // não quebrar a tela.
      return;
  }
}
