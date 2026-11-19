/* =====================================================================
   CNAB 400 - Validação de conteúdo (sem DOM)

   O motor (engine.js) sempre soube LER e GERAR. O que faltava era dizer
   quando o conteúdo está errado: ele lia um arquivo com letra no campo de
   valor, data 99/99/99 ou sequencial repetido e não avisava nada, e o
   gerador gravava dado errado em silêncio (letra sumia, número perdia os
   dígitos da esquerda, texto era cortado).

   TRÊS NÍVEIS, e a diferença importa:
     "erro"  — o arquivo ou o dado está objetivamente errado: o campo é
               numérico e tem letra; a data não existe; o campo tem valor
               fixo no layout e veio outro; o valor não cabe no campo.
     "aviso" — provável problema, mas a regra não é do layout e sim de
               prática (sequencial fora de ordem, ocorrência fora da tabela,
               acento num campo de texto). Pode ser legítimo em algum banco.
     (nada)  — o que não se sabe não é dito. Campo numérico em branco, por
               exemplo, não gera mensagem: há bancos que mandam zeros e há
               os que mandam brancos, e esta ferramenta não tem fonte
               confirmando qual vale para cada layout. É a mesma regra do
               resto do CNAB aqui: "campo sem confirmação em fonte confiável
               fica marcado como naoConfirmado, nunca estimado".

   Toda regra sai do que o próprio layout declara (type, fmt, fixo, ini,
   fim, ocorrencias) — nenhuma conhece um banco.
   ===================================================================== */

"use strict";

import { fld, parseArquivo, dividirLinhas, TAMANHO_REGISTRO_PADRAO } from "./engine.js";

/* ---------------------------------------------------------------------
   Datas
   --------------------------------------------------------------------- */

function diasNoMes(mes, ano) {
  if (mes === 2) return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

/* DDMMAA, com o mesmo pivô de século da leitura (parseData): até 70 é
   20xx, depois é 19xx. Zeros e branco significam "sem data" e não são erro
   aqui — quem cobra data preenchida é a regra de campo obrigatório. */
export function dataValida(raw, { anoComQuatroDigitos = false, formato = "" } = {}) {
  const t = String(raw ?? "").trim();
  if (!t || /^0+$/.test(t)) return true;
  const dma = formato === "DDMMAAAA";
  const tam = anoComQuatroDigitos || dma ? 8 : 6;
  if (!new RegExp(`^\\d{${tam}}$`).test(t)) return false;
  let dia; let mes; let ano;
  if (dma) { dia = +t.slice(0, 2); mes = +t.slice(2, 4); ano = +t.slice(4, 8); }
  else if (anoComQuatroDigitos) { ano = +t.slice(0, 4); mes = +t.slice(4, 6); dia = +t.slice(6, 8); }
  else {
    dia = +t.slice(0, 2); mes = +t.slice(2, 4);
    const aa = +t.slice(4, 6);
    ano = aa <= 70 ? 2000 + aa : 1900 + aa;
  }
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes(mes, ano);
}

/* O ano cabe no layout de 2 dígitos? A leitura entende 1971 a 2070; fora
   disso o ano é gravado como outro século (2075 vira "75" e é lido como
   1975). Devolve true quando cabe. */
export const ANO_MINIMO_DDMMAA = 1971;
export const ANO_MAXIMO_DDMMAA = 2070;
export function anoCabeEmDoisDigitos(ano) {
  return ano >= ANO_MINIMO_DDMMAA && ano <= ANO_MAXIMO_DDMMAA;
}

/* ---------------------------------------------------------------------
   Pequenos auxiliares
   --------------------------------------------------------------------- */

const tamanhoDe = (def) => def.fim - def.ini + 1;
const posicao = (def) => `${def.ini}–${def.fim}`;
const rotuloDe = (def) => def.nome || def.key;

/* Mostra o conteúdo com os brancos visíveis, para a mensagem dizer o que
   veio de verdade em vez de um texto que parece vazio. */
function mostrar(texto) {
  const t = String(texto);
  return `"${t.length > 24 ? `${t.slice(0, 24)}…` : t}"`;
}

const ACHA_NAO_ASCII = /[^\x20-\x7e]/;

function formatarReais(valor) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------------------------------------------------------------------
   Conferência campo a campo de UMA linha, contra a lista de campos do seu
   registro. Compartilhada com o CNAB 240 (que escolhe a lista pelo tipo e
   pelo segmento da linha). `registro` = "header" | "detalhe" | "trailer" |
   "extra"; no header o valor fixo é conferido pelo parseHeader (CNAB 400) e
   não é repetido aqui.
   --------------------------------------------------------------------- */
export function conferirCampos(texto, defs, registro, n, { conferirFixoNoHeader = false } = {}) {
  const problemas = [];
  const adiciona = (nivel, linha, mensagem, def, codigo) =>
    problemas.push({ nivel, linha, mensagem, ...(codigo ? { codigo } : {}), ...(def ? { campo: def.key, ini: def.ini, fim: def.fim } : {}) });

  for (const def of defs) {
    const bruto = fld(texto, def);
    const dado = bruto.trim();
    const onde = `Linha ${n}, "${rotuloDe(def)}" (posições ${posicao(def)})`;

    /* Valor fixo do layout. */
    if (def.fixo !== undefined && (registro !== "header" || conferirFixoNoHeader)) {
      if (dado.toUpperCase() !== String(def.fixo).trim().toUpperCase()) {
        adiciona("erro", n, `${onde}: veio ${mostrar(bruto)}, o layout fixa ${mostrar(def.fixo)}.`, def);
      }
      continue;
    }
    if (def.fixo !== undefined) continue;

    /* Valores permitidos declarados pelo layout (`opcoes`). Campo em
       branco ou zerado não é reportado (ver cabeçalho do arquivo). */
    if (def.opcoes && dado && !/^0+$/.test(dado) && !def.opcoes.includes(dado)) {
      adiciona("erro", n, `${onde}: veio ${mostrar(bruto)}, e o layout aceita só ${def.opcoes.map((o) => `"${o}"`).join(", ")}.`, def);
      continue;
    }
    /* Tabela de códigos (`tabela`): fora dela é aviso — o banco acrescenta códigos. */
    if (def.tabela && dado && !(dado in def.tabela)) {
      adiciona("aviso", n, `${onde}: o código ${mostrar(bruto)} não consta na tabela deste layout (pode ser um código novo do banco ou um erro).`, def);
    }

    /* Campo que guarda VÁRIOS códigos de tamanho fixo (ex.: 5 ocorrências de 2 caracteres):
       cada pedaço não vazio tem de constar na tabela — fora dela é aviso. */
    if (def.listaDeCodigos && dado) {
      const { tamanho: t, tabela } = def.listaDeCodigos;
      const desconhecidos = [];
      for (let i = 0; i < bruto.length; i += t) {
        const cod = bruto.slice(i, i + t).trim();
        if (cod && !(cod in tabela)) desconhecidos.push(cod);
      }
      if (desconhecidos.length) adiciona("aviso", n, `${onde}: ${desconhecidos.length === 1 ? "o código" : "os códigos"} ${desconhecidos.map((c) => `"${c}"`).join(", ")} não ${desconhecidos.length === 1 ? "consta" : "constam"} na tabela de ocorrências deste layout.`, def);
      continue;
    }

    if (def.type === "N") {
      if (def.fmt === "valorVirgula") {
        if (dado && !/^[\d.,\s]+$/.test(dado)) adiciona("erro", n, `${onde}: valor com caractere que não é número: ${mostrar(bruto)}.`, def);
      } else if (dado && /\D/.test(dado)) {
        adiciona("erro", n, `${onde}: campo numérico com caractere que não é dígito: ${mostrar(bruto)}.`, def);
      } else if (def.fmt === "data" && !dataValida(dado)) {
        adiciona("erro", n, `${onde}: data impossível ${mostrar(bruto)} (formato DDMMAA).`, def);
      } else if (def.fmt === "data8" && !dataValida(dado, { anoComQuatroDigitos: true })) {
        adiciona("erro", n, `${onde}: data impossível ${mostrar(bruto)} (formato AAAAMMDD).`, def);
      } else if (def.fmt === "dataDMA" && !dataValida(dado, { formato: "DDMMAAAA" })) {
        adiciona("erro", n, `${onde}: data impossível ${mostrar(bruto)} (formato DDMMAAAA).`, def);
      }
    } else if (def.type === "A") {
      if (/[\x00-\x08\x0b-\x1f\x7f]/.test(bruto)) adiciona("erro", n, `${onde}: contém caractere de controle (invisível), que o banco não aceita.`, def);
      else if (ACHA_NAO_ASCII.test(bruto)) adiciona("aviso", n, `${onde}: contém acento ou caractere especial ${mostrar(bruto)}. Os manuais pedem maiúsculas e sem acento, e o banco pode rejeitar.`, def, "acento");
    }
  }
  return problemas;
}

/* ---------------------------------------------------------------------
   LEITURA: valida as linhas de um arquivo contra o layout

   Devolve uma lista de problemas { nivel, linha, campo?, ini?, fim?,
   mensagem }. Não lança: arquivo estragado é o caso normal desta função.

   opcoes.direcao ("remessa" | "retorno") liga as regras que só fazem
   sentido numa direção. Nosso número repetido, por exemplo, é defeito na
   remessa e é NORMAL no retorno (o mesmo título aparece em "entrada
   confirmada" e depois em "liquidação").
   --------------------------------------------------------------------- */
export function validarLinhas(linhas, config, opcoes = {}) {
  const problemas = [];
  const tamanho = config.tamanhoRegistro || TAMANHO_REGISTRO_PADRAO;
  const adiciona = (nivel, linha, mensagem, def, codigo) =>
    problemas.push({ nivel, linha, mensagem, ...(codigo ? { codigo } : {}), ...(def ? { campo: def.key, ini: def.ini, fim: def.fim } : {}) });

  let viuHeader = false;
  let viuTrailer = false;
  const nossoNumeros = new Map();

  linhas.forEach((texto, idx) => {
    const n = idx + 1;
    const tipo = texto.charAt(0);

    /* Linha de tamanho errado: os campos abaixo já nasceriam deslocados e
       gerariam uma enxurrada de mensagens falsas. O motor já avisa o
       tamanho; aqui só se evita empilhar ruído em cima. */
    if (texto.length !== tamanho) return;

    let registro = null;
    let defs = null;
    if (tipo === "0") { registro = "header"; defs = config.headerFields; }
    else if (tipo === "1") { registro = "detalhe"; defs = config.detalheFields; }
    else if (tipo === "9" && config.trailerFields) { registro = "trailer"; defs = config.trailerFields; }
    /* Layouts com outros tipos de registro (ex.: tipos 2 e 3 opcionais da
       remessa do Inter) declaram `registrosExtras: { "2": { nome, fields } }`;
       eles têm os campos conferidos como o detalhe, sem entrar na contagem. */
    else if (config.registrosExtras?.[tipo]) { registro = "extra"; defs = config.registrosExtras[tipo].fields; }

    if (!registro) {
      adiciona("aviso", n, `Linha ${n}: registro tipo "${tipo}" não é descrito neste layout, então o conteúdo dele não foi conferido.`);
      return;
    }

    /* Ordem dos registros. */
    if (registro === "header") {
      if (viuHeader) adiciona("aviso", n, `Linha ${n}: há mais de um registro Header no arquivo.`);
      if (viuTrailer) adiciona("aviso", n, `Linha ${n}: Header depois do Trailer.`);
      viuHeader = true;
    } else if (registro === "detalhe") {
      if (!viuHeader && idx > 0) adiciona("aviso", n, `Linha ${n}: título antes do Header.`);
      if (viuTrailer) adiciona("aviso", n, `Linha ${n}: título depois do Trailer — o Trailer deveria ser a última linha.`);
    } else if (registro === "trailer") {
      if (viuTrailer) adiciona("aviso", n, `Linha ${n}: há mais de um registro Trailer no arquivo.`);
      viuTrailer = true;
    } else if (viuTrailer) {
      adiciona("aviso", n, `Linha ${n}: registro ${config.registrosExtras[tipo].nome} depois do Trailer.`);
    }

    /* Campo a campo. */
    problemas.push(...conferirCampos(texto, defs, registro, n));

    /* Regras entre campos do mesmo detalhe, declaradas pelo banco em
       `regrasDetalhe`: cada uma recebe { campos (texto cru por chave), linha }
       e devolve uma lista de { nivel, mensagem, campo? }. */
    if (registro === "detalhe" && config.regrasDetalhe) {
      const campos = Object.fromEntries(defs.map((d) => [d.key, fld(texto, d)]));
      for (const regra of config.regrasDetalhe) {
        for (const r of regra({ campos, linha: n }) || []) {
          const def = r.campo ? defs.find((d) => d.key === r.campo) : null;
          adiciona(r.nivel, n, `Linha ${n}: ${r.mensagem}`, def || undefined, r.codigo);
        }
      }
    }

    /* Sequencial: cada registro leva o número da linha. Aviso, e não erro,
       porque a regra não vem do layout declarado, e sim da prática dos
       manuais; um banco que pule número seria raro, mas não impossível. */
    const seq = defs.find((d) => d.key === "seqRegistro");
    if (seq) {
      const lido = fld(texto, seq).trim();
      if (/^\d+$/.test(lido) && Number(lido) !== n) {
        adiciona("aviso", n, `Linha ${n}: o sequencial do registro é ${Number(lido)}, e o esperado é ${n} (a numeração segue a ordem das linhas).`, seq);
      }
    }

    /* Ocorrência fora da tabela do layout. */
    if (registro === "detalhe" && config.ocorrencias) {
      const oc = defs.find((d) => d.key === "ocorrencia");
      if (oc) {
        const cod = fld(texto, oc).trim();
        if (cod && !(cod in config.ocorrencias)) {
          adiciona("aviso", n, `Linha ${n}: a ocorrência "${cod}" não consta na tabela deste layout (pode ser um código novo do banco ou um erro).`, oc);
        }
      }
    }

    /* Nosso número repetido — só na remessa. */
    if (registro === "detalhe" && opcoes.direcao === "remessa") {
      const nn = defs.find((d) => d.key === "nossoNumero");
      if (nn) {
        const valor = fld(texto, nn).trim();
        if (valor && /[1-9]/.test(valor)) {
          if (nossoNumeros.has(valor)) {
            adiciona("aviso", n, `Linha ${n}: o nosso número ${valor} já foi usado na linha ${nossoNumeros.get(valor)}. Dois títulos com o mesmo nosso número costumam ser recusados.`, nn);
          } else nossoNumeros.set(valor, n);
        }
      }
    }
  });

  return problemas;
}

/* ---------------------------------------------------------------------
   GERAÇÃO: valida o que a pessoa digitou ANTES de montar a linha

   buildLine/padField completam e cortam sem avisar, e é aí que o dado
   errado nascia: "12A45" virava "01245" (a letra some), uma conta com 9
   dígitos num campo de 7 perdia os 2 da esquerda, um nome comprido era
   cortado no meio, e um valor grande demais virava outro valor.

   `dados` = { header: {...}, detalhes: [{...}, ...] } — o mesmo formato do
   gerarArquivo. Devolve { problemas, temErro } com
   { nivel, onde: "header"|"detalhe", indice, chave, mensagem }.
   --------------------------------------------------------------------- */
function paraNumero(valor) {
  if (typeof valor === "number") return valor;
  const t = String(valor ?? "").trim();
  if (!t) return 0;
  return Number(t.replace(/\./g, "").replace(",", "."));
}

export function validarValor(def, valor, { obrigatorioVazio = true } = {}) {
  const saida = [];
  const texto = valor === undefined || valor === null ? "" : String(valor).trim();
  const tam = tamanhoDe(def);

  if (!texto) {
    if (def.obrigatorio && obrigatorioVazio) saida.push({ nivel: "erro", mensagem: "Campo obrigatório." });
    return saida;
  }

  if (def.opcoes && !def.opcoes.includes(texto)) {
    saida.push({ nivel: "erro", mensagem: `${mostrar(texto)} não é um valor aceito: o layout aceita só ${def.opcoes.map((o) => `"${o}"`).join(", ")}.` });
    return saida;
  }
  if (def.tabela && !(texto in def.tabela)) {
    saida.push({ nivel: "aviso", mensagem: `O código ${mostrar(texto)} não consta na tabela deste layout (pode ser um código novo do banco).` });
  }

  if (def.fmt === "valor") {
    const n = paraNumero(valor);
    if (!Number.isFinite(n)) saida.push({ nivel: "erro", mensagem: `${mostrar(texto)} não é um valor em reais.` });
    else if (n < 0) saida.push({ nivel: "erro", mensagem: "O valor não pode ser negativo." });
    else {
      const centavos = String(Math.round(n * 100));
      /* "12.5" é lido como 125 (o ponto é separador de milhar no padrão
         brasileiro) — vale perguntar antes de gravar o valor errado. */
      if (typeof valor === "string" && !texto.includes(",") && /\.\d{1,2}$/.test(texto)) {
        saida.push({ nivel: "aviso", mensagem: `${mostrar(texto)} será lido como R$ ${formatarReais(n)}: o ponto é separador de milhar, e o decimal é a vírgula (ex.: 12,50).` });
      }
      if (centavos.length > tam) {
        const maximo = Number("9".repeat(tam)) / 100;
        saida.push({ nivel: "erro", mensagem: `O valor R$ ${formatarReais(n)} não cabe: o campo tem ${tam} posições e comporta até R$ ${formatarReais(maximo)}.` });
      }
    }
    return saida;
  }

  if (def.fmt === "valorVirgula") {
    if (!/^[\d.,\s]+$/.test(texto)) saida.push({ nivel: "erro", mensagem: `${mostrar(texto)} não é um valor em reais.` });
    return saida;
  }

  if (def.fmt === "data" || def.fmt === "data8" || def.fmt === "dataDMA") {
    /* O formulário usa <input type="date"> (AAAA-MM-DD, sempre calendário
       válido), mas um arquivo importado pode trazer DD/MM/AAAA. */
    let ano; let mes; let dia;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
    if (iso) { ano = +iso[1]; mes = +iso[2]; dia = +iso[3]; }
    else if (br) { dia = +br[1]; mes = +br[2]; ano = +br[3]; }
    else { saida.push({ nivel: "erro", mensagem: `Data ${mostrar(texto)} em formato desconhecido.` }); return saida; }
    if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes(mes, ano)) saida.push({ nivel: "erro", mensagem: `A data ${mostrar(texto)} não existe.` });
    else if (def.fmt === "data" && !anoCabeEmDoisDigitos(ano)) {
      saida.push({ nivel: "erro", mensagem: `O ano ${ano} não cabe neste campo, que guarda só 2 dígitos: vale de ${ANO_MINIMO_DDMMAA} a ${ANO_MAXIMO_DDMMAA}. Fora disso o arquivo leria outro século.` });
    }
    return saida;
  }

  if (def.type === "N") {
    if (/[A-Za-z]/.test(texto)) {
      saida.push({ nivel: "erro", mensagem: `Campo numérico com letra: ${mostrar(texto)}. A letra seria apagada e os números deslocados.` });
      return saida;
    }
    /* Pontuação (CPF 123.456.789-00, CEP 01310-000) é normal e é removida
       de propósito pelo gerador; só conta os dígitos. */
    const digitos = texto.replace(/\D/g, "");
    if (!digitos) saida.push({ nivel: "erro", mensagem: `${mostrar(texto)} não tem nenhum dígito.` });
    else if (digitos.length > tam) saida.push({ nivel: "erro", mensagem: `Tem ${digitos.length} dígitos e o campo comporta ${tam}: ${digitos.length - tam === 1 ? "o 1 da esquerda seria perdido" : `os ${digitos.length - tam} da esquerda seriam perdidos`}.` });
    return saida;
  }

  /* Texto. */
  if (texto.length > tam) saida.push({ nivel: "erro", mensagem: `Tem ${texto.length} caracteres e o campo comporta ${tam}: o final seria cortado.` });
  if (/[\x00-\x08\x0b-\x1f\x7f]/.test(texto)) saida.push({ nivel: "erro", mensagem: "Contém caractere de controle (invisível)." });
  else if (ACHA_NAO_ASCII.test(texto)) saida.push({ nivel: "aviso", mensagem: "Tem acento ou caractere especial. Os manuais pedem maiúsculas e sem acento, e o banco pode rejeitar." });
  return saida;
}

export function validarDados(config, dados) {
  const problemas = [];
  const { header = {}, detalhes = [] } = dados || {};

  const conferir = (defs, valores, onde, indice) => {
    for (const def of defs || []) {
      if (def.fixo !== undefined) continue;     // o gerador grava o valor fixo; a pessoa não digita
      if (!(def.key in valores)) continue;      // campo que não está no formulário
      for (const p of validarValor(def, valores[def.key])) {
        problemas.push({ ...p, onde, indice, chave: def.key, nome: rotuloDe(def), ini: def.ini, fim: def.fim });
      }
    }
  };

  conferir(config.headerFields, header, "header", 0);
  detalhes.forEach((d, i) => conferir(config.detalheFields, d, "detalhe", i));
  return { problemas, temErro: problemas.some((p) => p.nivel === "erro") };
}

/* ---------------------------------------------------------------------
   Leitura + validação numa chamada só

   Devolve o resultado do parseArquivo e acrescenta `problemas` (estruturado)
   e `erros` (só os de nível "erro"). `avisos` continua como estava: strings
   do motor (tamanho de linha, trailer). Quem consome a UI pode mostrar as
   duas listas juntas.
   --------------------------------------------------------------------- */
export function lerEValidar(texto, config, opcoes = {}) {
  const resultado = parseArquivo(texto, config);
  const problemas = validarLinhas(dividirLinhas(texto), config, opcoes);
  return { ...resultado, problemas, erros: problemas.filter((p) => p.nivel === "erro") };
}
