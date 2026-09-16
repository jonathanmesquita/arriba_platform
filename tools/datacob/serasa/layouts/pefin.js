/* =====================================================================
   Serasa PEFIN - layout posicional de 600 posicoes (SERASA-CONVEM04)

   PEFIN = Pendencia Financeira: divida vencida e nao paga, registrada
   pelo credor. E o layout de negativacao mais usado.

   FONTE: planilha "Validacao do Layout Serasa - PEFIN.xlsx", que traz o
   layout campo a campo E uma linha-amostra real de 600 caracteres para
   cada registro. Os 64 campos foram conferidos byte a byte contra essa
   amostra: zero divergencia e zero buraco entre a posicao 1 e a 600.

   As posicoes sao 1-indexadas e inclusivas, como no CNAB - o engine.js
   cuida do ajuste para slice(). Ver o comentario no topo daquele arquivo.

   LGPD: a amostra da planilha tem nome, CPF, RG, endereco e telefone
   reais. Nada disso esta aqui: os `exemplo` sao ficticios, escritos a
   mao, no mesmo criterio do sandbox SQL.
   ===================================================================== */

"use strict";

const HEADER_FIELDS = [
  { ini: 1, fim: 1, key: "idRegistro", nome: "Tipo do registro", type: "N", fixo: "0" },
  { ini: 2, fim: 10, key: "cnpjInformante", nome: "CNPJ da instituição informante", type: "N", exemplo: "123456789" },
  { ini: 11, fim: 18, key: "dataMovimento", nome: "Data do movimento", type: "N", fmt: "data8", exemplo: "2026-09-15" },
  { ini: 19, fim: 22, key: "dddContato", nome: "DDD do contato", type: "N", exemplo: "11" },
  { ini: 23, fim: 30, key: "telefoneContato", nome: "Telefone do contato", type: "N", exemplo: "40041234" },
  { ini: 31, fim: 34, key: "ramalContato", nome: "Ramal do contato", type: "N", exemplo: "0000" },
  { ini: 35, fim: 104, key: "nomeContato", nome: "Nome do contato", type: "A", exemplo: "EQUIPE DE COBRANCA" },
  { ini: 105, fim: 119, key: "idArquivo", nome: "Identificação do arquivo", type: "A", fixo: "SERASA-CONVEM04", ajuda: "Identificacao fixa do layout. E por este campo que a ferramenta reconhece se o arquivo e PEFIN ou REFIN." },
  { ini: 120, fim: 125, key: "numRemessa", nome: "Número da remessa", type: "N", exemplo: "1" },
  { ini: 126, fim: 126, key: "codEnvio", nome: "Código de envio", type: "A", exemplo: "E", ajuda: "E = Entrada (voce envia), R = Retorno (Serasa devolve), I = Informacional." },
  { ini: 127, fim: 130, key: "diferencialRemessa", nome: "Diferencial de remessa", type: "A" },
  { ini: 131, fim: 133, key: "brancos12", nome: "Brancos", type: "A" },
  { ini: 134, fim: 141, key: "logonSerasa", nome: "Logon Serasa", type: "A", exemplo: "12345678" },
  { ini: 142, fim: 533, key: "brancos14", nome: "Brancos", type: "A" },
  { ini: 534, fim: 593, key: "codigosErro", nome: "Códigos de erro", type: "A", ajuda: "Preenchido pela Serasa no arquivo de retorno. Vazio = registro aceito. Na entrada, vai em branco." },
  { ini: 594, fim: 600, key: "seqRegistro", nome: "Sequência do registro", type: "N", ajuda: "Sequencial da linha no arquivo. Header = 1; o trailer fecha com o total de linhas." },
];

const DETALHE_FIELDS = [
  { ini: 1, fim: 1, key: "idRegistro", nome: "Tipo do registro", type: "N", fixo: "1" },
  { ini: 2, fim: 2, key: "operacao", nome: "Código da operação", type: "A", exemplo: "I", ajuda: "I = inclusao (negativar), E = exclusao (retirar), C = condicao especial (so mensagem, base inalterada)." },
  { ini: 3, fim: 8, key: "filialDigito", nome: "Filial + dígito do CNPJ", type: "N", exemplo: "000199" },
  { ini: 9, fim: 16, key: "dataOcorrencia", nome: "Data da ocorrência (vencimento)", type: "N", fmt: "data8", exemplo: "2026-03-10", ajuda: "Data de vencimento da divida. Nao pode passar de 4 anos e 11 meses (1471 dias de atraso)." },
  { ini: 17, fim: 24, key: "dataTerminoContrato", nome: "Data de término do contrato", type: "N", fmt: "data8", exemplo: "2026-03-10" },
  { ini: 25, fim: 27, key: "naturezaOperacao", nome: "Natureza da operação", type: "A", exemplo: "AG" },
  { ini: 28, fim: 31, key: "pracaEmbratel", nome: "Praça Embratel", type: "A" },
  { ini: 32, fim: 32, key: "tipoPessoa", nome: "Tipo de pessoa", type: "A", exemplo: "F" },
  { ini: 33, fim: 33, key: "tipoDoc1", nome: "Tipo do 1º documento", type: "A", exemplo: "2" },
  { ini: 34, fim: 48, key: "doc1", nome: "1º documento (CPF/CNPJ)", type: "N", exemplo: "11122233396" },
  { ini: 49, fim: 50, key: "motivoBaixa", nome: "Motivo da baixa", type: "A", exemplo: "01", ajuda: "Obrigatorio quando a operacao e E (exclusao). Ver MOTIVOS_BAIXA." },
  { ini: 51, fim: 51, key: "tipoDoc2", nome: "Tipo do 2º documento", type: "A" },
  { ini: 52, fim: 66, key: "doc2", nome: "2º documento (RG)", type: "A" },
  { ini: 67, fim: 68, key: "ufDoc2", nome: "UF do RG", type: "A" },
  { ini: 69, fim: 69, key: "coobTipoPessoa", nome: "Coobrigado: tipo de pessoa", type: "A" },
  { ini: 70, fim: 70, key: "coobTipoDoc1", nome: "Coobrigado: tipo do 1º documento", type: "A" },
  { ini: 71, fim: 85, key: "coobDoc1", nome: "Coobrigado: documento", type: "A" },
  { ini: 86, fim: 87, key: "espacos18", nome: "Espaços", type: "A" },
  { ini: 88, fim: 88, key: "coobTipoDoc2", nome: "Coobrigado: tipo do 2º documento", type: "A" },
  { ini: 89, fim: 103, key: "coobDoc2", nome: "Coobrigado: RG", type: "A" },
  { ini: 104, fim: 105, key: "coobUfDoc2", nome: "Coobrigado: UF do RG", type: "A" },
  { ini: 106, fim: 175, key: "nomeDevedor", nome: "Nome do devedor", type: "A", exemplo: "CLIENTE EXEMPLO DA SILVA" },
  { ini: 176, fim: 183, key: "dataNascimento", nome: "Data de nascimento", type: "N", fmt: "data8" },
  { ini: 184, fim: 253, key: "nomePai", nome: "Nome do pai", type: "A" },
  { ini: 254, fim: 323, key: "nomeMae", nome: "Nome da mãe", type: "A" },
  { ini: 324, fim: 368, key: "endereco", nome: "Endereço", type: "A", exemplo: "RUA DAS FLORES, 100" },
  { ini: 369, fim: 388, key: "bairro", nome: "Bairro", type: "A", exemplo: "CENTRO" },
  { ini: 389, fim: 413, key: "municipio", nome: "Município", type: "A", exemplo: "SAO PAULO" },
  { ini: 414, fim: 415, key: "uf", nome: "UF", type: "A", exemplo: "SP" },
  { ini: 416, fim: 423, key: "cep", nome: "CEP", type: "N", exemplo: "01001000" },
  { ini: 424, fim: 438, key: "valor", nome: "Valor da dívida", type: "N", fmt: "valor", exemplo: "1234.56", ajuda: "Valor da divida com 2 decimais." },
  { ini: 439, fim: 454, key: "numeroContrato", nome: "Número do contrato", type: "A", exemplo: "CTR-0001" },
  { ini: 455, fim: 463, key: "nossoNumero", nome: "Nosso número", type: "N" },
  { ini: 464, fim: 488, key: "complementoEndereco", nome: "Complemento do endereço", type: "A" },
  { ini: 489, fim: 492, key: "dddDevedor", nome: "DDD do devedor", type: "N", exemplo: "11" },
  { ini: 493, fim: 501, key: "telefoneDevedor", nome: "Telefone do devedor", type: "N", exemplo: "988887777" },
  { ini: 502, fim: 509, key: "dataCompromisso", nome: "Data do compromisso", type: "N", fmt: "data8", exemplo: "2026-03-10" },
  { ini: 510, fim: 524, key: "valorCompromisso", nome: "Valor do compromisso", type: "N", fmt: "valor", exemplo: "1234.56" },
  { ini: 525, fim: 525, key: "indicadorSms", nome: "Indicador de SMS", type: "A", exemplo: "N" },
  { ini: 526, fim: 530, key: "brancos40", nome: "Brancos", type: "A" },
  { ini: 531, fim: 531, key: "tipoComunicado", nome: "Tipo de comunicado", type: "A" },
  { ini: 532, fim: 532, key: "brancos42", nome: "Brancos", type: "A" },
  { ini: 533, fim: 533, key: "brancos43", nome: "Brancos", type: "A" },
  { ini: 534, fim: 593, key: "codigosErro", nome: "Códigos de erro", type: "A", ajuda: "Preenchido pela Serasa no arquivo de retorno. Vazio = registro aceito. Na entrada, vai em branco." },
  { ini: 594, fim: 600, key: "seqRegistro", nome: "Sequência do registro", type: "N", ajuda: "Sequencial da linha no arquivo. Header = 1; o trailer fecha com o total de linhas." },
];

const TRAILER_FIELDS = [
  { ini: 1, fim: 1, key: "idRegistro", nome: "Tipo do registro", type: "N", fixo: "9" },
  { ini: 2, fim: 593, key: "brancos2", nome: "Brancos", type: "A" },
  { ini: 594, fim: 600, key: "seqRegistro", nome: "Sequência do registro", type: "N", ajuda: "Sequencial da linha no arquivo. Header = 1; o trailer fecha com o total de linhas." },
];

/* ---------------------------------------------------------------------
   Config consumido pelo engine.js (o mesmo do CNAB 400).
   `tamanhoRegistro: 600` e o unico ajuste que o motor precisa saber.
   --------------------------------------------------------------------- */
export const PEFIN = {
  code: "pefin",
  nome: "PEFIN (Pendencia Financeira)",
  identificador: "SERASA-CONVEM04",
  // Onde procurar o identificador para reconhecer o layout do arquivo.
  deteccao: { ini: 105, fim: 119 },
  descricao: "Divida vencida e nao paga, registrada pelo credor.",
  tamanhoRegistro: 600,
  headerFields: HEADER_FIELDS,
  detalheFields: DETALHE_FIELDS,
  trailerFields: TRAILER_FIELDS,
  // O trailer do Serasa nao declara quantidade nem valor (so tipo de
  // registro, brancos e sequencia), entao nao ha o que conferir aqui -
  // ao contrario do CNAB. Deixar sem `trailerConferencia` evita aviso falso.
  formFields: {
    header: ["cnpjInformante", "dataMovimento", "numRemessa", "codEnvio", "logonSerasa", "nomeContato"],
    detalhe: ["operacao", "dataOcorrencia", "naturezaOperacao", "tipoPessoa", "tipoDoc1", "doc1",
              "nomeDevedor", "endereco", "bairro", "municipio", "uf", "cep", "valor",
              "numeroContrato", "motivoBaixa"]
  }
};
