/* =====================================================================
   CNAB 240 — Santander (033), COBRANÇA | declaração dos layouts

   FONTE ÚNICA: "H7815 — Layout Cobrança CNAB 240 posições", versão 8.1 de
   junho/2024 (Manual do Cliente de Cobrança — Troca de Arquivos Padrão
   CNAB), enviado pelo dono do projeto. Header de arquivo, header de lote,
   segmentos P, Q, R, S, Y-03 e Y-53 (remessa), T, U, Y-03 e Y-04 (retorno),
   trailers e as notas (1 a 53) vêm dele. NÃO há arquivo real: o que prova o
   layout é o exemplo do próprio manual (DV do nosso número, nota 15) e a
   ida e volta (gerar → ler), não uma linha de produção.

   COMO ESTÁ ORGANIZADO: cada registro é uma lista de campos no mesmo formato
   do CNAB 400 ({ ini, fim, key, nome, type, fmt, fixo, obrigatorio, opcoes,
   tabela, ajuda, exemplo }) — posições 1-indexadas e inclusivas, como no
   manual. Datas do 240 são DDMMAAAA (`fmt: "dataDMA"`). Campos "Reservado
   (uso Banco)" viram `brancos…`/`zeros…` e não aparecem no formulário.

   DISCREPÂNCIAS DO PRÓPRIO MANUAL (resolvidas pela POSIÇÃO):
   - Trailer de lote, 009–017: "N … Brancos". Tratado como branco (A).
   - Segmento Y-04 (retorno), 224–240: a coluna tamanho diz 015; a faixa é 017.
   - Segmento S: o conteúdo depende da posição 18 ("1" = formulário especial,
     "2" = mensagens na ficha de compensação); são dois layouts, `S1` e `S2`.
   - Segmento Y: o conteúdo depende das posições 18–19 ("03" Pix, "53" tipo de
     pagamento, "04" cheques); `Y03`, `Y53` e `Y04`.
   - Os campos de valor com 5 casas decimais (percentual do IOF, 166–180) não
     têm formato próprio no motor e entram como número inteiro de 15 dígitos.

   NÃO CONFIRMADO: nada além do que está no manual — não há regra "de
   memória" aqui. O que o manual chama de "recomendável" (DV do nosso número
   no arquivo de remessa) a validação trata como AVISO, não como erro.
   ===================================================================== */

"use strict";

import { dvNossoNumeroSantander, regrasSantander } from "./santander-regras.js";

const BANCO = "033";

/* ----- tabelas do manual ----- */
const TIPO_REGISTRO = { "0": "Header de arquivo", "1": "Header de lote", "3": "Detalhe", "5": "Trailer de lote", "9": "Trailer de arquivo" };

const MOVIMENTO_REMESSA = {   // nota 14
  "01": "Entrada de boleto", "02": "Pedido de baixa", "04": "Concessão de abatimento",
  "05": "Cancelamento de abatimento", "06": "Alteração de vencimento",
  "07": "Alteração da identificação do boleto na empresa (controle do participante)",
  "08": "Alteração do seu número", "09": "Pedido de protesto", "18": "Pedido de sustação de protesto",
  "10": "Concessão de desconto", "11": "Cancelamento de desconto", "12": "Transferência de titularidade automática",
  "15": "Transferência da carteira Simples para a carteira Cessão", "16": "Baixa de Cessão por descaracterização",
  "17": "Baixa de Cessão por pagamento", "31": "Alteração de outros dados", "47": "Alteração do valor nominal do boleto",
  "48": "Alteração do valor mínimo ou percentual mínimo", "49": "Alteração do valor máximo ou percentual máximo",
  "98": "Não protestar (antes de iniciar o ciclo de protesto)"
};

const MOVIMENTO_RETORNO = {   // nota 40
  "02": "Entrada confirmada", "03": "Entrada rejeitada", "04": "Transferência para carteira Simples",
  "05": "Transferência para carteira Desconto/Penhor/Vendor/FIDC/Cessão", "06": "Liquidação do boleto efetivada",
  "08": "Confirmação do recebimento do cancelamento do desconto", "09": "Baixa", "11": "Boletos em carteira (em ser)",
  "12": "Confirmação de recebimento de instrução de abatimento", "13": "Confirmação de recebimento de instrução de cancelamento de abatimento",
  "14": "Confirmação de recebimento de instrução de alteração de vencimento", "17": "Liquidação após baixa ou boleto não registrado",
  "19": "Confirmação de recebimento de instrução de protesto", "20": "Confirmação de recebimento de instrução de sustação/não protestar",
  "23": "Remessa a cartório (aponte em cartório)", "24": "Retirada de cartório e manutenção em carteira",
  "25": "Protestado e baixado (baixa por ter sido protestado)", "26": "Instrução rejeitada",
  "27": "Confirmação do pedido de alteração de outros dados", "28": "Débito de tarifas/custas",
  "29": "Ocorrências do pagador", "30": "Alteração de dados rejeitada", "32": "Código de IOF inválido",
  "51": "Boleto DDA reconhecido pelo pagador", "52": "Boleto DDA não reconhecido pelo pagador", "53": "Boleto DDA recusado pela PCR",
  "61": "Confirmação de alteração do valor nominal do boleto", "91": "Confirmação de alteração do valor mínimo ou percentual mínimo",
  "92": "Confirmação de alteração do valor máximo ou percentual máximo", "93": "Pagamento do boleto recebido",
  "94": "Cancelamento do pagamento recebido", "A4": "Pagador DDA"
};

const ESPECIE = {   // nota 20
  "02": "DM - Duplicata mercantil", "04": "DS - Duplicata de serviço", "07": "LC - Letra de câmbio (somente banco 353)",
  "30": "LC - Letra de câmbio (somente banco 008)", "12": "NP - Nota promissória", "13": "NR - Nota promissória rural",
  "17": "RC - Recibo", "20": "AP - Apólice de seguro", "31": "BCC - Cartão de crédito", "32": "BDP - Boleto de proposta",
  "33": "BDA - Boleto de depósito e aporte", "97": "CH - Cheque", "98": "ND - Nota promissória direta"
};

const TIPO_COBRANCA_REMESSA = ["1", "3", "4", "5", "6", "7", "8", "9", "B"];   // nota 5
const COD_JUROS = ["1", "2", "3", "4", "5", "6"];                              // nota 21
const COD_DESCONTO = ["0", "1", "2", "3", "4"];                                // nota 23
const COD_PROTESTO = ["0", "1", "2", "3", "9"];                                // nota 25
const COD_BAIXA = ["1", "2", "3"];                                             // nota 26

/* ----- ajudantes de declaração ----- */
const brancos = (ini, fim, key = `brancos${ini}`) => ({ ini, fim, key, nome: "Reservado (uso do banco)", type: "A" });
const zeros = (ini, fim, key = `zeros${ini}`) => ({ ini, fim, key, nome: "Reservado (uso do banco)", type: "N" });
const banco = { ini: 1, fim: 3, key: "banco", nome: "Código do Banco na Compensação", type: "N", fixo: BANCO };
const lote = { ini: 4, fim: 7, key: "lote", nome: "Número do Lote", type: "N" };
const tipo = (v) => ({ ini: 8, fim: 8, key: "tipoRegistro", nome: "Tipo de Registro", type: "N", fixo: v });
const seqLote = { ini: 9, fim: 13, key: "seqRegistro", nome: "Nº Sequencial do Registro no Lote", type: "N" };
const segmento = (letra) => ({ ini: 14, fim: 14, key: "segmento", nome: "Código do Segmento", type: "A", fixo: letra });
const movimento = (tabela) => ({ ini: 16, fim: 17, key: "codMovimento", nome: "Código de Movimento", type: "A", tabela,
  obrigatorio: true, ajuda: "Código de movimento (nota 14 na remessa, nota 40 no retorno).", exemplo: "01" });
const detalheCabeca = (letra, tabela) => [banco, lote, tipo("3"), seqLote, segmento(letra), brancos(15, 15), movimento(tabela)];

/* =====================================================================
   REMESSA
   ===================================================================== */

const R_HEADER_ARQUIVO = [
  banco, { ini: 4, fim: 7, key: "lote", nome: "Lote de Serviço", type: "N", fixo: "0000" }, tipo("0"),
  brancos(9, 16),
  { ini: 17, fim: 17, key: "tipoInscricao", nome: "Tipo de Inscrição da Empresa", type: "N", opcoes: ["1", "2"],
    obrigatorio: true, ajuda: "1 = CPF, 2 = CNPJ.", exemplo: "2" },
  { ini: 18, fim: 32, key: "numInscricao", nome: "Nº de Inscrição da Empresa", type: "N",
    obrigatorio: true, ajuda: "CPF ou CNPJ da empresa, sem pontuação, com zeros à esquerda; 15 posições." },
  { ini: 33, fim: 47, key: "codTransmissao", nome: "Código de Transmissão", type: "N",
    obrigatorio: true, ajuda: "Informação cedida pelo banco que identifica o arquivo remessa do cliente (nota 3); 15 posições.", exemplo: "123456789012345" },
  brancos(48, 72),
  { ini: 73, fim: 102, key: "nomeEmpresa", nome: "Nome da Empresa", type: "A",
    obrigatorio: true, ajuda: "Maiúsculas, sem acento nem caractere especial; 30 posições.", exemplo: "EMPRESA EXEMPLO LTDA" },
  { ini: 103, fim: 132, key: "nomeBanco", nome: "Nome do Banco", type: "A", fixo: "BANCO SANTANDER" },
  brancos(133, 142),
  { ini: 143, fim: 143, key: "codRemessa", nome: "Código Remessa", type: "N", fixo: "1" },
  { ini: 144, fim: 151, key: "dataGeracao", nome: "Data de Geração do Arquivo", type: "N", fmt: "dataDMA",
    obrigatorio: true, ajuda: "Data de geração (DDMMAAAA no arquivo).", exemplo: "2026-11-18" },
  brancos(152, 157),
  { ini: 158, fim: 163, key: "seqArquivo", nome: "Nº Sequencial do Arquivo", type: "N",
    obrigatorio: true, ajuda: "Evolui um a cada Header de arquivo (nota 4); 6 posições.", exemplo: "1" },
  { ini: 164, fim: 166, key: "versaoLayout", nome: "Versão do Layout do Arquivo", type: "N", fixo: "040" },
  brancos(167, 240)
];

const R_HEADER_LOTE = [
  banco, { ...lote, obrigatorio: true, ajuda: "0001 para o primeiro lote, crescente nos demais (nota 1).", exemplo: "1" }, tipo("1"),
  { ini: 9, fim: 9, key: "tipoOperacao", nome: "Tipo de Operação", type: "A", fixo: "R" },
  { ini: 10, fim: 11, key: "tipoServico", nome: "Tipo de Serviço", type: "N", fixo: "01" },
  brancos(12, 13),
  { ini: 14, fim: 16, key: "versaoLote", nome: "Nº da Versão do Layout do Lote", type: "N", fixo: "030" },
  brancos(17, 17),
  { ini: 18, fim: 18, key: "tipoInscricao", nome: "Tipo de Inscrição da Empresa", type: "N", opcoes: ["1", "2"],
    obrigatorio: true, ajuda: "1 = CPF, 2 = CNPJ.", exemplo: "2" },
  { ini: 19, fim: 33, key: "numInscricao", nome: "Nº de Inscrição da Empresa", type: "N",
    obrigatorio: true, ajuda: "Sem pontuação, com zeros à esquerda; 15 posições." },
  brancos(34, 53),
  { ini: 54, fim: 68, key: "codTransmissao", nome: "Código de Transmissão", type: "N",
    obrigatorio: true, ajuda: "O mesmo do header do arquivo; 15 posições.", exemplo: "123456789012345" },
  brancos(69, 73),
  { ini: 74, fim: 103, key: "nomeBeneficiario", nome: "Nome do Beneficiário", type: "A",
    obrigatorio: true, ajuda: "Maiúsculas, sem acento; 30 posições.", exemplo: "EMPRESA EXEMPLO LTDA" },
  { ini: 104, fim: 143, key: "mensagem1", nome: "Mensagem 1", type: "A", ajuda: "Impressa em todos os boletos do lote (nota 9); 40 posições." },
  { ini: 144, fim: 183, key: "mensagem2", nome: "Mensagem 2", type: "A", ajuda: "Impressa em todos os boletos do lote (nota 9); 40 posições." },
  { ini: 184, fim: 191, key: "numRemessa", nome: "Número da Remessa", type: "N",
    obrigatorio: true, ajuda: "Controlado por quem gera o arquivo, para identificar a sequência de envio (nota 10); 8 posições.", exemplo: "1" },
  { ini: 192, fim: 199, key: "dataGravacao", nome: "Data de Gravação da Remessa", type: "N", fmt: "dataDMA",
    obrigatorio: true, ajuda: "Data de gravação (DDMMAAAA no arquivo).", exemplo: "2026-11-18" },
  brancos(200, 240)
];

const R_SEG_P = [
  ...detalheCabeca("P", MOVIMENTO_REMESSA),
  { ini: 18, fim: 21, key: "agencia", nome: "Agência do Destinatário", type: "N", obrigatorio: true, ajuda: "Agência do beneficiário; 4 posições.", exemplo: "1234" },
  { ini: 22, fim: 22, key: "dvAgencia", nome: "Dígito da Agência", type: "N", obrigatorio: true, ajuda: "1 posição.", exemplo: "5" },
  { ini: 23, fim: 31, key: "conta", nome: "Número da Conta Corrente", type: "N", obrigatorio: true, ajuda: "9 posições, zeros à esquerda.", exemplo: "123456789" },
  { ini: 32, fim: 32, key: "dvConta", nome: "Dígito Verificador da Conta", type: "N", obrigatorio: true, ajuda: "1 posição.", exemplo: "0" },
  { ini: 33, fim: 41, key: "contaFidc", nome: "Conta Cobrança Destinatária FIDC", type: "N", ajuda: "Só para boletos de FIDC (nota 44); 9 posições." },
  { ini: 42, fim: 42, key: "dvContaFidc", nome: "Dígito da Conta Cobrança FIDC", type: "N", ajuda: "1 posição." },
  brancos(43, 44),
  { ini: 45, fim: 57, key: "nossoNumero", nome: "Nosso Número", type: "N",
    obrigatorio: true,
    ajuda: "Recomendável preenchido, com o dígito verificador módulo 11 do manual (nota 15); se zerado, o banco atribui um número. 13 posições.",
    exemplo: "0000031475787", exemploFn: (i) => nossoNumeroComDv(3147578 + i) },
  { ini: 58, fim: 58, key: "tipoCobranca", nome: "Tipo de Cobrança", type: "A", opcoes: TIPO_COBRANCA_REMESSA,
    obrigatorio: true, ajuda: "1 = Simples (sem registro e eletrônica com registro), 5 = Simples (rápida com registro), 3 = Caucionada, 4 = Descontada… (nota 5).", exemplo: "5" },
  { ini: 59, fim: 59, key: "formaCadastramento", nome: "Forma de Cadastramento", type: "N", opcoes: ["1", "2", "3"],
    obrigatorio: true, ajuda: "1 = Cobrança registrada (rápida e eletrônica com registro), 2 = Cobrança sem registro, 3 = Simples sem registro (nota 6).", exemplo: "1" },
  { ini: 60, fim: 60, key: "tipoDocumento", nome: "Tipo de Documento", type: "N", opcoes: ["1", "2"],
    obrigatorio: true, ajuda: "1 = Tradicional, 2 = Escritural.", exemplo: "1" },
  brancos(61, 62),
  { ini: 63, fim: 77, key: "seuNumero", nome: "Nº do Documento (Seu Número)", type: "A",
    obrigatorio: true, ajuda: "Número adotado pelo cliente para identificar o boleto; volta no retorno (nota 16); 15 posições.", exemplo: "DOC0000001" },
  { ini: 78, fim: 85, key: "dataVencimento", nome: "Data de Vencimento do Boleto", type: "N", fmt: "dataDMA",
    obrigatorio: true, ajuda: "Data válida, igual ou posterior à de emissão e em até 10 anos (nota 17). 11111111 e 99999999 são rejeitados.", exemplo: "2026-12-10" },
  { ini: 86, fim: 100, key: "valorNominal", nome: "Valor Nominal do Boleto", type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Duas casas decimais, sem separador (nota 18); 15 posições.", exemplo: "150,00" },
  { ini: 101, fim: 104, key: "agenciaFidc", nome: "Agência Encarregada da Cobrança FIDC", type: "N", ajuda: "Só FIDC; 4 posições." },
  { ini: 105, fim: 105, key: "dvAgenciaFidc", nome: "Dígito da Agência FIDC", type: "N", ajuda: "Só FIDC." },
  brancos(106, 106),
  { ini: 107, fim: 108, key: "especie", nome: "Espécie do Boleto", type: "N", opcoes: Object.keys(ESPECIE),
    obrigatorio: true, ajuda: "02 = duplicata mercantil, 04 = duplicata de serviço… (nota 20).", exemplo: "02" },
  { ini: 109, fim: 109, key: "aceite", nome: "Identificação de Boleto Aceito/Não Aceito", type: "A", fixo: "N" },
  { ini: 110, fim: 117, key: "dataEmissao", nome: "Data da Emissão do Boleto", type: "N", fmt: "dataDMA",
    obrigatorio: true, ajuda: "Data de emissão (DDMMAAAA no arquivo).", exemplo: "2026-11-18" },
  { ini: 118, fim: 118, key: "codJuros", nome: "Código de Juros de Mora", type: "N", opcoes: COD_JUROS,
    obrigatorio: true, ajuda: "1 = valor por dia, 2 = taxa mensal, 3 = isento, 4 = comissão de permanência do banco, 5/6 = tolerância (nota 21).", exemplo: "3" },
  { ini: 119, fim: 126, key: "dataJuros", nome: "Data de Juros de Mora", type: "N", fmt: "dataDMA", ajuda: "Nos códigos 1, 2 e 4, a data de vencimento; nos 5 e 6, uma data maior (nota 22)." },
  { ini: 127, fim: 141, key: "valorJuros", nome: "Valor da Mora por Dia ou Taxa Mensal", type: "N", fmt: "valor", ajuda: "Duas casas decimais, sem separador." },
  { ini: 142, fim: 142, key: "codDesconto", nome: "Código do Desconto 1", type: "N", opcoes: COD_DESCONTO,
    ajuda: "0 = isento, 1 = valor fixo até a data, 2 = percentual até a data, 3 = valor por antecipação (dia corrido), 4 = por antecipação (dia útil) (nota 23)." },
  { ini: 143, fim: 150, key: "dataDesconto", nome: "Data do Desconto 1", type: "N", fmt: "dataDMA", ajuda: "Obrigatória nos códigos 1 e 2: maior que a emissão e menor ou igual ao vencimento." },
  { ini: 151, fim: 165, key: "valorDesconto", nome: "Valor ou Percentual do Desconto", type: "N", fmt: "valor", ajuda: "Duas casas decimais, sem separador." },
  { ini: 166, fim: 180, key: "percIof", nome: "Percentual do IOF a Ser Recolhido", type: "N", ajuda: "Cinco casas decimais, sem separador (nota 18); 15 posições." },
  { ini: 181, fim: 195, key: "valorAbatimento", nome: "Valor do Abatimento", type: "N", fmt: "valor", ajuda: "Menor que o valor nominal (nota 18)." },
  { ini: 196, fim: 220, key: "idBoletoEmpresa", nome: "Identificação do Boleto na Empresa", type: "A", ajuda: "Uso do beneficiário (opcional); volta no retorno na liquidação (nota 24); 25 posições." },
  { ini: 221, fim: 221, key: "codProtesto", nome: "Código para Protesto", type: "N", opcoes: COD_PROTESTO, ajuda: "0 = não protestar, 1 = dias corridos, 2 = dias úteis, 3 = perfil do beneficiário, 9 = cancelamento do protesto automático (nota 25)." },
  { ini: 222, fim: 223, key: "diasProtesto", nome: "Número de Dias para Protesto", type: "N", ajuda: "2 posições." },
  { ini: 224, fim: 224, key: "codBaixa", nome: "Código para Baixa/Devolução", type: "N", opcoes: COD_BAIXA, ajuda: "1 = baixar/devolver, 2 = não baixar/não devolver, 3 = perfil do beneficiário (nota 26)." },
  { ini: 225, fim: 225, key: "zero225", nome: "Reservado (zero fixo)", type: "N", fixo: "0" },
  { ini: 226, fim: 227, key: "diasBaixa", nome: "Número de Dias para Baixa/Devolução", type: "N", ajuda: "2 posições." },
  { ini: 228, fim: 229, key: "codMoeda", nome: "Código da Moeda", type: "N", fixo: "00" },
  brancos(230, 240)
];

const R_SEG_Q = [
  ...detalheCabeca("Q", MOVIMENTO_REMESSA),
  { ini: 18, fim: 18, key: "tipoInscPagador", nome: "Tipo de Inscrição do Pagador", type: "N", opcoes: ["1", "2"],
    obrigatorio: true, ajuda: "1 = CPF, 2 = CNPJ. O banco confere o dígito verificador do documento (nota 29).", exemplo: "1" },
  { ini: 19, fim: 33, key: "numInscPagador", nome: "Nº de Inscrição do Pagador", type: "N",
    obrigatorio: true, ajuda: "Sem pontuação, com zeros à esquerda; 15 posições. Não pode ser igual ao do beneficiário (nota 29)." },
  { ini: 34, fim: 73, key: "nomePagador", nome: "Nome do Pagador", type: "A", obrigatorio: true, ajuda: "Maiúsculas, sem acento; 40 posições." },
  { ini: 74, fim: 113, key: "enderecoPagador", nome: "Endereço do Pagador", type: "A", obrigatorio: true, ajuda: "Obrigatório (nota 28); 40 posições.", exemplo: "RUA DAS FLORES 100" },
  { ini: 114, fim: 128, key: "bairroPagador", nome: "Bairro do Pagador", type: "A", obrigatorio: true, ajuda: "15 posições.", exemplo: "CENTRO" },
  { ini: 129, fim: 133, key: "cepPagador", nome: "CEP do Pagador", type: "N", obrigatorio: true, ajuda: "5 primeiros dígitos do CEP.", exemplo: "12345" },
  { ini: 134, fim: 136, key: "sufixoCep", nome: "Sufixo do CEP do Pagador", type: "N", obrigatorio: true, ajuda: "3 últimos dígitos do CEP.", exemplo: "678" },
  { ini: 137, fim: 151, key: "cidadePagador", nome: "Cidade do Pagador", type: "A", obrigatorio: true, ajuda: "15 posições.", exemplo: "SAO PAULO" },
  { ini: 152, fim: 153, key: "ufPagador", nome: "Unidade da Federação do Pagador", type: "A", obrigatorio: true, ajuda: "UF existente e válida (nota 28).", exemplo: "SP" },
  { ini: 154, fim: 154, key: "tipoInscBenefFinal", nome: "Tipo de Inscrição do Beneficiário Final", type: "N", opcoes: ["1", "2"], ajuda: "Obrigatório em boleto negociado com terceiros e em depósito/aporte (nota 30)." },
  { ini: 155, fim: 169, key: "numInscBenefFinal", nome: "Nº de Inscrição do Beneficiário Final", type: "N", ajuda: "15 posições." },
  { ini: 170, fim: 209, key: "nomeBenefFinal", nome: "Nome do Beneficiário Final", type: "A", ajuda: "40 posições." },
  zeros(210, 212), zeros(213, 215), zeros(216, 218), zeros(219, 221),
  brancos(222, 240)
];

const R_SEG_R = [
  ...detalheCabeca("R", MOVIMENTO_REMESSA),
  { ini: 18, fim: 18, key: "codDesconto2", nome: "Código do Desconto 2", type: "N", opcoes: COD_DESCONTO },
  { ini: 19, fim: 26, key: "dataDesconto2", nome: "Data do Desconto 2", type: "N", fmt: "dataDMA" },
  { ini: 27, fim: 41, key: "valorDesconto2", nome: "Valor ou Percentual a Ser Concedido (2)", type: "N", fmt: "valor" },
  { ini: 42, fim: 42, key: "codDesconto3", nome: "Código do Desconto 3", type: "N", opcoes: COD_DESCONTO },
  { ini: 43, fim: 50, key: "dataDesconto3", nome: "Data do Desconto 3", type: "N", fmt: "dataDMA" },
  { ini: 51, fim: 65, key: "valorDesconto3", nome: "Valor ou Percentual a Ser Concedido (3)", type: "N", fmt: "valor" },
  { ini: 66, fim: 66, key: "codMulta", nome: "Código da Multa", type: "N", opcoes: ["1", "2"], ajuda: "1 = valor fixo, 2 = percentual." },
  { ini: 67, fim: 74, key: "dataMulta", nome: "Data da Multa", type: "N", fmt: "dataDMA", ajuda: "Se inválida ou não informada, vale a data de vencimento (nota 32)." },
  { ini: 75, fim: 89, key: "valorMulta", nome: "Valor/Percentual a Ser Aplicado", type: "N", fmt: "valor" },
  brancos(90, 99),
  { ini: 100, fim: 139, key: "mensagem3", nome: "Mensagem 3", type: "A", ajuda: "Impressa na ficha de compensação; só sai se as posições das mensagens 3 e 4 estiverem preenchidas (nota 33)." },
  { ini: 140, fim: 179, key: "mensagem4", nome: "Mensagem 4", type: "A" },
  brancos(180, 240)
];

const R_SEG_S1 = [   // posição 18 = "1": mensagem livre no recibo do pagador (formulário especial)
  ...detalheCabeca("S", MOVIMENTO_REMESSA),
  { ini: 18, fim: 18, key: "idImpressao", nome: "Identificação da Impressão", type: "N", fixo: "1" },
  { ini: 19, fim: 20, key: "numLinha", nome: "Número da Linha a Ser Impressa", type: "N", ajuda: "De 01 a 22 (nota 35)." },
  { ini: 21, fim: 21, key: "msgRecibo", nome: "Mensagem para Recibo do Pagador", type: "N", opcoes: ["2", "4"], ajuda: "2 = comum a todos os boletos do movimento, 4 = para um boleto (nota 36)." },
  { ini: 22, fim: 121, key: "mensagem", nome: "Mensagem a Ser Impressa", type: "A" },
  brancos(122, 240)
];

const R_SEG_S2 = [   // posição 18 = "2": mensagens na ficha de compensação
  ...detalheCabeca("S", MOVIMENTO_REMESSA),
  { ini: 18, fim: 18, key: "idImpressao", nome: "Identificação da Impressão", type: "N", fixo: "2" },
  { ini: 19, fim: 58, key: "mensagem5", nome: "Mensagem 5", type: "A" },
  { ini: 59, fim: 98, key: "mensagem6", nome: "Mensagem 6", type: "A" },
  { ini: 99, fim: 138, key: "mensagem7", nome: "Mensagem 7", type: "A" },
  { ini: 139, fim: 178, key: "mensagem8", nome: "Mensagem 8", type: "A" },
  { ini: 179, fim: 218, key: "mensagem9", nome: "Mensagem 9", type: "A" },
  brancos(219, 240)
];

const R_SEG_Y03 = [   // QR Code Pix (opcional)
  ...detalheCabeca("Y", MOVIMENTO_REMESSA),
  { ini: 18, fim: 19, key: "idRegistroOpcional", nome: "Identificação do Registro Opcional", type: "N", fixo: "03" },
  brancos(20, 80),
  { ini: 81, fim: 81, key: "tipoChavePix", nome: "Tipo de Chave Pix", type: "A", opcoes: ["1", "2", "3", "4", "5"], ajuda: "1 = CPF, 2 = CNPJ, 3 = celular, 4 = e-mail, 5 = chave aleatória (nota 49)." },
  { ini: 82, fim: 158, key: "chavePix", nome: "Chave Pix", type: "A", ajuda: "Chave cadastrada no banco (nota 50); 77 posições." },
  { ini: 159, fim: 193, key: "txid", nome: "Código de Identificação do QR Code (TXID)", type: "A", ajuda: "De 26 a 35 caracteres A–Z, a–z, 0–9, único por boleto (nota 52)." },
  brancos(194, 240)
];

const R_SEG_Y53 = [   // tipo de pagamento (opcional)
  ...detalheCabeca("Y", MOVIMENTO_REMESSA),
  { ini: 18, fim: 19, key: "idRegistroOpcional", nome: "Identificação do Registro Opcional", type: "N", fixo: "53" },
  { ini: 20, fim: 21, key: "tipoPagamento", nome: "Identificação do Tipo de Pagamento", type: "N", opcoes: ["01", "02", "03"], ajuda: "01 = aceita qualquer valor, 02 = entre o mínimo e o máximo, 03 = não aceita valor divergente (nota 46)." },
  { ini: 22, fim: 23, key: "qtdPagamentos", nome: "Quantidade de Pagamentos Possíveis", type: "N", ajuda: "De 01 a 99 (nota 47)." },
  { ini: 24, fim: 24, key: "tipoValorMax", nome: "Tipo de Valor Informado (máximo)", type: "N", opcoes: ["1", "2"], ajuda: "1 = percentual, 2 = valor (nota 48)." },
  { ini: 25, fim: 39, key: "valorMax", nome: "Valor Máximo", type: "N", fmt: "valor" },
  { ini: 40, fim: 40, key: "tipoValorMin", nome: "Tipo de Valor Informado (mínimo)", type: "N", opcoes: ["1", "2"] },
  { ini: 41, fim: 55, key: "valorMin", nome: "Valor Mínimo", type: "N", fmt: "valor" },
  brancos(56, 240)
];

const R_TRAILER_LOTE = [
  { ...banco, fixo: undefined, padrao: BANCO, opcoes: ["033", "353", "008"] }, lote, tipo("5"), brancos(9, 17),
  { ini: 18, fim: 23, key: "qtdRegistros", nome: "Quantidade de Registros do Lote", type: "N" },
  brancos(24, 240)
];

const TRAILER_ARQUIVO = [
  banco, { ini: 4, fim: 7, key: "lote", nome: "Lote de Serviço", type: "N", fixo: "9999" }, tipo("9"), brancos(9, 17),
  { ini: 18, fim: 23, key: "qtdLotes", nome: "Quantidade de Lotes do Arquivo", type: "N" },
  { ini: 24, fim: 29, key: "qtdRegistros", nome: "Quantidade de Registros do Arquivo", type: "N" },
  brancos(30, 240)
];

/* =====================================================================
   RETORNO
   ===================================================================== */

const T_HEADER_ARQUIVO = [
  banco, { ini: 4, fim: 7, key: "lote", nome: "Lote de Serviço", type: "N", fixo: "0000" }, tipo("0"),
  brancos(9, 16),
  { ini: 17, fim: 17, key: "tipoInscricao", nome: "Tipo de Inscrição da Empresa", type: "N", opcoes: ["1", "2"], obrigatorio: true, ajuda: "1 = CPF, 2 = CNPJ.", exemplo: "2" },
  { ini: 18, fim: 32, key: "numInscricao", nome: "Nº de Inscrição da Empresa", type: "N", obrigatorio: true, ajuda: "15 posições." },
  { ini: 33, fim: 36, key: "agencia", nome: "Agência do Beneficiário", type: "N", obrigatorio: true, exemplo: "1234" },
  { ini: 37, fim: 37, key: "dvAgencia", nome: "Dígito da Agência do Beneficiário", type: "N", obrigatorio: true, exemplo: "5" },
  { ini: 38, fim: 46, key: "conta", nome: "Número da Conta Corrente", type: "N", obrigatorio: true, exemplo: "123456789" },
  { ini: 47, fim: 47, key: "dvConta", nome: "Dígito Verificador da Conta", type: "N", obrigatorio: true, exemplo: "0" },
  brancos(48, 52),
  { ini: 53, fim: 61, key: "codBeneficiario", nome: "Código do Beneficiário", type: "N", obrigatorio: true, exemplo: "123456789" },
  brancos(62, 72),
  { ini: 73, fim: 102, key: "nomeEmpresa", nome: "Nome da Empresa", type: "A", obrigatorio: true, exemplo: "EMPRESA EXEMPLO LTDA" },
  { ini: 103, fim: 132, key: "nomeBanco", nome: "Nome do Banco", type: "A", fixo: "BANCO SANTANDER" },
  brancos(133, 142),
  { ini: 143, fim: 143, key: "codRetorno", nome: "Código Remessa/Retorno", type: "N", fixo: "2" },
  { ini: 144, fim: 151, key: "dataGeracao", nome: "Data de Geração do Arquivo", type: "N", fmt: "dataDMA", obrigatorio: true, exemplo: "2026-11-18" },
  brancos(152, 157),
  { ini: 158, fim: 163, key: "seqArquivo", nome: "Nº Sequencial do Arquivo", type: "N", obrigatorio: true, exemplo: "1" },
  { ini: 164, fim: 166, key: "versaoLayout", nome: "Versão do Layout do Arquivo", type: "N", fixo: "040" },
  brancos(167, 240)
];

const T_HEADER_LOTE = [
  banco, { ...lote, obrigatorio: true, exemplo: "1" }, tipo("1"),
  { ini: 9, fim: 9, key: "tipoOperacao", nome: "Tipo de Operação", type: "A", fixo: "T" },
  { ini: 10, fim: 11, key: "tipoServico", nome: "Tipo de Serviço", type: "N", fixo: "01" },
  brancos(12, 13),
  { ini: 14, fim: 16, key: "versaoLote", nome: "Nº da Versão do Layout do Lote", type: "N", fixo: "040" },
  brancos(17, 17),
  { ini: 18, fim: 18, key: "tipoInscricao", nome: "Tipo de Inscrição da Empresa", type: "N", opcoes: ["1", "2"], obrigatorio: true, exemplo: "2" },
  { ini: 19, fim: 33, key: "numInscricao", nome: "Nº de Inscrição da Empresa", type: "N", obrigatorio: true },
  { ini: 34, fim: 42, key: "codBeneficiario", nome: "Código do Beneficiário", type: "N", obrigatorio: true, exemplo: "123456789" },
  brancos(43, 53),
  { ini: 54, fim: 57, key: "agencia", nome: "Agência do Beneficiário", type: "N", obrigatorio: true, exemplo: "1234" },
  { ini: 58, fim: 58, key: "dvAgencia", nome: "Dígito da Agência do Beneficiário", type: "N", obrigatorio: true, exemplo: "5" },
  { ini: 59, fim: 67, key: "conta", nome: "Número da Conta do Beneficiário", type: "N", obrigatorio: true, exemplo: "123456789" },
  { ini: 68, fim: 68, key: "dvConta", nome: "Dígito Verificador da Conta", type: "N", obrigatorio: true, exemplo: "0" },
  brancos(69, 73),
  { ini: 74, fim: 103, key: "nomeEmpresa", nome: "Nome da Empresa", type: "A", obrigatorio: true, exemplo: "EMPRESA EXEMPLO LTDA" },
  brancos(104, 183),
  { ini: 184, fim: 191, key: "numRetorno", nome: "Número do Retorno", type: "N", obrigatorio: true, exemplo: "1" },
  { ini: 192, fim: 199, key: "dataGravacao", nome: "Data de Gravação Remessa/Retorno", type: "N", fmt: "dataDMA", obrigatorio: true, exemplo: "2026-11-18" },
  brancos(200, 240)
];

const T_SEG_T = [
  ...detalheCabeca("T", MOVIMENTO_RETORNO),
  { ini: 18, fim: 21, key: "agencia", nome: "Agência do Beneficiário", type: "N", obrigatorio: true, exemplo: "1234" },
  { ini: 22, fim: 22, key: "dvAgencia", nome: "Dígito da Agência", type: "N", obrigatorio: true, exemplo: "5" },
  { ini: 23, fim: 31, key: "conta", nome: "Número da Conta Corrente", type: "N", obrigatorio: true, exemplo: "123456789" },
  { ini: 32, fim: 32, key: "dvConta", nome: "Dígito Verificador da Conta", type: "N", obrigatorio: true, exemplo: "0" },
  brancos(33, 40),
  { ini: 41, fim: 53, key: "nossoNumero", nome: "Nosso Número", type: "N", obrigatorio: true,
    exemplo: "0000031475787", exemploFn: (i) => nossoNumeroComDv(3147578 + i) },
  { ini: 54, fim: 54, key: "codCarteira", nome: "Código da Carteira", type: "A", ajuda: "Tipo de cobrança devolvido (nota 5, retorno)." },
  { ini: 55, fim: 69, key: "seuNumero", nome: "Nº do Documento de Cobrança (Seu Número)", type: "A", obrigatorio: true, exemplo: "DOC0000001" },
  { ini: 70, fim: 77, key: "dataVencimento", nome: "Data do Vencimento do Boleto", type: "N", fmt: "dataDMA", obrigatorio: true, exemplo: "2026-12-10" },
  { ini: 78, fim: 92, key: "valorNominal", nome: "Valor Nominal do Boleto", type: "N", fmt: "valor", obrigatorio: true, exemplo: "150,00" },
  { ini: 93, fim: 95, key: "bancoCobrador", nome: "Nº do Banco Cobrador/Recebedor", type: "N" },
  { ini: 96, fim: 99, key: "agenciaCobradora", nome: "Agência Cobradora/Recebedora", type: "N", ajuda: "Na liquidação (06), a agência onde o pagamento foi efetuado (nota 53)." },
  { ini: 100, fim: 100, key: "dvAgenciaCobradora", nome: "Dígito da Agência do Beneficiário", type: "N" },
  { ini: 101, fim: 125, key: "idBoletoEmpresa", nome: "Identificação do Boleto na Empresa", type: "A" },
  { ini: 126, fim: 127, key: "codMoeda", nome: "Código da Moeda", type: "N" },
  { ini: 128, fim: 128, key: "tipoInscPagador", nome: "Tipo de Inscrição do Pagador", type: "N", opcoes: ["1", "2"], obrigatorio: true, exemplo: "1" },
  { ini: 129, fim: 143, key: "numInscPagador", nome: "Nº de Inscrição do Pagador", type: "N", obrigatorio: true },
  { ini: 144, fim: 183, key: "nomePagador", nome: "Nome do Pagador", type: "A", obrigatorio: true },
  { ini: 184, fim: 193, key: "contaCobranca", nome: "Conta Cobrança", type: "A" },
  { ini: 194, fim: 208, key: "valorTarifa", nome: "Valor da Tarifa/Custas", type: "N", fmt: "valor" },
  { ini: 209, fim: 218, key: "idRejeicoes", nome: "Identificação para Rejeições, Tarifas, Custas, Liquidações, Baixas e Pix", type: "A",
    ajuda: "Cinco códigos de 2 posições (notas 40-A e 40-C)." },
  brancos(219, 240)
];

const T_SEG_U = [
  ...detalheCabeca("U", MOVIMENTO_RETORNO),
  { ini: 18, fim: 32, key: "jurosMultaEncargos", nome: "Juros/Multa/Encargos", type: "N", fmt: "valor" },
  { ini: 33, fim: 47, key: "valorDesconto", nome: "Valor do Desconto Concedido", type: "N", fmt: "valor" },
  { ini: 48, fim: 62, key: "valorAbatimento", nome: "Valor do Abatimento Concedido/Cancelado", type: "N", fmt: "valor" },
  { ini: 63, fim: 77, key: "valorIof", nome: "Valor do IOF Recolhido", type: "N", fmt: "valor" },
  { ini: 78, fim: 92, key: "valorPago", nome: "Valor Pago pelo Pagador", type: "N", fmt: "valor", obrigatorio: true, exemplo: "150,00" },
  { ini: 93, fim: 107, key: "valorLiquido", nome: "Valor Líquido a Ser Creditado", type: "N", fmt: "valor", obrigatorio: true, exemplo: "150,00" },
  { ini: 108, fim: 122, key: "outrasDespesas", nome: "Valor de Outras Despesas", type: "N", fmt: "valor" },
  { ini: 123, fim: 137, key: "outrosCreditos", nome: "Valor de Outros Créditos", type: "N", fmt: "valor" },
  { ini: 138, fim: 145, key: "dataOcorrencia", nome: "Data da Ocorrência", type: "N", fmt: "dataDMA", obrigatorio: true, exemplo: "2026-12-10" },
  { ini: 146, fim: 153, key: "dataCredito", nome: "Data da Efetivação do Crédito", type: "N", fmt: "dataDMA", obrigatorio: true, exemplo: "2026-12-11" },
  { ini: 154, fim: 157, key: "codOcorrenciaPagador", nome: "Código da Ocorrência do Pagador", type: "N", ajuda: "Nota 41; 4 posições." },
  { ini: 158, fim: 165, key: "dataOcorrenciaPagador", nome: "Data da Ocorrência do Pagador", type: "N", fmt: "dataDMA" },
  { ini: 166, fim: 180, key: "valorOcorrenciaPagador", nome: "Valor da Ocorrência do Pagador", type: "N", fmt: "valor" },
  { ini: 181, fim: 210, key: "complementoPagador", nome: "Complemento da Ocorrência do Pagador", type: "A" },
  { ini: 211, fim: 213, key: "bancoCorrespondente", nome: "Código do Banco Correspondente", type: "N" },
  brancos(214, 240)
];

const T_SEG_Y03 = R_SEG_Y03.map((d) => (d.key === "codMovimento" ? { ...d, tabela: MOVIMENTO_RETORNO } : d));
const T_SEG_Y04 = [
  ...detalheCabeca("Y", MOVIMENTO_RETORNO),
  { ini: 18, fim: 19, key: "idRegistroOpcional", nome: "Identificação do Registro Opcional", type: "N", fixo: "04" },
  ...[20, 54, 88, 122, 156, 190].map((ini, i) => ({ ini, fim: ini + 33, key: `cheque${i + 1}`, nome: `Identificação do Cheque ${i + 1}`, type: "A", ajuda: "Código CMC7 do cheque (nota 43)." })),
  brancos(224, 240)
];

const T_TRAILER_LOTE = [
  { ...banco }, lote, tipo("5"), brancos(9, 17),
  { ini: 18, fim: 23, key: "qtdRegistros", nome: "Quantidade de Registros do Lote", type: "N" },
  { ini: 24, fim: 29, key: "qtdSimples", nome: "Quantidade de Boletos em Cobrança Simples", type: "N" },
  { ini: 30, fim: 46, key: "valorSimples", nome: "Valor Total dos Boletos em Cobrança Simples", type: "N", fmt: "valor" },
  { ini: 47, fim: 52, key: "qtdVinculada", nome: "Quantidade de Boletos em Cobrança Vinculada", type: "N" },
  { ini: 53, fim: 69, key: "valorVinculada", nome: "Valor Total em Cobrança Vinculada", type: "N", fmt: "valor" },
  { ini: 70, fim: 75, key: "qtdCaucionada", nome: "Quantidade de Boletos em Cobrança Caucionada", type: "N" },
  { ini: 76, fim: 92, key: "valorCaucionada", nome: "Valor Total em Cobrança Caucionada", type: "N", fmt: "valor" },
  { ini: 93, fim: 98, key: "qtdDescontada", nome: "Quantidade de Boletos em Cobrança Descontada", type: "N" },
  { ini: 99, fim: 115, key: "valorDescontada", nome: "Valor Total em Cobrança Descontada", type: "N", fmt: "valor" },
  { ini: 116, fim: 123, key: "numAviso", nome: "Número do Aviso de Lançamento", type: "A" },
  brancos(124, 240)
];

/* =====================================================================
   Nosso número (nota 15): módulo 11 sobre os dígitos, multiplicadores 2 a 9
   da direita para a esquerda. Exemplos do manual: 3147578 → DV 7
   (31475787) e 4870184 → DV 0 (48701840).
   ===================================================================== */
export { dvNossoNumeroSantander };
export function nossoNumeroComDv(sequencial) {
  const base = String(sequencial).padStart(12, "0").slice(-12);
  return base + dvNossoNumeroSantander(base);
}

/* =====================================================================
   Layout completo — o que o validador e o gerador consomem.
   `segmentos`: qual lista de campos usar para cada detalhe (tipo 3), pela
   letra da posição 14 e, quando preciso, pelo discriminador (S: posição 18;
   Y: posições 18–19).
   ===================================================================== */
export const santander240 = {
  code: BANCO,
  nome: "Santander — cobrança",
  tamanho: 240,
  tiposRegistro: TIPO_REGISTRO,
  // Nota 37: a quantidade de registros do lote tem de fechar exatamente; o erro rejeita o lote inteiro.
  qtdRegistrosLoteExato: true,
  remessa: {
    headerArquivo: R_HEADER_ARQUIVO,
    headerLote: R_HEADER_LOTE,
    trailerLote: R_TRAILER_LOTE,
    trailerArquivo: TRAILER_ARQUIVO,
    segmentos: { P: R_SEG_P, Q: R_SEG_Q, R: R_SEG_R, S1: R_SEG_S1, S2: R_SEG_S2, Y03: R_SEG_Y03, Y53: R_SEG_Y53 },
    regras: regrasSantander.remessa,
    pares: { P: { proximo: "Q", nivel: "aviso", quandoMovimento: ["01"] } },   // nota 13: Q obrigatório só na entrada de boletos novos
    obrigatorios: ["P", "Q"],           // nota 13: P sempre; Q na entrada de boletos novos
    movimentos: MOVIMENTO_REMESSA,
    // Campos pedidos no formulário do gerador, por registro.
    formulario: {
      arquivo: ["tipoInscricao", "numInscricao", "codTransmissao", "nomeEmpresa", "dataGeracao", "seqArquivo"],
      lote: ["lote", "tipoInscricao", "numInscricao", "codTransmissao", "nomeBeneficiario", "mensagem1", "mensagem2", "numRemessa", "dataGravacao"],
      titulo: {
        P: ["codMovimento", "agencia", "dvAgencia", "conta", "dvConta", "nossoNumero", "tipoCobranca", "formaCadastramento", "tipoDocumento",
          "seuNumero", "dataVencimento", "valorNominal", "especie", "dataEmissao", "codJuros", "dataJuros", "valorJuros",
          "codDesconto", "dataDesconto", "valorDesconto", "valorAbatimento", "idBoletoEmpresa", "codProtesto", "diasProtesto", "codBaixa", "diasBaixa"],
        Q: ["tipoInscPagador", "numInscPagador", "nomePagador", "enderecoPagador", "bairroPagador", "cepPagador", "sufixoCep", "cidadePagador", "ufPagador",
          "tipoInscBenefFinal", "numInscBenefFinal", "nomeBenefFinal"]
      }
    }
  },
  retorno: {
    headerArquivo: T_HEADER_ARQUIVO,
    headerLote: T_HEADER_LOTE,
    trailerLote: T_TRAILER_LOTE,
    trailerArquivo: TRAILER_ARQUIVO,
    segmentos: { T: T_SEG_T, U: T_SEG_U, Y03: T_SEG_Y03, Y04: T_SEG_Y04 },
    regras: regrasSantander.retorno,
    pares: { T: { proximo: "U", nivel: "erro" } },   // nota 13 / estrutura do arquivo: T e U obrigatórios no retorno
    obrigatorios: ["T", "U"],
    movimentos: MOVIMENTO_RETORNO,
    formulario: {
      arquivo: ["tipoInscricao", "numInscricao", "agencia", "dvAgencia", "conta", "dvConta", "codBeneficiario", "nomeEmpresa", "dataGeracao", "seqArquivo"],
      lote: ["lote", "tipoInscricao", "numInscricao", "codBeneficiario", "agencia", "dvAgencia", "conta", "dvConta", "nomeEmpresa", "numRetorno", "dataGravacao"],
      titulo: {
        T: ["codMovimento", "agencia", "dvAgencia", "conta", "dvConta", "nossoNumero", "seuNumero", "dataVencimento", "valorNominal",
          "tipoInscPagador", "numInscPagador", "nomePagador", "valorTarifa"],
        U: ["valorPago", "valorLiquido", "dataOcorrencia", "dataCredito", "jurosMultaEncargos", "valorDesconto", "valorAbatimento", "valorIof"]
      }
    }
  }
};
