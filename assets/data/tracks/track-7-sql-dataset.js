// Dataset ficticio para o sandbox SQL do Track 7 (T-SQL com DataCob).
// Dados 100% inventados - nenhuma relacao com clientes reais da PH3A.
// Usado só para o simulador rodar queries no navegador (AlaSQL), sem
// nenhuma conexao com o SQL Server real do DataCob.

export const BOLETOS_DEMO = [
  { id: 1, cedente: "Comercial Vitoria Ltda", sacado: "Joao Pereira", valor: 450.00, vencimento: "2024-03-10", status: "PAGO", criado_em: "2024-02-01" },
  { id: 2, cedente: "Comercial Vitoria Ltda", sacado: "Maria Souza", valor: 1280.50, vencimento: "2024-03-15", status: "PAGO", criado_em: "2024-02-05" },
  { id: 3, cedente: "Comercial Vitoria Ltda", sacado: "Auto Center Silva", valor: 320.00, vencimento: "2024-04-01", status: "VENCIDO", criado_em: "2024-02-10" },
  { id: 4, cedente: "Comercial Vitoria Ltda", sacado: "Mercadinho Estrela", valor: 95.00, vencimento: "2024-04-05", status: "PAGO", criado_em: "2024-02-12" },
  { id: 5, cedente: "Comercial Vitoria Ltda", sacado: "Transportes Andrade", valor: 2100.00, vencimento: "2024-04-10", status: "ABERTO", criado_em: "2024-03-01" },
  { id: 6, cedente: "Comercial Vitoria Ltda", sacado: "Papelaria Central", valor: 610.00, vencimento: "2024-04-12", status: "PAGO", criado_em: "2024-03-02" },
  { id: 7, cedente: "Comercial Vitoria Ltda", sacado: "Farmacia Bemvida", valor: 780.00, vencimento: "2024-05-01", status: "PAGO", criado_em: "2024-03-10" },
  { id: 8, cedente: "Comercial Vitoria Ltda", sacado: "Oficina do Ze", valor: 1500.00, vencimento: "2024-05-05", status: "VENCIDO", criado_em: "2024-03-12" },
  { id: 9, cedente: "Comercial Vitoria Ltda", sacado: "Loja Fashion Kids", valor: 210.00, vencimento: "2024-05-10", status: "PAGO", criado_em: "2024-03-15" },
  { id: 10, cedente: "Comercial Vitoria Ltda", sacado: "Restaurante Sabor Caseiro", valor: 330.00, vencimento: "2024-05-15", status: "ABERTO", criado_em: "2024-03-20" },
  { id: 11, cedente: "Comercial Vitoria Ltda", sacado: "Padaria Pao Quente", valor: 88.00, vencimento: "2024-05-20", status: "PAGO", criado_em: "2024-03-22" },

  { id: 12, cedente: "Distribuidora Santos", sacado: "Mercado Bom Preco", valor: 990.00, vencimento: "2024-03-20", status: "PAGO", criado_em: "2024-02-15" },
  { id: 13, cedente: "Distribuidora Santos", sacado: "Construtora Alicerce", valor: 3200.00, vencimento: "2024-04-02", status: "ABERTO", criado_em: "2024-03-01" },
  { id: 14, cedente: "Distribuidora Santos", sacado: "Eletrica Sao Jose", valor: 540.00, vencimento: "2024-04-18", status: "PAGO", criado_em: "2024-03-05" },
  { id: 15, cedente: "Distribuidora Santos", sacado: "Marcenaria Bela Vista", valor: 150.00, vencimento: "2024-05-02", status: "VENCIDO", criado_em: "2024-03-18" },
  { id: 16, cedente: "Distribuidora Santos", sacado: "Salao Beleza Pura", valor: 275.00, vencimento: "2024-05-22", status: "PAGO", criado_em: "2024-04-01" },

  { id: 17, cedente: "Metalurgica Rio Claro", sacado: "Industria Ferro Forte", valor: 4500.00, vencimento: "2024-04-08", status: "PAGO", criado_em: "2024-02-20" },
  { id: 18, cedente: "Metalurgica Rio Claro", sacado: "Serralheria Uniao", valor: 890.00, vencimento: "2024-04-25", status: "VENCIDO", criado_em: "2024-03-05" },
  { id: 19, cedente: "Metalurgica Rio Claro", sacado: "Metalcorte Express", valor: 610.00, vencimento: "2024-05-12", status: "PAGO", criado_em: "2024-03-15" },
  { id: 20, cedente: "Metalurgica Rio Claro", sacado: "Fundicao Aco Sul", valor: 1750.00, vencimento: "2024-06-01", status: "ABERTO", criado_em: "2024-04-01" },

  { id: 21, cedente: "Auto Pecas Bandeirantes", sacado: "Oficina Rapida", valor: 420.00, vencimento: "2024-04-14", status: "PAGO", criado_em: "2024-03-01" },
  { id: 22, cedente: "Auto Pecas Bandeirantes", sacado: "Auto Pecas Vale", valor: 980.00, vencimento: "2024-05-18", status: "PAGO", criado_em: "2024-03-20" },

  { id: 23, cedente: "Confeccoes Nordeste", sacado: "Boutique Elegance", valor: 260.00, vencimento: "2024-04-22", status: "VENCIDO", criado_em: "2024-03-10" },
  { id: 24, cedente: "Confeccoes Nordeste", sacado: "Moda Jovem Ltda", valor: 175.00, vencimento: "2024-05-30", status: "PAGO", criado_em: "2024-04-05" }
];

// boleto_id referencia BOLETOS_DEMO.id - nem todo boleto tem remessa (para
// os exemplos de LEFT JOIN mostrarem boletos sem remessa correspondente).
export const REMESSAS_DEMO = [
  { id: 1, boleto_id: 1, banco: "Bradesco", tipo_cnab: "400", total_registros: 1, total_valor: 450.00, data_envio: "2024-02-05" },
  { id: 2, boleto_id: 2, banco: "Bradesco", tipo_cnab: "400", total_registros: 1, total_valor: 1280.50, data_envio: "2024-02-10" },
  { id: 3, boleto_id: 3, banco: "Itau", tipo_cnab: "240", total_registros: 1, total_valor: 320.00, data_envio: "2024-02-15" },
  { id: 4, boleto_id: 5, banco: "Itau", tipo_cnab: "240", total_registros: 1, total_valor: 2100.00, data_envio: "2024-03-05" },
  { id: 5, boleto_id: 6, banco: "Bradesco", tipo_cnab: "400", total_registros: 1, total_valor: 610.00, data_envio: "2024-03-06" },
  { id: 6, boleto_id: 7, banco: "Caixa", tipo_cnab: "400", total_registros: 1, total_valor: 780.00, data_envio: "2024-03-14" },
  { id: 7, boleto_id: 8, banco: "Itau", tipo_cnab: "240", total_registros: 1, total_valor: 1500.00, data_envio: "2024-03-16" },
  { id: 8, boleto_id: 12, banco: "Bradesco", tipo_cnab: "400", total_registros: 1, total_valor: 990.00, data_envio: "2024-02-18" },
  { id: 9, boleto_id: 13, banco: "Santander", tipo_cnab: "240", total_registros: 1, total_valor: 3200.00, data_envio: "2024-03-04" },
  { id: 10, boleto_id: 14, banco: "Bradesco", tipo_cnab: "400", total_registros: 1, total_valor: 540.00, data_envio: "2024-03-08" },
  { id: 11, boleto_id: 17, banco: "Itau", tipo_cnab: "240", total_registros: 1, total_valor: 4500.00, data_envio: "2024-02-22" },
  { id: 12, boleto_id: 18, banco: "Caixa", tipo_cnab: "400", total_registros: 1, total_valor: 890.00, data_envio: "2024-03-08" },
  { id: 13, boleto_id: 21, banco: "Bradesco", tipo_cnab: "400", total_registros: 1, total_valor: 420.00, data_envio: "2024-03-03" },
  { id: 14, boleto_id: 23, banco: "Itau", tipo_cnab: "240", total_registros: 1, total_valor: 260.00, data_envio: "2024-03-12" }
];

// boleto_id referencia BOLETOS_DEMO.id - só boletos com remessa podem ter
// retorno; nem todo remessa tem retorno ainda (ABERTO/aguardando).
export const RETORNOS_DEMO = [
  { id: 1, boleto_id: 1, numero_documento: "DOC-0001", status_pagamento: "PAGO", valor_movimentado: 450.00, data_movimento: "2024-03-08" },
  { id: 2, boleto_id: 2, numero_documento: "DOC-0002", status_pagamento: "PAGO", valor_movimentado: 1280.50, data_movimento: "2024-03-14" },
  { id: 3, boleto_id: 8, numero_documento: "DOC-0003", status_pagamento: "DEVOLVIDO", valor_movimentado: 0.00, data_movimento: "2024-05-06" },
  { id: 4, boleto_id: 6, numero_documento: "DOC-0004", status_pagamento: "PAGO", valor_movimentado: 610.00, data_movimento: "2024-04-11" },
  { id: 5, boleto_id: 7, numero_documento: "DOC-0005", status_pagamento: "PAGO", valor_movimentado: 780.00, data_movimento: "2024-05-02" },
  { id: 6, boleto_id: 12, numero_documento: "DOC-0006", status_pagamento: "PAGO", valor_movimentado: 990.00, data_movimento: "2024-03-19" },
  { id: 7, boleto_id: 14, numero_documento: "DOC-0007", status_pagamento: "PAGO", valor_movimentado: 540.00, data_movimento: "2024-04-16" },
  { id: 8, boleto_id: 17, numero_documento: "DOC-0008", status_pagamento: "PAGO", valor_movimentado: 4500.00, data_movimento: "2024-04-07" },
  { id: 9, boleto_id: 18, numero_documento: "DOC-0009", status_pagamento: "DEVOLVIDO", valor_movimentado: 0.00, data_movimento: "2024-04-26" },
  { id: 10, boleto_id: 21, numero_documento: "DOC-0010", status_pagamento: "PAGO", valor_movimentado: 420.00, data_movimento: "2024-04-13" },
  { id: 11, boleto_id: 23, numero_documento: "DOC-0011", status_pagamento: "DEVOLVIDO", valor_movimentado: 0.00, data_movimento: "2024-04-23" }
];
