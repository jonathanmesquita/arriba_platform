# Arriba DataCob Beta Tools - UX Final

Pacote com duas ferramentas beta ajustadas para uma UX mais simples e consistente com o estilo Oracle/Redwood da Arriba Platform.

## Caminhos prontos para copiar

- `tools/datacob/arriba-csv-generator/csv-template-generator.html`
- `tools/datacob/arriba-csv-generator/script.js`
- `tools/datacob/massa-dados/massa-dados.html`
- `tools/datacob/massa-dados/script.js`

## O que mudou

### Gerador CSV DataCob
- Tela principal com apenas os campos obrigatórios.
- Campos avançados separados por seção recolhível.
- Validação antes de exportar.
- Preview dos três arquivos: contrato, financiado e parcela.
- Exportação individual ou dos três CSVs.

### Massa de Dados
- Formulário simplificado para usuário comum.
- Geração de dados fictícios MX + CPF/CNPJ BR.
- Exportação JSON, CSV genérico e Financiado DataCob.
- Preview automático.

## Observação
O navegador não gera ZIP nativo sem biblioteca externa. Por isso, o botão "Baixar os 3 CSVs" baixa contrato, financiado e parcela em sequência.
