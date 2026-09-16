/* =====================================================================
   Registro de layouts do Serasa.

   Mesmo padrao de tools/datacob/cnab400/banks/registry.js: um arquivo por
   layout, e este aqui so lista. Bureau novo (SCPC, Boa Vista) = criar
   layouts/<bureau>.js exportando o mesmo formato de config e incluir na
   lista abaixo. Nada no motor nem na UI precisa mudar.
   ===================================================================== */

"use strict";

import { PEFIN } from "./pefin.js";
import { REFIN } from "./refin.js";

export const LAYOUTS = [
  { code: PEFIN.code, nome: PEFIN.nome, config: PEFIN },
  { code: REFIN.code, nome: REFIN.nome, config: REFIN }
];

/* Reconhece o layout pelo proprio arquivo.

   O identificador fica em posicoes DIFERENTES em cada layout (105-119 no
   PEFIN, 19-33 no REFIN), entao nao da para olhar um lugar so: tenta cada
   layout na posicao que ele mesmo declara. Devolve null quando nenhum
   bate - a UI usa isso para pedir que o usuario escolha na mao em vez de
   adivinhar errado. */
export function detectarLayout(texto) {
  const primeira = String(texto || "").split(/\r\n|\r|\n/).find(l => l.length > 0) || "";
  for (const { config } of LAYOUTS) {
    const { ini, fim } = config.deteccao;
    if (primeira.slice(ini - 1, fim).trim().toUpperCase() === config.identificador) {
      return config;
    }
  }
  return null;
}
