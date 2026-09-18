/* =====================================================================
   Serasa - tabelas de codigos (erros e motivos de baixa)

   ARQUIVO GERADO a partir das fontes recebidas do Serasa (aba
   "RK_Tabela_Erros" da planilha de validacao do PEFIN e o documento de
   "Motivo de Baixa"). Nao editar a mao: se a Serasa publicar uma tabela
   nova, regerar - o gerador confere as contagens (197 erros, 45 motivos)
   e algumas linhas-chave, entao fonte trocada quebra em voz alta.

   ERROS: vem preenchidos pela Serasa no campo "Codigos de erro" do
   arquivo de RETORNO, em grupos de 3 digitos. O TAMANHO DO CAMPO MUDA
   POR LAYOUT - no PEFIN sao 60 posicoes (534-593, ate 20 codigos) e no
   REFIN sao 45 (549-593, ate 15). Por isso decodificarErros() percorre o
   tamanho do texto que recebe em vez de assumir 60: cada layout entrega
   o proprio pedaco. Registro aceito volta com o campo vazio.
   `retorno` = o codigo aparece no arquivo de retorno (rejeicao);
   `informacional` = o codigo e apenas informativo, nao rejeita. Na fonte,
   160 codigos estao marcados como retorno, 35 como informacional e 2
   (035 e 036, "NATUREZA INVALIDA") vieram sem marca nenhuma - ficaram
   com os dois campos em false por isso, nao por decisao nossa.

   MOTIVOS DE BAIXA: campo "Motivo da baixa" (posicoes 49-50), obrigatorio
   quando a operacao e E (exclusao). `soSerasa` marca os codigos de uso
   exclusivo da Serasa - o credor nao envia esses.

   NAO ESTA AQUI: a tabela de "natureza da operacao" (posicoes 25-27). As
   planilhas a tratam como "tabela anexa" e essa anexa nao veio; as unicas
   naturezas que aparecem nas fontes sao as das amostras (AG no PEFIN, CD
   no REFIN) e as citadas em observacoes (DC, DE). Preferimos deixar o
   campo livre na UI a publicar uma tabela adivinhada.
   ===================================================================== */

"use strict";

/* Codigos de erro do retorno: { cod, desc, retorno, informacional } */
export const ERROS = [
  { cod: "000", desc: "REGISTRO AR - ASSINADO", retorno: false, informacional: true },
  { cod: "002", desc: "PRIMEIRO REGISTRO NAO E HEADER/SEQUENCIA DIFERENTE DE 1", retorno: true, informacional: false },
  { cod: "003", desc: "REGISTRO DIFERENTE DE 0, 1 E 9", retorno: true, informacional: false },
  { cod: "004", desc: "REGISTRO FORA DE SEQUENCIA", retorno: true, informacional: false },
  { cod: "005", desc: "REGISTRO TRAILLER NAO INFORMADO", retorno: true, informacional: false },
  { cod: "008", desc: "CODIGO DE OPERACAO DIFERENTE DE E, I", retorno: true, informacional: false },
  { cod: "009", desc: "TIPO DE PESSOA PRINCIPAL DIFERENTE DE F, J", retorno: true, informacional: false },
  { cod: "010", desc: "TIPO DE PESSOA COOBRIGADO DIFERENTE DE F, J", retorno: true, informacional: false },
  { cod: "011", desc: "NOME INVALIDO", retorno: true, informacional: false },
  { cod: "012", desc: "NOME NAO PODE SER BRANCOS", retorno: true, informacional: false },
  { cod: "013", desc: "DATA DO HEADER INVALIDA", retorno: true, informacional: false },
  { cod: "014", desc: "DATA DA OCORRENCIA INVALIDA", retorno: true, informacional: false },
  { cod: "016", desc: "DATA DA OCORRENCIA MAIOR QUE A ATUAL", retorno: true, informacional: false },
  { cod: "017", desc: "DATA DA OCORRENCIA JA DECURSADA", retorno: true, informacional: false },
  { cod: "018", desc: "IDENTIFICACAO DO ARQUIVO INVALIDA", retorno: true, informacional: false },
  { cod: "019", desc: "REMESSA NAO POSTERIOR A ULTIMA", retorno: true, informacional: false },
  { cod: "020", desc: "REMESSA NAO NUMERICA OU IGUAL A ZERO", retorno: true, informacional: false },
  { cod: "021", desc: "CAMPO DE RECEBIMENTO DA REMESSA DIFERENTE DE 'E'", retorno: true, informacional: false },
  { cod: "022", desc: "EXCLUSAO PARA REGISTRO INEXISTENTE", retorno: true, informacional: false },
  { cod: "024", desc: "CNPJ DO HEADER INVALIDO", retorno: true, informacional: false },
  { cod: "025", desc: "CNPJ NAO CADASTRADO NO SISTEMA (TABELA DE REMESSA)", retorno: true, informacional: false },
  { cod: "028", desc: "DOCUMENTO DO PRINCIPAL NAO NUMERICO", retorno: true, informacional: false },
  { cod: "029", desc: "DOCUMENTO DO PRINCIPAL INVALIDO", retorno: true, informacional: false },
  { cod: "030", desc: "DOCUMENTO DO COOBRIGADO NAO NUMERICO", retorno: true, informacional: false },
  { cod: "031", desc: "DOCUMENTO DO COOBRIGADO INVALIDO", retorno: true, informacional: false },
  { cod: "033", desc: "TRAILLER FORA DE SEQUENCIA", retorno: true, informacional: false },
  { cod: "034", desc: "SEQUENCIA NAO NUMERICA", retorno: true, informacional: false },
  { cod: "035", desc: "NATUREZA INVALIDA", retorno: false, informacional: false },
  { cod: "036", desc: "NATUREZA INVALIDA PARA O CNPJ INFORMADO", retorno: false, informacional: false },
  { cod: "040", desc: "REG. NAO ATUALIZADO. ERRO NO PRINCIPAL OU COOBRIGADO DA OCORRENCIA", retorno: true, informacional: false },
  { cod: "044", desc: "AGENCIA INVALIDA", retorno: true, informacional: false },
  { cod: "047", desc: "CONTA NAO NUMERICA", retorno: true, informacional: false },
  { cod: "051", desc: "TIPO DE PARTICIPANTE DO DENUNCIADO INVALIDO", retorno: true, informacional: false },
  { cod: "052", desc: "MEIO DE COMUNICACAO INVALIDO", retorno: true, informacional: false },
  { cod: "053", desc: "TIPO DE MOVIMENTO INVALIDO", retorno: true, informacional: false },
  { cod: "057", desc: "VALOR NAO NUMERICO", retorno: true, informacional: false },
  { cod: "059", desc: "INCLUSAO PARA REGISTRO JA EXISTENTE", retorno: true, informacional: false },
  { cod: "064", desc: "CONTA INVALIDA", retorno: true, informacional: false },
  { cod: "065", desc: "CHEQUE INVALIDO", retorno: true, informacional: false },
  { cod: "072", desc: "ALINEA INVALIDA", retorno: true, informacional: false },
  { cod: "081", desc: "REGISTRO APOS TRAILLER", retorno: true, informacional: false },
  { cod: "085", desc: "NUMERO DO CONTRATO/TITULO INVALIDO", retorno: true, informacional: false },
  { cod: "089", desc: "EMPRESA NAO PARTICIPANTE DO CONVENIO", retorno: true, informacional: false },
  { cod: "102", desc: "NUMERO DO CONTRATO/TITULO EH OBRIGATORIO", retorno: true, informacional: false },
  { cod: "103", desc: "TIPO DE DOCUMENTO INVALIDO", retorno: true, informacional: false },
  { cod: "105", desc: "INCLUSAO BLOQUEADA FACE A DETERMINACAO ADMINISTRATIVA", retorno: true, informacional: false },
  { cod: "106", desc: "MOVIMENTO APOS RESCISAO DE CONTRATO DO CONVENIO", retorno: true, informacional: false },
  { cod: "109", desc: "FALTA ENDERECO", retorno: true, informacional: false },
  { cod: "111", desc: "FALTA UF DO ENDERECO", retorno: true, informacional: false },
  { cod: "112", desc: "FALTA CEP DO ENDERECO", retorno: true, informacional: false },
  { cod: "113", desc: "FALTA INFORMACAO TIPO DE PESSOA", retorno: true, informacional: false },
  { cod: "115", desc: "TIPO DE PESSOA DO PRINCIPAL DIFERENTE DE F", retorno: true, informacional: false },
  { cod: "116", desc: "TIPO DE PESSOA DO COOBRIGADO DIFERENTE DE F", retorno: true, informacional: false },
  { cod: "119", desc: "CEP DO ENDERECO INVALIDO", retorno: true, informacional: false },
  { cod: "121", desc: "DATA DE NASCIMENTO INFERIOR A 18 ANOS", retorno: true, informacional: false },
  { cod: "142", desc: "BANCO NAO TRABALHA COM CONTA CORRENTE", retorno: true, informacional: false },
  { cod: "156", desc: "DATA OCORRENCIA INFERIOR A 1 DIA", retorno: true, informacional: false },
  { cod: "166", desc: "DATA DE TERMINO DO CONTRATO INVALIDA", retorno: true, informacional: false },
  { cod: "169", desc: "AREA INFORMANTE DA REMESSA C/ ERRO. MOVIMENTO REJEITADO", retorno: true, informacional: false },
  { cod: "170", desc: "BANCO INVALIDO P/ NATUREZA DE/DC", retorno: true, informacional: false },
  { cod: "171", desc: "TIPO DE PESSOA DO CREDOR DIFERENTE DE F, J", retorno: true, informacional: false },
  { cod: "172", desc: "TIPO DE DOCUMENTO DO CREDOR INVALIDO", retorno: true, informacional: false },
  { cod: "173", desc: "DOCUMENTO DO CREDOR NAO NUMERICO", retorno: true, informacional: false },
  { cod: "174", desc: "DOCUMENTO DO CREDOR INVALIDO", retorno: true, informacional: false },
  { cod: "175", desc: "NOME DO CREDOR EH OBRIGATORIO", retorno: true, informacional: false },
  { cod: "176", desc: "NOME DO CREDOR INVALIDO", retorno: true, informacional: false },
  { cod: "200", desc: "BANCO DO HEADER INVALIDO", retorno: true, informacional: false },
  { cod: "205", desc: "BANCO NAO CADASTRADO NO SISTEMA (TABELA DE BANCOS)", retorno: true, informacional: false },
  { cod: "209", desc: "DOCUMENTO DO DEVEDOR NAO NUMERICO", retorno: true, informacional: false },
  { cod: "210", desc: "DOCUMENTO DO DEVEDOR INVALIDO", retorno: true, informacional: false },
  { cod: "219", desc: "VALOR DO TITULO INVALIDO", retorno: true, informacional: false },
  { cod: "263", desc: "IDENTIFICACAO DO ARQUIVO INVALIDA", retorno: true, informacional: false },
  { cod: "274", desc: "CNPJ NAO EXISTE NO CADASTRO DE CNPJ/CPF ATE ESTA DATA", retorno: true, informacional: false },
  { cod: "275", desc: "CPF NAO EXISTE NO CADASTRO DE CNPJ/CPF ATE ESTA DATA", retorno: true, informacional: false },
  { cod: "276", desc: "FILIAL NAO EXISTE NO CADASTRO DE CNPJ/CPF ATE ESTA DATA", retorno: true, informacional: false },
  { cod: "277", desc: "CNPJ CREDOR/CEDENTE NAO EXISTE NO CADASTRO DE CNPJ/CPF ATE ESTA DATA", retorno: true, informacional: false },
  { cod: "278", desc: "CPF CREDOR/CEDENTE NAO EXISTE NO CADASTRO DE CNPJ/CPF ATE ESTA DATA", retorno: true, informacional: false },
  { cod: "279", desc: "FILIAL CREDOR/CEDENTE NAO EXISTE CADASTRO DE CNPJ/CPF ATE ESTA DATA", retorno: true, informacional: false },
  { cod: "286", desc: "DOCUMENTO DO CREDOR IGUAL AO DO NEGATIVADO", retorno: true, informacional: false },
  { cod: "290", desc: "EXCLUSAO POR DATA DE OCORRENCIA JA DECURSADA", retorno: false, informacional: true },
  { cod: "291", desc: "EXCLUSAO POR DETERMINACAO JUDICIAL", retorno: false, informacional: true },
  { cod: "292", desc: "EXCLUSAO POR SOLICITACAO DA EMPRESA PARTICIPANTE", retorno: false, informacional: true },
  { cod: "295", desc: "RAZAO SOCIAL NAO CORRESPONDE AO CNPJ INFORMADO", retorno: true, informacional: false },
  { cod: "296", desc: "NOME NAO CORRESPONDE AO CPF INFORMADO", retorno: true, informacional: false },
  { cod: "298", desc: "COOBRIGADO NAO INCLUIDO - PRINCIPAL NAO ENCONTRADO", retorno: true, informacional: false },
  { cod: "301", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - MUDOU-SE", retorno: false, informacional: true },
  { cod: "302", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - END INSUFICIENTE", retorno: false, informacional: true },
  { cod: "303", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - NR INEXISTENTE", retorno: false, informacional: true },
  { cod: "304", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - DESCONHECIDO", retorno: false, informacional: true },
  { cod: "305", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - RECUSADO", retorno: false, informacional: true },
  { cod: "306", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - NAO PROCURADO", retorno: false, informacional: true },
  { cod: "307", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - AUSENTE", retorno: false, informacional: true },
  { cod: "308", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - FALECIDO", retorno: false, informacional: true },
  { cod: "309", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO CORREIO - INFORM P/ PORTEIRO", retorno: false, informacional: true },
  { cod: "310", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - END N CONHECIDO", retorno: false, informacional: true },
  { cod: "311", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - CEP INCORRETO", retorno: false, informacional: true },
  { cod: "312", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO DO CORREIO - N ESPECIFICADO", retorno: false, informacional: true },
  { cod: "313", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO CORREIO - CX POSTAL INEXIST", retorno: false, informacional: true },
  { cod: "314", desc: "REGISTRO ESPECIAL - DEVOLUCAO COMUNICADO CORREIO - IMOVEL INEXISTENTE", retorno: false, informacional: true },
  { cod: "315", desc: "DEVIDO A DEVOLUCAO DO COMUNICADO DO CORREIO", retorno: false, informacional: true },
  { cod: "316", desc: "REGISTRO AR - EXTRAVIADO", retorno: false, informacional: true },
  { cod: "317", desc: "REGISTRO AR - ROUBADO", retorno: false, informacional: true },
  { cod: "318", desc: "REGISTRO AR - AUSENTE - ENCAMINHADO PARA ENTREGA INTERNA", retorno: false, informacional: true },
  { cod: "319", desc: "REGISTRO AR - REFUGADO", retorno: false, informacional: true },
  { cod: "320", desc: "REGISTRO AR - ENDERECO INCORRETO", retorno: false, informacional: true },
  { cod: "321", desc: "REGISTRO AR - NAO PROCURADO – DEVOLVIDO AO REMETENTE", retorno: false, informacional: true },
  { cod: "322", desc: "REGISTRO AR - DOCUMENTACAO NAO FORNECIDA", retorno: false, informacional: true },
  { cod: "323", desc: "REGISTRO AR - MUDOU-SE", retorno: false, informacional: true },
  { cod: "324", desc: "REGISTRO AR - DESCONHECIDO", retorno: false, informacional: true },
  { cod: "325", desc: "REGISTRO AR - RECUSADO", retorno: false, informacional: true },
  { cod: "326", desc: "REGISTRO AR - ENDERECO INSUFICIENTE", retorno: false, informacional: true },
  { cod: "327", desc: "REGISTRO AR - NAO EXISTE O NUMERO INDICADO", retorno: false, informacional: true },
  { cod: "328", desc: "REGISTRO AR - AUSENTE", retorno: false, informacional: true },
  { cod: "329", desc: "REGISTRO AR - NAO PROCURADO", retorno: false, informacional: true },
  { cod: "330", desc: "REGISTRO AR - FALECIDO", retorno: false, informacional: true },
  { cod: "331", desc: "REGISTRO AR - DEVIDO A DEVOLUCAO DO COMUNICADO DO CORREIO", retorno: false, informacional: true },
  { cod: "356", desc: "DATA DO COMPROMISSO MAIOR QUE A ATUAL", retorno: true, informacional: false },
  { cod: "357", desc: "DATA DO COMPROMISSO INVALIDA", retorno: true, informacional: false },
  { cod: "358", desc: "VALOR DO COMPROMISSO NAO NUMERICO", retorno: true, informacional: false },
  { cod: "359", desc: "DDD INVALIDO", retorno: true, informacional: false },
  { cod: "360", desc: "TELEFONE INVALIDO", retorno: true, informacional: false },
  { cod: "381", desc: "INCLUSAO REJEITADA - VLR CONSID.ELEVADO - INCLUIR PELO SISCONVEM", retorno: true, informacional: false },
  { cod: "390", desc: "INCLUSAO RECUSADA - PARTICIPANTE COM LOGON BLOQUEADO", retorno: true, informacional: false },
  { cod: "391", desc: "REGISTRO REJEITADO - INCONSISTENCIA NO HEADER", retorno: true, informacional: false },
  { cod: "392", desc: "FALTA CODIGO CLIENTE NA RSREMESSA OU CODIGO NAO TEM 5 CARACTERE", retorno: true, informacional: false },
  { cod: "394", desc: "CNPJ NAO CORRESPONDE AO CODIGO DE CLIENTE INFORMADO", retorno: true, informacional: false },
  { cod: "396", desc: "INCLUSAO REJEITADA-VLR.CONS.ELEVADO-NEGAT.PRIMARIA-INCL.SISCONVEM", retorno: true, informacional: false },
  { cod: "488", desc: "PARTICIPANTE NAO POSSUI PROCURACAO DO CREDOR", retorno: true, informacional: false },
  { cod: "489", desc: "UF DO RG INVALIDO", retorno: true, informacional: false },
  { cod: "490", desc: "FALTAM DADOS CADASTRAIS DO CREDOR DA DIVIDA", retorno: true, informacional: false },
  { cod: "491", desc: "MUNICIPIO NAO CORRESPONDE AO CEP E/OU UF INFORMADO", retorno: true, informacional: false },
  { cod: "572", desc: "EXISTEM DADOS COMPLEMENTARES MAS O INDICATIVO NÃO FOI INFORMADO", retorno: true, informacional: false },
  { cod: "573", desc: "INDICATIVO DE DADOS COMPLEMENTARES DIFERENTE DE BRANCO, ‘S’ E ‘N’", retorno: true, informacional: false },
  { cod: "574", desc: "INDICATIVO DE DADOS COMPLEMENTARES ENVIADO, MAS SEM OS DADOS", retorno: true, informacional: false },
  { cod: "575", desc: "DATA DE OPT-IN DO E-MAIL INVALIDA", retorno: true, informacional: false },
  { cod: "576", desc: "DATA DE OPT-IN DO SMS INVALIDA", retorno: true, informacional: false },
  { cod: "600", desc: "MENSAGEM NAO INFORMADA PELO GERENCIADOR", retorno: true, informacional: false },
  { cod: "610", desc: "INCLUSAO CONDICIONADA A APRESENTACAO DE DOCTO DA DIVIDA", retorno: true, informacional: false },
  { cod: "650", desc: "CODIGO DO BANCO INVALIDO", retorno: true, informacional: false },
  { cod: "651", desc: "BANCO NAO CADASTRADO", retorno: true, informacional: false },
  { cod: "652", desc: "DIGITO DO CODIGO DO BANCO INVALIDO", retorno: true, informacional: false },
  { cod: "653", desc: "NOME DO BANCO NAO INFORMADO", retorno: true, informacional: false },
  { cod: "654", desc: "CARACTERES DA LINHA DIGITAVEL INVALIDA", retorno: true, informacional: false },
  { cod: "655", desc: "PRIMEIRO DIGITO DA LINHA DIGITAVEL DIVERGENTE", retorno: true, informacional: false },
  { cod: "656", desc: "SEGUNDO DIGITO DA LINHA DIGITAVEL DIVERGENTE", retorno: true, informacional: false },
  { cod: "657", desc: "TERCEIRO DIGITO DA LINHA DIGITAVEL DIVERGENTE", retorno: true, informacional: false },
  { cod: "658", desc: "QUARTO DIGITO DA LINHA DIGITAVEL DIVERGENTE", retorno: true, informacional: false },
  { cod: "659", desc: "TEXTO DO LOCAL DE PAGAMENTO NAO INFORMADO", retorno: true, informacional: false },
  { cod: "660", desc: "DATA DE VENCIMENTO DO BOLETO INVALIDA", retorno: true, informacional: false },
  { cod: "661", desc: "DATA DE VENCIMENTO DO BOLETO MENOR QUE A DATA DE HOJE", retorno: true, informacional: false },
  { cod: "662", desc: "TIPO DE PESSOA DO DOCUMENTO DO CEDENTE INVALIDO", retorno: true, informacional: false },
  { cod: "663", desc: "TIPO DE DOCUMENTO DO CEDENTE DIVERGENTE DO TIPO DE PESSOA", retorno: true, informacional: false },
  { cod: "664", desc: "DOCUMENTO DO CEDENTE INVALIDO", retorno: true, informacional: false },
  { cod: "665", desc: "DIGITO DO DOCUMENTO DO CEDENTE INVALIDO", retorno: true, informacional: false },
  { cod: "666", desc: "AGENCIA E CODIGO DO CEDENTE NAO INFORMADO", retorno: true, informacional: false },
  { cod: "667", desc: "DATA DO DOCUMENTO INVALIDA", retorno: true, informacional: false },
  { cod: "668", desc: "NUMERO DO DOCUMENTO NAO INFORMADO", retorno: true, informacional: false },
  { cod: "669", desc: "DATA DO PROCESSAMENTO INFORMADA E INVALIDA", retorno: true, informacional: false },
  { cod: "670", desc: "NOSSO NUMERO NAO INFORMADO", retorno: true, informacional: false },
  { cod: "671", desc: "QUANTIDADE DE MOEDA NAO INFORMADA", retorno: true, informacional: false },
  { cod: "672", desc: "QUANTIDADE DE MOEDA INVALIDA", retorno: true, informacional: false },
  { cod: "673", desc: "QUANTIDADE DE DECIMAIS DA MOEDA NAO INFORMADA", retorno: true, informacional: false },
  { cod: "674", desc: "QUANTIDADE DE DECIMAIS DA MOEDA INVALIDA", retorno: true, informacional: false },
  { cod: "675", desc: "QUANTIDADE DE DECIMAIS DA MOEDA MAIOR QUE 5 CASAS DECIMAIS", retorno: true, informacional: false },
  { cod: "676", desc: "VALOR DA MOEDA NAO INFORMADO", retorno: true, informacional: false },
  { cod: "677", desc: "VALOR DA MOEDA INVALIDA", retorno: true, informacional: false },
  { cod: "678", desc: "VALOR DO DOCUMENTO INVALIDO", retorno: true, informacional: false },
  { cod: "679", desc: "VALOR DE OUTROS ACRESCIMOS INVALIDO", retorno: true, informacional: false },
  { cod: "680", desc: "VALOR DE DESCONTOS/ABATIMENTO INVALIDO", retorno: true, informacional: false },
  { cod: "681", desc: "VALOR DE OUTRAS DEDUCOES INVALIDO", retorno: true, informacional: false },
  { cod: "682", desc: "VALOR DE MORA/MULTA INVALIDO", retorno: true, informacional: false },
  { cod: "683", desc: "VALOR COBRADO INVALIDO", retorno: true, informacional: false },
  { cod: "684", desc: "TIPO DE PESSOA DO DOCUMENTO DO SACADOR INVALIDO", retorno: true, informacional: false },
  { cod: "685", desc: "TIPO DE DOCUMENTO DO SACADOR DIVERGENTE DO TIPO DE PESSOA", retorno: true, informacional: false },
  { cod: "686", desc: "DOCUMENTO DO SACADOR INVALIDO", retorno: true, informacional: false },
  { cod: "687", desc: "DIGITO DO DOCUMENTO DO SACADOR INVALIDO", retorno: true, informacional: false },
  { cod: "701", desc: "EXISTE DADOS BOLETO E NAO INFORMADO INDICATIVO DE TIPO DE COMUNICADO", retorno: true, informacional: false },
  { cod: "702", desc: "INDICATIVO DE TIPO DE COMUNICADO DIFERENTE DE BRANCO OU 'B'", retorno: true, informacional: false },
  { cod: "703", desc: "TIPO DE COMUNICADO COMO BOLETO E NAO FOI INFORMADO O REG.TP 2 E/OU 3", retorno: true, informacional: false },
  { cod: "704", desc: "TIPO DE COMUNICADO BOLETO NAO PERMITIDO PARA COOBRIGADO", retorno: true, informacional: false },
  { cod: "705", desc: "REG BOLETO TIPO 2 ENCONTRADO, SEM REGISTRO TIPO 1 CORRESPONDENTE", retorno: true, informacional: false },
  { cod: "706", desc: "REG BOLETO TIPO 3 ENCONTRADO, SEM REGISTRO TIPO 1 CORRESPONDENTE", retorno: true, informacional: false },
  { cod: "707", desc: "PARTICIPANTE NAO POSSUI CONTRATO PARA EMISSAO DE COMUNICADO COM BOLETO", retorno: true, informacional: false },
  { cod: "721", desc: "ENDERECO DO CEDENTE NAO CADASTRADO", retorno: true, informacional: false },
  { cod: "739", desc: "PARTICIPANTE NAO POSSUI CONTRATO PARA EMISSAO DE SMS.", retorno: true, informacional: false },
  { cod: "740", desc: "TELEFONE CELULAR INEXISTENTE", retorno: true, informacional: false },
  { cod: "745", desc: "INCLUSOES REJEITADAS - ESCRITORIO DE COBRANCA", retorno: true, informacional: false },
  { cod: "772", desc: "INCLUSAO REJEITADA EM CUMPRIMENTO A LEI DISTRITAL 3.335/2004-DF", retorno: true, informacional: false },
  { cod: "773", desc: "INCLUSAO REJEITADA EM CUMPRIMENTO A LEI ESTADUAL 7.160/2002-ES", retorno: true, informacional: false },
  { cod: "774", desc: "INCLUSAO REJEITADA EM CUMPRIMENTO A LEI ESTADUAL 3.749/2009-MS", retorno: true, informacional: false },
  { cod: "775", desc: "INCLUSAO REJEITADA EM CUMPRIMENTO A LEI ESTADUAL 4.054/2011-MS", retorno: true, informacional: false },
  { cod: "776", desc: "INCLUSAO REJEITADA POR BLOQUEIO ADMINISTRATIVO DO CLIENTE", retorno: true, informacional: false },
  { cod: "779", desc: "INCLUSAO REJEITADA EM CUMPRIMENTO DA LEI ESTADUAL 11.150/2020-MT", retorno: true, informacional: false },
  { cod: "780", desc: "INCLUSAO REJEITADA EM CUMPRIMENTO A LEI ESTADUAL 04.793/2020-RO", retorno: true, informacional: false },
  { cod: "795", desc: "INCLUSAO REJEITADA EM CUMPRIMENTO A LEI NRO. 471/2020- JUNDIA - AL", retorno: true, informacional: false },
  { cod: "796", desc: "INCLUSAO REJEITADA EM CUMPRIMENTO A DELIBERACAO ARSESP-1.146", retorno: true, informacional: false },
  { cod: "799", desc: "MOTIVO DE BAIXA DE USO EXCLUSIVO SERASA", retorno: true, informacional: false },
];

/* Motivos de baixa: { cod, nome, desc, soSerasa } */
export const MOTIVOS_BAIXA = [
  { cod: "00", nome: "Motivo antes da implantação (passado)", desc: "Baixa ocorrida antes da implantação do campo “Motivo da Baixa “.", soSerasa: true },
  { cod: "01", nome: "Pagamento da dívida", desc: "O devedor pagou a dívida.", soSerasa: false },
  { cod: "02", nome: "Renegociação da dívida", desc: "O devedor renegociou a dívida.", soSerasa: false },
  { cod: "03", nome: "Por solicitação do cliente/Inclusão indevida", desc: "Baixa efetuada pela Serasa por solicitação da Instituição Convenia da ou pelo credor, quando houver inclusão indevida.", soSerasa: false },
  { cod: "04", nome: "Ordem Judicial", desc: "Baixa da anotação para cumprimento de determinação judicial.", soSerasa: false },
  { cod: "05", nome: "Correção de endereço", desc: "Baixa da anotação em razão da correção do endereço do devedor.", soSerasa: false },
  { cod: "06", nome: "Atualização do valor / Valorização", desc: "Baixa da anotação para correção do valor da dívida.", soSerasa: false },
  { cod: "07", nome: "Atualização do valor – Pagamento parcial", desc: "Baixa da anotação para correção do valor, em razão do pagamento parcial da dívida pelo devedor.", soSerasa: false },
  { cod: "08", nome: "Atualização de data", desc: "Baixa da anotação para correção da data do vencimento da dívida (ocorrência). Importante: o participante não pode reincluir a anotação, caso a dívida já tenha sido decursada por prazo (5 anos).", soSerasa: false },
  { cod: "09", nome: "Correção do nome", desc: "Baixa da anotação para corrigir o nome do devedor.", soSerasa: false },
  { cod: "10", nome: "Correção do número do contrato", desc: "Baixa da anotação para corrigir o número do contrato.", soSerasa: false },
  { cod: "11", nome: "Correção de vários dados", desc: "Baixa da anotação para corrigir vários dados (nome, valor, data etc).", soSerasa: false },
  { cod: "12", nome: "Baixa por perda de controle da base", desc: "Baixa da anotação por causa da perda de controle da base de dados pela Instituição Conveniada.", soSerasa: false },
  { cod: "13", nome: "Motivo não identificado", desc: "Baixa da anotação pela Instituição Conveniada sem identificar o motivo da baixa.", soSerasa: false },
  { cod: "14", nome: "Pontualização da dívida", desc: "Baixa da anotação para atualizar o valor da dívida (ex.: valor presente).", soSerasa: false },
  { cod: "15", nome: "Baixa por concessão de crédito", desc: "Baixa da anotação em razão da cessão de direitos da dívida à outra empresa credora.", soSerasa: false },
  { cod: "16", nome: "Incorporação/Mudança de titularidade", desc: "Baixa da anotação por incorporação/mudança de titularidade da dívida.", soSerasa: false },
  { cod: "17", nome: "Comunicado devolvido dos Correios", desc: "Baixa da anotação efetuada pelo credor, em razão da Carta Comunicado ter sido devolvida pelos Correios.", soSerasa: false },
  { cod: "18", nome: "Correção de dados do coobrigado/avalista", desc: "Baixa da anotação para corrigir dados do coobrigado/avalista ou este não assinou o contrato de compra/financiamento.", soSerasa: false },
  { cod: "19", nome: "Renegociação da dívida por acordo", desc: "O devedor conseguiu um acordo por motivos diversos, tais como: demissão, problemas de saúde, etc.", soSerasa: false },
  { cod: "20", nome: "Pagamento da dívida por depósito bancário", desc: "O devedor regularizou ou quitou a dívida por depósito bancário.", soSerasa: false },
  { cod: "21", nome: "Análise de documentos", desc: "Baixa da anotação enquanto os documentos são analisados em função de roubo de documentos, fraudes, perda etc.", soSerasa: false },
  { cod: "22", nome: "Correção de dados pela Loja/filial", desc: "Baixa da anotação para corrigir dados pela documentação de aquisição/ financiamento de bem.", soSerasa: false },
  { cod: "23", nome: "Pagamento da dívida por emissão de nota promissória", desc: "O devedor regularizou a dívida assumindo em troca o pagamento de uma nota promissória ou quitou parte da dívida e assumiu o pagamento de nota promissória correspondente à parte restante.", soSerasa: false },
  { cod: "24", nome: "Análise de documento por seguro", desc: "Baixa da anotação para análise de benefício adquirido pelo devedor.", soSerasa: false },
  { cod: "25", nome: "Devolução ou troca de bem financiado", desc: "Baixa da anotação em razão da devolução ou troca do bem financiado.", soSerasa: false },
  { cod: "26", nome: "E-mail não atribuído", desc: "Não foi possível atribuir e-mail ao devedor.", soSerasa: true },
  { cod: "27", nome: "E-mail não enviado", desc: "Não foi possível enviar e-mail ao devedor.", soSerasa: true },
  { cod: "28", nome: "Devedor sem SMS", desc: "Não foi possível atribuir SMS ao devedor.", soSerasa: true },
  { cod: "29", nome: "SMS não entregue", desc: "Não foi possível enviar SMS ao devedor.", soSerasa: true },
  { cod: "30", nome: "Telefone ou e-mail não atribuído", desc: "Não foi possível enviar SMS ou e-mail ao devedor.", soSerasa: true },
  { cod: "86", nome: "Dívida não comprovada", desc: "Baixa da anotação por dívida não comprovada.", soSerasa: true },
  { cod: "87", nome: "Manutenção sub judice", desc: "Anotação mantida sub judice.", soSerasa: true },
  { cod: "88", nome: "Carta/Comprovante não retornado dos Correios", desc: "Baixa da anotação efetuada pela Serasa, pois a Carta Comunicado / Comprovante de Entrega AR /SEED não retornou dos Correios.", soSerasa: true },
  { cod: "89", nome: "Motivos diversos", desc: "Baixa da anotação por outros motivos não enquadrados nos existentes.", soSerasa: true },
  { cod: "90", nome: "Falta de documentação da dívida", desc: "Baixa da anotação efetuada pela Serasa, por falta de documentação comprobatória da dívida, quando ela for solicitada e não apresentada à Serasa.", soSerasa: true },
  { cod: "91", nome: "Contestação/Declaração do interessado", desc: "Baixa da anotação efetuada pela Serasa, em razão do devedor ter apresentado contestação ou declaração que a dívida não procede.", soSerasa: true },
  { cod: "92", nome: "Aditivo contratual", desc: "Baixa da anotação efetuada pela Serasa, em razão da celebração de aditivo contratual, para um processamento específico (mudança de CNPJ, alteração da razão social etc).", soSerasa: true },
  { cod: "93", nome: "Exclusão por extinção do contrato", desc: "Baixa da anotação efetuada pela Serasa, por rescisão do contrato entre a Serasa e a Instituição Conveniada.", soSerasa: true },
  { cod: "94", nome: "Decurso de prazo especial", desc: "Baixa da anotação efetuada pela Serasa, para atender a determinações judiciais de localidades específicas.", soSerasa: true },
  { cod: "95", nome: "Comunicado devolvido dos Correios", desc: "Baixa da anotação efetuada pela Serasa, em razão da Carta Comunicado enviada ao devedor ter sido devolvida pelos Correios.", soSerasa: true },
  { cod: "96", nome: "Determinação Judicial", desc: "Baixa da anotação efetuada pela Serasa, para cumprir determinação judicial.", soSerasa: true },
  { cod: "97", nome: "Decurso de prazo", desc: "Baixa da anotação efetuada pela Serasa, por decurso de prazo (5 anos).", soSerasa: true },
  { cod: "98", nome: "Decurso de prazo contratado", desc: "Baixa da anotação efetuada pela Serasa para cumprir o prazo de decurso contratado com a Instituição Conveniada.", soSerasa: true },
  { cod: "99", nome: "Motivo da baixa não informado", desc: "Baixa da anotação pelo credor, sem identificar o motivo da baixa.", soSerasa: true },
];

/* Mapas por codigo, para a UI nao ficar varrendo array. */
export const ERROS_POR_COD = Object.fromEntries(ERROS.map((e) => [e.cod, e]));
export const MOTIVOS_POR_COD = Object.fromEntries(MOTIVOS_BAIXA.map((m) => [m.cod, m]));

/* Quebra o campo de 60 posicoes (534-593) do retorno em codigos de 3
   digitos e devolve cada um com a descricao.

   Campo todo em brancos ou todo em zeros = registro aceito, nenhum erro:
   e por isso que o teste e "tem algum digito de 1 a 9?" antes de olhar
   triplas, e que a tripla "000" e tratada como enchimento. O codigo 000
   existe na tabela ("REGISTRO AR - ASSINADO", informacional), mas nao da
   para distinguir um 000 real do preenchimento -- e como ele e apenas
   informativo, ignorar e mais seguro que inventar erro onde nao houve. */
export function decodificarErros(campo) {
  const bruto = String(campo || "");
  if (!/[1-9]/.test(bruto)) return [];

  const achados = [];
  // Percorre o tamanho real do campo (60 no PEFIN, 45 no REFIN).
  for (let i = 0; i + 3 <= bruto.length; i += 3) {
    const cod = bruto.slice(i, i + 3).trim();
    if (!cod || !/^\d{1,3}$/.test(cod)) continue;
    const chave = cod.padStart(3, "0");
    if (chave === "000") continue;
    const achado = ERROS_POR_COD[chave];
    achados.push({
      cod: chave,
      desc: achado ? achado.desc : "Codigo nao catalogado nas tabelas recebidas",
      informacional: Boolean(achado && achado.informacional)
    });
  }
  return achados;
}
