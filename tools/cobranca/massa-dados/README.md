# Gerador de dados fictícios

Gera dados brasileiros inventados para teste, direto no navegador. Nada é enviado a servidor.

## O que gera

Nome, CPF, RG, CNPJ (numérico ou alfanumérico), telefone, e-mail, CEP, endereço, pessoa
completa, empresa completa e Lorem Ipsum.

CPF, RG e CNPJ saem com os dígitos verificadores calculados: passam na validação, mas não
pertencem a ninguém. O RG segue o padrão de São Paulo (8 dígitos e 1 verificador, que pode
ser X); outros estados têm regras próprias.

## Como a tela se comporta

- O resultado aparece ao abrir a página e muda a cada opção mexida.
- **Copiar** leva só os registros, sem a linha de título do CSV.
- **Baixar** gera o arquivo inteiro (até 1.000.000 de registros), em CSV com ponto e vírgula
  ou em TXT. As linhas que estão na tela vão para o arquivo como estão.
- A tela mostra até 100 registros.
- As opções escolhidas ficam guardadas no navegador de quem usa, como padrão da próxima visita.

## Arquivos

- `massa-dados.html`: a página e o estilo.
- `script.js`: a tela e os geradores. O RG vem de `assets/js/fake-data-br.js`, que tem teste
  automático em `scripts/tests/dados-ficticios.test.mjs`.
