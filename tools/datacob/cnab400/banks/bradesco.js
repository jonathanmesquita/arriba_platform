/* =====================================================================
   CNAB 400 - Bradesco (237) | Config para o motor genérico (engine.js)

   FONTE DE VERDADE: portado de tools/datacob/cnab400-bradesco/script.js
   (HEADER_FIELDS, DETALHE_FIELDS, OCORRENCIAS, OCORRENCIA_COM_MOTIVO,
   MOTIVOS). Posições NÃO foram alteradas — já validadas byte a byte
   contra o manual e contra arquivos reais.

   O TRAILER (Registro 9) não existia como mapa de campos no script
   original (era montado manualmente em gerarTrailer/parseRetorno).
   TRAILER_FIELDS abaixo reproduz exatamente as mesmas posições/valores
   byte a byte, só reescritas no formato de config do motor.
   ===================================================================== */

"use strict";

// HEADER - Registro 0 (Arquivo-Retorno)
const HEADER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",     nome: "Identificação do Registro",     type: "N", fixo: "0" },
  { ini: 2,   fim: 2,   key: "idArquivo",      nome: "Identificação Arquivo Retorno", type: "N", fixo: "2" },
  { ini: 3,   fim: 9,   key: "literalRetorno", nome: "Literal Retorno",               type: "A", fixo: "RETORNO" },
  { ini: 10,  fim: 11,  key: "codServico",     nome: "Código do Serviço",             type: "N", fixo: "01" },
  { ini: 12,  fim: 26,  key: "literalServico", nome: "Literal Serviço",               type: "A", fixo: "COBRANCA" },
  { ini: 27,  fim: 46,  key: "codEmpresa",     nome: "Código da Empresa",             type: "N" },
  { ini: 47,  fim: 76,  key: "nomeEmpresa",    nome: "Nome da Empresa",               type: "A" },
  { ini: 77,  fim: 79,  key: "numBradesco",    nome: "Nº Bradesco (Compensação)",     type: "N", fixo: "237" },
  { ini: 80,  fim: 94,  key: "nomeBanco",      nome: "Nome do Banco",                 type: "A", fixo: "BRADESCO" },
  { ini: 95,  fim: 100, key: "dataGravacao",   nome: "Data da Gravação",              type: "N", fmt: "data" },
  { ini: 101, fim: 108, key: "densidade",      nome: "Densidade de Gravação",         type: "N", fixo: "01600000" },
  { ini: 109, fim: 113, key: "avisoBancario",  nome: "Nº Aviso Bancário",             type: "N" },
  { ini: 114, fim: 379, key: "branco1",        nome: "Branco",                        type: "A" },
  { ini: 380, fim: 385, key: "dataCredito",    nome: "Data do Crédito",               type: "N", fmt: "data" },
  { ini: 386, fim: 394, key: "branco2",        nome: "Branco",                        type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",    nome: "Nº Seqüencial do Registro",     type: "N", fixo: "000001" }
];

// DETALHE - Registro 1 (Transação - Retorno). Mapa completo das 400 posições.
const DETALHE_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",      nome: "Identificação do Registro",  type: "N", fixo: "1" },
  { ini: 2,   fim: 3,   key: "tipoInscEmpresa", nome: "Tipo Inscrição Empresa",     type: "N" },
  { ini: 4,   fim: 17,  key: "numInscEmpresa",  nome: "Nº Inscrição Empresa",       type: "N" },
  { ini: 18,  fim: 20,  key: "zeros1",          nome: "Zeros",                      type: "N" },
  { ini: 21,  fim: 37,  key: "idEmpresaBanco",  nome: "Ident. Empresa no Banco",    type: "N" },
  { ini: 38,  fim: 62,  key: "controleParticip",nome: "Nº Controle do Participante",type: "A" },
  { ini: 63,  fim: 70,  key: "zeros2",          nome: "Zeros",                      type: "N" },
  { ini: 71,  fim: 82,  key: "nossoNumero",     nome: "Identificação do Título no Banco (Nosso Número)", type: "A" },
  { ini: 83,  fim: 92,  key: "usoBanco1",       nome: "Uso do Banco",               type: "A" },
  { ini: 93,  fim: 104, key: "usoBanco2",       nome: "Uso do Banco",               type: "N" },
  { ini: 105, fim: 105, key: "indRateio",       nome: "Indicador de Rateio Crédito",type: "A" },
  { ini: 106, fim: 107, key: "zeros3",          nome: "Zeros",                      type: "N" },
  { ini: 108, fim: 108, key: "carteira",        nome: "Carteira",                   type: "N" },
  { ini: 109, fim: 110, key: "ocorrencia",      nome: "Identificação de Ocorrência",type: "N" },
  { ini: 111, fim: 116, key: "dataOcorrencia",  nome: "Data Ocorrência no Banco",   type: "N", fmt: "data" },
  { ini: 117, fim: 126, key: "numDocumento",    nome: "Número do Documento",        type: "A" },
  { ini: 127, fim: 146, key: "idTituloBanco20", nome: "Ident. Título no Banco",     type: "A" },
  { ini: 147, fim: 152, key: "dataVencimento",  nome: "Data Vencimento do Título",  type: "N", fmt: "data" },
  { ini: 153, fim: 165, key: "valorTitulo",     nome: "Valor do Título",            type: "N", fmt: "valor" },
  { ini: 166, fim: 168, key: "bancoCobrador",   nome: "Banco Cobrador",             type: "N" },
  { ini: 169, fim: 173, key: "agenciaCobradora",nome: "Agência Cobradora",          type: "N" },
  { ini: 174, fim: 175, key: "especieTitulo",   nome: "Espécie do Título",          type: "A" },
  { ini: 176, fim: 188, key: "despesasCobranca",nome: "Despesas de Cobrança",       type: "N", fmt: "valor" },
  { ini: 189, fim: 201, key: "outrasDespesas",  nome: "Outras Despesas / Custas",   type: "N", fmt: "valor" },
  { ini: 202, fim: 214, key: "jurosAtraso",     nome: "Juros Operação em Atraso",   type: "N", fmt: "valor" },
  { ini: 215, fim: 227, key: "iofDevido",       nome: "IOF Devido",                 type: "N", fmt: "valor" },
  { ini: 228, fim: 240, key: "abatimento",      nome: "Abatimento Concedido",       type: "N", fmt: "valor" },
  { ini: 241, fim: 253, key: "descontoConc",    nome: "Desconto Concedido",         type: "N", fmt: "valor" },
  { ini: 254, fim: 266, key: "valorPago",       nome: "Valor Pago",                 type: "N", fmt: "valor" },
  { ini: 267, fim: 279, key: "jurosMora",       nome: "Juros de Mora",              type: "N", fmt: "valor" },
  { ini: 280, fim: 292, key: "outrosCreditos",  nome: "Outros Créditos",            type: "N", fmt: "valor" },
  { ini: 293, fim: 294, key: "brancos1",        nome: "Brancos",                    type: "A" },
  { ini: 295, fim: 295, key: "motivoProtesto",  nome: "Motivo Ocorrência 19",       type: "A" },
  { ini: 296, fim: 301, key: "dataCredito",     nome: "Data do Crédito",            type: "N", fmt: "data" },
  { ini: 302, fim: 304, key: "origemPagamento", nome: "Origem Pagamento",           type: "A" },
  { ini: 305, fim: 314, key: "brancos2",        nome: "Brancos",                    type: "A" },
  { ini: 315, fim: 318, key: "codBancoCheque",  nome: "Banco do Cheque (0237)",     type: "N" },
  { ini: 319, fim: 328, key: "motivosRejeicao", nome: "Motivos das Rejeições",      type: "A" },
  { ini: 329, fim: 368, key: "brancos3",        nome: "Brancos",                    type: "A" },
  { ini: 369, fim: 370, key: "numCartorio",     nome: "Número do Cartório",         type: "N" },
  { ini: 371, fim: 380, key: "numProtocolo",    nome: "Número do Protocolo",        type: "N" },
  { ini: 381, fim: 394, key: "brancos4",        nome: "Brancos",                    type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",     nome: "Nº Seqüencial de Registro",  type: "N" }
];

// TRAILER - Registro 9. Reproduz byte a byte a montagem manual de
// gerarTrailer()/leitura de parseRetorno() do script original.
const TRAILER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",       nome: "Identificação do Registro", type: "N", fixo: "9" },
  { ini: 2,   fim: 2,   key: "idArquivo",        nome: "Identificação Arquivo",     type: "N", fixo: "2" },
  { ini: 3,   fim: 4,   key: "codServico",       nome: "Código do Serviço",         type: "N", fixo: "01" },
  { ini: 5,   fim: 7,   key: "numBradesco",      nome: "Nº Bradesco (Compensação)", type: "N", fixo: "237" },
  { ini: 8,   fim: 17,  key: "brancos1",         nome: "Brancos",                   type: "A" },
  { ini: 18,  fim: 25,  key: "quantidadeTitulos",nome: "Quantidade de Títulos",     type: "N" },
  { ini: 26,  fim: 39,  key: "valorTotal",       nome: "Valor Total dos Títulos",   type: "N", fmt: "valor" },
  { ini: 40,  fim: 394, key: "brancos2",         nome: "Brancos",                   type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",      nome: "Nº Seqüencial de Registro", type: "N" }
];

const OCORRENCIAS = {
  "02": "Entrada Confirmada",
  "03": "Entrada Rejeitada",
  "06": "Liquidação Normal",
  "09": "Baixado Automaticamente via Arquivo",
  "10": "Baixado conforme instruções da Agência",
  "11": "Em Ser (Títulos pendentes)",
  "12": "Abatimento Concedido",
  "13": "Abatimento Cancelado",
  "14": "Vencimento Alterado",
  "15": "Liquidação em Cartório",
  "16": "Título Pago em Cheque (Vinculado)",
  "17": "Liquidação após baixa / não registrado",
  "18": "Acerto de Depositária",
  "19": "Confirmação Receb. Instrução de Protesto",
  "20": "Confirmação Receb. Instrução Sustação Protesto",
  "21": "Acerto do Controle do Participante",
  "22": "Título com Pagamento Cancelado",
  "23": "Entrada do Título em Cartório",
  "24": "Entrada Rejeitada por CEP Irregular",
  "27": "Baixa Rejeitada",
  "28": "Débito de Tarifas / Custas",
  "30": "Alteração de Outros Dados Rejeitados",
  "32": "Instrução Rejeitada",
  "33": "Confirmação Pedido Alteração Outros Dados",
  "34": "Retirado de Cartório e Manutenção Carteira",
  "35": "Desagendamento do Débito Automático",
  "40": "Estorno de Pagamento",
  "55": "Sustado Judicial",
  "68": "Acerto dos dados do Rateio de Crédito",
  "69": "Cancelamento dos dados do Rateio"
};

// Quais ocorrências têm motivo na posição 319-328 (vs. "sem motivo")
const OCORRENCIA_COM_MOTIVO = ["02", "03", "09", "10", "24", "27", "28", "30", "32", "35"];

// Motivos mais comuns (não exaustivo — varia por ocorrência). Usado só como ajuda visual.
const MOTIVOS = {
  "00": "Ocorrência aceita / Título pago em dinheiro",
  "01": "Código do Banco inválido",
  "04": "Cód. movimento não permitido p/ carteira",
  "08": "Nosso número inválido",
  "09": "Nosso número duplicado",
  "10": "Carteira inválida",
  "15": "Título pago com cheque / Características incompatíveis",
  "16": "Data de vencimento inválida",
  "17": "Venc. anterior à emissão",
  "20": "Valor do título inválido",
  "21": "Espécie do título inválida",
  "24": "Data de emissão inválida",
  "46": "Tipo/nº de inscrição do sacado inválidos",
  "48": "CEP inválido",
  "63": "Entrada para título já cadastrado"
};

export const bradesco = {
  code: "237",
  nome: "Bradesco",
  headerFields: HEADER_FIELDS,
  detalheFields: DETALHE_FIELDS,
  trailerFields: TRAILER_FIELDS,
  ocorrencias: OCORRENCIAS,
  ocorrenciaComMotivo: OCORRENCIA_COM_MOTIVO,
  motivos: MOTIVOS,
  // Regra original: soma valorPago quando existir, senão cai para valorTitulo.
  trailerTotalFn: det => Number(det.valorPago) || Number(det.valorTitulo) || 0,
  // Chaves aqui são as MESMAS chaves de headerFields/detalheFields — a UI
  // (ui.js) monta o formulário direto a partir do field def (nome, tipo,
  // fmt), sem nenhuma camada de tradução de nomes.
  formFields: {
    header: ["codEmpresa", "nomeEmpresa", "dataGravacao", "avisoBancario", "dataCredito"],
    detalhe: ["nossoNumero", "carteira", "ocorrencia", "numDocumento", "dataVencimento", "valorTitulo", "valorPago", "dataCredito", "motivosRejeicao"]
  }
};
