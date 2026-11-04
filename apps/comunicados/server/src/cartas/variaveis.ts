/* =====================================================================
   Variáveis da carta — fonte única

   Uma carta é escrita uma vez e enviada para muita gente; o que muda de
   um destinatário para outro são estas variáveis. Elas são declaradas
   AQUI e em nenhum outro lugar: a tela de edição mostra esta lista, o
   preenchimento usa esta lista e a conferência de "variável desconhecida"
   compara com esta lista. Acrescentar uma é mexer num arquivo só.

   DUAS DECISÕES QUE EVITAM ESTRAGO:

   1. ESCAPAR SEMPRE o valor substituído. O corpo é HTML escrito por quem
      opera, mas o VALOR vem do cadastro — um nome de cliente com `&` ou
      com `<` quebraria o layout, e um valor com `<script>` viraria
      execução no cliente de e-mail de quem recebe.

   2. VARIÁVEL QUE NÃO EXISTE NÃO É SILENCIOSA. `{{nome_do_titular}}`
      (que ninguém declarou) fica visível na conferência antes do
      disparo, em vez de sair como texto cru para 400 pessoas.
   ===================================================================== */

export interface Variavel {
  /** O que se escreve no corpo, sem as chaves. */
  chave: string;
  rotulo: string;
  descricao: string;
  /** Valor usado na pré-visualização, sempre fictício. */
  exemplo: string;
}

export const VARIAVEIS: Variavel[] = [
  {
    chave: "nome",
    rotulo: "Nome do contato",
    descricao: "Nome da pessoa que recebe. Vazio quando o contato só tem e-mail.",
    exemplo: "Ana Pereira"
  },
  {
    chave: "email",
    rotulo: "E-mail do contato",
    descricao: "Endereço para onde a mensagem está indo.",
    exemplo: "ana.pereira@exemplo.com.br"
  },
  {
    chave: "cliente",
    rotulo: "Cliente",
    descricao: "Nome do cliente a que o contato pertence.",
    exemplo: "Empresa Exemplo Ltda"
  },
  {
    chave: "produto",
    rotulo: "Produto",
    descricao: "Produto associado ao cliente (ou à carta).",
    exemplo: "Plano Essencial"
  },
  {
    chave: "data",
    rotulo: "Data do envio",
    descricao: "Data em que o disparo aconteceu, por extenso.",
    exemplo: "2 de outubro de 2026"
  },
  {
    chave: "remetente",
    rotulo: "Nome do remetente",
    descricao: "Nome exibido configurado no servidor de e-mail.",
    exemplo: "Equipe de Comunicados"
  }
];

const POR_CHAVE = new Map(VARIAVEIS.map((v) => [v.chave, v]));

/** `{{ chave }}` — espaço em volta é tolerado porque quem escreve a carta
 *  digita dos dois jeitos, e recusar por causa de espaço seria pedantismo
 *  que custa suporte. */
const PADRAO = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function ehVariavelConhecida(chave: string): boolean {
  return POR_CHAVE.has(chave);
}

/** Todas as variáveis citadas num texto, na ordem em que aparecem. */
export function variaveisUsadas(texto: string): string[] {
  const achadas = new Set<string>();
  for (const [, chave] of texto.matchAll(PADRAO)) if (chave) achadas.add(chave);
  return [...achadas];
}

/** As que foram escritas mas ninguém declarou — o que a tela mostra antes
 *  de deixar disparar. */
export function variaveisDesconhecidas(texto: string): string[] {
  return variaveisUsadas(texto).filter((c) => !ehVariavelConhecida(c));
}

export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ValoresDaVariavel {
  [chave: string]: string | null | undefined;
}

/**
 * Troca as variáveis pelos valores do destinatário.
 *
 * `escapar: false` só para assunto (texto puro, onde escapar viraria
 * `&amp;` visível na caixa de entrada). No corpo HTML, sempre escapa.
 */
export function preencher(texto: string, valores: ValoresDaVariavel, opcoes: { escapar?: boolean } = {}): string {
  const escapar = opcoes.escapar !== false;

  return texto.replace(PADRAO, (original, chave: string) => {
    // Variável desconhecida fica como está, visível: trocar por vazio
    // esconderia o erro justamente de quem poderia corrigi-lo.
    if (!POR_CHAVE.has(chave)) return original;

    const valor = valores[chave];
    if (valor === null || valor === undefined || valor === "") return "";
    return escapar ? escaparHtml(String(valor)) : String(valor);
  });
}

/** Valores de exemplo, para a pré-visualização da carta. */
export function valoresDeExemplo(): ValoresDaVariavel {
  return Object.fromEntries(VARIAVEIS.map((v) => [v.chave, v.exemplo]));
}
