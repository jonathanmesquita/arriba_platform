/* =====================================================================
   CNAB 400 - BMP Money Plus (274) | Config para o motor genérico (engine.js)

   FONTE: duas planilhas validadoras fornecidas pelo usuário
   (Validador_CNAB_400_Remessa__Banco_Money_Plus.xlsx e
   Validador_CNAB_400_Retorno__Banco_Money_Plus.xlsx), cada uma com uma
   linha real de exemplo embutida — todo campo abaixo foi conferido via
   slice(ini-1, ini-1+tamanho) contra essa linha antes de entrar aqui.
   Retorno foi cruzado ainda contra 3 arquivos .RET reais do próprio
   usuário (bank 274 / MONEYPLUS): contagem de títulos e valor total do
   Trailer batem exatamente com os detalhes de cada arquivo.

   NÃO é um manual oficial do BMP — é a mesma planilha "VALIDADOR" que já
   usamos pro Bradesco, só que para este banco. Onde a planilha e os
   arquivos reais divergiram (ver RETORNO_TRAILER_FIELDS), o arquivo real
   ganhou — mesma regra usada no Bradesco.

   Header, Detalhe (Remessa) e Ocorrências batem quase campo a campo com
   o Bradesco (mesmo envelope FEBRABAN) — só o Retorno tem uma diferença
   notável: 021-037 do Detalhe é dividido em carteira/agência/conta/dígito
   (como no Itaú), não um "código da empresa" único de 20 dígitos como no
   Bradesco.

   OCORRENCIAS/MOTIVOS: a planilha não trouxe uma tabela de códigos —
   reaproveitado o padrão FEBRABAN já usado no Bradesco (mesmos códigos
   costumam valer entre bancos), NÃO confirmado especificamente contra
   documentação do BMP. Marcar como tal até surgir uma fonte própria.
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
    obrigatorio: true, ajuda: "Código da empresa cedente no BMP. Zeros à esquerda; 20 posições.", exemplo: "1101398309" },
  { ini: 47,  fim: 76,  key: "nomeEmpresa",    nome: "Nome da Empresa",               type: "A",
    obrigatorio: true, ajuda: "Nome/razão social da empresa. Espaços à direita; 30 posições.", exemplo: "PH3A COMERCIO E SERVICOS DE TE" },
  { ini: 77,  fim: 79,  key: "numBanco",       nome: "Nº BMP (Compensação)",          type: "N", fixo: "274" },
  { ini: 80,  fim: 94,  key: "nomeBanco",      nome: "Nome do Banco",                 type: "A", fixo: "MONEYPLUS" },
  { ini: 95,  fim: 100, key: "dataGravacao",   nome: "Data da Gravação",              type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data em que o banco gerou o arquivo de retorno.", exemplo: "2024-11-08" },
  { ini: 101, fim: 108, key: "densidade",      nome: "Densidade de Gravação",         type: "N", fixo: "01600000" },
  { ini: 109, fim: 113, key: "avisoBancario",  nome: "Nº Aviso Bancário",             type: "N",
    ajuda: "Número do aviso bancário, quando informado pelo banco. Zeros à esquerda; 5 posições.", exemplo: "0" },
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
  // Diferente do Bradesco: aqui é carteira/agência/conta/dígito (como no
  // Itaú), não um "código da empresa" único de 20 dígitos.
  { ini: 21,  fim: 21,  key: "zeroFixo",        nome: "Zero",                       type: "N", fixo: "0" },
  { ini: 22,  fim: 23,  key: "carteira",        nome: "Carteira",                   type: "N",
    obrigatorio: true, ajuda: "Código da carteira de cobrança. 2 posições numéricas.", exemplo: "09" },
  { ini: 24,  fim: 27,  key: "agencia",         nome: "Agência",                    type: "N" },
  { ini: 28,  fim: 34,  key: "contaCorrente",   nome: "Conta Corrente",             type: "N" },
  { ini: 35,  fim: 35,  key: "digContaCorrente",nome: "Dígito da Conta",            type: "N" },
  { ini: 36,  fim: 37,  key: "branco3",         nome: "Branco",                     type: "A" },
  { ini: 38,  fim: 52,  key: "controleParticip",nome: "Nº Controle do Participante",type: "A" },
  { ini: 53,  fim: 62,  key: "usoBanco1",       nome: "Uso do Banco",               type: "A" },
  { ini: 63,  fim: 70,  key: "zeros2",          nome: "Zeros",                      type: "N" },
  { ini: 71,  fim: 82,  key: "nossoNumero",     nome: "Identificação do Título no Banco (Nosso Número)", type: "A",
    obrigatorio: true, ajuda: "Nosso número atribuído pelo BMP ao título. Espaços à direita; 12 posições.", exemplo: "521833" },
  { ini: 83,  fim: 92,  key: "usoBanco2",       nome: "Uso do Banco",               type: "A" },
  { ini: 93,  fim: 104, key: "usoBanco3",       nome: "Uso do Banco",               type: "A" },
  { ini: 105, fim: 105, key: "branco4",         nome: "Branco",                     type: "A" },
  { ini: 106, fim: 107, key: "zeros3",          nome: "Zeros",                      type: "N" },
  { ini: 108, fim: 108, key: "zeros4",          nome: "Zeros",                      type: "N" },
  { ini: 109, fim: 110, key: "ocorrencia",      nome: "Identificação de Ocorrência",type: "N",
    obrigatorio: true, ajuda: "Código do status devolvido pelo banco (ex.: 06 = Liquidação Normal). Ver tabela de ocorrências.", exemplo: "06" },
  { ini: 111, fim: 116, key: "dataOcorrencia",  nome: "Data Ocorrência no Banco",   type: "N", fmt: "data" },
  { ini: 117, fim: 126, key: "numDocumento",    nome: "Número do Documento",        type: "A",
    obrigatorio: true, ajuda: "Número do documento/título dado pela empresa. Espaços à direita; 10 posições.", exemplo: "2883339" },
  { ini: 127, fim: 146, key: "idTituloBanco20", nome: "Ident. Título no Banco",     type: "A" },
  { ini: 147, fim: 152, key: "dataVencimento",  nome: "Data Vencimento do Título",  type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data de vencimento original do título.", exemplo: "2024-11-06" },
  { ini: 153, fim: 165, key: "valorTitulo",     nome: "Valor do Título",            type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor nominal do título, em reais (2 decimais implícitas na geração).", exemplo: "194,02" },
  { ini: 166, fim: 168, key: "bancoCobrador",   nome: "Banco Cobrador",             type: "N" },
  { ini: 169, fim: 173, key: "agenciaCobradora",nome: "Agência Cobradora",          type: "N" },
  { ini: 174, fim: 175, key: "especieTitulo",   nome: "Espécie do Título",          type: "A" },
  { ini: 176, fim: 188, key: "despesasCobranca",nome: "Despesas de Cobrança",       type: "N", fmt: "valor" },
  { ini: 189, fim: 201, key: "reservado1",      nome: "Reservado (sempre zeros no BMP)", type: "N" },
  { ini: 202, fim: 214, key: "jurosAtraso",     nome: "Juros Operação em Atraso",   type: "N", fmt: "valor" },
  { ini: 215, fim: 227, key: "reservado2",      nome: "Reservado (sempre zeros no BMP)", type: "N" },
  { ini: 228, fim: 240, key: "abatimento",      nome: "Abatimento Concedido",       type: "N", fmt: "valor" },
  { ini: 241, fim: 253, key: "descontoConc",    nome: "Desconto Concedido",         type: "N", fmt: "valor" },
  { ini: 254, fim: 266, key: "valorPago",       nome: "Valor Pago",                 type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor efetivamente pago pelo sacado, em reais.", exemplo: "194,02" },
  { ini: 267, fim: 279, key: "jurosMora",       nome: "Juros de Mora",              type: "N", fmt: "valor" },
  { ini: 280, fim: 292, key: "outrosCreditos",  nome: "Outros Créditos",            type: "N", fmt: "valor" },
  { ini: 293, fim: 295, key: "brancos1",        nome: "Brancos",                    type: "A" },
  { ini: 296, fim: 301, key: "dataCredito",     nome: "Data do Crédito",            type: "N", fmt: "data",
    ajuda: "Data em que o valor pago foi creditado à empresa.", exemplo: "2024-11-07" },
  { ini: 302, fim: 304, key: "origemPagamento", nome: "Origem Pagamento",           type: "A" },
  { ini: 305, fim: 314, key: "brancos2",        nome: "Brancos",                    type: "A" },
  { ini: 315, fim: 318, key: "brancos3",        nome: "Brancos",                    type: "N" },
  { ini: 319, fim: 328, key: "motivosRejeicao", nome: "Motivos das Rejeições",      type: "A",
    ajuda: "5 pares de 2 dígitos com o(s) código(s) de motivo — só relevante para ocorrências com motivo.", exemplo: "0000000000" },
  { ini: 329, fim: 394, key: "brancos4",        nome: "Brancos",                    type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",     nome: "Nº Seqüencial de Registro",  type: "N" }
];

// Trailer: só o que dá pra confirmar contra 2 arquivos reais (idRegistro,
// idArquivo, codServico, codBanco, brancos, quantidadeTitulos e valorTotal
// — quantidadeTitulos bate exatamente com a contagem de detalhes de cada
// arquivo, valorTotal com a soma esperada). A planilha validadora dizia
// que "Valor Total em Cobrança" tinha 24 posições (026-049), mas os
// arquivos reais mostram só 14 dígitos (026-039) seguidos de brancos —
// arquivo real ganhou, igual fizemos no Bradesco. O resto (040-394) não
// tem nenhuma ocorrência real pra confirmar posição, fica como não
// confirmado (mesmo tratamento dado ao Itaú/Remessa do Bradesco antes de
// termos dado real).
const RETORNO_TRAILER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",       nome: "Identificação do Registro", type: "N", fixo: "9" },
  { ini: 2,   fim: 2,   key: "idArquivo",        nome: "Identificação Arquivo",     type: "N", fixo: "2" },
  { ini: 3,   fim: 4,   key: "codServico",       nome: "Código do Serviço",         type: "N", fixo: "01" },
  { ini: 5,   fim: 7,   key: "numBanco",         nome: "Nº BMP (Compensação)",      type: "N", fixo: "274" },
  { ini: 8,   fim: 17,  key: "brancos1",         nome: "Brancos",                   type: "A" },
  { ini: 18,  fim: 25,  key: "quantidadeTitulos",nome: "Quantidade de Títulos",     type: "N" },
  { ini: 26,  fim: 39,  key: "valorTotal",       nome: "Valor Total dos Títulos",   type: "N", fmt: "valor" },
  { ini: 40,  fim: 394, key: "naoConfirmado",    nome: "Não confirmado",            type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",      nome: "Nº Seqüencial de Registro", type: "N" }
];

// Reaproveitado do Bradesco (padrão FEBRABAN comum entre bancos) — não
// confirmado especificamente contra documentação do BMP.
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
  "17": "Liquidação após baixa / não registrado",
  "19": "Confirmação Receb. Instrução de Protesto",
  "20": "Confirmação Receb. Instrução Sustação Protesto",
  "24": "Entrada Rejeitada por CEP Irregular",
  "27": "Baixa Rejeitada",
  "28": "Débito de Tarifas / Custas",
  "30": "Alteração de Outros Dados Rejeitados",
  "32": "Instrução Rejeitada",
  "35": "Desagendamento do Débito Automático"
};

const OCORRENCIA_COM_MOTIVO_RETORNO = ["02", "03", "09", "10", "24", "27", "28", "30", "32", "35"];

/* =====================================================================
   REMESSA
   ===================================================================== */

const REMESSA_HEADER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",           nome: "Identificação do Registro",      type: "N", fixo: "0" },
  { ini: 2,   fim: 2,   key: "idArquivo",            nome: "Identificação Arquivo Remessa",  type: "N", fixo: "1" },
  { ini: 3,   fim: 9,   key: "literalRemessa",       nome: "Literal Remessa",                type: "A", fixo: "REMESSA" },
  { ini: 10,  fim: 11,  key: "codServico",           nome: "Código do Serviço",              type: "N", fixo: "01" },
  { ini: 12,  fim: 26,  key: "literalServico",       nome: "Literal Serviço",                type: "A", fixo: "COBRANCA" },
  { ini: 27,  fim: 33,  key: "zerosCod",             nome: "Zeros",                          type: "N" },
  { ini: 34,  fim: 37,  key: "agencia",              nome: "Agência",                        type: "N" },
  { ini: 38,  fim: 44,  key: "cedente",               nome: "Código do Cedente",              type: "N" },
  { ini: 45,  fim: 46,  key: "carteira",              nome: "Carteira",                       type: "N" },
  { ini: 47,  fim: 76,  key: "nomeEmpresa",          nome: "Nome da Empresa",                type: "A",
    obrigatorio: true, ajuda: "Nome/razão social da empresa. Espaços à direita; 30 posições.", exemplo: "PH3A COMERCIO E SERVICOS DE TE" },
  { ini: 77,  fim: 79,  key: "numBanco",             nome: "Nº BMP (Compensação)",           type: "N", fixo: "274" },
  { ini: 80,  fim: 94,  key: "nomeBanco",            nome: "Nome do Banco",                  type: "A", fixo: "BMP MONEY PLUS" },
  { ini: 95,  fim: 100, key: "dataGravacao",         nome: "Data da Gravação",               type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data em que a empresa gerou o arquivo de remessa.", exemplo: "2024-11-08" },
  { ini: 101, fim: 108, key: "branco1",              nome: "Branco",                         type: "A" },
  { ini: 109, fim: 110, key: "identificacaoSistema", nome: "Identificação do Sistema",       type: "A",
    ajuda: "Código do sistema de origem (ex.: \"MX\").", exemplo: "MX" },
  { ini: 111, fim: 117, key: "seqRemessa",           nome: "Nº Sequencial de Remessa",       type: "N",
    obrigatorio: true, ajuda: "Número sequencial desta remessa (controle da empresa). Zeros à esquerda; 7 posições.", exemplo: "1" },
  { ini: 118, fim: 394, key: "branco2",              nome: "Branco",                         type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",          nome: "Nº Seqüencial do Registro",      type: "N", fixo: "000001" }
];

const REMESSA_DETALHE_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",         nome: "Identificação do Registro",             type: "N", fixo: "1" },
  { ini: 2,   fim: 6,   key: "agenciaDebito",      nome: "Agência de Débito (opcional)",           type: "N" },
  { ini: 7,   fim: 7,   key: "digAgenciaDebito",   nome: "Dígito da Agência de Débito (opcional)", type: "A" },
  { ini: 8,   fim: 12,  key: "razaoContaCorrente", nome: "Razão da Conta Corrente (opcional)",     type: "N" },
  { ini: 13,  fim: 19,  key: "contaCorrente",      nome: "Conta Corrente (opcional)",              type: "N" },
  { ini: 20,  fim: 20,  key: "digContaCorrente",   nome: "Dígito da Conta Corrente (opcional)",    type: "A" },
  { ini: 21,  fim: 37,  key: "idEmpresaBanco",     nome: "Identificação da Empresa Beneficiária no Banco", type: "A" },
  { ini: 38,  fim: 52,  key: "controleParticip",   nome: "Nº Controle do Participante",            type: "A" },
  { ini: 53,  fim: 62,  key: "brancoFuturo",       nome: "Brancos (Uso Futuro)",                   type: "A" },
  { ini: 63,  fim: 65,  key: "codBancoDebito",     nome: "Código do Banco a Debitar (Compensação)", type: "N" },
  { ini: 66,  fim: 66,  key: "campoMulta",         nome: "Campo de Multa",                         type: "N" },
  { ini: 67,  fim: 70,  key: "percentualMulta",    nome: "Percentual de Multa",                    type: "N" },
  { ini: 71,  fim: 81,  key: "nossoNumero",        nome: "Nosso Número",                           type: "A",
    obrigatorio: true, ajuda: "Nosso número escolhido pela empresa para este título (sem o DAC). Espaços à direita; 11 posições.", exemplo: "2" },
  { ini: 82,  fim: 82,  key: "dac",                nome: "DAC do Nosso Número",                    type: "A",
    obrigatorio: true, ajuda: "Dígito verificador do Nosso Número (módulo 11, regra própria do BMP). Pode ser a letra \"P\". 1 posição.", exemplo: "P" },
  { ini: 83,  fim: 92,  key: "descontoBonifDia",   nome: "Desconto/Bonificação por Dia",           type: "N" },
  { ini: 93,  fim: 93,  key: "condEmissaoPapeleta",nome: "Condição p/ Emissão da Papeleta",        type: "N" },
  { ini: 94,  fim: 94,  key: "emiteBoletoDebAuto", nome: "Emite Boleto p/ Débito Automático",      type: "A" },
  { ini: 95,  fim: 104, key: "idOperacaoBanco",    nome: "Identificação da Operação do Banco",     type: "A" },
  { ini: 105, fim: 105, key: "indRateio",          nome: "Indicador de Rateio Crédito (opcional)", type: "A" },
  { ini: 106, fim: 106, key: "enderecoAvisoDebito",nome: "Endereçamento p/ Aviso de Débito Automático", type: "N" },
  { ini: 107, fim: 108, key: "qtdPagamentos",      nome: "Quantidade de Pagamentos",               type: "A" },
  { ini: 109, fim: 110, key: "ocorrencia",         nome: "Identificação de Ocorrência",            type: "N",
    obrigatorio: true, ajuda: "Código da instrução enviada ao banco (ex.: 01 = Entrada de Título).", exemplo: "01" },
  { ini: 111, fim: 120, key: "numDocumento",       nome: "Nº do Documento",                        type: "A",
    ajuda: "Número do documento/título dado pela empresa. Espaços à direita; 10 posições.", exemplo: "266728" },
  { ini: 121, fim: 126, key: "dataVencimento",     nome: "Data de Vencimento",                     type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data de vencimento do título.", exemplo: "2026-03-15" },
  { ini: 127, fim: 139, key: "valorTitulo",        nome: "Valor do Título",                        type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor nominal do título, em reais (2 decimais implícitas na geração).", exemplo: "2.272,58" },
  { ini: 140, fim: 142, key: "bancoCobrador",      nome: "Banco Encarregado da Cobrança",          type: "N" },
  { ini: 143, fim: 147, key: "agenciaDepositaria", nome: "Agência Depositária",                    type: "N" },
  { ini: 148, fim: 149, key: "especieTitulo",      nome: "Espécie do Título",                      type: "N" },
  { ini: 150, fim: 150, key: "aceite",             nome: "Aceite",                                 type: "A",
    ajuda: "Sempre \"N\" (não aceite) no BMP.", exemplo: "N" },
  { ini: 151, fim: 156, key: "dataEmissao",        nome: "Data de Emissão do Título",              type: "N", fmt: "data" },
  { ini: 157, fim: 158, key: "instrucao1",         nome: "1ª Instrução de Cobrança",               type: "N" },
  { ini: 159, fim: 160, key: "instrucao2",         nome: "2ª Instrução de Cobrança",               type: "N" },
  { ini: 161, fim: 173, key: "valorMoraDia",       nome: "Valor a Cobrar por Dia de Atraso",       type: "N", fmt: "valor" },
  { ini: 174, fim: 179, key: "dataLimiteDesconto", nome: "Data Limite p/ Concessão de Desconto",   type: "N", fmt: "data" },
  { ini: 180, fim: 192, key: "valorDesconto",      nome: "Valor do Desconto a Conceder",           type: "N", fmt: "valor" },
  { ini: 193, fim: 205, key: "valorIOF",           nome: "Valor do IOF",                           type: "N", fmt: "valor" },
  { ini: 206, fim: 218, key: "valorAbatimento",    nome: "Valor do Abatimento a Conceder/Cancelar", type: "N", fmt: "valor" },
  { ini: 219, fim: 220, key: "codInscPagador",     nome: "Tipo de Inscrição do Pagador",           type: "N",
    ajuda: "01 = CPF do pagador, 02 = CNPJ do pagador.", exemplo: "01" },
  { ini: 221, fim: 234, key: "numInscPagador",     nome: "Nº de Inscrição do Pagador",             type: "N",
    obrigatorio: true, ajuda: "CPF ou CNPJ do pagador, sem pontuação. Zeros à esquerda; 14 posições.", exemplo: "31076450288" },
  { ini: 235, fim: 274, key: "nomePagador",        nome: "Nome do Pagador",                        type: "A",
    obrigatorio: true, ajuda: "Nome do sacado/pagador. Espaços à direita; 40 posições.", exemplo: "JOAO GIOVANNI EDSON DA PAZ" },
  { ini: 275, fim: 314, key: "logradouro",         nome: "Endereço Completo do Pagador",           type: "A",
    ajuda: "Rua, número e complemento do pagador. Espaços à direita; 40 posições.", exemplo: "AV PRESIDENTE SARMIENTO 179" },
  { ini: 315, fim: 326, key: "mensagem1",          nome: "1ª Mensagem",                            type: "A" },
  { ini: 327, fim: 331, key: "cep",                nome: "CEP do Pagador",                         type: "N" },
  { ini: 332, fim: 334, key: "sufixoCep",          nome: "Sufixo do CEP",                          type: "N" },
  { ini: 335, fim: 394, key: "sacadorAvalistaMsg2",nome: "Sacador/Avalista ou 2ª Mensagem",        type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",        nome: "Nº Seqüencial de Registro",              type: "N" }
];

// Trailer de Remessa: idêntico em forma ao do Bradesco (bem mais simples
// que o do Retorno) — confirmado contra a linha real da planilha
// validadora.
const REMESSA_TRAILER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",  nome: "Identificação do Registro", type: "N", fixo: "9" },
  { ini: 2,   fim: 394, key: "brancos",     nome: "Branco",                    type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro", nome: "Nº Seqüencial de Registro", type: "N" }
];

// Reaproveitado do Bradesco (padrão FEBRABAN comum entre bancos) — não
// confirmado especificamente contra documentação do BMP.
const OCORRENCIAS_REMESSA = {
  "01": "Entrada de Título",
  "02": "Pedido de Baixa",
  "04": "Concessão de Abatimento",
  "05": "Cancelamento de Abatimento",
  "06": "Alteração de Vencimento",
  "09": "Protestar Título",
  "18": "Sustar Protesto"
};

export const bmp = {
  code: "274",
  nome: "BMP Money Plus",

  retorno: {
    headerFields: RETORNO_HEADER_FIELDS,
    detalheFields: RETORNO_DETALHE_FIELDS,
    trailerFields: RETORNO_TRAILER_FIELDS,
    ocorrencias: OCORRENCIAS_RETORNO,
    ocorrenciaComMotivo: OCORRENCIA_COM_MOTIVO_RETORNO,
    motivos: {},
    trailerTotalFn: det => Number(det.valorPago) || Number(det.valorTitulo) || 0,
    formFields: {
      header: ["codEmpresa", "nomeEmpresa", "dataGravacao"],
      detalhe: ["nossoNumero", "carteira", "ocorrencia", "numDocumento", "dataVencimento", "valorTitulo", "valorPago"]
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
      header: ["nomeEmpresa", "dataGravacao", "seqRemessa"],
      detalhe: ["nossoNumero", "dac", "ocorrencia", "dataVencimento", "valorTitulo", "codInscPagador", "numInscPagador", "nomePagador"]
    }
  }
};
