/** Formatadores de tela. Ficam juntos para a data não aparecer em três
 *  formatos diferentes em três telas diferentes. */

export function dataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const data = new Date(iso);
  return Number.isNaN(data.getTime())
    ? "—"
    : data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Mensagem de falha pronta para a tela: usa o texto em pt-BR que a API
 *  mandou e, só na falta dele, uma frase genérica. */
export function mensagemDaFalha(erro: unknown): string {
  if (erro && typeof erro === "object" && "message" in erro) {
    const texto = String((erro as { message?: unknown }).message ?? "");
    if (texto.trim()) return texto;
  }
  return "Algo deu errado. Tente de novo.";
}
