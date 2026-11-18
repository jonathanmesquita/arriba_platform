/* =====================================================================
   CNAB 444 - Banco Paulista (611), FIDC — remessa de cobrança
   Config para o motor genérico (engine.js), com `tamanhoRegistro: 444`.

   FONTE ÚNICA: "FIDC — Troca Eletrônica Padrão — Remessa/Cobrança", junho de
   2019 (documento de 10 páginas, enviado pelo dono do projeto). Header,
   Detalhe tipo 1 (48 itens) e Trailer da remessa vêm dele; o manual cobre
   SÓ a remessa (entrada de títulos e instruções) — não há retorno aqui, e o
   banco não declara `retorno`. Sem arquivo real nem planilha: o que prova o
   layout é a cobertura das 444 posições sem buraco nem sobreposição (teste) e
   a ida e volta (gerar → ler).

   O registro tem 444 posições (os últimos 6 são o sequencial, nas posições
   439–444, e a chave da nota fiscal ocupa 395–438).

   DISCREPÂNCIAS DO PRÓPRIO MANUAL:
   - Itens 13 (nosso número), 14, 16, 17, 19–22: o "tipo" diz 9(n) mas o
     conteúdo diz "Branco"; tratados como branco (A), como o conteúdo manda.
   - Item 18 (data da liquidação) aparece como obrigatório, mas o próprio
     conteúdo diz "somente para liquidação do título": no formulário é
     opcional (zeros).
   - Item 46 (Cedente, 335–394): o manual manda compor nome (335–380) e CNPJ do
     cedente (381–394); declarados como dois campos.
   - Itens 43 e 47 (nota fiscal e chave): "Sim — Duplicata": obrigatórios só
     quando a espécie é 01 (duplicata); a regra está em `regrasDetalhe`.
   ===================================================================== */

"use strict";

const brancos = (ini, fim, key = `brancos${ini}`) => ({ ini, fim, key, nome: "Branco", type: "A" });

const ESPECIES = {
  "01": "Duplicata", "02": "Nota promissória", "06": "Nota promissória física", "07": "Cartolas bancárias",
  "14": "Duplicata de serviço física", "51": "Cheque", "60": "Contrato", "61": "Contrato físico",
  "62": "Confissões de dívida", "64": "Assunção de dívida", "67": "Operações cartão de crédito digital",
  "70": "CCB pré digital", "71": "CCB pré balcão", "72": "CCB pré CETIP"
};

const OCORRENCIAS = {
  "01": "Remessa", "04": "Abatimentos (mediante justificativa)", "06": "Alteração de vencimento (para efeito de conciliação; não altera o vencimento original)",
  "11": "Aquisição de contratos futuros", "12": "Aquisição de baixa de contratos futuros", "14": "Pagamento parcial",
  "22": "Baixa de confissão de dívida", "39": "Aquisições (sem TED)", "40": "Aquisições de contrato futuro (sem TED)",
  "41": "Entrada por recompra (sem TED) — contrapartida obrigatória: 74", "64": "Entradas por assunção de dívida",
  "68": "Baixa de cheque", "70": "Baixa parcial de contrato futuro", "72": "Recompra parcial sem adiantamento",
  "74": "Baixa por recompra, mediante entrada de novo título, com liquidação para o cedente (contrapartida: 84)",
  "75": "Baixa por depósito do cedente", "77": "Baixa por depósito do sacado",
  "84": "Entrada por recompra, troca de títulos (contrapartida obrigatória: 74 no mesmo arquivo)"
};

const HEADER = [
  { ini: 1,   fim: 1,   key: "idRegistro",    nome: "Identificação do Registro",       type: "N", fixo: "0" },
  { ini: 2,   fim: 2,   key: "idArquivo",     nome: "Identificação do Arquivo Remessa", type: "N", fixo: "1" },
  { ini: 3,   fim: 9,   key: "literalRemessa",nome: "Literal Remessa",                 type: "A", fixo: "REMESSA" },
  { ini: 10,  fim: 11,  key: "codServico",    nome: "Código de Serviço",               type: "N", fixo: "01" },
  { ini: 12,  fim: 26,  key: "literalServico",nome: "Literal Serviço",                 type: "A", fixo: "COBRANCA" },
  { ini: 27,  fim: 46,  key: "codOriginador", nome: "Código do Originador (Consultoria)", type: "N",
    obrigatorio: true, ajuda: "Fornecido pelo banco no cadastramento; 20 posições, zeros à esquerda.", exemplo: "12345" },
  { ini: 47,  fim: 76,  key: "nomeOriginador",nome: "Nome do Originador (Consultoria)", type: "A",
    obrigatorio: true, ajuda: "Razão social; maiúsculas, sem acento; 30 posições.", exemplo: "EMPRESA EXEMPLO LTDA" },
  { ini: 77,  fim: 79,  key: "codBanco",      nome: "Número do Banco",                 type: "N", fixo: "611" },
  { ini: 80,  fim: 94,  key: "nomeBanco",     nome: "Nome do Banco",                   type: "A", fixo: "PAULISTA S.A." },
  { ini: 95,  fim: 100, key: "dataGravacao",  nome: "Data da Gravação do Arquivo",     type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data do dia da operação (DDMMAA no arquivo).", exemplo: "2026-11-18" },
  brancos(101, 108),
  { ini: 109, fim: 110, key: "idSistema",     nome: "Identificação do Sistema",        type: "A", fixo: "MX" },
  { ini: 111, fim: 117, key: "seqArquivo",    nome: "Nº Sequencial do Arquivo",        type: "N",
    obrigatorio: true, ajuda: "7 posições.", exemplo: "1" },
  brancos(118, 438),
  { ini: 439, fim: 444, key: "seqRegistro",   nome: "Nº Sequencial do Registro",       type: "N", fixo: "000001" }
];

const DETALHE = [
  { ini: 1,   fim: 1,   key: "idRegistro",    nome: "Identificação do Registro",       type: "N", fixo: "1" },
  brancos(2, 20, "debitoAutomatico"),
  { ini: 21,  fim: 22,  key: "coobrigacao",   nome: "Coobrigação",                     type: "N", opcoes: ["01", "02"],
    obrigatorio: true, ajuda: "01 = com coobrigação, 02 = sem coobrigação.", exemplo: "02" },
  { ini: 23,  fim: 24,  key: "caracteristicaEspecial", nome: "Característica Especial", type: "N", ajuda: "Anexo 8 do layout SRC3040 do Bacen; 2 posições." },
  { ini: 25,  fim: 28,  key: "modalidade",    nome: "Modalidade da Operação",          type: "N", ajuda: "Anexo 3 do SRC3040 (domínio e subdomínio); 4 posições." },
  { ini: 29,  fim: 30,  key: "natureza",      nome: "Natureza da Operação",            type: "N", ajuda: "Anexo 2 do SRC3040; 2 posições." },
  { ini: 31,  fim: 34,  key: "origemRecurso", nome: "Origem do Recurso",               type: "N", ajuda: "Anexo 4 do SRC3040 (domínio e subdomínio); 4 posições." },
  { ini: 35,  fim: 36,  key: "classeRisco",   nome: "Classe de Risco da Operação",     type: "A", ajuda: "Anexo 17 do SRC3040, preenchida da esquerda para a direita; 2 posições." },
  { ini: 37,  fim: 37,  key: "zero37",        nome: "Zeros",                           type: "N" },
  { ini: 38,  fim: 62,  key: "controleParticipante", nome: "Nº de Controle do Participante", type: "A",
    obrigatorio: true, ajuda: "Número de identificação do título na consultoria; deve ser o mesmo informado ao banco cobrador. Esquerda para a direita; 25 posições.", exemplo: "CTRL0000000000000000001" },
  { ini: 63,  fim: 65,  key: "numBanco",      nome: "Número do Banco",                 type: "N", ajuda: "Obrigatório se a espécie for cheque; senão, 000." },
  { ini: 66,  fim: 70,  key: "zeros66",       nome: "Zeros",                           type: "N" },
  brancos(71, 81, "nossoNumero"),
  brancos(82, 82, "digitoNossoNumero"),
  { ini: 83,  fim: 92,  key: "valorPago",     nome: "Valor Pago",                      type: "N", fmt: "valor",
    ajuda: "Valor pago na liquidação/baixa; para pagamento parcial, recompra parcial e baixas (nota do manual); 10 posições, 2 decimais." },
  brancos(93, 93, "condicaoPapeleta"),
  brancos(94, 94, "debitoPapeleta"),
  { ini: 95,  fim: 100, key: "dataLiquidacao",nome: "Data da Liquidação",              type: "N", fmt: "data",
    ajuda: "Somente para liquidação do título (DDMMAA)." },
  brancos(101, 104, "idOperacaoBanco"),
  brancos(105, 105, "indicadorRateio"),
  brancos(106, 106, "enderecamentoAviso"),
  brancos(107, 108),
  { ini: 109, fim: 110, key: "ocorrencia",    nome: "Identificação da Ocorrência",     type: "N", tabela: OCORRENCIAS,
    obrigatorio: true, ajuda: "Código de ocorrência (seção 4.1 do manual).", exemplo: "01" },
  { ini: 111, fim: 120, key: "numDocumento",  nome: "Nº do Documento",                 type: "A",
    obrigatorio: true, ajuda: "10 posições.", exemplo: "DOC0000001" },
  { ini: 121, fim: 126, key: "dataVencimento",nome: "Data do Vencimento do Título",    type: "N", fmt: "data",
    obrigatorio: true, ajuda: "DDMMAA no arquivo.", exemplo: "2026-12-10" },
  { ini: 127, fim: 139, key: "valorTitulo",   nome: "Valor do Título (Face)",          type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Sem ponto e sem vírgula no arquivo; 13 posições, 2 decimais.", exemplo: "150,00" },
  { ini: 140, fim: 142, key: "bancoCobranca", nome: "Banco Encarregado da Cobrança",   type: "N", ajuda: "Número do banco na câmara de compensação, ou 000." },
  { ini: 143, fim: 147, key: "agenciaDepositaria", nome: "Agência Depositária",        type: "N", ajuda: "Código da agência depositária, ou 00000." },
  { ini: 148, fim: 149, key: "especie",       nome: "Espécie de Título",               type: "N", opcoes: Object.keys(ESPECIES),
    obrigatorio: true, ajuda: "01 duplicata, 02 nota promissória, 06 nota promissória física, 07 cartolas bancárias, 14 duplicata de serviço física, 51 cheque, 60 contrato… (seção 4).", exemplo: "01" },
  brancos(150, 150, "identificacao"),
  { ini: 151, fim: 156, key: "dataEmissao",   nome: "Data da Emissão do Título",       type: "N", fmt: "data",
    obrigatorio: true, ajuda: "DDMMAA no arquivo.", exemplo: "2026-11-18" },
  { ini: 157, fim: 158, key: "instrucao1",    nome: "1ª Instrução",                    type: "N", ajuda: "00." },
  { ini: 159, fim: 159, key: "instrucao2",    nome: "2ª Instrução",                    type: "N", ajuda: "0." },
  { ini: 160, fim: 161, key: "tipoPessoaCedente", nome: "Tipo de Pessoa do Cedente",   type: "A", opcoes: ["01", "02"],
    obrigatorio: true, ajuda: "01 = pessoa física, 02 = pessoa jurídica.", exemplo: "02" },
  { ini: 162, fim: 173, key: "zeros162",      nome: "Zeros",                           type: "N" },
  { ini: 174, fim: 192, key: "termoCessao",   nome: "Número do Termo de Cessão",       type: "A",
    obrigatorio: true, ajuda: "Conforme número enviado pela consultoria (alfanumérico); 19 posições.", exemplo: "TERMO00000000000001" },
  { ini: 193, fim: 205, key: "valorPresente", nome: "Valor Presente da Parcela (Valor de Aquisição)", type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor líquido da parcela na data em que foi cedida; 13 posições, 2 decimais.", exemplo: "140,00" },
  { ini: 206, fim: 218, key: "valorAbatimento",nome: "Valor do Abatimento",            type: "N", fmt: "valor",
    ajuda: "Valor do abatimento a conceder na instrução (ocorrência 04)." },
  { ini: 219, fim: 220, key: "codInscPagador",nome: "Tipo de Inscrição do Sacado",     type: "N", opcoes: ["01", "02"],
    obrigatorio: true, ajuda: "01 = CPF, 02 = CNPJ.", exemplo: "01" },
  { ini: 221, fim: 234, key: "numInscPagador",nome: "Nº de Inscrição do Sacado",       type: "N",
    obrigatorio: true, ajuda: "CNPJ/CPF, sem pontuação, preenchido da direita para a esquerda (zeros à esquerda); 14 posições." },
  { ini: 235, fim: 274, key: "nomePagador",   nome: "Nome do Sacado",                  type: "A",
    obrigatorio: true, ajuda: "Maiúsculas, sem acento; 40 posições." },
  { ini: 275, fim: 314, key: "enderecoPagador",nome: "Endereço Completo",              type: "A",
    obrigatorio: true, ajuda: "40 posições.", exemplo: "RUA DAS FLORES 100" },
  { ini: 315, fim: 323, key: "numNotaFiscal", nome: "Nº da Nota Fiscal da Duplicata",  type: "A",
    obrigatorio: true, ajuda: "Obrigatório quando a espécie é duplicata (01); 9 posições.", exemplo: "000000001" },
  { ini: 324, fim: 326, key: "serieNotaFiscal",nome: "Nº da Série da Nota Fiscal",     type: "A", ajuda: "3 posições." },
  { ini: 327, fim: 334, key: "cepPagador",    nome: "CEP do Sacado",                   type: "N",
    obrigatorio: true, ajuda: "8 dígitos, sem hífen.", exemplo: "12345678" },
  { ini: 335, fim: 380, key: "nomeCedente",   nome: "Nome do Cedente",                 type: "A",
    obrigatorio: true, ajuda: "Decomposição do campo Cedente (335–394): nome nas posições 335–380.", exemplo: "CEDENTE EXEMPLO LTDA" },
  { ini: 381, fim: 394, key: "cnpjCedente",   nome: "CNPJ do Cedente",                 type: "N",
    obrigatorio: true, ajuda: "Decomposição do campo Cedente: CNPJ nas posições 381–394 (14).", exemplo: "11222333000181" },
  { ini: 395, fim: 438, key: "chaveNota",     nome: "Chave da Nota Fiscal Eletrônica", type: "A",
    obrigatorio: true, ajuda: "Obrigatório quando a espécie é duplicata (01); 44 posições.", exemplo: "00000000000000000000000000000000000000000001" },
  { ini: 439, fim: 444, key: "seqRegistro",   nome: "Nº Sequencial do Registro",       type: "N" }
];

const TRAILER = [
  { ini: 1,   fim: 1,   key: "idRegistro",  nome: "Identificação do Registro", type: "N", fixo: "9" },
  brancos(2, 438, "brancos"),
  { ini: 439, fim: 444, key: "seqRegistro", nome: "Nº Sequencial do Último Registro", type: "N" }
];

const REGRAS_DETALHE = [
  // Itens 43 e 47: "Sim — Duplicata".
  ({ campos }) => {
    if (campos.especie.trim() !== "01") return [];
    const saida = [];
    if (!campos.numNotaFiscal.trim()) saida.push({ nivel: "erro", campo: "numNotaFiscal", mensagem: "com espécie 01 (duplicata), o número da nota fiscal é obrigatório." });
    if (!campos.chaveNota.trim()) saida.push({ nivel: "erro", campo: "chaveNota", mensagem: "com espécie 01 (duplicata), a chave da nota fiscal eletrônica é obrigatória." });
    return saida;
  },
  // Nota do manual: abatimento vai em 206–218.
  ({ campos }) => campos.ocorrencia.trim() === "04" && !/[1-9]/.test(campos.valorAbatimento)
    ? [{ nivel: "aviso", campo: "valorAbatimento", mensagem: "com a ocorrência 04 (abatimento), o valor do abatimento (posições 206–218) não foi informado." }]
    : [],
  // Item 11: se a espécie for cheque, o número do banco é obrigatório.
  ({ campos }) => campos.especie.trim() === "51" && !/[1-9]/.test(campos.numBanco)
    ? [{ nivel: "erro", campo: "numBanco", mensagem: "com espécie 51 (cheque), o número do banco (posições 63–65) é obrigatório." }]
    : [],
];

export const paulista = {
  code: "611",
  nome: "Paulista — FIDC (CNAB 444)",

  // Só remessa: o manual enviado não traz o arquivo de retorno.
  remessa: {
    tamanhoRegistro: 444,
    headerFields: HEADER,
    detalheFields: DETALHE,
    trailerFields: TRAILER,
    ocorrencias: OCORRENCIAS,
    ocorrenciaComMotivo: [],
    motivos: {},
    regrasDetalhe: REGRAS_DETALHE,
    formFields: {
      header: ["codOriginador", "nomeOriginador", "dataGravacao", "seqArquivo"],
      detalhe: [
        "coobrigacao", "controleParticipante", "ocorrencia", "numDocumento", "dataVencimento", "valorTitulo", "especie", "dataEmissao",
        "tipoPessoaCedente", "termoCessao", "valorPresente", "codInscPagador", "numInscPagador", "nomePagador", "enderecoPagador",
        "cepPagador", "nomeCedente", "cnpjCedente",
        "numNotaFiscal", "serieNotaFiscal", "chaveNota", "valorAbatimento", "valorPago", "dataLiquidacao",
        "numBanco", "bancoCobranca", "agenciaDepositaria", "caracteristicaEspecial", "modalidade", "natureza", "origemRecurso", "classeRisco",
        "instrucao1", "instrucao2"
      ]
    }
  }
};
