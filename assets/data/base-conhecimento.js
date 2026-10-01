/* =====================================================================
   Base de conhecimento do protótipo

   O chat responde a partir daqui, no próprio navegador, sem rede e sem
   chave de API. O conteúdo é sobre **as ferramentas deste repositório** —
   é o que um protótipo tem para explicar.

   Antes havia aqui uma base de operação de um produto específico, com
   procedimento interno e nome de cliente; saiu junto com o resto do
   material de empresa quando o projeto virou protótipo de estudos.

   Formato de cada entrada (o chat lê estes campos):
     id · titulo · produto · categoria · palavrasChave[] · perguntaExemplo
     caminhoTela · resumo · passos[] · checklist[] · linkManual
   ===================================================================== */

export const KNOWLEDGE_BASE = [
  {
    id: "cnab-400-validar",
    titulo: "Validar um arquivo CNAB 400",
    produto: "Ferramentas",
    categoria: "Arquivo bancário",
    palavrasChave: ["cnab", "400", "remessa", "retorno", "banco", "boleto", "validar", "rem", "ret"],
    perguntaExemplo: "Como eu confiro se o arquivo de retorno do banco está correto?",
    caminhoTela: "Ferramentas › Cobrança › Validador CNAB 400",
    resumo:
      "Lê arquivos de 400 posições (remessa e retorno) de vários bancos, campo a campo, " +
      "e aponta posição inválida, ocorrência desconhecida e trailer que não fecha. " +
      "O processamento é 100% no navegador — o arquivo não sai da máquina.",
    passos: [
      "Escolha o banco (o layout muda de um para outro).",
      "Solte o arquivo .REM ou .RET na área de leitura.",
      "Confira o resumo: header, quantidade de títulos e total do trailer.",
      "Abra um título para ver cada campo com a posição que o manual define.",
      "Para corrigir e regerar, use 'Editar e gerar novo arquivo'."
    ],
    checklist: [
      "Arquivo truncado é detectado pela conferência do trailer",
      "Posição do manual é 1-indexada e inclusiva",
      "Campo sem confirmação em fonte real aparece marcado"
    ],
    linkManual: "/tools/cobranca/cnab400/cnab400.html"
  },
  {
    id: "csv-validar",
    titulo: "Conferir um arquivo CSV antes de importar",
    produto: "Ferramentas",
    categoria: "Dados",
    palavrasChave: ["csv", "validar", "delimitador", "cabecalho", "coluna", "importacao", "planilha"],
    perguntaExemplo: "Por que a importação do meu CSV falha?",
    caminhoTela: "Ferramentas › Dados › Validador de CSV",
    resumo:
      "Separa dois assuntos que costumam ser confundidos: se o arquivo está bem formado " +
      "(RFC 4180 — aspas, delimitador e quebra de linha dentro do campo) e se o conteúdo " +
      "está certo (tipo por coluna, obrigatório, único, tamanho, lista de valores).",
    passos: [
      "Solte o .csv na área de leitura.",
      "Veja primeiro os erros de estrutura — linha com número de colunas diferente do cabeçalho é o mais comum.",
      "Depois ajuste as regras de conteúdo por coluna e rode de novo.",
      "A grade mostra as primeiras linhas; a validação roda em todas."
    ],
    checklist: [
      "Campo vazio não é testado pelo tipo — quem cobra vazio é a regra de obrigatório",
      "Endereço com ponto e vírgula dentro de aspas é válido e não quebra o arquivo"
    ],
    linkManual: "/tools/dados/csv-validator/csv-validator.html"
  },
  {
    id: "base64-pdf",
    titulo: "Transformar Base64 em PDF",
    produto: "Ferramentas",
    categoria: "Dados",
    palavrasChave: ["base64", "pdf", "boleto", "decodificar", "json", "data uri"],
    perguntaExemplo: "Recebi um Base64 na resposta da API; como vejo o PDF?",
    caminhoTela: "Ferramentas › Dados › Boleto Base64 → PDF",
    resumo:
      "Cola-se o Base64 (puro ou dentro de um JSON) e o PDF é montado e aberto no navegador. " +
      "O conteúdo é reconhecido pelos bytes mágicos %PDF, então não importa onde ele esteja no JSON.",
    passos: [
      "Cole o texto completo, inclusive o JSON inteiro se for o caso.",
      "O conteúdo é detectado e decodificado automaticamente.",
      "Visualize ou baixe o arquivo."
    ],
    checklist: ["Nada é enviado para servidor — a decodificação é local"],
    linkManual: "/tools/dados/base64-pdf/base64-pdf.html"
  },
  {
    id: "editor-web",
    titulo: "Testar HTML, CSS e JavaScript com preview ao vivo",
    produto: "Aprender",
    categoria: "Front-end",
    palavrasChave: ["editor", "html", "css", "javascript", "preview", "sandbox", "try it yourself"],
    perguntaExemplo: "Tem onde eu testar um trecho de HTML rapidinho?",
    caminhoTela: "Ferramentas › Dados › Editor Web",
    resumo:
      "Três abas (HTML, CSS, JS) viram um documento só, renderizado ao vivo. O código roda " +
      "isolado em origem opaca: executa de verdade, mas não alcança o armazenamento nem a página do site.",
    passos: [
      "Escreva nas três abas ou comece por um exemplo pronto.",
      "O preview atualiza enquanto você digita.",
      "O console do seu código aparece abaixo do preview.",
      "Baixe o .html quando quiser levar embora."
    ],
    checklist: ["O rascunho fica salvo no navegador", "O arquivo baixado sai sem o código de instrumentação"],
    linkManual: "/tools/dados/editor-web/editor-web.html"
  },
  {
    id: "sql-praticar",
    titulo: "Praticar SQL sem banco de dados",
    produto: "Aprender",
    categoria: "SQL",
    palavrasChave: ["sql", "treinamento", "playground", "select", "join", "simulador", "consulta"],
    perguntaExemplo: "Onde eu treino consulta SQL?",
    caminhoTela: "Documentação › Aprender › Treinamento SQL / SQL Playground",
    resumo:
      "A trilha traz lições com teoria, exemplo e exercício corrigido na hora; o playground é " +
      "livre, com navegador de schema, histórico e consultas salvas. Tudo roda no navegador, " +
      "sobre um conjunto de dados inventado.",
    passos: [
      "Comece pela trilha se quiser sequência; vá ao playground se quiser explorar.",
      "Use o navegador de schema para ver tabelas, chaves e relacionamentos.",
      "Salve as consultas que quiser reaproveitar.",
      "Exporte o resultado em CSV quando precisar."
    ],
    checklist: ["Nenhuma conexão com banco real", "Os dados são fictícios"],
    linkManual: "/tools/cobranca/sql-playground/sql-playground.html"
  },
  {
    id: "massa-dados",
    titulo: "Gerar massa de dados fictícia",
    produto: "Ferramentas",
    categoria: "Dados",
    palavrasChave: ["massa", "dados", "ficticio", "cpf", "cnpj", "teste", "gerador", "fake"],
    perguntaExemplo: "Preciso de CPFs válidos para testar uma importação.",
    caminhoTela: "Ferramentas › Cobrança › Massa de Dados",
    resumo:
      "Gera nome, CPF/CNPJ com dígito válido, telefone, CEP, endereço e e-mail brasileiros " +
      "inventados, prontos para exportar em CSV — para testar sem usar dado de pessoa real.",
    passos: [
      "Escolha a quantidade de registros e as colunas.",
      "Gere e confira na grade.",
      "Exporte em CSV e use no validador para fechar o ciclo."
    ],
    checklist: ["Os documentos passam na validação de dígito, mas não pertencem a ninguém"],
    linkManual: "/tools/cobranca/massa-dados/massa-dados.html"
  }
];

/** Atalhos mostrados quando a conversa começa. */
export const QUICK_TOPICS = [
  { id: "cnab-400-validar", rotulo: "Validar arquivo CNAB", resumo: "Remessa e retorno, campo a campo" },
  { id: "csv-validar", rotulo: "Conferir um CSV", resumo: "Estrutura e conteúdo, separados" },
  { id: "sql-praticar", rotulo: "Praticar SQL", resumo: "Trilha e playground no navegador" },
  { id: "editor-web", rotulo: "Testar HTML/CSS/JS", resumo: "Preview ao vivo, isolado" }
];
