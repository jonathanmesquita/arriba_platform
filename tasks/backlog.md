# 📋 Backlog

Trabalho futuro já entendido. Formato em [README.md](README.md).

## Protótipo / descaracterização

- [ ] Remover do repositório o que amarra o projeto a uma empresa específica 📅 2026-10-01 🔺 alta #area/site #esforco/g
  - Contexto: o projeto é de **estudos** — vitrine de engenharia, não sistema de cliente.
    Hoje há nome de empresa, de produto e de bureau espalhados por ~200 arquivos.
  - Local: inventário em `tasks/decisoes-pendentes.md`
  - Ação: definir renomear × remover por categoria e executar numa passada só.

## Ferramentas

- [ ] Mais bancos no validador CNAB 400 📅 2026-10-01 🔽 baixa #area/ferramentas #esforco/g
  - Contexto: a arquitetura já suporta (criar `banks/<banco>.js` e registrar no registry).
  - Local: `tools/cobranca/cnab400/banks/`
  - Ação: só com manual **e** amostra real — não estimar posição "provável" (ADR-006).
- [ ] Primeira ferramenta da aba "Outros CRM" 📅 2026-10-01 🔽 baixa #area/ferramentas #esforco/m
  - Local: `assets/js/navigation-v2.js` (`crms.tabs`)
  - Ação: a aba existe vazia, com mensagem "Em breve".

## Site

- [ ] Hub de laboratórios 📅 2026-10-01 🔼 média #area/site #esforco/m 🤖
  - Contexto: `pages/lab/index.html` não é índice — é a página de um lab só, mas a navegação
    superior leva lá como se fosse hub.
  - Ação: criar o índice listando os labs, ou renomear o item do menu.
- [ ] Padronizar visualmente os 61 manuais genéricos 📅 2026-10-01 🔽 baixa #area/docs #esforco/g
  - Contexto: template sem imagem nem breadcrumb; 5 páginas "premium" mostram o alvo.
  - Nota: depende da decisão de descaracterização — pode virar remoção em vez de padronização.
- [ ] i18n PT/EN e paleta de comandos `Ctrl/Cmd+K` 📅 2026-10-01 🔽 baixa #area/site #esforco/g
- [ ] Screenshot real em `docs/preview.png` para o README 📅 2026-10-01 🔽 baixa #area/docs #esforco/p

## App de chat

- [ ] Implantar o `apps/arriba-chat-ia` 📅 2026-10-01 🔼 média #area/chat-ia #esforco/m
  - Contexto: só rodou local; precisa de Postgres gerenciado, variáveis de ambiente e
    `ENCRYPTION_KEY` fora do repositório.
- [ ] Limite de taxa no `/auth/login` 📅 2026-10-01 🔼 média #area/chat-ia #esforco/p 🤖
  - Contexto: hoje só há piso de tempo contra enumeração de usuário — não é proteção contra
    força bruta.
- [ ] Busca no histórico de conversas 📅 2026-10-01 🔽 baixa #area/chat-ia #esforco/m
