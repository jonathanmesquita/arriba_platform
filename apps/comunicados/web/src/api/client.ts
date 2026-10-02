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

export const apiPut = <T,>(caminho: string, corpo?: unknown, opcoes: Omit<OpcoesRequisicao, "metodo" | "corpo"> = {}): Promise<T> =>
  api<T>(caminho, { ...opcoes, metodo: "PUT", ...(corpo === undefined ? {} : { corpo }) });

/** Upload de anexo: FormData não pode levar Content-Type definido à mão —
 *  o navegador precisa escrever o boundary. Por isso não passa pelo
 *  helper comum. */
export async function apiUpload<T>(caminho: string, arquivo: File, campo = "arquivo"): Promise<T> {
  const corpo = new FormData();
  corpo.append(campo, arquivo);

  const res = await fetch(`/api${caminho}`, { method: "POST", credentials: "include", body: corpo });
  if (!res.ok) {
    const texto = await res.text();
    let mensagem = "Não consegui enviar o arquivo.";
    try {
      const dados = JSON.parse(texto) as { message?: string };
      if (dados.message) mensagem = dados.message;
    } catch { /* corpo não-JSON */ }
    throw new ApiError({ code: "UPLOAD", status: res.status, message: mensagem });
  }
  return (await res.json()) as T;
}
