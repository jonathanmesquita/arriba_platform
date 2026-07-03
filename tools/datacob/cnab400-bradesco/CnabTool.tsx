// CnabTool.tsx — Componente React (TypeScript + Tailwind)
// Consome o parser puro de ./cnab400. Sem estado global, sem libs externas.
//
// Deploy: este componente exige um build React (Vite/Next). Seu site atual
// na Vercel é estático (HTML/Bootstrap), então ele NÃO cai lá sem pipeline.
// A lógica (cnab400.ts) é a mesma que roda hoje na versão vanilla.

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  parseCnab400,
  gerarArquivo,
  type CnabParseResult,
  type CnabTitulo,
  type GeradorTitulo,
  type GeradorHeader,
} from "./cnab400";

type Tab = "leitor" | "gerador";

const money = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ocPill = (oc: string) => {
  if (oc === "06") return "bg-emerald-100 text-emerald-800";
  if (["03", "27", "30", "32"].includes(oc)) return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
};

export default function CnabTool() {
  const [tab, setTab] = useState<Tab>("leitor");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
          DataCob · CNAB 400 · Bradesco (237)
        </span>
        <h1 className="mt-2 text-4xl font-light tracking-tight text-neutral-900">CNAB 400 Bradesco</h1>
        <p className="mt-2 max-w-2xl text-neutral-500">
          Gere arquivos de teste de retorno ou valide um arquivo recebido. Processamento 100% no
          navegador — nenhum dado sai da máquina.
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 inline-flex gap-1 rounded-xl bg-neutral-100 p-1">
        {(["leitor", "gerador"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              tab === t ? "bg-white text-neutral-900 shadow" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t === "leitor" ? "Ler / Validar Retorno" : "Gerar arquivo de teste"}
          </button>
        ))}
      </div>

      {tab === "leitor" ? <Leitor /> : <Gerador />}
    </div>
  );
}

/* ============================ LEITOR ============================ */

function Leitor() {
  const [result, setResult] = useState<CnabParseResult | null>(null);
  const [error, setError] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const process = useCallback((text: string) => {
    try {
      const r = parseCnab400(text);
      setResult(r);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  }, []);

  const readFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => process(String(reader.result));
      reader.readAsText(file, "ISO-8859-1"); // CNAB micro-a-micro é Latin-1
    },
    [process]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  const exportCsv = useCallback(() => {
    if (!result) return;
    const head = ["NossoNumero", "NumDoc", "Ocorrencia", "Descricao", "Venc", "ValorTitulo", "ValorPago", "DataCredito", "Motivos"];
    const rows = result.titulos.map((t) => [
      t.nossoNumero, t.numDocumento, t.ocorrencia, t.ocorrenciaDesc, t.dataVencimento,
      t.valorTitulo.toFixed(2), t.valorPago.toFixed(2), t.dataCredito, t.motivos.map((m) => m.cod).join(" "),
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cnab400-retorno.csv";
    a.click();
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`cursor-pointer rounded-xl border border-dashed p-8 text-center transition ${
          dragging ? "border-red-500 bg-red-50" : "border-neutral-300 bg-white hover:border-neutral-400"
        }`}
      >
        <p className="font-bold text-neutral-800">Solte o arquivo .RET / .TXT aqui</p>
        <p className="text-sm text-neutral-500">ou clique para selecionar (registros de 400 caracteres)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".ret,.txt,.rst,text/plain"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
        />
      </div>

      <textarea
        onChange={(e) => process(e.target.value)}
        placeholder="…ou cole o conteúdo bruto aqui"
        className="h-28 w-full rounded-lg border border-neutral-300 p-3 font-mono text-xs focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
      />

      {error && (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      {result && (
        <>
          {result.header && (
            <div
              className={`rounded-lg border-l-4 p-3 text-sm ${
                result.header.valido
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-red-500 bg-red-50 text-red-800"
              }`}
            >
              {result.header.valido
                ? `Header válido · ${result.header.nomeEmpresa} · ${result.titulos.length} título(s)`
                : `Header inválido — ${result.header.erros.join("; ")}`}
            </div>
          )}

          <TituloTable titulos={result.titulos} />

          <button
            onClick={exportCsv}
            disabled={!result.titulos.length}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-black disabled:opacity-40"
          >
            Exportar CSV
          </button>
        </>
      )}
    </div>
  );
}

function TituloTable({ titulos }: { titulos: CnabTitulo[] }) {
  if (!titulos.length) return <p className="text-sm text-neutral-500">Nenhum título extraído.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left">
          <tr>
            {["#", "Nosso Número", "Nº Doc", "Ocorrência", "Vencimento", "Valor Título", "Valor Pago", "Crédito", "Motivos"].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 font-black text-neutral-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {titulos.map((t, i) => (
            <tr key={i} className="border-t border-neutral-100">
              <td className="px-3 py-2 text-neutral-400">{i + 1}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono">{t.nossoNumero}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono">{t.numDocumento}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ocPill(t.ocorrencia)}`}>
                  {t.ocorrencia}
                </span>{" "}
                <span className="text-neutral-600">{t.ocorrenciaDesc}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-2">{t.dataVencimento || "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(t.valorTitulo)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(t.valorPago)}</td>
              <td className="whitespace-nowrap px-3 py-2">{t.dataCredito || "—"}</td>
              <td className="px-3 py-2 text-xs text-neutral-600">
                {t.motivos.length ? t.motivos.map((m) => `${m.cod} (${m.desc})`).join("; ") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================ GERADOR ============================ */

const OC_GERADOR = ["02", "06", "09", "10", "15", "16", "17", "23", "28"];
const today = () => new Date().toISOString().slice(0, 10);

function Gerador() {
  const [header, setHeader] = useState<GeradorHeader>({
    codEmpresa: "5213287",
    nomeEmpresa: "PH3A COMERCIO E SERVICOS DE TE",
    dataGravacao: today(),
    aviso: "4",
    dataCredito: today(),
  });
  const [titulos, setTitulos] = useState<GeradorTitulo[]>([
    { nossoNumero: "", carteira: "09", ocorrencia: "06", numDocumento: "", dataVencimento: today(), valorTitulo: 0, valorPago: 0, dataCredito: today() },
  ]);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const linhas = useMemo(() => {
    try {
      return gerarArquivo(header, titulos);
    } catch {
      return [];
    }
  }, [header, titulos]);

  const setTitulo = (i: number, patch: Partial<GeradorTitulo>) =>
    setTitulos((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const validarEgerar = () => {
    const errs: string[] = [];
    if (!header.codEmpresa) errs.push("Código da Empresa é obrigatório.");
    if (!header.nomeEmpresa) errs.push("Nome da Empresa é obrigatório.");
    titulos.forEach((t, i) => {
      if (!t.nossoNumero) errs.push(`Título ${i + 1}: Nosso Número obrigatório.`);
      if (!t.dataVencimento) errs.push(`Título ${i + 1}: Vencimento obrigatório.`);
    });
    if (errs.length) return setMsg({ text: errs.join(" "), ok: false });
    const ok = linhas.every((l) => l.length === 400);
    setMsg({ text: `${linhas.length} linha(s) geradas — ${ok ? "todas com 400 ✓" : "DIVERGENTE ✗"}.`, ok });
  };

  const download = () => {
    const content = linhas.join("\r\n") + "\r\n\u001a"; // CRLF + finalizador 0x1A
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "CB-retorno-teste.RET";
    a.click();
  };

  const inputCls =
    "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100";

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">Header (Registro 0)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Código da Empresa" value={header.codEmpresa} onChange={(v) => setHeader({ ...header, codEmpresa: v })} cls={inputCls} />
          <Field label="Nome da Empresa" value={header.nomeEmpresa} onChange={(v) => setHeader({ ...header, nomeEmpresa: v })} cls={inputCls} />
          <Field label="Data da Gravação" type="date" value={header.dataGravacao} onChange={(v) => setHeader({ ...header, dataGravacao: v })} cls={inputCls} />
          <Field label="Nº Aviso Bancário" value={header.aviso} onChange={(v) => setHeader({ ...header, aviso: v })} cls={inputCls} />
          <Field label="Data do Crédito" type="date" value={header.dataCredito} onChange={(v) => setHeader({ ...header, dataCredito: v })} cls={inputCls} />
        </div>
      </section>

      {/* Títulos */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">Títulos (Registro 1)</h2>
          <button
            onClick={() => setTitulos((p) => [...p, { nossoNumero: "", carteira: "09", ocorrencia: "06", numDocumento: "", dataVencimento: today(), valorTitulo: 0, valorPago: 0, dataCredito: today() }])}
            className="rounded-md border border-neutral-800 px-3 py-1.5 text-sm font-bold text-neutral-800 hover:bg-neutral-50"
          >
            + Adicionar título
          </button>
        </div>

        <div className="space-y-3">
          {titulos.map((t, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 md:grid-cols-4 lg:grid-cols-8">
              <Field label="Nosso Nº" value={t.nossoNumero} onChange={(v) => setTitulo(i, { nossoNumero: v })} cls={inputCls} small />
              <Field label="Carteira" value={t.carteira ?? ""} onChange={(v) => setTitulo(i, { carteira: v })} cls={inputCls} small />
              <div>
                <label className="mb-1 block text-xs font-bold text-neutral-600">Ocorrência</label>
                <select value={t.ocorrencia} onChange={(e) => setTitulo(i, { ocorrencia: e.target.value })} className={inputCls}>
                  {OC_GERADOR.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Nº Doc" value={t.numDocumento ?? ""} onChange={(v) => setTitulo(i, { numDocumento: v })} cls={inputCls} small />
              <Field label="Vencimento" type="date" value={t.dataVencimento} onChange={(v) => setTitulo(i, { dataVencimento: v })} cls={inputCls} small />
              <Field label="Valor Título" type="number" value={String(t.valorTitulo)} onChange={(v) => setTitulo(i, { valorTitulo: parseFloat(v) || 0 })} cls={inputCls} small />
              <Field label="Valor Pago" type="number" value={String(t.valorPago ?? 0)} onChange={(v) => setTitulo(i, { valorPago: parseFloat(v) || 0 })} cls={inputCls} small />
              <div className="flex items-end">
                <button
                  onClick={() => setTitulos((p) => p.filter((_, idx) => idx !== i))}
                  className="h-9 w-full rounded-md border border-neutral-300 bg-white text-red-600 hover:bg-red-50"
                  title="Remover"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button onClick={validarEgerar} className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
          Gerar e validar
        </button>
        <button onClick={download} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-black">
          Baixar arquivo
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg border-l-4 p-3 text-sm ${msg.ok ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-red-500 bg-red-50 text-red-800"}`}>
          {msg.text}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-bold text-neutral-600">Prévia (cada linha = 400 caracteres)</label>
        <pre className="max-h-64 overflow-auto rounded-lg bg-neutral-900 p-4 font-mono text-xs text-neutral-100">
          {linhas.join("\n")}
        </pre>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, cls, type = "text", small = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  cls: string;
  type?: string;
  small?: boolean;
}) {
  return (
    <div>
      <label className={`mb-1 block font-bold text-neutral-600 ${small ? "text-xs" : "text-sm"}`}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
    </div>
  );
}
