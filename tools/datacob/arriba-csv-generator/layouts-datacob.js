/* =====================================================================
   Layouts CSV do DataCob - FONTE UNICA

   ARQUIVO GERADO a partir do que ja existia no gerador (o objeto FILES
   em script.js) + a sequencia oficial de layout-registry.js. Duas telas
   consomem este arquivo:

     - o Gerador CSV DataCob (script.js), que monta os arquivos;
     - o Validador de CSV (tools/dados/csv-validator/), que confere um
       arquivo recebido contra estes mesmos cabecalhos.

   Por isso o cabecalho de cada layout mora AQUI, e nao nos dois lugares:
   coluna que entra ou sai do DataCob muda uma vez so. O que e especifico
   do gerador (quais campos do formulario sao obrigatorios para montar as
   linhas) continua em script.js, porque nao tem sentido para quem valida.

   `tipoRegistro` e o valor da primeira coluna (Tipo_Registro) de cada
   arquivo - e por ele que o validador reconhece o layout de um CSV solto.
   ===================================================================== */

"use strict";

export const DATACOB_CSV_LAYOUTS = {
  configuracao: {
    label: "Configuração",
    filename: "configuracao.csv",
    tipoRegistro: 0,
    headers: [
      "Tipo_Registro", "Devolucao_Geral", "Devolucao_Por_Contrato", "Redefinir_Agrupamento",
      "Cadastrar_CPF_CNPJ_Invalido", "Batimento_Geral_Por_Cliente"
    ]
  },
  loja: {
    label: "Loja",
    filename: "loja.csv",
    tipoRegistro: 1,
    headers: [
      "Tipo_Registro", "Cliente", "Cod_Loja", "Nome_Loja", "Cnpj", "Regional"
    ]
  },
  financiado: {
    label: "Financiado",
    filename: "financiado.csv",
    tipoRegistro: 2,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Nome", "Cpf_Cnpj", "Cliente", "Dt_Nascimento", "Sexo",
      "Tipo_Pessoa", "Estado_Civil", "Conjuge", "Pai", "Mae", "Rg", "Rg_Orgao_Emiss",
      "Rg_Uf_Emiss", "Rg_Dt_Emiss", "Score_Serasa", "Profissao", "Renda", "Score_Adicional"
    ]
  },
  email: {
    label: "E-mail",
    filename: "email.csv",
    tipoRegistro: 3,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Cpf_Cnpj", "Email", "Cliente"
    ]
  },
  telefone: {
    label: "Telefone",
    filename: "telefone.csv",
    tipoRegistro: 4,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Cpf_Cnpj", "Tipo_Telefone", "DDD", "Fone", "Ramal",
      "Cliente"
    ]
  },
  endereco: {
    label: "Endereço",
    filename: "endereco.csv",
    tipoRegistro: 5,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Cpf_Cnpj", "Tipo_Endereco", "Logradouro", "Numero",
      "Complemento", "Bairro", "Cidade", "UF", "CEP", "Cliente"
    ]
  },
  contrato: {
    label: "Contrato",
    filename: "contrato.csv",
    tipoRegistro: 6,
    headers: [
      "Tipo_Registro", "Cliente", "Nr_Contrato", "Filial", "Plano", "Fase", "Regional",
      "Regua", "Vl_Contrato", "Dt_Contrato", "Tx_Contrato", "Dt_Para_Notificacao",
      "Dt_Solicitacao_Documento", "Dt_Ajuizamento", "Cod_Loja", "Grupo", "Moeda", "SubRegua",
      "Cpf_Cnpj"
    ]
  },
  parcela: {
    label: "Parcela",
    filename: "parcela.csv",
    tipoRegistro: 7,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Dt_Vencimento", "Tipo_Parcela", "Nr_Parcela",
      "Vl_Original", "Vl_Saldo", "Vl_Tarifa", "Cliente", "Dt_Inclusao", "Dt_Devolucao",
      "Dt_Inibicao", "Motivo", "Dt_Notificacao", "Marcar_Dt_Lote", "Dt_Lote", "Documento",
      "Cpf_Cnpj", "Plano"
    ]
  },
  historico: {
    label: "Histórico",
    filename: "historico.csv",
    tipoRegistro: 8,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Historico", "Cliente"
    ]
  },
  garantia: {
    label: "Garantia",
    filename: "garantia.csv",
    tipoRegistro: 10,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Tipo_Garantia", "Marca", "Modelo", "Descricao",
      "Dt_Aquisicao", "Observacao", "Vl_Garantia", "Vl_Corrigido", "Cpf_Cnpj"
    ]
  },
  avalista: {
    label: "Avalista",
    filename: "avalista.csv",
    tipoRegistro: 11,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Nome", "Cpf_Cnpj", "Dt_Nascimento", "Sexo",
      "Tipo_Pessoa", "Estado_Civil", "Conjuge", "Pai", "Mae", "Rg", "Rg_Orgao_Emiss",
      "Rg_Uf_Emiss", "Rg_Dt_Emiss", "Tipo_Telefone_1", "DDD_1", "Fone_1", "Tipo_Endereco",
      "Logradouro", "Numero", "Bairro", "Cidade", "UF", "CEP"
    ]
  },
  dados_auxiliares: {
    label: "Dados Auxiliares",
    filename: "dados_auxiliares.csv",
    tipoRegistro: 12,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Descricao", "Valor", "Cpf_Cnpj"
    ]
  },
  processo: {
    label: "Processo",
    filename: "processo.csv",
    tipoRegistro: 13,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Nr_Processo", "Tipo_Processo", "Comarca", "Vara", "Uf",
      "Processo_Digital"
    ]
  },
  processo_andamento: {
    label: "Processo Andamento",
    filename: "processo_andamento.csv",
    tipoRegistro: 14,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Nr_Processo", "Dt_Andamento", "Complemento",
      "Observacao"
    ]
  },
  processo_data: {
    label: "Processo Data",
    filename: "processo_data.csv",
    tipoRegistro: 15,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Nr_Processo", "Dt_Prazo", "Observacao"
    ]
  },
  processo_localizador: {
    label: "Processo Localizador",
    filename: "processo_localizador.csv",
    tipoRegistro: 16,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Nr_Processo", "Dt_Localizacao", "Localizador",
      "Tipo_Retorno"
    ]
  },
  despesa: {
    label: "Despesa",
    filename: "despesa.csv",
    tipoRegistro: 17,
    headers: [
      "Tipo_Registro", "Nr_Contrato", "Cod_Despesa_Sistema", "Tipo_Comprovante", "Dt_Despesa",
      "Vl_Despesa", "Cpf_Cnpj"
    ]
  },
  mensagem_operacao: {
    label: "Mensagem Operação",
    filename: "mensagem_operacao.csv",
    tipoRegistro: 18,
    headers: [
      "Tipo_Registro", "Cpf_Cnpj", "Nr_Contrato", "Mensagem", "Status_Msg"
    ]
  }
};

/* Ordem oficial de recepcao (pelo Tipo_Registro). */
export const DATACOB_LAYOUT_KEYS = ["configuracao","loja","financiado","email","telefone","endereco","contrato","parcela","historico","garantia","avalista","dados_auxiliares","processo","processo_andamento","processo_data","processo_localizador","despesa","mensagem_operacao"];

/* Layout pelo valor da coluna Tipo_Registro. */
export function layoutPorTipoRegistro(tipo) {
  const alvo = String(tipo).trim();
  return Object.entries(DATACOB_CSV_LAYOUTS)
    .map(([key, l]) => ({ key, ...l }))
    .find((l) => String(l.tipoRegistro) === alvo) || null;
}
