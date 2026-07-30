// Track 7 - T-SQL SQL Server 2019 com DataCob (conteudo das 15 licoes).
// Dados de apoio (fictícios) em track-7-sql-dataset.js. Nenhuma conexao
// com o SQL Server real do DataCob - o sandbox roda AlaSQL no navegador
// contra esse dataset fake, só para o usuario praticar a sintaxe.
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
    titulo: "Introdução ao SQL Server 2019",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "O SQL Server 2019 é o banco de dados que guarda todos os dados operacionais do DataCob: boletos emitidos, remessas enviadas aos bancos, retornos processados, clientes e histórico. Neste sandbox você vai praticar a mesma linguagem (T-SQL) contra um conjunto de dados fictício com a mesma estrutura.",
    conceitos: [
      {
        titulo: "Databases, Tables, Rows e Columns",
        codigo: "-- Estrutura básica do SQL Server\n-- Database  -> o banco (ex.: DataCob)\n-- Table     -> uma tabela (ex.: boletos)\n-- Row       -> uma linha/registro (um boleto)\n-- Column    -> um campo (ex.: valor, vencimento)",
        explicacao: "Um banco de dados relacional organiza informação em tabelas; cada linha é um registro e cada coluna é um atributo desse registro."
      },
      {
        titulo: "As 3 tabelas deste Track",
        codigo: "CREATE TABLE boletos (\n  id INT PRIMARY KEY,\n  cedente VARCHAR(100),\n  sacado VARCHAR(100),\n  valor DECIMAL(10,2),\n  vencimento DATE,\n  status VARCHAR(20),\n  criado_em DATE\n);\n\nCREATE TABLE remessas (\n  id INT PRIMARY KEY,\n  boleto_id INT,\n  banco VARCHAR(50),\n  tipo_cnab VARCHAR(10),\n  total_valor DECIMAL(15,2),\n  data_envio DATE\n);\n\nCREATE TABLE retornos (\n  id INT PRIMARY KEY,\n  boleto_id INT,\n  numero_documento VARCHAR(50),\n  status_pagamento VARCHAR(20),\n  valor_movimentado DECIMAL(10,2),\n  data_movimento DATE\n);",
        explicacao: "Essas 3 tabelas já existem prontas e populadas no sandbox (com dados fictícios) — você não precisa criá-las, só consultar."
      }
    ],
    tryIt: {
      descricao: "No SQL Server real você conectaria com usuário/senha e rodaria SELECT @@VERSION; para confirmar a conexão. Aqui, as tabelas já estão prontas — rode a query abaixo pra ver todos os boletos disponíveis.",
      query: "SELECT * FROM boletos;",
      notaSimulador: "SELECT @@VERSION não existe neste simulador (não é um SQL Server de verdade) — no seu SQL Server real, ele mostra a versão instalada."
    },
    quiz: [
      { pergunta: "Qual é o banco de dados que armazena os dados do DataCob?", opcoes: ["MySQL", "PostgreSQL", "SQL Server 2019", "SQLite"], respostaIndex: 2, explicacao: "O DataCob usa SQL Server 2019 como banco de dados." },
      { pergunta: "Quantas tabelas principais vimos nesta lição?", opcoes: ["2", "3", "4", "5"], respostaIndex: 1, explicacao: "boletos, remessas e retornos." },
      { pergunta: "O que é uma \"Table\"?", opcoes: ["Um tipo de dado", "Estrutura que guarda dados em linhas e colunas", "Um comando SQL", "Um banco de dados inteiro"], respostaIndex: 1, explicacao: "Uma tabela organiza registros (linhas) com atributos (colunas)." },
      { pergunta: "Qual comando mostra a versão do SQL Server real?", opcoes: ["SELECT @@VERSION;", "SHOW VERSION;", "VERSION();", "GET VERSION;"], respostaIndex: 0, explicacao: "SELECT @@VERSION; é a sintaxe do T-SQL." },
      { pergunta: "Qual coluna guarda o valor do boleto?", opcoes: ["cedente", "valor", "status", "vencimento"], respostaIndex: 1, explicacao: "A coluna valor (DECIMAL) guarda o valor do boleto." }
    ],
    exercicios: [
      { enunciado: "Conte quantos boletos existem no total.", solucao: "SELECT COUNT(*) FROM boletos;" },
      { enunciado: "Conte quantas linhas existem em cada uma das 3 tabelas, em um único resultado.", solucao: "SELECT 'boletos' as tabela, COUNT(*) as qtd FROM boletos\nUNION ALL\nSELECT 'remessas', COUNT(*) FROM remessas\nUNION ALL\nSELECT 'retornos', COUNT(*) FROM retornos;" }
    ],
    rafael: "Bem-vindo ao SQL Server! 🎲 Você acabou de dar o primeiro passo para entender todos os dados do DataCob. boletos, remessas e retornos são a base de tudo — próxima lição, vamos aprender SELECT!"
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
      { titulo: "Exemplos com boletos", codigo: "-- Todos os boletos, todas as colunas\nSELECT * FROM boletos;\n\n-- Só cedente e valor\nSELECT cedente, valor FROM boletos;\n\n-- Boletos pagos\nSELECT * FROM boletos WHERE status = 'PAGO';\n\n-- Boletos com valor > 1000\nSELECT cedente, valor FROM boletos WHERE valor > 1000;", explicacao: "O asterisco (*) traz todas as colunas; listar colunas específicas é mais eficiente e mais legível." }
    ],
    tryIt: {
      descricao: "Traga cedente, sacado e valor dos boletos de um cedente específico (\"Comercial Vitoria Ltda\", que existe no dataset).",
      query: "SELECT cedente, sacado, valor\nFROM boletos\nWHERE cedente = 'Comercial Vitoria Ltda';"
    },
    quiz: [
      { pergunta: "Qual comando traz dados de uma tabela?", opcoes: ["GET", "SELECT", "FETCH", "SHOW"], respostaIndex: 1, explicacao: "SELECT é o comando de leitura." },
      { pergunta: "O asterisco (*) em SELECT * significa o quê?", opcoes: ["Erro de sintaxe", "Todas as colunas", "Nenhuma coluna", "Apenas a primeira coluna"], respostaIndex: 1, explicacao: "* é um atalho para \"todas as colunas\"." },
      { pergunta: "WHERE filtra...", opcoes: ["Tabelas", "Linhas", "Colunas", "Bancos de dados"], respostaIndex: 1, explicacao: "WHERE decide quais linhas (registros) aparecem no resultado." },
      { pergunta: "Complete: SELECT cedente, valor ___ boletos", opcoes: ["FROM", "IN", "OF", "AT"], respostaIndex: 0, explicacao: "FROM indica a tabela de origem." },
      { pergunta: "O que SELECT COUNT(*) FROM boletos WHERE status='PAGO' retorna?", opcoes: ["Todas as colunas dos boletos pagos", "Um número: a quantidade de boletos pagos", "Erro", "Uma lista de status"], respostaIndex: 1, explicacao: "COUNT(*) agrega e devolve um único número." },
      { pergunta: "SELECT é case-sensitive (diferencia maiúsculas/minúsculas)?", opcoes: ["Verdadeiro", "Falso"], respostaIndex: 1, explicacao: "select, SELECT e Select funcionam igual — palavras-chave SQL não são case-sensitive." }
    ],
    exercicios: [
      { enunciado: "Traga cedente, sacado e valor dos boletos com valor maior que 500.", solucao: "SELECT cedente, sacado, valor FROM boletos WHERE valor > 500;" },
      { enunciado: "Traga todos os boletos com status 'VENCIDO'.", solucao: "SELECT * FROM boletos WHERE status = 'VENCIDO';" },
      { enunciado: "Traga o nome do sacado e a data de vencimento de todos os boletos.", solucao: "SELECT sacado, vencimento FROM boletos;" },
      { enunciado: "Traga os boletos criados em março de 2024 (dica: criado_em está no formato 'YYYY-MM-DD').", solucao: "SELECT * FROM boletos WHERE criado_em LIKE '2024-03%';" }
    ],
    rafael: "Excelente! 🎯 SELECT é o comando mais poderoso do SQL — com ele você vê dados, filtra o que interessa e organiza a informação. Próxima: WHERE para ser mais específico!"
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
        codigo: "-- Boletos vencidos e não pagos (data de hoje no servidor real)\nSELECT * FROM boletos\nWHERE vencimento < GETDATE() AND status != 'PAGO';\n\n-- Lista de cedentes\nSELECT * FROM boletos WHERE cedente IN ('Empresa A', 'Empresa B');\n\n-- Faixa de valores\nSELECT * FROM boletos WHERE valor BETWEEN 100 AND 1000;\n\n-- Nome começando com 'Maria'\nSELECT * FROM boletos WHERE sacado LIKE 'Maria%';\n\n-- Bradesco OU Itaú\nSELECT * FROM remessas WHERE banco = 'Bradesco' OR banco = 'Itau';",
        explicacao: "GETDATE() retorna a data/hora atual do servidor — funciona perfeitamente no seu SQL Server real. Como o dataset deste sandbox é fixo (datas de 2024), o exercício abaixo usa uma data fixa no lugar de GETDATE() para o resultado ser sempre o mesmo."
      }
    ],
    tryIt: {
      descricao: "Traga os boletos que não estão pagos (equivalente fixo ao exemplo com GETDATE() acima).",
      query: "SELECT * FROM boletos WHERE status != 'PAGO';",
      notaSimulador: "No SQL Server real, troque a comparação por vencimento < GETDATE() para pegar sempre a data de hoje."
    },
    quiz: [
      { pergunta: "AND exige que...", opcoes: ["Só uma condição seja verdadeira", "As duas condições sejam verdadeiras", "Nenhuma condição seja verdadeira"], respostaIndex: 1, explicacao: "AND é uma exigência conjunta." },
      { pergunta: "Qual operador significa \"contém um padrão de texto\"?", opcoes: ["IN", "LIKE", "BETWEEN"], respostaIndex: 1, explicacao: "LIKE usa % como comodim." },
      { pergunta: "IN serve para...", opcoes: ["Comparar duas colunas", "Verificar se um valor está em uma lista", "Ordenar resultados"], respostaIndex: 1, explicacao: "IN checa pertencimento a uma lista de valores." },
      { pergunta: "SELECT * FROM boletos WHERE valor > 100 AND status = 'PAGO' tem quantas condições?", opcoes: ["1", "2", "3"], respostaIndex: 1, explicacao: "valor > 100 e status = 'PAGO'." },
      { pergunta: "LIKE 'Maria%' encontra nomes que...", opcoes: ["Terminam com Maria", "Começam com Maria", "São exatamente 'Maria'"], respostaIndex: 1, explicacao: "% depois do texto = \"começa com\"." }
    ],
    exercicios: [
      { enunciado: "Traga remessas do tipo CNAB 400.", solucao: "SELECT * FROM remessas WHERE tipo_cnab = '400';" },
      { enunciado: "Traga boletos vencidos antes de 01/05/2024.", solucao: "SELECT * FROM boletos WHERE vencimento < '2024-05-01';" },
      { enunciado: "Traga boletos de 'Distribuidora Santos' ou 'Metalurgica Rio Claro' (use IN).", solucao: "SELECT * FROM boletos WHERE cedente IN ('Distribuidora Santos', 'Metalurgica Rio Claro');" },
      { enunciado: "Traga boletos com valor entre 100 e 1000.", solucao: "SELECT * FROM boletos WHERE valor BETWEEN 100 AND 1000;" }
    ],
    rafael: "Os dados não mentem, mas você precisa perguntar certo! 📊 AND, OR, IN, BETWEEN e LIKE são as ferramentas para perguntas precisas. Próxima seção: JOINs — juntar tabelas!"
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
    introducao: "Até agora consultamos uma tabela por vez. INNER JOIN combina linhas de duas tabelas que têm uma relação — por exemplo, um boleto e a remessa em que ele foi enviado.",
    conceitos: [
      { titulo: "Estrutura do INNER JOIN", codigo: "SELECT coluna1, coluna2\nFROM tabela1 t1\nINNER JOIN tabela2 t2 ON t1.id = t2.tabela1_id;", explicacao: "ON define a coluna que liga as duas tabelas (a \"chave\"). INNER JOIN só traz linhas que existem nas DUAS tabelas." },
      { titulo: "Boleto + Remessa", codigo: "SELECT b.cedente, b.sacado, b.valor, r.banco, r.data_envio\nFROM boletos b\nINNER JOIN remessas r ON b.id = r.boleto_id;", explicacao: "Boletos que nunca foram enviados em remessa NÃO aparecem aqui (veja a próxima lição: LEFT JOIN)." }
    ],
    tryIt: {
      descricao: "Rode o INNER JOIN de boletos com remessas.",
      query: "SELECT b.cedente, b.sacado, b.valor, r.banco, r.data_envio\nFROM boletos b\nINNER JOIN remessas r ON b.id = r.boleto_id;"
    },
    quiz: [
      { pergunta: "INNER JOIN traz linhas que existem...", opcoes: ["Só na primeira tabela", "Só na segunda tabela", "Nas duas tabelas"], respostaIndex: 2, explicacao: "INNER JOIN exige correspondência nas duas tabelas." },
      { pergunta: "O que a cláusula ON define?", opcoes: ["A ordenação", "A coluna que liga as duas tabelas", "O filtro de linhas"], respostaIndex: 1, explicacao: "ON é a condição de junção (a chave)." },
      { pergunta: "Um boleto sem remessa aparece em um INNER JOIN boletos + remessas?", opcoes: ["Sim", "Não"], respostaIndex: 1, explicacao: "Sem correspondência na tabela remessas, a linha não aparece." }
    ],
    exercicios: [
      { enunciado: "Traga sacado, cedente, valor do boleto e o status da remessa correspondente (use alias b e r).", solucao: "SELECT b.sacado, b.cedente, b.valor, r.banco\nFROM boletos b\nINNER JOIN remessas r ON b.id = r.boleto_id;" }
    ],
    rafael: "JOIN é onde o SQL realmente brilha! 🎲 Você conecta boletos, remessas e retornos como conectar as peças de um quebra-cabeça. Próxima: LEFT JOIN, pra não perder nenhum boleto."
  },

  {
    id: "7.5",
    secaoId: "joins",
    titulo: "LEFT JOIN",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "LEFT JOIN traz TODAS as linhas da primeira tabela, mesmo quando não há correspondência na segunda — os campos da segunda tabela vêm como NULL.",
    conceitos: [
      { titulo: "Boletos com ou sem remessa", codigo: "SELECT b.sacado, b.valor, r.banco\nFROM boletos b\nLEFT JOIN remessas r ON b.id = r.boleto_id;", explicacao: "Boletos que ainda não foram enviados em remessa aparecem com banco = NULL, em vez de simplesmente desaparecer do resultado." }
    ],
    tryIt: {
      descricao: "Rode o LEFT JOIN e observe quais boletos aparecem com banco em branco (NULL) — são os que ainda não foram enviados em remessa.",
      query: "SELECT b.sacado, b.valor, r.banco\nFROM boletos b\nLEFT JOIN remessas r ON b.id = r.boleto_id;"
    },
    quiz: [
      { pergunta: "LEFT JOIN garante que todas as linhas de qual tabela aparecem?", opcoes: ["Da tabela à esquerda (a primeira, no FROM)", "Da tabela à direita (a do JOIN)", "De nenhuma — só as que combinam"], respostaIndex: 0, explicacao: "\"LEFT\" refere-se à tabela do FROM." },
      { pergunta: "Quando não há correspondência, os campos da segunda tabela aparecem como...", opcoes: ["0 (zero)", "Texto vazio", "NULL"], respostaIndex: 2, explicacao: "NULL representa \"sem valor\"." }
    ],
    exercicios: [
      { enunciado: "Conte quantos boletos NÃO têm remessa correspondente (dica: WHERE r.banco IS NULL).", solucao: "SELECT COUNT(*)\nFROM boletos b\nLEFT JOIN remessas r ON b.id = r.boleto_id\nWHERE r.banco IS NULL;" }
    ],
    rafael: "LEFT JOIN é o JOIN mais usado no dia a dia de suporte — ele nunca \"esconde\" um boleto só porque falta um dado relacionado. 🎲"
  },

  {
    id: "7.6",
    secaoId: "joins",
    titulo: "Multiple JOINs",
    tempoMin: 25,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "Você pode encadear vários JOINs para juntar 3 ou mais tabelas — por exemplo, o fluxo completo: boleto → remessa → retorno.",
    conceitos: [
      { titulo: "3 tabelas em cadeia", codigo: "SELECT\n  b.cedente, b.sacado, b.valor,\n  r.banco, r.data_envio,\n  ret.status_pagamento, ret.data_movimento\nFROM boletos b\nLEFT JOIN remessas r ON b.id = r.boleto_id\nLEFT JOIN retornos ret ON b.id = ret.boleto_id\nORDER BY b.cedente;", explicacao: "Cada LEFT JOIN adiciona uma tabela sem perder boletos que ainda não chegaram a essa etapa do fluxo." }
    ],
    tryIt: {
      descricao: "Rode a cadeia completa de boleto + remessa + retorno.",
      query: "SELECT\n  b.cedente, b.sacado, b.valor,\n  r.banco, r.data_envio,\n  ret.status_pagamento, ret.data_movimento\nFROM boletos b\nLEFT JOIN remessas r ON b.id = r.boleto_id\nLEFT JOIN retornos ret ON b.id = ret.boleto_id\nORDER BY b.cedente;"
    },
    quiz: [
      { pergunta: "Quantos JOINs no máximo você pode encadear em uma query?", opcoes: ["Só 1", "Só 2", "Quantos forem necessários"], respostaIndex: 2, explicacao: "Não há limite prático — você encadeia quantas tabelas precisar." },
      { pergunta: "Por que usar LEFT JOIN (e não INNER JOIN) nessa cadeia boleto→remessa→retorno?", opcoes: ["Para não perder boletos que ainda não têm remessa/retorno", "Porque é mais rápido", "Não faz diferença"], respostaIndex: 0, explicacao: "INNER JOIN excluiria boletos ainda sem remessa ou sem retorno." }
    ],
    exercicios: [
      { enunciado: "Liste boletos, banco da remessa e status do retorno, mas só para o cedente 'Comercial Vitoria Ltda'.", solucao: "SELECT b.sacado, b.valor, r.banco, ret.status_pagamento\nFROM boletos b\nLEFT JOIN remessas r ON b.id = r.boleto_id\nLEFT JOIN retornos ret ON b.id = ret.boleto_id\nWHERE b.cedente = 'Comercial Vitoria Ltda';" }
    ],
    rafael: "Isso aqui é o coração da operação de cobrança: boleto, remessa e retorno na mesma tela. 📊 Você já domina JOINs — bora fechar essa seção com um capstone!"
  },

  {
    id: "7.7",
    secaoId: "joins",
    titulo: "Exercício Capstone: caminho completo de um boleto",
    tempoMin: 20,
    pontosLicao: 15,
    pontosQuizBonus: 0,
    introducao: "Vamos consolidar JOINs em um único exercício: rastrear a \"vida\" de UM boleto específico — dados do boleto, remessa e retorno, tudo junto.",
    conceitos: [
      {
        titulo: "Em SQL Server real, com parâmetro",
        codigo: "DECLARE @boleto_id INT = 1;\n\nSELECT b.cedente, b.sacado, b.valor,\n       r.banco, r.data_envio,\n       ret.status_pagamento, ret.valor_movimentado, ret.data_movimento\nFROM boletos b\nLEFT JOIN remessas r ON b.id = r.boleto_id\nLEFT JOIN retornos ret ON b.id = ret.boleto_id\nWHERE b.id = @boleto_id;",
        explicacao: "No servidor real você usaria uma variável (@boleto_id) para reaproveitar a mesma query com IDs diferentes. No sandbox abaixo, use o número direto (ex.: WHERE b.id = 1)."
      }
    ],
    tryIt: {
      descricao: "Rastreie o caminho completo do boleto #1 (troque o número para ver outro boleto).",
      query: "SELECT b.cedente, b.sacado, b.valor,\n       r.banco, r.data_envio,\n       ret.status_pagamento, ret.valor_movimentado, ret.data_movimento\nFROM boletos b\nLEFT JOIN remessas r ON b.id = r.boleto_id\nLEFT JOIN retornos ret ON b.id = ret.boleto_id\nWHERE b.id = 1;"
    },
    quiz: [],
    exercicios: [
      { enunciado: "Rastreie o caminho completo do boleto #8 (um dos que foi DEVOLVIDO no retorno).", solucao: "SELECT b.cedente, b.sacado, b.valor,\n       r.banco, r.data_envio,\n       ret.status_pagamento, ret.valor_movimentado, ret.data_movimento\nFROM boletos b\nLEFT JOIN remessas r ON b.id = r.boleto_id\nLEFT JOIN retornos ret ON b.id = ret.boleto_id\nWHERE b.id = 8;" }
    ],
    rafael: "Você acabou de construir a query que qualquer analista de cobrança usaria pra responder \"o que aconteceu com esse boleto?\" em segundos. 🚀 Badge JOIN Pro desbloqueado!"
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
    introducao: "Funções de agregação calculam um resultado a partir de várias linhas: quantidade, soma, média, máximo, mínimo.",
    conceitos: [
      { titulo: "As 5 funções básicas", codigo: "SELECT COUNT(*) as total_pago FROM boletos WHERE status = 'PAGO';\n\nSELECT SUM(valor) as total_valor FROM boletos;\n\nSELECT AVG(valor) as media_valor FROM boletos;\n\nSELECT MAX(valor) as maior_boleto, MIN(valor) as menor_boleto FROM boletos;", explicacao: "COUNT conta linhas, SUM soma, AVG tira a média, MAX/MIN pegam o maior/menor valor de uma coluna." }
    ],
    tryIt: {
      descricao: "Conte quantos boletos estão pagos.",
      query: "SELECT COUNT(*) as total_pago FROM boletos WHERE status = 'PAGO';"
    },
    quiz: [
      { pergunta: "Qual função soma os valores de uma coluna?", opcoes: ["COUNT", "SUM", "TOTAL"], respostaIndex: 1, explicacao: "SUM(coluna) soma todos os valores." },
      { pergunta: "COUNT(*) conta o quê?", opcoes: ["Só colunas não-nulas", "Todas as linhas", "Só valores distintos"], respostaIndex: 1, explicacao: "COUNT(*) conta todas as linhas do resultado." },
      { pergunta: "Qual função calcula a média?", opcoes: ["AVG", "MED", "MEAN"], respostaIndex: 0, explicacao: "AVG(coluna) é a média aritmética." }
    ],
    exercicios: [
      { enunciado: "Some o valor total de todos os boletos.", solucao: "SELECT SUM(valor) as total_valor FROM boletos;" },
      { enunciado: "Calcule o maior e o menor valor de boleto.", solucao: "SELECT MAX(valor) as maior_boleto, MIN(valor) as menor_boleto FROM boletos;" },
      { enunciado: "Calcule a média de valor dos boletos com status 'VENCIDO'.", solucao: "SELECT AVG(valor) as media_vencidos FROM boletos WHERE status = 'VENCIDO';" }
    ],
    rafael: "Agregação é como transformar centenas de linhas em UMA resposta clara. 📊 Próxima: GROUP BY, pra agregar por categoria em vez do total geral."
  },

  {
    id: "7.9",
    secaoId: "agregacao",
    titulo: "GROUP BY",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "GROUP BY agrupa linhas que têm o mesmo valor em uma coluna, e aplica a agregação em cada grupo separadamente — por exemplo, total de remessas POR banco.",
    conceitos: [
      { titulo: "Remessas por banco", codigo: "SELECT banco, COUNT(*) as qtd_remessas, SUM(total_valor) as valor_total\nFROM remessas\nGROUP BY banco;", explicacao: "Toda coluna que não está dentro de uma função de agregação precisa estar no GROUP BY." }
    ],
    tryIt: {
      descricao: "Agrupe as remessas por banco.",
      query: "SELECT banco, COUNT(*) as qtd_remessas, SUM(total_valor) as valor_total\nFROM remessas\nGROUP BY banco;"
    },
    quiz: [
      { pergunta: "GROUP BY agrupa linhas com o mesmo valor em qual tipo de coluna?", opcoes: ["Qualquer coluna escolhida no GROUP BY", "Só a chave primária", "Só colunas numéricas"], respostaIndex: 0, explicacao: "Você escolhe a coluna de agrupamento." },
      { pergunta: "SELECT cedente, COUNT(*) FROM boletos GROUP BY cedente traz um total...", opcoes: ["Geral, uma linha só", "Por cedente, uma linha por cedente", "Por boleto individual"], respostaIndex: 1, explicacao: "Uma linha de resultado por valor distinto de cedente." }
    ],
    exercicios: [
      { enunciado: "Calcule a quantidade e o valor total de boletos por cedente.", solucao: "SELECT cedente, COUNT(*) as qtd, SUM(valor) as valor_total FROM boletos GROUP BY cedente;" },
      { enunciado: "Calcule a média de valor por status de boleto.", solucao: "SELECT status, AVG(valor) as media FROM boletos GROUP BY status;" }
    ],
    rafael: "GROUP BY é a pergunta \"quero um resumo, mas separado por categoria\". 🎲 Próxima: HAVING, pra filtrar esses grupos."
  },

  {
    id: "7.10",
    secaoId: "agregacao",
    titulo: "HAVING",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "WHERE filtra linhas ANTES de agrupar; HAVING filtra os GRUPOS depois do GROUP BY — por exemplo, \"só cedentes com mais de 10 boletos\".",
    conceitos: [
      { titulo: "Filtrando grupos", codigo: "SELECT cedente, COUNT(*) as qtd_boletos, SUM(valor) as total_valor\nFROM boletos\nGROUP BY cedente\nHAVING COUNT(*) > 10;", explicacao: "HAVING usa o resultado da agregação (COUNT, SUM...) como condição — algo que o WHERE não consegue fazer." }
    ],
    tryIt: {
      descricao: "Mostre só cedentes com mais de 10 boletos.",
      query: "SELECT cedente, COUNT(*) as qtd_boletos, SUM(valor) as total_valor\nFROM boletos\nGROUP BY cedente\nHAVING COUNT(*) > 10;"
    },
    quiz: [
      { pergunta: "WHERE filtra antes ou depois do GROUP BY?", opcoes: ["Antes", "Depois"], respostaIndex: 0, explicacao: "WHERE filtra linhas cruas, antes de agrupar." },
      { pergunta: "HAVING filtra o quê?", opcoes: ["Linhas individuais", "Grupos (resultado da agregação)", "Colunas"], respostaIndex: 1, explicacao: "HAVING trabalha sobre o resultado já agregado (ex.: COUNT(*) > 10)." },
      { pergunta: "É possível usar WHERE e HAVING na mesma query?", opcoes: ["Sim", "Não"], respostaIndex: 0, explicacao: "WHERE filtra as linhas antes de agrupar, HAVING filtra os grupos depois — os dois podem coexistir." }
    ],
    exercicios: [
      { enunciado: "Mostre bancos com mais de 3 remessas.", solucao: "SELECT banco, COUNT(*) as qtd FROM remessas GROUP BY banco HAVING COUNT(*) > 3;" }
    ],
    rafael: "Badge Aggregation Expert desbloqueado! 🥈 Você já sabe resumir, agrupar E filtrar grupos — isso é praticamente um relatório gerencial pronto."
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
      { titulo: "Ordenar e limitar", codigo: "-- Maior valor primeiro\nSELECT cedente, valor FROM boletos ORDER BY valor DESC;\n\n-- Só os 5 maiores\nSELECT TOP 5 cedente, valor FROM boletos ORDER BY valor DESC;\n\n-- Múltiplas colunas\nSELECT * FROM boletos ORDER BY cedente ASC, valor DESC;", explicacao: "DESC = decrescente, ASC = crescente (padrão). TOP vem logo depois do SELECT." }
    ],
    tryIt: { descricao: "Traga os 5 boletos de maior valor.", query: "SELECT TOP 5 cedente, valor FROM boletos ORDER BY valor DESC;" },
    quiz: [
      { pergunta: "Qual palavra-chave limita a quantidade de linhas no SQL Server?", opcoes: ["LIMIT", "TOP", "FIRST"], respostaIndex: 1, explicacao: "SQL Server usa TOP (outros bancos usam LIMIT)." },
      { pergunta: "ORDER BY valor DESC ordena do...", opcoes: ["Menor para o maior", "Maior para o menor"], respostaIndex: 1, explicacao: "DESC = decrescente." }
    ],
    exercicios: [
      { enunciado: "Traga os 3 boletos de menor valor.", solucao: "SELECT TOP 3 cedente, valor FROM boletos ORDER BY valor ASC;" }
    ],
    rafael: "Ordenar e limitar parece simples, mas é o que transforma uma tabela gigante em um \"Top 10\" que qualquer gestor entende. 🚀"
  },

  {
    id: "7.12",
    secaoId: "avancado",
    titulo: "DISTINCT",
    tempoMin: 10,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "DISTINCT remove duplicatas do resultado — útil para saber quais valores diferentes existem em uma coluna.",
    conceitos: [
      { titulo: "Valores únicos", codigo: "-- Quais cedentes existem?\nSELECT DISTINCT cedente FROM boletos;\n\n-- Quantos cedentes diferentes?\nSELECT COUNT(DISTINCT cedente) FROM boletos;", explicacao: "DISTINCT pode ser combinado com COUNT para contar valores únicos." }
    ],
    tryIt: { descricao: "Veja quais cedentes existem na base.", query: "SELECT DISTINCT cedente FROM boletos;" },
    quiz: [
      { pergunta: "SELECT DISTINCT banco FROM remessas remove o quê do resultado?", opcoes: ["Colunas vazias", "Bancos repetidos", "Remessas antigas"], respostaIndex: 1, explicacao: "DISTINCT elimina linhas duplicadas do resultado." }
    ],
    exercicios: [
      { enunciado: "Conte quantos bancos diferentes aparecem nas remessas.", solucao: "SELECT COUNT(DISTINCT banco) FROM remessas;" }
    ],
    rafael: "Pergunta rápida que todo suporte já fez: \"quantos clientes diferentes tem essa base?\" — agora você sabe responder em uma linha. 📊"
  },

  {
    id: "7.13",
    secaoId: "avancado",
    titulo: "CASE WHEN",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "CASE WHEN cria uma coluna condicional — como um \"se/senão\" dentro do SELECT.",
    conceitos: [
      { titulo: "Categorizando valores", codigo: "SELECT cedente, valor,\n  CASE\n    WHEN valor < 100 THEN 'Pequeno'\n    WHEN valor BETWEEN 100 AND 1000 THEN 'Medio'\n    WHEN valor > 1000 THEN 'Grande'\n  END as categoria\nFROM boletos;", explicacao: "As condições são avaliadas em ordem; a primeira que for verdadeira \"ganha\" e define o valor da coluna categoria." }
    ],
    tryIt: {
      descricao: "Categorize os boletos por faixa de valor.",
      query: "SELECT cedente, valor,\n  CASE\n    WHEN valor < 100 THEN 'Pequeno'\n    WHEN valor BETWEEN 100 AND 1000 THEN 'Medio'\n    WHEN valor > 1000 THEN 'Grande'\n  END as categoria\nFROM boletos;"
    },
    quiz: [
      { pergunta: "CASE WHEN é avaliado dentro de qual cláusula?", opcoes: ["Só no WHERE", "No SELECT (cria uma coluna)", "Só no ORDER BY"], respostaIndex: 1, explicacao: "É mais comum usar CASE WHEN dentro do SELECT para criar uma coluna derivada." },
      { pergunta: "Se nenhuma condição do CASE for verdadeira e não houver ELSE, o resultado é...", opcoes: ["Erro", "0 (zero)", "NULL"], respostaIndex: 2, explicacao: "Sem ELSE, o CASE devolve NULL quando nenhuma condição bate." }
    ],
    exercicios: [
      { enunciado: "Crie uma coluna 'situacao' que mostra 'Em dia' quando status = 'PAGO' e 'Pendente' para os demais status.", solucao: "SELECT sacado, status,\n  CASE\n    WHEN status = 'PAGO' THEN 'Em dia'\n    ELSE 'Pendente'\n  END as situacao\nFROM boletos;" }
    ],
    rafael: "CASE WHEN é o \"se/senão\" do SQL — extremamente útil pra deixar relatórios legíveis pra quem não sabe SQL. 🎲"
  },

  {
    id: "7.14",
    secaoId: "avancado",
    titulo: "Funções de Data",
    tempoMin: 20,
    pontosLicao: 10,
    pontosQuizBonus: 5,
    introducao: "T-SQL tem funções prontas para trabalhar com datas: pegar a data de hoje, extrair ano/mês/dia, calcular diferença entre datas.",
    conceitos: [
      {
        titulo: "Funções de data (T-SQL real)",
        codigo: "SELECT\n  GETDATE() as hoje,\n  YEAR(criado_em) as ano,\n  MONTH(criado_em) as mes,\n  DAY(vencimento) as dia_vencimento,\n  DATEDIFF(DAY, criado_em, vencimento) as dias_para_vencer,\n  FORMAT(criado_em, 'dd/MM/yyyy') as data_formatada\nFROM boletos;",
        explicacao: "GETDATE() e FORMAT() funcionam perfeitamente no seu SQL Server real. Como este sandbox usa datas fixas de 2024, o exercício abaixo evita GETDATE() (que sempre traria a data de hoje do seu computador) para o resultado ser sempre igual."
      }
    ],
    tryIt: {
      descricao: "Calcule quantos dias existem entre a criação e o vencimento de cada boleto.",
      query: "SELECT sacado, criado_em, vencimento,\n  DATEDIFF(DAY, criado_em, vencimento) as dias_para_vencer\nFROM boletos;",
      notaSimulador: "GETDATE() e FORMAT() são reais do T-SQL, mas dependem da data/hora do servidor — evitados aqui só para o resultado do sandbox ser sempre reproduzível."
    },
    quiz: [
      { pergunta: "GETDATE() retorna...", opcoes: ["A data de criação da tabela", "A data/hora atual do servidor", "A data do primeiro registro"], respostaIndex: 1, explicacao: "GETDATE() é sempre \"agora\", no servidor." },
      { pergunta: "YEAR(coluna_data) extrai...", opcoes: ["O ano da data", "O dia da semana", "O fuso horário"], respostaIndex: 0, explicacao: "YEAR/MONTH/DAY extraem partes de uma data." },
      { pergunta: "DATEDIFF(DAY, data1, data2) calcula...", opcoes: ["A soma das duas datas", "A diferença em dias entre as duas datas", "Se as datas são iguais"], respostaIndex: 1, explicacao: "DATEDIFF mede a distância entre duas datas na unidade escolhida (DAY, MONTH...)." }
    ],
    exercicios: [
      { enunciado: "Mostre o ano e o mês de vencimento de cada boleto.", solucao: "SELECT sacado, YEAR(vencimento) as ano, MONTH(vencimento) as mes FROM boletos;" }
    ],
    rafael: "Datas são A parte do SQL que mais gera bug em produção — DATEDIFF bem usado evita muita dor de cabeça. 🔥"
  },

  {
    id: "7.15",
    secaoId: "avancado",
    titulo: "Projeto Final: Dashboard SQL",
    tempoMin: 30,
    pontosLicao: 100,
    pontosQuizBonus: 0,
    introducao: "Vamos consolidar tudo que você aprendeu em um mini-dashboard: KPIs gerais, remessas por banco, retornos por status e os cedentes com melhor desempenho.",
    conceitos: [
      { titulo: "1. KPIs principais", codigo: "SELECT\n  COUNT(*) as total_boletos,\n  SUM(valor) as valor_total,\n  COUNT(CASE WHEN status='PAGO' THEN 1 END) as boletos_pagos\nFROM boletos;", explicacao: "COUNT(CASE WHEN ... THEN 1 END) é um truque clássico para contar condicionalmente dentro de uma agregação." },
      { titulo: "2. Remessas por banco", codigo: "SELECT banco, COUNT(*) as qtd_remessas, SUM(total_valor) as valor\nFROM remessas\nGROUP BY banco;", explicacao: "Mesma lógica da lição 7.9." },
      { titulo: "3. Retornos por status", codigo: "SELECT status_pagamento, COUNT(*) as qtd_movimentos, SUM(valor_movimentado) as valor\nFROM retornos\nGROUP BY status_pagamento;", explicacao: "PAGO vs DEVOLVIDO — a visão de qualidade da carteira." },
      { titulo: "4. Top 5 cedentes", codigo: "SELECT TOP 5 cedente, COUNT(*) as boletos_emitidos, SUM(valor) as valor_total\nFROM boletos\nGROUP BY cedente\nORDER BY valor_total DESC;", explicacao: "Combina GROUP BY + ORDER BY + TOP — três lições anteriores, uma query só." }
    ],
    tryIt: {
      descricao: "Rode o primeiro bloco do dashboard: os KPIs principais.",
      query: "SELECT\n  COUNT(*) as total_boletos,\n  SUM(valor) as valor_total,\n  COUNT(CASE WHEN status='PAGO' THEN 1 END) as boletos_pagos\nFROM boletos;"
    },
    quiz: [
      { pergunta: "COUNT(CASE WHEN status='PAGO' THEN 1 END) conta...", opcoes: ["Todos os boletos", "Só os boletos com status PAGO", "Sempre zero"], respostaIndex: 1, explicacao: "CASE WHEN devolve 1 (ou NULL) por linha; COUNT ignora os NULL, então só conta os PAGO." },
      { pergunta: "Que combinação de cláusulas o \"Top 5 cedentes\" usa?", opcoes: ["Só WHERE", "GROUP BY + ORDER BY + TOP", "Só JOIN"], respostaIndex: 1, explicacao: "Agrupa por cedente, ordena pelo total e limita a 5." }
    ],
    exercicios: [
      { enunciado: "Rode os 4 blocos do dashboard (KPIs, remessas por banco, retornos por status e top 5 cedentes) e compare os resultados.", solucao: "-- Bloco 2\nSELECT banco, COUNT(*) as qtd_remessas, SUM(total_valor) as valor FROM remessas GROUP BY banco;\n\n-- Bloco 3\nSELECT status_pagamento, COUNT(*) as qtd_movimentos, SUM(valor_movimentado) as valor FROM retornos GROUP BY status_pagamento;\n\n-- Bloco 4\nSELECT TOP 5 cedente, COUNT(*) as boletos_emitidos, SUM(valor) as valor_total FROM boletos GROUP BY cedente ORDER BY valor_total DESC;" }
    ],
    rafael: "Query otimizada! 🚀 Você chegou no fim do Track 7 e construiu um dashboard real com as próprias mãos. Badge SQL Dashboard Builder e — se completou tudo — DataCob Data Analyst desbloqueados! 👑"
  }
];

export function encontrarLicao(licaoId) {
  return TRACK_7_LICOES.find((l) => l.id === licaoId) || null;
}
