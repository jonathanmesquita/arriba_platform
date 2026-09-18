/* =====================================================================
   Negativacao Serasa - regras do processo (fonte unica)

   Aqui ficam as regras de PROCESSO, que nao estao no layout do arquivo:
   a sequencia de status no DataCob, o que cada acao exige e os prazos.

   Duas telas consomem este arquivo - a ferramenta
   (tools/datacob/serasa/ui.js, que avisa quando a operacao escolhida nao
   combina com o status informado) e a pagina explicativa para o cliente
   (pages/docs/datacob/negativacao-serasa.html). Mudou a regra? Muda aqui,
   e as duas acompanham. Nao duplicar essa tabela em nenhuma das duas.
   ===================================================================== */

"use strict";

/* Sequencia obrigatoria de status. Cada acao so pode ser disparada quando
   o titulo esta no status de origem correspondente - tentar fora de ordem
   e a causa mais comum de "negativacao que nao sai" no suporte. */
export const FLUXO_STATUS = [
  {
    acao: "Nova negativação",
    statusExigido: "NÃO NEGATIVADO",
    statusResultante: "SOLICITADO NEGATIVAÇÃO",
    operacaoArquivo: "I",
    descricao: "Cria a solicitação de inclusão. O título entra na próxima remessa para a Serasa."
  },
  {
    acao: "Confirmar negativação",
    statusExigido: "SOLICITADO NEGATIVAÇÃO",
    statusResultante: "NEGATIVADO",
    operacaoArquivo: "I",
    descricao: "Confirma que a Serasa aceitou a inclusão. Só é possível depois da solicitação."
  },
  {
    acao: "Remover negativação",
    statusExigido: "NEGATIVADO",
    statusResultante: "NÃO NEGATIVADO",
    operacaoArquivo: "E",
    descricao: "Baixa a anotação. Exige informar o motivo da baixa no registro."
  }
];

/* Mapa operacao do arquivo -> status que o titulo precisa ter. Usado pela
   ferramenta para conferir a coerencia do que vai ser gerado. */
export const STATUS_POR_OPERACAO = {
  I: ["NÃO NEGATIVADO", "SOLICITADO NEGATIVAÇÃO"],
  E: ["NEGATIVADO"],
  C: ["NÃO NEGATIVADO", "SOLICITADO NEGATIVAÇÃO", "NEGATIVADO"]
};

export const STATUS_POSSIVEIS = ["NÃO NEGATIVADO", "SOLICITADO NEGATIVAÇÃO", "NEGATIVADO"];

/* Operacoes do campo 2 do registro de detalhe. */
export const OPERACOES = {
  I: "Inclusão — negativar o devedor",
  E: "Exclusão — retirar a negativação (exige motivo da baixa)",
  C: "Condição especial — apenas mensagem, não altera a base"
};

/* Prazos do processo. `fonte` diz de onde cada numero vem, para ninguem
   tratar regra legal e pratica de mercado com o mesmo peso - e para nao
   citarmos artigo de lei que nao foi conferido. */
export const PRAZOS = [
  {
    titulo: "Comunicação prévia ao devedor",
    valor: "Antes de publicar",
    detalhe: "A Serasa avisa o devedor por escrito antes de a anotação ficar visível ao mercado. A inclusão só produz efeito depois dessa comunicação.",
    fonte: "Exigência do CDC (comunicação prévia); o prazo em dias é operacional da Serasa"
  },
  {
    titulo: "Baixa após a quitação",
    valor: "5 dias úteis",
    detalhe: "Depois de o devedor pagar ou renegociar, o credor envia a exclusão dentro de 5 dias úteis. É o prazo que o suporte mais cobra na prática.",
    fonte: "Prazo adotado no processo (o mesmo cobrado pelos órgãos de defesa do consumidor)"
  },
  {
    titulo: "Prazo máximo da anotação",
    valor: "5 anos",
    detalhe: "A anotação cai por decurso de prazo 5 anos depois do vencimento da dívida. A Serasa dá baixa sozinha (motivo 97).",
    fonte: "CDC, art. 43, §1º"
  },
  {
    titulo: "Limite para incluir",
    valor: "4 anos e 11 meses",
    detalhe: "Não dá para negativar uma dívida com vencimento mais antigo que isso (1471 dias de atraso): a Serasa rejeita com erro de data já decursada.",
    fonte: "Regra do layout Serasa (erro 017)"
  }
];

/* Diferenca entre os dois layouts, na linguagem de quem usa. */
export const TIPOS_ANOTACAO = [
  {
    code: "pefin",
    sigla: "PEFIN",
    nome: "Pendência Financeira",
    quemRegistra: "O próprio credor (a empresa que concedeu o crédito).",
    quando: "Dívida vencida e não paga de um contrato direto com o credor.",
    exemplo: "Parcela de financiamento, mensalidade, fatura em atraso."
  },
  {
    // As fontes recebidas nao explicam a sigla, so trazem o layout - por
    // isso nada aqui afirma o que "REFIN" significa por extenso.
    code: "refin",
    sigla: "REFIN",
    nome: "Anotação de instituição financeira",
    quemRegistra: "Instituições financeiras (bancos, financeiras).",
    quando: "Dívida vencida de operação financeira — crédito, empréstimo, cartão.",
    exemplo: "Empréstimo pessoal, cartão de crédito, cheque especial."
  }
];

/* Confere se a operacao escolhida cabe no status informado. Devolve
   { ok, mensagem } - mensagem vazia quando esta tudo certo. */
export function conferirTransicao(operacao, statusAtual) {
  const op = String(operacao || "").toUpperCase();
  const status = String(statusAtual || "").toUpperCase();
  if (!op || !status) return { ok: true, mensagem: "" };

  const permitidos = STATUS_POR_OPERACAO[op];
  if (!permitidos) return { ok: true, mensagem: "" };
  if (permitidos.map((s) => s.toUpperCase()).includes(status)) return { ok: true, mensagem: "" };

  // A operacao I cobre dois passos (nova negativacao e confirmacao), logo
  // aceita dois status - a mensagem lista todos os permitidos em vez de
  // citar so o primeiro passo, que confundiria quem esta no segundo.
  const acoes = FLUXO_STATUS.filter((f) => f.operacaoArquivo === op).map((f) => f.acao);
  const lista = permitidos.map((s) => `"${s}"`).join(" ou ");
  return {
    ok: false,
    mensagem: `Operação ${op}${acoes.length ? ` (${acoes.join(" / ")})` : ""} exige o título em ${lista}, e o status informado é "${statusAtual}".`
  };
}
