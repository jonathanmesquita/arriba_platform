export const DATACOB_QUICK_TOPICS = [
  "Cadastrar juros",
  "Recepcao de arquivo",
  "Atualizacao de versao",
  "Negativacao",
  "Gerar token API",
  "Erro ao importar contrato"
];

export const DATACOB_KNOWLEDGE_BASE = [
  {
    id: "datacob-juros-divida",
    titulo: "Cadastro de juros sobre a divida",
    produto: "DataCob",
    categoria: "Parametros / Contrato",
    palavrasChave: ["juros", "divida", "divida", "contrato", "parcela", "acordo", "mora", "calculo"],
    perguntaExemplo: "Como cadastrar juros sobre a divida?",
    caminhoTela: "Parametros > Visualizacao de Parametros > Contrato > Juros",
    resumo: "Orienta o analista a configurar regras de juros sobre divida no DataCob.",
    passos: [
      "Acesse o menu Parametros.",
      "Entre em Visualizacao de Parametros.",
      "Abra a area de Contrato.",
      "Localize a configuracao relacionada a juros.",
      "Valide se a regra sera aplicada por grupo, cliente, fase ou carteira.",
      "Salve a configuracao e teste em um contrato de exemplo."
    ],
    checklist: [
      "Confirmar se o cliente utiliza regra de juros.",
      "Validar grupo, cliente, fase ou carteira.",
      "Conferir se a regra impacta acordo, contrato ou parcela.",
      "Testar em contrato de exemplo.",
      "Registrar evidencia se necessario."
    ],
    linkManual: "/pages/docs/help-center/datacob/parametros/juros-divida.html",
    tipoFreshdeskSugerido: "Duvida",
    quandoEncaminharDev: "Encaminhar para DEV apenas se a regra nao estiver sendo aplicada corretamente apos validacao dos parametros."
  },
  {
    id: "datacob-recepcao-arquivo",
    titulo: "Recepcao de arquivo DataCob",
    produto: "DataCob",
    categoria: "Recepcao / Carga",
    palavrasChave: ["recepcao", "receber", "arquivo", "importar", "importacao", "carga", "layout", "contrato", "parcela", "csv", "erro ao importar"],
    perguntaExemplo: "Erro ao importar contrato no DataCob",
    caminhoTela: "Operacoes > Recepcao > Arquivos",
    resumo: "Ajuda o suporte a validar arquivos de carga, layout, registros obrigatorios e erros de importacao.",
    passos: [
      "Confirme qual tipo de arquivo esta sendo importado: titular, contrato, parcela ou combinado.",
      "Valide se o layout usado corresponde ao layout esperado pelo DataCob.",
      "Confira campos obrigatorios, separador, encoding e formato de datas/valores.",
      "Execute a recepcao em ambiente de teste quando possivel.",
      "Analise o log da recepcao e identifique a linha/campo com erro.",
      "Oriente ajuste no arquivo antes de abrir solicitacao tecnica."
    ],
    checklist: [
      "Arquivo anexado ao chamado.",
      "Layout informado pelo cliente.",
      "Linha e campo com erro identificados.",
      "Print/log da recepcao anexado.",
      "Validacao feita com arquivo pequeno de exemplo."
    ],
    linkManual: "/tools/datacob/arriba-csv-generator/docs/layout-padrao.html",
    tipoFreshdeskSugerido: "Duvida",
    quandoEncaminharDev: "Encaminhar para DEV se o arquivo estiver aderente ao layout e mesmo assim a recepcao falhar com erro sistemico."
  },
  {
    id: "datacob-atualizacao-versao",
    titulo: "Agendamento automatico de versao DataCob",
    produto: "DataCob",
    categoria: "Versao",
    palavrasChave: ["versao", "atualizacao", "homologacao", "producao", "virada", "checklist", "agendamento"],
    perguntaExemplo: "Como fazer atualizacao de versao?",
    caminhoTela: "Ajuda (?) > Checklist versao > Agendamento",
    resumo: "Orienta o analista sobre checklist, homologacao e regras de agendamento de virada de versao.",
    passos: [
      "Confirme se o cliente esta no ambiente de homologacao.",
      "Oriente o acesso ao icone de ajuda (?) e ao checklist de versao.",
      "Valide se todas as etapas do checklist foram finalizadas.",
      "Confirme data e horario pretendidos para a virada.",
      "Se for no mesmo dia, valide a regra operacional de horario.",
      "Acompanhe a confirmacao do agendamento."
    ],
    checklist: [
      "Checklist finalizado em homologacao.",
      "Data e horario confirmados.",
      "Regras de sexta/sabado/domingo validadas.",
      "Cliente ciente do impacto da virada.",
      "Evidencia do checklist registrada."
    ],
    linkManual: "/tools/datacob/support-copilot/docs/datacob/versao/agendamento-automatico-de-versao/",
    tipoFreshdeskSugerido: "Versao",
    quandoEncaminharDev: "Encaminhar para DEV apenas se houver falha tecnica no processo de checklist ou agendamento."
  },
  {
    id: "datacob-api-token",
    titulo: "Geracao de token API DataCob",
    produto: "DataCob",
    categoria: "API / Usuarios",
    palavrasChave: ["api", "token", "apikey", "api key", "swagger", "usuario api", "usuarios", "login api", "403", "400", "forbidden"],
    perguntaExemplo: "Como gerar token API no DataCob?",
    caminhoTela: "Operacoes > Controles > Usuarios > Gerar Token API",
    resumo: "Orienta a geracao de token API, uso da API Key, validade do token e erros comuns de permissao.",
    passos: [
      "Acesse Operacoes.",
      "Entre em Controles e depois Usuarios.",
      "Selecione o usuario API correto.",
      "Clique em Gerar Token API.",
      "Defina a validade respeitando o limite permitido.",
      "Copie o token e valide a autenticacao no Swagger."
    ],
    checklist: [
      "Usuario correto selecionado.",
      "Permissao de API validada.",
      "Validade do token conferida.",
      "API Key usada corretamente.",
      "Em erro 400, validar payload, login, senha e API Key.",
      "Em erro 403, validar permissao do usuario/token."
    ],
    linkManual: "/tools/datacob/support-copilot/docs/datacob/api/cadastro-token-usuarios-datacob/",
    tipoFreshdeskSugerido: "Integracao",
    quandoEncaminharDev: "Encaminhar para DEV se login, API Key, permissao e payload estiverem corretos e a API continuar retornando erro inesperado."
  },
  {
    id: "datacob-negativacao",
    titulo: "Negativacao DataCob",
    produto: "DataCob",
    categoria: "Ações em Massa / Negativação",
    palavrasChave: ["ações em massa", "acoes em massa", "negativacao", "serasa", "bureau", "spc", "boa vista", "scpc", "retorno", "inclusao", "exclusao", "cobranca"],
    perguntaExemplo: "Como configurar negativacao?",
    caminhoTela: "Acao de Cobranca > Bureaus / Resumo > Opcoes > Contrato > Detalhes Negativacao",
    resumo: "Ajuda o analista a validar configuracao de negativacao, bureau utilizado, retorno e status do contrato.",
    passos: [
      "Confirme se o caso e configuracao, inclusao, exclusao, retorno ou status.",
      "Valide se existe configuracao de negativacao vinculada ao Grupo/Cliente/Fase.",
      "Identifique o bureau envolvido: Serasa, Boa Vista, SCPC ou SPC.",
      "Valide filtros, estrategia e tipo de operacao.",
      "Recepcione o retorno quando houver fluxo por arquivo.",
      "Confira o status em Detalhes Negativacao."
    ],
    checklist: [
      "Bureau identificado.",
      "Grupo/Cliente/Fase conferido.",
      "Estrategia e filtros validados.",
      "Arquivo de retorno recepcionado quando aplicavel.",
      "Logs e status anexados ao chamado."
    ],
    linkManual: "/tools/datacob/support-copilot/docs/datacob/acoes-em-massa/negativacao/",
    tipoFreshdeskSugerido: "Negativacao",
    quandoEncaminharDev: "Encaminhar para DEV se configuracao e retorno estiverem corretos, mas o status permanecer divergente ou houver erro sistemico."
  },
  {
    id: "datacob-acordo-boleto",
    titulo: "Acordo, boleto e carteira DataCob",
    produto: "DataCob",
    categoria: "Carteira / Acordo / Boleto",
    palavrasChave: ["acordo", "boleto", "carteira", "grupo", "cliente", "fase", "regua", "sub-regua", "recibo", "conta bancaria"],
    perguntaExemplo: "Como validar boleto de acordo?",
    caminhoTela: "Parametros > Grupo Cliente Fase / Carteira > Boleto / Acordo",
    resumo: "Orienta validacoes de carteira, grupo/cliente/fase, conta, boleto, acordo e recibo.",
    passos: [
      "Confirme se e cadastro novo ou ajuste de carteira existente.",
      "Valide Grupo/Cliente/Fase e IDs usados no layout.",
      "Confira conta bancaria, registro de boleto e webservice quando houver.",
      "Valide parametros de acordo, recibo e modelo de carta.",
      "Teste a geracao do boleto em contrato controlado."
    ],
    checklist: [
      "Grupo/Cliente/Fase corretos.",
      "Conta bancaria e convenio conferidos.",
      "Parametro de acordo validado.",
      "Modelo de carta boleto conferido.",
      "Teste realizado em contrato de exemplo."
    ],
    linkManual: "/tools/datacob/support-copilot/docs/datacob/carteira/cadastro-nova-carteira-datacob/",
    tipoFreshdeskSugerido: "Duvida",
    quandoEncaminharDev: "Encaminhar para DEV se a parametrizacao estiver correta e o boleto/acordo apresentar erro tecnico reproduzivel."
  }
];
