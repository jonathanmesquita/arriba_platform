// Track 7 - T-SQL SQL Server 2019 com DataCob (conteudo das 15 licoes).
//
// As licoes praticam contra o SCHEMA REAL do DataCob — as mesmas tabelas e
// colunas que o analista encontra no banco de producao (Financiado,
// Contrato, Parcela, Negociacao, Acordo, Parcela_Acordo, Historico...),
// definidas em assets/data/datacob-sandbox-schema.js.
//
// Os DADOS desse sandbox sao 100% inventados (LGPD: nenhum nome, CPF/CNPJ,
// telefone ou e-mail real) e o sandbox roda AlaSQL no navegador — NAO existe
// nenhuma conexao com o SQL Server real do DataCob. O objetivo e treinar a
// sintaxe e o modelo de dados com seguranca.
//
// ⚠️ Limites do simulador (AlaSQL) verificados na pratica: TOP, HAVING,
// DATEDIFF(DAY, a, b), YEAR/MONTH/DAY, COUNT(DISTINCT), CASE WHEN, UNION ALL
// e subqueries funcionam. NAO funcionam: COUNT(CASE WHEN ... THEN 1 END)
// (use SUM(CASE WHEN ... THEN 1 ELSE 0 END)), FORMAT() e o alias "Total"
// (palavra reservada do parser). Onde a licao ensina algo que e T-SQL valido
// mas nao roda aqui, isso esta dito em `notaSimulador`.
//
// Schema de cada licao:
// { id, secaoId, titulo, tempoMin, pontosLicao, pontosQuizBonus,
//   introducao, conceitos: [{titulo, codigo, explicacao}],
//   tryIt: {descricao, query, notaSimulador},
//   quiz: [{pergunta, opcoes, respostaIndex, explicacao}],
//   exercicios: [{enunciado, solucao}],
//   rafael }

export const TRACK_7_SECOES = [
  { id: "fundamentos", nome: "Fundamentos", licoes: ["7.1", "7.2", "7.3"] },
  { id: "joins", nome: "JOINs", licoes: ["7.4", "7.5", "7.6", "7.7"] },
  { id: "agregacao", nome: "Agregação", licoes: ["7.8", "7.9", "7.10"] },
  { id: "avancado", nome: "Avançado básico", licoes: ["7.11", "7.12", "7.13", "7.14", "7.15"] }
];

export const TRACK_7_BADGES = [
  { id: "select-master", nome: "SELECT Master", emoji: "🥉", criterio: { tipo: "licao", licaoId: "7.2" } },
  { id: "where-wizard", nome: "WHERE Wizard", emoji: "🥉", criterio: { tipo: "licao", licaoId: "7.3" } },
  { id: "join-pro", nome: "JOIN Pro", emoji: "🥈", criterio: { tipo: "licao", licaoId: "7.6" } },
  { id: "aggregation-expert", nome: "Aggregation Expert", emoji: "🥈", criterio: { tipo: "licao", licaoId: "7.10" } },
  { id: "dashboard-builder", nome: "SQL Dashboard Builder", emoji: "🥇", criterio: { tipo: "licao", licaoId: "7.15" } },
  {
    id: "data-analyst", nome: "DataCob Data Analyst", emoji: "👑",
    criterio: {
      tipo: "todasLicoes",
      licoes: ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "7.9", "7.10", "7.11", "7.12", "7.13", "7.14", "7.15"]
    }
  }
];

export const RAFAEL = {
  nome: "Rafael",
  papel: "Desenvolvedor SQL",
  cor: "#4A90E2",
  frase: "Os dados não mentem! 📊"
};

export const TRACK_7_LICOES = [
  // ===================================================================
  // SEÇÃO 1 - FUNDAMENTOS
  // ===================================================================
  {
    id: "7.1",
    secaoId: "fundamentos",
    titulo: "O modelo de dados do DataCob",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "O SQL Server 2019 guarda toda a operação de cobrança do DataCob. Antes de escrever qualquer consulta, vale entender o desenho: quem é o credor, quem é o devedor, o que é contrato, parcela, negociação e acordo. Neste sandbox você consulta as MESMAS tabelas e colunas do banco real — com dados inventados.",
    conceitos: [
      {
        titulo: "Os dois grupos de tabelas",
        codigo: "-- Par -> cadastro/parâmetros (o \"como está configurado\")\n--   Grupo               a carteira de cobrança\n--   Cliente             o credor (quem contrata a cobrança)\n--   Ocorrencia_Sistema  domínio dos códigos de ocorrência\n\n-- Cob -> cobrança (o \"que está acontecendo\")\n--   Financiado          o devedor\n--   Contrato            o contrato em cobrança\n--   Parcela             as parcelas originais do contrato\n--   Negociacao          proposta feita ao devedor\n--   Acordo              a proposta que foi fechada\n--   Parcela_Acordo      o plano de pagamento combinado\n--   Historico           trilha de contatos/ações\n--   Telefone / Email / Endereco   contatos do devedor",
        explicacao: "No banco real essas tabelas vivem em dois grupos, Par (cadastro) e Cob (cobrança). É a primeira coisa que confunde quem chega: Cliente NÃO é o devedor — Cliente é o credor, e o devedor é o Financiado."
      },
      {
        titulo: "A cadeia principal",
        codigo: "-- O caminho que quase toda consulta percorre:\n--\n--   Grupo (carteira)\n--     └─ Cliente (credor)\n--          └─ Contrato ──── Financiado (devedor)\n--               └─ Parcela\n--\n-- E o lado da negociação:\n--\n--   Financiado\n--     └─ Negociacao (proposta)\n--          └─ Acordo (fechado)\n--               └─ Parcela_Acordo (plano de pagamento)\n\n-- As chaves seguem um padrão: Id_<Tabela>\nSELECT Id_Financiado, Nome, Cpfcnpj FROM Financiado;",
        explicacao: "As chaves são previsíveis: a PK de Financiado é Id_Financiado, e quem aponta pra ela usa o mesmo nome. Saber isso já resolve metade dos JOINs que você vai escrever."
      }
    ],
    tryIt: {
      descricao: "Comece olhando os devedores cadastrados. No SQL Server real você conectaria com usuário/senha e rodaria SELECT @@VERSION; para confirmar a conexão — aqui as tabelas já estão prontas.",
      query: "SELECT Id_Financiado, Nome, Cpfcnpj FROM Financiado;",
      notaSimulador: "SELECT @@VERSION não existe neste simulador (não é um SQL Server de verdade) — no seu SQL Server real, ele mostra a versão instalada."
    },
    quiz: [
      { pergunta: "No DataCob, quem é o devedor?", opcoes: ["Cliente", "Financiado", "Grupo", "Contrato"], respostaIndex: 1, explicacao: "Financiado é o devedor. Cliente é o credor — quem contratou a cobrança." },
      { pergunta: "E a tabela Cliente representa...", opcoes: ["O devedor", "O credor/contratante da cobrança", "O operador do sistema"], respostaIndex: 1, explicacao: "Cliente é o credor. Confundir isso é o erro mais comum de quem começa no modelo do DataCob." },
      { pergunta: "O que é o Grupo?", opcoes: ["A carteira de cobrança (estágio da dívida)", "Um grupo de usuários", "Um lote de boletos"], respostaIndex: 0, explicacao: "Grupo é a carteira: define o estágio da dívida (amigável, pré-jurídico, jurídico) e como os itens são agrupados." },
      { pergunta: "Qual a diferença entre Negociacao e Acordo?", opcoes: ["São a mesma coisa", "Negociacao é a proposta; Acordo é a proposta fechada", "Acordo vem antes da Negociacao"], respostaIndex: 1, explicacao: "Pode existir Negociacao sem Acordo (proposta em aberto). O Acordo é o fechamento." },
      { pergunta: "Seguindo o padrão de nomes, qual é a chave primária de Contrato?", opcoes: ["Contrato_Id", "Id_Contrato", "PK_Contrato"], respostaIndex: 1, explicacao: "O padrão é Id_<Tabela> — e quem referencia usa o mesmo nome de coluna." }
    ],
    exercicios: [
      { enunciado: "Liste os credores (Cliente) com a razão social e o nome reduzido.", solucao: "SELECT Id_Cliente, Razao, Nome_Res FROM Cliente;" },
      { enunciado: "Conte quantas linhas existem em Financiado, Contrato e Parcela, em um único resultado (dica: UNION ALL).", solucao: "SELECT 'Financiado' AS Tabela, COUNT(*) AS Qtd FROM Financiado\nUNION ALL\nSELECT 'Contrato', COUNT(*) FROM Contrato\nUNION ALL\nSELECT 'Parcela', COUNT(*) FROM Parcela;" }
    ],
    rafael: "Bem-vindo! 🎲 Antes de sair escrevendo SELECT, você entendeu o desenho — e isso te poupa horas. Grava só isso: Cliente é o credor, Financiado é o devedor. Próxima lição: SELECT!"
  },

  {
    id: "7.2",
    secaoId: "fundamentos",
    titulo: "SELECT Básico",
    tempoMin: 25,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "SELECT é o comando mais usado em SQL. Ele significa, na prática, \"traga estes dados para mim\".",
    conceitos: [
      { titulo: "Estrutura do SELECT", codigo: "SELECT coluna1, coluna2\nFROM tabela\nWHERE condicao;", explicacao: "SELECT define o que trazer, FROM de onde, WHERE filtra quais linhas (opcional)." },
      {
        titulo: "Exemplos com as tabelas do DataCob",
        codigo: "-- Todos os devedores, todas as colunas\nSELECT * FROM Financiado;\n\n-- Só nome e documento\nSELECT Nome, Cpfcnpj FROM Financiado;\n\n-- Devedores de um credor específico\nSELECT Nome FROM Financiado WHERE Id_Cliente = 101;\n\n-- Parcelas de acordo acima de R$ 1.000\nSELECT Nr_Parcela, Vl_Parcela\nFROM Parcela_Acordo\nWHERE Vl_Parcela > 1000;",
        explicacao: "O asterisco (*) traz todas as colunas; listar colunas específicas é mais eficiente e mais legível — e em tabela grande de produção isso faz diferença real."
      }
    ],
    tryIt: {
      descricao: "Traga nome e documento dos devedores de um credor específico (Id_Cliente = 101).",
      query: "SELECT Nome, Cpfcnpj\nFROM Financiado\nWHERE Id_Cliente = 101;"
    },
    quiz: [
      { pergunta: "Qual comando traz dados de uma tabela?", opcoes: ["GET", "SELECT", "FETCH", "SHOW"], respostaIndex: 1, explicacao: "SELECT é o comando de leitura." },
      { pergunta: "O asterisco (*) em SELECT * significa o quê?", opcoes: ["Erro de sintaxe", "Todas as colunas", "Nenhuma coluna", "Apenas a primeira coluna"], respostaIndex: 1, explicacao: "* é um atalho para \"todas as colunas\"." },
      { pergunta: "WHERE filtra...", opcoes: ["Tabelas", "Linhas", "Colunas", "Bancos de dados"], respostaIndex: 1, explicacao: "WHERE decide quais linhas (registros) aparecem no resultado." },
      { pergunta: "Complete: SELECT Nome, Cpfcnpj ___ Financiado", opcoes: ["FROM", "IN", "OF", "AT"], respostaIndex: 0, explicacao: "FROM indica a tabela de origem." },
      { pergunta: "O que SELECT COUNT(*) FROM Parcela WHERE Tipo_Parcela='P' retorna?", opcoes: ["Todas as colunas das parcelas", "Um número: a quantidade de parcelas do tipo P", "Erro", "Uma lista de tipos"], respostaIndex: 1, explicacao: "COUNT(*) agrega e devolve um único número." },
      { pergunta: "SELECT é case-sensitive (diferencia maiúsculas/minúsculas)?", opcoes: ["Verdadeiro", "Falso"], respostaIndex: 1, explicacao: "select, SELECT e Select funcionam igual — palavras-chave SQL não são case-sensitive." }
    ],
    exercicios: [
      { enunciado: "Traga o número e o valor das parcelas de acordo com valor maior que 500.", solucao: "SELECT Nr_Parcela, Vl_Parcela FROM Parcela_Acordo WHERE Vl_Parcela > 500;" },
      { enunciado: "Traga todas as parcelas do tipo 'J' (juros).", solucao: "SELECT * FROM Parcela WHERE Tipo_Parcela = 'J';" },
      { enunciado: "Traga o número do contrato e o id do devedor de todos os contratos.", solucao: "SELECT Numero_Contrato, Id_Financiado FROM Contrato;" },
      { enunciado: "Traga os acordos fechados em março de 2024 (dica: Dt_Acordo está no formato 'YYYY-MM-DD').", solucao: "SELECT * FROM Acordo WHERE Dt_Acordo LIKE '2024-03%';" }
    ],
    rafael: "Excelente! 🎯 SELECT é o comando mais poderoso do SQL. Repare que você já está usando os nomes reais das tabelas — o que você escreve aqui, você escreve igual no banco de verdade. Próxima: WHERE!"
  },

  {
    id: "7.3",
    secaoId: "fundamentos",
    titulo: "WHERE & Operadores",
    tempoMin: 25,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "WHERE fica muito mais poderoso quando combinado com operadores de comparação e lógicos.",
    conceitos: [
      { titulo: "Operadores", codigo: "=     Igual\n!=    Diferente\n>     Maior que\n<     Menor que\n>=    Maior ou igual\n<=    Menor ou igual\nAND   E (as duas condições)\nOR    OU (uma das duas)\nIN    Está em uma lista\nBETWEEN  Entre dois valores\nLIKE  Contém um padrão de texto", explicacao: "Combine operadores para filtros precisos." },
      {
        titulo: "Exemplos (T-SQL real, com GETDATE())",
        codigo: "-- Parcelas já vencidas (data de hoje no servidor real)\nSELECT * FROM Parcela\nWHERE Dt_Vencimento < GETDATE();\n\n-- Só parcelas de encargo (juros ou multa)\nSELECT * FROM Parcela WHERE Tipo_Parcela IN ('J', 'M');\n\n-- Faixa de valores\nSELECT * FROM Parcela_Acordo\nWHERE Vl_Parcela BETWEEN 300 AND 1300;\n\n-- Devedor cujo nome começa com 'A'\nSELECT Nome FROM Financiado WHERE Nome LIKE 'A%';\n\n-- CNPJ (o dataset marca pessoa jurídica com 14 dígitos)\nSELECT Nome, Cpfcnpj FROM Financiado WHERE Cpfcnpj LIKE '%0001%';\n\n-- E-mails com problema\nSELECT * FROM Email\nWHERE Status_Email = 'INVALIDO' OR Status_Email = 'BOUNCE';",
        explicacao: "GETDATE() retorna a data/hora atual do servidor e funciona no seu SQL Server real. Como o dataset deste sandbox é fixo (datas de 2024), o exercício abaixo usa data fixa para o resultado ser sempre o mesmo."
      }
    ],
    tryIt: {
      descricao: "Traga as parcelas que venceram antes de 01/03/2024 (equivalente fixo ao exemplo com GETDATE() acima).",
      query: "SELECT * FROM Parcela WHERE Dt_Vencimento < '2024-03-01';",
      notaSimulador: "No SQL Server real, troque a comparação por Dt_Vencimento < GETDATE() para pegar sempre a data de hoje."
    },
    quiz: [
      { pergunta: "AND exige que...", opcoes: ["Só uma condição seja verdadeira", "As duas condições sejam verdadeiras", "Nenhuma condição seja verdadeira"], respostaIndex: 1, explicacao: "AND é uma exigência conjunta." },
      { pergunta: "Qual operador significa \"contém um padrão de texto\"?", opcoes: ["IN", "LIKE", "BETWEEN"], respostaIndex: 1, explicacao: "LIKE usa % como curinga." },
      { pergunta: "IN serve para...", opcoes: ["Comparar duas colunas", "Verificar se um valor está em uma lista", "Ordenar resultados"], respostaIndex: 1, explicacao: "IN checa pertencimento a uma lista de valores." },
      { pergunta: "SELECT * FROM Parcela WHERE Tipo_Parcela='P' AND Dt_Vencimento < '2024-02-01' tem quantas condições?", opcoes: ["1", "2", "3"], respostaIndex: 1, explicacao: "Tipo_Parcela='P' e Dt_Vencimento < '2024-02-01'." },
      { pergunta: "LIKE 'A%' encontra nomes que...", opcoes: ["Terminam com A", "Começam com A", "São exatamente 'A'"], respostaIndex: 1, explicacao: "% depois do texto = \"começa com\"." }
    ],
    exercicios: [
      { enunciado: "Traga os telefones com DDD igual a 11.", solucao: "SELECT * FROM Telefone WHERE Ddd = '11';" },
      { enunciado: "Traga os acordos fechados antes de 01/03/2024.", solucao: "SELECT * FROM Acordo WHERE Dt_Acordo < '2024-03-01';" },
      { enunciado: "Traga as parcelas do tipo 'J' ou 'M' (use IN).", solucao: "SELECT * FROM Parcela WHERE Tipo_Parcela IN ('J', 'M');" },
      { enunciado: "Traga as parcelas de acordo com valor entre 300 e 1300.", solucao: "SELECT * FROM Parcela_Acordo WHERE Vl_Parcela BETWEEN 300 AND 1300;" },
      { enunciado: "Traga os e-mails que não estão válidos (Status_Email diferente de 'VALIDO').", solucao: "SELECT * FROM Email WHERE Status_Email != 'VALIDO';" }
    ],
    rafael: "Os dados não mentem, mas você precisa perguntar certo! 📊 Filtro de e-mail inválido, por exemplo, é o tipo de consulta que resolve chamado de régua de e-mail. Próxima seção: JOINs!"
  },

  // ===================================================================
  // SEÇÃO 2 - JOINS
  // ===================================================================
  {
    id: "7.4",
    secaoId: "joins",
    titulo: "INNER JOIN",
    tempoMin: 25,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "Até agora consultamos uma tabela por vez — mas no DataCob a informação está espalhada de propósito. O nome do devedor está em Financiado, o contrato em Contrato. INNER JOIN combina linhas de duas tabelas que têm uma relação.",
    conceitos: [
      { titulo: "Estrutura do INNER JOIN", codigo: "SELECT coluna1, coluna2\nFROM tabela1 t1\nINNER JOIN tabela2 t2 ON t1.Id_Tabela1 = t2.Id_Tabela1;", explicacao: "ON define a coluna que liga as duas tabelas (a \"chave\"). INNER JOIN só traz linhas que existem nas DUAS tabelas." },
      { titulo: "Devedor + contrato", codigo: "SELECT f.Nome AS Devedor,\n       c.Numero_Contrato\nFROM Financiado f\nINNER JOIN Contrato c ON c.Id_Financiado = f.Id_Financiado;", explicacao: "Devedores cadastrados que ainda não têm contrato NÃO aparecem aqui (veja a próxima lição: LEFT JOIN)." },
      { titulo: "Contrato + credor + carteira", codigo: "SELECT c.Numero_Contrato,\n       cl.Nome_Res AS Credor,\n       g.Descricao AS Carteira\nFROM Contrato c\nINNER JOIN Cliente cl ON cl.Id_Cliente = c.Id_Cliente\nINNER JOIN Grupo g    ON g.Id_Grupo = c.Id_Grupo;", explicacao: "Um alias curto (c, cl, g) deixa a query legível — e é obrigatório quando duas tabelas têm colunas com o mesmo nome." }
    ],
    tryIt: {
      descricao: "Junte devedor com contrato usando a chave Id_Financiado.",
      query: "SELECT f.Nome AS Devedor,\n       c.Numero_Contrato\nFROM Financiado f\nINNER JOIN Contrato c ON c.Id_Financiado = f.Id_Financiado;"
    },
    quiz: [
      { pergunta: "INNER JOIN traz linhas que existem...", opcoes: ["Só na primeira tabela", "Só na segunda tabela", "Nas duas tabelas"], respostaIndex: 2, explicacao: "INNER JOIN exige correspondência nas duas tabelas." },
      { pergunta: "O que a cláusula ON define?", opcoes: ["A ordenação", "A coluna que liga as duas tabelas", "O filtro de linhas"], respostaIndex: 1, explicacao: "ON é a condição de junção (a chave)." },
      { pergunta: "Um Financiado sem contrato aparece num INNER JOIN Financiado + Contrato?", opcoes: ["Sim", "Não"], respostaIndex: 1, explicacao: "Sem correspondência em Contrato, a linha não aparece." },
      { pergunta: "Para ligar Contrato ao credor, qual coluna você usa no ON?", opcoes: ["Id_Financiado", "Id_Cliente", "Id_Grupo"], respostaIndex: 1, explicacao: "Cliente é o credor, e a ligação é Contrato.Id_Cliente = Cliente.Id_Cliente." }
    ],
    exercicios: [
      { enunciado: "Traga o número do contrato, o credor (Nome_Res) e a carteira (Grupo.Descricao) de cada contrato.", solucao: "SELECT c.Numero_Contrato, cl.Nome_Res AS Credor, g.Descricao AS Carteira\nFROM Contrato c\nINNER JOIN Cliente cl ON cl.Id_Cliente = c.Id_Cliente\nINNER JOIN Grupo g ON g.Id_Grupo = c.Id_Grupo;" },
      { enunciado: "Traga o nome do devedor e o telefone (Ddd + Fone) de quem tem telefone cadastrado.", solucao: "SELECT f.Nome AS Devedor, t.Ddd, t.Fone\nFROM Financiado f\nINNER JOIN Telefone t ON t.Id_Financiado = f.Id_Financiado;" }
    ],
    rafael: "JOIN é onde o SQL realmente brilha! 🎲 No DataCob quase nada útil sai de uma tabela só — o nome está num lugar, o contrato em outro, o valor em outro. Próxima: LEFT JOIN, pra não perder ninguém."
  },

  {
    id: "7.5",
    secaoId: "joins",
    titulo: "LEFT JOIN",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "LEFT JOIN traz TODAS as linhas da primeira tabela, mesmo quando não há correspondência na segunda — os campos da segunda vêm como NULL. É o JOIN mais usado no suporte, porque ele não esconde o registro que está faltando dado.",
    conceitos: [
      { titulo: "Devedores com ou sem contrato", codigo: "SELECT f.Nome AS Devedor,\n       c.Numero_Contrato\nFROM Financiado f\nLEFT JOIN Contrato c ON c.Id_Financiado = f.Id_Financiado;", explicacao: "Devedor cadastrado que ainda não tem contrato aparece com Numero_Contrato = NULL, em vez de simplesmente desaparecer do resultado." },
      { titulo: "O padrão \"achar o que está faltando\"", codigo: "-- Devedor cadastrado SEM nenhum contrato\nSELECT f.Id_Financiado, f.Nome\nFROM Financiado f\nLEFT JOIN Contrato c ON c.Id_Financiado = f.Id_Financiado\nWHERE c.Id_Contrato IS NULL;", explicacao: "LEFT JOIN + IS NULL é a receita para caçar cadastro órfão — devedor sem contrato, contrato sem parcela, negociação sem acordo. Vale memorizar: é uma das consultas que mais resolve chamado." }
    ],
    tryIt: {
      descricao: "Rode o LEFT JOIN e observe quem aparece com contrato em branco (NULL) — é o devedor cadastrado que ainda não tem contrato.",
      query: "SELECT f.Nome AS Devedor,\n       c.Numero_Contrato\nFROM Financiado f\nLEFT JOIN Contrato c ON c.Id_Financiado = f.Id_Financiado;"
    },
    quiz: [
      { pergunta: "LEFT JOIN garante que todas as linhas de qual tabela aparecem?", opcoes: ["Da tabela à esquerda (a primeira, no FROM)", "Da tabela à direita (a do JOIN)", "De nenhuma — só as que combinam"], respostaIndex: 0, explicacao: "\"LEFT\" refere-se à tabela do FROM." },
      { pergunta: "Quando não há correspondência, os campos da segunda tabela aparecem como...", opcoes: ["0 (zero)", "Texto vazio", "NULL"], respostaIndex: 2, explicacao: "NULL representa \"sem valor\"." },
      { pergunta: "Qual combinação acha registro órfão (sem correspondência)?", opcoes: ["INNER JOIN + WHERE", "LEFT JOIN + IS NULL", "GROUP BY + HAVING"], respostaIndex: 1, explicacao: "O LEFT JOIN traz a linha sem par, e o IS NULL filtra justamente essas." }
    ],
    exercicios: [
      { enunciado: "Conte quantos devedores NÃO têm contrato (dica: LEFT JOIN + IS NULL).", solucao: "SELECT COUNT(*) AS Sem_Contrato\nFROM Financiado f\nLEFT JOIN Contrato c ON c.Id_Financiado = f.Id_Financiado\nWHERE c.Id_Contrato IS NULL;" },
      { enunciado: "Liste as negociações que NÃO viraram acordo (proposta em aberto).", solucao: "SELECT n.Id_Negociacao, n.Descricao\nFROM Negociacao n\nLEFT JOIN Acordo a ON a.Id_Negociacao = n.Id_Negociacao\nWHERE a.Id_Acordo IS NULL;" },
      { enunciado: "Liste os devedores que não têm e-mail cadastrado.", solucao: "SELECT f.Nome AS Devedor\nFROM Financiado f\nLEFT JOIN Email e ON e.Id_Financiado = f.Id_Financiado\nWHERE e.Id_Email IS NULL;" }
    ],
    rafael: "LEFT JOIN + IS NULL é a consulta que eu mais uso pra achar bug de carga. 🎲 \"Faltou telefone de quem?\", \"que contrato subiu sem parcela?\" — sempre esse padrão."
  },

  {
    id: "7.6",
    secaoId: "joins",
    titulo: "Multiple JOINs",
    tempoMin: 25,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "Você pode encadear vários JOINs para juntar 3 ou mais tabelas — por exemplo, o fluxo completo da negociação: devedor → negociação → acordo → parcelas do acordo.",
    conceitos: [
      { titulo: "A cadeia da negociação", codigo: "SELECT f.Nome AS Devedor,\n       n.Descricao AS Negociacao,\n       a.Dt_Acordo,\n       pa.Nr_Parcela,\n       pa.Vl_Parcela\nFROM Financiado f\nJOIN Negociacao n      ON n.Id_Financiado = f.Id_Financiado\nLEFT JOIN Acordo a     ON a.Id_Negociacao = n.Id_Negociacao\nLEFT JOIN Parcela_Acordo pa ON pa.Id_Acordo = a.Id_Acordo\nORDER BY f.Nome, pa.Nr_Parcela;", explicacao: "Cada LEFT JOIN adiciona uma etapa sem perder quem ainda não chegou lá — a negociação que não virou acordo continua na lista, com Dt_Acordo em NULL." },
      { titulo: "Misturando INNER e LEFT", codigo: "-- INNER onde o dado é obrigatório, LEFT onde é opcional\nSELECT cl.Nome_Res AS Credor,\n       f.Nome AS Devedor,\n       c.Numero_Contrato,\n       t.Fone\nFROM Contrato c\nINNER JOIN Cliente cl ON cl.Id_Cliente = c.Id_Cliente\nINNER JOIN Financiado f ON f.Id_Financiado = c.Id_Financiado\nLEFT JOIN Telefone t  ON t.Id_Financiado = f.Id_Financiado;", explicacao: "Todo contrato tem credor e devedor (INNER), mas telefone é opcional (LEFT). Escolher errado aqui é o que faz uma consulta \"perder\" linhas sem explicação." }
    ],
    tryIt: {
      descricao: "Rode a cadeia completa devedor → negociação → acordo → parcela do acordo.",
      query: "SELECT f.Nome AS Devedor,\n       n.Descricao AS Negociacao,\n       a.Dt_Acordo,\n       pa.Nr_Parcela,\n       pa.Vl_Parcela\nFROM Financiado f\nJOIN Negociacao n      ON n.Id_Financiado = f.Id_Financiado\nLEFT JOIN Acordo a     ON a.Id_Negociacao = n.Id_Negociacao\nLEFT JOIN Parcela_Acordo pa ON pa.Id_Acordo = a.Id_Acordo\nORDER BY f.Nome, pa.Nr_Parcela;"
    },
    quiz: [
      { pergunta: "Quantos JOINs no máximo você pode encadear em uma query?", opcoes: ["Só 1", "Só 2", "Quantos forem necessários"], respostaIndex: 2, explicacao: "Não há limite prático — você encadeia quantas tabelas precisar." },
      { pergunta: "Por que usar LEFT JOIN na etapa do Acordo, nessa cadeia?", opcoes: ["Para não perder a negociação que ainda não virou acordo", "Porque é mais rápido", "Não faz diferença"], respostaIndex: 0, explicacao: "INNER JOIN excluiria as propostas em aberto — justamente as que você quer acompanhar." },
      { pergunta: "Numa consulta de contrato + telefone, telefone deve entrar como...", opcoes: ["INNER JOIN, sempre", "LEFT JOIN, porque é opcional"], respostaIndex: 1, explicacao: "Telefone pode não existir; com INNER JOIN o contrato desapareceria do resultado." }
    ],
    exercicios: [
      { enunciado: "Liste credor, devedor, número do contrato e o telefone (quando houver).", solucao: "SELECT cl.Nome_Res AS Credor, f.Nome AS Devedor, c.Numero_Contrato, t.Fone\nFROM Contrato c\nINNER JOIN Cliente cl ON cl.Id_Cliente = c.Id_Cliente\nINNER JOIN Financiado f ON f.Id_Financiado = c.Id_Financiado\nLEFT JOIN Telefone t ON t.Id_Financiado = f.Id_Financiado;" },
      { enunciado: "Liste o histórico com a descrição da ocorrência (junte Historico com Ocorrencia_Sistema) e o nome do devedor.", solucao: "SELECT f.Nome AS Devedor, os.Cod_Ocorr_Sistema AS Codigo, os.Descricao, h.Dt_Historico\nFROM Historico h\nJOIN Financiado f ON f.Id_Financiado = h.Id_Financiado\nJOIN Ocorrencia_Sistema os ON os.Id_Ocorrencia_Sistema = h.Id_Ocorrencia_Sistema\nORDER BY h.Dt_Historico;" }
    ],
    rafael: "Isso aqui é o coração da operação: devedor, proposta, acordo e plano de pagamento na mesma tela. 📊 Badge JOIN Pro chegando — bora pro capstone!"
  },

  {
    id: "7.7",
    secaoId: "joins",
    titulo: "Exercício Capstone: a ficha completa de um devedor",
    tempoMin: 20,
    pontosLicao: 15,
    pontosQuizBonus: 0,
    introducao: "Vamos consolidar JOINs em um único exercício: montar a ficha de UM devedor — credor, contrato, parcelas, e o que foi negociado. É exatamente a consulta que um analista roda quando abre um chamado.",
    conceitos: [
      {
        titulo: "Em SQL Server real, com parâmetro",
        codigo: "DECLARE @id_financiado INT = 9001;\n\nSELECT f.Nome AS Devedor, f.Cpfcnpj,\n       cl.Nome_Res AS Credor,\n       c.Numero_Contrato,\n       p.Tipo_Parcela, p.Dt_Vencimento\nFROM Financiado f\nINNER JOIN Cliente cl ON cl.Id_Cliente = f.Id_Cliente\nLEFT JOIN Contrato c  ON c.Id_Financiado = f.Id_Financiado\nLEFT JOIN Parcela p   ON p.Id_Contrato = c.Id_Contrato\nWHERE f.Id_Financiado = @id_financiado;",
        explicacao: "No servidor real você usaria uma variável (@id_financiado) para reaproveitar a mesma query com IDs diferentes. No sandbox abaixo, use o número direto."
      }
    ],
    tryIt: {
      descricao: "Monte a ficha do devedor 9001 (troque o número para ver outro devedor — 9012 é o que não tem contrato).",
      query: "SELECT f.Nome AS Devedor, f.Cpfcnpj,\n       cl.Nome_Res AS Credor,\n       c.Numero_Contrato,\n       p.Tipo_Parcela, p.Dt_Vencimento\nFROM Financiado f\nINNER JOIN Cliente cl ON cl.Id_Cliente = f.Id_Cliente\nLEFT JOIN Contrato c  ON c.Id_Financiado = f.Id_Financiado\nLEFT JOIN Parcela p   ON p.Id_Contrato = c.Id_Contrato\nWHERE f.Id_Financiado = 9001;",
      notaSimulador: "DECLARE @variavel é T-SQL real, mas não existe neste simulador — por isso o filtro vem com o número direto."
    },
    quiz: [],
    exercicios: [
      { enunciado: "Monte a ficha do devedor 9012 — o que aparece nas colunas de contrato e parcela? Por quê?", solucao: "SELECT f.Nome AS Devedor, f.Cpfcnpj,\n       cl.Nome_Res AS Credor,\n       c.Numero_Contrato,\n       p.Tipo_Parcela, p.Dt_Vencimento\nFROM Financiado f\nINNER JOIN Cliente cl ON cl.Id_Cliente = f.Id_Cliente\nLEFT JOIN Contrato c  ON c.Id_Financiado = f.Id_Financiado\nLEFT JOIN Parcela p   ON p.Id_Contrato = c.Id_Contrato\nWHERE f.Id_Financiado = 9012;" },
      { enunciado: "Monte a ficha de contato do devedor 9001: nome, telefone, e-mail e endereço (todos opcionais).", solucao: "SELECT f.Nome AS Devedor, t.Ddd, t.Fone, e.Endereco_Email, en.Logradouro, en.Numero\nFROM Financiado f\nLEFT JOIN Telefone t  ON t.Id_Financiado = f.Id_Financiado\nLEFT JOIN Email e     ON e.Id_Financiado = f.Id_Financiado\nLEFT JOIN Endereco en ON en.Id_Financiado = f.Id_Financiado\nWHERE f.Id_Financiado = 9001;" }
    ],
    rafael: "Você acabou de construir a query que responde \"o que tem nesse devedor?\" em segundos. 🚀 Badge JOIN Pro desbloqueado! Repare que o devedor 9012 vem com contrato NULL — o LEFT JOIN não o esconde."
  },

  // ===================================================================
  // SEÇÃO 3 - AGREGAÇÃO
  // ===================================================================
  {
    id: "7.8",
    secaoId: "agregacao",
    titulo: "COUNT, SUM, AVG",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "Funções de agregação calculam um resultado a partir de várias linhas: quantidade, soma, média, máximo, mínimo. É como você sai de \"lista de parcelas\" para \"quanto essa carteira vale\".",
    conceitos: [
      { titulo: "As 5 funções básicas", codigo: "-- Quantas parcelas de acordo existem\nSELECT COUNT(*) AS Qtd_Parcelas FROM Parcela_Acordo;\n\n-- Valor total acordado\nSELECT SUM(Vl_Parcela) AS Valor_Acordado FROM Parcela_Acordo;\n\n-- Ticket médio da parcela\nSELECT AVG(Vl_Parcela) AS Valor_Medio FROM Parcela_Acordo;\n\n-- Maior e menor parcela\nSELECT MAX(Vl_Parcela) AS Maior, MIN(Vl_Parcela) AS Menor\nFROM Parcela_Acordo;", explicacao: "COUNT conta linhas, SUM soma, AVG tira a média, MAX/MIN pegam o maior/menor valor de uma coluna." },
      { titulo: "Onde ficam os valores no DataCob", codigo: "-- Parcela (original do contrato) NÃO guarda valor:\nSELECT * FROM Parcela;   -- Tipo_Parcela, Dt_Vencimento...\n\n-- O valor negociado fica aqui:\nSELECT Vl_Total, Vl_Principal FROM Negociacao_Parcela;\n\n-- E o valor do plano de pagamento aqui:\nSELECT Vl_Parcela FROM Parcela_Acordo;", explicacao: "Detalhe do modelo que economiza tempo: se você precisa somar dinheiro, o valor está em Negociacao_Parcela (Vl_Total/Vl_Principal) ou em Parcela_Acordo (Vl_Parcela) — não na Parcela." }
    ],
    tryIt: {
      descricao: "Calcule quantas parcelas de acordo existem e o valor total acordado.",
      query: "SELECT COUNT(*) AS Qtd_Parcelas,\n       SUM(Vl_Parcela) AS Valor_Acordado,\n       AVG(Vl_Parcela) AS Valor_Medio\nFROM Parcela_Acordo;"
    },
    quiz: [
      { pergunta: "Qual função soma os valores de uma coluna?", opcoes: ["COUNT", "SUM", "TOTAL"], respostaIndex: 1, explicacao: "SUM(coluna) soma todos os valores." },
      { pergunta: "COUNT(*) conta o quê?", opcoes: ["Só colunas não-nulas", "Todas as linhas", "Só valores distintos"], respostaIndex: 1, explicacao: "COUNT(*) conta todas as linhas do resultado." },
      { pergunta: "Qual função calcula a média?", opcoes: ["AVG", "MED", "MEAN"], respostaIndex: 0, explicacao: "AVG(coluna) é a média aritmética." },
      { pergunta: "Para somar dinheiro no DataCob, qual coluna você usa?", opcoes: ["Parcela.Vl_Parcela", "Parcela_Acordo.Vl_Parcela ou Negociacao_Parcela.Vl_Total", "Contrato.Valor"], respostaIndex: 1, explicacao: "A tabela Parcela não guarda valor — ele está em Negociacao_Parcela e Parcela_Acordo." }
    ],
    exercicios: [
      { enunciado: "Some o valor total negociado (Vl_Total) em Negociacao_Parcela.", solucao: "SELECT SUM(Vl_Total) AS Valor_Negociado FROM Negociacao_Parcela;" },
      { enunciado: "Calcule o maior e o menor valor de parcela de acordo.", solucao: "SELECT MAX(Vl_Parcela) AS Maior, MIN(Vl_Parcela) AS Menor FROM Parcela_Acordo;" },
      { enunciado: "Conte quantos registros de histórico existem.", solucao: "SELECT COUNT(*) AS Qtd_Historico FROM Historico;" },
      { enunciado: "Calcule a média de Vl_Principal em Negociacao_Parcela, ignorando as linhas de encargo (onde Vl_Principal = 0).", solucao: "SELECT AVG(Vl_Principal) AS Media_Principal FROM Negociacao_Parcela WHERE Vl_Principal > 0;" }
    ],
    rafael: "Agregação transforma centenas de linhas em UMA resposta. 📊 E você já sabe onde o dinheiro mora no modelo — isso não está escrito em lugar nenhum, se aprende na prática. Próxima: GROUP BY!"
  },

  {
    id: "7.9",
    secaoId: "agregacao",
    titulo: "GROUP BY",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "GROUP BY agrupa linhas que têm o mesmo valor em uma coluna e aplica a agregação em cada grupo separadamente — por exemplo, contratos POR carteira, ou valor acordado POR devedor.",
    conceitos: [
      { titulo: "Contratos por carteira", codigo: "SELECT g.Descricao AS Carteira,\n       COUNT(c.Id_Contrato) AS Contratos\nFROM Contrato c\nJOIN Grupo g ON g.Id_Grupo = c.Id_Grupo\nGROUP BY g.Descricao;", explicacao: "Toda coluna que não está dentro de uma função de agregação precisa estar no GROUP BY." },
      { titulo: "Valor acordado por devedor", codigo: "SELECT f.Nome AS Devedor,\n       COUNT(pa.Id_Parcela_Acordo) AS Qtd_Parcelas,\n       SUM(pa.Vl_Parcela) AS Valor_Acordo\nFROM Acordo a\nJOIN Negociacao n ON n.Id_Negociacao = a.Id_Negociacao\nJOIN Financiado f ON f.Id_Financiado = n.Id_Financiado\nJOIN Parcela_Acordo pa ON pa.Id_Acordo = a.Id_Acordo\nGROUP BY f.Nome;", explicacao: "GROUP BY combinado com JOIN é o formato de praticamente todo relatório gerencial de cobrança." }
    ],
    tryIt: {
      descricao: "Agrupe os contratos por carteira (Grupo).",
      query: "SELECT g.Descricao AS Carteira,\n       COUNT(c.Id_Contrato) AS Contratos\nFROM Contrato c\nJOIN Grupo g ON g.Id_Grupo = c.Id_Grupo\nGROUP BY g.Descricao;"
    },
    quiz: [
      { pergunta: "GROUP BY agrupa linhas com o mesmo valor em qual tipo de coluna?", opcoes: ["Qualquer coluna escolhida no GROUP BY", "Só a chave primária", "Só colunas numéricas"], respostaIndex: 0, explicacao: "Você escolhe a coluna de agrupamento." },
      { pergunta: "SELECT Tipo_Parcela, COUNT(*) FROM Parcela GROUP BY Tipo_Parcela traz um total...", opcoes: ["Geral, uma linha só", "Por tipo de parcela, uma linha por tipo", "Por parcela individual"], respostaIndex: 1, explicacao: "Uma linha de resultado por valor distinto de Tipo_Parcela." },
      { pergunta: "Uma coluna do SELECT que não está numa função de agregação precisa...", opcoes: ["Estar no GROUP BY", "Estar no WHERE", "Ser removida"], respostaIndex: 0, explicacao: "Senão o banco não sabe qual valor daquele grupo mostrar — no SQL Server isso é erro de execução." }
    ],
    exercicios: [
      { enunciado: "Conte as parcelas por tipo (Tipo_Parcela).", solucao: "SELECT Tipo_Parcela, COUNT(*) AS Qtd FROM Parcela GROUP BY Tipo_Parcela;" },
      { enunciado: "Calcule a quantidade de parcelas e o valor total de cada acordo (agrupe por Id_Acordo).", solucao: "SELECT Id_Acordo, COUNT(*) AS Qtd_Parcelas, SUM(Vl_Parcela) AS Valor_Acordo\nFROM Parcela_Acordo\nGROUP BY Id_Acordo;" },
      { enunciado: "Conte quantos devedores cada credor tem (junte Cliente com Financiado).", solucao: "SELECT cl.Nome_Res AS Credor, COUNT(f.Id_Financiado) AS Devedores\nFROM Cliente cl\nJOIN Financiado f ON f.Id_Cliente = cl.Id_Cliente\nGROUP BY cl.Nome_Res;" },
      { enunciado: "Conte quantos registros de histórico existem por código de ocorrência (junte com Ocorrencia_Sistema).", solucao: "SELECT os.Cod_Ocorr_Sistema AS Codigo, os.Descricao, COUNT(h.Id_Historico) AS Registros\nFROM Historico h\nJOIN Ocorrencia_Sistema os ON os.Id_Ocorrencia_Sistema = h.Id_Ocorrencia_Sistema\nGROUP BY os.Cod_Ocorr_Sistema, os.Descricao;" }
    ],
    rafael: "GROUP BY é a pergunta \"quero um resumo, mas separado por categoria\". 🎲 Ocorrência mais registrada, valor por carteira... é isso que vai pro relatório. Próxima: HAVING!"
  },

  {
    id: "7.10",
    secaoId: "agregacao",
    titulo: "HAVING",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "WHERE filtra linhas ANTES de agrupar; HAVING filtra os GRUPOS depois do GROUP BY — por exemplo, \"só acordos parcelados em mais de 2 vezes\".",
    conceitos: [
      { titulo: "Filtrando grupos", codigo: "SELECT Id_Acordo,\n       COUNT(*) AS Qtd_Parcelas,\n       SUM(Vl_Parcela) AS Valor_Acordo\nFROM Parcela_Acordo\nGROUP BY Id_Acordo\nHAVING COUNT(*) > 2;", explicacao: "HAVING usa o resultado da agregação (COUNT, SUM...) como condição — algo que o WHERE não consegue fazer." },
      { titulo: "WHERE e HAVING juntos", codigo: "-- WHERE corta linhas antes; HAVING corta grupos depois\nSELECT Id_Contrato,\n       COUNT(*) AS Parcelas_Principais\nFROM Parcela\nWHERE Tipo_Parcela = 'P'\nGROUP BY Id_Contrato\nHAVING COUNT(*) >= 2;", explicacao: "Leia de cima pra baixo: primeiro só as parcelas principais (WHERE), depois só os contratos que têm 2 ou mais delas (HAVING)." }
    ],
    tryIt: {
      descricao: "Mostre só os acordos parcelados em mais de 2 vezes.",
      query: "SELECT Id_Acordo,\n       COUNT(*) AS Qtd_Parcelas,\n       SUM(Vl_Parcela) AS Valor_Acordo\nFROM Parcela_Acordo\nGROUP BY Id_Acordo\nHAVING COUNT(*) > 2;"
    },
    quiz: [
      { pergunta: "WHERE filtra antes ou depois do GROUP BY?", opcoes: ["Antes", "Depois"], respostaIndex: 0, explicacao: "WHERE filtra linhas cruas, antes de agrupar." },
      { pergunta: "HAVING filtra o quê?", opcoes: ["Linhas individuais", "Grupos (resultado da agregação)", "Colunas"], respostaIndex: 1, explicacao: "HAVING trabalha sobre o resultado já agregado (ex.: COUNT(*) > 2)." },
      { pergunta: "É possível usar WHERE e HAVING na mesma query?", opcoes: ["Sim", "Não"], respostaIndex: 0, explicacao: "WHERE filtra as linhas antes de agrupar, HAVING filtra os grupos depois — os dois podem coexistir." },
      { pergunta: "Por que WHERE COUNT(*) > 2 dá erro?", opcoes: ["COUNT não existe", "No WHERE a agregação ainda não foi calculada", "Falta o GROUP BY"], respostaIndex: 1, explicacao: "O WHERE roda antes do agrupamento, então o COUNT do grupo ainda não existe naquele momento." }
    ],
    exercicios: [
      { enunciado: "Mostre as carteiras (Grupo) com mais de 2 contratos.", solucao: "SELECT g.Descricao AS Carteira, COUNT(*) AS Contratos\nFROM Contrato c\nJOIN Grupo g ON g.Id_Grupo = c.Id_Grupo\nGROUP BY g.Descricao\nHAVING COUNT(*) > 2;" },
      { enunciado: "Mostre os devedores com 2 ou mais registros de histórico.", solucao: "SELECT f.Nome AS Devedor, COUNT(*) AS Registros\nFROM Historico h\nJOIN Financiado f ON f.Id_Financiado = h.Id_Financiado\nGROUP BY f.Nome\nHAVING COUNT(*) >= 2;" },
      { enunciado: "Mostre os acordos cujo valor total passa de R$ 3.000.", solucao: "SELECT Id_Acordo, SUM(Vl_Parcela) AS Valor_Acordo\nFROM Parcela_Acordo\nGROUP BY Id_Acordo\nHAVING SUM(Vl_Parcela) > 3000;" }
    ],
    rafael: "Badge Aggregation Expert desbloqueado! 🥈 Resumir, agrupar E filtrar grupos — isso já é relatório gerencial pronto. \"Me mostra só quem parcelou em mais de 2x\" tem resposta em 4 linhas de SQL."
  },

  // ===================================================================
  // SEÇÃO 4 - AVANÇADO BÁSICO
  // ===================================================================
  {
    id: "7.11",
    secaoId: "avancado",
    titulo: "ORDER BY & TOP",
    tempoMin: 15,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "ORDER BY define a ordem do resultado; TOP limita quantas linhas voltam (o \"LIMIT\" do SQL Server).",
    conceitos: [
      { titulo: "Ordenar e limitar", codigo: "-- Maior parcela primeiro\nSELECT Id_Acordo, Nr_Parcela, Vl_Parcela\nFROM Parcela_Acordo\nORDER BY Vl_Parcela DESC;\n\n-- Só as 5 maiores\nSELECT TOP 5 Id_Acordo, Nr_Parcela, Vl_Parcela\nFROM Parcela_Acordo\nORDER BY Vl_Parcela DESC;\n\n-- Múltiplas colunas\nSELECT * FROM Parcela\nORDER BY Id_Contrato ASC, Dt_Vencimento DESC;", explicacao: "DESC = decrescente, ASC = crescente (padrão). TOP vem logo depois do SELECT." },
      { titulo: "O ranking clássico", codigo: "-- Top 5 devedores por valor acordado\nSELECT TOP 5\n       f.Nome AS Devedor,\n       SUM(pa.Vl_Parcela) AS Valor_Acordo\nFROM Acordo a\nJOIN Negociacao n ON n.Id_Negociacao = a.Id_Negociacao\nJOIN Financiado f ON f.Id_Financiado = n.Id_Financiado\nJOIN Parcela_Acordo pa ON pa.Id_Acordo = a.Id_Acordo\nGROUP BY f.Nome\nORDER BY Valor_Acordo DESC;", explicacao: "GROUP BY + ORDER BY + TOP é a receita de qualquer \"Top N\" — o formato que gestor entende sem precisar saber SQL." }
    ],
    tryIt: {
      descricao: "Traga as 5 maiores parcelas de acordo.",
      query: "SELECT TOP 5 Id_Acordo, Nr_Parcela, Vl_Parcela\nFROM Parcela_Acordo\nORDER BY Vl_Parcela DESC;"
    },
    quiz: [
      { pergunta: "Qual palavra-chave limita a quantidade de linhas no SQL Server?", opcoes: ["LIMIT", "TOP", "FIRST"], respostaIndex: 1, explicacao: "SQL Server usa TOP (outros bancos usam LIMIT)." },
      { pergunta: "ORDER BY Vl_Parcela DESC ordena do...", opcoes: ["Menor para o maior", "Maior para o menor"], respostaIndex: 1, explicacao: "DESC = decrescente." },
      { pergunta: "Para um \"Top 5 devedores\", que cláusulas você combina?", opcoes: ["Só WHERE", "GROUP BY + ORDER BY + TOP", "Só DISTINCT"], respostaIndex: 1, explicacao: "Agrupa por devedor, ordena pelo total e limita a 5." }
    ],
    exercicios: [
      { enunciado: "Traga as 3 menores parcelas de acordo.", solucao: "SELECT TOP 3 Id_Acordo, Nr_Parcela, Vl_Parcela FROM Parcela_Acordo ORDER BY Vl_Parcela ASC;" },
      { enunciado: "Monte o Top 5 devedores por valor acordado.", solucao: "SELECT TOP 5 f.Nome AS Devedor, SUM(pa.Vl_Parcela) AS Valor_Acordo\nFROM Acordo a\nJOIN Negociacao n ON n.Id_Negociacao = a.Id_Negociacao\nJOIN Financiado f ON f.Id_Financiado = n.Id_Financiado\nJOIN Parcela_Acordo pa ON pa.Id_Acordo = a.Id_Acordo\nGROUP BY f.Nome\nORDER BY Valor_Acordo DESC;" }
    ],
    rafael: "Ordenar e limitar parece simples, mas é o que transforma uma tabela gigante num \"Top 10\" que qualquer gestor entende. 🚀"
  },

  {
    id: "7.12",
    secaoId: "avancado",
    titulo: "DISTINCT",
    tempoMin: 10,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "DISTINCT remove duplicatas do resultado — útil para saber quais valores diferentes existem em uma coluna, ou quantos registros únicos aparecem depois de um JOIN.",
    conceitos: [
      { titulo: "Valores únicos", codigo: "-- Quais tipos de parcela existem?\nSELECT DISTINCT Tipo_Parcela FROM Parcela;\n\n-- Quantos devedores diferentes aparecem no histórico?\nSELECT COUNT(DISTINCT Id_Financiado) AS Devedores\nFROM Historico;\n\n-- Quais DDDs temos na base?\nSELECT DISTINCT Ddd FROM Telefone ORDER BY Ddd;", explicacao: "DISTINCT pode ser combinado com COUNT para contar valores únicos — e isso é diferente de COUNT(*), que contaria as linhas repetidas." },
      { titulo: "Por que isso importa depois de um JOIN", codigo: "-- Um devedor com 2 telefones vira 2 linhas:\nSELECT f.Nome\nFROM Financiado f\nJOIN Telefone t ON t.Id_Financiado = f.Id_Financiado;\n\n-- DISTINCT resolve a contagem inflada:\nSELECT COUNT(DISTINCT f.Id_Financiado) AS Devedores_Com_Telefone\nFROM Financiado f\nJOIN Telefone t ON t.Id_Financiado = f.Id_Financiado;", explicacao: "Esse é o erro de contagem mais comum em relatório: o JOIN multiplica linhas, e o COUNT(*) passa a contar telefone em vez de devedor." }
    ],
    tryIt: {
      descricao: "Veja quais tipos de parcela existem na base.",
      query: "SELECT DISTINCT Tipo_Parcela FROM Parcela;"
    },
    quiz: [
      { pergunta: "SELECT DISTINCT Ddd FROM Telefone remove o quê do resultado?", opcoes: ["Colunas vazias", "DDDs repetidos", "Telefones antigos"], respostaIndex: 1, explicacao: "DISTINCT elimina linhas duplicadas do resultado." },
      { pergunta: "Depois de um JOIN que multiplica linhas, para contar devedores você usa...", opcoes: ["COUNT(*)", "COUNT(DISTINCT Id_Financiado)", "SUM(Id_Financiado)"], respostaIndex: 1, explicacao: "COUNT(*) contaria as linhas multiplicadas pelo JOIN; o DISTINCT conta cada devedor uma vez." }
    ],
    exercicios: [
      { enunciado: "Conte quantos devedores diferentes aparecem no histórico.", solucao: "SELECT COUNT(DISTINCT Id_Financiado) AS Devedores FROM Historico;" },
      { enunciado: "Liste os DDDs distintos da base, em ordem.", solucao: "SELECT DISTINCT Ddd FROM Telefone ORDER BY Ddd;" },
      { enunciado: "Conte quantos devedores têm telefone cadastrado (sem contar duas vezes quem tem dois telefones).", solucao: "SELECT COUNT(DISTINCT f.Id_Financiado) AS Devedores_Com_Telefone\nFROM Financiado f\nJOIN Telefone t ON t.Id_Financiado = f.Id_Financiado;" }
    ],
    rafael: "Esse detalhe do DISTINCT depois de JOIN já salvou muito relatório errado. 📊 Se o número veio maior do que deveria, quase sempre é JOIN multiplicando linha."
  },

  {
    id: "7.13",
    secaoId: "avancado",
    titulo: "CASE WHEN",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "CASE WHEN cria uma coluna condicional — como um \"se/senão\" dentro do SELECT. No DataCob ele é essencial para traduzir código em texto legível.",
    conceitos: [
      { titulo: "Traduzindo código para texto", codigo: "SELECT p.Id_Parcela,\n       p.Tipo_Parcela,\n       CASE p.Tipo_Parcela\n         WHEN 'P' THEN 'Principal'\n         WHEN 'J' THEN 'Juros'\n         WHEN 'M' THEN 'Multa/Encargo'\n         ELSE 'Outro'\n       END AS Tipo\nFROM Parcela p;", explicacao: "Ninguém fora da TI sabe o que é Tipo_Parcela = 'M'. O CASE resolve isso no próprio SELECT, sem precisar de tabela de domínio." },
      { titulo: "Categorizando faixas de valor", codigo: "SELECT Id_Acordo, Vl_Parcela,\n  CASE\n    WHEN Vl_Parcela < 500 THEN 'Baixo'\n    WHEN Vl_Parcela BETWEEN 500 AND 1500 THEN 'Medio'\n    ELSE 'Alto'\n  END AS Faixa\nFROM Parcela_Acordo;", explicacao: "As condições são avaliadas em ordem; a primeira que for verdadeira \"ganha\". Sem ELSE, o resultado é NULL quando nenhuma bate." },
      { titulo: "Contando condicionalmente", codigo: "-- Quantas parcelas de cada tipo, em UMA linha\nSELECT\n  COUNT(*) AS Parcelas,\n  SUM(CASE WHEN Tipo_Parcela = 'P' THEN 1 ELSE 0 END) AS Principais,\n  SUM(CASE WHEN Tipo_Parcela = 'J' THEN 1 ELSE 0 END) AS Juros\nFROM Parcela;", explicacao: "SUM(CASE WHEN ... THEN 1 ELSE 0 END) é o truque para contar condicionalmente sem precisar de várias queries." }
    ],
    tryIt: {
      descricao: "Traduza o Tipo_Parcela para texto legível.",
      query: "SELECT p.Id_Parcela,\n       p.Tipo_Parcela,\n       CASE p.Tipo_Parcela\n         WHEN 'P' THEN 'Principal'\n         WHEN 'J' THEN 'Juros'\n         WHEN 'M' THEN 'Multa/Encargo'\n         ELSE 'Outro'\n       END AS Tipo\nFROM Parcela p;",
      notaSimulador: "No T-SQL real também funciona COUNT(CASE WHEN ... THEN 1 END) para contar condicionalmente — esse formato específico não roda neste simulador, use SUM(CASE WHEN ... THEN 1 ELSE 0 END)."
    },
    quiz: [
      { pergunta: "CASE WHEN é avaliado dentro de qual cláusula?", opcoes: ["Só no WHERE", "No SELECT (cria uma coluna)", "Só no ORDER BY"], respostaIndex: 1, explicacao: "É mais comum usar CASE WHEN dentro do SELECT para criar uma coluna derivada." },
      { pergunta: "Se nenhuma condição do CASE for verdadeira e não houver ELSE, o resultado é...", opcoes: ["Erro", "0 (zero)", "NULL"], respostaIndex: 2, explicacao: "Sem ELSE, o CASE devolve NULL quando nenhuma condição bate." },
      { pergunta: "Para contar só as parcelas do tipo 'P' dentro de uma agregação, você usa...", opcoes: ["SUM(CASE WHEN Tipo_Parcela='P' THEN 1 ELSE 0 END)", "COUNT(Tipo_Parcela='P')", "SUM(Tipo_Parcela)"], respostaIndex: 0, explicacao: "O CASE devolve 1 para quem bate e 0 para o resto; o SUM soma isso." }
    ],
    exercicios: [
      { enunciado: "Crie uma coluna 'Situacao' que mostra 'Fechado' quando a negociação tem acordo e 'Em aberto' quando não tem.", solucao: "SELECT n.Id_Negociacao, n.Descricao,\n  CASE\n    WHEN a.Id_Acordo IS NULL THEN 'Em aberto'\n    ELSE 'Fechado'\n  END AS Situacao\nFROM Negociacao n\nLEFT JOIN Acordo a ON a.Id_Negociacao = n.Id_Negociacao;" },
      { enunciado: "Classifique as parcelas de acordo em 'Baixo', 'Medio' e 'Alto' por faixa de valor.", solucao: "SELECT Id_Acordo, Vl_Parcela,\n  CASE\n    WHEN Vl_Parcela < 500 THEN 'Baixo'\n    WHEN Vl_Parcela BETWEEN 500 AND 1500 THEN 'Medio'\n    ELSE 'Alto'\n  END AS Faixa\nFROM Parcela_Acordo;" },
      { enunciado: "Em uma linha, conte o total de e-mails e quantos estão válidos (use SUM com CASE).", solucao: "SELECT COUNT(*) AS Emails,\n       SUM(CASE WHEN Status_Email = 'VALIDO' THEN 1 ELSE 0 END) AS Validos\nFROM Email;" }
    ],
    rafael: "CASE WHEN é o \"se/senão\" do SQL. 🎲 Traduzir 'M' pra 'Multa/Encargo' parece bobo, mas é a diferença entre um relatório que o cliente entende e um que ele te liga pra perguntar."
  },

  {
    id: "7.14",
    secaoId: "avancado",
    titulo: "Funções de Data",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "T-SQL tem funções prontas para trabalhar com datas: pegar a data de hoje, extrair ano/mês/dia, calcular diferença entre datas. Em cobrança, praticamente toda pergunta tem data no meio.",
    conceitos: [
      {
        titulo: "Funções de data (T-SQL real)",
        codigo: "SELECT\n  GETDATE() AS Hoje,\n  YEAR(a.Dt_Acordo) AS Ano,\n  MONTH(a.Dt_Acordo) AS Mes,\n  DAY(a.Dt_Acordo) AS Dia,\n  DATEDIFF(DAY, a.Dt_Acordo, pa.Dt_Vencimento) AS Dias_Ate_Vencer\nFROM Acordo a\nJOIN Parcela_Acordo pa ON pa.Id_Acordo = a.Id_Acordo;",
        explicacao: "DATEDIFF(DAY, inicio, fim) mede a distância entre duas datas na unidade escolhida. GETDATE() é sempre \"agora\" no servidor."
      },
      {
        titulo: "Atraso: a conta que todo mundo pede",
        codigo: "-- No servidor real, dias de atraso até hoje:\nSELECT pa.Id_Acordo, pa.Nr_Parcela,\n       DATEDIFF(DAY, pa.Dt_Vencimento, GETDATE()) AS Dias_Atraso\nFROM Parcela_Acordo pa\nWHERE pa.Dt_Vencimento < GETDATE();",
        explicacao: "Cuidado com a ordem dos argumentos: DATEDIFF(DAY, vencimento, hoje) dá atraso positivo. Invertido, vem negativo — é o erro clássico dessa função."
      }
    ],
    tryIt: {
      descricao: "Calcule quantos dias existem entre a data do acordo e o vencimento de cada parcela.",
      query: "SELECT a.Id_Acordo, a.Dt_Acordo,\n       pa.Nr_Parcela, pa.Dt_Vencimento,\n       DATEDIFF(DAY, a.Dt_Acordo, pa.Dt_Vencimento) AS Dias_Ate_Vencer\nFROM Acordo a\nJOIN Parcela_Acordo pa ON pa.Id_Acordo = a.Id_Acordo\nORDER BY a.Id_Acordo, pa.Nr_Parcela;",
      notaSimulador: "GETDATE() funciona aqui, mas traria a data de hoje contra um dataset de 2024 (tudo apareceria como atraso gigante) — por isso o exercício compara duas datas do próprio dado. FORMAT() é T-SQL real, mas não existe neste simulador."
    },
    quiz: [
      { pergunta: "GETDATE() retorna...", opcoes: ["A data de criação da tabela", "A data/hora atual do servidor", "A data do primeiro registro"], respostaIndex: 1, explicacao: "GETDATE() é sempre \"agora\", no servidor." },
      { pergunta: "YEAR(coluna_data) extrai...", opcoes: ["O ano da data", "O dia da semana", "O fuso horário"], respostaIndex: 0, explicacao: "YEAR/MONTH/DAY extraem partes de uma data." },
      { pergunta: "DATEDIFF(DAY, data1, data2) calcula...", opcoes: ["A soma das duas datas", "A diferença em dias entre as duas datas", "Se as datas são iguais"], respostaIndex: 1, explicacao: "DATEDIFF mede a distância entre duas datas na unidade escolhida (DAY, MONTH...)." },
      { pergunta: "Para dias de ATRASO, a ordem correta é...", opcoes: ["DATEDIFF(DAY, hoje, vencimento)", "DATEDIFF(DAY, vencimento, hoje)"], respostaIndex: 1, explicacao: "Do vencimento para hoje — assim o atraso vem positivo." }
    ],
    exercicios: [
      { enunciado: "Mostre o ano e o mês de cada acordo.", solucao: "SELECT Id_Acordo, YEAR(Dt_Acordo) AS Ano, MONTH(Dt_Acordo) AS Mes FROM Acordo;" },
      { enunciado: "Conte quantos acordos foram fechados por mês.", solucao: "SELECT MONTH(Dt_Acordo) AS Mes, COUNT(*) AS Acordos FROM Acordo GROUP BY MONTH(Dt_Acordo);" },
      { enunciado: "Calcule quantos dias se passaram entre 01/01/2024 e o vencimento de cada parcela de acordo.", solucao: "SELECT Id_Acordo, Nr_Parcela, Dt_Vencimento,\n       DATEDIFF(DAY, '2024-01-01', Dt_Vencimento) AS Dias\nFROM Parcela_Acordo;" }
    ],
    rafael: "Datas são A parte do SQL que mais gera bug em produção. 🔥 Se o atraso saiu negativo no seu relatório, é ordem de argumento no DATEDIFF — pode apostar."
  },

  {
    id: "7.15",
    secaoId: "avancado",
    titulo: "Projeto Final: Dashboard SQL",
    tempoMin: 30,
    pontosLicao: 100,
    pontosQuizBonus: 0,
    introducao: "Vamos consolidar tudo em um mini-dashboard da operação: KPIs gerais, contratos por carteira, ocorrências mais registradas e os devedores com maior valor acordado.",
    conceitos: [
      {
        titulo: "1. KPIs principais",
        codigo: "SELECT\n  (SELECT COUNT(*) FROM Financiado) AS Devedores,\n  (SELECT COUNT(*) FROM Contrato) AS Contratos,\n  (SELECT COUNT(*) FROM Acordo) AS Acordos,\n  (SELECT SUM(Vl_Parcela) FROM Parcela_Acordo) AS Valor_Acordado;",
        explicacao: "Subquery escalar no SELECT é uma forma direta de montar um painel de números que vêm de tabelas diferentes."
      },
      {
        titulo: "2. Contratos por carteira",
        codigo: "SELECT g.Descricao AS Carteira,\n       COUNT(c.Id_Contrato) AS Contratos\nFROM Contrato c\nJOIN Grupo g ON g.Id_Grupo = c.Id_Grupo\nGROUP BY g.Descricao\nORDER BY Contratos DESC;",
        explicacao: "Mesma lógica da lição 7.9, agora ordenada — a visão de volume por estágio da dívida."
      },
      {
        titulo: "3. Ocorrências mais registradas",
        codigo: "SELECT os.Cod_Ocorr_Sistema AS Codigo,\n       os.Descricao,\n       COUNT(h.Id_Historico) AS Registros\nFROM Historico h\nJOIN Ocorrencia_Sistema os ON os.Id_Ocorrencia_Sistema = h.Id_Ocorrencia_Sistema\nGROUP BY os.Cod_Ocorr_Sistema, os.Descricao\nORDER BY Registros DESC;",
        explicacao: "A visão de produtividade/qualidade do contato: o que os operadores mais registram (CPC, promessa, acordo, pagamento...)."
      },
      {
        titulo: "4. Top 5 devedores por valor acordado",
        codigo: "SELECT TOP 5\n       f.Nome AS Devedor,\n       COUNT(pa.Id_Parcela_Acordo) AS Parcelas,\n       SUM(pa.Vl_Parcela) AS Valor_Acordo\nFROM Acordo a\nJOIN Negociacao n ON n.Id_Negociacao = a.Id_Negociacao\nJOIN Financiado f ON f.Id_Financiado = n.Id_Financiado\nJOIN Parcela_Acordo pa ON pa.Id_Acordo = a.Id_Acordo\nGROUP BY f.Nome\nORDER BY Valor_Acordo DESC;",
        explicacao: "Combina JOIN + GROUP BY + ORDER BY + TOP — quatro lições anteriores numa query só."
      }
    ],
    tryIt: {
      descricao: "Rode o primeiro bloco do dashboard: os KPIs principais.",
      query: "SELECT\n  (SELECT COUNT(*) FROM Financiado) AS Devedores,\n  (SELECT COUNT(*) FROM Contrato) AS Contratos,\n  (SELECT COUNT(*) FROM Acordo) AS Acordos,\n  (SELECT SUM(Vl_Parcela) FROM Parcela_Acordo) AS Valor_Acordado;"
    },
    quiz: [
      { pergunta: "Uma subquery escalar no SELECT devolve...", opcoes: ["Uma tabela inteira", "Um único valor por linha", "Sempre NULL"], respostaIndex: 1, explicacao: "Por isso serve pra montar KPI: cada subquery vira uma coluna com um número." },
      { pergunta: "Que combinação de cláusulas o \"Top 5 devedores\" usa?", opcoes: ["Só WHERE", "JOIN + GROUP BY + ORDER BY + TOP", "Só DISTINCT"], respostaIndex: 1, explicacao: "Junta as tabelas, agrupa por devedor, ordena pelo total e limita a 5." },
      { pergunta: "No dashboard, por que o valor acordado vem de Parcela_Acordo e não de Parcela?", opcoes: ["Porque Parcela não guarda valor", "Porque Parcela está vazia", "É indiferente"], respostaIndex: 0, explicacao: "No modelo do DataCob o valor mora em Parcela_Acordo (plano fechado) e Negociacao_Parcela (proposta)." }
    ],
    exercicios: [
      { enunciado: "Rode o bloco 2 (contratos por carteira) e veja qual estágio da dívida concentra mais contratos.", solucao: "SELECT g.Descricao AS Carteira, COUNT(c.Id_Contrato) AS Contratos\nFROM Contrato c\nJOIN Grupo g ON g.Id_Grupo = c.Id_Grupo\nGROUP BY g.Descricao\nORDER BY Contratos DESC;" },
      { enunciado: "Rode o bloco 3 (ocorrências mais registradas).", solucao: "SELECT os.Cod_Ocorr_Sistema AS Codigo, os.Descricao, COUNT(h.Id_Historico) AS Registros\nFROM Historico h\nJOIN Ocorrencia_Sistema os ON os.Id_Ocorrencia_Sistema = h.Id_Ocorrencia_Sistema\nGROUP BY os.Cod_Ocorr_Sistema, os.Descricao\nORDER BY Registros DESC;" },
      { enunciado: "Rode o bloco 4 (Top 5 devedores por valor acordado).", solucao: "SELECT TOP 5 f.Nome AS Devedor, COUNT(pa.Id_Parcela_Acordo) AS Parcelas, SUM(pa.Vl_Parcela) AS Valor_Acordo\nFROM Acordo a\nJOIN Negociacao n ON n.Id_Negociacao = a.Id_Negociacao\nJOIN Financiado f ON f.Id_Financiado = n.Id_Financiado\nJOIN Parcela_Acordo pa ON pa.Id_Acordo = a.Id_Acordo\nGROUP BY f.Nome\nORDER BY Valor_Acordo DESC;" },
      { enunciado: "Desafio: monte a taxa de conversão de negociação em acordo (quantas negociações existem e quantas viraram acordo).", solucao: "SELECT COUNT(*) AS Negociacoes,\n       SUM(CASE WHEN a.Id_Acordo IS NULL THEN 0 ELSE 1 END) AS Fechadas\nFROM Negociacao n\nLEFT JOIN Acordo a ON a.Id_Negociacao = n.Id_Negociacao;" }
    ],
    rafael: "Query otimizada! 🚀 Você chegou ao fim do Track 7 tendo escrito, do começo ao fim, consultas nas tabelas REAIS do DataCob — é o mesmo SQL que você vai rodar em produção. Badges SQL Dashboard Builder e DataCob Data Analyst desbloqueados! 👑"
  }
];

export function encontrarLicao(licaoId) {
  return TRACK_7_LICOES.find((l) => l.id === licaoId) || null;
}
