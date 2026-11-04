/* =====================================================================
   Transporte de e-mail

   Uma função só monta o transporte, a partir da configuração salva no
   banco. Isso importa porque o teste de conexão e o disparo precisam usar
   EXATAMENTE o mesmo caminho: teste que passa num transporte e disparo
   que falha em outro é o pior resultado possível — dá confiança falsa.

   MODO DE TESTE grava cada mensagem como `.eml` em `dados/saida/` em vez
   de abrir conexão. Serve para conferir layout, variáveis preenchidas e
   anexo sem depender de servidor, e é o que deixa este projeto ser
   testado ponta a ponta numa máquina sem SMTP liberado.

   SOBRE O CCO: o envio em massa vai com o remetente no "Para" e os
   destinatários em CCO (`bcc`). É o que impede um cliente de ver a lista
   de e-mails dos outros — vazamento clássico de comunicado em massa.
   ===================================================================== */

import { createTransport, type Transporter } from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { SecretBox } from "../crypto/secretBox.js";

export interface ConfiguracaoDeEnvio {
  host: string;
  porta: number;
  sslDireto: boolean;
  aceitarCertificadoInvalido: boolean;
  usuario?: string | null;
  senhaCifrada?: string | null;
  remetenteEmail: string;
  remetenteNome: string;
  anexoMaxMb: number;
}

export interface AnexoDoEnvio {
  filename: string;
  path: string;
  contentType?: string;
}

export interface MensagemParaEnviar {
  /** Endereços em CCO. O "Para" é sempre o próprio remetente. */
  cco: string[];
  assunto: string;
  html: string;
  anexos?: AnexoDoEnvio[];
}

export interface ResultadoDoEnvio {
  aceitos: string[];
  recusados: string[];
  /** Identificador devolvido pelo servidor, útil para rastrear no provedor. */
  messageId?: string;
}

/**
 * Monta o transporte. A senha é decifrada aqui e em nenhum outro lugar —
 * ela não trafega, não é logada e não volta por HTTP.
 */
export function criarTransporte(config: ConfiguracaoDeEnvio, chave: Buffer): Transporter {
  const auth = config.usuario
    ? { user: config.usuario, pass: config.senhaCifrada ? new SecretBox(chave).decrypt(config.senhaCifrada) : "" }
    : undefined;

  return createTransport({
    host: config.host,
    port: config.porta,
    // `secure: true` = TLS desde o primeiro byte (porta 465).
    // `false` = conexão limpa que sobe para TLS com STARTTLS (porta 587).
    secure: config.sslDireto,
    ...(auth ? { auth } : {}),
    tls: config.aceitarCertificadoInvalido ? { rejectUnauthorized: false } : undefined,
    // Tetos para o disparo não ficar pendurado numa rede ruim.
    connectionTimeout: 20_000,
    greetingTimeout: 10_000,
    socketTimeout: 60_000
  });
}

function remetente(config: ConfiguracaoDeEnvio): string {
  return `"${config.remetenteNome.replace(/"/g, "'")}" <${config.remetenteEmail}>`;
}

/** Envia de verdade, pelo servidor configurado. */
export async function enviarMensagem(
  transporte: Transporter,
  config: ConfiguracaoDeEnvio,
  mensagem: MensagemParaEnviar
): Promise<ResultadoDoEnvio> {
  const info = (await transporte.sendMail({
    from: remetente(config),
    // O remetente no "Para" não é enfeite: mensagem sem destinatário
    // visível é recusada por parte dos servidores e cai em spam no resto.
    to: config.remetenteEmail,
    bcc: mensagem.cco,
    subject: mensagem.assunto,
    html: mensagem.html,
    ...(mensagem.anexos?.length ? { attachments: mensagem.anexos } : {})
  })) as { accepted?: string[]; rejected?: string[]; messageId?: string };

  return {
    aceitos: (info.accepted ?? []).map(String),
    recusados: (info.rejected ?? []).map(String),
    ...(info.messageId ? { messageId: info.messageId } : {})
  };
}

/**
 * Modo de teste: grava a mensagem montada em disco e não abre conexão.
 * O arquivo é um `.eml` de verdade — abre em qualquer cliente de e-mail,
 * com anexo e tudo.
 */
export async function gravarMensagem(
  pastaDados: string,
  config: ConfiguracaoDeEnvio,
  mensagem: MensagemParaEnviar
): Promise<ResultadoDoEnvio> {
  const transporte = createTransport({ streamTransport: true, buffer: true, newline: "unix" });

  const info = (await transporte.sendMail({
    from: remetente(config),
    to: config.remetenteEmail,
    bcc: mensagem.cco,
    subject: mensagem.assunto,
    html: mensagem.html,
    ...(mensagem.anexos?.length ? { attachments: mensagem.anexos } : {})
  })) as { message: Buffer; messageId?: string };

  const pasta = resolve(pastaDados, "saida");
  await mkdir(pasta, { recursive: true });

  const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
  const arquivo = join(pasta, `${carimbo}_${mensagem.cco.length}-destinatarios.eml`);
  await writeFile(arquivo, info.message);

  return {
    aceitos: mensagem.cco,
    recusados: [],
    ...(info.messageId ? { messageId: info.messageId } : {})
  };
}

/** Conferência da configuração sem mandar mensagem: abre a conexão,
 *  autentica e desliga. É o que o botão "Testar" da tela usa. */
export async function testarConexao(config: ConfiguracaoDeEnvio, chave: Buffer): Promise<void> {
  const transporte = criarTransporte(config, chave);
  try {
    await transporte.verify();
  } finally {
    transporte.close();
  }
}
