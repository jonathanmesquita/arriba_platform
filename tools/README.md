# ARRIBA CSV Generator

Gera arquivos `.csv` nos layouts **parcela**, **financiado** e **contrato** (baseados nos templates da Arriba) com **N registros**.

## Requisitos
- Python 3.10+
- `pandas`

Instalação:
```bash
pip install -r requirements.txt
```

## Como usar
Gerar 60.000 registros por arquivo, iniciando em `0030-ARRIBA`:

```bash
python generate.py --n 60000 --start 30 --suffix -ARRIBA --encoding latin1
```

Saída:
- `out/contrato.csv`
- `out/financiado.csv`
- `out/parcela.csv`

## Regras aplicadas
- `Nr_Contrato` vira sequencial e recebe o sufixo (ex.: `0030-ARRIBA`, `0031-ARRIBA`, ...).
- **Financiado**:
  - `Nome` é gerado como `Cliente Generico 00030`, `Cliente Generico 00031`, ...
  - `Cpf_Cnpj` é gerado determinístico só para evitar repetição (pode ser removido).
- **Parcela**:
  - `Dt_Vencimento` varia por dia (ciclo anual) a partir de 09/02/2026.
  - `Nr_Parcela` cicla 1..12.

## Onde editar
Abra `generate.py` e ajuste:
- data inicial de vencimento
- regra de `Nr_Parcela`
- campos adicionais (se precisar mexer em mais colunas além das destacadas)

## Templates
Os templates ficam em `templates/` (os mesmos arquivos que você já usa como modelo).
