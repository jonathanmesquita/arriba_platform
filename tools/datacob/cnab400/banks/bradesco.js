/* =====================================================================
   CNAB 400 - Bradesco (237) | Config para o motor genérico (engine.js)

   Remessa e Retorno são layouts diferentes — cada um é um objeto
   AUTOCONTIDO (headerFields/detalheFields/trailerFields + tabelas de
   domínio + formFields), no MESMO formato que engine.js já espera.
   Ou seja: ui.js só passa `bradesco.retorno` ou `bradesco.remessa`
   direto para parseArquivo/gerarArquivo — nenhuma mudança no motor.

   (Isso difere um pouco do esboço original do PROMPT 3, que colocava
   ocorrencias/motivos/formFields no nível do banco, fora de
   remessa/retorno. Mantive tudo dentro de cada direção porque Remessa
   e Retorno têm ocorrências/motivos com significados DIFERENTES — a
   ocorrência "01" na Remessa é uma instrução nossa ["Entrada de
   Título"], não o status que o banco devolve no Retorno. Juntar as
   duas tabelas seria incorreto.)

   RETORNO — Header e Detalhe: fonte de verdade portada de
   tools/datacob/cnab400-bradesco/script.js (HEADER_FIELDS,
   DETALHE_FIELDS, OCORRENCIAS, OCORRENCIA_COM_MOTIVO, MOTIVOS).
   Posições NÃO foram alteradas — já validadas byte a byte contra o
   manual e arquivos reais. TRAILER_FIELDS foi reconstruído byte a byte
   contra VALIDADOR_CNAB400_BRADESCO__RETORNO.xlsx (linha real de
   Trailer) — troca o antigo bloco único "brancos2" (40–394) pelo
   detalhamento real: aviso bancário + 5 pares quantidade/valor por
   ocorrência (02, 06, 09/10, 13, 14, 12, 19) + total de rateios.

   REMESSA — Header, Detalhe e Trailer reconstruídos byte a byte contra
   VALIDADOR_CNAB400_BRADESCO__REMESSA.xlsx (linha real de cada
   registro — cada campo abaixo conferido via slice(ini-1, fim) contra
   o Resultado esperado da planilha). Isso substitui a versão anterior,
   que tinha o Detalhe quase todo como "brancoRemN" (não confirmado) e
   errava a posição do valorTitulo (128–140; a real é 127–139).
   Header: a única diferença do envelope do Retorno é 101–108, que no
   Retorno é a "densidade" fixa e na Remessa real é BRANCO.
   Trailer: bem mais simples que o do Retorno — é só idRegistro(9) +
   branco(2–394) + seqRegistro, sem quantidade/valor de títulos.
   ===================================================================== */

"use strict";

/* =====================================================================
   RETORNO
   ===================================================================== */

const RETORNO_HEADER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",     nome: "Identificação do Registro",     type: "N", fixo: "0" },
  { ini: 2,   fim: 2,   key: "idArquivo",      nome: "Identificação Arquivo Retorno", type: "N", fixo: "2" },
  { ini: 3,   fim: 9,   key: "literalRetorno", nome: "Literal Retorno",               type: "A", fixo: "RETORNO" },
  { ini: 10,  fim: 11,  key: "codServico",     nome: "Código do Serviço",             type: "N", fixo: "01" },
  { ini: 12,  fim: 26,  key: "literalServico", nome: "Literal Serviço",               type: "A", fixo: "COBRANCA" },
  { ini: 27,  fim: 46,  key: "codEmpresa",     nome: "Código da Empresa",             type: "N",
    obrigatorio: true, ajuda: "Código da empresa cedente no Bradesco. Zeros à esquerda; 20 posições.", exemplo: "5213287" },
  { ini: 47,  fim: 76,  key: "nomeEmpresa",    nome: "Nome da Empresa",               type: "A",
    obrigatorio: true, ajuda: "Nome/razão social da empresa. Espaços à direita; 30 posições.", exemplo: "PH3A COMERCIO E SERVICOS DE TE" },
  { ini: 77,  fim: 79,  key: "numBradesco",    nome: "Nº Bradesco (Compensação)",     type: "N", fixo: "237" },
  { ini: 80,  fim: 94,  key: "nomeBanco",      nome: "Nome do Banco",                 type: "A", fixo: "BRADESCO" },
  { ini: 95,  fim: 100, key: "dataGravacao",   nome: "Data da Gravação",              type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data em que o banco gerou o arquivo de retorno.", exemplo: "2024-11-08" },
  { ini: 101, fim: 108, key: "densidade",      nome: "Densidade de Gravação",         type: "N", fixo: "01600000" },
  { ini: 109, fim: 113, key: "avisoBancario",  nome: "Nº Aviso Bancário",             type: "N",
    ajuda: "Número do aviso bancário, quando informado pelo banco. Zeros à esquerda; 5 posições.", exemplo: "4" },
  { ini: 114, fim: 379, key: "branco1",        nome: "Branco",                        type: "A" },
  { ini: 380, fim: 385, key: "dataCredito",    nome: "Data do Crédito",               type: "N", fmt: "data",
    ajuda: "Data em que o valor foi creditado na conta da empresa (nível Header/lote).", exemplo: "2024-11-08" },
  { ini: 386, fim: 394, key: "branco2",        nome: "Branco",                        type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",    nome: "Nº Seqüencial do Registro",     type: "N", fixo: "000001" }
];

const RETORNO_DETALHE_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",      nome: "Identificação do Registro",  type: "N", fixo: "1" },
  { ini: 2,   fim: 3,   key: "tipoInscEmpresa", nome: "Tipo Inscrição Empresa",     type: "N" },
  { ini: 4,   fim: 17,  key: "numInscEmpresa",  nome: "Nº Inscrição Empresa",       type: "N" },
  { ini: 18,  fim: 20,  key: "zeros1",          nome: "Zeros",                      type: "N" },
  { ini: 21,  fim: 37,  key: "idEmpresaBanco",  nome: "Ident. Empresa no Banco",    type: "N" },
  { ini: 38,  fim: 62,  key: "controleParticip",nome: "Nº Controle do Participante",type: "A" },
  { ini: 63,  fim: 70,  key: "zeros2",          nome: "Zeros",                      type: "N" },
  { ini: 71,  fim: 82,  key: "nossoNumero",     nome: "Identificação do Título no Banco (Nosso Número)", type: "A",
    obrigatorio: true, ajuda: "Nosso número atribuído pelo Bradesco ao título. Espaços à direita; 12 posições.", exemplo: "999080197586" },
  { ini: 83,  fim: 92,  key: "usoBanco1",       nome: "Uso do Banco",               type: "A" },
  { ini: 93,  fim: 104, key: "usoBanco2",       nome: "Uso do Banco",               type: "N" },
  { ini: 105, fim: 105, key: "indRateio",       nome: "Indicador de Rateio Crédito",type: "A" },
  { ini: 106, fim: 107, key: "zeros3",          nome: "Zeros",                      type: "N" },
  { ini: 108, fim: 108, key: "carteira",        nome: "Carteira",                   type: "N",
    obrigatorio: true, ajuda: "Código da carteira de cobrança. 1 posição numérica.", exemplo: "09" },
  { ini: 109, fim: 110, key: "ocorrencia",      nome: "Identificação de Ocorrência",type: "N",
    obrigatorio: true, ajuda: "Código do status devolvido pelo banco (ex.: 06 = Liquidação Normal). Ver tabela de ocorrências.", exemplo: "06" },
  { ini: 111, fim: 116, key: "dataOcorrencia",  nome: "Data Ocorrência no Banco",   type: "N", fmt: "data" },
  { ini: 117, fim: 126, key: "numDocumento",    nome: "Número do Documento",        type: "A",
    obrigatorio: true, ajuda: "Número do documento/título dado pela empresa. Espaços à direita; 10 posições.", exemplo: "266728" },
  { ini: 127, fim: 146, key: "idTituloBanco20", nome: "Ident. Título no Banco",     type: "A" },
  { ini: 147, fim: 152, key: "dataVencimento",  nome: "Data Vencimento do Título",  type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data de vencimento original do título.", exemplo: "2024-11-06" },
  { ini: 153, fim: 165, key: "valorTitulo",     nome: "Valor do Título",            type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor nominal do título, em reais (2 decimais implícitas na geração).", exemplo: "52,56" },
  { ini: 166, fim: 168, key: "bancoCobrador",   nome: "Banco Cobrador",             type: "N" },
  { ini: 169, fim: 173, key: "agenciaCobradora",nome: "Agência Cobradora",          type: "N" },
  { ini: 174, fim: 175, key: "especieTitulo",   nome: "Espécie do Título",          type: "A" },
  { ini: 176, fim: 188, key: "despesasCobranca",nome: "Despesas de Cobrança",       type: "N", fmt: "valor" },
  { ini: 189, fim: 201, key: "outrasDespesas",  nome: "Outras Despesas / Custas",   type: "N", fmt: "valor" },
  { ini: 202, fim: 214, key: "jurosAtraso",     nome: "Juros Operação em Atraso",   type: "N", fmt: "valor" },
  { ini: 215, fim: 227, key: "iofDevido",       nome: "IOF Devido",                 type: "N", fmt: "valor" },
  { ini: 228, fim: 240, key: "abatimento",      nome: "Abatimento Concedido",       type: "N", fmt: "valor" },
  { ini: 241, fim: 253, key: "descontoConc",    nome: "Desconto Concedido",         type: "N", fmt: "valor" },
  { ini: 254, fim: 266, key: "valorPago",       nome: "Valor Pago",                 type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor efetivamente pago pelo sacado, em reais.", exemplo: "52,56" },
  { ini: 267, fim: 279, key: "jurosMora",       nome: "Juros de Mora",              type: "N", fmt: "valor" },
  { ini: 280, fim: 292, key: "outrosCreditos",  nome: "Outros Créditos",            type: "N", fmt: "valor" },
  { ini: 293, fim: 294, key: "brancos1",        nome: "Brancos",                    type: "A" },
  { ini: 295, fim: 295, key: "motivoProtesto",  nome: "Motivo Ocorrência 19",       type: "A" },
  { ini: 296, fim: 301, key: "dataCredito",     nome: "Data do Crédito",            type: "N", fmt: "data",
    ajuda: "Data em que o valor pago foi creditado à empresa.", exemplo: "2024-11-07" },
  { ini: 302, fim: 304, key: "origemPagamento", nome: "Origem Pagamento",           type: "A" },
  { ini: 305, fim: 314, key: "brancos2",        nome: "Brancos",                    type: "A" },
  { ini: 315, fim: 318, key: "codBancoCheque",  nome: "Banco do Cheque (0237)",     type: "N" },
  { ini: 319, fim: 328, key: "motivosRejeicao", nome: "Motivos das Rejeições",      type: "A",
    ajuda: "5 pares de 2 dígitos com o(s) código(s) de motivo — só relevante para ocorrências com motivo (02, 03, 09, 10, 24, 27, 28, 30, 32, 35).", exemplo: "0000000000" },
  { ini: 329, fim: 368, key: "brancos3",        nome: "Brancos",                    type: "A" },
  { ini: 369, fim: 370, key: "numCartorio",     nome: "Número do Cartório",         type: "N" },
  { ini: 371, fim: 380, key: "numProtocolo",    nome: "Número do Protocolo",        type: "N" },
  { ini: 381, fim: 394, key: "brancos4",        nome: "Brancos",                    type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",     nome: "Nº Seqüencial de Registro",  type: "N" }
];

// Mapa completo, validado byte a byte contra planilha VALIDADOR_CNAB400_
// BRADESCO__RETORNO.xlsx (linha real de Trailer, 400 posições — cada
// campo abaixo conferido via slice(ini-1, fim) contra o Resultado
// esperado da planilha). Substitui o antigo "brancos2" único (40–394)
// pelo detalhamento real: aviso bancário + 5 pares quantidade/valor por
// ocorrência + rateio.
const RETORNO_TRAILER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",         nome: "Identificação do Registro",  type: "N", fixo: "9" },
  { ini: 2,   fim: 2,   key: "idArquivo",          nome: "Identificação Arquivo",      type: "N", fixo: "2" },
  { ini: 3,   fim: 4,   key: "codServico",         nome: "Código do Serviço",          type: "N", fixo: "01" },
  { ini: 5,   fim: 7,   key: "numBradesco",        nome: "Nº Bradesco (Compensação)",  type: "N", fixo: "237" },
  { ini: 8,   fim: 17,  key: "brancos1",           nome: "Brancos",                    type: "A" },
  { ini: 18,  fim: 25,  key: "quantidadeTitulos",  nome: "Quantidade de Títulos em Cobrança", type: "N" },
  { ini: 26,  fim: 39,  key: "valorTotal",         nome: "Valor Total dos Títulos em Cobrança", type: "N", fmt: "valor" },
  { ini: 40,  fim: 47,  key: "avisoBancario",      nome: "Nº do Aviso Bancário",       type: "N" },
  { ini: 48,  fim: 57,  key: "brancos2",           nome: "Brancos",                    type: "A" },
  { ini: 58,  fim: 62,  key: "qtdOcorrencia02",    nome: "Qtde. Ocorrência 02 (Confirmação de Entradas)", type: "N" },
  { ini: 63,  fim: 74,  key: "valorOcorrencia02",  nome: "Valor Ocorrência 02 (Confirmação de Entradas)", type: "N", fmt: "valor" },
  { ini: 75,  fim: 86,  key: "valorOcorrencia06",  nome: "Valor Ocorrência 06 (Liquidação)", type: "N", fmt: "valor" },
  { ini: 87,  fim: 91,  key: "qtdOcorrencia06",    nome: "Qtde. Ocorrência 06 (Liquidação)", type: "N" },
  { ini: 92,  fim: 103, key: "valorOcorrencia06b", nome: "Valor Ocorrência 06 (2ª faixa)", type: "N", fmt: "valor" },
  { ini: 104, fim: 108, key: "qtdOcorrencia0910",  nome: "Qtde. Ocorrência 09/10 (Baixados)", type: "N" },
  { ini: 109, fim: 120, key: "valorOcorrencia0910",nome: "Valor Ocorrência 09/10 (Baixados)", type: "N", fmt: "valor" },
  { ini: 121, fim: 125, key: "qtdOcorrencia13",    nome: "Qtde. Ocorrência 13 (Abatimento Cancelado)", type: "N" },
  { ini: 126, fim: 137, key: "valorOcorrencia13",  nome: "Valor Ocorrência 13 (Abatimento Cancelado)", type: "N", fmt: "valor" },
  { ini: 138, fim: 142, key: "qtdOcorrencia14",    nome: "Qtde. Ocorrência 14 (Vencimento Alterado)", type: "N" },
  { ini: 143, fim: 154, key: "valorOcorrencia14",  nome: "Valor Ocorrência 14 (Vencimento Alterado)", type: "N", fmt: "valor" },
  { ini: 155, fim: 159, key: "qtdOcorrencia12",    nome: "Qtde. Ocorrência 12 (Abatimento Concedido)", type: "N" },
  { ini: 160, fim: 171, key: "valorOcorrencia12",  nome: "Valor Ocorrência 12 (Abatimento Concedido)", type: "N", fmt: "valor" },
  { ini: 172, fim: 176, key: "qtdOcorrencia19",    nome: "Qtde. Ocorrência 19 (Confirmação de Protesto)", type: "N" },
  { ini: 177, fim: 188, key: "valorOcorrencia19",  nome: "Valor Ocorrência 19 (Confirmação de Protesto)", type: "N", fmt: "valor" },
  { ini: 189, fim: 362, key: "brancos3",           nome: "Brancos",                    type: "A" },
  { ini: 363, fim: 377, key: "valorTotalRateios",  nome: "Valor Total dos Rateios Efetuados", type: "N", fmt: "valor" },
  { ini: 378, fim: 385, key: "qtdTotalRateios",    nome: "Quantidade Total dos Rateios Efetuados", type: "N" },
  { ini: 386, fim: 394, key: "brancos4",           nome: "Brancos",                    type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",        nome: "Nº Seqüencial de Registro",  type: "N" }
];

const OCORRENCIAS_RETORNO = {
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

const OCORRENCIA_COM_MOTIVO_RETORNO = ["02", "03", "09", "10", "24", "27", "28", "30", "32", "35"];

const MOTIVOS_RETORNO = {
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

/* =====================================================================
   REMESSA

   DETALHE verificado campo a campo contra a linha real de teste:
   100000000000000000000099001220001213400000000000000000502782350000...
   (nossoNumero=00005027823, dac=5, ocorrencia=01, dataVencimento=15/03/2026,
   valorTitulo=128623,80, tipo+numInscPagador=0208981215000142,
   nomePagador="TPR TRANSPORTES E LOGISTICA"). Os "brancoRemN" cobrem
   faixas sem confirmação (não sabemos o campo real ali — não inventamos
   nome/semântica para essas posições).
   ===================================================================== */

const REMESSA_HEADER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",           nome: "Identificação do Registro",      type: "N", fixo: "0" },
  { ini: 2,   fim: 2,   key: "idArquivo",            nome: "Identificação Arquivo Remessa",  type: "N", fixo: "1" },
  { ini: 3,   fim: 9,   key: "literalRemessa",       nome: "Literal Remessa",                type: "A", fixo: "REMESSA" },
  { ini: 10,  fim: 11,  key: "codServico",           nome: "Código do Serviço",              type: "N", fixo: "01" },
  { ini: 12,  fim: 26,  key: "literalServico",       nome: "Literal Serviço",                type: "A", fixo: "COBRANCA" },
  { ini: 27,  fim: 46,  key: "codEmpresa",           nome: "Código da Empresa",              type: "N",
    obrigatorio: true, ajuda: "Código da empresa cedente no Bradesco (mesmo código do Retorno). Zeros à esquerda; 20 posições.", exemplo: "5213287" },
  { ini: 47,  fim: 76,  key: "nomeEmpresa",          nome: "Nome da Empresa",                type: "A",
    obrigatorio: true, ajuda: "Nome/razão social da empresa. Espaços à direita; 30 posições.", exemplo: "PH3A COMERCIO E SERVICOS DE TE" },
  { ini: 77,  fim: 79,  key: "numBradesco",          nome: "Nº Bradesco (Compensação)",      type: "N", fixo: "237" },
  { ini: 80,  fim: 94,  key: "nomeBanco",            nome: "Nome do Banco",                  type: "A", fixo: "BRADESCO" },
  { ini: 95,  fim: 100, key: "dataGravacao",         nome: "Data da Gravação",               type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data em que a empresa gerou o arquivo de remessa.", exemplo: "2024-11-08" },
  { ini: 101, fim: 108, key: "brancoHeader1",        nome: "Branco",                         type: "A" },
  { ini: 109, fim: 110, key: "identificacaoSistema", nome: "Identificação do Sistema",       type: "A",
    ajuda: "Código do sistema de origem informado pelo Bradesco (ex.: \"MX\").", exemplo: "MX" },
  { ini: 111, fim: 117, key: "seqRemessa",           nome: "Nº Sequencial de Remessa",       type: "N",
    obrigatorio: true, ajuda: "Número sequencial desta remessa (controle da empresa). Zeros à esquerda; 7 posições.", exemplo: "1" },
  { ini: 118, fim: 394, key: "brancoHeader2",        nome: "Branco",                         type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",          nome: "Nº Seqüencial do Registro",      type: "N", fixo: "000001" }
];

const REMESSA_DETALHE_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",         nome: "Identificação do Registro",             type: "N", fixo: "1" },
  { ini: 2,   fim: 6,   key: "agenciaDebito",      nome: "Agência de Débito (opcional)",           type: "N" },
  { ini: 7,   fim: 7,   key: "digAgenciaDebito",   nome: "Dígito da Agência de Débito (opcional)", type: "N" },
  { ini: 8,   fim: 12,  key: "razaoContaCorrente", nome: "Razão da Conta Corrente (opcional)",     type: "N" },
  { ini: 13,  fim: 19,  key: "contaCorrente",      nome: "Conta Corrente (opcional)",              type: "N" },
  { ini: 20,  fim: 20,  key: "digContaCorrente",   nome: "Dígito da Conta Corrente (opcional)",    type: "N" },
  { ini: 21,  fim: 37,  key: "idEmpresaBanco",     nome: "Identificação da Empresa no Banco",      type: "N" },
  { ini: 38,  fim: 62,  key: "controleParticip",   nome: "Nº Controle do Participante",            type: "A" },
  { ini: 63,  fim: 65,  key: "codBancoDebito",     nome: "Código do Banco a Debitar (Compensação)", type: "N" },
  { ini: 66,  fim: 66,  key: "campoMulta",         nome: "Campo de Multa",                         type: "N" },
  { ini: 67,  fim: 70,  key: "percentualMulta",    nome: "Percentual de Multa",                    type: "N" },
  { ini: 71,  fim: 81,  key: "nossoNumero",        nome: "Nosso Número",                           type: "A",
    obrigatorio: true, ajuda: "Nosso número escolhido pela empresa para este título (sem o DAC). Espaços à direita; 11 posições.", exemplo: "00005027823" },
  { ini: 82,  fim: 82,  key: "dac",                nome: "DAC do Nosso Número",                    type: "A",
    obrigatorio: true, ajuda: "Dígito verificador do Nosso Número — calculado pela empresa (regra própria do Bradesco, módulo 11). Pode ser um número ou a letra \"P\" (resultado de módulo 10 no cálculo). 1 posição.", exemplo: "P" },
  { ini: 83,  fim: 92,  key: "descontoBonifDia",   nome: "Desconto/Bonificação por Dia",           type: "N" },
  { ini: 93,  fim: 93,  key: "condEmissaoPapeleta",nome: "Condição p/ Emissão da Papeleta",        type: "N" },
  { ini: 94,  fim: 94,  key: "emiteBoletoDebAuto", nome: "Emite Boleto p/ Débito Automático",      type: "A" },
  { ini: 95,  fim: 104, key: "idOperacaoBanco",    nome: "Identificação da Operação do Banco",     type: "A" },
  { ini: 105, fim: 105, key: "indRateio",          nome: "Indicador de Rateio Crédito (opcional)", type: "A" },
  { ini: 106, fim: 106, key: "enderecoAvisoDebito",nome: "Endereçamento p/ Aviso de Débito Automático", type: "N" },
  { ini: 107, fim: 108, key: "brancoDet1",         nome: "Branco",                                 type: "A" },
  { ini: 109, fim: 110, key: "ocorrencia",         nome: "Identificação de Ocorrência",            type: "N",
    obrigatorio: true, ajuda: "Código da instrução enviada ao banco (ex.: 01 = Entrada de Título). Tabela própria da Remessa — diferente da do Retorno.", exemplo: "01" },
  { ini: 111, fim: 120, key: "numDocumento",       nome: "Nº do Documento",                        type: "A",
    ajuda: "Número do documento/título dado pela empresa. Espaços à direita; 10 posições.", exemplo: "266728" },
  { ini: 121, fim: 126, key: "dataVencimento",     nome: "Data de Vencimento",                     type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data de vencimento do título.", exemplo: "2026-03-15" },
  { ini: 127, fim: 139, key: "valorTitulo",        nome: "Valor do Título",                        type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor nominal do título, em reais (2 decimais implícitas na geração).", exemplo: "1.286,24" },
  { ini: 140, fim: 142, key: "bancoCobrador",      nome: "Banco Encarregado da Cobrança",          type: "N" },
  { ini: 143, fim: 147, key: "agenciaDepositaria", nome: "Agência Depositária",                    type: "N" },
  { ini: 148, fim: 149, key: "especieTitulo",      nome: "Espécie do Título",                      type: "N" },
  { ini: 150, fim: 150, key: "aceite",             nome: "Aceite",                                 type: "A",
    ajuda: "A = Aceite, N = Não Aceite.", exemplo: "N" },
  { ini: 151, fim: 156, key: "dataEmissao",        nome: "Data de Emissão do Título",              type: "N", fmt: "data" },
  { ini: 157, fim: 158, key: "instrucao1",         nome: "1ª Instrução de Cobrança",               type: "N" },
  { ini: 159, fim: 160, key: "instrucao2",         nome: "2ª Instrução de Cobrança",               type: "N" },
  { ini: 161, fim: 173, key: "valorMoraDia",       nome: "Valor a Cobrar por Dia de Atraso",       type: "N", fmt: "valor" },
  { ini: 174, fim: 179, key: "dataLimiteDesconto", nome: "Data Limite p/ Concessão de Desconto",   type: "N", fmt: "data" },
  { ini: 180, fim: 192, key: "valorDesconto",      nome: "Valor do Desconto a Conceder",           type: "N", fmt: "valor" },
  { ini: 193, fim: 205, key: "valorIOF",           nome: "Valor do IOF",                           type: "N", fmt: "valor" },
  { ini: 206, fim: 218, key: "valorAbatimento",    nome: "Valor do Abatimento a Conceder/Cancelar", type: "N", fmt: "valor" },
  { ini: 219, fim: 220, key: "codInscPagador",     nome: "Tipo de Inscrição do Pagador",           type: "N",
    ajuda: "01 = CPF do pagador, 02 = CNPJ do pagador.", exemplo: "02" },
  { ini: 221, fim: 234, key: "numInscPagador",     nome: "Nº de Inscrição do Pagador",             type: "N",
    obrigatorio: true, ajuda: "CPF ou CNPJ do pagador, sem pontuação. Zeros à esquerda; 14 posições.", exemplo: "08981215000142" },
  { ini: 235, fim: 274, key: "nomePagador",        nome: "Nome do Pagador",                        type: "A",
    obrigatorio: true, ajuda: "Nome do sacado/pagador. Espaços à direita; 40 posições.", exemplo: "TPR TRANSPORTES E LOGISTICA" },
  { ini: 275, fim: 314, key: "logradouro",         nome: "Endereço Completo do Pagador",           type: "A",
    ajuda: "Rua, número e complemento do pagador. Espaços à direita; 40 posições.", exemplo: "RUA PORTO ALEGRE S N" },
  { ini: 315, fim: 326, key: "mensagem1",          nome: "1ª Mensagem",                            type: "A" },
  { ini: 327, fim: 331, key: "cep",                nome: "CEP do Pagador",                         type: "N" },
  { ini: 332, fim: 334, key: "sufixoCep",          nome: "Sufixo do CEP",                          type: "N" },
  { ini: 335, fim: 394, key: "sacadorAvalistaMsg2",nome: "Sacador/Avalista ou 2ª Mensagem",        type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",        nome: "Nº Seqüencial de Registro",              type: "N" }
];

// Trailer de Remessa: bem mais simples que o do Retorno — confirmado
// contra a linha real da planilha validadora (não tem quantidade/valor
// de títulos, é praticamente todo branco).
const REMESSA_TRAILER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",  nome: "Identificação do Registro", type: "N", fixo: "9" },
  { ini: 2,   fim: 394, key: "brancos",     nome: "Branco",                    type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro", nome: "Nº Seqüencial de Registro", type: "N" }
];

// Ocorrências (instruções) da Remessa — significado diferente das do
// Retorno, mesmo quando o código numérico coincide.
const OCORRENCIAS_REMESSA = {
  "01": "Entrada de Título",
  "02": "Pedido de Baixa",
  "04": "Concessão de Abatimento",
  "05": "Cancelamento de Abatimento",
  "06": "Alteração de Vencimento",
  "09": "Protestar Título",
  "18": "Sustar Protesto"
};

export const bradesco = {
  code: "237",
  nome: "Bradesco",

  retorno: {
    headerFields: RETORNO_HEADER_FIELDS,
    detalheFields: RETORNO_DETALHE_FIELDS,
    trailerFields: RETORNO_TRAILER_FIELDS,
    ocorrencias: OCORRENCIAS_RETORNO,
    ocorrenciaComMotivo: OCORRENCIA_COM_MOTIVO_RETORNO,
    motivos: MOTIVOS_RETORNO,
    // Regra original do script.js: soma valorPago quando existir, senão cai para valorTitulo.
    trailerTotalFn: det => Number(det.valorPago) || Number(det.valorTitulo) || 0,
    formFields: {
      header: ["codEmpresa", "nomeEmpresa", "dataGravacao", "avisoBancario", "dataCredito"],
      detalhe: ["nossoNumero", "carteira", "ocorrencia", "numDocumento", "dataVencimento", "valorTitulo", "valorPago", "dataCredito", "motivosRejeicao"]
    }
  },

  remessa: {
    headerFields: REMESSA_HEADER_FIELDS,
    detalheFields: REMESSA_DETALHE_FIELDS,
    trailerFields: REMESSA_TRAILER_FIELDS,
    ocorrencias: OCORRENCIAS_REMESSA,
    ocorrenciaComMotivo: [],
    motivos: {},
    trailerTotalKey: "valorTitulo",
    formFields: {
      header: ["codEmpresa", "nomeEmpresa", "dataGravacao", "identificacaoSistema", "seqRemessa"],
      detalhe: ["nossoNumero", "dac", "ocorrencia", "numDocumento", "dataVencimento", "valorTitulo", "codInscPagador", "numInscPagador", "nomePagador"]
    }
  }
};
