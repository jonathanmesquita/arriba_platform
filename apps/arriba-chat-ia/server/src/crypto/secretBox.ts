/* =====================================================================
   Cofre das credenciais — AES-256-GCM

   As API keys dos provedores são o ativo mais sensível deste sistema:
   quem as lê gasta a conta da empresa e vê o tráfego. Por isso elas
   entram no banco cifradas e só são decifradas na memória do servidor,
   no instante de chamar o provedor.

   Escolhas:

   - AES-256-GCM (não CBC): GCM é autenticado. Se alguém adulterar o
     texto cifrado no banco, `decrypt` LANÇA em vez de devolver lixo
     silencioso. Cifra sem autenticação abre a porta para adulteração.

   - IV de 12 bytes aleatório POR OPERAÇÃO. Reaproveitar IV em GCM é uma
     falha grave (permite recuperar o texto claro); por isso ele é sorteado
     em toda chamada e guardado junto do resultado.

   - Formato armazenado: `v1.<iv>.<tag>.<ciphertext>` em base64url. O
     prefixo de versão existe para permitir trocar o algoritmo/chave no
     futuro sem adivinhar o formato do que já está gravado.

   - A chave mestra vem do ambiente (ENCRYPTION_KEY), nunca do banco e
     nunca do código. Se ela vazar, tudo vaza: trate como segredo de
     infraestrutura (secrets manager do Render/Vercel, não .env commitado).

   O que este módulo NÃO resolve: quem tem acesso ao servidor e à variável
   de ambiente consegue decifrar. Proteção contra isso é HSM/KMS, que está
   fora do escopo de um chat interno — mas o formato versionado deixa a
   porta aberta.
   ===================================================================== */

import { randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;   // recomendado para GCM
const TAMANHO_TAG = 16;
const VERSAO = "v1";

export class CryptoConfigError extends Error {}
export class CryptoIntegrityError extends Error {}

/** Lê e valida a chave mestra. Aceita base64 (44 chars) ou hex (64). */
export function carregarChave(valor: string | undefined): Buffer {
  if (!valor) {
    throw new CryptoConfigError(
      "ENCRYPTION_KEY não definida. Gere uma com: openssl rand -base64 32"
    );
  }
  const limpo = valor.trim();
  let chave: Buffer;

  if (/^[0-9a-fA-F]{64}$/.test(limpo)) {
    chave = Buffer.from(limpo, "hex");
  } else {
    chave = Buffer.from(limpo, "base64");
  }

  if (chave.length !== 32) {
    throw new CryptoConfigError(
      `ENCRYPTION_KEY precisa ter 32 bytes (256 bits); veio com ${chave.length}. ` +
      "Gere uma nova com: openssl rand -base64 32"
    );
  }
  return chave;
}

export class SecretBox {
  readonly #chave: Buffer;

  constructor(chave: Buffer) {
    if (chave.length !== 32) throw new CryptoConfigError("Chave precisa ter 32 bytes.");
    this.#chave = chave;
  }

  static fromEnv(valor: string | undefined): SecretBox {
    return new SecretBox(carregarChave(valor));
  }

  /** Texto puro -> `v1.<iv>.<tag>.<ct>`. */
  encrypt(textoPuro: string): string {
    if (typeof textoPuro !== "string" || textoPuro.length === 0) {
      throw new CryptoConfigError("Nada para cifrar.");
    }
    const iv = randomBytes(TAMANHO_IV);
    const cipher = createCipheriv(ALGORITMO, this.#chave, iv);
    const cifrado = Buffer.concat([cipher.update(textoPuro, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSAO, b64(iv), b64(tag), b64(cifrado)].join(".");
  }

  /** `v1.<iv>.<tag>.<ct>` -> texto puro. Lança se foi adulterado. */
  decrypt(guardado: string): string {
    const partes = String(guardado || "").split(".");
    if (partes.length !== 4) {
      throw new CryptoIntegrityError("Formato do segredo é inválido (esperado v1.<iv>.<tag>.<ct>).");
    }
    // Desestruturar com noUncheckedIndexedAccess devolve `string | undefined`
    // mesmo depois do teste de comprimento acima — o compilador não liga uma
    // coisa à outra. O ?? "" mantém o tipo honesto sem afrouxar a checagem.
    const versao = partes[0] ?? "";
    const ivB64 = partes[1] ?? "";
    const tagB64 = partes[2] ?? "";
    const ctB64 = partes[3] ?? "";
    if (versao !== VERSAO) {
      throw new CryptoIntegrityError(`Versão de cifra desconhecida: ${versao}.`);
    }

    const iv = deB64(ivB64);
    const tag = deB64(tagB64);
    const cifrado = deB64(ctB64);
    if (iv.length !== TAMANHO_IV) throw new CryptoIntegrityError("IV com tamanho inválido.");
    if (tag.length !== TAMANHO_TAG) throw new CryptoIntegrityError("Tag de autenticação com tamanho inválido.");

    try {
      const decipher = createDecipheriv(ALGORITMO, this.#chave, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString("utf8");
    } catch (erro) {
      // Falha de autenticação do GCM: ou a chave mudou, ou o dado foi
      // adulterado. Não dá para distinguir — e não convém tentar.
      throw new CryptoIntegrityError(
        "Não foi possível decifrar a credencial: a ENCRYPTION_KEY mudou ou o registro foi alterado. " +
        "Cadastre a API key de novo na tela de provedores."
      );
    }
  }

  /** Os 4 últimos caracteres, para a tela mostrar "•••• 1234" sem nunca
   *  devolver o segredo. Chave curta demais não revela nada. */
  static last4(apiKey: string): string {
    const limpo = String(apiKey || "").trim();
    return limpo.length >= 8 ? limpo.slice(-4) : "";
  }
}

/** Comparação em tempo constante — para comparar segredos sem vazar,
 *  pelo tempo de resposta, quantos caracteres bateram. */
export function comparacaoSegura(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const b64 = (buf: Buffer) => buf.toString("base64url");
const deB64 = (texto: string) => Buffer.from(texto, "base64url");
