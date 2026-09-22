/* =====================================================================
   Fontes citadas embaixo da resposta

   Por que isto existe: o modelo responde a partir de trechos da base
   interna e cita "[1]", "[2]" no texto. Sem esta lista, o número não
   leva a lugar nenhum — e uma resposta de suporte que não dá para
   conferir vale pouco, porque quem atende precisa abrir o manual antes
   de orientar o cliente.

   O número aqui é o MESMO que aparece no texto (vem do servidor, não é
   o índice do array) — é o que liga a citação à origem.
   ===================================================================== */

import type { FonteCitada } from "./tipos";

const ROTULO_DA_FONTE: Record<string, string> = {
  CURADORIA: "Procedimento do suporte",
  RESPOSTA_PRONTA: "Resposta padrão",
  MANUAL: "Manual",
  ERRO: "Catálogo de erros"
};

export default function Fontes({ fontes }: { fontes: FonteCitada[] }) {
  if (!fontes.length) return null;

  return (
    <div className="fontes">
      <span className="fontes-titulo">Base consultada</span>
      <ul className="fontes-lista">
        {fontes.map((fonte) => (
          <li key={`${fonte.numero}-${fonte.id}`}>
            <span className="fontes-numero">[{fonte.numero}]</span>{" "}
            {fonte.url ? (
              // O manual mora no portal, em outro domínio/caminho — abrir
              // em aba nova para não derrubar a conversa em andamento.
              <a href={fonte.url} target="_blank" rel="noopener noreferrer">{fonte.title}</a>
            ) : (
              <span>{fonte.title}</span>
            )}{" "}
            <span className="fontes-tipo">{ROTULO_DA_FONTE[fonte.source] ?? fonte.source}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
