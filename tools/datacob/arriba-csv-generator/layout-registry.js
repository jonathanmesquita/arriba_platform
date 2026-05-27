/*
 * DataCob Layout Registry
 * Sequência oficial por Tipo_Registro.
 */

export const DATACOB_LAYOUT_SEQUENCE = [
  { key: "configuracao", label: "Configuração", tipoRegistro: 0, primary: false },
  { key: "loja", label: "Loja", tipoRegistro: 1, primary: false },
  { key: "financiado", label: "Financiado", tipoRegistro: 2, primary: true },
  { key: "email", label: "E-mail", tipoRegistro: 3, primary: false },
  { key: "telefone", label: "Telefone", tipoRegistro: 4, primary: false },
  { key: "endereco", label: "Endereço", tipoRegistro: 5, primary: false },
  { key: "contrato", label: "Contrato", tipoRegistro: 6, primary: true },
  { key: "parcela", label: "Parcela", tipoRegistro: 7, primary: true },
  { key: "historico", label: "Histórico", tipoRegistro: 8, primary: false },
  { key: "garantia", label: "Garantia", tipoRegistro: 10, primary: false },
  { key: "avalista", label: "Avalista", tipoRegistro: 11, primary: false },
  { key: "dados_auxiliares", label: "Dados Auxiliares", tipoRegistro: 12, primary: false },
  { key: "processo", label: "Processo", tipoRegistro: 13, primary: false },
  { key: "processo_andamento", label: "Processo Andamento", tipoRegistro: 14, primary: false },
  { key: "processo_data", label: "Processo Data", tipoRegistro: 15, primary: false },
  { key: "processo_localizador", label: "Processo Localizador", tipoRegistro: 16, primary: false },
  { key: "despesa", label: "Despesa", tipoRegistro: 17, primary: false },
  { key: "mensagem_operacao", label: "Mensagem Operação", tipoRegistro: 18, primary: false }
];

export const DATACOB_PRIMARY_RECEPTION_KEYS = ["financiado", "contrato", "parcela"];

export function sortByTipoRegistro(keys = []) {
  const order = new Map(DATACOB_LAYOUT_SEQUENCE.map(item => [item.key, item.tipoRegistro]));
  return [...keys].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}
