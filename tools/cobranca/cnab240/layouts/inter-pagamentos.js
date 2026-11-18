/* =====================================================================
   CNAB 240 — Inter (077), PAGAMENTOS | declaração dos layouts

   FONTE ÚNICA: "Manual CNAB240 Pagamentos", versão 1.10 de 23/08/2024
   (Inter Empresas), enviado pelo dono do projeto. Header e trailer de arquivo,
   header e trailer de lote, segmentos A e B (TED e Pix), J, J-52 e J-52 Pix
   (boletos e QR Code Pix) e O (tributos com código de barras) e as notas 01,
   02, 03, 04 e 05 vêm dele. Sem arquivo real: a prova é a cobertura das 240
   posições de cada registro (teste) e a ida e volta (gerar → ler).

   DIFERENÇA PARA O SANTANDER: o arquivo tem lotes de TIPOS diferentes, e o
   conteúdo de um segmento depende do tipo do lote — o segmento A de TED e o de
   Pix têm campos diferentes. O tipo vem da FORMA DE LANÇAMENTO do header de
   lote (posições 12–13, nota 02):
       01 crédito em conta, 03 TED ............ lote "ted"      (A, B)
       45 transferência por Pix ................ lote "pix"      (A, B)
       30 / 31 títulos do próprio / de outros bancos ... "cobranca" (J, J-52)
       47 Pix QR Code .......................... lote "qr"       (J, J-52, J-52 Pix)
       11 / 80 / 81 contas e tributos .......... lote "tributos" (O)
   `inter240.remessa.lotes` guarda cada tipo e `loteDaForma` faz a ligação;
   `variantePagamento()` devolve um layout de UM tipo, para o gerador.

   NÃO CONFIRMADO / LIMITES (também em tasks/backlog.md):
   - Retorno: o manual só descreve "Remessa/Retorno" com os mesmos segmentos; o
     código de remessa do header de arquivo (posição 143) só é definido como "1".
     No retorno ele não é conferido.
   - Segmento C (opcional na TED/crédito em conta) é citado, mas o layout dele
     não está no manual: é lido como "segmento não descrito" (aviso).
   - Formas 80 e 81 (ISS) aparecem na nota 02; o manual não traz segmento próprio e
     elas foram ligadas ao lote de tributos (segmento O) — a conferir com o banco.
   - Dígito verificador do código de barras (boleto e concessionária): não está
     no manual, não é conferido.
   - No Pix, os campos do favorecido do segmento A só valem com forma de iniciação
     "05" (dados bancários), que está no segmento B; a regra entre os dois
     registros não é conferida (só a do próprio segmento B).
   - Os campos de ocorrência (231–240) trazem códigos de 2 caracteres da nota 05,
     conferidos como lista (aviso para código fora da tabela).
   ===================================================================== */

"use strict";

import { documentoValido } from "../../../../assets/js/validar-documentos.js";

const BANCO = "077";

const brancos = (ini, fim, key = `brancos${ini}`) => ({ ini, fim, key, nome: "Campo em branco", type: "A" });
const banco = { ini: 1, fim: 3, key: "banco", nome: "Código do Banco na Compensação", type: "N", fixo: BANCO };
const lote = { ini: 4, fim: 7, key: "lote", nome: "Lote de Serviço", type: "N" };
const tipo = (v) => ({ ini: 8, fim: 8, key: "tipoRegistro", nome: "Tipo de Registro", type: "N", fixo: v });
const seq = { ini: 9, fim: 13, key: "seqRegistro", nome: "Nº Sequencial do Registro no Lote", type: "N" };
const segmento = (letra) => ({ ini: 14, fim: 14, key: "segmento", nome: "Código de Segmento do Registro Detalhe", type: "A", fixo: letra });

/* ----- tabelas do manual ----- */
const TIPOS_SERVICO = {   // nota 01
  "01": "Cobrança", "03": "Boleto de pagamento eletrônico", "04": "Conciliação bancária", "05": "Débitos", "06": "Custódia de cheques",
  "07": "Gestão de caixa", "08": "Consulta/informação margem", "09": "Averbação da consignação/retenção", "10": "Pagamento de dividendos",
  "11": "Manutenção da consignação", "12": "Consignação de parcelas", "13": "Glosa da consignação (INSS)", "14": "Consulta de tributos a pagar",
  "20": "Pagamento a fornecedor", "22": "Pagamento de contas, tributos e impostos", "23": "Interoperabilidade entre contas de instituições de pagamentos",
  "25": "Compror", "26": "Comprar rotativo", "29": "Alegação do pagador", "30": "Pagamento de salários", "32": "Pagamento de honorários",
  "33": "Pagamento de bolsa auxílio", "34": "Pagamento de prebenda (remuneração a padres e sacerdotes)", "40": "Vendor", "41": "Vendor a termo",
  "50": "Pagamento de sinistros segurados", "60": "Pagamento de despesas de viajante em trânsito", "70": "Pagamento autorizado",
  "75": "Pagamento de credenciados", "77": "Pagamento de remuneração", "80": "Pagamento a representantes/vendedores autorizados",
  "90": "Pagamento de benefícios", "98": "Pagamentos diversos"
};

const FORMAS_LANCAMENTO = {   // nota 02
  "01": "Crédito em conta", "03": "TED", "11": "Pagamento de contas e tributos com código de barras",
  "30": "Liquidação de títulos do próprio banco", "31": "Pagamento de títulos de outros bancos", "45": "Transferência por Pix",
  "47": "Pix QR Code", "80": "Pagamento de tributos municipais ISS - LCP 157 - próprio banco (com código de barras)",
  "81": "Pagamento de tributos municipais ISS - LCP 157 - outros bancos (com código de barras)"
};

const LOTE_DA_FORMA = { "01": "ted", "03": "ted", "45": "pix", "30": "cobranca", "31": "cobranca", "47": "qr", "11": "tributos", "80": "tributos", "81": "tributos" };

const FORMAS_INICIACAO = ["01", "02", "03", "04", "05"];   // nota 02

const OCORRENCIAS = {   // nota 05
  "00": "Crédito ou débito efetivado", "02": "Crédito ou débito cancelado pelo pagador/credor", "AR": "Valor do lançamento inválido",
  "AG": "Agência/conta corrente/DV inválido", "ZI": "Beneficiário divergente", "AP": "Data de lançamento inválido",
  "HF": "Conta corrente da empresa com saldo insuficiente", "AB": "Tipo de operação inválido", "AC": "Tipo de serviço inválido",
  "HA": "Lote não aceito", "BD": "Inclusão efetuada com sucesso", "PA": "Pix não efetivado", "PJ": "Chave não cadastrada no DICT",
  "PM": "Chave de pagamento inválida", "PN": "Chave de pagamento não informada", "PK": "QR Code inválido/vencido",
  "PB": "Transação interrompida devido a erro no PSP do recebedor", "PD": "Tipo incorreto para a conta transacional especificada",
  "PE": "Tipo de transação não é suportado/autorizado na conta transacional especificada", "PH": "Ordem rejeitada pelo PSP do recebedor",
  "AL": "Código do banco favorecido, instituição de pagamento ou depositário inválido", "PG": "CPF/CNPJ do usuário recebedor incorreto",
  "AS": "Aviso ao favorecido - identificação inválida", "ZK": "Boleto já liquidado", "HC": "Convênio com a empresa inexistente/inválido para o contrato",
  "CD": "Código de barras - valor do título inválido", "ZH": "Sistema em contingência - título indexado",
  "PI": "ISPB do PSP do pagador inválido ou inexistente", "HE": "Tipo de serviço inválido para o contrato", "YA": "Título não encontrado"
};

const ocorrenciasRetorno = { ini: 231, fim: 240, key: "ocorrencias", nome: "Códigos das Ocorrências para Retorno", type: "A",
  listaDeCodigos: { tamanho: 2, tabela: OCORRENCIAS }, ajuda: "Preenchido pelo banco no arquivo de retorno: até 5 códigos de 2 caracteres (nota 05)." };

/* =====================================================================
   Header e trailer de arquivo
   ===================================================================== */
function headerArquivo(retorno) {
  return [
    banco, { ini: 4, fim: 7, key: "lote", nome: "Lote de Serviço", type: "N", fixo: "0000" }, tipo("0"),
    brancos(9, 17),
    { ini: 18, fim: 18, key: "tipoDocEmpresa", nome: "Tipo de Documento da Empresa", type: "N", fixo: "2" },
    { ini: 19, fim: 32, key: "numInscricao", nome: "CPF/CNPJ da Empresa", type: "N",
      obrigatorio: true, ajuda: "CNPJ da empresa, 14 dígitos, sem pontuação (o tipo de documento é sempre 2).", exemplo: "11222333000181" },
    brancos(33, 52),
    { ini: 53, fim: 57, key: "agencia", nome: "Agência Mantenedora da Conta", type: "N", fixo: "00001" },
    { ini: 58, fim: 58, key: "dvAgencia", nome: "Dígito Verificador da Agência", type: "A", fixo: "9" },
    { ini: 59, fim: 70, key: "conta", nome: "Número da Conta Corrente da Empresa", type: "N",
      obrigatorio: true, ajuda: "12 posições, zeros à esquerda.", exemplo: "123456789" },
    { ini: 71, fim: 71, key: "dvConta", nome: "Dígito Verificador da Conta", type: "N",
      obrigatorio: true, ajuda: "Obrigatório; 1 posição (o manual diz que não pode ficar em branco).", exemplo: "0" },
    brancos(72, 72),
    { ini: 73, fim: 102, key: "nomeEmpresa", nome: "Nome da Empresa", type: "A",
      obrigatorio: true, ajuda: "Maiúsculas, sem acento; 30 posições.", exemplo: "EMPRESA EXEMPLO LTDA" },
    { ini: 103, fim: 132, key: "nomeBanco", nome: "Nome do Banco", type: "A", fixo: "BANCO INTER" },
    brancos(133, 142),
    retorno
      ? { ini: 143, fim: 143, key: "codRemessa", nome: "Código de Remessa", type: "N", ajuda: "O manual só define 1 (remessa); no retorno não é conferido." }
      : { ini: 143, fim: 143, key: "codRemessa", nome: "Código de Remessa", type: "N", fixo: "1" },
    { ini: 144, fim: 151, key: "dataGeracao", nome: "Data de Geração do Arquivo", type: "N", fmt: "dataDMA",
      obrigatorio: true, ajuda: "DDMMAAAA no arquivo.", exemplo: "2026-11-18" },
    { ini: 152, fim: 157, key: "horaGeracao", nome: "Hora de Geração do Arquivo", type: "N",
      obrigatorio: true, ajuda: "HHMMSS (6 dígitos).", exemplo: "120000" },
    { ini: 158, fim: 163, key: "seqArquivo", nome: "Nº Sequencial do Arquivo", type: "N",
      obrigatorio: true, ajuda: "O mesmo número definido no nome do arquivo (CI240_001_NNNNNN.REM); 6 posições.", exemplo: "1" },
    { ini: 164, fim: 166, key: "versaoLayout", nome: "Nº da Versão do Layout do Arquivo", type: "N", fixo: "107" },
    { ini: 167, fim: 171, key: "densidade", nome: "Densidade de Gravação do Arquivo", type: "N", fixo: "01600" },
    brancos(172, 191), brancos(192, 211), brancos(212, 240)
  ];
}

const TRAILER_ARQUIVO = [
  banco, { ini: 4, fim: 7, key: "lote", nome: "Lote de Serviço", type: "N", fixo: "9999" }, tipo("9"), brancos(9, 17),
  { ini: 18, fim: 23, key: "qtdLotes", nome: "Quantidade de Lotes do Arquivo", type: "N" },
  { ini: 24, fim: 29, key: "qtdRegistros", nome: "Quantidade de Registros do Arquivo", type: "N" },
  brancos(30, 240)
];

/* =====================================================================
   Header e trailer de lote (iguais nos quatro tipos; muda a forma de lançamento)
   ===================================================================== */
function headerLote(formasPermitidas, formaExemplo) {
  return [
    banco, { ...lote, obrigatorio: true, ajuda: "Sequencial do lote no arquivo, iniciando em 0001.", exemplo: "1" }, tipo("1"),
    { ini: 9, fim: 9, key: "tipoOperacao", nome: "Tipo da Operação", type: "A", fixo: "C" },
    { ini: 10, fim: 11, key: "tipoServico", nome: "Tipo do Serviço", type: "N", tabela: TIPOS_SERVICO,
      obrigatorio: true, ajuda: "Código do tipo de serviço (nota 01).", exemplo: "20" },
    { ini: 12, fim: 13, key: "formaLancamento", nome: "Forma de Lançamento", type: "N", opcoes: formasPermitidas,
      obrigatorio: true, ajuda: formasPermitidas.map((f) => `${f} = ${FORMAS_LANCAMENTO[f]}`).join("; ") + " (nota 02).", exemplo: formaExemplo },
    { ini: 14, fim: 16, key: "versaoLote", nome: "Nº da Versão do Layout do Lote", type: "N", fixo: "046" },
    brancos(17, 17),
    { ini: 18, fim: 18, key: "tipoDocEmpresa", nome: "Tipo de Documento da Empresa", type: "N", fixo: "2" },
    { ini: 19, fim: 32, key: "numInscricao", nome: "CPF/CNPJ da Empresa", type: "N", obrigatorio: true, ajuda: "CNPJ da empresa, 14 dígitos.", exemplo: "11222333000181" },
    brancos(33, 52),
    { ini: 53, fim: 57, key: "agencia", nome: "Agência Mantenedora da Conta", type: "N", fixo: "00001" },
    { ini: 58, fim: 58, key: "dvAgencia", nome: "Dígito Verificador da Agência", type: "N", fixo: "9" },
    { ini: 59, fim: 70, key: "conta", nome: "Número da Conta Corrente da Empresa", type: "N", obrigatorio: true, ajuda: "12 posições.", exemplo: "123456789" },
    { ini: 71, fim: 71, key: "dvConta", nome: "Dígito Verificador da Conta", type: "N", obrigatorio: true, ajuda: "Obrigatório.", exemplo: "0" },
    brancos(72, 72),
    { ini: 73, fim: 102, key: "nomeEmpresa", nome: "Nome da Empresa", type: "A", obrigatorio: true, ajuda: "30 posições.", exemplo: "EMPRESA EXEMPLO LTDA" },
    { ini: 103, fim: 142, key: "infoGenerica", nome: "Informação Genérica (opcional)", type: "A", ajuda: "Quando informada, consta em todos os avisos e documentos originados pelos detalhes do lote; 40 posições." },
    { ini: 143, fim: 172, key: "rua", nome: "Nome da Rua, Av., Pça. da Empresa", type: "A", obrigatorio: true, ajuda: "30 posições.", exemplo: "RUA DAS FLORES" },
    { ini: 173, fim: 177, key: "numeroLocal", nome: "Número do Local da Empresa", type: "N", obrigatorio: true, ajuda: "5 posições.", exemplo: "100" },
    { ini: 178, fim: 192, key: "complemento", nome: "Casa, Apto., Sala da Empresa", type: "A", obrigatorio: true, ajuda: "15 posições.", exemplo: "SALA 1" },
    { ini: 193, fim: 212, key: "cidade", nome: "Nome da Cidade da Empresa", type: "A", obrigatorio: true, ajuda: "20 posições.", exemplo: "SAO PAULO" },
    { ini: 213, fim: 217, key: "cep", nome: "CEP da Empresa", type: "N", obrigatorio: true, ajuda: "5 primeiros dígitos.", exemplo: "12345" },
    { ini: 218, fim: 220, key: "complementoCep", nome: "Complemento do CEP", type: "N", obrigatorio: true, ajuda: "3 últimos dígitos.", exemplo: "678" },
    { ini: 221, fim: 222, key: "uf", nome: "Sigla do Estado da Empresa", type: "A", obrigatorio: true, ajuda: "2 posições.", exemplo: "SP" },
    brancos(223, 230),
    ocorrenciasRetorno
  ];
}

const TRAILER_LOTE = [
  banco, lote, tipo("5"), brancos(9, 17),
  { ini: 18, fim: 23, key: "qtdRegistros", nome: "Quantidade de Registros (detalhes) do Lote", type: "N", ajuda: "Incluindo o header e o trailer do lote." },
  { ini: 24, fim: 41, key: "somatoriaValores", nome: "Somatória dos Valores", type: "N", fmt: "valor", ajuda: "Duas casas decimais." },
  { ini: 42, fim: 59, key: "somatoriaMoedas", nome: "Somatória de Quantidade de Moedas", type: "N", ajuda: "Zeros." },
  { ini: 60, fim: 65, key: "numAvisoDebito", nome: "Número do Aviso de Débito", type: "N" },
  brancos(66, 230),
  ocorrenciasRetorno
];

/* =====================================================================
   Segmentos
   ===================================================================== */
const cabeca = (letra) => [banco, lote, tipo("3"), seq, segmento(letra)];
const movimento = [
  { ini: 15, fim: 15, key: "tipoMovimento", nome: "Tipo de Movimento", type: "N", fixo: "0" },
  { ini: 16, fim: 17, key: "instrucaoMovimento", nome: "Código da Instrução para Movimento", type: "N", fixo: "00" }
];

const fav = (ini, fim, key, nome, extra = {}) => ({ ini, fim, key, nome, ...extra });

/* TED / crédito em conta */
const SEG_A_TED = [
  ...cabeca("A"), ...movimento,
  { ini: 18, fim: 20, key: "camara", nome: "Código da Câmara Centralizadora", type: "N", fixo: "000" },
  fav(21, 23, "favBanco", "[Favorecido] Código do Banco", { type: "N", obrigatorio: true, ajuda: "Código de compensação do banco do favorecido; 3 posições.", exemplo: "077" }),
  fav(24, 28, "favAgencia", "[Favorecido] Agência Mantenedora da Conta", { type: "N", obrigatorio: true, ajuda: "5 posições.", exemplo: "00001" }),
  fav(29, 29, "favDvAgencia", "[Favorecido] Dígito Verificador da Agência", { type: "N", obrigatorio: true, ajuda: "Obrigatório.", exemplo: "9" }),
  fav(30, 41, "favConta", "[Favorecido] Número da Conta Corrente", { type: "N", obrigatorio: true, ajuda: "12 posições.", exemplo: "987654321" }),
  fav(42, 42, "favDvConta", "[Favorecido] Dígito Verificador da Conta", { type: "N", obrigatorio: true, ajuda: "Obrigatório.", exemplo: "0" }),
  brancos(43, 43),
  fav(44, 73, "favNome", "[Favorecido] Nome", { type: "A", obrigatorio: true, ajuda: "30 posições.", exemplo: "MARIA APARECIDA DA SILVA" }),
  fav(74, 93, "numDocEmpresa", "Nº do Documento Atribuído pela Empresa", { type: "A", ajuda: "Se não definido, em branco; 20 posições." }),
  fav(94, 101, "dataPagamento", "Data do Pagamento", { type: "N", fmt: "dataDMA", obrigatorio: true, ajuda: "DDMMAAAA no arquivo." }),
  fav(102, 104, "tipoMoeda", "Tipo da Moeda", { type: "A", fixo: "BRL" }),
  fav(105, 119, "qtdMoeda", "Quantidade da Moeda", { type: "N" }),
  fav(120, 134, "valorPagamento", "Valor do Pagamento", { type: "N", fmt: "valor", obrigatorio: true, ajuda: "Duas casas decimais, sem vírgula no arquivo; 15 posições." }),
  fav(135, 154, "numDocBanco", "Nº do Documento Atribuído pelo Banco", { type: "A", ajuda: "Em branco." }),
  fav(155, 162, "dataEfetivacao", "Data Real da Efetivação do Pagamento (retorno)", { type: "N", fmt: "dataDMA", ajuda: "Preenchido pelo banco no retorno." }),
  fav(163, 177, "valorEfetivacao", "Valor Real da Efetivação do Pagamento (retorno)", { type: "N", fmt: "valor", ajuda: "Preenchido pelo banco no retorno." }),
  brancos(178, 199),
  fav(200, 201, "tipoConta", "[Identificação do Pagamento] Tipo de Conta", { type: "N", opcoes: ["01", "02", "03"], obrigatorio: true, ajuda: "01 = conta corrente, 02 = conta pagamento, 03 = conta poupança.", exemplo: "01" }),
  brancos(202, 219),
  fav(220, 224, "finalidadeTed", "Código Finalidade da TED", { type: "N", opcoes: ["00004", "00005", "00010"], obrigatorio: true, ajuda: "00004 = pagamento de salários, 00005 = pagamento de fornecedores, 00010 = crédito em conta.", exemplo: "00005" }),
  brancos(225, 230),
  ocorrenciasRetorno
];

const SEG_B_TED = [
  ...cabeca("B"), brancos(15, 17),
  fav(18, 18, "favTipoDoc", "[Favorecido] Tipo de Documento", { type: "N", opcoes: ["1", "2"], obrigatorio: true, ajuda: "1 = CPF, 2 = CNPJ.", exemplo: "1" }),
  fav(19, 32, "favDoc", "[Favorecido] CPF/CNPJ", { type: "N", obrigatorio: true, ajuda: "Sem pontuação, zeros à esquerda; 14 posições.", exemplo: "52998224725" }),
  fav(33, 67, "favLogradouro", "[Favorecido] Logradouro", { type: "A", obrigatorio: true, ajuda: "35 posições.", exemplo: "RUA DAS PALMEIRAS 50" }),
  fav(68, 72, "favNumero", "[Favorecido] Número do Local", { type: "A", obrigatorio: true, ajuda: "5 posições.", exemplo: "50" }),
  fav(73, 87, "favComplemento", "[Favorecido] Complemento", { type: "A", ajuda: "15 posições." }),
  fav(88, 102, "favBairro", "[Favorecido] Bairro", { type: "A", obrigatorio: true, ajuda: "15 posições.", exemplo: "CENTRO" }),
  fav(103, 117, "favCidade", "[Favorecido] Nome da Cidade", { type: "A", obrigatorio: true, ajuda: "15 posições.", exemplo: "SAO PAULO" }),
  fav(118, 125, "favCep", "[Favorecido] CEP", { type: "N", obrigatorio: true, ajuda: "8 dígitos.", exemplo: "12345678" }),
  fav(126, 127, "favUf", "[Favorecido] Sigla do Estado", { type: "A", obrigatorio: true, ajuda: "2 posições.", exemplo: "SP" }),
  brancos(128, 232),
  fav(233, 240, "favIspb", "[Favorecido] Código ISPB", { type: "N", obrigatorio: true, ajuda: "8 dígitos.", exemplo: "00416968" })
];

/* Pix */
const SEG_A_PIX = [
  ...cabeca("A"), ...movimento,
  { ini: 18, fim: 20, key: "camara", nome: "Código da Câmara Centralizadora", type: "N", fixo: "000" },
  fav(21, 23, "favBanco", "[Favorecido] Código do Banco", { type: "N", ajuda: "Caso a forma de iniciação seja 05 (dados bancários)." }),
  fav(24, 28, "favAgencia", "[Favorecido] Agência Mantenedora da Conta", { type: "N", ajuda: "Caso a forma de iniciação seja 05." }),
  fav(29, 29, "favDvAgencia", "[Favorecido] Dígito Verificador da Agência", { type: "N", ajuda: "Caso a forma de iniciação seja 05." }),
  fav(30, 41, "favConta", "[Favorecido] Número da Conta Corrente", { type: "N", ajuda: "Caso a forma de iniciação seja 05." }),
  fav(42, 42, "favDvConta", "[Favorecido] Dígito Verificador da Conta", { type: "N", ajuda: "Caso a forma de iniciação seja 05." }),
  brancos(43, 43),
  fav(44, 73, "favNome", "[Favorecido] Nome", { type: "A", obrigatorio: true, ajuda: "Nome do favorecido; 30 posições.", exemplo: "MARIA APARECIDA DA SILVA" }),
  fav(74, 93, "numDocEmpresa", "Nº do Documento Atribuído pela Empresa", { type: "A", ajuda: "Se não definido, em branco; 20 posições." }),
  fav(94, 101, "dataPagamento", "Data do Pagamento", { type: "N", fmt: "dataDMA", obrigatorio: true, ajuda: "DDMMAAAA no arquivo." }),
  fav(102, 104, "tipoMoeda", "Tipo da Moeda", { type: "A", fixo: "BRL" }),
  fav(105, 119, "qtdMoeda", "Quantidade da Moeda", { type: "N" }),
  fav(120, 134, "valorPagamento", "Valor do Pagamento", { type: "N", fmt: "valor", obrigatorio: true, ajuda: "Duas casas decimais; 15 posições." }),
  fav(135, 154, "numDocBanco", "Nº do Documento Atribuído pelo Banco", { type: "A", ajuda: "Em branco." }),
  fav(155, 162, "dataEfetivacao", "Data Real da Efetivação do Pagamento (retorno)", { type: "N", fmt: "dataDMA" }),
  fav(163, 177, "valorEfetivacao", "Valor Real da Efetivação do Pagamento (retorno)", { type: "N", fmt: "valor" }),
  fav(178, 191, "favDoc", "[Identificação do Pagamento] Nº do CPF/CNPJ", { type: "N", ajuda: "Caso a forma de iniciação seja 05; CPF com zeros à esquerda; 14 posições." }),
  fav(192, 199, "favIspb", "[Identificação do Pagamento] Código do ISPB", { type: "N", ajuda: "Caso a forma de iniciação seja 05; 8 posições." }),
  fav(200, 201, "tipoConta", "[Identificação do Pagamento] Tipo de Conta", { type: "N", opcoes: ["01", "02", "03"], ajuda: "Caso a forma de iniciação seja 05: 01 corrente, 02 pagamento, 03 poupança." }),
  brancos(202, 230),
  ocorrenciasRetorno
];

const SEG_B_PIX = [
  ...cabeca("B"),
  fav(15, 17, "formaIniciacao", "Forma de Iniciação (tipo de chave)", { type: "A", opcoes: FORMAS_INICIACAO, obrigatorio: true,
    ajuda: "01 = chave Pix telefone, 02 = e-mail, 03 = CPF/CNPJ, 04 = chave aleatória, 05 = dados bancários (nota 02). Campo alfa de 3 posições, alinhado à esquerda: o código de 2 caracteres e um branco.", exemplo: "02" }),
  fav(18, 18, "favTipoDoc", "[Favorecido] Tipo de Documento", { type: "N", opcoes: ["1", "2"], obrigatorio: true, ajuda: "1 = CPF, 2 = CNPJ.", exemplo: "1" }),
  fav(19, 32, "favDoc", "[Favorecido] CPF/CNPJ", { type: "N", ajuda: "Obrigatório na forma de iniciação 03; CPF com zeros à esquerda; 14 posições." }),
  fav(33, 67, "txid", "TX ID (opcional)", { type: "A", ajuda: "Opcional, a definir pelo cliente; 35 posições." }),
  brancos(68, 127),
  fav(128, 226, "chavePix", "Chave Pix (telefone, e-mail ou aleatória)", { type: "A", ajuda: "Nas formas de iniciação 01, 02 e 04; nos demais casos, em branco; 99 posições.", exemplo: "favorecido@exemplo.com.br", exemploPreenche: true }),
  brancos(227, 232),
  fav(233, 240, "favIspb", "[Favorecido] Código ISPB", { type: "N", ajuda: "Obrigatório na forma de iniciação 05; 8 posições." })
];

/* Boletos e QR Code Pix */
const J_COMUM = [...cabeca("J")];
const SEG_J = [
  ...J_COMUM,
  { ini: 15, fim: 15, key: "tipoMovimento", nome: "Tipo de Movimento", type: "N", fixo: "0" },
  { ini: 16, fim: 17, key: "instrucaoMovimento", nome: "Código da Instrução para Movimento", type: "N", fixo: "00" },
  fav(18, 61, "codigoBarras", "Pagamento — Código de Barras", { type: "N", obrigatorio: true, ajuda: "44 dígitos, sem pontuação. O dígito verificador do código não é conferido.", exemplo: "00000000000000000000000000000000000000000000" }),
  fav(62, 91, "nomeBeneficiario", "Pagamento — Nome do Beneficiário", { type: "A", obrigatorio: true, ajuda: "30 posições.", exemplo: "BENEFICIARIO EXEMPLO" }),
  fav(92, 99, "dataVencimento", "Pagamento — Data de Vencimento", { type: "N", fmt: "dataDMA", obrigatorio: true, ajuda: "DDMMAAAA no arquivo." }),
  fav(100, 114, "valorNominal", "Pagamento — Valor Nominal do Título", { type: "N", fmt: "valor", obrigatorio: true, ajuda: "15 posições." }),
  fav(115, 129, "valorDescontoAbatimento", "Pagamento — Valor do Desconto + Abatimento", { type: "N", fmt: "valor" }),
  fav(130, 144, "valorMoraMulta", "Pagamento — Valor da Mora + Multa", { type: "N", fmt: "valor" }),
  fav(145, 152, "dataPagamento", "Pagamento — Data do Pagamento", { type: "N", fmt: "dataDMA", obrigatorio: true, ajuda: "DDMMAAAA no arquivo." }),
  fav(153, 167, "valorPagamento", "Pagamento — Valor do Pagamento", { type: "N", fmt: "valor", obrigatorio: true, ajuda: "15 posições." }),
  fav(168, 182, "qtdMoeda", "Pagamento — Quantidade da Moeda", { type: "N" }),
  fav(183, 202, "referenciaPagador", "Referência do Pagador — Nº do Documento Atribuído pela Empresa", { type: "N", ajuda: "Zeros à esquerda; 20 posições." }),
  fav(203, 222, "nossoNumero", "Nosso Número do Título", { type: "N", ajuda: "Zeros à esquerda; 20 posições." }),
  brancos(223, 230),
  ocorrenciasRetorno
];

const J52_COMUM = [
  ...cabeca("J"), brancos(15, 15, "usoFebraban"),
  { ini: 16, fim: 17, key: "codMovimentoRemessa", nome: "Código de Movimento de Remessa", type: "N", fixo: "00" },
  { ini: 18, fim: 19, key: "idRegistroOpcional", nome: "Identificação do Registro Opcional", type: "N", fixo: "52" },
  { ini: 20, fim: 20, key: "pagadorTipo", nome: "Dados do Pagador — Tipo de Inscrição", type: "N", fixo: "2" },
  fav(21, 35, "pagadorDoc", "Dados do Pagador — Número do Documento", { type: "N", obrigatorio: true, ajuda: "CNPJ, zeros à esquerda; 15 posições.", exemplo: "11222333000181" }),
  fav(36, 75, "pagadorNome", "Dados do Pagador — Nome", { type: "A", obrigatorio: true, ajuda: "40 posições.", exemplo: "EMPRESA EXEMPLO LTDA" }),
  fav(76, 76, "benefTipo", "Dados do Beneficiário — Tipo de Inscrição", { type: "N", opcoes: ["1", "2"], obrigatorio: true, ajuda: "1 = CPF, 2 = CNPJ.", exemplo: "2" }),
  fav(77, 91, "benefDoc", "Dados do Beneficiário — Número do Documento", { type: "N", obrigatorio: true, ajuda: "Zeros à esquerda; 15 posições.", exemplo: "11222333000181" }),
  fav(92, 131, "benefNome", "Dados do Beneficiário — Nome", { type: "A", obrigatorio: true, ajuda: "40 posições.", exemplo: "BENEFICIARIO EXEMPLO" })
];
const SEG_J52 = [
  ...J52_COMUM, brancos(132, 187),
  fav(188, 240, "numDocEmpresa", "Nº do Documento Atribuído pela Empresa", { type: "N", ajuda: "53 posições, zeros à esquerda." })
];
const SEG_J52_PIX = [
  ...J52_COMUM,
  fav(132, 210, "urlChave", "URL/Chave de Endereçamento", { type: "A", obrigatorio: true, ajuda: "URL do QR Code dinâmico ou chave de endereçamento do QR Code estático; 79 posições.", exemplo: "pix.exemplo.com.br/qr/v2/0000000000000000000000000001" }),
  fav(211, 240, "txid", "Código de Identificação do QR Code (TXID)", { type: "A", ajuda: "Opcional; no máximo 30 caracteres." })
];

/* Tributos e contas com código de barras */
const SEG_O = [
  ...cabeca("O"),
  { ini: 15, fim: 15, key: "tipoMovimento", nome: "Tipo de Movimento", type: "N", fixo: "0" },
  { ini: 16, fim: 17, key: "instrucaoMovimento", nome: "Código da Instrução para Movimento", type: "N", fixo: "00" },
  fav(18, 61, "codigoBarras", "Pagamento — Código de Barras", { type: "N", obrigatorio: true, ajuda: "44 dígitos, sem pontuação. O dígito verificador não é conferido.", exemplo: "00000000000000000000000000000000000000000000" }),
  fav(62, 91, "nomeConcessionaria", "Pagamento — Nome da Concessionária", { type: "A", obrigatorio: true, ajuda: "30 posições.", exemplo: "CONCESSIONARIA EXEMPLO" }),
  fav(92, 99, "dataVencimento", "Pagamento — Data de Vencimento", { type: "N", fmt: "dataDMA", obrigatorio: true, ajuda: "DDMMAAAA no arquivo." }),
  fav(100, 107, "dataPagamento", "Pagamento — Data do Pagamento", { type: "N", fmt: "dataDMA", obrigatorio: true, ajuda: "DDMMAAAA no arquivo." }),
  fav(108, 122, "valorPagamento", "Pagamento — Valor do Pagamento", { type: "N", fmt: "valor", obrigatorio: true, ajuda: "15 posições." }),
  fav(123, 142, "seuNumero", "Pagamento — Seu Número", { type: "A", ajuda: "20 posições." }),
  fav(143, 162, "nossoNumero", "Pagamento — Nosso Número", { type: "N", ajuda: "Zeros à esquerda; 20 posições." }),
  brancos(163, 230),
  ocorrenciasRetorno
];

/* =====================================================================
   Regras entre campos
   ===================================================================== */
const vazio = (t) => !String(t ?? "").trim() || /^0+$/.test(String(t).trim());

const REGRAS_B_PIX = [({ campos }) => {
  const forma = String(campos.formaIniciacao).trim();
  const saida = [];
  if (["01", "02", "04"].includes(forma) && !String(campos.chavePix).trim()) {
    saida.push({ nivel: "erro", campo: "chavePix", mensagem: `com forma de iniciação ${forma}, a chave Pix é obrigatória.` });
  }
  if (["03", "05"].includes(forma) && String(campos.chavePix).trim()) {
    saida.push({ nivel: "aviso", campo: "chavePix", mensagem: `com forma de iniciação ${forma}, o manual manda deixar a chave Pix em branco.` });
  }
  if (forma === "03") {
    if (vazio(campos.favDoc)) saida.push({ nivel: "erro", campo: "favDoc", mensagem: "com forma de iniciação 03 (chave CPF/CNPJ), o CPF/CNPJ do favorecido é obrigatório." });
    else if (documentoValido(campos.favTipoDoc, campos.favDoc) === false) saida.push({ nivel: "aviso", campo: "favDoc", mensagem: "o CPF/CNPJ do favorecido não passa na conferência do dígito verificador." });
  }
  if (forma === "05" && vazio(campos.favIspb)) saida.push({ nivel: "erro", campo: "favIspb", mensagem: "com forma de iniciação 05 (dados bancários), o ISPB do favorecido é obrigatório." });
  return saida;
}];

const REGRAS_B_TED = [({ campos }) => !vazio(campos.favDoc) && documentoValido(campos.favTipoDoc, campos.favDoc) === false
  ? [{ nivel: "aviso", campo: "favDoc", mensagem: "o CPF/CNPJ do favorecido não passa na conferência do dígito verificador." }] : []];

const valorZerado = (chave, rotulo) => ({ campos }) => vazio(campos[chave])
  ? [{ nivel: "aviso", campo: chave, mensagem: `${rotulo} zerado: não há pagamento a fazer.` }] : [];

/* =====================================================================
   Tipos de lote
   ===================================================================== */
const porSegmento = (mapa) => (texto) => mapa[texto.charAt(13)] || null;

const LOTES = {
  ted: {
    nome: "TED / crédito em conta", formaExemplo: "03", formas: ["01", "03"],
    segmentos: { A_TED: SEG_A_TED, B_TED: SEG_B_TED },
    resolver: porSegmento({ A: "A_TED", B: "B_TED" }),
    ordem: ["A_TED", "B_TED"], pares: { A_TED: { proximo: "B_TED", nivel: "erro" } },
    regras: { A_TED: [valorZerado("valorPagamento", "o valor do pagamento")], B_TED: REGRAS_B_TED },
    somaCampo: { A_TED: "valorPagamento" },
    formulario: { titulo: {
      A_TED: ["favBanco", "favAgencia", "favDvAgencia", "favConta", "favDvConta", "favNome", "numDocEmpresa", "dataPagamento", "valorPagamento", "tipoConta", "finalidadeTed"],
      B_TED: ["favTipoDoc", "favDoc", "favLogradouro", "favNumero", "favComplemento", "favBairro", "favCidade", "favCep", "favUf", "favIspb"] } }
  },
  pix: {
    nome: "Transferência por Pix", formaExemplo: "45", formas: ["45"],
    segmentos: { A_PIX: SEG_A_PIX, B_PIX: SEG_B_PIX },
    resolver: porSegmento({ A: "A_PIX", B: "B_PIX" }),
    ordem: ["A_PIX", "B_PIX"], pares: { A_PIX: { proximo: "B_PIX", nivel: "erro" } },
    regras: { A_PIX: [valorZerado("valorPagamento", "o valor do pagamento")], B_PIX: REGRAS_B_PIX },
    somaCampo: { A_PIX: "valorPagamento" },
    formulario: { titulo: {
      A_PIX: ["favNome", "numDocEmpresa", "dataPagamento", "valorPagamento"],
      B_PIX: ["formaIniciacao", "favTipoDoc", "favDoc", "chavePix", "txid", "favIspb"] } }
  },
  cobranca: {
    nome: "Pagamento de boletos (código de barras)", formaExemplo: "31", formas: ["30", "31"],
    segmentos: { J: SEG_J, J52: SEG_J52 },
    resolver: (t) => (t.charAt(13) !== "J" ? null : t.slice(17, 19) === "52" ? "J52" : "J"),
    ordem: ["J", "J52"], pares: { J: { proximo: "J52", nivel: "erro" } },
    regras: { J: [valorZerado("valorPagamento", "o valor do pagamento")] },
    somaCampo: { J: "valorPagamento" },
    formulario: { titulo: {
      J: ["codigoBarras", "nomeBeneficiario", "dataVencimento", "valorNominal", "valorDescontoAbatimento", "valorMoraMulta", "dataPagamento", "valorPagamento", "referenciaPagador", "nossoNumero"],
      J52: ["pagadorDoc", "pagadorNome", "benefTipo", "benefDoc", "benefNome", "numDocEmpresa"] } }
  },
  qr: {
    nome: "Pagamento de QR Code Pix", formaExemplo: "47", formas: ["47"],
    segmentos: { J: SEG_J, J52: SEG_J52, J52PIX: SEG_J52_PIX },
    // J-52 e J-52 Pix têm a mesma identificação (52); o Pix traz a URL/chave a partir da posição 132 (no J-52 comum, 132–187 é branco).
    resolver: (t) => (t.charAt(13) !== "J" ? null : t.slice(17, 19) !== "52" ? "J" : (t.slice(131, 187).trim() ? "J52PIX" : "J52")),
    ordem: ["J", "J52", "J52PIX"], pares: { J: { proximo: "J52", nivel: "erro" } },
    regras: { J: [valorZerado("valorPagamento", "o valor do pagamento")] },
    somaCampo: { J: "valorPagamento" },
    formulario: { titulo: {
      J: ["codigoBarras", "nomeBeneficiario", "dataVencimento", "valorNominal", "dataPagamento", "valorPagamento"],
      J52: ["pagadorDoc", "pagadorNome", "benefTipo", "benefDoc", "benefNome"],
      J52PIX: ["pagadorDoc", "pagadorNome", "benefTipo", "benefDoc", "benefNome", "urlChave", "txid"] } }
  },
  tributos: {
    nome: "Pagamento de tributos e contas (código de barras)", formaExemplo: "11", formas: ["11", "80", "81"],
    segmentos: { O: SEG_O },
    resolver: porSegmento({ O: "O" }),
    ordem: ["O"], pares: {},
    regras: { O: [valorZerado("valorPagamento", "o valor do pagamento")] },
    somaCampo: { O: "valorPagamento" },
    formulario: { titulo: { O: ["codigoBarras", "nomeConcessionaria", "dataVencimento", "dataPagamento", "valorPagamento", "seuNumero", "nossoNumero"] } }
  }
};

function direcao(retorno) {
  const base = {
    headerArquivo: headerArquivo(retorno),
    trailerArquivo: TRAILER_ARQUIVO,
    headerLote: headerLote(Object.keys(FORMAS_LANCAMENTO), "03"),
    trailerLote: TRAILER_LOTE,
    lotes: LOTES,
    loteDaForma: LOTE_DA_FORMA,
    movimentos: FORMAS_LANCAMENTO,
    formulario: {
      arquivo: ["numInscricao", "conta", "dvConta", "nomeEmpresa", "dataGeracao", "horaGeracao", "seqArquivo"],
      lote: ["lote", "tipoServico", "formaLancamento", "numInscricao", "conta", "dvConta", "nomeEmpresa", "infoGenerica", "rua", "numeroLocal", "complemento", "cidade", "cep", "complementoCep", "uf"]
    }
  };
  return base;
}

export const inter240 = {
  code: BANCO,
  nome: "Inter — pagamentos",
  tamanho: 240,
  qtdRegistrosLoteExato: true,
  remessa: direcao(false),
  retorno: direcao(true),
  variantes: Object.entries(LOTES).map(([id, l]) => ({ id, nome: l.nome }))
};

/** Layout de UM tipo de lote (para o gerador): junta o arquivo, o header de lote com as formas do tipo e os segmentos do tipo. */
export function variantePagamento(layout, direcaoNome, idLote) {
  const base = layout[direcaoNome];
  const l = base.lotes[idLote];
  const L = {
    headerArquivo: base.headerArquivo,
    trailerArquivo: base.trailerArquivo,
    headerLote: headerLote(l.formas, l.formaExemplo),
    trailerLote: base.trailerLote,
    segmentos: l.segmentos,
    ordem: l.ordem,
    pares: l.pares,
    regras: l.regras,
    somaCampo: l.somaCampo,
    lotes: { [idLote]: l },
    loteDaForma: Object.fromEntries(l.formas.map((f) => [f, idLote])),
    formulario: { arquivo: base.formulario.arquivo, lote: base.formulario.lote, titulo: l.formulario.titulo },
  };
  return { ...layout, nome: `${layout.nome} — ${l.nome}`, remessa: L, retorno: L };
}
