/* =====================================================================
   Sandbox DataCob - schema real, DADOS 100% FICTÍCIOS

   As TABELAS e COLUNAS aqui espelham o modelo real do DataCob (extraído
   do diagrama ER do banco), para que quem treina SQL aqui encontre os
   mesmos nomes que vai usar no dia a dia — Financiado, Contrato,
   Parcela, Acordo, Historico... — em vez de tabelas genéricas.

   ⚠️ Os DADOS são inventados do zero: nenhum nome, CPF/CNPJ, telefone,
   e-mail, endereço ou valor aqui pertence a pessoa ou cliente real.
   Nada disso vem de base de produção, e o sandbox roda AlaSQL 100% no
   navegador — NÃO existe nenhuma conexão com o SQL Server real do
   DataCob (mesma regra do dataset do Track 7).

   Sobre os nomes: no banco real as tabelas moram em dois grupos, "Cob"
   (cobrança) e "Par" (parâmetros/cadastro) — indicado em `origem` nos
   metadados abaixo. No sandbox elas viram tabelas simples (sem prefixo)
   para o SQL ficar igual ao que se escreve no dia a dia sem precisar
   qualificar schema.

   A lista de colunas é um SUBCONJUNTO do real (o diagrama mostra as
   primeiras colunas de cada tabela) — o suficiente para praticar JOINs,
   agregação e filtros com a estrutura verdadeira. Não foram inventadas
   colunas que não aparecem no diagrama.
   ===================================================================== */

/* ---------------------------------------------------------------------
   Par - cadastro/parâmetros
   --------------------------------------------------------------------- */

export const GRUPO = [
  { Id_Grupo: 1, Descricao: "Carteira Varejo Amigavel", Id_Rotina_Sistema: 10, Id_Cliente_Web: 501, Modo_Agrupamento: "CONTRATO", Retorno_Automatico_Na_Fila: "S" },
  { Id_Grupo: 2, Descricao: "Carteira Varejo Pre-Juridico", Id_Rotina_Sistema: 11, Id_Cliente_Web: 501, Modo_Agrupamento: "CONTRATO", Retorno_Automatico_Na_Fila: "S" },
  { Id_Grupo: 3, Descricao: "Carteira Atacado Amigavel", Id_Rotina_Sistema: 10, Id_Cliente_Web: 502, Modo_Agrupamento: "FINANCIADO", Retorno_Automatico_Na_Fila: "N" },
  { Id_Grupo: 4, Descricao: "Carteira Juridico", Id_Rotina_Sistema: 12, Id_Cliente_Web: 502, Modo_Agrupamento: "CONTRATO", Retorno_Automatico_Na_Fila: "N" }
];

export const CLIENTE = [
  { Id_Cliente: 101, Id_Grupo: 1, Razao: "Credito Facil Fomento Ltda", Nome_Res: "Credito Facil", Endereco: "Av. das Nacoes", Numero: "1200" },
  { Id_Cliente: 102, Id_Grupo: 1, Razao: "Banco Aurora Financiamentos SA", Nome_Res: "Banco Aurora", Endereco: "Rua do Comercio", Numero: "45" },
  { Id_Cliente: 103, Id_Grupo: 2, Razao: "Loja Bem Estar Moveis Ltda", Nome_Res: "Bem Estar Moveis", Endereco: "Av. Central", Numero: "980" },
  { Id_Cliente: 104, Id_Grupo: 3, Razao: "Atacadao Sul Distribuidora SA", Nome_Res: "Atacadao Sul", Endereco: "Rod. dos Vales km 12", Numero: "S/N" },
  { Id_Cliente: 105, Id_Grupo: 4, Razao: "Consorcio Horizonte Ltda", Nome_Res: "Consorcio Horizonte", Endereco: "Praca da Matriz", Numero: "310" }
];

// Tabela de domínio: códigos de ocorrência que os operadores registram
// no Historico. Códigos/descrições ilustrativos.
export const OCORRENCIA_SISTEMA = [
  { Id_Ocorrencia_Sistema: 1, Cod_Ocorr_Sistema: "ACO", Descricao: "Acordo firmado", Compl_Ocorr: "Nr. do acordo", Tipo_Compl: "N", Tam_Compl: 10 },
  { Id_Ocorrencia_Sistema: 2, Cod_Ocorr_Sistema: "PGT", Descricao: "Pagamento confirmado", Compl_Ocorr: "Valor pago", Tipo_Compl: "V", Tam_Compl: 13 },
  { Id_Ocorrencia_Sistema: 3, Cod_Ocorr_Sistema: "CPC", Descricao: "Contato com a pessoa certa", Compl_Ocorr: "Telefone usado", Tipo_Compl: "A", Tam_Compl: 15 },
  { Id_Ocorrencia_Sistema: 4, Cod_Ocorr_Sistema: "CNP", Descricao: "Contato com pessoa nao certa", Compl_Ocorr: "Observacao", Tipo_Compl: "A", Tam_Compl: 60 },
  { Id_Ocorrencia_Sistema: 5, Cod_Ocorr_Sistema: "TEL", Descricao: "Telefone invalido", Compl_Ocorr: "Telefone", Tipo_Compl: "A", Tam_Compl: 15 },
  { Id_Ocorrencia_Sistema: 6, Cod_Ocorr_Sistema: "PRO", Descricao: "Promessa de pagamento", Compl_Ocorr: "Data prometida", Tipo_Compl: "D", Tam_Compl: 8 },
  { Id_Ocorrencia_Sistema: 7, Cod_Ocorr_Sistema: "REC", Descricao: "Recusa de negociacao", Compl_Ocorr: "Motivo", Tipo_Compl: "A", Tam_Compl: 60 },
  { Id_Ocorrencia_Sistema: 8, Cod_Ocorr_Sistema: "BXA", Descricao: "Baixa por quitacao", Compl_Ocorr: "Nr. do acordo", Tipo_Compl: "N", Tam_Compl: 10 }
];

/* ---------------------------------------------------------------------
   Cob - cobrança
   --------------------------------------------------------------------- */

export const FINANCIADO = [
  { Id_Financiado: 9001, Id_Cliente: 101, Id_Cliente_Web: 501, Cpfcnpj: "11122233396", Financiado_Chave: "FIN-9001", Nome: "ANA BEATRIZ MOREIRA" },
  { Id_Financiado: 9002, Id_Cliente: 101, Id_Cliente_Web: 501, Cpfcnpj: "22233344407", Financiado_Chave: "FIN-9002", Nome: "CARLOS EDUARDO RAMOS" },
  { Id_Financiado: 9003, Id_Cliente: 101, Id_Cliente_Web: 501, Cpfcnpj: "33344455518", Financiado_Chave: "FIN-9003", Nome: "DANIELA CRISTINA LOPES" },
  { Id_Financiado: 9004, Id_Cliente: 102, Id_Cliente_Web: 501, Cpfcnpj: "44455566629", Financiado_Chave: "FIN-9004", Nome: "EDUARDO NASCIMENTO PIRES" },
  { Id_Financiado: 9005, Id_Cliente: 102, Id_Cliente_Web: 501, Cpfcnpj: "55566677730", Financiado_Chave: "FIN-9005", Nome: "FERNANDA ALVES TEIXEIRA" },
  { Id_Financiado: 9006, Id_Cliente: 103, Id_Cliente_Web: 501, Cpfcnpj: "66677788841", Financiado_Chave: "FIN-9006", Nome: "GABRIEL HENRIQUE SOARES" },
  { Id_Financiado: 9007, Id_Cliente: 103, Id_Cliente_Web: 501, Cpfcnpj: "77788899952", Financiado_Chave: "FIN-9007", Nome: "HELENA MARTINS BARBOSA" },
  { Id_Financiado: 9008, Id_Cliente: 104, Id_Cliente_Web: 502, Cpfcnpj: "12345678000199", Financiado_Chave: "FIN-9008", Nome: "MERCEARIA VILA NOVA LTDA" },
  { Id_Financiado: 9009, Id_Cliente: 104, Id_Cliente_Web: 502, Cpfcnpj: "98765432000188", Financiado_Chave: "FIN-9009", Nome: "PADARIA TRIGO DOURADO LTDA" },
  { Id_Financiado: 9010, Id_Cliente: 105, Id_Cliente_Web: 502, Cpfcnpj: "88899900063", Financiado_Chave: "FIN-9010", Nome: "IGOR PACHECO DE SOUZA" },
  { Id_Financiado: 9011, Id_Cliente: 105, Id_Cliente_Web: 502, Cpfcnpj: "99900011174", Financiado_Chave: "FIN-9011", Nome: "JULIANA ROCHA CAMARGO" },
  { Id_Financiado: 9012, Id_Cliente: 102, Id_Cliente_Web: 501, Cpfcnpj: "10011122285", Financiado_Chave: "FIN-9012", Nome: "LUCAS ANDRADE FIGUEIREDO" }
];

export const CONTRATO = [
  { Id_Contrato: 7001, Id_Cliente: 101, Id_Grupo: 1, Id_Financiado: 9001, Id_Cliente_Web: 501, Numero_Contrato: "CT-2024-0001" },
  { Id_Contrato: 7002, Id_Cliente: 101, Id_Grupo: 1, Id_Financiado: 9002, Id_Cliente_Web: 501, Numero_Contrato: "CT-2024-0002" },
  { Id_Contrato: 7003, Id_Cliente: 101, Id_Grupo: 1, Id_Financiado: 9003, Id_Cliente_Web: 501, Numero_Contrato: "CT-2024-0003" },
  { Id_Contrato: 7004, Id_Cliente: 102, Id_Grupo: 1, Id_Financiado: 9004, Id_Cliente_Web: 501, Numero_Contrato: "CT-2024-0004" },
  { Id_Contrato: 7005, Id_Cliente: 102, Id_Grupo: 1, Id_Financiado: 9005, Id_Cliente_Web: 501, Numero_Contrato: "CT-2024-0005" },
  { Id_Contrato: 7006, Id_Cliente: 103, Id_Grupo: 2, Id_Financiado: 9006, Id_Cliente_Web: 501, Numero_Contrato: "CT-2024-0006" },
  { Id_Contrato: 7007, Id_Cliente: 103, Id_Grupo: 2, Id_Financiado: 9007, Id_Cliente_Web: 501, Numero_Contrato: "CT-2024-0007" },
  { Id_Contrato: 7008, Id_Cliente: 104, Id_Grupo: 3, Id_Financiado: 9008, Id_Cliente_Web: 502, Numero_Contrato: "CT-2024-0008" },
  { Id_Contrato: 7009, Id_Cliente: 104, Id_Grupo: 3, Id_Financiado: 9009, Id_Cliente_Web: 502, Numero_Contrato: "CT-2024-0009" },
  { Id_Contrato: 7010, Id_Cliente: 105, Id_Grupo: 4, Id_Financiado: 9010, Id_Cliente_Web: 502, Numero_Contrato: "CT-2024-0010" },
  { Id_Contrato: 7011, Id_Cliente: 105, Id_Grupo: 4, Id_Financiado: 9011, Id_Cliente_Web: 502, Numero_Contrato: "CT-2024-0011" },
  // Financiado 9012 aparece sem contrato de propósito: serve para os
  // exemplos de LEFT JOIN mostrarem linha sem correspondência.
];

// Tipo_Parcela: "P" = principal, "J" = juros, "M" = multa/encargo.
export const PARCELA = [
  { Id_Parcela: 50001, Id_Cliente: 101, Id_Contrato: 7001, Tipo_Parcela: "P", Dt_Vencimento: "2024-01-10" },
  { Id_Parcela: 50002, Id_Cliente: 101, Id_Contrato: 7001, Tipo_Parcela: "P", Dt_Vencimento: "2024-02-10" },
  { Id_Parcela: 50003, Id_Cliente: 101, Id_Contrato: 7001, Tipo_Parcela: "J", Dt_Vencimento: "2024-02-10" },
  { Id_Parcela: 50004, Id_Cliente: 101, Id_Contrato: 7002, Tipo_Parcela: "P", Dt_Vencimento: "2024-01-20" },
  { Id_Parcela: 50005, Id_Cliente: 101, Id_Contrato: 7002, Tipo_Parcela: "P", Dt_Vencimento: "2024-02-20" },
  { Id_Parcela: 50006, Id_Cliente: 101, Id_Contrato: 7003, Tipo_Parcela: "P", Dt_Vencimento: "2024-03-05" },
  { Id_Parcela: 50007, Id_Cliente: 102, Id_Contrato: 7004, Tipo_Parcela: "P", Dt_Vencimento: "2024-02-15" },
  { Id_Parcela: 50008, Id_Cliente: 102, Id_Contrato: 7004, Tipo_Parcela: "M", Dt_Vencimento: "2024-02-15" },
  { Id_Parcela: 50009, Id_Cliente: 102, Id_Contrato: 7005, Tipo_Parcela: "P", Dt_Vencimento: "2024-03-15" },
  { Id_Parcela: 50010, Id_Cliente: 103, Id_Contrato: 7006, Tipo_Parcela: "P", Dt_Vencimento: "2024-01-25" },
  { Id_Parcela: 50011, Id_Cliente: 103, Id_Contrato: 7006, Tipo_Parcela: "P", Dt_Vencimento: "2024-02-25" },
  { Id_Parcela: 50012, Id_Cliente: 103, Id_Contrato: 7007, Tipo_Parcela: "P", Dt_Vencimento: "2024-04-01" },
  { Id_Parcela: 50013, Id_Cliente: 104, Id_Contrato: 7008, Tipo_Parcela: "P", Dt_Vencimento: "2024-02-28" },
  { Id_Parcela: 50014, Id_Cliente: 104, Id_Contrato: 7008, Tipo_Parcela: "J", Dt_Vencimento: "2024-02-28" },
  { Id_Parcela: 50015, Id_Cliente: 104, Id_Contrato: 7009, Tipo_Parcela: "P", Dt_Vencimento: "2024-03-30" },
  { Id_Parcela: 50016, Id_Cliente: 105, Id_Contrato: 7010, Tipo_Parcela: "P", Dt_Vencimento: "2024-01-05" },
  { Id_Parcela: 50017, Id_Cliente: 105, Id_Contrato: 7010, Tipo_Parcela: "P", Dt_Vencimento: "2024-02-05" },
  { Id_Parcela: 50018, Id_Cliente: 105, Id_Contrato: 7010, Tipo_Parcela: "P", Dt_Vencimento: "2024-03-05" },
  { Id_Parcela: 50019, Id_Cliente: 105, Id_Contrato: 7011, Tipo_Parcela: "P", Dt_Vencimento: "2024-04-10" },
  { Id_Parcela: 50020, Id_Cliente: 105, Id_Contrato: 7011, Tipo_Parcela: "M", Dt_Vencimento: "2024-04-10" }
];

export const NEGOCIACAO = [
  { Id_Negociacao: 3001, Id_Financiado: 9001, Id_Agrupamento: 1, Id_Cliente_Web: 501, Descricao: "Negociacao a vista com desconto" },
  { Id_Negociacao: 3002, Id_Financiado: 9002, Id_Agrupamento: 1, Id_Cliente_Web: 501, Descricao: "Parcelamento em 3x sem entrada" },
  { Id_Negociacao: 3003, Id_Financiado: 9004, Id_Agrupamento: 2, Id_Cliente_Web: 501, Descricao: "Parcelamento em 6x com entrada" },
  { Id_Negociacao: 3004, Id_Financiado: 9006, Id_Agrupamento: 3, Id_Cliente_Web: 501, Descricao: "Negociacao a vista integral" },
  { Id_Negociacao: 3005, Id_Financiado: 9008, Id_Agrupamento: 4, Id_Cliente_Web: 502, Descricao: "Parcelamento em 12x atacado" },
  { Id_Negociacao: 3006, Id_Financiado: 9010, Id_Agrupamento: 5, Id_Cliente_Web: 502, Descricao: "Negociacao juridica em 4x" },
  // Negociação 3007 fica sem acordo de propósito (proposta em aberto).
  { Id_Negociacao: 3007, Id_Financiado: 9011, Id_Agrupamento: 5, Id_Cliente_Web: 502, Descricao: "Proposta em analise" }
];

export const NEGOCIACAO_PARCELA = [
  { Id_Negociacao_Parcela: 1, Id_Negociacao: 3001, Id_Parcela: 50001, Vl_Total: 1250.00, Vl_Principal: 1000.00 },
  { Id_Negociacao_Parcela: 2, Id_Negociacao: 3001, Id_Parcela: 50002, Vl_Total: 1310.00, Vl_Principal: 1000.00 },
  { Id_Negociacao_Parcela: 3, Id_Negociacao: 3001, Id_Parcela: 50003, Vl_Total: 180.00, Vl_Principal: 0.00 },
  { Id_Negociacao_Parcela: 4, Id_Negociacao: 3002, Id_Parcela: 50004, Vl_Total: 2400.00, Vl_Principal: 2000.00 },
  { Id_Negociacao_Parcela: 5, Id_Negociacao: 3002, Id_Parcela: 50005, Vl_Total: 2480.00, Vl_Principal: 2000.00 },
  { Id_Negociacao_Parcela: 6, Id_Negociacao: 3003, Id_Parcela: 50007, Vl_Total: 890.00, Vl_Principal: 750.00 },
  { Id_Negociacao_Parcela: 7, Id_Negociacao: 3003, Id_Parcela: 50008, Vl_Total: 95.00, Vl_Principal: 0.00 },
  { Id_Negociacao_Parcela: 8, Id_Negociacao: 3004, Id_Parcela: 50010, Vl_Total: 640.00, Vl_Principal: 550.00 },
  { Id_Negociacao_Parcela: 9, Id_Negociacao: 3004, Id_Parcela: 50011, Vl_Total: 660.00, Vl_Principal: 550.00 },
  { Id_Negociacao_Parcela: 10, Id_Negociacao: 3005, Id_Parcela: 50013, Vl_Total: 12500.00, Vl_Principal: 10000.00 },
  { Id_Negociacao_Parcela: 11, Id_Negociacao: 3005, Id_Parcela: 50014, Vl_Total: 1900.00, Vl_Principal: 0.00 },
  { Id_Negociacao_Parcela: 12, Id_Negociacao: 3006, Id_Parcela: 50016, Vl_Total: 3200.00, Vl_Principal: 2800.00 },
  { Id_Negociacao_Parcela: 13, Id_Negociacao: 3006, Id_Parcela: 50017, Vl_Total: 3300.00, Vl_Principal: 2800.00 },
  { Id_Negociacao_Parcela: 14, Id_Negociacao: 3006, Id_Parcela: 50018, Vl_Total: 3400.00, Vl_Principal: 2800.00 }
];

export const ACORDO = [
  { Id_Acordo: 4001, Id_Negociacao: 3001, Id_Agrupamento: 1, Id_Cliente_Web: 501, Dt_Acordo: "2024-02-01" },
  { Id_Acordo: 4002, Id_Negociacao: 3002, Id_Agrupamento: 1, Id_Cliente_Web: 501, Dt_Acordo: "2024-02-08" },
  { Id_Acordo: 4003, Id_Negociacao: 3003, Id_Agrupamento: 2, Id_Cliente_Web: 501, Dt_Acordo: "2024-02-20" },
  { Id_Acordo: 4004, Id_Negociacao: 3004, Id_Agrupamento: 3, Id_Cliente_Web: 501, Dt_Acordo: "2024-03-02" },
  { Id_Acordo: 4005, Id_Negociacao: 3005, Id_Agrupamento: 4, Id_Cliente_Web: 502, Dt_Acordo: "2024-03-10" },
  { Id_Acordo: 4006, Id_Negociacao: 3006, Id_Agrupamento: 5, Id_Cliente_Web: 502, Dt_Acordo: "2024-03-18" }
];

export const PARCELA_ACORDO = [
  { Id_Parcela_Acordo: 1, Id_Acordo: 4001, Nr_Parcela: 1, Nr_Plano: 1, Dt_Vencimento: "2024-02-15", Vl_Parcela: 1250.00 },
  { Id_Parcela_Acordo: 2, Id_Acordo: 4002, Nr_Parcela: 1, Nr_Plano: 1, Dt_Vencimento: "2024-02-25", Vl_Parcela: 800.00 },
  { Id_Parcela_Acordo: 3, Id_Acordo: 4002, Nr_Parcela: 2, Nr_Plano: 1, Dt_Vencimento: "2024-03-25", Vl_Parcela: 800.00 },
  { Id_Parcela_Acordo: 4, Id_Acordo: 4002, Nr_Parcela: 3, Nr_Plano: 1, Dt_Vencimento: "2024-04-25", Vl_Parcela: 800.00 },
  { Id_Parcela_Acordo: 5, Id_Acordo: 4003, Nr_Parcela: 1, Nr_Plano: 1, Dt_Vencimento: "2024-03-05", Vl_Parcela: 300.00 },
  { Id_Parcela_Acordo: 6, Id_Acordo: 4003, Nr_Parcela: 2, Nr_Plano: 1, Dt_Vencimento: "2024-04-05", Vl_Parcela: 300.00 },
  { Id_Parcela_Acordo: 7, Id_Acordo: 4003, Nr_Parcela: 3, Nr_Plano: 1, Dt_Vencimento: "2024-05-05", Vl_Parcela: 300.00 },
  { Id_Parcela_Acordo: 8, Id_Acordo: 4004, Nr_Parcela: 1, Nr_Plano: 1, Dt_Vencimento: "2024-03-15", Vl_Parcela: 1300.00 },
  { Id_Parcela_Acordo: 9, Id_Acordo: 4005, Nr_Parcela: 1, Nr_Plano: 2, Dt_Vencimento: "2024-03-25", Vl_Parcela: 1200.00 },
  { Id_Parcela_Acordo: 10, Id_Acordo: 4005, Nr_Parcela: 2, Nr_Plano: 2, Dt_Vencimento: "2024-04-25", Vl_Parcela: 1200.00 },
  { Id_Parcela_Acordo: 11, Id_Acordo: 4005, Nr_Parcela: 3, Nr_Plano: 2, Dt_Vencimento: "2024-05-25", Vl_Parcela: 1200.00 },
  { Id_Parcela_Acordo: 12, Id_Acordo: 4006, Nr_Parcela: 1, Nr_Plano: 1, Dt_Vencimento: "2024-04-01", Vl_Parcela: 2500.00 },
  { Id_Parcela_Acordo: 13, Id_Acordo: 4006, Nr_Parcela: 2, Nr_Plano: 1, Dt_Vencimento: "2024-05-01", Vl_Parcela: 2500.00 }
];

export const HISTORICO = [
  { Id_Historico: 60001, Id_Cliente: 101, Id_Financiado: 9001, Id_Contrato: 7001, Id_Agrupamento: 1, Id_Parcela: 50001, Id_Ocorrencia_Sistema: 3, Dt_Historico: "2024-01-28" },
  { Id_Historico: 60002, Id_Cliente: 101, Id_Financiado: 9001, Id_Contrato: 7001, Id_Agrupamento: 1, Id_Parcela: 50001, Id_Ocorrencia_Sistema: 1, Dt_Historico: "2024-02-01" },
  { Id_Historico: 60003, Id_Cliente: 101, Id_Financiado: 9001, Id_Contrato: 7001, Id_Agrupamento: 1, Id_Parcela: 50001, Id_Ocorrencia_Sistema: 2, Dt_Historico: "2024-02-15" },
  { Id_Historico: 60004, Id_Cliente: 101, Id_Financiado: 9002, Id_Contrato: 7002, Id_Agrupamento: 1, Id_Parcela: 50004, Id_Ocorrencia_Sistema: 6, Dt_Historico: "2024-02-05" },
  { Id_Historico: 60005, Id_Cliente: 101, Id_Financiado: 9002, Id_Contrato: 7002, Id_Agrupamento: 1, Id_Parcela: 50004, Id_Ocorrencia_Sistema: 1, Dt_Historico: "2024-02-08" },
  { Id_Historico: 60006, Id_Cliente: 101, Id_Financiado: 9003, Id_Contrato: 7003, Id_Agrupamento: 1, Id_Parcela: 50006, Id_Ocorrencia_Sistema: 4, Dt_Historico: "2024-03-01" },
  { Id_Historico: 60007, Id_Cliente: 101, Id_Financiado: 9003, Id_Contrato: 7003, Id_Agrupamento: 1, Id_Parcela: 50006, Id_Ocorrencia_Sistema: 5, Dt_Historico: "2024-03-04" },
  { Id_Historico: 60008, Id_Cliente: 102, Id_Financiado: 9004, Id_Contrato: 7004, Id_Agrupamento: 2, Id_Parcela: 50007, Id_Ocorrencia_Sistema: 3, Dt_Historico: "2024-02-18" },
  { Id_Historico: 60009, Id_Cliente: 102, Id_Financiado: 9004, Id_Contrato: 7004, Id_Agrupamento: 2, Id_Parcela: 50007, Id_Ocorrencia_Sistema: 1, Dt_Historico: "2024-02-20" },
  { Id_Historico: 60010, Id_Cliente: 102, Id_Financiado: 9005, Id_Contrato: 7005, Id_Agrupamento: 2, Id_Parcela: 50009, Id_Ocorrencia_Sistema: 7, Dt_Historico: "2024-03-12" },
  { Id_Historico: 60011, Id_Cliente: 103, Id_Financiado: 9006, Id_Contrato: 7006, Id_Agrupamento: 3, Id_Parcela: 50010, Id_Ocorrencia_Sistema: 1, Dt_Historico: "2024-03-02" },
  { Id_Historico: 60012, Id_Cliente: 103, Id_Financiado: 9006, Id_Contrato: 7006, Id_Agrupamento: 3, Id_Parcela: 50010, Id_Ocorrencia_Sistema: 2, Dt_Historico: "2024-03-15" },
  { Id_Historico: 60013, Id_Cliente: 103, Id_Financiado: 9006, Id_Contrato: 7006, Id_Agrupamento: 3, Id_Parcela: 50010, Id_Ocorrencia_Sistema: 8, Dt_Historico: "2024-03-16" },
  { Id_Historico: 60014, Id_Cliente: 103, Id_Financiado: 9007, Id_Contrato: 7007, Id_Agrupamento: 3, Id_Parcela: 50012, Id_Ocorrencia_Sistema: 4, Dt_Historico: "2024-03-20" },
  { Id_Historico: 60015, Id_Cliente: 104, Id_Financiado: 9008, Id_Contrato: 7008, Id_Agrupamento: 4, Id_Parcela: 50013, Id_Ocorrencia_Sistema: 3, Dt_Historico: "2024-03-05" },
  { Id_Historico: 60016, Id_Cliente: 104, Id_Financiado: 9008, Id_Contrato: 7008, Id_Agrupamento: 4, Id_Parcela: 50013, Id_Ocorrencia_Sistema: 1, Dt_Historico: "2024-03-10" },
  { Id_Historico: 60017, Id_Cliente: 104, Id_Financiado: 9009, Id_Contrato: 7009, Id_Agrupamento: 4, Id_Parcela: 50015, Id_Ocorrencia_Sistema: 6, Dt_Historico: "2024-03-28" },
  { Id_Historico: 60018, Id_Cliente: 105, Id_Financiado: 9010, Id_Contrato: 7010, Id_Agrupamento: 5, Id_Parcela: 50016, Id_Ocorrencia_Sistema: 1, Dt_Historico: "2024-03-18" },
  { Id_Historico: 60019, Id_Cliente: 105, Id_Financiado: 9010, Id_Contrato: 7010, Id_Agrupamento: 5, Id_Parcela: 50016, Id_Ocorrencia_Sistema: 2, Dt_Historico: "2024-04-01" },
  { Id_Historico: 60020, Id_Cliente: 105, Id_Financiado: 9011, Id_Contrato: 7011, Id_Agrupamento: 5, Id_Parcela: 50019, Id_Ocorrencia_Sistema: 7, Dt_Historico: "2024-04-12" }
];

export const TELEFONE = [
  { Id_Telefone: 1, Id_Financiado: 9001, Id_Tipo_Telefone: 1, Ddd: "11", Fone: "988770001", Descricao: "Celular principal" },
  { Id_Telefone: 2, Id_Financiado: 9001, Id_Tipo_Telefone: 2, Ddd: "11", Fone: "35550001", Descricao: "Residencial" },
  { Id_Telefone: 3, Id_Financiado: 9002, Id_Tipo_Telefone: 1, Ddd: "11", Fone: "988770002", Descricao: "Celular principal" },
  { Id_Telefone: 4, Id_Financiado: 9003, Id_Tipo_Telefone: 1, Ddd: "21", Fone: "977660003", Descricao: "Celular principal" },
  { Id_Telefone: 5, Id_Financiado: 9004, Id_Tipo_Telefone: 1, Ddd: "31", Fone: "966550004", Descricao: "Celular principal" },
  { Id_Telefone: 6, Id_Financiado: 9004, Id_Tipo_Telefone: 3, Ddd: "31", Fone: "34440004", Descricao: "Comercial" },
  { Id_Telefone: 7, Id_Financiado: 9006, Id_Tipo_Telefone: 1, Ddd: "41", Fone: "955440006", Descricao: "Celular principal" },
  { Id_Telefone: 8, Id_Financiado: 9008, Id_Tipo_Telefone: 3, Ddd: "51", Fone: "33330008", Descricao: "Comercial" },
  { Id_Telefone: 9, Id_Financiado: 9010, Id_Tipo_Telefone: 1, Ddd: "61", Fone: "944330010", Descricao: "Celular principal" },
  { Id_Telefone: 10, Id_Financiado: 9011, Id_Tipo_Telefone: 1, Ddd: "62", Fone: "933220011", Descricao: "Celular principal" }
];

export const EMAIL = [
  { Id_Email: 1, Id_Financiado: 9001, Endereco_Email: "ana.moreira@exemplo-ficticio.test", Status_Email: "VALIDO", Contato: "ANA BEATRIZ MOREIRA", Id_Tipo_Email: 1, Origem: "CADASTRO" },
  { Id_Email: 2, Id_Financiado: 9002, Endereco_Email: "carlos.ramos@exemplo-ficticio.test", Status_Email: "VALIDO", Contato: "CARLOS EDUARDO RAMOS", Id_Tipo_Email: 1, Origem: "PORTAL" },
  { Id_Email: 3, Id_Financiado: 9003, Endereco_Email: "daniela.lopes@exemplo-ficticio.test", Status_Email: "INVALIDO", Contato: "DANIELA CRISTINA LOPES", Id_Tipo_Email: 1, Origem: "CADASTRO" },
  { Id_Email: 4, Id_Financiado: 9004, Endereco_Email: "eduardo.pires@exemplo-ficticio.test", Status_Email: "VALIDO", Contato: "EDUARDO NASCIMENTO PIRES", Id_Tipo_Email: 2, Origem: "ENRIQUECIMENTO" },
  { Id_Email: 5, Id_Financiado: 9006, Endereco_Email: "gabriel.soares@exemplo-ficticio.test", Status_Email: "VALIDO", Contato: "GABRIEL HENRIQUE SOARES", Id_Tipo_Email: 1, Origem: "CADASTRO" },
  { Id_Email: 6, Id_Financiado: 9008, Endereco_Email: "contato@mercearia-ficticia.test", Status_Email: "VALIDO", Contato: "SETOR FINANCEIRO", Id_Tipo_Email: 3, Origem: "CADASTRO" },
  { Id_Email: 7, Id_Financiado: 9010, Endereco_Email: "igor.souza@exemplo-ficticio.test", Status_Email: "BOUNCE", Contato: "IGOR PACHECO DE SOUZA", Id_Tipo_Email: 1, Origem: "PORTAL" }
];

export const ENDERECO = [
  { Id_Endereco: 1, Id_Financiado: 9001, Tipo_Endereco: "RES", Tipo_Status: "ATIVO", Logradouro: "Rua das Acacias", Numero: "150", Complemento: "Apto 42" },
  { Id_Endereco: 2, Id_Financiado: 9002, Tipo_Endereco: "RES", Tipo_Status: "ATIVO", Logradouro: "Av. dos Ipes", Numero: "980", Complemento: "" },
  { Id_Endereco: 3, Id_Financiado: 9003, Tipo_Endereco: "RES", Tipo_Status: "INATIVO", Logradouro: "Rua do Bosque", Numero: "77", Complemento: "Casa 2" },
  { Id_Endereco: 4, Id_Financiado: 9004, Tipo_Endereco: "COM", Tipo_Status: "ATIVO", Logradouro: "Av. Industrial", Numero: "3400", Complemento: "Galpao 5" },
  { Id_Endereco: 5, Id_Financiado: 9006, Tipo_Endereco: "RES", Tipo_Status: "ATIVO", Logradouro: "Rua Sete de Abril", Numero: "220", Complemento: "" },
  { Id_Endereco: 6, Id_Financiado: 9008, Tipo_Endereco: "COM", Tipo_Status: "ATIVO", Logradouro: "Rua do Mercado", Numero: "12", Complemento: "Loja A" },
  { Id_Endereco: 7, Id_Financiado: 9010, Tipo_Endereco: "RES", Tipo_Status: "ATIVO", Logradouro: "Quadra 12 Conjunto B", Numero: "8", Complemento: "" }
];

/* ---------------------------------------------------------------------
   Metadados do schema - usados pelo navegador de tabelas da UI
   (nome da tabela, origem no banco real, o que ela guarda, colunas e
   chaves). Fonte única: quem renderiza schema lê daqui, não duplica.
   --------------------------------------------------------------------- */

export const DATACOB_SCHEMA = [
  {
    tabela: "Grupo", origem: "Par", dados: GRUPO,
    descricao: "Carteira de cobrança: define o estágio da dívida e como os itens são agrupados.",
    pk: "Id_Grupo", fks: [],
    colunas: ["Id_Grupo", "Descricao", "Id_Rotina_Sistema", "Id_Cliente_Web", "Modo_Agrupamento", "Retorno_Automatico_Na_Fila"]
  },
  {
    tabela: "Cliente", origem: "Par", dados: CLIENTE,
    descricao: "O credor/contratante da cobrança (quem contrata o serviço), vinculado a um Grupo.",
    pk: "Id_Cliente", fks: [{ coluna: "Id_Grupo", referencia: "Grupo.Id_Grupo" }],
    colunas: ["Id_Cliente", "Id_Grupo", "Razao", "Nome_Res", "Endereco", "Numero"]
  },
  {
    tabela: "Financiado", origem: "Cob", dados: FINANCIADO,
    descricao: "A pessoa ou empresa devedora. É a partir daqui que saem telefones, e-mails e endereços.",
    pk: "Id_Financiado", fks: [{ coluna: "Id_Cliente", referencia: "Cliente.Id_Cliente" }],
    colunas: ["Id_Financiado", "Id_Cliente", "Id_Cliente_Web", "Cpfcnpj", "Financiado_Chave", "Nome"]
  },
  {
    tabela: "Contrato", origem: "Cob", dados: CONTRATO,
    descricao: "O contrato em cobrança, ligando o devedor (Financiado) ao credor (Cliente) e à carteira (Grupo).",
    pk: "Id_Contrato",
    fks: [
      { coluna: "Id_Cliente", referencia: "Cliente.Id_Cliente" },
      { coluna: "Id_Grupo", referencia: "Grupo.Id_Grupo" },
      { coluna: "Id_Financiado", referencia: "Financiado.Id_Financiado" }
    ],
    colunas: ["Id_Contrato", "Id_Cliente", "Id_Grupo", "Id_Financiado", "Id_Cliente_Web", "Numero_Contrato"]
  },
  {
    tabela: "Parcela", origem: "Cob", dados: PARCELA,
    descricao: "As parcelas originais do contrato. Tipo_Parcela: P = principal, J = juros, M = multa/encargo.",
    pk: "Id_Parcela",
    fks: [
      { coluna: "Id_Cliente", referencia: "Cliente.Id_Cliente" },
      { coluna: "Id_Contrato", referencia: "Contrato.Id_Contrato" }
    ],
    colunas: ["Id_Parcela", "Id_Cliente", "Id_Contrato", "Tipo_Parcela", "Dt_Vencimento"]
  },
  {
    tabela: "Negociacao", origem: "Cob", dados: NEGOCIACAO,
    descricao: "Uma proposta de negociação feita ao devedor. Pode existir sem virar acordo.",
    pk: "Id_Negociacao", fks: [{ coluna: "Id_Financiado", referencia: "Financiado.Id_Financiado" }],
    colunas: ["Id_Negociacao", "Id_Financiado", "Id_Agrupamento", "Id_Cliente_Web", "Descricao"]
  },
  {
    tabela: "Negociacao_Parcela", origem: "Cob", dados: NEGOCIACAO_PARCELA,
    descricao: "Quais parcelas entraram na negociação e por quanto (Vl_Total inclui encargos; Vl_Principal, não).",
    pk: "Id_Negociacao_Parcela",
    fks: [
      { coluna: "Id_Negociacao", referencia: "Negociacao.Id_Negociacao" },
      { coluna: "Id_Parcela", referencia: "Parcela.Id_Parcela" }
    ],
    colunas: ["Id_Negociacao_Parcela", "Id_Negociacao", "Id_Parcela", "Vl_Total", "Vl_Principal"]
  },
  {
    tabela: "Acordo", origem: "Cob", dados: ACORDO,
    descricao: "A negociação que foi fechada de fato, com data do acordo.",
    pk: "Id_Acordo", fks: [{ coluna: "Id_Negociacao", referencia: "Negociacao.Id_Negociacao" }],
    colunas: ["Id_Acordo", "Id_Negociacao", "Id_Agrupamento", "Id_Cliente_Web", "Dt_Acordo"]
  },
  {
    tabela: "Parcela_Acordo", origem: "Cob", dados: PARCELA_ACORDO,
    descricao: "As parcelas do acordo fechado (o plano de pagamento combinado).",
    pk: "Id_Parcela_Acordo", fks: [{ coluna: "Id_Acordo", referencia: "Acordo.Id_Acordo" }],
    colunas: ["Id_Parcela_Acordo", "Id_Acordo", "Nr_Parcela", "Nr_Plano", "Dt_Vencimento", "Vl_Parcela"]
  },
  {
    tabela: "Historico", origem: "Cob", dados: HISTORICO,
    descricao: "Trilha de ações/contatos da cobrança. Cada linha aponta para um código de ocorrência.",
    pk: "Id_Historico",
    fks: [
      { coluna: "Id_Cliente", referencia: "Cliente.Id_Cliente" },
      { coluna: "Id_Financiado", referencia: "Financiado.Id_Financiado" },
      { coluna: "Id_Contrato", referencia: "Contrato.Id_Contrato" },
      { coluna: "Id_Parcela", referencia: "Parcela.Id_Parcela" },
      { coluna: "Id_Ocorrencia_Sistema", referencia: "Ocorrencia_Sistema.Id_Ocorrencia_Sistema" }
    ],
    colunas: ["Id_Historico", "Id_Cliente", "Id_Financiado", "Id_Contrato", "Id_Agrupamento", "Id_Parcela", "Id_Ocorrencia_Sistema", "Dt_Historico"]
  },
  {
    tabela: "Ocorrencia_Sistema", origem: "Par", dados: OCORRENCIA_SISTEMA,
    descricao: "Tabela de domínio dos códigos de ocorrência usados no Historico (ACO, PGT, CPC...).",
    pk: "Id_Ocorrencia_Sistema", fks: [],
    colunas: ["Id_Ocorrencia_Sistema", "Cod_Ocorr_Sistema", "Descricao", "Compl_Ocorr", "Tipo_Compl", "Tam_Compl"]
  },
  {
    tabela: "Telefone", origem: "Cob", dados: TELEFONE,
    descricao: "Telefones do devedor. Um Financiado pode ter vários.",
    pk: "Id_Telefone", fks: [{ coluna: "Id_Financiado", referencia: "Financiado.Id_Financiado" }],
    colunas: ["Id_Telefone", "Id_Financiado", "Id_Tipo_Telefone", "Ddd", "Fone", "Descricao"]
  },
  {
    tabela: "Email", origem: "Cob", dados: EMAIL,
    descricao: "E-mails do devedor, com status de validade (usado nas réguas de e-mail).",
    pk: "Id_Email", fks: [{ coluna: "Id_Financiado", referencia: "Financiado.Id_Financiado" }],
    colunas: ["Id_Email", "Id_Financiado", "Endereco_Email", "Status_Email", "Contato", "Id_Tipo_Email", "Origem"]
  },
  {
    tabela: "Endereco", origem: "Cob", dados: ENDERECO,
    descricao: "Endereços do devedor (residencial/comercial), com status.",
    pk: "Id_Endereco", fks: [{ coluna: "Id_Financiado", referencia: "Financiado.Id_Financiado" }],
    colunas: ["Id_Endereco", "Id_Financiado", "Tipo_Endereco", "Tipo_Status", "Logradouro", "Numero", "Complemento"]
  }
];

/* ---------------------------------------------------------------------
   Consultas de exemplo - servem de ponto de partida no playground.
   Todas rodam contra o dataset acima.
   --------------------------------------------------------------------- */

export const CONSULTAS_EXEMPLO = [
  {
    id: "carteira-por-grupo",
    titulo: "Contratos por carteira (GROUP BY)",
    descricao: "Quantos contratos cada carteira tem, da maior para a menor.",
    sql: `SELECT g.Descricao AS Carteira,
       COUNT(c.Id_Contrato) AS Contratos
  FROM Contrato c
  JOIN Grupo g ON g.Id_Grupo = c.Id_Grupo
 GROUP BY g.Descricao
 ORDER BY Contratos DESC;`
  },
  {
    id: "devedor-contrato-credor",
    titulo: "Devedor + contrato + credor (JOIN de 3 tabelas)",
    descricao: "O caminho mais comum no DataCob: quem deve, em qual contrato, para qual credor.",
    sql: `SELECT f.Nome AS Devedor,
       ct.Numero_Contrato,
       cl.Nome_Res AS Credor
  FROM Financiado f
  JOIN Contrato ct ON ct.Id_Financiado = f.Id_Financiado
  JOIN Cliente cl  ON cl.Id_Cliente = ct.Id_Cliente
 ORDER BY f.Nome;`
  },
  {
    id: "financiado-sem-contrato",
    titulo: "Devedores sem contrato (LEFT JOIN + IS NULL)",
    descricao: "Padrão clássico para achar cadastro órfão: o LEFT JOIN traz a linha e o IS NULL filtra o que não casou.",
    sql: `SELECT f.Id_Financiado, f.Nome
  FROM Financiado f
  LEFT JOIN Contrato ct ON ct.Id_Financiado = f.Id_Financiado
 WHERE ct.Id_Contrato IS NULL;`
  },
  {
    id: "acordos-valor",
    titulo: "Valor total por acordo (SUM + JOIN)",
    descricao: "Soma as parcelas de cada acordo fechado e mostra quem é o devedor.",
    sql: `SELECT a.Id_Acordo,
       f.Nome AS Devedor,
       a.Dt_Acordo,
       COUNT(pa.Id_Parcela_Acordo) AS Qtd_Parcelas,
       SUM(pa.Vl_Parcela) AS Valor_Acordo
  FROM Acordo a
  JOIN Negociacao n     ON n.Id_Negociacao = a.Id_Negociacao
  JOIN Financiado f     ON f.Id_Financiado = n.Id_Financiado
  JOIN Parcela_Acordo pa ON pa.Id_Acordo = a.Id_Acordo
 GROUP BY a.Id_Acordo, f.Nome, a.Dt_Acordo
 ORDER BY Valor_Acordo DESC;`
  },
  {
    id: "negociacao-sem-acordo",
    titulo: "Negociação que não virou acordo",
    descricao: "Proposta em aberto: existe negociação, mas nenhum acordo correspondente.",
    sql: `SELECT n.Id_Negociacao, n.Descricao, f.Nome AS Devedor
  FROM Negociacao n
  JOIN Financiado f ON f.Id_Financiado = n.Id_Financiado
  LEFT JOIN Acordo a ON a.Id_Negociacao = n.Id_Negociacao
 WHERE a.Id_Acordo IS NULL;`
  },
  {
    id: "ocorrencias-mais-usadas",
    titulo: "Ocorrências mais registradas (GROUP BY + tabela de domínio)",
    descricao: "Junta o Historico com a tabela de domínio para mostrar a descrição em vez do código.",
    sql: `SELECT os.Cod_Ocorr_Sistema AS Codigo,
       os.Descricao,
       COUNT(h.Id_Historico) AS Registros
  FROM Historico h
  JOIN Ocorrencia_Sistema os ON os.Id_Ocorrencia_Sistema = h.Id_Ocorrencia_Sistema
 GROUP BY os.Cod_Ocorr_Sistema, os.Descricao
 ORDER BY Registros DESC;`
  },
  {
    id: "contato-devedor",
    titulo: "Ficha de contato do devedor (vários LEFT JOIN)",
    descricao: "Telefone e e-mail podem não existir — por isso LEFT JOIN, senão o devedor desaparece do resultado.",
    sql: `SELECT f.Nome AS Devedor,
       t.Ddd, t.Fone,
       e.Endereco_Email, e.Status_Email
  FROM Financiado f
  LEFT JOIN Telefone t ON t.Id_Financiado = f.Id_Financiado
  LEFT JOIN Email e    ON e.Id_Financiado = f.Id_Financiado
 ORDER BY f.Nome;`
  },
  {
    id: "parcelas-por-tipo",
    titulo: "Parcelas por tipo (CASE + GROUP BY)",
    descricao: "Traduz o código de Tipo_Parcela para texto legível no próprio SELECT.",
    sql: `SELECT CASE p.Tipo_Parcela
         WHEN 'P' THEN 'Principal'
         WHEN 'J' THEN 'Juros'
         WHEN 'M' THEN 'Multa/Encargo'
         ELSE 'Outro'
       END AS Tipo,
       COUNT(*) AS Parcelas
  FROM Parcela p
 GROUP BY p.Tipo_Parcela
 ORDER BY Parcelas DESC;`
  }
];
