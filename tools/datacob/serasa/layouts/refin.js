/* =====================================================================
   Serasa REFIN - layout posicional de 600 posicoes (SERASA-CONVEM01)

   O segundo layout de negativacao usado pelo DataCob, informado por
   instituicao financeira. ATENCAO: as fontes recebidas (planilha de
   validacao + amostra) trazem o layout campo a campo, mas NAO explicam o
   que a sigla REFIN significa - por isso nao afirmamos uma expansao dela
   aqui nem na UI. O que e fato conferido: o identificador do arquivo e
   SERASA-CONVEM01 e o layout difere do PEFIN nos pontos listados abaixo.

   FONTE: planilha "Validacao do Layout Serasa - REFIN.xlsx", com layout
   campo a campo e amostra real de 600 caracteres. Os 48 campos batem
   byte a byte com a amostra, sem buraco entre 1 e 600.

   DIFERENCAS QUE IMPORTAM em relacao ao PEFIN (nao sao o mesmo arquivo):
   - identificacao fica em 19-33, e nao em 105-119;
   - o VALOR vem com virgula ("000000003533,77", campo alfanumerico), e
     nao numerico com 2 decimais implicitas como no PEFIN - por isso o
     fmt "valorVirgula";
   - o motivo da baixa fica em 443-444, e nao em 49-50;
   - sao 15 codigos de erro (45 posicoes) contra 20 (60 posicoes).

   ATENCAO: a descricao do campo 4 na planilha diz "SERASA-CONVEM04",
   mas a amostra real do proprio arquivo diz "SERASA-CONVEM01". Vale o
   real - mesma regra firmada no CNAB (arquivo real > planilha > manual).
   ===================================================================== */

"use strict";

const HEADER_FIELDS = [
  { ini: 1, fim: 1, key: "idRegistro", nome: "Tipo do registro", type: "N", fixo: "0" },
  { ini: 2, fim: 10, key: "cnpjInformante", nome: "CNPJ da instituição informante", type: "N", exemplo: "123456789" },
  { ini: 11, fim: 18, key: "dataMovimento", nome: "Data do movimento", type: "N", fmt: "data8", exemplo: "2026-09-15" },
  { ini: 19, fim: 33, key: "idArquivo", nome: "Identificação do arquivo", type: "A", fixo: "SERASA-CONVEM01", ajuda: "Identificacao fixa do layout. E por este campo que a ferramenta reconhece se o arquivo e PEFIN ou REFIN." },
  { ini: 34, fim: 39, key: "numRemessa", nome: "Número da remessa", type: "N", exemplo: "1" },
  { ini: 40, fim: 40, key: "codEnvio", nome: "Código de envio", type: "A", exemplo: "E", ajuda: "E = Entrada (voce envia), R = Retorno (Serasa devolve), I = Informacional." },
  { ini: 41, fim: 44, key: "areaInformante", nome: "Área informante", type: "A", exemplo: "0001" },
  { ini: 45, fim: 548, key: "brancos8", nome: "Brancos", type: "A" },
  { ini: 549, fim: 593, key: "codigosErro", nome: "Códigos de erro", type: "A", ajuda: "Preenchido pela Serasa no arquivo de retorno. Vazio = registro aceito. Na entrada, vai em branco." },
  { ini: 594, fim: 600, key: "seqRegistro", nome: "Sequência do registro", type: "A", ajuda: "Sequencial da linha no arquivo. Header = 1; o trailer fecha com o total de linhas." },
];

const DETALHE_FIELDS = [
  { ini: 1, fim: 1, key: "idRegistro", nome: "Tipo do registro", type: "N", fixo: "1" },
  { ini: 2, fim: 2, key: "operacao", nome: "Código da operação", type: "A", exemplo: "I", ajuda: "I = inclusao (negativar), E = exclusao (retirar), C = condicao especial (so mensagem, base inalterada)." },
  { ini: 3, fim: 8, key: "filialDigito", nome: "Filial + dígito do CNPJ", type: "N", exemplo: "000199" },
  { ini: 9, fim: 16, key: "dataOcorrencia", nome: "Data da ocorrência (vencimento)", type: "N", fmt: "data8", exemplo: "2026-03-10", ajuda: "Data de vencimento da divida. Nao pode passar de 4 anos e 11 meses (1471 dias de atraso)." },
  { ini: 17, fim: 19, key: "naturezaOperacao", nome: "Natureza da operação", type: "A", exemplo: "AG" },
  { ini: 20, fim: 23, key: "pracaEmbratel", nome: "Praça Embratel", type: "A" },
  { ini: 24, fim: 24, key: "tipoPessoa", nome: "Tipo de pessoa", type: "A", exemplo: "F" },
  { ini: 25, fim: 39, key: "doc1", nome: "1º documento (CPF/CNPJ)", type: "A", exemplo: "11122233396" },
  { ini: 40, fim: 54, key: "rgPrincipal", nome: "RG do principal", type: "A" },
  { ini: 55, fim: 56, key: "ufRg", nome: "UF do RG", type: "A" },
  { ini: 57, fim: 57, key: "coobTipoPessoa", nome: "Coobrigado: tipo de pessoa", type: "A" },
  { ini: 58, fim: 72, key: "coobDoc1", nome: "Coobrigado: documento", type: "A" },
  { ini: 73, fim: 87, key: "coobRg", nome: "Coobrigado: RG", type: "A" },
  { ini: 88, fim: 89, key: "coobUfRg", nome: "Coobrigado: UF do RG", type: "A" },
  { ini: 90, fim: 159, key: "nomeDevedor", nome: "Nome do devedor", type: "A", exemplo: "CLIENTE EXEMPLO DA SILVA" },
  { ini: 160, fim: 167, key: "dataNascimento", nome: "Data de nascimento", type: "N", fmt: "data8" },
  { ini: 168, fim: 237, key: "nomePai", nome: "Nome do pai", type: "A" },
  { ini: 238, fim: 307, key: "nomeMae", nome: "Nome da mãe", type: "A" },
  { ini: 308, fim: 352, key: "endereco", nome: "Endereço", type: "A", exemplo: "RUA DAS FLORES, 100" },
  { ini: 353, fim: 372, key: "bairro", nome: "Bairro", type: "A", exemplo: "CENTRO" },
  { ini: 373, fim: 397, key: "municipio", nome: "Município", type: "A", exemplo: "SAO PAULO" },
  { ini: 398, fim: 399, key: "uf", nome: "UF", type: "A", exemplo: "SP" },
  { ini: 400, fim: 407, key: "cep", nome: "CEP", type: "N", exemplo: "01001000" },
  { ini: 408, fim: 422, key: "valor", nome: "Valor da dívida", type: "A", fmt: "valorVirgula", exemplo: "1234.56", ajuda: "Valor da divida com 2 decimais." },
  { ini: 423, fim: 442, key: "chaveInstituicao", nome: "Chave da instituição (contrato)", type: "A", exemplo: "CTR-0001" },
  { ini: 443, fim: 444, key: "motivoBaixa", nome: "Motivo da baixa", type: "A", exemplo: "01", ajuda: "Obrigatorio quando a operacao e E (exclusao). Ver MOTIVOS_BAIXA." },
  { ini: 445, fim: 469, key: "complementoEndereco", nome: "Complemento do endereço", type: "A" },
  { ini: 470, fim: 473, key: "dddDevedor", nome: "DDD do devedor", type: "A", exemplo: "11" },
  { ini: 474, fim: 482, key: "telefoneDevedor", nome: "Telefone do devedor", type: "A", exemplo: "988887777" },
  { ini: 483, fim: 490, key: "dataCompromisso", nome: "Data do compromisso", type: "A", exemplo: "2026-03-10" },
  { ini: 491, fim: 505, key: "valorCompromisso", nome: "Valor do compromisso", type: "A", exemplo: "1234.56" },
  { ini: 506, fim: 548, key: "brancos32", nome: "Brancos", type: "A" },
  { ini: 549, fim: 593, key: "codigosErro", nome: "Códigos de erro", type: "A", ajuda: "Preenchido pela Serasa no arquivo de retorno. Vazio = registro aceito. Na entrada, vai em branco." },
  { ini: 594, fim: 600, key: "seqRegistro", nome: "Sequência do registro", type: "A", ajuda: "Sequencial da linha no arquivo. Header = 1; o trailer fecha com o total de linhas." },
];

const TRAILER_FIELDS = [
  { ini: 1, fim: 1, key: "idRegistro", nome: "Tipo do registro", type: "N", fixo: "9" },
  { ini: 2, fim: 548, key: "brancos2", nome: "Brancos", type: "A" },
  { ini: 549, fim: 593, key: "codigosErro", nome: "Códigos de erro", type: "A", ajuda: "Preenchido pela Serasa no arquivo de retorno. Vazio = registro aceito. Na entrada, vai em branco." },
  { ini: 594, fim: 600, key: "seqRegistro", nome: "Sequência do registro", type: "N", ajuda: "Sequencial da linha no arquivo. Header = 1; o trailer fecha com o total de linhas." },
];

export const REFIN = {
  code: "refin",
  // As fontes recebidas (planilha de validacao) nao explicam a sigla, so
  // dao o layout. Por isso o nome fica pelo identificador do arquivo, que
  // e fato conferido, em vez de uma expansao adivinhada da sigla.
  nome: "REFIN (SERASA-CONVEM01)",
  identificador: "SERASA-CONVEM01",
  deteccao: { ini: 19, fim: 33 },
  descricao: "Anotacao Serasa no layout REFIN, informada por instituicao financeira.",
  tamanhoRegistro: 600,
  headerFields: HEADER_FIELDS,
  detalheFields: DETALHE_FIELDS,
  trailerFields: TRAILER_FIELDS,
  formFields: {
    header: ["cnpjInformante", "dataMovimento", "numRemessa", "codEnvio", "areaInformante"],
    detalhe: ["operacao", "dataOcorrencia", "naturezaOperacao", "tipoPessoa", "doc1",
              "nomeDevedor", "endereco", "bairro", "municipio", "uf", "cep", "valor",
              "chaveInstituicao", "motivoBaixa"]
  }
};
