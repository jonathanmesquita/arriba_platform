# v2.9.6 - Treinamento DataCob para Cliente

## Incluído

Nova página:

```text
tools/datacob/treinamento-cliente/index.html
```

A página segue o estilo PH3A/cliente com:

- sidebar laranja;
- módulos de treinamento;
- página de aula DataCob;
- visão geral;
- passo a passo prático;
- pontos de atenção;
- prompt para gerar documentação por prints;
- FAQ / assistente virtual;
- formulário visual de contato.

## Ajustes de estabilidade

- `support-copilot.js` e `support-copilot.html` apontam para `https://api.arriba.jm.dev.br`.
- `navigation-v2.js` remove referências antigas para `api.jm.dev.br`.
- Menu em camadas inclui link para Treinamento DataCob Cliente.
- Help Center indexa a nova página como manual pesquisável.

## Testes

```text
https://arriba.jm.dev.br/tools/datacob/treinamento-cliente/index.html?v=296
https://arriba.jm.dev.br/tools/datacob/support-copilot/support-copilot.html?v=296
https://arriba.jm.dev.br/pages/docs/help-center/index.html?v=296
```
