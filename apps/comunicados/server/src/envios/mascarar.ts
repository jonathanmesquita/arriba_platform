/* =====================================================================
   Mascaramento de segredo em mensagem de erro

   O erro do servidor de e-mail é a informação mais útil que existe quando
   um disparo falha — e também a mais perigosa de guardar: a biblioteca
   costuma incluir o diálogo SMTP, e o diálogo inclui a linha `AUTH LOGIN`
   com usuário e senha em base64.

   Esta função fica entre o erro e QUALQUER lugar que o guarde: banco,
   log, tela e resumo copiado para um chamado. Guardar o erro cru seria
   gravar a senha do servidor de e-mail no banco — sem ninguém notar,
   porque o campo se chama "erro".
   ===================================================================== */

const PADROES: { regex: RegExp; substituto: string }[] = [
  // Diálogo SMTP: AUTH PLAIN/LOGIN seguido do segredo em base64.
  { regex: /\b(AUTH\s+(?:PLAIN|LOGIN|CRAM-MD5))\s+\S+/gi, substituto: "$1 ***" },
  // Resposta do cliente ao desafio: linha isolada de base64 longa.
  { regex: /^[A-Za-z0-9+/]{24,}={0,2}$/gm, substituto: "***" },
  // Cabeçalhos de autenticação, quando o provedor fala HTTP.
  // `\S+` pararia no primeiro espaço e deixaria "Bearer <token>" passar
  // com o token inteiro à mostra — tem de ir até o fim da linha.
  { regex: /\b(authorization|proxy-authorization)\s*:[^\n\r]+/gi, substituto: "$1: ***" },
  { regex: /\b(set-cookie|cookie)\s*:\s*[^\n\r]+/gi, substituto: "$1: ***" },
  // Campos nomeados em JSON ou querystring.
  // A aspas de FECHAMENTO da chave em JSON (`"password":`) ficava entre o
  // nome e o separador, e isso fazia o padrão não casar justamente no
  // formato mais comum de erro de provedor.
  { regex: /(["']?)\b(pass|password|senha|secret|token|api[_-]?key)\b\1(\s*[:=]\s*)(["']?)[^\s",;}]+\4/gi,
    substituto: "$1$2$1$3***" },
  // Credencial embutida em URL: smtp://usuario:senha@host
  { regex: /:\/\/([^:/\s@]+):[^@/\s]+@/g, substituto: "://$1:***@" }
];

/** Teto do texto guardado. Servidor atrás de proxy às vezes devolve uma
 *  página inteira; isso não precisa virar linha gigante no banco. */
const MAXIMO = 2000;

export function mascararSegredo(texto: unknown): string {
  let saida = typeof texto === "string" ? texto : String(texto ?? "");
  for (const { regex, substituto } of PADROES) saida = saida.replace(regex, substituto);
  return saida.length > MAXIMO ? `${saida.slice(0, MAXIMO)}…` : saida;
}

/** Mensagem de erro pronta para guardar: já sem segredo e sem stack. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error) {
    const codigo = (erro as { code?: string }).code;
    const resposta = (erro as { response?: string }).response;
    const partes = [codigo, erro.message, resposta].filter(Boolean).join(" · ");
    return mascararSegredo(partes || erro.name);
  }
  return mascararSegredo(erro);
}
