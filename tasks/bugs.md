# 🐞 Bugs

Defeitos abertos. Formato em [README.md](README.md).

- [ ] Página "Sobre Jonathan" está quebrada e anuncia ferramentas que não existem 📅 2026-10-02 🔺 alta #area/site #esforco/m 🤖
  - Contexto: está no menu (`navigation-v2.js`, grupo "Produtos"), então é alcançável de
    qualquer página — mas é de uma era anterior do projeto. Linka `css/style.css`,
    `index.html` e `json_validator.html` por caminho relativo: **os três dão 404**, mais 10
    bandeiras. Não carrega `tokens.css`, usa o mega-menu antigo (`u30*`) e o menu dela lista
    "Validador JSON", "Formatador de Código", "Gerador de Senhas", "Calculadora de Custo
    Cloud", "API de Clima" e outras **que não existem no repositório**.
  - Local: `pages/about/about_jonathan.html`; link em `assets/js/navigation-v2.js:13`
  - Ação: reescrever no padrão atual (topbar → hero → conteúdo, `tokens.css`) ou tirar do
    menu. Enquanto estiver no menu, é a pior página do site.
  - Nota: a conferência de contraste passa nela justamente porque **nenhum CSS carrega** —
    tudo fica no preto sobre branco do navegador. Passar no contraste não é estar certo.
- [ ] Link morto para a documentação do layout no Gerador de CSV 📅 2026-10-02 🔼 média #area/ferramentas #esforco/p 🤖
  - Contexto: o botão "📘 Documentação do layout padrão" aponta para `docs/layout-padrao.html`,
    que não existe — a pasta `docs/` dessa ferramenta não existe. Provável remoção na
    descaracterização sem tirar o botão.
  - Local: `tools/cobranca/arriba-csv-generator/csv-template-generator.html:806`
  - Ação: recriar a página ou remover o botão.
- [ ] Texto da home sem acentuação 📅 2026-10-02 🔼 média #area/site #esforco/p 🤖
  - Contexto: contraria `.claude/rules/idioma-ptbr.md`, e é o primeiro texto que se lê:
    "Ferramentas de operacao" (título e eyebrow do slide), "massa de dados ficticios,
    validadores e utilitarios organizados numa experiencia consistente", "400 posicoes",
    "o conteudo esta certo?", "sem alcancar a pagina", "Navegacao principal" (`aria-label`),
    "Avancar para o proximo destaque". Medido na tela: 20 palavras em `index.html`.
  - Local: `index.html` (cards ~1098-1125, slides ~1313-1321, `aria-label` 1009 e 1355)
  - Ação: acentuar. Atenção: `Historico`, `Descricao`, `Numero` e `Funcoes_Carta` nas
    ferramentas de SQL e de carta são **nomes de coluna e de token** — não mexer.
- [ ] Backend externo preso em `source: "local-fallback"` 📅 2026-10-01 🔼 média #area/infra #esforco/m
  - Contexto: as rotas de IA do backend nunca usam o provedor configurado — caem sempre no
    conhecimento local. Suspeita de variável de ambiente ausente no serviço hospedado.
  - Local: fora deste repositório (serviço de API)
  - Ação: conferir variáveis e log do serviço. Hoje o chat do site não depende mais disso.
- [ ] Relevância ruim no fallback local do backend externo 📅 2026-10-01 🔽 baixa #area/infra #esforco/m
  - Contexto: num teste, devolveu artigo errado para a pergunta.
  - Ação: comparar com a busca do `apps/arriba-chat-ia`, que já ordena por relevância medida.
