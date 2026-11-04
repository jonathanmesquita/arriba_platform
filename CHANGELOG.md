# Changelog

Todas as mudanças notáveis neste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [Unreleased] — 2026-10-01

### Added
- feat(chat-ia): base de conhecimento consultada antes de responder
- feat(chat-ia): adapters, API, telas React, docs e testes
- feat(chat-ia): fundacao do Arriba Chat IA (estrutura, schema e contratos)
- feat(csv): validador de CSV + auditoria de nomes do menu
- feat(serasa): ferramenta de negativacao + pagina do processo
- feat(respostas-predefinidas): padrao de titulo publica/interna
- feat(respostas-predefinidas): composer de nova resposta com espaco reservado e export .md
- feat(treinamento-sql): resultado do sandbox como tabela HTML + painel "Seu banco"
- feat(query-builder): construtor de regras CASE WHEN com suporte a EXISTS
- feat(home): adicionar SQL Query Builder ao painel de acesso rapido
- feat(datacob): lancar Track 7 - T-SQL com DataCob (curso completo)
- feat(datacob): adicionar layout Resumo Contrato BMP ao Gerador CSV
- feat(dados): adicionar link do Descriptografador (decrypt.jm.dev.br) ao menu
- feat(datacob): adicionar pagina separada de Respostas Predefinidas
- feat(support-copilot): adicionar biblioteca de Respostas Prontas
- feat(dados): adicionar exemplos prontos ao Decodificador Universal
- feat(dados): adicionar Decodificador Universal (Base64, URL, HTML, hex, binario, ROT13, unicode, JWT)
- feat(datacob): adicionar Itau ao CNAB 400 multi-banco e direcao Remessa/Retorno
- feat(datacob): implementar Bradesco no CNAB 400 multi-banco e aposentar ferramenta antiga
- feat(datacob): arquitetura do CNAB 400 multi-banco (motor generico)
- feat(home): agrupar quick-links em Infraestrutura/Aplicacoes (padrao Oracle)
- feat(home): simplificar hero para 1 slide, meta OG/Twitter e tile da Base de Conhecimento
- feat(help-center): Parte 4 - navegacao por categoria da Base de Conhecimento
- feat(dados): conversor Boleto Base64 → PDF (decode + preview + download)

### Fixed
- fix(support-copilot): nao pedir login quando o 401 e da Freshdesk
- fix(busca): campo unico no topo, sem input duplicado no painel
- fix(mascote): aponta Sapolingo para as versoes com fundo transparente
- fix(site): corrige links quebrados e aplica dark mode automatico nas ferramentas
- fix(busca): eliminar duplicacao entre search.js e navigation-v2.js
- fix(datacob): corrigir preview do CSV quebrando para a direita no Gerador
- fix(support-copilot): mostrar dados do ticket mesmo quando a analise falha
- fix(dados): corrigir cache do script.js e ajustar exemplo do Base64
- fix(chatbot): trocar mascote do chat de chat_ph3a para sapolingo

### Changed
- refactor(datacob): adaptar SQL Query Builder ao padrao visual do site
- refactor: remover feature de login/auth do front-end
- refactor(docs): concluir Parte 3 - unificar catalogo de erros e renomear pasta de manuais

### Documentation
- docs: atualizar CLAUDE.md com o trabalho recente (Parte 5)
- docs: README de portfólio + chore(css): tokens em fonte única
- docs: README de portfolio, template reutilizavel e CLAUDE.md do projeto

### Maintenance
- chore: higiene de .gitignore e remover órfão base64_old.html
- chore(css): unificar design tokens em fonte unica (tokens.css)
