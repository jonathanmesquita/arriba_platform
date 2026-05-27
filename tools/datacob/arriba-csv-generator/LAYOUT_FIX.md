# Correção de layout

Correções aplicadas para evitar estouro horizontal:

- `overflow-x: hidden` no `html/body`
- containers limitados com `max-width`
- grid principal com sidebar + conteúdo usando `minmax(0, 1fr)`
- campos obrigatórios e avançados responsivos
- cards de tipo de arquivo responsivos
- preview CSV com rolagem horizontal controlada
- sidebar deixa de ser fixa em telas menores
- inputs/selects limitados a 100% da coluna

Arquivo principal alterado:

- `csv-template-generator.html`

