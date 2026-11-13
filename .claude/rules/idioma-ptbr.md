---
paths:
  - "tools/**"
  - "pages/**"
  - "assets/**"
  - "apps/**/*.{ts,tsx}"
  - "**/*.md"
---

# Idioma: português do Brasil

Todo texto visível — título, rótulo, mensagem, placeholder, erro na tela — é em **pt-BR com
acentuação correta**. Comentário de código também, quando escrito em português.

Ao encontrar texto sem acento em conteúdo visível, corrigir junto com a alteração em curso.

| Errado | Correto |
|---|---|
| Configuracoes | Configurações |
| Nao iniciada | Não iniciada |
| Descricao | Descrição |
| Validacao | Validação |
| Proximo | Próximo |
| Voce | Você |

**Exceção deliberada:** o saco de palavras-chave da busca
(`searchItems[1]` em `assets/js/navigation-v2.js`) é escrito **sem acento** de propósito —
`normalizeSearch` remove acento dos dois lados da comparação, e escrever sem acento ali evita
duplicar cada termo. Não "corrigir" essas linhas.
