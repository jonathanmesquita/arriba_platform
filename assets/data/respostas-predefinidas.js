// Respostas predefinidas para o Support Copilot (aba "Respostas Prontas").
// Biblioteca estatica de respostas rapidas, complementar a resposta gerada
// automaticamente pela analise do ticket. Editar este arquivo para
// adicionar, remover ou ajustar grupos/respostas - nenhuma outra tela
// precisa mudar.

export const RESPOSTAS_PREDEFINIDAS = [
  {
    id: "geral",
    nome: "Geral",
    icone: "📋",
    respostas: [
      {
        id: "boas-vindas",
        titulo: "Boas-vindas",
        mensagem: "Ola! Obrigado por entrar em contato com o suporte DataCob. Como posso ajudar voce hoje?"
      },
      {
        id: "agradecimento",
        titulo: "Agradecimento",
        mensagem: "Obrigado pelo retorno! Fico a disposicao caso surja qualquer outra duvida."
      },
      {
        id: "aguardando-analise",
        titulo: "Aguardando analise",
        mensagem: "Recebi sua solicitacao e vou analisar com atencao. Retorno em breve com uma posicao."
      },
      {
        id: "solicitar-mais-informacoes",
        titulo: "Solicitar mais informacoes",
        mensagem: "Para seguir com a analise, poderia me enviar:\n1. Ambiente (producao ou homologacao)\n2. Print ou mensagem completa do erro\n3. Passo a passo para reproduzir o problema"
      }
    ]
  },
  {
    id: "suporte",
    nome: "Suporte Tecnico",
    icone: "🔧",
    respostas: [
      {
        id: "verificar-log",
        titulo: "Verificar log de erro",
        mensagem: "Para prosseguirmos, poderia verificar o log do sistema no momento do erro e compartilhar o trecho relevante (data/hora aproximada ajuda bastante)?"
      },
      {
        id: "reiniciar-servico",
        titulo: "Reiniciar servico",
        mensagem: "Peco que reinicie o servico/aplicacao e tente novamente a operacao. Se o erro persistir, me avise que seguimos a analise."
      },
      {
        id: "limpar-cache",
        titulo: "Limpar cache do navegador",
        mensagem: "Esse comportamento costuma estar relacionado a cache do navegador. Poderia limpar o cache (ou testar em uma aba anonima) e tentar novamente?"
      }
    ]
  },
  {
    id: "datacob",
    nome: "DataCob Especifico",
    icone: "🏦",
    respostas: [
      {
        id: "erro-integracao",
        titulo: "Erro de integracao",
        mensagem: "Para investigar o erro de integracao, poderia confirmar:\n- As credenciais de acesso estao corretas e ativas?\n- O certificado/token nao esta expirado?\n- Existe algum bloqueio de firewall/rede para o endpoint utilizado?"
      },
      {
        id: "cnab-400",
        titulo: "Geracao de CNAB 400",
        mensagem: "Para gerar o arquivo de remessa CNAB 400, use a ferramenta multi-banco em Ferramentas > DataCob > CNAB 400: selecione o banco, a direcao (Remessa) e preencha os campos indicados. O arquivo .txt fica disponivel para download na hora."
      },
      {
        id: "retorno-cnab",
        titulo: "Leitura de retorno CNAB",
        mensagem: "Para validar um arquivo de retorno, abra Ferramentas > DataCob > CNAB 400, selecione o banco correspondente e a direcao Retorno, e cole ou envie o arquivo (.txt/.ret) recebido do banco."
      },
      {
        id: "negativacao",
        titulo: "Duvida sobre negativacao",
        mensagem: "Para negativacao, confirme se o contrato/parcela atende aos criterios minimos configurados (valor, atraso, carteira) antes de reenviar a instrucao. Qualquer duvida sobre o fluxo, consulte o manual de Negativacao na Base de Conhecimento."
      }
    ]
  },
  {
    id: "agendamento",
    nome: "Agendamento",
    icone: "📅",
    respostas: [
      {
        id: "call-marcada",
        titulo: "Call marcada",
        mensagem: "Perfeito! Agendei uma call para:\nData: [DATA]\nHorario: [HORA]\nLink da reuniao: [LINK]\n\nAte la!"
      },
      {
        id: "disponibilidade",
        titulo: "Consultar disponibilidade",
        mensagem: "Qual seria o melhor horario para voce? Nossa disponibilidade padrao e:\n- Segunda a quinta: 09h as 17h\n- Sexta: 09h as 15h\n(Horario de Brasilia)"
      }
    ]
  },
  {
    id: "encerramento",
    nome: "Encerramento",
    icone: "✅",
    respostas: [
      {
        id: "problema-resolvido",
        titulo: "Problema resolvido",
        mensagem: "Que otimo! Fico feliz que conseguimos resolver. Qualquer outra duvida, e so chamar por aqui."
      },
      {
        id: "solicitar-feedback",
        titulo: "Solicitar feedback",
        mensagem: "Antes de encerrar: como foi sua experiencia com nosso suporte neste atendimento? Seu feedback nos ajuda a melhorar."
      },
      {
        id: "ticket-encerrado",
        titulo: "Ticket encerrado por inatividade",
        mensagem: "Como nao tivemos retorno, vamos encerrar este ticket por ora. Se precisar retomar o assunto, e so responder este mesmo chamado ou abrir um novo."
      }
    ]
  }
];
