/* =====================================================================
   Formatadores de exibição

   Só apresentação: data, hora e latência no jeito brasileiro. Ficam
   separados porque as três telas usam os mesmos, e formatação duplicada
   é como uma tela acaba mostrando "22/09/2026" e outra "2026-09-22".

   O que NÃO mora aqui é chamada HTTP: isso é do api/client.ts, e há um
   só no projeto de propósito — dois clientes divergem no tratamento de
   sessão expirada, que é justamente onde não se pode divergir.
   ===================================================================== */

const FORMATO_DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const FORMATO_HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit"
});

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "—" : FORMATO_DATA_HORA.format(data);
}

export function formatarHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : FORMATO_HORA.format(data);
}

/** Latência em ms vira algo legível: "820 ms" ou "3,4 s". */
export function formatarLatencia(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

/** Mensagem de erro pronta para a tela, venha de onde vier. */
export function mensagemDaFalha(erro: unknown): string {
  if (erro && typeof erro === "object" && "message" in erro) {
    const texto = String((erro as { message?: unknown }).message ?? "").trim();
    if (texto) return texto;
  }
  return "Não consegui concluir a ação agora. Tente de novo.";
}
