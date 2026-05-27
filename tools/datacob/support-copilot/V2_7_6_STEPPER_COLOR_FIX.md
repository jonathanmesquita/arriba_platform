# v2.7.6 - Stepper Color Fix

Correção visual do fluxo do Support Copilot.

## Ajuste

O stepper agora usa cor independente por etapa:

- Entrada: vermelho
- Ticket: amarelo
- Base: azul
- Analise: verde

Antes, os passos ativos herdavam a cor do estado atual e ficavam com aparência incorreta.

## Arquivos alterados

- tools/datacob/support-copilot/support-copilot.css
- tools/datacob/support-copilot/support-copilot.js

## Não altera

- API
- backend
- domínios
- Freshdesk
- modo read-only
