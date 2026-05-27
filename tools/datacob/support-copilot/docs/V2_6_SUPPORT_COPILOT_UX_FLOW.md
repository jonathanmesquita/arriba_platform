# v2.6 - Support Copilot UX Flow

Esta versão melhora apenas a experiência do usuário da tela `support-copilot.html`, mantendo o estilo Oracle UX/dark enterprise e sem alterar domínio/API.

## Melhorias

- Card de diagnóstico principal do Copilot.
- Barra de fluxo: Entrada -> Ticket -> Base -> Análise.
- Ações rápidas: copiar resposta final, copiar nota interna e abrir base sugerida.
- Reordenação das abas para priorizar o fluxo do analista: Resumo, Base, Resposta, Nota interna, Tickets, Contato, Checklist, DEV, Qualidade, Variáveis e Validação.
- Correção da estrutura da aba Resposta.
- Melhor responsividade dos blocos principais.

## Modo seguro

A versão mantém o comportamento read-only. Nenhuma ação grava nota, tags ou atualiza ticket no Freshdesk.

## Testes sugeridos

1. Abrir `tools/datacob/support-copilot/support-copilot.html`.
2. Carregar demo.
3. Ver o card Diagnóstico do Copilot.
4. Testar Copiar resposta final.
5. Testar Copiar nota interna.
6. Testar Ver base sugerida.
7. Buscar/analisar um ticket real.
