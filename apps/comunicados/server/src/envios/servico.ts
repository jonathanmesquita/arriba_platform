/* =====================================================================
   Disparo

   O que acontece quando alguém clica em "enviar":

     1. a carta é COPIADA para o envio (assunto e corpo). Editar a carta
        depois não reescreve o que já saiu;
     2. a lista é separada: inválido, repetido e descadastrado ficam de
        fora, registrados com o motivo;
     3. o resto é dividido em lotes do tamanho configurado, e cada lote
        vira UMA mensagem com os destinatários em CCO;
     4. entre um lote e o outro, espera o intervalo configurado.

   POR QUE O ENVIO É GRAVADO ANTES DE COMEÇAR: se o processo cair no meio
   (queda de energia, servidor reiniciado), o que já saiu está no banco,
   com horário e destinatário. Sem isso, a única forma de saber quem
   recebeu seria perguntar para os clientes.

   POR QUE NÃO HÁ FILA NEM WORKER: é uma ferramenta local, de dezenas a
   poucas centenas de destinatários por disparo. Uma fila resolveria
   reinício automático — ao custo de um processo a mais para manter. O
   disparo roda no próprio servidor e o estado fica no banco; se cair,
   reabrir o envio mostra exatamente onde parou.
   ===================================================================== */

import { prisma } from "../db.js";
import { preencher, valoresDeExemplo, type ValoresDaVariavel } from "../cartas/variaveis.js";
import { dividirEmLotes, separarDestinatarios, type Destinatario } from "./lotes.js";
import { mensagemDeErro } from "./mascarar.js";
import {
  criarTransporte,
  enviarMensagem,
  gravarMensagem,
  type AnexoDoEnvio,
  type ConfiguracaoDeEnvio,
  type MensagemParaEnviar
} from "./transporte.js";

export interface OpcoesDeDisparo {
  envioId: string;
  config: ConfiguracaoDeEnvio & { loteTamanho: number; loteIntervaloMin: number };
  anexos: AnexoDoEnvio[];
  chave: Buffer;
  /** Em modo de teste grava `.eml` em vez de abrir conexão. */
  modoTeste: boolean;
  pastaDados: string;
  /** Injetável para o teste automatizado não esperar minutos de verdade. */
  esperar?: (ms: number) => Promise<void>;
}

export interface ResumoDoDisparo {
  enviados: number;
  falhas: number;
  descadastrados: number;
  lotes: number;
}

const esperarPadrao = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function dataPorExtenso(data: Date): string {
  return data.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Prepara o envio: copia a carta, separa a lista e grava os
 * destinatários. Não manda nada — devolve o que vai acontecer, para a
 * tela confirmar antes.
 */
export async function prepararEnvio(params: {
  cartaId: string;
  destinatarios: Destinatario[];
  criadoPorId?: string | undefined;
  agendadoPara?: Date | undefined;
}): Promise<{ envioId: string; aEnviar: number; descadastrados: number; repetidos: number; invalidos: number }> {
  const carta = await prisma.cartaModelo.findUnique({ where: { id: params.cartaId } });
  if (!carta) throw new Error("Carta modelo não encontrada.");

  const bloqueados = await prisma.descadastro.findMany({ select: { email: true } });
  const separado = separarDestinatarios(params.destinatarios, bloqueados.map((d) => d.email));

  const envio = await prisma.envio.create({
    data: {
      cartaId: carta.id,
      assunto: carta.assunto,
      corpoHtml: carta.corpoHtml,
      status: params.agendadoPara ? "AGENDADO" : "RASCUNHO",
      ...(params.agendadoPara ? { agendadoPara: params.agendadoPara } : {}),
      ...(params.criadoPorId ? { criadoPorId: params.criadoPorId } : {}),
      destinatarios: {
        create: [
          ...separado.aEnviar.map((d) => ({
            email: d.email,
            nome: d.nome ?? null,
            clienteNome: d.clienteNome ?? null,
            status: "PENDENTE" as const
          })),
          // Quem foi barrado entra no envio com o motivo: a pergunta
          // "por que fulano não recebeu?" tem de ter resposta aqui, e
          // não na memória de quem disparou.
          ...separado.descadastrados.map((d) => ({
            email: d.email,
            nome: d.nome ?? null,
            clienteNome: d.clienteNome ?? null,
            status: "DESCADASTRADO" as const,
            erro: "Pediu para não receber comunicados."
          }))
        ]
      }
    },
    select: { id: true }
  });

  return {
    envioId: envio.id,
    aEnviar: separado.aEnviar.length,
    descadastrados: separado.descadastrados.length,
    repetidos: separado.repetidos.length,
    invalidos: separado.invalidos.length
  };
}

/** Executa o disparo de um envio já preparado. */
export async function dispararEnvio(opcoes: OpcoesDeDisparo): Promise<ResumoDoDisparo> {
  const esperar = opcoes.esperar ?? esperarPadrao;

  const envio = await prisma.envio.findUnique({
    where: { id: opcoes.envioId },
    include: { destinatarios: { where: { status: "PENDENTE" }, orderBy: { email: "asc" } } }
  });
  if (!envio) throw new Error("Envio não encontrado.");

  await prisma.envio.update({
    where: { id: envio.id },
    data: { status: "ENVIANDO", iniciadoEm: new Date() }
  });

  const lotes = dividirEmLotes(envio.destinatarios, opcoes.config.loteTamanho);
  const transporte = opcoes.modoTeste ? null : criarTransporte(opcoes.config, opcoes.chave);
  const resumo: ResumoDoDisparo = { enviados: 0, falhas: 0, descadastrados: 0, lotes: lotes.length };
  const agora = new Date();

  try {
    for (const [indice, lote] of lotes.entries()) {
      // O corpo é preenchido por destinatário, mas a mensagem do lote é
      // uma só. Quando o lote tem mais de um destinatário, as variáveis
      // pessoais (nome, cliente) não podem entrar — sairia o nome de um
      // na carta de todos. Lote de 1 é o que permite personalizar.
      const personalizado = lote.length === 1 && lote[0];
      const valores: ValoresDaVariavel = personalizado
        ? {
            nome: personalizado.nome ?? "",
            email: personalizado.email,
            cliente: personalizado.clienteNome ?? "",
            produto: "",
            data: dataPorExtenso(agora),
            remetente: opcoes.config.remetenteNome
          }
        : {
            ...valoresDeExemplo(),
            nome: "",
            email: "",
            cliente: "",
            produto: "",
            data: dataPorExtenso(agora),
            remetente: opcoes.config.remetenteNome
          };

      const mensagem: MensagemParaEnviar = {
        cco: lote.map((d) => d.email),
        assunto: preencher(envio.assunto, valores, { escapar: false }),
        html: preencher(envio.corpoHtml, valores),
        ...(opcoes.anexos.length ? { anexos: opcoes.anexos } : {})
      };

      try {
        const resultado = transporte
          ? await enviarMensagem(transporte, opcoes.config, mensagem)
          : await gravarMensagem(opcoes.pastaDados, opcoes.config, mensagem);

        const recusados = new Set(resultado.recusados.map((e) => e.toLowerCase()));

        await Promise.all(
          lote.map((d) =>
            prisma.envioDestinatario.update({
              where: { id: d.id },
              data: recusados.has(d.email.toLowerCase())
                ? { status: "FALHOU", erro: "Recusado pelo servidor de e-mail.", lote: indice + 1 }
                : { status: "ENVIADO", enviadoEm: new Date(), lote: indice + 1 }
            })
          )
        );

        resumo.enviados += lote.length - recusados.size;
        resumo.falhas += recusados.size;
      } catch (erro) {
        // Falha do lote inteiro (conexão, autenticação, limite do
        // provedor). Grava o motivo já mascarado e segue para o próximo:
        // parar tudo deixaria o resto da lista sem aviso nenhum.
        const motivo = mensagemDeErro(erro);
        await Promise.all(
          lote.map((d) =>
            prisma.envioDestinatario.update({
              where: { id: d.id },
              data: { status: "FALHOU", erro: motivo, lote: indice + 1 }
            })
          )
        );
        resumo.falhas += lote.length;
      }

      const ultimo = indice === lotes.length - 1;
      if (!ultimo && opcoes.config.loteIntervaloMin > 0) {
        await esperar(opcoes.config.loteIntervaloMin * 60_000);
      }
    }
  } finally {
    transporte?.close();
    await prisma.envio.update({
      where: { id: envio.id },
      data: { status: "CONCLUIDO", concluidoEm: new Date() }
    });
  }

  const descadastrados = await prisma.envioDestinatario.count({
    where: { envioId: envio.id, status: "DESCADASTRADO" }
  });
  resumo.descadastrados = descadastrados;

  return resumo;
}
