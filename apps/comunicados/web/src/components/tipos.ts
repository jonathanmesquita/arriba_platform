/* Os tipos descrevem o JSON que a API devolve — não os modelos do Prisma.
   É de propósito: a tela só conhece o que o servidor resolveu expor (em
   ConfigSmtp, por exemplo, não existe `senhaCifrada`, e sim `senhaSalva`).
   Datas chegam como string ISO. */

export type Papel = "ADMIN" | "OPERADOR";

export interface Produto { id: string; nome: string; ativo: boolean }

export interface Contato { id: string; clienteId: string; nome: string | null; email: string; ativo: boolean }

export interface Cliente {
  id: string;
  nome: string;
  ativo: boolean;
  produtoId: string | null;
  produto?: { id: string; nome: string } | null;
  contatos: Contato[];
}

export interface AnexoCarta { id: string; nomeArquivo: string; tamanhoBytes: number; tipoMime?: string }

export interface Carta {
  id: string;
  nome: string;
  assunto: string;
  corpoHtml: string;
  produtoId: string | null;
  produto?: { id: string; nome: string } | null;
  anexos: AnexoCarta[];
  atualizadoEm: string;
}

export interface Variavel { chave: string; rotulo: string; descricao: string; exemplo: string }

export interface ConfigSmtp {
  host: string;
  porta: number;
  sslDireto: boolean;
  aceitarCertificadoInvalido: boolean;
  usuario: string | null;
  /** A senha nunca chega aqui — só se existe uma salva. */
  senhaSalva: boolean;
  remetenteEmail: string;
  remetenteNome: string;
  loteTamanho: number;
  loteIntervaloMin: number;
  anexoMaxMb: number;
  ultimoTesteEm: string | null;
  ultimoTesteOk: boolean | null;
  ultimoTesteMensagem: string | null;
}

export type StatusEnvio = "RASCUNHO" | "AGENDADO" | "ENVIANDO" | "CONCLUIDO" | "CANCELADO";
export type StatusDestinatario = "PENDENTE" | "ENVIADO" | "FALHOU" | "DESCADASTRADO";

export interface Destinatario {
  id: string;
  email: string;
  nome: string | null;
  clienteNome: string | null;
  status: StatusDestinatario;
  erro: string | null;
  lote: number | null;
  enviadoEm: string | null;
}

export interface Envio {
  id: string;
  assunto: string;
  corpoHtml: string;
  status: StatusEnvio;
  agendadoPara: string | null;
  iniciadoEm: string | null;
  concluidoEm: string | null;
  criadoEm: string;
  carta?: { id: string; nome: string } | null;
  criadoPor?: { id: string; nome: string } | null;
  destinatarios?: Destinatario[];
  totais?: {
    destinatarios: number;
    enviados: number;
    falhas: number;
    descadastrados: number;
    pendentes: number;
  };
}

export interface Descadastro { id: string; email: string; motivo: string | null; criadoEm: string }

export interface UsuarioAdmin {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
  ultimoLoginEm: string | null;
  criadoEm: string;
}
