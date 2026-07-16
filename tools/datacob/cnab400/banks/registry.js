/* =====================================================================
   CNAB 400 - Registro de bancos suportados.

   Fonte única: cada banco vira uma entrada aqui, apontando para o config
   exportado por banks/<banco>.js. Nada além disso — o motor (engine.js)
   e a UI (ui.js) leem só este array, nunca conhecem um banco específico.

   Formato de cada entrada: { code, nome, config }
   `config` segue o formato descrito em CLAUDE.md / PROMPT 0.
   ===================================================================== */

import { bradesco } from "./bradesco.js";
import { itau } from "./itau.js";

export const BANKS = [
  { code: bradesco.code, nome: bradesco.nome, config: bradesco },
  { code: itau.code, nome: itau.nome, config: itau }
];
