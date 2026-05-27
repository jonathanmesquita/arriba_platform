# v2.7.7 - Copilot Popup UX

Melhoria visual do Support Copilot para exibir avisos suaves no lado direito da tela.

## Incluido

- Popup lateral ao concluir a analise.
- Popup lateral para erros de busca/análise.
- Mensagens amigáveis para falhas de rede, CORS, 401/403, 404 e instabilidade 5xx.
- Stack limitado a 3 avisos simultaneos.
- Animação suave de entrada/saida.
- Layout responsivo: no mobile, o aviso aparece na parte inferior.

## Fluxo esperado

- Ticket carregado: aviso informativo.
- Busca por assunto concluida: aviso informativo.
- Analise concluida: aviso verde de sucesso.
- Erro de API/Freshdesk: aviso suave em vermelho, sem quebrar a tela.

## Modo seguro

Nenhuma escrita no Freshdesk foi adicionada. A alteração é somente frontend/UX.
