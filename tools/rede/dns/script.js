/* =====================================================================
   Conferir DNS e e-mail de um domínio — a tela.

   A lógica (consulta, leitura de SPF/DKIM/DMARC, comparação do esperado
   com o publicado) mora em dns-logica.js, que tem teste automático. Aqui
   só se monta a página.

   Tudo que vem do DNS entra por textContent, nunca por innerHTML: é
   conteúdo de terceiro, e registro TXT aceita qualquer texto.
   ===================================================================== */

import {
  analisarDkim, analisarDmarc, analisarSpf, conferirRegistro, criarConsulta,
  lerEsperados, normalizarNome, nomeValido
} from "./dns-logica.js";

const consultar = criarConsulta((url, opcoes) => fetch(url, opcoes));
const $ = (id) => document.getElementById(id);

function el(tag, props = {}, filhos = []) {
  const no = document.createElement(tag);
  Object.entries(props).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null) return;
    if (chave === "texto") no.textContent = valor;
    else if (chave === "classe") no.className = valor;
    else if (chave in no) no[chave] = valor;
    else no.setAttribute(chave, valor);
  });
  [].concat(filhos).filter(Boolean).forEach((filho) => no.append(filho));
  return no;
}

/* A situação nunca é só cor: o selo traz ícone e palavra. */
const ICONE = { ok: "fa-solid fa-check", aviso: "fa-solid fa-triangle-exclamation", erro: "fa-solid fa-xmark", neutro: "fa-solid fa-circle-info" };

function selo(texto, tipo = "neutro") {
  return el("span", { classe: "selo", "data-tipo": tipo === "neutro" ? null : tipo }, [
    el("i", { className: ICONE[tipo] || ICONE.neutro, "aria-hidden": "true" }),
    el("span", { texto })
  ]);
}

function estado(texto, tipo = "") {
  const linha = $("estado");
  linha.textContent = texto;
  linha.dataset.tipo = tipo;
}

function listaDeTexto(itens, tipo) {
  if (!itens.length) return null;
  return el("ul", {}, itens.map((item) => el("li", { texto: (tipo === "erro" ? "Erro: " : "Atenção: ") + item })));
}

/* Cartão de resultado: título, selo, explicação e detalhes. */
function cartao({ titulo, tipo, situacao, paragrafos = [], pares = [], erros = [], avisos = [] }) {
  const corpo = [
    el("div", { classe: "item-topo" }, [
      el("span", { classe: "item-nome", texto: titulo }),
      situacao ? selo(situacao, tipo) : null
    ]),
    ...paragrafos.filter(Boolean).map((texto) => el("p", { texto })),
    pares.length
      ? el("dl", { classe: "dados" }, pares.filter(([, v]) => v !== "" && v !== undefined && v !== null)
          .flatMap(([rotulo, valor]) => [el("dt", { texto: rotulo }), el("dd", { texto: String(valor) })]))
      : null,
    listaDeTexto(erros, "erro"),
    listaDeTexto(avisos, "aviso")
  ];
  return el("div", { classe: "item", "data-tipo": tipo }, corpo);
}

let ultimoResultadoEmTexto = "";

/* O veredito, em negrito, logo acima dos cartões. role="status" faz o
   leitor de tela anunciá-lo quando ele entra na página. */
function veredito(texto) {
  return el("p", { classe: "resumo-geral", role: "status", texto });
}

function mostrar(nos, textoParaCopiar = "") {
  $("resultados").replaceChildren(...nos.filter(Boolean));
  ultimoResultadoEmTexto = textoParaCopiar;
  $("btnCopiarEsperados").classList.toggle("hidden", !textoParaCopiar);
}

function ocupado(botao, ocupadoAgora) {
  botao.disabled = ocupadoAgora;
}

/* ---------------------------------------------------------------------
   Modo 1: conferir os registros que o provedor mandou cadastrar
   --------------------------------------------------------------------- */
const PALAVRA = { ok: "Publicado", diferente: "Diferente", ausente: "Não encontrado", erro: "Não deu para consultar" };
const TIPO_DO_SELO = { ok: "ok", diferente: "aviso", ausente: "erro", erro: "erro" };

async function conferirEsperados(evento) {
  evento.preventDefault();
  const { registros, erros } = lerEsperados($("textoEsperados").value);

  if (!registros.length) {
    mostrar(erros.length ? [cartao({ titulo: "Não consegui ler o que você colou", tipo: "erro", erros })] : []);
    estado(erros.length ? "Confira o formato do que foi colado." : "Cole os registros que o provedor pediu.", "erro");
    return;
  }

  ocupado($("btnEsperados"), true);
  estado(`Consultando ${registros.length} ${registros.length === 1 ? "registro" : "registros"}…`);
  mostrar([]);

  const conferidos = [];
  for (const registro of registros) conferidos.push(await conferirRegistro(registro, consultar));
  ocupado($("btnEsperados"), false);

  const publicados = conferidos.filter((r) => r.situacao === "ok").length;
  const resumo = publicados !== conferidos.length
    ? `${publicados} de ${conferidos.length} publicados como esperado.`
    : conferidos.length === 1
      ? "O registro está publicado como esperado."
      : `Todos os ${conferidos.length} registros estão publicados como esperado.`;

  const linhas = [`Conferência de DNS — ${new Date().toLocaleString("pt-BR")}`, resumo, ""];
  const cartoes = conferidos.map((r) => {
    linhas.push(`[${PALAVRA[r.situacao]}] ${r.nome} (${r.tipo})`, `  esperado:   ${r.valor}`);
    if (r.encontrados.length) linhas.push(...r.encontrados.map((v, i) => `  ${i === 0 ? "publicado: " : "           "} ${v}`));
    linhas.push(`  ${r.explicacao}${r.dica ? ` ${r.dica}` : ""}`, "");
    return cartao({
      titulo: r.nome,
      tipo: TIPO_DO_SELO[r.situacao],
      situacao: `${PALAVRA[r.situacao]} · ${r.tipo}`,
      paragrafos: [r.explicacao, r.dica],
      pares: [
        ["Esperado", r.valor],
        r.encontrados.length ? ["Publicado", r.encontrados.join("\n")] : null,
        r.resolvedor ? ["Resolvedor", r.resolvedor] : null
      ].filter(Boolean)
    });
  });

  mostrar([
    veredito(resumo),
    ...(erros.length ? [cartao({ titulo: "Linhas que não consegui ler", tipo: "aviso", erros })] : []),
    ...cartoes
  ], linhas.join("\n"));
  estado("");
}

/* ---------------------------------------------------------------------
   Modo 2: e-mail do domínio (SPF, DKIM, DMARC)

   O DKIM fica num nome que cada provedor escolhe (o "seletor") e o DNS
   não permite listar os nomes de uma zona: ou se sabe o seletor, ou se
   tenta os conhecidos. Por isso o campo existe na tela.
   --------------------------------------------------------------------- */
const SELETORES_COMUNS = [
  ["google", "Google Workspace"], ["selector1", "Microsoft 365"], ["selector2", "Microsoft 365"],
  ["s1", "SendGrid e outros"], ["s2", "SendGrid e outros"], ["k1", "Mailchimp"],
  ["mandrill", "Mailchimp Transacional"], ["pm", "Postmark"], ["zoho", "Zoho"],
  ["default", "comum em servidor próprio"], ["dkim", "comum em servidor próprio"], ["mail", "comum em servidor próprio"]
];

async function analisarEmail(evento) {
  evento.preventDefault();
  const dominio = normalizarNome($("dominioEmail").value);
  if (!nomeValido(dominio)) {
    mostrar([]);
    estado("Escreva um domínio, como exemplo.com.br.", "erro");
    $("dominioEmail").focus();
    return;
  }

  ocupado($("btnEmail"), true);
  estado(`Consultando os registros de e-mail de ${dominio}…`);
  mostrar([]);

  const escolhidos = $("seletores").value.split(/[\s,;]+/).map((s) => normalizarNome(s)).filter(Boolean);
  const seletores = escolhidos.length ? escolhidos.map((s) => [s, "informado por você"]) : SELETORES_COMUNS;

  const [txtDoDominio, dmarc, mx, ...dkims] = await Promise.all([
    consultar(dominio, "TXT"),
    consultar(`_dmarc.${dominio}`, "TXT"),
    consultar(dominio, "MX"),
    ...seletores.map(([seletor]) => consultar(`${seletor}._domainkey.${dominio}`, "TXT"))
  ]);
  ocupado($("btnEmail"), false);

  const cartoes = [];

  /* --- MX: quem recebe o e-mail --- */
  const servidores = mx.registros.map((r) => r.valor).sort();
  cartoes.push(cartao({
    titulo: "MX — quem recebe o e-mail deste domínio",
    tipo: servidores.length ? "ok" : "aviso",
    situacao: servidores.length ? `${servidores.length} servidor(es)` : "nenhum",
    paragrafos: [servidores.length ? "" : "Sem MX, o domínio não recebe e-mail. Isso é normal em domínio que só envia ou que só hospeda site."],
    pares: servidores.map((valor, i) => [i === 0 ? "Servidores" : "", valor])
  }));

  /* --- SPF: quem pode enviar --- */
  const spfs = txtDoDominio.registros.filter((r) => /^v=spf1\b/i.test(r.valor));
  if (!spfs.length) {
    cartoes.push(cartao({
      titulo: "SPF — quem pode enviar e-mail em nome do domínio",
      tipo: "erro",
      situacao: "não encontrado",
      paragrafos: ["Não há registro SPF neste domínio. Sem ele, qualquer servidor pode tentar enviar e-mail em nome do domínio, e boa parte do que você envia cai em spam."],
      pares: [["Onde fica", `um registro TXT em ${dominio}`]]
    }));
  } else if (spfs.length > 1) {
    cartoes.push(cartao({
      titulo: "SPF",
      tipo: "erro",
      situacao: "duplicado",
      paragrafos: [`Há ${spfs.length} registros SPF neste domínio. A norma permite só um: com dois, quem recebe trata o SPF como inválido e ignora os dois.`, "Junte tudo num registro só, somando os \"include\" dos dois."],
      pares: spfs.map((r, i) => [`Registro ${i + 1}`, r.valor])
    }));
  } else {
    const spf = analisarSpf(spfs[0].valor);
    cartoes.push(cartao({
      titulo: "SPF — quem pode enviar e-mail em nome do domínio",
      tipo: spf.erros.length ? "erro" : spf.avisos.length ? "aviso" : "ok",
      situacao: spf.erros.length ? "com erro" : spf.avisos.length ? "válido, com ressalva" : "válido",
      paragrafos: [spf.oQueFaz ? `O que ele diz a quem recebe: ${spf.oQueFaz}.` : ""],
      pares: [
        ["Registro", spfs[0].valor],
        ["Consultas de DNS", `${spf.consultas} de 10 permitidas`],
        spf.quemEnvia.length ? ["Autorizados", spf.quemEnvia.join("\n")] : null
      ].filter(Boolean),
      erros: spf.erros,
      avisos: spf.avisos
    }));
  }

  /* --- DKIM: a assinatura --- */
  const achados = dkims
    .map((resposta, i) => ({ seletor: seletores[i][0], de: seletores[i][1], registros: resposta.registros.filter((r) => /(^|;)\s*(v=DKIM1|k=|p=)/i.test(r.valor)) }))
    .filter((d) => d.registros.length);

  if (!achados.length) {
    cartoes.push(cartao({
      titulo: "DKIM — a assinatura das mensagens",
      tipo: "aviso",
      situacao: escolhidos.length ? "não encontrado" : "não encontrado nos seletores comuns",
      paragrafos: [
        escolhidos.length
          ? `Não há registro DKIM em ${escolhidos.map((s) => `${s}._domainkey.${dominio}`).join(", ")}.`
          : "O DKIM fica num nome escolhido pelo provedor, e o DNS não permite listar todos os nomes de um domínio. Não achar aqui não quer dizer que não exista: pegue o seletor no painel do seu provedor de e-mail e escreva no campo acima.",
        "Sem DKIM, a mensagem não leva assinatura, e o DMARC passa a depender só do SPF — que se perde quando a mensagem é encaminhada."
      ],
      pares: escolhidos.length ? [] : [["Seletores tentados", SELETORES_COMUNS.map(([s]) => s).join(", ")]]
    }));
  } else {
    for (const achado of achados) {
      const dkim = analisarDkim(achado.registros[0].valor);
      cartoes.push(cartao({
        titulo: `DKIM — seletor "${achado.seletor}"`,
        tipo: dkim.erros.length ? "erro" : dkim.avisos.length ? "aviso" : "ok",
        situacao: dkim.erros.length ? "com erro" : "publicado",
        paragrafos: [`Encontrado em ${achado.seletor}._domainkey.${dominio} (${achado.de}).`],
        pares: [
          ["Tipo de chave", dkim.tipoDeChave.toUpperCase()],
          dkim.bits ? ["Tamanho", `${dkim.bits} bits (estimado pelo tamanho do registro)`] : null,
          achado.registros.length > 1 ? ["Atenção", `há ${achado.registros.length} registros neste seletor`] : null
        ].filter(Boolean),
        erros: dkim.erros,
        avisos: dkim.avisos
      }));
    }
  }

  /* --- DMARC: o que fazer com quem falhar --- */
  const dmarcs = dmarc.registros.filter((r) => /^v=dmarc1\b/i.test(r.valor));
  if (!dmarcs.length) {
    cartoes.push(cartao({
      titulo: "DMARC — o que fazer com quem falhar",
      tipo: "erro",
      situacao: "não encontrado",
      paragrafos: ["Não há registro DMARC. Sem ele, quem recebe decide sozinho o que fazer com uma mensagem que falha no SPF e no DKIM, e você não recebe relatório nenhum sobre quem anda enviando em nome do domínio.", "O começo seguro é \"v=DMARC1; p=none; rua=mailto:...\": não barra nada e já traz os relatórios."],
      pares: [["Onde fica", `um registro TXT em _dmarc.${dominio}`]]
    }));
  } else if (dmarcs.length > 1) {
    cartoes.push(cartao({
      titulo: "DMARC",
      tipo: "erro",
      situacao: "duplicado",
      paragrafos: [`Há ${dmarcs.length} registros DMARC. Com mais de um, os provedores ignoram todos — o efeito é o mesmo de não ter nenhum.`],
      pares: dmarcs.map((r, i) => [`Registro ${i + 1}`, r.valor])
    }));
  } else {
    const d = analisarDmarc(dmarcs[0].valor, dominio);
    cartoes.push(cartao({
      titulo: "DMARC — o que fazer com quem falhar",
      tipo: d.erros.length ? "erro" : d.avisos.length ? "aviso" : "ok",
      situacao: d.erros.length ? "com erro" : d.politica ? `política: ${d.politica}` : "publicado",
      paragrafos: [d.oQueFaz ? `O que ele pede a quem recebe: ${d.oQueFaz}.` : ""],
      pares: [
        ["Registro", dmarcs[0].valor],
        d.etiquetas.rua ? ["Relatórios para", d.etiquetas.rua] : null,
        d.etiquetas.sp ? ["Para subdomínios", d.etiquetas.sp] : null
      ].filter(Boolean),
      erros: d.erros,
      avisos: d.avisos
    }));
  }

  const comErro = cartoes.filter((c) => c.dataset.tipo === "erro").length;
  const resumo = comErro
    ? `${comErro} ${comErro === 1 ? "ponto" : "pontos"} para corrigir em ${dominio}.`
    : `Nada bloqueando o e-mail de ${dominio}.`;
  mostrar([veredito(resumo), ...cartoes]);
  estado("");
}

/* ---------------------------------------------------------------------
   Modo 3: consulta avulsa
   --------------------------------------------------------------------- */
async function consultaAvulsa(evento) {
  evento.preventDefault();
  const nome = normalizarNome($("nomeAvulsa").value);
  const tipo = $("tipoAvulsa").value;
  if (!nomeValido(nome)) {
    mostrar([]);
    estado("Escreva um nome, como www.exemplo.com.br.", "erro");
    $("nomeAvulsa").focus();
    return;
  }

  ocupado($("btnAvulsa"), true);
  estado(`Consultando ${tipo} de ${nome}…`);
  mostrar([]);
  const r = await consultar(nome, tipo);
  ocupado($("btnAvulsa"), false);

  if (r.situacao !== "ok") {
    mostrar([cartao({
      titulo: `${nome} — ${tipo}`,
      tipo: r.situacao === "erro" ? "erro" : "aviso",
      situacao: r.situacao === "inexistente" ? "nome não existe" : r.situacao === "vazio" ? "sem este registro" : "falha na consulta",
      paragrafos: [r.mensagem.charAt(0).toUpperCase() + r.mensagem.slice(1) + "."],
      pares: r.resolvedor ? [["Resolvedor", r.resolvedor]] : []
    })]);
    estado(r.mensagem, "erro");
    return;
  }

  const tabela = el("table", { classe: "tabela" }, [
    el("thead", {}, el("tr", {}, [el("th", { texto: "Valor" }), el("th", { texto: "TTL" })])),
    el("tbody", {}, r.registros.map((registro) => el("tr", {}, [
      el("td", { classe: "mono", texto: registro.valor }),
      el("td", { texto: `${registro.ttl}s` })
    ])))
  ]);

  mostrar([
    veredito(`${r.registros.length} ${r.registros.length === 1 ? "registro" : "registros"} ${tipo} em ${nome}.`),
    r.apelidos.length ? cartao({ titulo: "Este nome é um apelido (CNAME)", tipo: "aviso", paragrafos: ["A resposta veio do destino do apelido, não deste nome."], pares: r.apelidos.map((a) => [a.nome, `aponta para ${a.valor}`]) }) : null,
    el("div", { classe: "item", "data-tipo": "ok" }, [
      el("div", { classe: "item-topo" }, [el("span", { classe: "item-nome", texto: `${nome} — ${tipo}` }), selo(r.resolvedor, "neutro")]),
      el("div", { classe: "tabela-rolagem" }, tabela)
    ])
  ]);
  estado("");
}

/* ---------------------------------------------------------------------
   Troca de modo e início
   --------------------------------------------------------------------- */
function trocarModo(modo) {
  document.querySelectorAll("[data-modo]").forEach((botao) => botao.setAttribute("aria-pressed", String(botao.dataset.modo === modo)));
  document.querySelectorAll("[data-painel]").forEach((painel) => painel.classList.toggle("hidden", painel.dataset.painel !== modo));
  mostrar([]);
  estado("");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-modo]").forEach((botao) => botao.addEventListener("click", () => trocarModo(botao.dataset.modo)));
  $("formEsperados").addEventListener("submit", conferirEsperados);
  $("formEmail").addEventListener("submit", analisarEmail);
  $("formAvulsa").addEventListener("submit", consultaAvulsa);

  /* Exemplo com um domínio real de demonstração, mantido pela IANA
     justamente para isso: tem SPF e DMARC publicados de verdade. */
  $("btnExemploEmail").addEventListener("click", () => {
    $("dominioEmail").value = "example.com";
    $("seletores").value = "";
    $("formEmail").requestSubmit();
  });

  $("btnCopiarEsperados").addEventListener("click", async () => {
    if (!ultimoResultadoEmTexto) return;
    let copiou = true;
    try {
      await navigator.clipboard.writeText(ultimoResultadoEmTexto);
    } catch {
      copiou = false;
    }
    estado(copiou ? "Resultado copiado." : "Não foi possível copiar. Selecione o texto e use Ctrl+C.", copiou ? "ok" : "erro");
  });
});
