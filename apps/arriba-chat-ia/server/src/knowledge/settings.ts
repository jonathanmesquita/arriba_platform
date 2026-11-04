/* =====================================================================
   Configuração operacional da base (tabela `settings`)

   Fica no banco, e não no .env, porque são chaves que o admin precisa
   virar com o sistema no ar: desligar a consulta à base durante uma
   investigação, ou reduzir o número de trechos quando a conta está
   pesada. Variável de ambiente exigiria redeploy.

   Cache de memória curto porque isto é lido em TODA mensagem enviada —
   sem ele seriam duas idas ao banco por pergunta só para descobrir que
   nada mudou. 30 segundos é o bastante para a tela do admin parecer
   instantânea e para não martelar o banco.
   ===================================================================== */

import { prisma } from "../db.js";

export const CHAVE_RAG_ATIVO = "rag.ativo";
export const CHAVE_RAG_TRECHOS = "rag.trechos";

export interface ConfiguracaoDaBase {
  ativo: boolean;
  trechos: number;
}

const PADRAO: ConfiguracaoDaBase = { ativo: true, trechos: 4 };
const VALIDADE_CACHE_MS = 30_000;

let cache: { valor: ConfiguracaoDaBase; em: number } | null = null;

export function limparCacheDeConfiguracao(): void {
  cache = null;
}

export async function configuracaoDaBase(): Promise<ConfiguracaoDaBase> {
  if (cache && Date.now() - cache.em < VALIDADE_CACHE_MS) return cache.valor;

  try {
    const linhas = await prisma.setting.findMany({
      where: { key: { in: [CHAVE_RAG_ATIVO, CHAVE_RAG_TRECHOS] } }
    });
    const mapa = new Map(linhas.map((l) => [l.key, l.value]));

    const trechosBrutos = Number(mapa.get(CHAVE_RAG_TRECHOS));
    const valor: ConfiguracaoDaBase = {
      ativo: mapa.get(CHAVE_RAG_ATIVO) !== "false",
      // Teto de 8: mais que isso dilui a atenção do modelo e encarece
      // cada mensagem sem melhorar a resposta.
      trechos: Number.isFinite(trechosBrutos) && trechosBrutos > 0 ? Math.min(trechosBrutos, 8) : PADRAO.trechos
    };

    cache = { valor, em: Date.now() };
    return valor;
  } catch {
    // Banco fora ou tabela ainda não migrada: o chat não pode parar por
    // causa da configuração da base. Segue no padrão.
    return PADRAO;
  }
}

export async function salvarConfiguracaoDaBase(parcial: Partial<ConfiguracaoDaBase>): Promise<ConfiguracaoDaBase> {
  const gravar = async (key: string, value: string) => {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  };

  if (parcial.ativo !== undefined) await gravar(CHAVE_RAG_ATIVO, String(parcial.ativo));
  if (parcial.trechos !== undefined) {
    await gravar(CHAVE_RAG_TRECHOS, String(Math.max(1, Math.min(8, Math.trunc(parcial.trechos)))));
  }

  limparCacheDeConfiguracao();
  return configuracaoDaBase();
}
