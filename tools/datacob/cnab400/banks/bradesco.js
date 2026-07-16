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

   RETORNO — fonte de verdade: portado de
   tools/datacob/cnab400-bradesco/script.js (HEADER_FIELDS,
   DETALHE_FIELDS, OCORRENCIAS, OCORRENCIA_COM_MOTIVO, MOTIVOS).
   Posições NÃO foram alteradas — já validadas byte a byte contra o
   manual e arquivos reais. TRAILER_FIELDS reproduz byte a byte a
   montagem manual que existia em gerarTrailer()/parseRetorno().

   REMESSA — construída para este PROMPT 3. O DETALHE foi validado
   campo a campo contra a linha real de teste fornecida (ver
   comentário "verificado" abaixo — corrigi valorTitulo de 127–139
   para 128–140, a posição do prompt estava 1 casa deslocada: 127–139
   dá 12862,38, só 128–140 reproduz os 128623,80 esperados). O HEADER e
   o TRAILER de Remessa NÃO têm uma linha real para validar ainda —
   foram montados espelhando o envelope já comprovado do Retorno
   (idRegistro, idArquivo, literal, códigos de serviço/banco,
   seqRegistro final — convenção universal do CNAB 400) mais os dois
   campos que o prompt deu explicitamente (identificação do sistema e
   nº sequencial de remessa). Tudo o que não foi confirmado por dado
   real ficou como "filler" (brancoRemN) sem nome de negócio inventado
   — nenhuma posição "provável" foi apresentada como certa. Se você
   tiver uma linha real de Header/Trailer de Remessa, mandamos e
   fechamos os últimos buracos.
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

// Reproduz byte a byte a montagem manual que existia em
// gerarTrailer()/parseRetorno() do script original (não é mapa oficial
// completo do manual — é a mesma montagem já validada/em uso).
const RETORNO_TRAILER_FIELDS = [
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
  // 101-108: mesma posição de "densidade" do Retorno — não confirmado
  // com linha real de Remessa, mantido por simetria com o envelope já
  // validado no Retorno.
  { ini: 101, fim: 108, key: "densidade",            nome: "Densidade de Gravação (não confirmado)", type: "N", fixo: "01600000" },
  // Únicos 2 campos de header que o PROMPT 3 deu explicitamente:
  { ini: 109, fim: 110, key: "identificacaoSistema", nome: "Identificação do Sistema",       type: "A",
    ajuda: "Código do sistema de origem informado pelo Bradesco (ex.: \"MX\"). Confirme com seu gerente de conta se não tiver certeza.", exemplo: "MX" },
  { ini: 111, fim: 117, key: "seqRemessa",           nome: "Nº Sequencial de Remessa",       type: "N",
    obrigatorio: true, ajuda: "Número sequencial desta remessa (controle da empresa). Zeros à esquerda; 7 posições.", exemplo: "1" },
  { ini: 118, fim: 394, key: "brancoRem1",           nome: "Não confirmado",                 type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",          nome: "Nº Seqüencial do Registro",      type: "N", fixo: "000001" }
];

const REMESSA_DETALHE_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",            nome: "Identificação do Registro", type: "N", fixo: "1" },
  { ini: 2,   fim: 70,  key: "brancoRem2",            nome: "Não confirmado",            type: "A" },
  { ini: 71,  fim: 81,  key: "nossoNumero",           nome: "Nosso Número",              type: "A",
    obrigatorio: true, ajuda: "Nosso número escolhido pela empresa para este título (sem o DAC). Espaços à direita; 11 posições.", exemplo: "00005027823" },
  { ini: 82,  fim: 82,  key: "dac",                   nome: "DAC do Nosso Número",        type: "N",
    obrigatorio: true, ajuda: "Dígito verificador do Nosso Número — calculado pela empresa (regra própria do Bradesco). 1 posição.", exemplo: "5" },
  { ini: 83,  fim: 108, key: "brancoRem3",            nome: "Não confirmado",            type: "A" },
  { ini: 109, fim: 110, key: "ocorrencia",            nome: "Identificação de Ocorrência", type: "N",
    obrigatorio: true, ajuda: "Código da instrução enviada ao banco (ex.: 01 = Entrada de Título). Tabela própria da Remessa — diferente da do Retorno.", exemplo: "01" },
  { ini: 111, fim: 120, key: "brancoRem4",            nome: "Não confirmado",            type: "A" },
  { ini: 121, fim: 126, key: "dataVencimento",        nome: "Data de Vencimento",         type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data de vencimento do título.", exemplo: "2026-03-15" },
  { ini: 127, fim: 127, key: "brancoRem5",            nome: "Não confirmado",            type: "A" },
  { ini: 128, fim: 140, key: "valorTitulo",           nome: "Valor do Título",            type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor nominal do título, em reais (2 decimais implícitas na geração).", exemplo: "1.286,24" },
  { ini: 141, fim: 218, key: "brancoRem6",            nome: "Não confirmado",            type: "A" },
  { ini: 219, fim: 234, key: "tipoInscricaoPagador",  nome: "Tipo + Nº Inscrição do Pagador", type: "N",
    obrigatorio: true, ajuda: "2 dígitos do tipo (ex.: 02 = CNPJ) + 14 dígitos do CPF/CNPJ do pagador, sem pontuação.", exemplo: "0208981215000142" },
  { ini: 235, fim: 274, key: "nomePagador",           nome: "Nome do Pagador",            type: "A",
    obrigatorio: true, ajuda: "Nome do sacado/pagador. Espaços à direita; 40 posições.", exemplo: "TPR TRANSPORTES E LOGISTICA" },
  { ini: 275, fim: 394, key: "brancoRem7",            nome: "Não confirmado",            type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",           nome: "Nº Seqüencial de Registro", type: "N" }
];

// Trailer de Remessa: mesma forma do Trailer de Retorno (idArquivo=1),
// não confirmado com linha real — ver observação no topo do arquivo.
const REMESSA_TRAILER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",       nome: "Identificação do Registro", type: "N", fixo: "9" },
  { ini: 2,   fim: 2,   key: "idArquivo",        nome: "Identificação Arquivo",     type: "N", fixo: "1" },
  { ini: 3,   fim: 4,   key: "codServico",       nome: "Código do Serviço",         type: "N", fixo: "01" },
  { ini: 5,   fim: 7,   key: "numBradesco",      nome: "Nº Bradesco (Compensação)", type: "N", fixo: "237" },
  { ini: 8,   fim: 17,  key: "brancos1",         nome: "Brancos",                   type: "A" },
  { ini: 18,  fim: 25,  key: "quantidadeTitulos",nome: "Quantidade de Títulos",     type: "N" },
  { ini: 26,  fim: 39,  key: "valorTotal",       nome: "Valor Total dos Títulos",   type: "N", fmt: "valor" },
  { ini: 40,  fim: 394, key: "brancos2",         nome: "Brancos",                   type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",      nome: "Nº Seqüencial de Registro", type: "N" }
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
      detalhe: ["nossoNumero", "dac", "ocorrencia", "dataVencimento", "valorTitulo", "tipoInscricaoPagador", "nomePagador"]
    }
  }
};
