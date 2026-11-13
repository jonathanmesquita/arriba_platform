/* =====================================================================
   Busca na base de conhecimento

   Busca textual nativa do Postgres com dicionário PORTUGUÊS — o que
   significa que "negativação", "negativar" e "negativado" caem no mesmo
   radical, e que artigo e preposição são descartados. É o ganho que
   `LIKE '%termo%'` não dá.

   DUAS DECISÕES QUE MUDAM O RESULTADO:

   1. OR em vez de AND entre os termos. `plainto_tsquery` exige TODOS os
      termos, e pergunta de usuário é uma frase inteira ("como faço para
      cadastrar juros sobre a dívida no contrato?") — exigir tudo devolve
      zero. Montamos a query com `|` e deixamos o ranking ordenar: quanto
      mais termos baterem, mais alto o documento fica.

   2. Título e palavras-chave pesam mais que o corpo. `setweight` marca
      título como A e o resto como C, então um manual chamado
      "Negativação" ganha de um que só menciona a palavra no meio.

   SEGURANÇA: os termos vão para `to_tsquery`, que interpreta operadores
   (`&`, `|`, `!`, `:*`, parênteses). Por isso `termosDaPergunta()` deixa
   passar SÓ letras e dígitos — qualquer outro caractere é separador. Sem
   essa limpeza, um `)` na pergunta derruba a consulta com erro de
   sintaxe, e um termo malicioso vira injeção.
   ===================================================================== */

import { prisma } from "../db.js";

export interface TrechoEncontrado {
  id: string;
  source: string;
  title: string;
  category: string | null;
  url: string | null;
  content: string;
  rank: number;
}

/** Palavras curtas demais não discriminam nada e só engordam a consulta.
 *  O dicionário português do Postgres já remove as vazias ("de", "para"),
 *  mas cortar aqui evita mandar termo inútil. */
const TAMANHO_MINIMO_TERMO = 3;
const MAXIMO_DE_TERMOS = 12;

export function termosDaPergunta(pergunta: string): string[] {
  const limpos = String(pergunta || "")
    .toLowerCase()
    // Só letras (com acento) e dígitos sobrevivem: é o que impede
    // operador de tsquery de entrar na consulta.
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= TAMANHO_MINIMO_TERMO);

  // Sem repetir termo: repetir não melhora o ranking e gasta consulta.
  return [...new Set(limpos)].slice(0, MAXIMO_DE_TERMOS);
}

/* Corte relativo ao melhor resultado.

   O OR entre os termos tem um efeito colateral conhecido: uma palavra
   comum na pergunta ("cliente", "sistema") casa com dezenas de
   documentos que não têm nada a ver. Eles chegam com pontuação baixa,
   mas chegam — e entram no contexto empurrando para fora o documento
   certo.

   A pontuação absoluta não serve de corte: ela varia com o tamanho da
   pergunta e do documento, então 0,2 é ótimo numa consulta e lixo em
   outra. O que se compara bem é a razão com o primeiro colocado —
   exigir pelo menos 45% da melhor pontuação derruba a cauda sem mexer
   nos casos em que os resultados são todos bons (medido nas 7 perguntas
   de teste: em "gerar token da API" os quatro ficam entre 0,30 e 0,53 e
   nenhum é cortado; em "cadastrar juros sobre a dívida" o acerto pontua
   0,50 e os três seguintes, que só casam a palavra "cadastro", ficam
   abaixo de 0,21 e saem).

   O QUE ISTO NÃO RESOLVE: colisão de palavra no título. "Como faço para
   negativar um cliente?" traz o manual certo em 1º (0,28) e ainda assim
   um "LOGIN AD CLIENTE" em 3º (0,22) — 80% do primeiro, longe do corte.
   É casamento léxico honesto: o título tem mesmo a palavra "cliente".
   Separar isso exigiria IDF (o Postgres não usa frequência no corpus
   para ranquear) ou embeddings, e com ~95 documentos o custo não se
   paga. O contexto sai rotulado e o prompt manda o modelo dizer quando
   o trecho não responde — é o que segura esse caso hoje.

   Não confundir com "achou pouco": quando NADA casa, a lista já volta
   vazia da consulta. Isto aqui só apara o rabo. */
const FRACAO_MINIMA_DA_MELHOR = 0.45;

/**
 * Procura os documentos mais relevantes para a pergunta.
 * Devolve lista vazia quando não há nada — o chamador decide o que fazer
 * (o chat segue sem contexto, em vez de travar).
 */
export async function buscarTrechos(pergunta: string, limite = 4): Promise<TrechoEncontrado[]> {
  const termos = termosDaPergunta(pergunta);
  if (termos.length === 0) return [];

  const consulta = termos.join(" | ");

  // $queryRaw com parâmetro: a string da consulta entra como valor, não
  // interpolada no SQL. Somado à limpeza de termosDaPergunta(), fecha o
  // caminho de injeção.
  const linhas = await prisma.$queryRaw<TrechoEncontrado[]>`
    WITH consulta AS (SELECT to_tsquery('portuguese', ${consulta}) AS q)
    SELECT
      d.id,
      d.source::text AS source,
      d.title,
      d.category,
      d.url,
      d.content,
      ts_rank(
        setweight(to_tsvector('portuguese', coalesce(d.title, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(d.keywords, '')), 'B') ||
        setweight(to_tsvector('portuguese', d.content), 'C'),
        consulta.q
      ) AS rank
    FROM knowledge_docs d, consulta
    WHERE (
      setweight(to_tsvector('portuguese', coalesce(d.title, '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(d.keywords, '')), 'B') ||
      setweight(to_tsvector('portuguese', d.content), 'C')
    ) @@ consulta.q
    ORDER BY rank DESC
    LIMIT ${limite}
  `;

  const melhor = linhas[0]?.rank ?? 0;
  if (melhor <= 0) return linhas;

  return linhas.filter((l) => l.rank >= melhor * FRACAO_MINIMA_DA_MELHOR);
}

/** Quantos documentos existem, por fonte — para a tela do admin. */
export async function estatisticasDaBase() {
  const [porFonte, agregado] = await Promise.all([
    prisma.knowledgeDoc.groupBy({
      by: ["source"],
      _count: { _all: true },
      _sum: { charCount: true }
    }),
    prisma.knowledgeDoc.aggregate({
      _count: { _all: true },
      _sum: { charCount: true },
      _max: { indexedAt: true }
    })
  ]);

  return {
    total: agregado._count._all,
    caracteres: agregado._sum.charCount ?? 0,
    ultimaImportacao: agregado._max.indexedAt,
    porFonte: porFonte.map((f) => ({
      source: f.source,
      documentos: f._count._all,
      caracteres: f._sum.charCount ?? 0
    }))
  };
}
