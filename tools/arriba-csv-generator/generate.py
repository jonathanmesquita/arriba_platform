#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import datetime as dt
import os
import random
import pandas as pd

BASE_DIR = os.path.dirname(__file__)
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
OUT_DIR = os.path.join(BASE_DIR, "out")

# =============================
# CPF / CNPJ VÁLIDOS
# =============================
def calc_dv(nums, pesos):
    s = sum(n * p for n, p in zip(nums, pesos))
    r = s % 11
    return 0 if r < 2 else 11 - r

def gerar_cpf():
    nums = [random.randint(0, 9) for _ in range(9)]
    nums.append(calc_dv(nums, list(range(10, 1, -1))))
    nums.append(calc_dv(nums, list(range(11, 1, -1))))
    return f"{nums[0]}{nums[1]}{nums[2]}.{nums[3]}{nums[4]}{nums[5]}.{nums[6]}{nums[7]}{nums[8]}-{nums[9]}{nums[10]}"

def gerar_cnpj():
    nums = [random.randint(0, 9) for _ in range(12)]
    nums.append(calc_dv(nums, [5,4,3,2,9,8,7,6,5,4,3,2]))
    nums.append(calc_dv(nums, [6,5,4,3,2,9,8,7,6,5,4,3,2]))
    return f"{nums[0]}{nums[1]}.{nums[2]}{nums[3]}{nums[4]}.{nums[5]}{nums[6]}{nums[7]}/{nums[8]}{nums[9]}{nums[10]}{nums[11]}-{nums[12]}{nums[13]}"

def gerar_documento(tipo):
    if tipo == "cpf":
        return gerar_cpf()
    if tipo == "cnpj":
        return gerar_cnpj()
    if tipo == "auto":
        return gerar_cpf() if random.choice([True, False]) else gerar_cnpj()
    return ""

# =============================
def build_nr_contrato(num, suffix):
    return f"{num:04d}{suffix}" if num < 10000 else f"{num}{suffix}"

def read_template(path, encoding):
    return pd.read_csv(path, sep=";", dtype=str, encoding=encoding).iloc[0]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=60000)
    ap.add_argument("--start", type=int, default=30)
    ap.add_argument("--suffix", type=str, default="-ARRIBA")
    ap.add_argument("--encoding", type=str, default="latin1")
    ap.add_argument("--doc", type=str, default="none",
                    choices=["none", "cpf", "cnpj", "auto"])
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)

    contrato_tpl = read_template(os.path.join(TEMPLATES_DIR, "contrato.csv"), args.encoding)
    financiado_tpl = read_template(os.path.join(TEMPLATES_DIR, "financiado.csv"), args.encoding)
    parcela_tpl = read_template(os.path.join(TEMPLATES_DIR, "parcela.csv"), args.encoding)

    contratos, financiados, parcelas = [], [], []
    venc_base = dt.date(2026, 2, 9)

    for i in range(args.n):
        num = args.start + i
        nr = build_nr_contrato(num, args.suffix)
        doc = gerar_documento(args.doc)

        c = contrato_tpl.copy()
        c["Nr_Contrato"] = nr
        contratos.append(c)

        f = financiado_tpl.copy()
        f["Nr_Contrato"] = nr
        f["Nome"] = f"Cliente Generico {num:05d}"
        if "Cpf_Cnpj" in f:
            f["Cpf_Cnpj"] = doc
        financiados.append(f)

        p = parcela_tpl.copy()
        p["Nr_Contrato"] = nr
        p["Dt_Vencimento"] = venc_base.strftime("%d/%m/%Y")
        p["Nr_Parcela"] = "1"
        if "Vl_Original" in p:
            p["Vl_Original"] = "100"
        if "Vl_Saldo" in p:
            p["Vl_Saldo"] = "100"
        parcelas.append(p)

    pd.DataFrame(contratos).to_csv(os.path.join(OUT_DIR, "contrato.csv"), sep=";", index=False, encoding=args.encoding)
    pd.DataFrame(financiados).to_csv(os.path.join(OUT_DIR, "financiado.csv"), sep=";", index=False, encoding=args.encoding)
    pd.DataFrame(parcelas).to_csv(os.path.join(OUT_DIR, "parcela.csv"), sep=";", index=False, encoding=args.encoding)

    print("✔ Arquivos gerados com sucesso.")

if __name__ == "__main__":
    main()