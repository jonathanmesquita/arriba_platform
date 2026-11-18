/* =====================================================================
   CNAB 400 - Inter (077) | Config para o motor genérico (engine.js)

   FONTE ÚNICA: o manual "CNAB400 — Emissão de boletos de cobrança", versão
   2.2 de 26/08/2024, enviado pelo dono do projeto. Todas as tabelas de
   campos abaixo (Header, Detalhe tipos 1, 2 e 3, Trailer da remessa; Header,
   Detalhe e Trailer do retorno) e o cálculo do DV do nosso número vêm dele.
   NÃO há arquivo real nem planilha de amostra para este banco, então — ao
   contrário do Bradesco e do BMP, conferidos contra linha real — o que está
   aqui é a leitura do manual, e foi testado contra o EXEMPLO do próprio
   manual (DV do nosso número) e por ida e volta (gerar → ler).

   DISCREPÂNCIAS DO PRÓPRIO MANUAL (resolvidas pela POSIÇÃO, que é o que
   o motor usa; o "tamanho" da tabela está errado nesses itens):
   - Header de retorno, item 11: posições 101–394, mas a coluna tamanho diz 10.
   - Detalhe de retorno, item 09: posições 63–70 (8), tamanho diz 3.
   - Trailer de retorno, item 15: posições 133–394, tamanho diz 24.
   - Header de remessa, item 12 (nº sequencial da remessa, 111–117): o manual
     marca "Alfa", mas é o mesmo número do nome do arquivo (7 caracteres) —
     tratado como numérico com zeros à esquerda.
   - Campo de descontos (184): a tabela do Detalhe lista 0, 1 e 4; a página de
     notas lista 0 a 6. Aceita-se 0 a 6 (o conjunto maior).
   - Detalhe de remessa, item 33 (208–220): "campo em branco", formato "Num".
     Tratado como branco, como diz o conteúdo.

   NÃO CONFIRMADO (ver tasks/backlog.md): a correspondência entre os
   códigos de ocorrência do detalhe do retorno (02, 03, 06, 07) e a numeração
   "ocorrência 01/02/03/04" do trailer do retorno. Por isso o trailer do
   retorno não tem conferência de totais e o gerador o grava zerado.
   O gerador também só emite o registro tipo 1; os tipos 2 e 3 (opcionais)
   são lidos e validados, mas não montados pela tela.
   ===================================================================== */

"use strict";

/* ---------------------------------------------------------------------
   DV do nosso número (carteira 110) — manual, seção 7.3.
   Número = agência(4) + carteira(3) + nosso número sem DV (10) = 17
   algarismos; multiplicadores 2,1,2,1… da direita para a esquerda; produto
   maior que 9 soma os dígitos; DV = 10 − (soma mod 10); resto 0 → DV 0.
   Exemplo do manual: 0001 + 110 + 0004309540 → DV 1.
   --------------------------------------------------------------------- */
export function dvNossoNumeroInter(agencia, carteira, nossoNumero10) {
  const digitos = `${agencia}${carteira}${nossoNumero10}`.replace(/\D/g, "");
  let soma = 0;
  for (let i = 0; i < digitos.length; i++) {
    const posDaDireita = digitos.length - 1 - i;
    const peso = posDaDireita % 2 === 0 ? 2 : 1;
    const produto = Number(digitos[i]) * peso;
    soma += produto > 9 ? Math.floor(produto / 10) + (produto % 10) : produto;
  }
  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

/** Nosso número de 11 posições (10 + DV) para a carteira 110, com a agência fixa do layout. */
export function nossoNumeroComDv(sequencial) {
  const base = String(sequencial).padStart(10, "0").slice(-10);
  return base + dvNossoNumeroInter("0001", "110", base);
}

/* =====================================================================
   RETORNO
   ===================================================================== */

const RETORNO_HEADER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",     nome: "Identificação do Registro",     type: "N", fixo: "0" },
  { ini: 2,   fim: 2,   key: "idArquivo",      nome: "Identificação Arquivo Retorno", type: "N", fixo: "2" },
  { ini: 3,   fim: 9,   key: "literalRetorno", nome: "Literal Retorno",               type: "A", fixo: "RETORNO" },
  { ini: 10,  fim: 11,  key: "codServico",     nome: "Código do Serviço",             type: "N", fixo: "01" },
  { ini: 12,  fim: 26,  key: "literalServico", nome: "Literal Serviço",               type: "A", fixo: "COBRANCA" },
  { ini: 27,  fim: 46,  key: "brancos1",       nome: "Branco",                        type: "A" },
  { ini: 47,  fim: 76,  key: "nomeEmpresa",    nome: "Nome da Empresa",               type: "A",
    obrigatorio: true, ajuda: "Nome da empresa. Maiúsculas, sem acento; espaços à direita; 30 posições.", exemplo: "EMPRESA EXEMPLO LTDA" },
  { ini: 77,  fim: 79,  key: "codBanco",       nome: "Código do Banco na Compensação", type: "N", fixo: "077" },
  { ini: 80,  fim: 94,  key: "nomeBanco",      nome: "Nome do Banco",                 type: "A", fixo: "INTER" },
  { ini: 95,  fim: 100, key: "dataGravacao",   nome: "Data da Gravação",              type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data em que o banco gerou o arquivo (DDMMAA).", exemplo: "2026-11-18" },
  { ini: 101, fim: 394, key: "brancos2",       nome: "Branco",                        type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",    nome: "Nº Sequencial do Registro",     type: "N", fixo: "000001" }
];

const RETORNO_DETALHE_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",      nome: "Identificação do Registro",     type: "N", fixo: "1" },
  { ini: 2,   fim: 3,   key: "tipoInscEmpresa", nome: "Tipo de Inscrição da Empresa",  type: "N", opcoes: ["01", "02"],
    ajuda: "01 = CPF, 02 = CNPJ." },
  { ini: 4,   fim: 17,  key: "numInscEmpresa",  nome: "Nº de Inscrição da Empresa",    type: "N",
    ajuda: "CPF ou CNPJ da empresa beneficiária, sem pontuação. Zeros à esquerda; 14 posições." },
  { ini: 18,  fim: 20,  key: "zeros1",          nome: "Zeros",                         type: "N", fixo: "000" },
  { ini: 21,  fim: 23,  key: "carteira",        nome: "Carteira",                      type: "N", opcoes: ["110", "112"],
    obrigatorio: true, ajuda: "110 ou 112.", exemplo: "110" },
  { ini: 24,  fim: 27,  key: "agencia",         nome: "Agência",                       type: "N", fixo: "0001" },
  { ini: 28,  fim: 37,  key: "conta",           nome: "Conta Corrente da Empresa",     type: "N",
    ajuda: "Conforme informado na remessa. Zeros à esquerda; 10 posições." },
  { ini: 38,  fim: 62,  key: "controleParticipante", nome: "Nº de Controle do Participante", type: "A", vazioZeros: true,
    ajuda: "Conforme informado na remessa; 25 posições." },
  { ini: 63,  fim: 70,  key: "zeros2",          nome: "Zeros",                         type: "N" },
  { ini: 71,  fim: 81,  key: "nossoNumero",     nome: "Nosso Número",                  type: "N",
    obrigatorio: true, ajuda: "11 dígitos. Carteira 110: o nosso número + DV informado na remessa. Carteira 112: o número de registro do título.",
    exemplo: "00043095401", exemploFn: (i) => nossoNumeroComDv(4309540 + i) },
  { ini: 82,  fim: 86,  key: "brancos1",        nome: "Branco",                        type: "A" },
  { ini: 87,  fim: 89,  key: "carteira2",       nome: "Carteira",                      type: "N", opcoes: ["110", "112"],
    ajuda: "110 ou 112." },
  { ini: 90,  fim: 91,  key: "ocorrencia",      nome: "Identificação de Ocorrência",   type: "N",
    obrigatorio: true, ajuda: "02 = em aberto, 03 = erro, 06 = pago, 07 = cancelado.", exemplo: "06" },
  { ini: 92,  fim: 97,  key: "dataOcorrencia",  nome: "Data da Ocorrência no Banco",   type: "N", fmt: "data",
    ajuda: "Data da ocorrência (DDMMAA)." },
  { ini: 98,  fim: 107, key: "seuNumero",       nome: "Número do Documento (Seu Número)", type: "A",
    obrigatorio: true, ajuda: "Conforme informado na remessa; 10 posições.", exemplo: "DOC0000001" },
  { ini: 108, fim: 118, key: "nossoNumero2",    nome: "Nosso Número (repetido)",       type: "N",
    ajuda: "Mesmo conteúdo do nosso número da posição 71." },
  { ini: 119, fim: 124, key: "dataVencimento",  nome: "Data de Vencimento",            type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data de vencimento do título (DDMMAA).", exemplo: "2026-12-10" },
  { ini: 125, fim: 137, key: "valorTitulo",     nome: "Valor do Título",               type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Duas casas decimais, sem vírgula no arquivo; 13 posições.", exemplo: "150,00" },
  { ini: 138, fim: 140, key: "codBanco",        nome: "Código do Banco",               type: "N", fixo: "077" },
  { ini: 141, fim: 144, key: "agencia2",        nome: "Agência",                       type: "N", fixo: "0001" },
  { ini: 145, fim: 146, key: "especie",         nome: "Espécie do Título",             type: "N", fixo: "01" },
  { ini: 147, fim: 159, key: "brancos2",        nome: "Branco",                        type: "A" },
  { ini: 160, fim: 172, key: "valorPago",       nome: "Valor Pago",                    type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Valor recebido pelo título; 13 posições.", exemplo: "150,00" },
  { ini: 173, fim: 178, key: "dataCredito",     nome: "Data do Crédito",               type: "N", fmt: "data",
    ajuda: "Data do crédito (DDMMAA)." },
  { ini: 179, fim: 181, key: "brancos3",        nome: "Branco",                        type: "A" },
  { ini: 182, fim: 221, key: "nomePagador",     nome: "Nome do Pagador",               type: "A",
    ajuda: "Conforme informado na remessa. Espaços à direita; 40 posições." },
  { ini: 222, fim: 226, key: "brancos4",        nome: "Branco",                        type: "A" },
  { ini: 227, fim: 240, key: "numInscPagador",  nome: "CPF/CNPJ do Pagador",           type: "N",
    ajuda: "Conforme informado na remessa. CPF com zeros à esquerda; 14 posições." },
  { ini: 241, fim: 380, key: "motivoRejeicao",  nome: "Motivo da Rejeição",            type: "A",
    ajuda: "Texto do motivo, preenchido quando a ocorrência é 03 (erro); 140 posições." },
  { ini: 381, fim: 394, key: "numeroOperacao",  nome: "Número da Operação",            type: "A",
    ajuda: "Número da operação; 14 posições." },
  { ini: 395, fim: 400, key: "seqRegistro",     nome: "Nº Sequencial do Registro",     type: "N" }
];

// O trailer do retorno é uma lista de totais por "ocorrência 01/02/03/04".
// Não se confirmou como esses números se ligam aos códigos do detalhe (02, 03,
// 06, 07), então não há conferência de totais e o gerador o grava zerado.
const RETORNO_TRAILER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",  nome: "Identificação do Registro", type: "N", fixo: "9" },
  { ini: 2,   fim: 2,   key: "idRetorno",   nome: "Identificação do Retorno",  type: "N", fixo: "2" },
  { ini: 3,   fim: 4,   key: "tipoRegistro",nome: "Tipo de Registro",          type: "N", fixo: "01" },
  { ini: 5,   fim: 7,   key: "codBanco",    nome: "Código do Banco",           type: "N", fixo: "077" },
  { ini: 8,   fim: 17,  key: "brancos1",    nome: "Branco",                    type: "A" },
  { ini: 18,  fim: 25,  key: "qtdOc01",     nome: "Quantidade — Ocorrência 01 (boletos do arquivo remessa)", type: "N" },
  { ini: 26,  fim: 57,  key: "brancos2",    nome: "Branco",                    type: "A" },
  { ini: 58,  fim: 62,  key: "qtdOc02",     nome: "Quantidade — Ocorrência 02 (entradas confirmadas)", type: "N" },
  { ini: 63,  fim: 74,  key: "valorOc02",   nome: "Valor — Ocorrência 02",     type: "N", fmt: "valor" },
  { ini: 75,  fim: 86,  key: "brancos3",    nome: "Branco",                    type: "A" },
  { ini: 87,  fim: 91,  key: "qtdOc03",     nome: "Quantidade — Ocorrência 03 (entradas rejeitadas)", type: "N" },
  { ini: 92,  fim: 115, key: "brancos4",    nome: "Branco",                    type: "A" },
  { ini: 116, fim: 120, key: "qtdOc04",     nome: "Quantidade — Ocorrência 04 (liquidações)", type: "N" },
  { ini: 121, fim: 132, key: "valorOc04",   nome: "Valor — Ocorrência 04",     type: "N", fmt: "valor" },
  { ini: 133, fim: 394, key: "brancos5",    nome: "Branco",                    type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro", nome: "Nº Sequencial do Registro", type: "N" }
];

const OCORRENCIAS_RETORNO = {
  "02": "Em aberto",
  "03": "Erro",
  "06": "Pago",
  "07": "Cancelado"
};

/* =====================================================================
   REMESSA
   ===================================================================== */

const REMESSA_HEADER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",     nome: "Identificação do Registro",     type: "N", fixo: "0" },
  { ini: 2,   fim: 2,   key: "idArquivo",      nome: "Identificação do Arquivo Remessa", type: "N", fixo: "1" },
  { ini: 3,   fim: 9,   key: "literalRemessa", nome: "Literal Remessa",               type: "A", fixo: "REMESSA" },
  { ini: 10,  fim: 11,  key: "codServico",     nome: "Código do Serviço",             type: "N", fixo: "01" },
  { ini: 12,  fim: 26,  key: "literalServico", nome: "Literal Serviço",               type: "A", fixo: "COBRANCA" },
  { ini: 27,  fim: 46,  key: "brancos1",       nome: "Branco",                        type: "A" },
  { ini: 47,  fim: 76,  key: "nomeEmpresa",    nome: "Nome da Empresa",               type: "A",
    obrigatorio: true, ajuda: "A definir pelo cliente. Maiúsculas, sem acento; espaços à direita; 30 posições.", exemplo: "EMPRESA EXEMPLO LTDA" },
  { ini: 77,  fim: 79,  key: "codBanco",       nome: "Código do Banco na Compensação", type: "N", fixo: "077" },
  { ini: 80,  fim: 94,  key: "nomeBanco",      nome: "Nome do Banco por Extenso",     type: "A", fixo: "INTER" },
  { ini: 95,  fim: 100, key: "dataGravacao",   nome: "Data da Gravação do Arquivo",   type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data da gravação do arquivo (DDMMAA).", exemplo: "2026-11-18" },
  { ini: 101, fim: 110, key: "brancos2",       nome: "Branco",                        type: "A" },
  { ini: 111, fim: 117, key: "seqRemessa",     nome: "Nº Sequencial da Remessa",      type: "N",
    obrigatorio: true, ajuda: "Mesmo número do nome do arquivo (CI400_001_NNNNNNN.REM), com 7 caracteres.", exemplo: "1" },
  { ini: 118, fim: 394, key: "brancos3",       nome: "Branco",                        type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",    nome: "Nº Sequencial do Registro",     type: "N", fixo: "000001" }
];

const REMESSA_DETALHE_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",     nome: "Identificação do Registro",     type: "N", fixo: "1" },
  { ini: 2,   fim: 20,  key: "brancos1",       nome: "Branco",                        type: "A" },
  { ini: 21,  fim: 23,  key: "carteira",       nome: "Carteira",                      type: "N", opcoes: ["110", "112"],
    obrigatorio: true, ajuda: "110 ou 112. Para usar a carteira 110, o manual manda solicitar uma análise de reserva de faixa bancária.", exemplo: "110" },
  { ini: 24,  fim: 27,  key: "agencia",        nome: "Agência da Empresa no Inter",   type: "N", fixo: "0001" },
  { ini: 28,  fim: 36,  key: "conta",          nome: "Nº da Conta Corrente",          type: "N",
    obrigatorio: true, ajuda: "Conta da empresa, completada com zeros à esquerda; 9 posições.", exemplo: "123456789" },
  { ini: 37,  fim: 37,  key: "dvConta",        nome: "Dígito Verificador da Conta",   type: "N",
    obrigatorio: true, ajuda: "Dígito verificador da conta corrente; 1 posição.", exemplo: "0" },
  { ini: 38,  fim: 62,  key: "controleParticipante", nome: "Nº de Controle do Participante", type: "A", vazioZeros: true,
    ajuda: "Número de controle para uso da empresa. Se não definido, o manual manda preencher com zeros (o gerador faz isso); 25 posições." },
  { ini: 63,  fim: 65,  key: "brancos2",       nome: "Branco",                        type: "A" },
  { ini: 66,  fim: 66,  key: "tipoMulta",      nome: "Campo da Multa",                type: "N", opcoes: ["0", "1", "2"],
    ajuda: "0 = sem multa, 1 = valor fixo, 2 = percentual." },
  { ini: 67,  fim: 79,  key: "valorMulta",     nome: "Valor da Multa",                type: "N", fmt: "valor",
    ajuda: "Se o campo da multa for 1, o valor fixo; senão, zeros. 13 posições." },
  { ini: 80,  fim: 83,  key: "percentualMulta",nome: "Percentual da Multa",           type: "N", fmt: "valor",
    ajuda: "Se o campo da multa for 2, o percentual com 2 casas decimais (ex.: 2,00); senão, zeros." },
  { ini: 84,  fim: 89,  key: "dataMulta",      nome: "Data da Multa",                 type: "N", fmt: "data",
    ajuda: "Obrigatória se a multa for 1 ou 2; senão, zeros." },
  { ini: 90,  fim: 100, key: "nossoNumero",    nome: "Nosso Número (com DV)",         type: "N",
    obrigatorio: true,
    ajuda: "Carteira 110: o nosso número com 10 dígitos + 1 dígito verificador, dentro da faixa reservada. Carteira 112: zeros (o banco atribui). 11 posições.",
    exemplo: "00043095401", exemploFn: (i) => nossoNumeroComDv(4309540 + i) },
  { ini: 101, fim: 108, key: "brancos3",       nome: "Branco",                        type: "A" },
  { ini: 109, fim: 110, key: "ocorrencia",     nome: "Identificação da Ocorrência",   type: "N",
    obrigatorio: true, ajuda: "01 = remessa (registrar o boleto), 07 = solicitação de baixa.", exemplo: "01" },
  { ini: 111, fim: 120, key: "numDocumento",   nome: "Número do Documento (Seu Número)", type: "A",
    obrigatorio: true, ajuda: "A definir pelo cliente; o mesmo conteúdo volta no arquivo de retorno. 10 posições.", exemplo: "DOC0000001" },
  { ini: 121, fim: 126, key: "dataVencimento", nome: "Data de Vencimento do Título",  type: "N", fmt: "data",
    obrigatorio: true, ajuda: "Data de vencimento (DDMMAA).", exemplo: "2026-12-10" },
  { ini: 127, fim: 139, key: "valorTitulo",    nome: "Valor do Título",               type: "N", fmt: "valor",
    obrigatorio: true, ajuda: "Duas casas decimais, sem vírgula no arquivo. Mínimo R$ 2,50. 13 posições.", exemplo: "150,00" },
  { ini: 140, fim: 141, key: "diasLimitePagamento", nome: "Dias Limite para Pagamento", type: "N",
    obrigatorio: true, ajuda: "De 01 a 60: dias após o vencimento em que o pagamento ainda será aceito.", exemplo: "30" },
  { ini: 142, fim: 147, key: "brancos4",       nome: "Branco",                        type: "A" },
  { ini: 148, fim: 149, key: "especie",        nome: "Espécie do Título",             type: "N", fixo: "01" },
  { ini: 150, fim: 150, key: "identificacao",  nome: "Identificação",                 type: "A", fixo: "N" },
  { ini: 151, fim: 156, key: "dataEmissao",    nome: "Data da Emissão do Título",     type: "A",
    ajuda: "Em branco: o retorno informa sempre a data em que o boleto foi registrado." },
  { ini: 157, fim: 159, key: "brancos5",       nome: "Branco",                        type: "A" },
  { ini: 160, fim: 160, key: "tipoJuros",      nome: "Campo de Juros/Mora",           type: "N", opcoes: ["0", "1", "2"],
    ajuda: "0 = sem juros/mora, 1 = valor fixo por dia, 2 = taxa mensal (cobrada pro rata)." },
  { ini: 161, fim: 173, key: "valorJuros",     nome: "Valor por Dia de Atraso",       type: "N", fmt: "valor",
    ajuda: "Se o campo de juros for 1, o valor fixo por dia; senão, zeros." },
  { ini: 174, fim: 177, key: "taxaJuros",      nome: "Taxa Mensal de Juros/Mora",     type: "N", fmt: "valor",
    ajuda: "Se o campo de juros for 2, a taxa mensal com 2 casas decimais; senão, zeros." },
  { ini: 178, fim: 183, key: "dataJuros",      nome: "Data da Mora",                  type: "N", fmt: "data",
    ajuda: "Obrigatória se juros for 1 ou 2; deve ser maior que a data de vencimento. Senão, zeros." },
  { ini: 184, fim: 184, key: "tipoDesconto",   nome: "Campo de Descontos",            type: "N", opcoes: ["0", "1", "2", "3", "4", "5", "6"],
    ajuda: "0 = sem desconto, 1 = valor fixo até a data, 2 = valor por antecipação (dia corrido), 3 = valor por antecipação (dia útil), 4 = percentual até a data, 5 = percentual (dia corrido), 6 = percentual (dia útil)." },
  { ini: 185, fim: 197, key: "valorDesconto1", nome: "Valor do Desconto 1",           type: "N", fmt: "valor",
    ajuda: "Se o campo de descontos for 1; senão, zeros." },
  { ini: 198, fim: 201, key: "percDesconto1",  nome: "Percentual de Desconto 1",      type: "N", fmt: "valor",
    ajuda: "Se o campo de descontos for 4; senão, zeros." },
  { ini: 202, fim: 207, key: "dataDesconto1",  nome: "Data Limite do Desconto 1",     type: "N", fmt: "data",
    ajuda: "Obrigatória se for 1 ou 4; deve ser menor ou igual à data de vencimento. Senão, zeros." },
  { ini: 208, fim: 220, key: "brancos6",       nome: "Branco",                        type: "A" },
  { ini: 221, fim: 222, key: "codInscPagador", nome: "Tipo de Inscrição do Pagador",  type: "N", opcoes: ["01", "02"],
    obrigatorio: true, ajuda: "01 = CPF, 02 = CNPJ.", exemplo: "01" },
  { ini: 223, fim: 236, key: "numInscPagador", nome: "CPF/CNPJ do Pagador",           type: "N",
    obrigatorio: true, ajuda: "Sem pontuação. CPF com zeros à esquerda; 14 posições." },
  { ini: 237, fim: 276, key: "nomePagador",    nome: "Nome do Pagador",               type: "A",
    obrigatorio: true, ajuda: "Maiúsculas, sem acento; espaços à direita; 40 posições." },
  { ini: 277, fim: 314, key: "enderecoPagador",nome: "Endereço Completo do Pagador",  type: "A",
    obrigatorio: true, ajuda: "Espaços à direita; 38 posições.", exemplo: "RUA DAS FLORES 100" },
  { ini: 315, fim: 316, key: "ufPagador",      nome: "UF do Pagador",                 type: "A",
    obrigatorio: true, ajuda: "Sigla do estado; 2 posições.", exemplo: "SP" },
  { ini: 317, fim: 324, key: "cepPagador",     nome: "CEP do Pagador",                type: "N",
    obrigatorio: true, ajuda: "8 dígitos, sem hífen.", exemplo: "12345678" },
  { ini: 325, fim: 394, key: "mensagem1",      nome: "1ª Mensagem",                   type: "A",
    ajuda: "Mensagem livre impressa no boleto (não é confirmada no retorno); 70 posições." },
  { ini: 395, fim: 400, key: "seqRegistro",    nome: "Nº Sequencial do Registro",     type: "N" }
];

// Registros tipo 2 e 3 (opcionais). Lidos e validados; a tela não os monta.
const REMESSA_TIPO2_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",     nome: "Identificação do Registro", type: "N", fixo: "2" },
  { ini: 2,   fim: 79,  key: "mensagem2",      nome: "2ª Mensagem",               type: "A" },
  { ini: 80,  fim: 157, key: "mensagem3",      nome: "3ª Mensagem",               type: "A" },
  { ini: 158, fim: 235, key: "mensagem4",      nome: "4ª Mensagem",               type: "A" },
  { ini: 236, fim: 313, key: "mensagem5",      nome: "5ª Mensagem",               type: "A" },
  { ini: 314, fim: 319, key: "dataDesconto2",  nome: "Data Limite do Desconto 2", type: "N", fmt: "data" },
  { ini: 320, fim: 332, key: "valorDesconto2", nome: "Valor do Desconto 2",       type: "N", fmt: "valor" },
  { ini: 333, fim: 336, key: "percDesconto2",  nome: "Percentual de Desconto 2",  type: "N", fmt: "valor" },
  { ini: 337, fim: 346, key: "brancos1",       nome: "Branco",                    type: "A" },
  { ini: 347, fim: 352, key: "dataDesconto3",  nome: "Data Limite do Desconto 3", type: "N", fmt: "data" },
  { ini: 353, fim: 365, key: "valorDesconto3", nome: "Valor do Desconto 3",       type: "N", fmt: "valor" },
  { ini: 366, fim: 369, key: "percDesconto3",  nome: "Percentual de Desconto 3",  type: "N", fmt: "valor" },
  { ini: 370, fim: 379, key: "brancos2",       nome: "Branco",                    type: "A" },
  { ini: 380, fim: 390, key: "nossoNumero",    nome: "Nosso Número",              type: "N" },
  { ini: 391, fim: 394, key: "brancos3",       nome: "Branco",                    type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",    nome: "Nº Sequencial do Registro", type: "N" }
];

const REMESSA_TIPO3_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",       nome: "Identificação do Registro",       type: "N", fixo: "3" },
  { ini: 2,   fim: 51,  key: "emailPagador",     nome: "E-mail do Pagador",               type: "A" },
  { ini: 52,  fim: 61,  key: "brancos1",         nome: "Branco",                          type: "A" },
  { ini: 62,  fim: 63,  key: "tipoDocBenefFinal",nome: "Tipo de Documento do Beneficiário Final", type: "N", opcoes: ["01", "02"] },
  { ini: 64,  fim: 77,  key: "docBenefFinal",    nome: "CPF/CNPJ do Beneficiário Final",  type: "N" },
  { ini: 78,  fim: 137, key: "nomeBenefFinal",   nome: "Nome do Beneficiário Final",      type: "A" },
  { ini: 138, fim: 197, key: "enderecoBenefFinal",nome: "Endereço do Beneficiário Final", type: "A" },
  { ini: 198, fim: 242, key: "bairroBenefFinal", nome: "Bairro do Beneficiário Final",    type: "A" },
  { ini: 243, fim: 250, key: "cepBenefFinal",    nome: "CEP do Beneficiário Final",       type: "N" },
  { ini: 251, fim: 280, key: "cidadeBenefFinal", nome: "Cidade do Beneficiário Final",    type: "A" },
  { ini: 281, fim: 282, key: "ufBenefFinal",     nome: "UF do Beneficiário Final",        type: "A" },
  { ini: 283, fim: 287, key: "agenciaDvBenefFinal", nome: "Agência + DV",                 type: "N" },
  { ini: 288, fim: 297, key: "contaDvBenefFinal",nome: "Conta + DV",                      type: "N" },
  { ini: 298, fim: 394, key: "brancos2",         nome: "Branco",                          type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",      nome: "Nº Sequencial do Registro",       type: "N" }
];

const REMESSA_TRAILER_FIELDS = [
  { ini: 1,   fim: 1,   key: "idRegistro",       nome: "Identificação do Registro", type: "N", fixo: "9" },
  { ini: 2,   fim: 7,   key: "quantidadeTitulos",nome: "Quantidade de Boletos",     type: "N" },
  { ini: 8,   fim: 394, key: "brancos",          nome: "Branco",                    type: "A" },
  { ini: 395, fim: 400, key: "seqRegistro",      nome: "Nº Sequencial do Registro", type: "N" }
];

const OCORRENCIAS_REMESSA = {
  "01": "Remessa (registro do boleto)",
  "07": "Solicitação de baixa"
};

/* Regras entre campos do detalhe da remessa. Cada uma devolve problemas
   { nivel, mensagem, campo? }; campo em branco/zerado não é reportado. */
const num = (t) => (/^\d+$/.test(t.trim()) ? Number(t.trim()) : null);

const REGRAS_DETALHE_REMESSA = [
  // DV do nosso número: só carteira 110 (manual, 7.3).
  ({ campos }) => {
    if (campos.carteira.trim() !== "110") return [];
    const nn = campos.nossoNumero.trim();
    if (!/^\d{11}$/.test(nn) || /^0+$/.test(nn)) return [];
    const esperado = dvNossoNumeroInter(campos.agencia, campos.carteira, nn.slice(0, 10));
    return Number(nn[10]) === esperado
      ? []
      : [{ nivel: "erro", campo: "nossoNumero", mensagem: `o dígito verificador do nosso número ${nn} é ${nn[10]}, e o cálculo do manual (carteira 110) dá ${esperado}.` }];
  },
  // Valor mínimo R$ 2,50 (manual, nota do item 18).
  ({ campos }) => {
    const v = num(campos.valorTitulo);
    return v !== null && v > 0 && v < 250
      ? [{ nivel: "erro", campo: "valorTitulo", mensagem: "o valor do título é menor que o mínimo de R$ 2,50 do banco." }]
      : [];
  },
  // Dias limite de pagamento: 01 a 60.
  ({ campos }) => {
    const d = num(campos.diasLimitePagamento);
    return d !== null && (d < 1 || d > 60)
      ? [{ nivel: "erro", campo: "diasLimitePagamento", mensagem: `os dias limite para pagamento (${d}) devem estar entre 01 e 60.` }]
      : [];
  },
  // Multa e juros: o campo tipo decide quais outros são obrigatórios.
  ({ campos }) => {
    const saida = [];
    const zerado = (k) => !/[1-9]/.test(campos[k]);
    const tm = campos.tipoMulta.trim();
    if ((tm === "1" || tm === "2") && zerado("dataMulta")) saida.push({ nivel: "erro", campo: "dataMulta", mensagem: `com multa "${tm}", a data da multa é obrigatória.` });
    if (tm === "1" && zerado("valorMulta")) saida.push({ nivel: "erro", campo: "valorMulta", mensagem: 'com multa "1" (valor fixo), o valor da multa é obrigatório.' });
    if (tm === "2" && zerado("percentualMulta")) saida.push({ nivel: "erro", campo: "percentualMulta", mensagem: 'com multa "2" (percentual), o percentual da multa é obrigatório.' });
    const tj = campos.tipoJuros.trim();
    if ((tj === "1" || tj === "2") && zerado("dataJuros")) saida.push({ nivel: "erro", campo: "dataJuros", mensagem: `com juros "${tj}", a data da mora é obrigatória.` });
    if (tj === "1" && zerado("valorJuros")) saida.push({ nivel: "erro", campo: "valorJuros", mensagem: 'com juros "1" (valor fixo por dia), o valor por dia de atraso é obrigatório.' });
    if (tj === "2" && zerado("taxaJuros")) saida.push({ nivel: "erro", campo: "taxaJuros", mensagem: 'com juros "2" (taxa mensal), a taxa é obrigatória.' });
    return saida;
  },
];

export const inter = {
  code: "077",
  nome: "Inter",

  retorno: {
    headerFields: RETORNO_HEADER_FIELDS,
    detalheFields: RETORNO_DETALHE_FIELDS,
    trailerFields: RETORNO_TRAILER_FIELDS,
    ocorrencias: OCORRENCIAS_RETORNO,
    ocorrenciaComMotivo: [],
    motivos: {},
    trailerTotalKey: "valorPago",
    formFields: {
      header: ["nomeEmpresa", "dataGravacao"],
      detalhe: ["nossoNumero", "carteira", "ocorrencia", "seuNumero", "dataVencimento", "valorTitulo", "valorPago", "dataCredito", "dataOcorrencia"]
    }
  },

  remessa: {
    headerFields: REMESSA_HEADER_FIELDS,
    detalheFields: REMESSA_DETALHE_FIELDS,
    trailerFields: REMESSA_TRAILER_FIELDS,
    registrosExtras: {
      "2": { nome: "tipo 2 (mensagens e descontos)", fields: REMESSA_TIPO2_FIELDS },
      "3": { nome: "tipo 3 (e-mail e beneficiário final)", fields: REMESSA_TIPO3_FIELDS }
    },
    ocorrencias: OCORRENCIAS_REMESSA,
    ocorrenciaComMotivo: [],
    motivos: {},
    trailerTotalKey: "valorTitulo",
    trailerConferencia: { quantidadeKey: "quantidadeTitulos" },
    regrasDetalhe: REGRAS_DETALHE_REMESSA,
    formFields: {
      header: ["nomeEmpresa", "dataGravacao", "seqRemessa"],
      detalhe: [
        "carteira", "conta", "dvConta", "nossoNumero", "ocorrencia", "numDocumento", "dataVencimento",
        "valorTitulo", "diasLimitePagamento", "codInscPagador", "numInscPagador", "nomePagador",
        "enderecoPagador", "ufPagador", "cepPagador",
        "controleParticipante", "tipoMulta", "valorMulta", "percentualMulta", "dataMulta",
        "tipoJuros", "valorJuros", "taxaJuros", "dataJuros",
        "tipoDesconto", "valorDesconto1", "percDesconto1", "dataDesconto1", "mensagem1"
      ]
    }
  }
};
