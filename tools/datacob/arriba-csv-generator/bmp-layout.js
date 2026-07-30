/* =====================================================================
   02-Resumo Contrato BMP - Gerador de massa fictícia

   Layout flat (59 colunas, separador ";"), diferente do layout DataCob
   (Financiado/Contrato/Parcela por Tipo_Registro) já existente nesta
   mesma página. Cabeçalho e ordem das colunas replicam EXATAMENTE o
   arquivo real fornecido como referência.

   Colunas de Avalista, Sócio, Vlr_Renda, Profissão, Auxiliar_Nome e
   Valor_Parcela_FGTS ficam sempre em branco - mesmo padrão observado
   na carga real usada como referência. Fórmulas de Vlr_Parcela e
   Valor Credito são aproximações plausíveis para dados FICTÍCIOS de
   teste, não reproduzem a fórmula financeira real da BMP.
   ===================================================================== */

import {
  randomInt, gerarNome, gerarCpf, gerarCelular, gerarEmail,
  gerarUf, gerarCidade, gerarBairro, gerarLogradouro, gerarCep,
  gerarDataEntre, formatarDataBr, formatarNumeroBr, gerarValorAleatorio
} from "../../../assets/js/fake-data-br.js";

const HEADER = [
  "Proposta_BMP", "Dt_Proposta", "Situacao", "Rede", "Nome_Parc/Corresp", "Emitente", "CPF/CNPJ",
  "Vlr_Renda", "Telefone_1", "Telefone_2", "Celular_1", "Celular_2", "E-mail", "Logradouro", "Nro",
  "Complemento", "CEP", "Bairro", "Cidade", "UF", "Vlr_Financiado", "Taxa_Mes", "Prazo", "Prim_Vencto",
  "Vlr_Parcela", "Profissao", "Auxiliar_Nome", "Proposta_BMP_", "Avalista nome", "Avalista Cpf_Cnpj",
  "Avalista DDD_1", "Avalista Fone_1", "Avalista DDD_2", "Avalista Fone_2", "Avalista e-mail",
  "Avalista Logradouro", "Avalista Numero", "Avalista Complemento", "Avalista Bairro", "Avalista Cidade",
  "Avalista UF", "Avalista CEP", "Sócio nome", "Sócio Cpf_Cnpj", "Sócio DDD_1", "Sócio Fone_1",
  "Sócio DDD_2", "Sócio Fone_2", "Sócio e-mail", "Sócio Logradouro", "Sócio Numero", "Sócio Complemento",
  "Sócio Bairro", "Sócio Cidade", "Sócio UF", "Sócio CEP", "Valor_Parcela_FGTS", "Valor Credito",
  "CNPJ do Parceiro"
];

const COMPLEMENTOS = ["", "", "", "CASA", "AP 12", "BLOCO A AP 21", "FUNDOS", "CS 2", "SOBRADO"];

let proximaProposta = randomInt(41500000, 42500000);
let ultimoPreview = "";

function proximoIdProposta() {
  proximaProposta += randomInt(30, 400);
  return proximaProposta;
}

function gerarUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = randomInt(0, 15);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function lerConfig() {
  const val = (id) => document.getElementById(id)?.value ?? "";
  return {
    rede: val("bmpRede") || "Unit",
    nomeParceiro: val("bmpNomeParceiro"),
    cnpjParceiro: val("bmpCnpjParceiro"),
    situacao: val("bmpSituacao") || "Paga",
    quantidade: Math.max(1, Math.min(5000, Number(val("bmpQuantidade")) || 10)),
    dataInicio: val("bmpDataInicio") || "2024-10-01",
    dataFim: val("bmpDataFim") || "2024-10-31",
    valorMin: Number(String(val("bmpValorMin")).replace(",", ".")) || 500,
    valorMax: Number(String(val("bmpValorMax")).replace(",", ".")) || 5000,
    prazoMin: Math.max(1, Number(val("bmpPrazoMin")) || 6),
    prazoMax: Math.max(1, Number(val("bmpPrazoMax")) || 24),
    taxaMin: Number(String(val("bmpTaxaMin")).replace(",", ".")) || 2.89,
    taxaMax: Number(String(val("bmpTaxaMax")).replace(",", ".")) || 4.29
  };
}

function gerarLinha(config, indice) {
  const nome = gerarNome().toUpperCase();
  const uf = gerarUf();
  const dtPropostaIso = gerarDataEntre(config.dataInicio, config.dataFim);
  const prazo = randomInt(Math.min(config.prazoMin, config.prazoMax), Math.max(config.prazoMin, config.prazoMax));
  const taxa = gerarValorAleatorio(Math.min(config.taxaMin, config.taxaMax), Math.max(config.taxaMin, config.taxaMax), 2);
  const financiado = Math.round(gerarValorAleatorio(Math.min(config.valorMin, config.valorMax), Math.max(config.valorMin, config.valorMax), 0));
  const valorCredito = gerarValorAleatorio(financiado * 1.04, financiado * 1.15, 2);
  const parcela = gerarValorAleatorio((valorCredito / prazo) * 1.0, (valorCredito / prazo) * 1.15, 2);

  const primVenctoIso = new Date(new Date(dtPropostaIso).getTime() + randomInt(30, 60) * 86400000).toISOString().slice(0, 10);
  const nro = Math.random() < 0.08 ? "" : String(randomInt(1, 2200));
  const complemento = COMPLEMENTOS[randomInt(0, COMPLEMENTOS.length - 1)];

  const linha = {
    Proposta_BMP: proximoIdProposta(),
    Dt_Proposta: formatarDataBr(dtPropostaIso),
    Situacao: config.situacao,
    Rede: config.rede,
    "Nome_Parc/Corresp": config.nomeParceiro,
    Emitente: nome,
    "CPF/CNPJ": gerarCpf(),
    Vlr_Renda: "",
    Telefone_1: "1111111111",
    Telefone_2: "",
    Celular_1: gerarCelular(),
    Celular_2: "",
    "E-mail": gerarEmail(nome, indice),
    Logradouro: gerarLogradouro().toUpperCase(),
    Nro: nro,
    Complemento: complemento,
    CEP: gerarCep(),
    Bairro: gerarBairro().toUpperCase(),
    Cidade: gerarCidade(uf).toUpperCase(),
    UF: uf,
    Vlr_Financiado: String(financiado),
    Taxa_Mes: formatarNumeroBr(taxa, 2),
    Prazo: String(prazo),
    Prim_Vencto: formatarDataBr(primVenctoIso),
    Vlr_Parcela: formatarNumeroBr(parcela, 2),
    Profissao: "",
    Auxiliar_Nome: "",
    Proposta_BMP_: gerarUuid(),
    "Avalista nome": "", "Avalista Cpf_Cnpj": "", "Avalista DDD_1": "", "Avalista Fone_1": "",
    "Avalista DDD_2": "", "Avalista Fone_2": "", "Avalista e-mail": "", "Avalista Logradouro": "",
    "Avalista Numero": "", "Avalista Complemento": "", "Avalista Bairro": "", "Avalista Cidade": "",
    "Avalista UF": "", "Avalista CEP": "",
    "Sócio nome": "", "Sócio Cpf_Cnpj": "", "Sócio DDD_1": "", "Sócio Fone_1": "",
    "Sócio DDD_2": "", "Sócio Fone_2": "", "Sócio e-mail": "", "Sócio Logradouro": "",
    "Sócio Numero": "", "Sócio Complemento": "", "Sócio Bairro": "", "Sócio Cidade": "",
    "Sócio UF": "", "Sócio CEP": "",
    Valor_Parcela_FGTS: "",
    "Valor Credito": formatarNumeroBr(valorCredito, 2),
    "CNPJ do Parceiro": config.cnpjParceiro
  };

  return HEADER.map((coluna) => linha[coluna] ?? "");
}

function montarCsv(linhas) {
  const escapar = (v) => {
    const texto = String(v ?? "");
    return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  return [HEADER.join(";"), ...linhas.map((linha) => linha.map(escapar).join(";"))].join("\n");
}

function gerar() {
  const config = lerConfig();
  const linhas = Array.from({ length: config.quantidade }, (_, i) => gerarLinha(config, i + 1));
  const csv = montarCsv(linhas);
  ultimoPreview = csv;

  const PREVIEW_LIMIT = 50;
  const linhasPreview = csv.split("\n").slice(0, PREVIEW_LIMIT + 1);
  const preview = linhasPreview.join("\n") + (linhas.length > PREVIEW_LIMIT ? `\n... (+${linhas.length - PREVIEW_LIMIT} linha(s), incluídas no download)` : "");

  document.getElementById("bmpPreview").textContent = preview;
  document.getElementById("bmpBtnDownload").disabled = false;
  document.getElementById("bmpBtnCopy").disabled = false;
  setMsg(`${linhas.length} proposta(s) fictícia(s) gerada(s) com sucesso.`, "ok");
}

function baixar() {
  if (!ultimoPreview) return;
  const blob = new Blob(["﻿" + ultimoPreview], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resumo-contrato-bmp-ficticio-${Date.now()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function copiar() {
  if (!ultimoPreview) return;
  try {
    await navigator.clipboard.writeText(ultimoPreview);
    setMsg("Preview completo copiado para a área de transferência.", "ok");
  } catch {
    setMsg("Não foi possível copiar automaticamente. Selecione o texto manualmente.", "error");
  }
}

function setMsg(texto, tipo) {
  const el = document.getElementById("bmpMsg");
  if (!el) return;
  el.textContent = texto;
  el.className = "validation-msg" + (tipo ? " " + tipo : "");
}

document.getElementById("bmpBtnGerar")?.addEventListener("click", gerar);
document.getElementById("bmpBtnDownload")?.addEventListener("click", baixar);
document.getElementById("bmpBtnCopy")?.addEventListener("click", copiar);
