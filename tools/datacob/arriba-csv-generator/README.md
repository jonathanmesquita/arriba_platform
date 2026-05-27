# Gerador CSV DataCob - 01-Layout Recepção de Contratos - Avançado

Versão revisada do gerador de CSV para os arquivos principais do layout de recepção:

- `contrato.csv`
- `financiado.csv`
- `parcela.csv`

## O que mudou

- UX baseada no modelo visual do `arriba-csv-generator/csv-template-generator.html`.
- Funcionamento e cabeçalhos baseados no exemplo `csv-generator/csv-template-generator.html`.
- Seleção do layout: `01-Layout Recepção de Contratos - Avançado`.
- Seleção do arquivo: `CONTRATO`, `FINANCIADO` ou `PARCELA`.
- Campos obrigatórios em tela simples.
- Campos avançados recolhidos por tipo de arquivo.
- Preview com 20 linhas.
- Validação antes do download.
- Exportação final em CSV com separador `;` e BOM UTF-8.
- Modo de geração fictícia ou preenchimento manual.

## Campos obrigatórios por tipo

### Contrato

- Quantidade de registros
- Cliente
- Contrato inicial
- Sufixo do contrato
- Fase

### Financiado

- Quantidade de registros
- Cliente
- Contrato inicial
- Sufixo do contrato
- Nome base
- Tipo pessoa
- Documento automático ou manual

### Parcela

- Quantidade de registros
- Contrato inicial
- Sufixo do contrato
- Data de vencimento
- Valor original
- Tipo parcela
- Número da parcela
- Documento automático ou manual

## Observação

O arquivo respeita os cabeçalhos do layout padrão, porém os campos opcionais podem permanecer vazios quando a operação não exigir preenchimento.

## Ajustes UX adicionados

- Link direto para documentação do layout padrão.
- Botão Ajuda com tooltip amigável.
- Campos obrigatórios com destaque suave quando não preenchidos.
- Botão final simplificado para `Baixar Todos` ou apenas as tabelas selecionadas.
- Documentação editável em `docs/layout-padrao.md`.
- Página visual de documentação em `docs/layout-padrao.html`.
- Roadmap para futura importação de dados crus do cliente.
