/* =====================================================================
   Hash de senha — scrypt do node:crypto

   Por que scrypt e não bcrypt/argon2: os dois exigem compilação nativa
   (node-gyp) e não estão instalados. O scrypt é o único KDF de
   verdade que já vem no Node — e ele é adequado: além de custo de CPU,
   tem custo de MEMÓRIA, que é justamente o que encarece ataque em GPU.
   Um hash rápido (SHA-256 puro) seria o erro clássico aqui.

   Formato armazenado: `scrypt$N$r$p$salt$hash`, com salt e hash em
   base64url. Guardar os parâmetros JUNTO do hash é o que permite subir o
   custo depois (N maior) sem invalidar as senhas já gravadas: a
   verificação usa os parâmetros da linha, não os do código.

   Salt aleatório por senha (16 bytes): sem ele, senhas iguais viram
   hashes iguais e uma rainbow table serve para todo mundo de uma vez.
   ===================================================================== */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  senha: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  opcoes: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const ALGORITMO = "scrypt";
/** N = 2^14. Com r=8 são ~16 MB por verificação — caro para quem ataca,
 *  irrelevante para um login isolado. Subir N encarece os dois lados;
 *  se subir, o formato já carrega o valor novo. */
const N_PADRAO = 16_384;
const R_PADRAO = 8;
const P_PADRAO = 1;
const TAMANHO_SALT = 16;
const TAMANHO_CHAVE = 64;

/** Mínimo de caracteres. Comprimento é o fator que mais pesa contra
 *  força bruta — mais do que exigir símbolo e maiúscula, que na prática
 *  só produzem "Senha@123". */
export const TAMANHO_MINIMO_SENHA = 12;

/** Teto para não transformar o campo de senha em vetor de DoS: o scrypt
 *  processa a entrada inteira, e ninguém digita 1 KB de senha. */
const TAMANHO_MAXIMO_SENHA = 1024;

/** O `maxmem` do Node tem teto padrão de 32 MB e o scrypt falha se a
 *  combinação N/r passar disso. Calculamos a partir dos parâmetros para
 *  que um N maior no futuro não quebre a verificação de hashes antigos. */
function memoriaNecessaria(N: number, r: number, p: number): number {
  return 256 * N * r + 128 * r * p + 1024 * 1024;
}

/** Gera o hash no formato armazenável. */
export async function hashSenha(senha: string): Promise<string> {
  if (typeof senha !== "string" || senha.length === 0) {
    throw new Error("Senha vazia não pode ser transformada em hash.");
  }
  const salt = randomBytes(TAMANHO_SALT);
  const derivado = await scryptAsync(senha.normalize("NFKC"), salt, TAMANHO_CHAVE, {
    N: N_PADRAO,
    r: R_PADRAO,
    p: P_PADRAO,
    maxmem: memoriaNecessaria(N_PADRAO, R_PADRAO, P_PADRAO)
  });

  return [
    ALGORITMO,
    String(N_PADRAO),
    String(R_PADRAO),
    String(P_PADRAO),
    salt.toString("base64url"),
    derivado.toString("base64url")
  ].join("$");
}

interface HashDecomposto {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

/** Quebra o formato armazenado. Devolve null (não lança) para qualquer
 *  coisa fora do padrão: linha corrompida, campo vazio ou hash de outro
 *  algoritmo não devem derrubar o login — devem apenas falhar. */
function decompor(guardado: string): HashDecomposto | null {
  if (typeof guardado !== "string") return null;
  const partes = guardado.split("$");
  if (partes.length !== 6) return null;

  const [algoritmo, nTexto, rTexto, pTexto, saltB64, hashB64] = partes;
  if (algoritmo !== ALGORITMO) return null;
  if (!nTexto || !rTexto || !pTexto || !saltB64 || !hashB64) return null;

  const N = Number(nTexto);
  const r = Number(rTexto);
  const p = Number(pTexto);
  // N precisa ser potência de 2 — o scrypt recusa qualquer outro valor.
  if (!Number.isInteger(N) || N < 2 || (N & (N - 1)) !== 0) return null;
  if (!Number.isInteger(r) || r < 1 || !Number.isInteger(p) || p < 1) return null;
  // Teto de sanidade: um N absurdo vindo de linha adulterada viraria um
  // scrypt de minutos, ou seja, DoS por dado do banco.
  if (N > 1_048_576 || r > 64 || p > 16) return null;

  const salt = Buffer.from(saltB64, "base64url");
  const hash = Buffer.from(hashB64, "base64url");
  if (salt.length === 0 || hash.length === 0) return null;

  return { N, r, p, salt, hash };
}

/** Confere a senha contra o hash armazenado.
 *
 *  A comparação é em tempo constante (timingSafeEqual): comparar com
 *  `===` vaza, pelo tempo de resposta, quantos bytes iniciais bateram —
 *  o suficiente para reconstruir o hash byte a byte. */
export async function verificarSenha(senha: string, guardado: string): Promise<boolean> {
  if (typeof senha !== "string" || senha.length === 0) return false;
  if (senha.length > TAMANHO_MAXIMO_SENHA) return false;

  const partes = decompor(guardado);
  if (!partes) return false;

  try {
    const derivado = await scryptAsync(senha.normalize("NFKC"), partes.salt, partes.hash.length, {
      N: partes.N,
      r: partes.r,
      p: partes.p,
      maxmem: memoriaNecessaria(partes.N, partes.r, partes.p)
    });
    // timingSafeEqual exige mesmo tamanho; por construção já batem, mas
    // um hash truncado no banco faria a função lançar.
    if (derivado.length !== partes.hash.length) return false;
    return timingSafeEqual(derivado, partes.hash);
  } catch {
    return false;
  }
}

/** Regras mínimas de força. Devolve a mensagem do problema (pt-BR) ou
 *  null quando está tudo certo — assim quem chama escolhe o que fazer
 *  com o texto (resposta HTTP, CLI do seed, tela do admin). */
export function validarForcaSenha(senha: string): string | null {
  if (typeof senha !== "string" || senha.length === 0) {
    return "Informe uma senha.";
  }
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    return `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  }
  if (senha.length > TAMANHO_MAXIMO_SENHA) {
    return `A senha passou de ${TAMANHO_MAXIMO_SENHA} caracteres.`;
  }
  if (senha.trim().length === 0) {
    return "A senha não pode ser só espaços.";
  }
  return null;
}
