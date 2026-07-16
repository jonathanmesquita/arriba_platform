/* =====================================================================
   CNAB 400 - Itaú (341) | Config para o motor genérico (engine.js)

   FONTE: manual oficial "Layout de Arquivos — CNAB 400 — Cobrança"
   (Itaú, Janeiro 2017), fornecido pelo usuário. TODAS as posições abaixo
   foram transcritas diretamente das tabelas do manual (colunas NOME DO
   CAMPO / SIGNIFICADO / POSIÇÃO / PICTURE / CONTEÚDO) e a continuidade
   1–400 de cada registro (Header/Detalhe/Trailer × Remessa/Retorno) foi
   verificada byte a byte contra o texto do manual antes de ir para este
   arquivo — nenhuma posição foi estimada ou copiada do Bradesco.

   ESCOPO: só os registros OBRIGATÓRIOS (Header tipo 0, Detalhe tipo 1,
   Trailer tipo 9) — os registros opcionais do Itaú (tipo 2 = multa,
   tipo 4 = rateio de crédito, tipo 5 = e-mail/sacador-avalista no
   REMESSA; tipo 1 opcional-cheque no RETORNO) não são suportados nesta
   versão, mesmo padrão já adotado para o "tipo 3" do Bradesco.

   PENDENTE: nenhuma linha real de Remessa/Retorno do Itaú foi validada
   ainda (só temos o manual). As posições têm alta confiança por virem
   direto da fonte oficial, mas o critério de aceite do PROMPT 4 pede
   uma linha real de cada direção para confirmar campos-chave — se você
   tiver, mandamos e fechamos essa validação.

   "Nosso Número" no Retorno tem uma particularidade do próprio manual
   (Nota 3): carteiras escriturais usam a faixa 063–070; carteiras
   diretas podem usar 086–093 (+ DAC em 094). Modelamos AMBAS as faixas
   no mapa de campos (nada é descartado), mas só expomos 063–070 como
   campo do formulário — é a faixa mais comum e a única que dá pra
   cravar sem uma linha real pra decidir qual a carteira em uso.

   NOTA 20 (motivos de erro/rejeição) tem várias sub-tabelas por tipo de
   ocorrência (Tabela 1 a 12) — não implementadas nesta versão (mesmo
   tratamento "não exaustivo" já usado nos motivos do Bradesco).
   ===================================================================== */

"use strict";

/* =====================================================================
   REMESSA
   ===================================================================== */

const REMESSA_HEADER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",      nome: "Identificação do Registro Header", type: "N", fixo: "0" },
  { ini: 2,   fim: 2,   key: "operacao",        nome: "Tipo de Operação",                 type: "N", fixo: "1" },
  { ini: 3,   fim: 9,   key: "literalRemessa",  nome: "Literal de Remessa",                type: "A", fixo: "REMESSA" },
  { ini: 10,  fim: 11,  key: "codServico",      nome: "Código do Serviço",                 type: "N", fixo: "01" },
  { ini: 12,  fim: 26,  key: "literalServico",  nome: "Literal de Serviço",                type: "A", fixo: "COBRANCA" },
  { ini: 27,  fim: 30,  key: "agencia",         nome: "Agência Mantenedora da Conta",      type: "N",
    obrigatorio: true, ajuda: "Número da agência do beneficiário no Itaú. Zeros à esquerda; 4 posições.", exemplo: "0057" },
  { ini: 31,  fim: 32,  key: "zeros",           nome: "Zeros",                             type: "N" },
  { ini: 33,  fim: 37,  key: "conta",           nome: "Nº da Conta Corrente",               type: "N",
    obrigatorio: true, ajuda: "Número da conta corrente do beneficiário, sem o DAC. Zeros à esquerda; 5 posições.", exemplo: "72192" },
  { ini: 38,  fim: 38,  key: "dac",             nome: "DAC Agência/Conta",                  type: "N",
    obrigatorio: true, ajuda: "Dígito de auto conferência da agência/conta — calculado pelo Itaú/beneficiário, regra própria.", exemplo: "0" },
  { ini: 39,  fim: 46,  key: "brancos1",        nome: "Brancos",                           type: "A" },
  { ini: 47,  fim: 76,  key: "nomeEmpresa",     nome: "Nome da Empresa (Beneficiário)",     type: "A",
    obrigatorio: true, ajuda: "Nome/razão social do beneficiário. Espaços à direita; 30 posições.", exemplo: "PH3A COMERCIO E SERVICOS DE TE" },
  { ini: 77,  fim: 79,  key: "codBanco",        nome: "Código do Banco (Compensação)",      type: "N", fixo: "341" },
  { ini: 80,  fim: 94,  key: "nomeBanco",       nome: "Nome do Banco",                      type: "A", fixo: "BANCO ITAU SA" },
  { ini: 95,  fim: 100, key: "dataGeracao",     nome: "Data de Geração do Arquivo",         type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data em que a empresa gerou o arquivo de remessa.", exemplo: "2024-11-08" },
  { ini: 101, fim: 394, key: "brancos2",        nome: "Brancos",                           type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",     nome: "Nº Seqüencial do Registro",          type: "N", fixo: "000001" }
];

const REMESSA_DETALHE_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",         nome: "Identificação do Registro",       type: "N", fixo: "1" },
  { ini: 2,   fim: 3,   key: "codInscEmpresa",     nome: "Tipo de Inscrição da Empresa",     type: "N",
    ajuda: "01 = CPF do beneficiário, 02 = CNPJ do beneficiário.", exemplo: "02" },
  { ini: 4,   fim: 17,  key: "numInscEmpresa",     nome: "Nº de Inscrição da Empresa",       type: "N",
    ajuda: "CPF ou CNPJ do beneficiário, sem pontuação. Zeros à esquerda; 14 posições.", exemplo: "12345678000199" },
  { ini: 18,  fim: 21,  key: "agencia",            nome: "Agência Mantenedora da Conta",     type: "N" },
  { ini: 22,  fim: 23,  key: "zeros",              nome: "Zeros",                            type: "N", fixo: "00" },
  { ini: 24,  fim: 28,  key: "conta",              nome: "Nº da Conta Corrente",              type: "N" },
  { ini: 29,  fim: 29,  key: "dac",                nome: "DAC Agência/Conta",                 type: "N" },
  { ini: 30,  fim: 33,  key: "brancos1",           nome: "Brancos",                          type: "A" },
  { ini: 34,  fim: 37,  key: "instrucaoAlegacao",  nome: "Cód. Instrução/Alegação a Cancelar", type: "N" },
  { ini: 38,  fim: 62,  key: "usoEmpresa",         nome: "Identificação do Título na Empresa (Seu Número)", type: "A",
    obrigatorio: true, ajuda: "Número de controle do título dado pela empresa (\"seu número\"). Espaços à direita; 25 posições.", exemplo: "1108954" },
  { ini: 63,  fim: 70,  key: "nossoNumero",        nome: "Nosso Número",                     type: "N",
    obrigatorio: true, ajuda: "Nosso número escolhido pelo beneficiário para este título (sem o DAC — regra depende da carteira). Zeros à esquerda; 8 posições.", exemplo: "98712345" },
  { ini: 71,  fim: 83,  key: "qtdeMoeda",          nome: "Quantidade de Moeda Variável",      type: "N", fmt: "valor" },
  { ini: 84,  fim: 86,  key: "carteira",           nome: "Nº da Carteira",                   type: "N",
    obrigatorio: true, ajuda: "Código da carteira de cobrança no Itaú (ex.: 108, 109, 112...). Ver tabela de carteiras do manual.", exemplo: "109" },
  { ini: 87,  fim: 107, key: "usoBanco",           nome: "Uso do Banco",                     type: "A" },
  { ini: 108, fim: 108, key: "codCarteira",        nome: "Código da Carteira",               type: "A" },
  { ini: 109, fim: 110, key: "ocorrencia",         nome: "Identificação da Ocorrência",      type: "N",
    obrigatorio: true, ajuda: "Código da instrução enviada ao Itaú (ex.: 01 = Entrada de Título). Ver tabela de ocorrências da Remessa.", exemplo: "01" },
  { ini: 111, fim: 120, key: "numDocumento",       nome: "Nº do Documento",                  type: "A",
    ajuda: "Número do documento que originou a cobrança (duplicata, nota fiscal etc.). Espaços à direita; 10 posições.", exemplo: "266728" },
  { ini: 121, fim: 126, key: "dataVencimento",     nome: "Data de Vencimento",               type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data de vencimento do título.", exemplo: "2026-03-15" },
  { ini: 127, fim: 139, key: "valorTitulo",        nome: "Valor do Título",                  type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor nominal do título, em reais (2 decimais implícitas na geração).", exemplo: "1.286,24" },
  { ini: 140, fim: 142, key: "codBancoCobrador",   nome: "Código do Banco Cobrador",         type: "N", fixo: "341" },
  { ini: 143, fim: 147, key: "agenciaCobradora",   nome: "Agência Cobradora",                 type: "N" },
  { ini: 148, fim: 149, key: "especieTitulo",      nome: "Espécie do Título",                 type: "A" },
  { ini: 150, fim: 150, key: "aceite",             nome: "Aceite",                            type: "A",
    ajuda: "A = Aceite, N = Não Aceite.", exemplo: "N" },
  { ini: 151, fim: 156, key: "dataEmissao",        nome: "Data de Emissão do Título",         type: "N", fmt: "data" },
  { ini: 157, fim: 158, key: "instrucao1",         nome: "1ª Instrução de Cobrança",          type: "A" },
  { ini: 159, fim: 160, key: "instrucao2",         nome: "2ª Instrução de Cobrança",          type: "A" },
  { ini: 161, fim: 173, key: "jurosDia",           nome: "Valor de Mora por Dia de Atraso",   type: "N", fmt: "valor" },
  { ini: 174, fim: 179, key: "descontoAte",        nome: "Data Limite para Desconto",         type: "N", fmt: "data" },
  { ini: 180, fim: 192, key: "valorDesconto",      nome: "Valor do Desconto a Conceder",      type: "N", fmt: "valor" },
  { ini: 193, fim: 205, key: "valorIOF",           nome: "Valor do IOF",                      type: "N", fmt: "valor" },
  { ini: 206, fim: 218, key: "valorAbatimento",    nome: "Valor do Abatimento a Conceder",    type: "N", fmt: "valor" },
  { ini: 219, fim: 220, key: "codInscPagador",     nome: "Tipo de Inscrição do Pagador",      type: "N",
    ajuda: "01 = CPF do pagador, 02 = CNPJ do pagador.", exemplo: "02" },
  { ini: 221, fim: 234, key: "numInscPagador",     nome: "Nº de Inscrição do Pagador",        type: "N",
    obrigatorio: true, ajuda: "CPF ou CNPJ do pagador, sem pontuação. Zeros à esquerda; 14 posições.", exemplo: "08981215000142" },
  { ini: 235, fim: 264, key: "nomePagador",        nome: "Nome do Pagador",                   type: "A",
    obrigatorio: true, ajuda: "Nome do sacado/pagador. Espaços à direita; 30 posições.", exemplo: "TPR TRANSPORTES E LOGISTICA" },
  { ini: 265, fim: 274, key: "brancos2",           nome: "Brancos",                          type: "A" },
  { ini: 275, fim: 314, key: "logradouro",         nome: "Endereço do Pagador",                type: "A",
    ajuda: "Rua, número e complemento do pagador. Espaços à direita; 40 posições.", exemplo: "RUA PORTO ALEGRE S N" },
  { ini: 315, fim: 326, key: "bairro",             nome: "Bairro do Pagador",                 type: "A" },
  { ini: 327, fim: 334, key: "cep",                nome: "CEP do Pagador",                    type: "N" },
  { ini: 335, fim: 349, key: "cidade",             nome: "Cidade do Pagador",                 type: "A" },
  { ini: 350, fim: 351, key: "estado",             nome: "UF do Pagador",                     type: "A" },
  { ini: 352, fim: 381, key: "sacadorAvalista",    nome: "Nome do Sacador/Avalista",          type: "A" },
  { ini: 382, fim: 385, key: "brancos3",           nome: "Brancos",                          type: "A" },
  { ini: 386, fim: 391, key: "dataMora",           nome: "Data de Mora",                      type: "N", fmt: "data" },
  { ini: 392, fim: 393, key: "prazo",              nome: "Prazo (dias)",                      type: "N" },
  { ini: 394, fim: 394, key: "brancos4",           nome: "Brancos",                          type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",        nome: "Nº Seqüencial de Registro",         type: "N" }
];

const REMESSA_TRAILER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",   nome: "Identificação do Registro Trailer", type: "N", fixo: "9" },
  { ini: 2,   fim: 394, key: "brancos",      nome: "Brancos",                           type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",  nome: "Nº Seqüencial de Registro",         type: "N" }
];

// Ocorrências (instruções) da Remessa — manual, item (6).
const OCORRENCIAS_REMESSA = {
  "01": "Remessa (Entrada de Título)",
  "02": "Pedido de Baixa",
  "04": "Concessão de Abatimento",
  "05": "Cancelamento de Abatimento",
  "06": "Alteração do Vencimento",
  "07": "Alteração do Uso da Empresa",
  "08": "Alteração do Seu Número",
  "09": "Protestar",
  "10": "Não Protestar",
  "11": "Protesto para Fins Falimentares",
  "18": "Sustar o Protesto",
  "30": "Exclusão de Sacador Avalista",
  "31": "Alteração de Outros Dados",
  "34": "Baixa por Ter Sido Pago Diretamente ao Beneficiário",
  "35": "Cancelamento de Instrução",
  "37": "Alteração do Vencimento e Sustar Protesto",
  "38": "Beneficiário Não Concorda com Alegação do Pagador",
  "47": "Beneficiário Solicita Dispensa de Juros",
  "49": "Alteração de Dados Extras (Registro de Multa)",
  "66": "Entrada em Negativação Expressa",
  "67": "Não Negativar",
  "68": "Excluir Negativação Expressa",
  "69": "Cancelar Negativação Expressa",
  "93": "Descontar Títulos Encaminhados no Dia"
};

/* =====================================================================
   RETORNO
   ===================================================================== */

const RETORNO_HEADER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",       nome: "Identificação do Registro Header", type: "N", fixo: "0" },
  { ini: 2,   fim: 2,   key: "codRetorno",       nome: "Identificação do Arquivo Retorno",  type: "N", fixo: "2" },
  { ini: 3,   fim: 9,   key: "literalRetorno",   nome: "Literal de Retorno",                type: "A", fixo: "RETORNO" },
  { ini: 10,  fim: 11,  key: "codServico",       nome: "Código do Serviço",                 type: "N", fixo: "01" },
  { ini: 12,  fim: 26,  key: "literalServico",   nome: "Literal de Serviço",                type: "A", fixo: "COBRANCA" },
  { ini: 27,  fim: 30,  key: "agencia",          nome: "Agência Mantenedora da Conta",      type: "N",
    obrigatorio: true, ajuda: "Número da agência do beneficiário no Itaú. Zeros à esquerda; 4 posições.", exemplo: "0057" },
  { ini: 31,  fim: 32,  key: "zeros",            nome: "Zeros",                             type: "N", fixo: "00" },
  { ini: 33,  fim: 37,  key: "conta",            nome: "Nº da Conta Corrente",               type: "N",
    obrigatorio: true, ajuda: "Número da conta corrente do beneficiário, sem o DAC. Zeros à esquerda; 5 posições.", exemplo: "72192" },
  { ini: 38,  fim: 38,  key: "dac",              nome: "DAC Agência/Conta",                  type: "N" },
  { ini: 39,  fim: 46,  key: "brancos1",         nome: "Brancos",                           type: "A" },
  { ini: 47,  fim: 76,  key: "nomeEmpresa",      nome: "Nome da Empresa (Beneficiário)",     type: "A",
    obrigatorio: true, ajuda: "Nome/razão social do beneficiário.", exemplo: "PH3A COMERCIO E SERVICOS DE TE" },
  { ini: 77,  fim: 79,  key: "codBanco",         nome: "Código do Banco (Compensação)",      type: "N", fixo: "341" },
  { ini: 80,  fim: 94,  key: "nomeBanco",        nome: "Nome do Banco",                      type: "A", fixo: "BANCO ITAU SA" },
  { ini: 95,  fim: 100, key: "dataGeracao",      nome: "Data de Geração do Arquivo",         type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data em que o Itaú gerou o arquivo de retorno.", exemplo: "2024-11-08" },
  { ini: 101, fim: 105, key: "densidade",        nome: "Densidade de Gravação",              type: "N" },
  { ini: 106, fim: 108, key: "unidadeDensidade", nome: "Unidade de Densidade",               type: "A", fixo: "BPI" },
  { ini: 109, fim: 113, key: "seqArquivoRetorno",nome: "Nº Seqüencial do Arquivo Retorno",   type: "N" },
  { ini: 114, fim: 119, key: "dataCredito",      nome: "Data de Crédito dos Lançamentos",    type: "N", fmt: "data",
    ajuda: "Data em que os valores deste retorno foram creditados.", exemplo: "2024-11-08" },
  { ini: 120, fim: 394, key: "brancos2",         nome: "Brancos",                           type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",      nome: "Nº Seqüencial do Registro",          type: "N", fixo: "000001" }
];

const RETORNO_DETALHE_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",       nome: "Identificação do Registro",       type: "N", fixo: "1" },
  { ini: 2,   fim: 3,   key: "codInscEmpresa",   nome: "Tipo de Inscrição da Empresa",     type: "N" },
  { ini: 4,   fim: 17,  key: "numInscEmpresa",   nome: "Nº de Inscrição da Empresa",       type: "N" },
  { ini: 18,  fim: 21,  key: "agencia",          nome: "Agência Mantenedora da Conta",     type: "N" },
  { ini: 22,  fim: 23,  key: "zeros",            nome: "Zeros",                            type: "N", fixo: "00" },
  { ini: 24,  fim: 28,  key: "conta",            nome: "Nº da Conta Corrente",              type: "N" },
  { ini: 29,  fim: 29,  key: "dac",              nome: "DAC Agência/Conta",                 type: "N" },
  { ini: 30,  fim: 37,  key: "brancos1",         nome: "Brancos",                          type: "A" },
  { ini: 38,  fim: 62,  key: "usoEmpresa",       nome: "Identificação do Título na Empresa (Seu Número)", type: "A" },
  { ini: 63,  fim: 70,  key: "nossoNumero",      nome: "Nosso Número",                     type: "N",
    obrigatorio: true, ajuda: "Nosso número do título — faixa usada por carteiras escriturais (Nota 3 do manual).", exemplo: "98712345" },
  { ini: 71,  fim: 82,  key: "brancos2",         nome: "Brancos",                          type: "A" },
  { ini: 83,  fim: 85,  key: "numCarteira",      nome: "Nº da Carteira",                    type: "N" },
  { ini: 86,  fim: 93,  key: "nossoNumeroAlt",   nome: "Nosso Número (carteiras diretas)",  type: "N",
    ajuda: "Faixa alternativa de Nosso Número, usada por carteiras diretas (Nota 3 do manual) — só preencher se a carteira exigir.", exemplo: "" },
  { ini: 94,  fim: 94,  key: "dacNossoNumeroAlt",nome: "DAC do Nosso Número (alt.)",        type: "N" },
  { ini: 95,  fim: 107, key: "brancos3",         nome: "Brancos",                          type: "A" },
  { ini: 108, fim: 108, key: "carteira",         nome: "Código da Carteira",                type: "A",
    obrigatorio: true, ajuda: "Código da carteira de cobrança.", exemplo: "1" },
  { ini: 109, fim: 110, key: "ocorrencia",       nome: "Identificação da Ocorrência",       type: "N",
    obrigatorio: true, ajuda: "Código do status devolvido pelo Itaú (ex.: 06 = Liquidação Normal). Ver tabela de ocorrências do Retorno.", exemplo: "06" },
  { ini: 111, fim: 116, key: "dataOcorrencia",   nome: "Data da Ocorrência no Banco",       type: "N", fmt: "data" },
  { ini: 117, fim: 126, key: "numDocumento",     nome: "Nº do Documento",                   type: "A",
    ajuda: "Mesmo conteúdo enviado na Remessa.", exemplo: "266728" },
  { ini: 127, fim: 134, key: "nossoNumeroConf",  nome: "Confirmação do Nosso Número",        type: "N" },
  { ini: 135, fim: 146, key: "brancos4",         nome: "Brancos",                          type: "A" },
  { ini: 147, fim: 152, key: "dataVencimento",   nome: "Data de Vencimento do Título",      type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data de vencimento original do título.", exemplo: "2024-11-06" },
  { ini: 153, fim: 165, key: "valorTitulo",      nome: "Valor do Título",                   type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor nominal do título, em reais.", exemplo: "52,56" },
  { ini: 166, fim: 168, key: "codBanco",         nome: "Código do Banco (Compensação)",     type: "N" },
  { ini: 169, fim: 172, key: "agenciaCobradora", nome: "Agência Cobradora/Liquidação/Baixa", type: "N" },
  { ini: 173, fim: 173, key: "dacAgenciaCobradora", nome: "DAC da Agência Cobradora",       type: "N" },
  { ini: 174, fim: 175, key: "especieTitulo",    nome: "Espécie do Título",                 type: "N" },
  { ini: 176, fim: 188, key: "tarifaCobranca",   nome: "Valor da Tarifa de Cobrança",       type: "N", fmt: "valor" },
  { ini: 189, fim: 214, key: "brancos5",         nome: "Brancos",                          type: "A" },
  { ini: 215, fim: 227, key: "valorIOF",         nome: "Valor do IOF",                      type: "N", fmt: "valor" },
  { ini: 228, fim: 240, key: "valorAbatimento",  nome: "Valor do Abatimento Concedido",     type: "N", fmt: "valor" },
  { ini: 241, fim: 253, key: "descontos",        nome: "Valor do Desconto Concedido",       type: "N", fmt: "valor" },
  { ini: 254, fim: 266, key: "valorPrincipal",   nome: "Valor Lançado em Conta Corrente (Valor Pago)", type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor líquido efetivamente creditado ao beneficiário.", exemplo: "52,56" },
  { ini: 267, fim: 279, key: "jurosMoraMulta",   nome: "Valor de Mora e Multa",              type: "N", fmt: "valor" },
  { ini: 280, fim: 292, key: "outrosCreditos",   nome: "Valor de Outros Créditos",          type: "N", fmt: "valor" },
  { ini: 293, fim: 293, key: "boletoDDA",        nome: "Indicador de Boleto DDA",           type: "A" },
  { ini: 294, fim: 295, key: "brancos6",         nome: "Brancos",                          type: "A" },
  { ini: 296, fim: 301, key: "dataCredito",      nome: "Data de Crédito desta Liquidação",  type: "N", fmt: "data",
    ajuda: "Data em que o valor pago foi creditado ao beneficiário.", exemplo: "2024-11-07" },
  { ini: 302, fim: 305, key: "instrCancelada",   nome: "Código da Instrução Cancelada",     type: "N" },
  { ini: 306, fim: 311, key: "brancos7",         nome: "Brancos",                          type: "A" },
  { ini: 312, fim: 324, key: "zeros2",           nome: "Zeros",                             type: "N" },
  { ini: 325, fim: 354, key: "nomePagador",      nome: "Nome do Pagador",                   type: "A",
    ajuda: "Nome do sacado/pagador.", exemplo: "TPR TRANSPORTES E LOGISTICA" },
  { ini: 355, fim: 377, key: "brancos8",         nome: "Brancos",                          type: "A" },
  { ini: 378, fim: 385, key: "errosMensagem",    nome: "Erros / Mensagem Informativa",      type: "A" },
  { ini: 386, fim: 392, key: "brancos9",         nome: "Brancos",                          type: "A" },
  { ini: 393, fim: 394, key: "codLiquidacao",    nome: "Código de Liquidação",              type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",      nome: "Nº Seqüencial do Registro",         type: "N" }
];

const RETORNO_TRAILER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",         nome: "Identificação do Registro Trailer", type: "N", fixo: "9" },
  { ini: 2,   fim: 2,   key: "codRetorno",         nome: "Identificação do Arquivo Retorno",  type: "N", fixo: "2" },
  { ini: 3,   fim: 4,   key: "codServico",         nome: "Código do Serviço",                 type: "N", fixo: "01" },
  { ini: 5,   fim: 7,   key: "codBanco",           nome: "Código do Banco (Compensação)",     type: "N", fixo: "341" },
  { ini: 8,   fim: 17,  key: "brancos1",           nome: "Brancos",                          type: "A" },
  { ini: 18,  fim: 25,  key: "qtdeTitulosSimples", nome: "Qtde. de Títulos em Cobrança Simples", type: "N" },
  { ini: 26,  fim: 39,  key: "valorTotalSimples",  nome: "Vr. Total dos Títulos em Cobrança Simples", type: "N", fmt: "valor" },
  { ini: 40,  fim: 47,  key: "avisoBancario1",     nome: "Referência do Aviso Bancário",      type: "A" },
  { ini: 48,  fim: 57,  key: "brancos2",           nome: "Brancos",                          type: "A" },
  { ini: 58,  fim: 65,  key: "qtdeTitulosVinc",    nome: "Qtde. de Títulos em Cobrança Vinculada", type: "N" },
  { ini: 66,  fim: 79,  key: "valorTotalVinc",     nome: "Vr. Total dos Títulos em Cobrança Vinculada", type: "N", fmt: "valor" },
  { ini: 80,  fim: 87,  key: "avisoBancario2",     nome: "Referência do Aviso Bancário",      type: "A" },
  { ini: 88,  fim: 177, key: "brancos3",           nome: "Brancos",                          type: "A" },
  { ini: 178, fim: 185, key: "qtdeTitulosDireta",  nome: "Qtde. de Títulos em Cobrança Direta/Escritural", type: "N" },
  { ini: 186, fim: 199, key: "valorTotalDireta",   nome: "Vr. Total dos Títulos em Cobrança Direta/Escritural", type: "N", fmt: "valor" },
  { ini: 200, fim: 207, key: "avisoBancario3",     nome: "Referência do Aviso Bancário",      type: "A" },
  { ini: 208, fim: 212, key: "controleArquivo",    nome: "Nº Seqüencial do Arquivo Retorno",  type: "N" },
  { ini: 213, fim: 220, key: "qtdeDetalhes",       nome: "Quantidade de Registros de Transação", type: "N" },
  { ini: 221, fim: 234, key: "valorTotalInformado",nome: "Valor dos Títulos Informados no Arquivo", type: "N", fmt: "valor" },
  { ini: 235, fim: 394, key: "brancos4",           nome: "Brancos",                          type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",        nome: "Nº Seqüencial do Registro",         type: "N" }
];

// Ocorrências do Retorno — manual, item (17). Tabela completa (código -> descrição).
const OCORRENCIAS_RETORNO = {
  "02": "Entrada Confirmada",
  "03": "Entrada Rejeitada",
  "04": "Alteração de Dados — Nova Entrada ou Alteração/Exclusão Acatada",
  "05": "Alteração de Dados — Baixa",
  "06": "Liquidação Normal",
  "07": "Liquidação Parcial — Cobrança Inteligente (B2B)",
  "08": "Liquidação em Cartório",
  "09": "Baixa Simples",
  "10": "Baixa por Ter Sido Liquidado",
  "11": "Em Ser (só no retorno mensal)",
  "12": "Abatimento Concedido",
  "13": "Abatimento Cancelado",
  "14": "Vencimento Alterado",
  "15": "Baixas Rejeitadas",
  "16": "Instruções Rejeitadas",
  "17": "Alteração/Exclusão de Dados Rejeitados",
  "18": "Cobrança Contratual — Instruções/Alterações Rejeitadas/Pendentes",
  "19": "Confirma Recebimento de Instrução de Protesto",
  "20": "Confirma Recebimento de Instrução de Sustação de Protesto/Tarifa",
  "21": "Confirma Recebimento de Instrução de Não Protestar",
  "23": "Título Enviado a Cartório/Tarifa",
  "24": "Instrução de Protesto Rejeitada/Sustada/Pendente",
  "25": "Alegações do Pagador",
  "26": "Tarifa de Aviso de Cobrança",
  "27": "Tarifa de Extrato Posição (B40X)",
  "28": "Tarifa de Relação das Liquidações",
  "29": "Tarifa de Manutenção de Títulos Vencidos",
  "30": "Débito Mensal de Tarifas (para Entradas e Baixas)",
  "32": "Baixa por Ter Sido Protestado",
  "33": "Custas de Protesto",
  "34": "Custas de Sustação",
  "35": "Custas de Cartório Distribuidor",
  "36": "Custas de Edital",
  "37": "Tarifa de Emissão de Boleto/Envio de Duplicata",
  "38": "Tarifa de Instrução",
  "39": "Tarifa de Ocorrências",
  "40": "Tarifa Mensal de Emissão de Boleto/Envio de Duplicata",
  "41": "Débito Mensal de Tarifas — Extrato de Posição",
  "42": "Débito Mensal de Tarifas — Outras Instruções",
  "43": "Débito Mensal de Tarifas — Manutenção de Títulos Vencidos",
  "44": "Débito Mensal de Tarifas — Outras Ocorrências",
  "45": "Débito Mensal de Tarifas — Protesto",
  "46": "Débito Mensal de Tarifas — Sustação de Protesto",
  "47": "Baixa com Transferência para Desconto",
  "48": "Custas de Sustação Judicial",
  "51": "Tarifa Mensal Ref. a Entradas Bancos Correspondentes na Carteira",
  "52": "Tarifa Mensal Baixas na Carteira",
  "53": "Tarifa Mensal Baixas em Bancos Correspondentes na Carteira",
  "54": "Tarifa Mensal de Liquidações na Carteira",
  "55": "Tarifa Mensal de Liquidações em Bancos Correspondentes na Carteira",
  "56": "Custas de Irregularidade",
  "57": "Instrução Cancelada",
  "59": "Baixa por Crédito em C/C através do SISPAG",
  "60": "Entrada Rejeitada Carnê",
  "61": "Tarifa Emissão Aviso de Movimentação de Títulos (2154)",
  "62": "Débito Mensal de Tarifa — Aviso de Movimentação de Títulos (2154)",
  "63": "Título Sustado Judicialmente",
  "64": "Entrada Confirmada com Rateio de Crédito",
  "65": "Pagamento com Cheque — Aguardando Compensação",
  "69": "Cheque Devolvido",
  "71": "Entrada Registrada, Aguardando Avaliação",
  "72": "Baixa por Crédito em C/C através do SISPAG sem Título Correspondente",
  "73": "Confirmação de Entrada na Cobrança Simples — Entrada Não Aceita na Cobrança Contratual",
  "74": "Instrução de Negativação Expressa Rejeitada",
  "75": "Confirmação de Recebimento de Instrução de Entrada em Negativação Expressa",
  "76": "Cheque Compensado",
  "77": "Confirmação de Recebimento de Instrução de Exclusão de Entrada em Negativação Expressa",
  "78": "Confirmação de Recebimento de Instrução de Cancelamento de Negativação Expressa",
  "79": "Negativação Expressa Informacional",
  "80": "Confirmação de Entrada em Negativação Expressa — Tarifa",
  "82": "Confirmação do Cancelamento de Negativação Expressa — Tarifa",
  "83": "Confirmação de Exclusão de Entrada em Negativação Expressa por Liquidação — Tarifa",
  "85": "Tarifa por Boleto (até 03 envios) Cobrança Ativa Eletrônica",
  "86": "Tarifa Email Cobrança Ativa Eletrônica",
  "87": "Tarifa SMS Cobrança Ativa Eletrônica",
  "88": "Tarifa Mensal por Boleto (até 03 envios) Cobrança Ativa Eletrônica",
  "89": "Tarifa Mensal Email Cobrança Ativa Eletrônica",
  "90": "Tarifa Mensal SMS Cobrança Ativa Eletrônica",
  "91": "Tarifa Mensal de Exclusão de Entrada de Negativação Expressa",
  "92": "Tarifa Mensal de Cancelamento de Negativação Expressa",
  "93": "Tarifa Mensal de Exclusão de Negativação Expressa por Liquidação"
};

export const itau = {
  code: "341",
  nome: "Itaú",

  remessa: {
    headerFields: REMESSA_HEADER_FIELDS,
    detalheFields: REMESSA_DETALHE_FIELDS,
    trailerFields: REMESSA_TRAILER_FIELDS,
    ocorrencias: OCORRENCIAS_REMESSA,
    ocorrenciaComMotivo: [],
    motivos: {},
    trailerTotalKey: "valorTitulo",
    formFields: {
      header: ["agencia", "conta", "dac", "nomeEmpresa", "dataGeracao"],
      detalhe: ["usoEmpresa", "nossoNumero", "carteira", "ocorrencia", "numDocumento", "dataVencimento", "valorTitulo", "numInscPagador", "nomePagador"]
    }
  },

  retorno: {
    headerFields: RETORNO_HEADER_FIELDS,
    detalheFields: RETORNO_DETALHE_FIELDS,
    trailerFields: RETORNO_TRAILER_FIELDS,
    ocorrencias: OCORRENCIAS_RETORNO,
    ocorrenciaComMotivo: [],
    motivos: {},
    trailerTotalFn: det => Number(det.valorPrincipal) || Number(det.valorTitulo) || 0,
    // Itaú chama o valor efetivamente pago de "valorPrincipal", não
    // "valorPago" (nome usado pelo Bradesco) — a tabela genérica de
    // leitura (ui.js) lê essa chave para achar a coluna certa.
    valorPagoKey: "valorPrincipal",
    formFields: {
      header: ["agencia", "conta", "dac", "nomeEmpresa", "dataGeracao"],
      detalhe: ["nossoNumero", "carteira", "ocorrencia", "dataVencimento", "valorTitulo", "valorPrincipal", "dataCredito", "nomePagador"]
    }
  }
};
