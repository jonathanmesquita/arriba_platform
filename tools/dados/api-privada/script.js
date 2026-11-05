/* =====================================================================
   Validar e consultar pela API - Arriba Platform

   A única tela do site que conversa com um servidor: a Arriba API
   (repositório arriba-api, no Render). Todas as outras ferramentas rodam
   só no navegador.

   SEGREDO NENHUM NESTE ARQUIVO. Site estático é público por definição —
   o que estiver aqui, qualquer visitante lê. Por isso há dois jeitos de
   entrar, e nenhum deles grava nada:

   1. Usuário e senha (o recomendado). A API responde com um cookie
      HttpOnly: o navegador o manda sozinho em cada chamada
      (`credentials: "include"`), e nenhum JavaScript consegue lê-lo.
      Funciona porque arriba.jm.dev.br e api.arriba.jm.dev.br são o mesmo
      *site* (o cookie SameSite=Lax vai junto) e a API libera CORS para
      esta origem.

   2. Chave de API, digitada na hora. Fica numa variável deste módulo:
      some ao recarregar, nunca vai para localStorage/sessionStorage.

   Tudo que vem da API é escrito com textContent, nunca innerHTML: o
   endereço que a ViaCEP devolve é dado de terceiro, e dado de terceiro
   não vira HTML nesta página.
   ===================================================================== */

import { gerarCelular, gerarCpf } from "../../../assets/js/fake-data-br.js";
/* Endereço da API, chamada, login e o atalho de administrador ficam em
   arriba-api.js — a página de configuração do chat usa o mesmo módulo. */
import { API, API_PADRAO, MENSAGEM_DEMORA, chamarApi, entrar, lembrarAdmin, lerSessao, sair as sairDaApi } from "../../../assets/js/arriba-api.js";

/* ---------------------------------------------------------------------
   Operações: o que a tela sabe pedir. Espelha o GET /v1 da API.
   --------------------------------------------------------------------- */
const OPERACOES = [
  {
    id: "cpf", grupo: "validar", rotulo: "CPF", metodo: "POST", caminho: "/v1/validar/cpf",
    descricao: "Confere o dígito verificador e o formato. Não diz se o CPF existe — isso só a Receita responde.",
    campos: [{ nome: "valor", rotulo: "CPF", placeholder: "000.000.000-00" }],
    exemplo: () => ({ valor: formatarCpf(gerarCpf()) })
  },
  {
    id: "cnpj", grupo: "validar", rotulo: "CNPJ", metodo: "POST", caminho: "/v1/validar/cnpj",
    descricao: "Numérico e alfanumérico — desde julho de 2026 a Receita emite CNPJ com letras nas 12 primeiras posições.",
    campos: [{ nome: "valor", rotulo: "CNPJ", placeholder: "12.ABC.345/01DE-35" }],
    exemplo: () => ({ valor: "12.ABC.345/01DE-35" })   // exemplo publicado pela própria Receita
  },
  {
    id: "email", grupo: "validar", rotulo: "E-mail", metodo: "POST", caminho: "/v1/validar/email",
    descricao: "Formato prático (o que provedor entrega de verdade), com sugestão quando o domínio parece digitado errado.",
    campos: [{ nome: "valor", rotulo: "E-mail", placeholder: "pessoa@exemplo.com", tipo: "email" }],
    exemplo: () => ({ valor: "pessoa.teste@gmial.com" })
  },
  {
    id: "celular", grupo: "validar", rotulo: "Celular", metodo: "POST", caminho: "/v1/validar/celular",
    descricao: "DDD que existe, 9 na frente, e devolve no padrão internacional (E.164).",
    campos: [{ nome: "valor", rotulo: "Celular", placeholder: "(11) 98765-4321", tipo: "tel" }],
    exemplo: () => ({ valor: formatarCelular(gerarCelular()) })
  },
  {
    id: "csv", grupo: "validar", rotulo: "CSV", metodo: "POST", caminho: "/v1/validar/csv",
    descricao: "Estrutura do arquivo (RFC 4180): aspas, número de colunas por linha, cabeçalho. Mesmo leitor do Validador de CSV do site.",
    campos: [
      { nome: "conteudo", rotulo: "Conteúdo do CSV", area: true },
      { nome: "delimitador", rotulo: "Delimitador", opcoes: [["", "Detectar sozinho"], [";", "Ponto e vírgula (;)"], [",", "Vírgula (,)"], ["\t", "Tabulação"], ["|", "Barra vertical (|)"]] }
    ],
    exemplo: () => ({ conteudo: "nome;cidade;uf\nAna Teste;\"Rua A; 10\";SP\nBia Exemplo;Recife;PE;sobrando\n", delimitador: "" })
  },
  {
    id: "json", grupo: "validar", rotulo: "JSON", metodo: "POST", caminho: "/v1/validar/json",
    descricao: "Sintaxe, com a linha e a coluna do erro.",
    campos: [{ nome: "conteudo", rotulo: "Conteúdo do JSON", area: true }],
    exemplo: () => ({ conteudo: "{\n  \"nome\": \"Ana Teste\",\n  idade: 30\n}" })
  },
  {
    id: "cep", grupo: "consultar", rotulo: "CEP", metodo: "GET", rota: "/v1/consultar/cep/:cep", caminho: (v) => `/v1/consultar/cep/${encodeURIComponent(v.cep)}`,
    descricao: "ViaCEP, com a BrasilAPI de reserva se a primeira falhar. A resposta diz de qual fonte veio e se saiu do cache.",
    campos: [{ nome: "cep", rotulo: "CEP", placeholder: "00000-000", obrigatorio: true }],
    exemplo: () => ({ cep: "01001-000" })   // logradouro público (praça), não endereço de pessoa
  },
  {
    id: "cnpj-consulta", grupo: "consultar", rotulo: "CNPJ (Receita)", metodo: "GET", rota: "/v1/consultar/cnpj/:cnpj", caminho: (v) => `/v1/consultar/cnpj/${encodeURIComponent(v.cnpj.replace(/[^0-9A-Za-z]/g, ""))}`,
    descricao: "Dados públicos da empresa pela BrasilAPI. A API não repassa quadro de sócios, telefone nem e-mail.",
    campos: [{ nome: "cnpj", rotulo: "CNPJ", placeholder: "00.000.000/0000-00", obrigatorio: true }],
    exemplo: null   // consulta precisa de CNPJ real, e exemplo deste site é sempre fictício
  },
  {
    id: "banco", grupo: "consultar", rotulo: "Banco por código", metodo: "GET", rota: "/v1/consultar/bancos/:codigo", caminho: (v) => `/v1/consultar/bancos/${encodeURIComponent(v.codigo)}`,
    descricao: "Nome e ISPB de um banco pelo código de compensação (BrasilAPI, lista do Banco Central).",
    campos: [{ nome: "codigo", rotulo: "Código (1 a 3 dígitos)", placeholder: "001", obrigatorio: true, tipo: "text", modo: "numeric" }],
    exemplo: () => ({ codigo: "1" })
  },
  {
    id: "bancos", grupo: "consultar", rotulo: "Lista de bancos", metodo: "GET", caminho: "/v1/consultar/bancos",
    descricao: "A lista inteira de bancos (BrasilAPI). Não precisa preencher nada.",
    campos: [],
    exemplo: null
  }
];

function formatarCpf(d) { return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`; }
function formatarCelular(d) { return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; }

/* ---------------------------------------------------------------------
   Estado
   --------------------------------------------------------------------- */
let chaveNaMemoria = null;      // nunca sai desta variável
let estado = "verificando";     // verificando | fora | sessao | chave
let usuarioSessao = null;
let operacaoAtual = OPERACOES[0];

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, filhos = []) {
  const no = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "texto") no.textContent = v;
    else if (k === "classe") no.className = v;
    else if (k in no) no[k] = v;
    else no.setAttribute(k, v);
  });
  [].concat(filhos).filter(Boolean).forEach((f) => no.append(f));
  return no;
}

/* ---------------------------------------------------------------------
   Chamada à API
   --------------------------------------------------------------------- */
const avisarDemora = () => mostrarAviso("info", MENSAGEM_DEMORA);

async function chamar(metodo, caminho, corpo) {
  try {
    return await chamarApi(metodo, caminho, { corpo, chave: chaveNaMemoria, aoDemorar: avisarDemora });
  } finally {
    if (!$("avisoAcesso").dataset.fixo) esconderAviso();
  }
}

/* ---------------------------------------------------------------------
   Acesso
   --------------------------------------------------------------------- */
function mostrarAviso(tipo, texto, fixo = false) {
  const aviso = $("avisoAcesso");
  aviso.dataset.tipo = tipo;
  aviso.textContent = texto;
  aviso.hidden = false;
  if (fixo) aviso.dataset.fixo = "1"; else delete aviso.dataset.fixo;
}

function esconderAviso() {
  const aviso = $("avisoAcesso");
  aviso.hidden = true;
  delete aviso.dataset.fixo;
}

function definirEstado(novo, usuario = null) {
  estado = novo;
  usuarioSessao = usuario;
  const textos = {
    verificando: "Verificando…",
    fora: "Não conectado",
    sessao: `Conectado como ${usuario || "usuário"} (sessão)`,
    chave: "Conectado com chave de API (só nesta aba)"
  };
  $("estado").dataset.estado = novo;
  $("estadoTexto").textContent = textos[novo];
  $("blocoEntrar").hidden = !(novo === "fora");
  $("blocoConectado").hidden = !(novo === "sessao" || novo === "chave");
  /* O atalho para a configuração do chat é de administrador: só aparece
     com sessão (a chave de API não abre a página de configuração). */
  $("linkConfigChat").hidden = novo !== "sessao";
}

async function verificarSessao() {
  const sessao = await lerSessao({ aoDemorar: avisarDemora });
  if (!$("avisoAcesso").dataset.fixo) esconderAviso();
  if (sessao.conectado) {
    definirEstado("sessao", sessao.usuario);
    lembrarAdmin(sessao.papel === "admin");
  } else {
    definirEstado("fora");
    if (sessao.falhaRede) mostrarAviso("erro", sessao.falhaRede, true);
  }
}

async function entrarComSenha(evento) {
  evento.preventDefault();
  const botao = $("btnEntrar");
  botao.disabled = true;
  const usuario = $("usuario").value.trim();
  const senha = $("senha").value;

  const r = await entrar(usuario, senha, { aoDemorar: avisarDemora });
  $("senha").value = "";
  botao.disabled = false;

  if (r.ok) {
    chaveNaMemoria = null;
    esconderAviso();
    definirEstado("sessao", r.usuario);
    lembrarAdmin(r.papel === "admin");
    return;
  }
  mostrarAviso("erro", r.mensagem, true);
  $("senha").focus();
}

async function entrarComChave(evento) {
  evento.preventDefault();
  const campo = $("chave");
  const chave = campo.value.trim();
  campo.value = "";
  if (!chave) return;

  chaveNaMemoria = chave;
  const r = await chamar("GET", "/v1");
  if (r.status === 200) {
    esconderAviso();
    definirEstado("chave");
    return;
  }
  chaveNaMemoria = null;
  /* A API diz qual é o engano provável (variável não resolvida, hash no
     lugar da chave, par diferente) e a "impressão" do que chegou: os 8
     primeiros caracteres do SHA-256, para comparar com o começo do hash
     cadastrado no Render sem ninguém mostrar a chave. */
  const motivo = r.dados?.code === "CHAVE_INVALIDA"
    ? `Essa chave não está cadastrada na API. ${r.dados.dica || "Confira se é a chave (arb_…) do mesmo par cujo hash está no Render."}` +
      (r.dados.impressao ? ` Impressão da chave digitada: ${r.dados.impressao}.` : "")
    : (r.falhaRede || r.dados?.error || `A API respondeu ${r.status}.`);
  mostrarAviso("erro", motivo, true);
}

async function sair() {
  chaveNaMemoria = null;
  await sairDaApi();
  definirEstado("fora");
  mostrarAviso("ok", "Você saiu. A sessão foi encerrada e a chave, se havia, foi esquecida.", true);
}

/* ---------------------------------------------------------------------
   Operações: seletor e formulário
   --------------------------------------------------------------------- */
function montarSeletores() {
  ["validar", "consultar"].forEach((grupo) => {
    const alvo = $(grupo === "validar" ? "opsValidar" : "opsConsultar");
    OPERACOES.filter((op) => op.grupo === grupo).forEach((op) => {
      const botao = el("button", { type: "button", classe: "op", texto: op.rotulo });
      botao.dataset.op = op.id;
      botao.setAttribute("aria-pressed", String(op === operacaoAtual));
      botao.addEventListener("click", () => escolherOperacao(op.id));
      alvo.append(botao);
    });
  });
}

function escolherOperacao(id) {
  operacaoAtual = OPERACOES.find((op) => op.id === id) || OPERACOES[0];
  document.querySelectorAll(".op").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.op === operacaoAtual.id)));

  const rota = operacaoAtual.rota || operacaoAtual.caminho;
  const descricao = $("opDescricao");
  descricao.replaceChildren(
    el("span", { classe: "rota", texto: `${operacaoAtual.metodo} ${rota}` }),
    document.createTextNode(" " + operacaoAtual.descricao)
  );

  const area = $("camposOperacao");
  area.replaceChildren(...operacaoAtual.campos.map((c) => {
    const idCampo = `campo-${c.nome}`;
    let controle;
    if (c.area) {
      controle = el("textarea", { id: idCampo, name: c.nome, spellcheck: false });
    } else if (c.opcoes) {
      controle = el("select", { id: idCampo, name: c.nome }, c.opcoes.map(([valor, texto]) => el("option", { value: valor, texto })));
    } else {
      controle = el("input", { id: idCampo, name: c.nome, type: c.tipo || "text", placeholder: c.placeholder || "", autocomplete: "off", spellcheck: false });
      if (c.modo) controle.setAttribute("inputmode", c.modo);
    }
    return el("div", { classe: "campo", style: "margin-top:12px" }, [el("label", { htmlFor: idCampo, texto: c.rotulo }), controle]);
  }));

  $("btnExemplo").hidden = !operacaoAtual.exemplo;
}

function preencherExemplo() {
  if (!operacaoAtual.exemplo) return;
  const valores = operacaoAtual.exemplo();
  Object.entries(valores).forEach(([nome, valor]) => {
    const campo = $(`campo-${nome}`);
    if (campo) campo.value = valor;
  });
}

function lerCampos() {
  return Object.fromEntries(operacaoAtual.campos.map((c) => [c.nome, $(`campo-${c.nome}`)?.value ?? ""]));
}

async function enviar(evento) {
  evento.preventDefault();
  if (estado !== "sessao" && estado !== "chave") {
    mostrarAviso("erro", "Entre primeiro (usuário e senha, ou chave de API) — a API é privada.", true);
    $("tituloAcesso").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const valores = lerCampos();
  const faltando = operacaoAtual.campos.find((c) => !c.opcoes && !String(valores[c.nome]).trim());
  if (faltando) {
    $(`campo-${faltando.nome}`).focus();
    mostrarResposta({ status: 0, ms: 0, dados: null, falhaRede: `Preencha "${faltando.rotulo}".` }, null);
    return;
  }

  const caminho = typeof operacaoAtual.caminho === "string" ? operacaoAtual.caminho : operacaoAtual.caminho(valores);
  let corpo;
  if (operacaoAtual.metodo === "POST") {
    corpo = { ...valores };
    if (operacaoAtual.id === "csv" && !corpo.delimitador) delete corpo.delimitador;
  }

  const botao = $("btnEnviar");
  botao.disabled = true;
  /* Limpa a resposta anterior: deixar o resultado velho na tela enquanto
     o novo não chega faz parecer que o pedido novo respondeu aquilo. */
  $("resposta").replaceChildren(el("p", { classe: "resposta-vazia", texto: `Enviando ${operacaoAtual.metodo} ${operacaoAtual.rota || operacaoAtual.caminho}…` }));
  $("resposta").setAttribute("aria-busy", "true");
  const r = await chamar(operacaoAtual.metodo, caminho, corpo);
  botao.disabled = false;
  $("resposta").removeAttribute("aria-busy");

  if (r.status === 401) {
    /* Sessão expirou (8 h) ou a chave deixou de valer. */
    chaveNaMemoria = null;
    definirEstado("fora");
    mostrarAviso("erro", "A sessão expirou ou a chave não vale mais. Entre de novo.", true);
  }
  mostrarResposta(r, { metodo: operacaoAtual.metodo, caminho, corpo });
}

/* ---------------------------------------------------------------------
   Resposta: explicada primeiro, JSON completo depois
   --------------------------------------------------------------------- */
function selo(texto, tipo) {
  const s = el("span", { classe: "selo", texto });
  if (tipo) s.dataset.tipo = tipo;
  return s;
}

function veredito(texto, tipo) {
  const p = el("p", { classe: "veredito", texto });
  p.dataset.tipo = tipo;
  return p;
}

function listaDeProblemas(problemas = []) {
  if (!problemas.length) return null;
  return el("ul", { classe: "lista-problemas" }, problemas.map((p) => {
    /* A mensagem da API às vezes já diz a linha ("Linha 3: ..."); só
       acrescenta quando não diz, para não sair "Linha 3: Linha 3: ...". */
    const jaDiz = /linha \d/i.test(p.mensagem || "");
    const onde = p.linha && !jaDiz ? `Linha ${p.linha}${p.coluna ? `, coluna ${p.coluna}` : ""}: ` : "";
    const gravidade = p.gravidade === "aviso" ? " (aviso)" : "";
    return el("li", { texto: `${onde}${p.mensagem}${gravidade}` });
  }));
}

function listaDeDados(pares) {
  const dl = el("dl", { classe: "dados" });
  pares.filter(([, v]) => v !== null && v !== undefined && v !== "").forEach(([rotulo, valor]) => {
    dl.append(el("dt", { texto: rotulo }), el("dd", { texto: String(valor) }));
  });
  return dl;
}

function explicar(dados, opId) {
  const partes = [];

  if (["cpf", "cnpj", "email", "celular"].includes(opId)) {
    partes.push(dados.valido ? veredito("✓ Válido", "ok") : veredito("✗ Não passou", "erro"));
    partes.push(listaDeDados([
      ["Formatado", dados.formatado],
      ["Normalizado", dados.normalizado],
      ["Padrão internacional", dados.e164],
      ["Alfanumérico", dados.alfanumerico === undefined ? null : (dados.alfanumerico ? "sim (formato de 2026)" : "não")],
      ["Você quis dizer", dados.sugestao]
    ]));
    partes.push(listaDeProblemas(dados.problemas));
  } else if (opId === "csv") {
    partes.push(dados.valido ? veredito("✓ Estrutura OK", "ok") : veredito("✗ Estrutura com erro", "erro"));
    const r = dados.resumo || {};
    partes.push(listaDeDados([
      ["Registros", r.registros], ["Colunas", r.colunas], ["Delimitador", r.delimitador],
      ["Fim de linha", r.quebraLinha], ["Erros / avisos", `${r.erros ?? 0} / ${r.avisos ?? 0}`],
      ["Cabeçalho", (dados.cabecalho || []).join(" · ")]
    ]));
    partes.push(listaDeProblemas(dados.problemas));
    if (dados.problemasOmitidos) partes.push(el("p", { classe: "nota-pequena", texto: `Mais ${dados.problemasOmitidos} problema(s) não listados.` }));
  } else if (opId === "json") {
    partes.push(dados.valido ? veredito("✓ JSON válido", "ok") : veredito("✗ JSON inválido", "erro"));
    if (dados.valido) partes.push(listaDeDados([["Raiz", dados.tipoRaiz], ["Itens na raiz", dados.itens]]));
    partes.push(listaDeProblemas(dados.problemas));
    const trecho = dados.problemas?.[0]?.trecho;
    if (trecho) partes.push(el("pre", { classe: "codigo", texto: trecho }));
  } else if (opId === "bancos" && Array.isArray(dados.dados)) {
    partes.push(veredito(`✓ ${dados.dados.length} bancos`, "ok"));
    const linhas = dados.dados.filter((b) => b.codigo !== null).slice(0, 30);
    partes.push(el("div", { classe: "tabela-wrap" }, el("table", { classe: "bancos" }, [
      el("thead", {}, el("tr", {}, ["Código", "Nome", "ISPB"].map((t) => el("th", { scope: "col", texto: t })))),
      el("tbody", {}, linhas.map((b) => el("tr", {}, [String(b.codigo).padStart(3, "0"), b.nome, b.ispb].map((t) => el("td", { texto: t ?? "" })))))
    ])));
    partes.push(el("p", { classe: "nota-pequena", texto: "Mostrando os 30 primeiros; a lista completa está no JSON abaixo." }));
  } else if (dados.dados && typeof dados.dados === "object") {
    partes.push(veredito("✓ Encontrado", "ok"));
    const d = dados.dados;
    const pares = opId === "cep"
      ? [["CEP", d.cep], ["Logradouro", d.logradouro], ["Complemento", d.complemento], ["Bairro", d.bairro], ["Cidade", d.cidade], ["UF", d.uf], ["IBGE", d.ibge], ["DDD", d.ddd]]
      : opId === "cnpj-consulta"
        ? [["CNPJ", d.cnpj], ["Razão social", d.razaoSocial], ["Nome fantasia", d.nomeFantasia], ["Situação", d.situacao], ["Abertura", d.abertura], ["Atividade", d.atividadePrincipal ? `${d.atividadePrincipal.codigo} — ${d.atividadePrincipal.descricao}` : null], ["Município", d.municipio && d.uf ? `${d.municipio} / ${d.uf}` : d.municipio], ["Porte", d.porte]]
        : [["Código", d.codigo], ["Nome", d.nome], ["Nome completo", d.nomeCompleto], ["ISPB", d.ispb]];
    partes.push(listaDeDados(pares));
  }
  return partes;
}

function mostrarResposta(r, pedido) {
  const area = $("resposta");
  const filhos = [];

  const linha = el("div", { classe: "linha-status" });
  if (r.status) linha.append(selo(`HTTP ${r.status}`, r.status < 300 ? "ok" : (r.status >= 500 || r.status === 401 ? "erro" : "aviso")));
  if (pedido) linha.append(selo(`${r.ms} ms`));
  if (r.dados?.fonte) linha.append(selo(`Fonte: ${r.dados.fonte}`));
  if (r.dados?.cache !== undefined) linha.append(selo(r.dados.cache ? "Do cache" : "Direto da fonte", r.dados.cache ? "ok" : null));
  if (linha.childElementCount) filhos.push(linha);

  if (r.falhaRede) {
    filhos.push(veredito("Sem resposta", "erro"), el("p", { texto: r.falhaRede }));
  } else if (r.dados?.ok === false) {
    filhos.push(veredito(r.dados.error || "A API recusou o pedido", "erro"));
    filhos.push(listaDeDados([["Código do erro", r.dados.code], ["O que fazer", r.dados.message || r.dados.dica], ["Impressão da chave enviada", r.dados.impressao]]));
    if (r.dados.tentativas) filhos.push(listaDeProblemas(r.dados.tentativas.map((t) => ({ mensagem: t }))));
    if (r.dados.problemas) filhos.push(listaDeProblemas(r.dados.problemas));
  } else if (r.dados) {
    filhos.push(...explicar(r.dados, operacaoAtual.id).filter(Boolean));
  }

  if (r.dados) {
    filhos.push(el("details", { classe: "bruto" }, [
      el("summary", { texto: "Resposta completa (JSON)" }),
      el("pre", { classe: "codigo", texto: JSON.stringify(r.dados, null, 2) })
    ]));
  }

  if (pedido) {
    filhos.push(el("details", { classe: "bruto" }, [
      el("summary", { texto: "Como fazer esta chamada fora daqui (curl)" }),
      el("pre", { classe: "codigo", texto: comandoCurl(pedido) }),
      el("p", { classe: "nota-pequena", texto: "Troque SUA_CHAVE pela sua chave arb_… — ela nunca aparece nesta tela." })
    ]));
  }

  area.replaceChildren(...filhos);
}

function comandoCurl({ metodo, caminho, corpo }) {
  const partes = [`curl --request ${metodo} '${API}${caminho}'`, "  --header 'x-api-key: SUA_CHAVE'"];
  if (corpo !== undefined) {
    partes.push("  --header 'Content-Type: application/json'");
    partes.push(`  --data '${JSON.stringify(corpo).replace(/'/g, "'\\''")}'`);
  }
  return partes.join(" \\\n");
}

/* ---------------------------------------------------------------------
   Início
   --------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  montarSeletores();
  escolherOperacao(operacaoAtual.id);

  $("formLogin").addEventListener("submit", entrarComSenha);
  $("formChave").addEventListener("submit", entrarComChave);
  $("btnSair").addEventListener("click", sair);
  $("formOperacao").addEventListener("submit", enviar);
  $("btnExemplo").addEventListener("click", preencherExemplo);

  if (API !== API_PADRAO) mostrarAviso("info", `Usando a API local: ${API}`, true);
  verificarSessao();
});
