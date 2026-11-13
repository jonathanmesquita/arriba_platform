/* =====================================================================
   Montagem do contexto que vai junto com a pergunta

   Aqui mora a regra que mais afeta a qualidade da resposta, e ela é
   contraintuitiva: MAIS CONTEXTO NÃO É MELHOR. O modelo não presta
   atenção uniforme em tudo que recebe — quanto mais texto, mais diluída
   fica a parte que importa, e mais caro fica cada mensagem (o contexto é
   reenviado a cada turno da conversa). Por isso há dois limites: número
   de trechos e total de caracteres.

   Também por isso cada trecho é CORTADO. Um manual de 7 mil caracteres
   inteiro empurraria os outros três para fora do orçamento; o começo
   costuma trazer o resumo e o caminho de tela, que é o que responde.

   A instrução que acompanha o contexto é tão importante quanto o
   contexto: sem ela, o modelo mistura o que leu com o que "acha que
   sabe" e devolve procedimento inventado com cara de manual — que num
   suporte técnico é pior do que não responder.
   ===================================================================== */

import type { TrechoEncontrado } from "./search.js";

/** Teto de caracteres do bloco inteiro. ~6 mil caracteres ≈ 1,5 mil
 *  tokens: cabe folgado em qualquer modelo e ainda deixa espaço para a
 *  conversa. */
export const LIMITE_CARACTERES_CONTEXTO = 6000;

/** Teto por trecho, para um documento grande não comer o orçamento. */
const LIMITE_POR_TRECHO = 2000;

export interface FonteCitada {
  numero: number;
  id: string;
  title: string;
  url: string | null;
  source: string;
}

export interface ContextoMontado {
  /** Texto para colar no system prompt. Vazio quando não houve acerto. */
  bloco: string;
  fontes: FonteCitada[];
  caracteres: number;
}

const ROTULO_DA_FONTE: Record<string, string> = {
  CURADORIA: "Procedimento do suporte",
  RESPOSTA_PRONTA: "Resposta padrão ao cliente",
  MANUAL: "Manual",
  ERRO: "Catálogo de erros"
};

function cortar(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  // Corta na última quebra de frase antes do limite, para não terminar no
  // meio de uma palavra e confundir o modelo.
  const pedaco = texto.slice(0, limite);
  const ultimoPonto = Math.max(pedaco.lastIndexOf(". "), pedaco.lastIndexOf("\n"));
  return (ultimoPonto > limite * 0.6 ? pedaco.slice(0, ultimoPonto + 1) : pedaco).trim() + " […]";
}

export function montarContexto(trechos: TrechoEncontrado[]): ContextoMontado {
  if (trechos.length === 0) return { bloco: "", fontes: [], caracteres: 0 };

  const partes: string[] = [];
  const fontes: FonteCitada[] = [];
  let usados = 0;

  trechos.forEach((trecho, i) => {
    const numero = i + 1;
    const conteudo = cortar(trecho.content, LIMITE_POR_TRECHO);
    const cabecalho = `[${numero}] ${trecho.title} (${ROTULO_DA_FONTE[trecho.source] ?? trecho.source}${trecho.category ? ` · ${trecho.category}` : ""})`;
    const bloco = `${cabecalho}\n${conteudo}`;

    // Estourou o orçamento? Para de acrescentar — melhor menos trecho
    // inteiro do que muitos pela metade.
    if (usados + bloco.length > LIMITE_CARACTERES_CONTEXTO && partes.length > 0) return;

    partes.push(bloco);
    usados += bloco.length;
    fontes.push({ numero, id: trecho.id, title: trecho.title, url: trecho.url, source: trecho.source });
  });

  return { bloco: partes.join("\n\n---\n\n"), fontes, caracteres: usados };
}

/**
 * Junta a instrução de sistema do admin com o contexto recuperado.
 *
 * A instrução do admin vem PRIMEIRO (é a persona e as regras da casa) e
 * o contexto depois, com as regras de uso dele — que são o que impede a
 * resposta inventada.
 */
export function comContexto(systemPrompt: string, contexto: ContextoMontado): string {
  if (!contexto.bloco) {
    // Sem acerto na base, o modelo precisa saber que está sem apoio — do
    // contrário responde com a mesma confiança de quando tem fonte.
    return `${systemPrompt}

Nenhum documento da base de conhecimento interna casou com esta pergunta. Responda com conhecimento geral, mas deixe claro que a informação NÃO veio da documentação interna da empresa e sugira confirmar com quem conhece a rotina.`;
  }

  return `${systemPrompt}

=========================
DOCUMENTAÇÃO INTERNA CONSULTADA
=========================
Os trechos abaixo vieram da base de conhecimento da empresa e são a fonte mais confiável que você tem para esta pergunta.

${contexto.bloco}

=========================
COMO USAR ESSES TRECHOS
=========================
1. Responda a partir deles sempre que cobrirem a pergunta, mantendo nomes de tela, caminhos de menu e passos exatamente como estão escritos.
2. Cite a fonte com o número entre colchetes ao usar uma informação — por exemplo: "conforme o procedimento [1]".
3. Se os trechos NÃO responderem à pergunta, diga isso com todas as letras e responda com conhecimento geral, avisando que não veio da documentação interna. Não preencha lacuna com suposição: procedimento inventado com cara de manual é pior do que "não sei".
4. Se os trechos se contradisserem, aponte a contradição em vez de escolher um lado sozinho.`;
}
