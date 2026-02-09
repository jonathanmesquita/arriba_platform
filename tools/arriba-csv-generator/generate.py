#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARRIBA CSV Generator
Gera arquivos .csv no mesmo layout dos templates (Dock/FAST) com N registros.

Uso:
  python generate.py --n 60000 --start 30 --suffix -ARRIBA --encoding latin1

Saída:
  ./out/contrato.csv
  ./out/financiado.csv
  ./out/parcela.csv
"""
from __future__ import annotations
import argparse
import datetime as dt
import os
import pandas as pd

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")
OUT_DIR = os.path.join(os.path.dirname(__file__), "out")

def format_cpf(n: int) -> str:
    s = f"{n:011d}"
    return f"{s[0:3]}.{s[3:6]}.{s[6:9]}-{s[9:11]}"

def read_template(path: str, encoding: str) -> pd.DataFrame:
    # Templates da Arriba estão em ; e às vezes em latin1
    return pd.read_csv(path, sep=";", dtype=str, encoding=encoding)

def build_nr_contrato(num: int, suffix: str) -> str:
    # Mantém 4 dígitos até 9999 (ex: 0030-ARRIBA). Depois segue natural (ex: 10000-ARRIBA).
    return f"{num:04d}{suffix}" if num < 10000 else f"{num}{suffix}"

def gen(n: int, start: int, suffix: str, encoding: str) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    contrato_tpl = read_template(os.path.join(TEMPLATES_DIR, "2026.02.06_ARRIBA_002-contrato.csv"), encoding).iloc[0].copy()
    financiado_tpl = read_template(os.path.join(TEMPLATES_DIR, "2026.02.06_ARRIBA_002-financiado.csv"), encoding).iloc[0].copy()
    parcela_tpl = read_template(os.path.join(TEMPLATES_DIR, "2026.02.06_ARRIBA_002-parcela.csv"), encoding).iloc[0].copy()

    contratos = []
    financiados = []
    parcelas = []

    # Base de vencimento (ajuste se quiser)
    start_date = dt.date(2026, 2, 9)

    for i in range(n):
        num = start + i
        nr = build_nr_contrato(num, suffix)

        c = contrato_tpl.copy()
        c["Nr_Contrato"] = nr
        contratos.append(c)

        f = financiado_tpl.copy()
        f["Nr_Contrato"] = nr
        # Nome genérico conforme solicitado
        f["Nome"] = f"Cliente Generico {num:05d}"
        # CPF determinístico só pra não repetir (se não precisar, pode comentar)
        f["Cpf_Cnpj"] = format_cpf(10000000000 + num)
        financiados.append(f)

        p = parcela_tpl.copy()
        p["Nr_Contrato"] = nr
        venc = start_date + dt.timedelta(days=i % 365)
        p["Dt_Vencimento"] = venc.strftime("%d/%m/%Y")
        # Parcelas 1..12 em loop (se quiser 1 parcela por contrato, troque por "1")
        p["Nr_Parcela"] = str((i % 12) + 1)

        # Se o template vier vazio, força um valor básico
        if "Vl_Original" in p and (p["Vl_Original"] is None or str(p["Vl_Original"]).strip() == "" or str(p["Vl_Original"]).lower() == "nan"):
            p["Vl_Original"] = "100"
        if "Vl_Saldo" in p and (p["Vl_Saldo"] is None or str(p["Vl_Saldo"]).strip() == "" or str(p["Vl_Saldo"]).lower() == "nan"):
            p["Vl_Saldo"] = p["Vl_Original"]

        parcelas.append(p)

    return pd.DataFrame(contratos), pd.DataFrame(financiados), pd.DataFrame(parcelas)

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=60000, help="Quantidade de registros por arquivo")
    ap.add_argument("--start", type=int, default=30, help="Número inicial do contrato (ex: 30 => 0030-ARRIBA)")
    ap.add_argument("--suffix", type=str, default="-ARRIBA", help="Sufixo do contrato (ex: -ARRIBA)")
    ap.add_argument("--encoding", type=str, default="latin1", help="Encoding de leitura/escrita (latin1 costuma funcionar nesses templates)")
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)

    contrato_df, financiado_df, parcela_df = gen(args.n, args.start, args.suffix, args.encoding)

    contrato_out = os.path.join(OUT_DIR, "contrato.csv")
    financiado_out = os.path.join(OUT_DIR, "financiado.csv")
    parcela_out = os.path.join(OUT_DIR, "parcela.csv")

    contrato_df.to_csv(contrato_out, sep=";", index=False, encoding=args.encoding, line_terminator="\n")
    financiado_df.to_csv(financiado_out, sep=";", index=False, encoding=args.encoding, line_terminator="\n")
    parcela_df.to_csv(parcela_out, sep=";", index=False, encoding=args.encoding, line_terminator="\n")

    print("✅ Gerado:")
    print(" -", contrato_out)
    print(" -", financiado_out)
    print(" -", parcela_out)

if __name__ == "__main__":
    main()
