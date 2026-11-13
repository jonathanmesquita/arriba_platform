/* =====================================================================
   Lotes e descadastro — as duas regras que protegem o disparo

   LOTE existe por causa do provedor, não por causa do nosso código:
   serviço de e-mail limita destinatários por mensagem e mensagens por
   hora. Mandar 400 de uma vez não é mais rápido — é a conta sendo
   bloqueada no meio do caminho, com metade da lista avisada e a outra
   metade não.

   DESCADASTRO é consultado em TODO disparo, inclusive quando a lista veio
   colada à mão. Quem pediu para sair não recebe "só mais esse" — e o
   destinatário fica registrado como DESCADASTRADO, em vez de sumir da
   conta, para a pergunta "por que fulano não recebeu?" ter resposta.
   ===================================================================== */

export interface Destinatario {
  email: string;
  nome?: string | null;
  clienteNome?: string | null;
}

export interface SeparacaoDeDestinatarios {
  /** Vão receber, já sem repetidos e sem descadastrados. */
  aEnviar: Destinatario[];
  /** Tirados por terem pedido para sair. */
  descadastrados: Destinatario[];
  /** Tirados por e-mail repetido na mesma lista. */
  repetidos: Destinatario[];
  /** Tirados por e-mail que não é endereço. */
  invalidos: Destinatario[];
}

/** Checagem de formato, não de existência: serve para pegar erro de
 *  digitação e célula de planilha com texto no lugar do e-mail. Quem diz
 *  se a caixa existe é o servidor, na hora do envio. */
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ehEmailPlausivel(email: string): boolean {
  return FORMATO_EMAIL.test(email.trim());
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Separa a lista em quem recebe e quem não recebe, dizendo o porquê.
 *
 * A ordem importa: inválido sai primeiro (não dá nem para comparar com a
 * lista de descadastro), depois repetido, depois descadastrado.
 */
export function separarDestinatarios(
  lista: Destinatario[],
  emailsDescadastrados: Iterable<string>
): SeparacaoDeDestinatarios {
  const bloqueados = new Set([...emailsDescadastrados].map(normalizarEmail));
  const jaVistos = new Set<string>();

  const resultado: SeparacaoDeDestinatarios = {
    aEnviar: [],
    descadastrados: [],
    repetidos: [],
    invalidos: []
  };

  for (const destinatario of lista) {
    const email = normalizarEmail(destinatario.email ?? "");

    if (!ehEmailPlausivel(email)) {
      resultado.invalidos.push(destinatario);
      continue;
    }
    if (jaVistos.has(email)) {
      resultado.repetidos.push(destinatario);
      continue;
    }
    jaVistos.add(email);

    if (bloqueados.has(email)) {
      resultado.descadastrados.push({ ...destinatario, email });
      continue;
    }
    resultado.aEnviar.push({ ...destinatario, email });
  }

  return resultado;
}

/** Divide em lotes do tamanho configurado. Tamanho inválido vira 1 — é
 *  melhor enviar devagar do que dividir por zero no meio do disparo. */
export function dividirEmLotes<T>(itens: T[], tamanho: number): T[][] {
  const porLote = Number.isFinite(tamanho) && tamanho >= 1 ? Math.trunc(tamanho) : 1;
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += porLote) lotes.push(itens.slice(i, i + porLote));
  return lotes;
}

/**
 * Quanto tempo o disparo inteiro vai levar, em minutos, para a tela
 * avisar antes de começar.
 *
 * O intervalo conta ENTRE lotes: 3 lotes com 1 minuto de intervalo
 * esperam 2 minutos, não 3. Errar isso faz a tela prometer um tempo e o
 * envio terminar antes, o que corrói a confiança no número.
 */
export function minutosEstimados(quantidadeDeLotes: number, intervaloMin: number): number {
  if (quantidadeDeLotes <= 1) return 0;
  const intervalo = Number.isFinite(intervaloMin) && intervaloMin > 0 ? intervaloMin : 0;
  return (quantidadeDeLotes - 1) * intervalo;
}
