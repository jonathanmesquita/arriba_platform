/* =====================================================================
   CNAB 400 - BMP Money Plus (274) | Config para o motor genérico (engine.js)

   FONTES:
   1) Duas planilhas validadoras fornecidas pelo usuário
      (Validador_CNAB_400_Remessa__Banco_Money_Plus.xlsx e
      Validador_CNAB_400_Retorno__Banco_Money_Plus.xlsx), cada uma com uma
      linha real de exemplo embutida — todo campo abaixo foi conferido via
      slice(ini-1, ini-1+tamanho) contra essa linha antes de entrar aqui.
   2) 3 arquivos .RET reais do próprio usuário (bank 274 / MONEYPLUS):
      round-trip byte a byte OK em 93 linhas de detalhe (15+42+36).
   3) Manual oficial do BMP (bmpdocs.moneyp.com.br/baas/layouts-de-cnab/
      cnab-400, versão 13.1 de 05/2026) — confirmou a tabela completa de
      Header + Detalhe (Tipo 1) da REMESSA, e trouxe as tabelas oficiais
      de Ocorrências e Motivos (RETORNO e REMESSA), usadas para substituir
      o que antes era só um "reaproveitado do Bradesco".

   Onde as fontes divergiram, a ordem de confiança foi: arquivo real >
   planilha (com amostra própria embutida) > manual oficial (tabelas sem
   amostra, mais sujeitas a erro de transcrição/OCR) — mesma regra usada
   no Bradesco. Ex.: o manual oficial dá "021 a 037" do Detalhe como um
   campo único "fornecido pela BMP", mas TANTO a planilha (com amostra
   real "0001"/"1005113"/"09") QUANTO os arquivos reais confirmam que é
   decomposto em zero+carteira+agência+conta+dígito — manteve-se a
   decomposição. Já o campo 295 do Detalhe de Retorno, a planilha marca
   como "Brancos" mas 51 linhas de arquivo real confirmam ser sempre "0"
   — arquivo real venceu (ver comentário em `zeroFixo295` abaixo).

   Header/Detalhe da Remessa e as tabelas de Ocorrência/Motivo (Remessa e
   Retorno) agora são confirmados contra o manual oficial. O Detalhe da
   Retorno segue confirmado só por planilha+arquivo real (o manual não
   trouxe a tabela completa da Retorno, só texto complementar de campos
   específicos) — e o Trailer da Retorno segue com boa parte "não
   confirmado": o manual sugere um detalhamento por ocorrência (igual ao
   do Bradesco) a partir da posição ~40, mas todos os arquivos reais que
   temos só contêm ocorrência 06, então não dá pra confirmar as posições
   das outras ocorrências nesse detalhamento.
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
  { ini: 293, fim: 294, key: "brancos1",        nome: "Brancos",                    type: "A" },
  // Confirmado em 51 linhas de detalhe reais (CP0508000497 + CP0608002681): a
  // posição 295 nunca varia, é sempre "0" — não é branco (a planilha original
  // marcava 293-295 como um único campo em branco de 3 posições).
  { ini: 295, fim: 295, key: "zeroFixo295",     nome: "Zero fixo",                  type: "N", fixo: "0" },
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

// Tabela oficial do manual BMP (posições 109-110 do Detalhe de Retorno).
const OCORRENCIAS_RETORNO = {
  "02": "Entrada Confirmada",
  "03": "Entrada Rejeitada",
  "06": "Liquidação Normal",
  "09": "Baixado Automaticamente via Arquivo",
  "10": "Baixado conforme Instrução da Agência",
  "11": "Em Ser (Arquivo de Títulos Pendentes)",
  "12": "Abatimento Concedido",
  "13": "Abatimento Cancelado",
  "14": "Protesto do Título",
  "16": "Protesto do Título Rejeitado",
  "17": "Liquidação após Baixa ou Título não Registrado",
  "18": "Acerto de Depositária",
  "21": "Acerto do Controle do Participante",
  "22": "Título com Pagamento Cancelado",
  "24": "Entrada Rejeitada por CEP Irregular",
  "27": "Baixa Rejeitada",
  "28": "Débito de Tarifas/Custas",
  "29": "Ocorrências do Pagador",
  "32": "Instrução Rejeitada",
  "40": "Estorno de Pagamento"
};

// Ocorrências que o manual documenta com motivo(s) na posição 319-328
// (inclui "06" — o manual dá motivos 00/15/18 pra Liquidação, mesmo sem
// marcar isso na lista-resumo de ocorrências).
const OCORRENCIA_COM_MOTIVO_RETORNO = ["02", "03", "06", "09", "10", "16", "17", "24", "27", "28", "29", "32"];

// Motivos por ocorrência (posições 319-328 do Detalhe de Retorno), copiados
// do manual oficial do BMP. Nem toda ocorrência com motivo tem tabela aqui:
// "29 - Ocorrências do Pagador" é citada na lista-resumo mas o manual não
// chegou a detalhar seus motivos nesta versão — fica pendente.
const MOTIVOS_RETORNO = {
  "02": {
    "00": "Ocorrência aceita", "01": "Código do banco inválido",
    "02": "Pendente de autorização (autorização débito automático)",
    "03": "Pendente de ação do pagador (autorização débito automático – data vencimento)",
    "04": "Código do movimento não permitido para a carteira",
    "15": "Características da cobrança incompatíveis",
    "17": "Data de vencimento anterior à data de emissão",
    "21": "Espécie do título inválido", "24": "Data da emissão inválida",
    "27": "Valor/taxa de juros de mora inválido",
    "43": "Prazo para baixa e devolução inválido",
    "45": "Nome do pagador inválido", "46": "Tipo/número de inscrição do pagador inválidos",
    "47": "Endereço do pagador não informado", "48": "CEP inválido",
    "50": "CEP referente a banco correspondente",
    "53": "Número de inscrição do pagador/avalista inválidos (CPF/CNPJ)",
    "54": "Pagador/avalista não informado", "86": "Seu número do documento inválido",
    "87": "Título baixado por coobrigação e devolvido para carteira"
  },
  "03": {
    "02": "Código do registro detalhe inválido", "03": "Código da ocorrência inválida",
    "04": "Código de ocorrência não permitida para a carteira",
    "05": "Código de ocorrência não numérico", "06": "Dados cadastrais do beneficiário incompletos",
    "07": "Agência/conta/dígito inválido", "08": "Nosso número inválido",
    "09": "Nosso número duplicado", "10": "Carteira inválida", "11": "Cadastro rejeitado",
    "13": "Identificação da emissão do boleto inválida", "16": "Data de vencimento inválida",
    "18": "Vencimento fora do prazo de operação", "20": "Valor do título inválido",
    "21": "Espécie do título inválida", "22": "Espécie não permitida para a carteira",
    "23": "Tipo pagamento não contratado", "24": "Data de emissão inválida",
    "27": "Valor/taxa de juros mora inválido", "28": "Código do desconto inválido",
    "29": "Valor desconto ≥ valor título", "30": "O boleto não pode haver mais do que três descontos",
    "31": "O código de desconto do boleto deve ser igual em todos os registros de desconto informados",
    "32": "Não pode ser informada mais que uma ocorrência de desconto para o código de desconto informado",
    "34": "Valor do abatimento maior ou igual ao valor do título",
    "35": "Informe um código juros título válido", "36": "Informe um código multa título válido",
    "37": "Informe um UF do pagador válido", "38": "UF do beneficiário inválido",
    "39": "As datas de desconto informadas não podem se repetir dentro do grupo de desconto",
    "40": "Data de desconto deve ser maior ou igual à data de emissão do título",
    "44": "Código da moeda inválido", "45": "Nome do pagador não informado",
    "46": "Tipo/número de inscrição do pagador inválidos", "47": "Endereço do pagador não informado",
    "48": "CEP inválido", "49": "CEP sem praça de cobrança",
    "50": "CEP irregular - banco correspondente", "51": "Tipo sacador/avalista inválido",
    "52": "Identificador do sacador/avalista inválido",
    "53": "Nome/razão social do sacador/avalista não informado",
    "59": "Valor/percentual da multa inválido", "61": "Parceiro não autorizado para esta conta",
    "62": "O operador não possui permissão para registrar boleto nessa conta",
    "63": "Entrada para título já cadastrado", "65": "Limite excedido",
    "79": "Data de juros de mora inválida", "80": "Data do desconto inválida",
    "86": "Seu número inválido", "87": "Data de multa inválida",
    "88": "Documento do beneficiário inválido",
    "89": "Boleto de proposta ou depósito e aporte deve ser isento de juros",
    "90": "Boleto de proposta ou depósito e aporte deve ser isento de multa",
    "91": "Para registrar um boleto híbrido, a conta do cedente deve ter ao menos uma chave PIX registrada",
    "92": "Para boleto híbrido, a data de vencimento deve ser maior que a data atual",
    "93": "Para boleto híbrido, a data de expiração deve ser maior que a data de vencimento",
    "94": "Para boleto híbrido, a data do desconto deve ser maior que a data atual e menor que a do vencimento",
    "95": "Saldo insuficiente para registrar o boleto",
    "96": "Código de juros percentual dias corridos não permitido para o tipo de modelo de cálculo 01",
    "97": "Código de barras já utilizado",
    "98": "O conteúdo do texto informativo do cliente beneficiário é inválido",
    "99": "Erro genérico"
  },
  "06": { "00": "Crédito disponível", "15": "Crédito indisponível", "18": "Pagamento parcial" },
  "09": { "00": "Ocorrência aceita", "10": "Baixa comandada pelo cliente" },
  "10": {
    "00": "Baixado conforme instrução da agência", "14": "Título protestado",
    "16": "Título baixado pelo banco por decurso de prazo",
    "20": "Título baixado e transferido para desconto"
  },
  "16": {
    "02": "Operador não configurado para esta integração",
    "03": "Não foram informados códigos de barras válidos para protesto de boleto",
    "04": "O boleto possui endereço do pagador incompleto",
    "05": "O boleto possui endereço ou dados do beneficiário original incompletos",
    "06": "O boleto não está disponível para protesto (aguarde 1 dia após o vencimento)",
    "07": "A situação atual do boleto não permite protesto",
    "08": "O boleto está com a data limite de pagamento alcançada — atualize para prosseguir",
    "09": "O boleto possui uma alteração pendente",
    "10": "O parâmetro de protesto manual para o vínculo Cedente–Carteira não está habilitado",
    "11": "O boleto está em negociação com outro cedente", "12": "O boleto não pertence a este cedente",
    "13": "As contas pagamento não possuem tarifário configurado para protesto",
    "14": "Saldo insuficiente para protestar o boleto"
  },
  "17": { "00": "Crédito disponível", "15": "Crédito indisponível" },
  "24": { "00": "Ocorrência aceita", "48": "CEP inválido", "49": "CEP sem praça de cobrança" },
  "27": {
    "02": "Código do registro detalhe inválido",
    "04": "Código de ocorrência não permitido para a carteira",
    // O manual lista "06" e "07" nesta ocorrência de forma ambígua/duplicada
    // (06-Nosso número inválido, depois 07-Agência/conta/dígito inválidos e
    // também 07-Nosso número duplicado) — provável erro de transcrição do
    // documento fonte. Mantido "07" = Agência/conta/dígito (consistente com
    // o mesmo código na ocorrência 03); "Nosso número duplicado" não foi
    // incluído por falta de código confiável.
    "06": "Nosso número inválido", "07": "Agência/conta/dígito inválidos",
    "10": "Carteira inválida", "15": "Carteira/agência/conta/nosso número inválidos",
    "16": "Data de vencimento inválida", "18": "Vencimento fora do prazo de operação",
    "20": "Valor do título inválido", "41": "Título com ordem de protesto emitido",
    "42": "Código para baixa/devolução inválido", "43": "Título não registrado",
    "45": "Nome do sacado não informado ou inválido",
    "46": "Tipo/número de inscrição do sacado inválido",
    "47": "Endereço do sacado não informado", "48": "CEP inválido", "60": "Título baixado",
    "77": "Transferência para desconto não permitido para a carteira",
    "85": "Título com pagamento vinculado", "86": "Seu número inválido", "99": "Erro genérico"
  },
  "28": {
    "02": "Tarifa de permanência título cadastrado", "12": "Tarifa de registro",
    "13": "Tarifa título pago", "14": "Tarifa título pago compensação",
    "15": "Tarifa título baixado não pago", "17": "Tarifa concessão abatimento",
    "18": "Tarifa cancelamento de abatimento", "19": "Tarifa concessão desconto",
    "20": "Tarifa cancelamento desconto", "40": "Baixa registro em duplicidade",
    "41": "Tarifa título baixado decurso prazo", "43": "Tarifa título baixado via remessa",
    "45": "Tarifa título baixado conf. pedido", "99": "Tarifa título baixado por decurso prazo"
  },
  "32": {
    "01": "Código do banco inválido", "02": "Código registro detalhe inválido",
    "04": "Código de ocorrência não permitido para a carteira",
    "05": "Código de ocorrência não numérico", "07": "Não há alterações para o boleto",
    "08": "Nosso número inválido", "09": "Já existe instrução pendente para o título",
    "10": "Carteira inválida", "14": "Boleto cedido para outro cedente",
    "15": "Características da cobrança incompatíveis", "16": "Data de vencimento inválida",
    "17": "Data de vencimento anterior à data de emissão",
    "18": "Vencimento fora do prazo de operação", "19": "Ação sobre boleto de outra conta",
    "20": "Valor do título inválido", "21": "Espécie do título inválida",
    "22": "Espécie não permitida para a carteira", "23": "Tipo pagamento não contratado",
    "24": "Data de emissão inválida", "26": "Código juros mora inválido",
    "27": "Valor/taxa juros mora inválido", "28": "Código de desconto inválido",
    "29": "Valor do desconto maior/igual ao valor do título",
    "30": "Desconto a conceder não confere",
    "31": "Concessão de desconto - já existe desconto anterior",
    "33": "Valor do abatimento inválido",
    "34": "Valor do abatimento maior/igual ao valor do título",
    "36": "Concessão abatimento - já existe abatimento anterior",
    "41": "Título com ordem de protesto emitido", "43": "Título não registrado",
    "45": "Nome do pagador não informado",
    "46": "Tipo/número de inscrição do pagador inválidos",
    "47": "Endereço do pagador não informado", "48": "CEP inválido",
    "50": "CEP referente a um banco correspondente", "52": "Unidade da federação inválida",
    "53": "Tipo de inscrição do pagador/avalista inválidos", "60": "Título baixado",
    "65": "Limite excedido", "66": "Número autorização inexistente",
    "85": "Título com pagamento vinculado", "86": "Seu número inválido", "99": "Erro genérico"
  }
};

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
  { ini: 109, fim: 110, key: "identificacaoSistema", nome: "Identificação do Sistema",       type: "A", fixo: "MX" },
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
  { ini: 66,  fim: 66,  key: "campoMulta",         nome: "Campo de Multa",                         type: "N",
    ajuda: "0 = sem multa. 2 = considerar o percentual de multa informado no campo seguinte.", exemplo: "0" },
  { ini: 67,  fim: 70,  key: "percentualMulta",    nome: "Percentual de Multa",                    type: "N",
    ajuda: "Percentual de multa por atraso, só usado se \"Campo de Multa\" = 2 (senão, preencher com zeros).", exemplo: "0000" },
  { ini: 71,  fim: 81,  key: "nossoNumero",        nome: "Nosso Número",                           type: "N",
    obrigatorio: true, ajuda: "Nosso número escolhido pela empresa para este título (sem o DAC). Zeros à esquerda; 11 posições.", exemplo: "2" },
  { ini: 82,  fim: 82,  key: "dac",                nome: "DAC do Nosso Número",                    type: "A",
    obrigatorio: true, ajuda: "Dígito verificador do Nosso Número (módulo 11, regra própria do BMP). Pode ser a letra \"P\". 1 posição.", exemplo: "P" },
  { ini: 83,  fim: 92,  key: "descontoBonifDia",   nome: "Desconto/Bonificação por Dia",           type: "N" },
  { ini: 93,  fim: 93,  key: "condEmissaoPapeleta",nome: "Condição p/ Emissão da Papeleta",        type: "N",
    ajuda: "Se o Nosso Número não for informado, o BMP cria um automaticamente. Se = 2, a empresa emite o boleto e o banco só processa o registro — nesse caso é obrigatório informar o Nosso Número.", exemplo: "2" },
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

// Tabela oficial do manual BMP (posições 109-110 do Detalhe de Remessa).
const OCORRENCIAS_REMESSA = {
  "01": "Remessa (Entrada de Título)",
  "02": "Pedido de Baixa",
  "04": "Concessão de Abatimento",
  "05": "Cancelamento de Abatimento",
  "06": "Alteração de Vencimento",
  "07": "Alteração do Controle do Participante",
  "09": "Protesto",
  "20": "Alteração do Valor"
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
    motivos: MOTIVOS_RETORNO,
    // O Valor Total do Trailer é a soma do VALOR DO TÍTULO, não do valor
    // pago. Confirmado em 3 arquivos reais com trailer, e nos dois em que
    // pago != título a diferença é clara (2.833,41 vs 2.893,99 e
    // 11.137,21 vs 11.298,19 — o trailer declarou o primeiro). Antes aqui
    // somava valorPago, o que fazia o gerador escrever um trailer errado.
    trailerTotalKey: "valorTitulo",
    // Habilita a conferência do Trailer na leitura (ver conferirTrailer em
    // engine.js): pega arquivo truncado ou editado à mão.
    trailerConferencia: { quantidadeKey: "quantidadeTitulos", valorKey: "valorTotal" },
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
