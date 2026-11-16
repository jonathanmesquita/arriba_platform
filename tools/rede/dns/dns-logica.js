/* =====================================================================
   Consulta e conferência de DNS — a parte que não depende de tela.

   A consulta sai do navegador por "DNS sobre HTTPS": dois resolvedores
   públicos respondem em JSON e aceitam chamada de qualquer site. Não há
   servidor do projeto no meio.

   Este arquivo não toca no DOM, para ter teste automático
   (scripts/tests/rede.test.mjs). Quem desenha a tela é o script.js.
   ===================================================================== */

export const TIPOS = { A: 1, NS: 2, CNAME: 5, SOA: 6, MX: 15, TXT: 16, AAAA: 28, CAA: 257 };
const NOME_DO_TIPO = Object.fromEntries(Object.entries(TIPOS).map(([nome, numero]) => [numero, nome]));

/* Os dois respondem no mesmo formato. O segundo só entra se o primeiro falhar. */
export const RESOLVEDORES = [
  { nome: "Google Public DNS", url: (nome, tipo) => `https://dns.google/resolve?name=${encodeURIComponent(nome)}&type=${tipo}` },
  { nome: "Cloudflare", url: (nome, tipo) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(nome)}&type=${tipo}`, cabecalhos: { accept: "application/dns-json" } }
];

/* ---------------------------------------------------------------------
   Nomes
   --------------------------------------------------------------------- */

/* Aceita o que a pessoa cola: com "https://", com caminho, com ponto no
   fim, em maiúsculas. Devolve só o nome, em minúsculas. */
export function normalizarNome(texto) {
  let nome = String(texto ?? "").trim().toLowerCase();
  nome = nome.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");   // protocolo
  nome = nome.replace(/[/?#].*$/, "");                  // caminho
  nome = nome.replace(/:\d+$/, "");                     // porta
  nome = nome.replace(/\.+$/, "");                      // ponto final do DNS
  return nome;
}

/* Sublinhado é permitido de propósito: "_dmarc" e "s1._domainkey" são
   nomes de DNS válidos, embora não sirvam como endereço de site. */
export function nomeValido(nome) {
  if (!nome || nome.length > 253 || !nome.includes(".")) return false;
  return nome.split(".").every((parte) => /^[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?$/.test(parte));
}

/* A zona mais provável de um nome: "em1.exemplo.com.br" -> "exemplo.com.br".
   É palpite (não consulta a lista pública de sufixos): serve só para
   detectar o erro de cadastro em que o painel repete o domínio. */
const SEGUNDO_NIVEL = new Set(["com", "net", "org", "gov", "edu", "co", "ind", "adv", "eng", "app", "art", "blog", "dev", "eco", "emp", "inf", "med", "mus", "nom", "ong", "psi", "srv", "tec", "tur", "jus", "leg", "mil", "mp"]);
export function zonaProvavel(nome) {
  const partes = normalizarNome(nome).split(".");
  if (partes.length <= 2) return partes.join(".");
  const [penultima, ultima] = partes.slice(-2);
  const tres = ultima.length === 2 && SEGUNDO_NIVEL.has(penultima);
  return partes.slice(tres ? -3 : -2).join(".");
}

/* ---------------------------------------------------------------------
   Resposta do resolvedor
   --------------------------------------------------------------------- */

/* TXT chega entre aspas, e registro longo vem partido em vários pedaços
   ("parte1" "parte2"): o valor de verdade é a junção deles. */
export function lerTxt(dado) {
  const texto = String(dado ?? "");
  const pedacos = [...texto.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
  return pedacos.length ? pedacos.join("") : texto;
}

const MENSAGEM_DO_CODIGO = {
  1: "o resolvedor não entendeu a consulta",
  2: "os servidores de nomes do domínio não responderam (SERVFAIL)",
  3: "o nome não existe (NXDOMAIN)",
  5: "a consulta foi recusada"
};

/* Traduz o JSON do resolvedor para o que a tela precisa. `situacao`:
   "ok" (há registro do tipo pedido), "vazio" (o nome existe, mas não tem
   esse tipo), "inexistente" (NXDOMAIN) ou "erro". */
export function interpretarResposta(json, nome, tipo) {
  const codigo = Number(json?.Status ?? -1);
  const numero = TIPOS[tipo];
  const todos = (json?.Answer || []).map((r) => {
    const tipoDoRegistro = NOME_DO_TIPO[r.type] || String(r.type);
    const bruto = String(r.data ?? "");
    return {
      nome: normalizarNome(r.name),
      tipo: tipoDoRegistro,
      ttl: Number(r.TTL ?? 0),
      valor: tipoDoRegistro === "TXT" ? lerTxt(bruto) : ["CNAME", "NS"].includes(tipoDoRegistro) ? normalizarNome(bruto) : bruto
    };
  });
  const registros = todos.filter((r) => r.tipo === tipo);
  /* Quando o nome é um apelido (CNAME), a resposta traz o apelido e, se
     existir, o que está no destino. Guardar a cadeia explica "achei, mas
     veio de outro nome". */
  const apelidos = tipo === "CNAME" ? [] : todos.filter((r) => r.tipo === "CNAME");

  let situacao = "ok";
  let mensagem = "";
  if (codigo === 3) { situacao = "inexistente"; mensagem = MENSAGEM_DO_CODIGO[3]; }
  else if (codigo !== 0) { situacao = "erro"; mensagem = MENSAGEM_DO_CODIGO[codigo] || `o resolvedor devolveu o código ${codigo}`; }
  else if (!registros.length) { situacao = "vazio"; mensagem = `o nome existe, mas não tem registro ${tipo}`; }

  return { nome: normalizarNome(nome), tipo, numero, codigo, situacao, mensagem, registros, apelidos };
}

/* Devolve a função de consulta. `buscar` é o fetch (injetado para o teste). */
export function criarConsulta(buscar, { tempoLimiteMs = 8000 } = {}) {
  return async function consultar(nomeBruto, tipo) {
    const nome = normalizarNome(nomeBruto);
    if (!TIPOS[tipo]) throw new Error(`Tipo de registro desconhecido: ${tipo}`);
    let ultimaFalha = "";
    for (const resolvedor of RESOLVEDORES) {
      const controle = typeof AbortController === "function" ? new AbortController() : null;
      const relogio = controle ? setTimeout(() => controle.abort(), tempoLimiteMs) : 0;
      try {
        const resposta = await buscar(resolvedor.url(nome, tipo), { headers: resolvedor.cabecalhos || {}, signal: controle?.signal });
        if (!resposta.ok) { ultimaFalha = `${resolvedor.nome} respondeu ${resposta.status}`; continue; }
        return { ...interpretarResposta(await resposta.json(), nome, tipo), resolvedor: resolvedor.nome };
      } catch (erro) {
        ultimaFalha = erro?.name === "AbortError" ? `${resolvedor.nome} não respondeu a tempo` : `não foi possível falar com ${resolvedor.nome}`;
      } finally {
        clearTimeout(relogio);
      }
    }
    return { nome, tipo, numero: TIPOS[tipo], codigo: -1, situacao: "erro", mensagem: `${ultimaFalha}. Confira a sua conexão ou se há bloqueio de rede.`, registros: [], apelidos: [], resolvedor: "" };
  };
}

/* ---------------------------------------------------------------------
   Registros de e-mail: SPF, DKIM e DMARC
   --------------------------------------------------------------------- */

/* "a=1; b=2" -> [["a","1"],["b","2"]], na ordem, sem perder repetidos. */
function lerEtiquetas(texto) {
  return String(texto).split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
    const i = p.indexOf("=");
    return i < 0 ? [p.toLowerCase(), null] : [p.slice(0, i).trim().toLowerCase(), p.slice(i + 1).trim()];
  });
}

const EMAIL = /^[^\s@,!]+@[^\s@,!]+\.[^\s@,!]+$/;

export function analisarDmarc(texto, dominio = "") {
  const erros = [];
  const avisos = [];
  const pares = lerEtiquetas(texto);
  const etiquetas = {};
  for (const [nome, valor] of pares) {
    if (valor === null) { erros.push(`"${nome}" está sem o sinal de igual.`); continue; }
    if (nome in etiquetas) erros.push(`A etiqueta "${nome}" aparece mais de uma vez.`);
    etiquetas[nome] = valor;
  }

  if (!pares.length || pares[0][0] !== "v" || String(pares[0][1]).toUpperCase() !== "DMARC1") {
    erros.push('O registro precisa começar com "v=DMARC1".');
  }
  const politicas = ["none", "quarantine", "reject"];
  if (!("p" in etiquetas)) erros.push('Falta a política: "p=none", "p=quarantine" ou "p=reject".');
  else if (!politicas.includes(etiquetas.p.toLowerCase())) erros.push(`Política desconhecida: "p=${etiquetas.p}". Use none, quarantine ou reject.`);
  else if (pares[1]?.[0] !== "p") avisos.push('A política "p=" deveria vir logo depois de "v=DMARC1". A maioria dos provedores aceita fora de ordem, mas a norma pede assim.');
  if ("sp" in etiquetas && !politicas.includes(etiquetas.sp.toLowerCase())) erros.push(`Política de subdomínio desconhecida: "sp=${etiquetas.sp}".`);

  for (const etiqueta of ["rua", "ruf"]) {
    if (!(etiqueta in etiquetas)) continue;
    for (const destino of etiquetas[etiqueta].split(",").map((d) => d.trim()).filter(Boolean)) {
      if (!/^mailto:/i.test(destino)) { erros.push(`Em "${etiqueta}", o endereço precisa começar com "mailto:" — veio "${destino}".`); continue; }
      const email = destino.replace(/^mailto:/i, "").replace(/!\d+[kmgt]?$/i, "");
      if (!EMAIL.test(email)) { erros.push(`Em "${etiqueta}", "${email}" não é um e-mail válido.`); continue; }
      const dominioDoRelatorio = email.split("@")[1].toLowerCase();
      const base = normalizarNome(dominio).replace(/^_dmarc\./, "");
      if (base && dominioDoRelatorio !== base && !dominioDoRelatorio.endsWith(`.${base}`) && !base.endsWith(`.${dominioDoRelatorio}`)) {
        avisos.push(`Os relatórios de "${etiqueta}" vão para outro domínio (${dominioDoRelatorio}). Ele precisa autorizar isso com um registro TXT "v=DMARC1" em ${base}._report._dmarc.${dominioDoRelatorio}, senão os provedores não enviam.`);
      }
    }
  }
  for (const etiqueta of ["adkim", "aspf"]) {
    if (etiqueta in etiquetas && !["r", "s"].includes(etiquetas[etiqueta].toLowerCase())) erros.push(`"${etiqueta}" aceita só "r" (flexível) ou "s" (exato) — veio "${etiquetas[etiqueta]}".`);
  }
  if ("pct" in etiquetas) {
    const pct = Number(etiquetas.pct);
    if (!/^\d+$/.test(etiquetas.pct) || pct > 100) erros.push(`"pct" precisa ser um número de 0 a 100 — veio "${etiquetas.pct}".`);
    else if (pct < 100) avisos.push(`A política vale para só ${pct}% das mensagens ("pct=${pct}").`);
  }
  if ("ri" in etiquetas && !/^\d+$/.test(etiquetas.ri)) erros.push(`"ri" precisa ser um número de segundos — veio "${etiquetas.ri}".`);
  if ("fo" in etiquetas && !etiquetas.fo.split(":").every((o) => ["0", "1", "d", "s"].includes(o.trim().toLowerCase()))) erros.push(`"fo" aceita 0, 1, d ou s — veio "${etiquetas.fo}".`);
  const conhecidas = ["v", "p", "sp", "rua", "ruf", "adkim", "aspf", "pct", "fo", "rf", "ri", "np", "psd", "t"];
  for (const nome of Object.keys(etiquetas)) if (!conhecidas.includes(nome)) avisos.push(`Etiqueta desconhecida: "${nome}". Os provedores a ignoram.`);

  const politica = politicas.includes(etiquetas.p?.toLowerCase()) ? etiquetas.p.toLowerCase() : "";
  if (politica === "none") avisos.push('Com "p=none" o domínio só recebe relatórios: mensagem falsificada continua sendo entregue.');
  if (politica && !("rua" in etiquetas)) avisos.push('Sem "rua=" ninguém recebe os relatórios, e não dá para saber quem está enviando em nome do domínio.');
  if ("ruf" in etiquetas) avisos.push('Poucos provedores enviam os relatórios de "ruf" (falha por mensagem); o que chega de verdade são os de "rua".');

  const oQueFaz = { none: "só monitora, sem barrar nada", quarantine: "manda para o spam o que falhar na autenticação", reject: "recusa o que falhar na autenticação" }[politica] || "";
  return { valido: erros.length === 0, etiquetas, politica, oQueFaz, erros, avisos };
}

/* Termos do SPF que custam uma consulta de DNS a quem recebe o e-mail.
   A norma limita a 10; passou disso, o SPF inteiro falha. */
const TERMOS_COM_CONSULTA = ["include", "a", "mx", "ptr", "exists", "redirect"];

export function analisarSpf(texto) {
  const erros = [];
  const avisos = [];
  const termos = String(texto).trim().split(/\s+/);
  if ((termos[0] || "").toLowerCase() !== "v=spf1") erros.push('O registro precisa começar com "v=spf1".');

  let consultas = 0;
  let final = "";
  const quemEnvia = [];
  for (const termo of termos.slice(1)) {
    const m = /^([+\-~?])?([a-z0-9]+)(?:([:=/])(.*))?$/i.exec(termo);
    if (!m) { erros.push(`Não entendi o termo "${termo}".`); continue; }
    const [, qualificador = "+", nomeBruto, separador, valor = ""] = m;
    const nome = nomeBruto.toLowerCase();
    if (TERMOS_COM_CONSULTA.includes(nome)) consultas += 1;

    if (nome === "all") { final = `${qualificador}all`; continue; }
    if (nome === "include" || nome === "redirect" || nome === "exists") {
      if (!valor) erros.push(`"${nome}" está sem o domínio.`);
      else if (nome === "include") quemEnvia.push(valor);
      if (nome === "redirect") final = final || "redirect";
      continue;
    }
    if (nome === "ip4") {
      const [ip, mascara] = valor.split("/");
      const partes = ip.split(".");
      if (partes.length !== 4 || !partes.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255) || (mascara !== undefined && !(Number(mascara) >= 0 && Number(mascara) <= 32))) erros.push(`Endereço IPv4 inválido em "${termo}".`);
      else quemEnvia.push(valor);
      continue;
    }
    if (nome === "ip6") { if (!valor.includes(":")) erros.push(`Endereço IPv6 inválido em "${termo}".`); else quemEnvia.push(valor); continue; }
    if (nome === "ptr") { avisos.push('"ptr" é desaconselhado pela norma: é lento e muitos provedores ignoram.'); continue; }
    if (nome === "a" || nome === "mx" || nome === "exp") continue;
    if (separador === "=") continue;   // modificador desconhecido: a norma manda ignorar
    erros.push(`Mecanismo desconhecido: "${termo}".`);
  }

  if (consultas > 10) erros.push(`O registro pede ${consultas} consultas de DNS e o limite é 10: quem recebe o e-mail trata o SPF como falho.`);
  else if (consultas >= 8) avisos.push(`O registro já pede ${consultas} das 10 consultas de DNS permitidas (sem contar as de dentro de cada "include").`);
  if (final === "+all") erros.push('"+all" autoriza qualquer servidor do mundo a enviar pelo domínio. Use "~all" ou "-all".');
  else if (!final) avisos.push('Falta o "all" no fim ("~all" ou "-all"): sem ele, o que não estiver na lista fica sem definição.');
  else if (final === "?all") avisos.push('"?all" não diz nada sobre quem não está na lista. O usual é "~all" ou "-all".');

  const oQueFaz = { "-all": "recusa quem não está na lista", "~all": "marca como suspeito quem não está na lista", "?all": "não opina sobre quem não está na lista", "+all": "aceita qualquer servidor", redirect: "usa a política de outro domínio" }[final] || "";
  return { valido: erros.length === 0, final, oQueFaz, consultas, quemEnvia, erros, avisos };
}

export function analisarDkim(texto) {
  const erros = [];
  const avisos = [];
  const etiquetas = Object.fromEntries(lerEtiquetas(texto).filter(([, v]) => v !== null));
  if ("v" in etiquetas && etiquetas.v.toUpperCase() !== "DKIM1") erros.push(`Versão inesperada: "v=${etiquetas.v}". O esperado é "v=DKIM1".`);
  if (!("p" in etiquetas)) erros.push('Falta a chave pública ("p=").');
  else if (etiquetas.p === "") erros.push('A chave está vazia ("p="): isso significa chave revogada.');

  const tipoDeChave = (etiquetas.k || "rsa").toLowerCase();
  let bits = 0;
  const chave = (etiquetas.p || "").replace(/\s+/g, "");
  if (chave && !/^[A-Za-z0-9+/]+={0,2}$/.test(chave)) erros.push("A chave pública tem caractere que não é de Base64 — costuma ser registro cortado ao colar.");
  else if (chave && tipoDeChave === "rsa") {
    /* Tamanho da chave pelo tamanho do registro: uma chave RSA de 1024
       bits ocupa cerca de 162 bytes; de 2048, 294; de 4096, 550. */
    const bytes = Math.floor(chave.length * 3 / 4) - (chave.endsWith("==") ? 2 : chave.endsWith("=") ? 1 : 0);
    bits = bytes < 130 ? 512 : bytes < 230 ? 1024 : bytes < 420 ? 2048 : 4096;
    if (bits < 1024) erros.push("A chave tem menos de 1024 bits: os provedores não aceitam.");
    else if (bits === 1024) avisos.push("A chave é de 1024 bits. Funciona, mas o recomendado hoje é 2048.");
  }
  return { valido: erros.length === 0, tipoDeChave, bits, etiquetas, erros, avisos };
}

/* ---------------------------------------------------------------------
   Conferir registros esperados (o que o provedor mandou cadastrar)
   --------------------------------------------------------------------- */

const IPV4 = /^(\d{1,3})(\.\d{1,3}){3}$/;

export function inferirTipo(valor) {
  const v = String(valor).trim();
  if (IPV4.test(v)) return "A";
  if (/^[0-9a-f:]+$/i.test(v) && v.includes(":")) return "AAAA";
  if (/^\d+\s+\S+$/.test(v) && nomeValido(normalizarNome(v.split(/\s+/)[1]))) return "MX";
  if (!/[\s=;"]/.test(v) && nomeValido(normalizarNome(v))) return "CNAME";
  return "TXT";
}

/* Aceita os dois jeitos de colar:
     - uma linha por registro: "nome   valor" (espaço, tab, "->" ou "=>");
     - dois blocos separados por linha em branco: primeiro os nomes, depois
       os valores, na mesma ordem — é como os painéis de e-mail costumam
       mostrar e como a pessoa copia.
   Devolve { registros: [{ nome, valor, tipo }], erros: [] }. */
export function lerEsperados(texto) {
  const blocos = String(texto ?? "").replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean)).filter((b) => b.length);
  const erros = [];
  let pares = [];

  const soNomes = (bloco) => bloco.every((linha) => !/\s/.test(linha) && nomeValido(normalizarNome(linha)));
  if (blocos.length === 2 && soNomes(blocos[0]) && blocos[0].length === blocos[1].length) {
    pares = blocos[0].map((nome, i) => [nome, blocos[1][i]]);
  } else if (blocos.length === 2 && soNomes(blocos[0])) {
    erros.push(`O primeiro bloco tem ${blocos[0].length} nome(s) e o segundo tem ${blocos[1].length} valor(es). Precisam ser a mesma quantidade, na mesma ordem.`);
  } else {
    for (const linha of blocos.flat()) {
      const m = /^(\S+?)\s*(?:->|=>|\t|\s)\s*(.+)$/.exec(linha);
      if (!m) { erros.push(`Não achei o valor esperado nesta linha: "${linha}". Escreva o nome, um espaço e o valor.`); continue; }
      pares.push([m[1], m[2]]);
    }
  }

  const registros = [];
  for (const [nomeBruto, valorBruto] of pares) {
    const nome = normalizarNome(nomeBruto);
    if (!nomeValido(nome)) { erros.push(`"${nomeBruto}" não é um nome de DNS válido.`); continue; }
    const valor = valorBruto.trim().replace(/^"(.*)"$/, "$1");
    registros.push({ nome, valor, tipo: inferirTipo(valor) });
  }
  return { registros, erros };
}

/* Deixa dois TXT comparáveis: espaço em volta de ";" e ponto e vírgula no
   fim não mudam o significado. */
export function normalizarTxt(texto) {
  return lerTxt(texto).trim().replace(/\s*;\s*/g, ";").replace(/;+$/, "").replace(/\s+/g, " ").toLowerCase();
}

export function valoresIguais(tipo, esperado, encontrado) {
  if (tipo === "TXT") return normalizarTxt(esperado) === normalizarTxt(encontrado);
  if (tipo === "MX") {
    const ler = (v) => { const [p, alvo] = String(v).trim().split(/\s+/); return `${Number(p)} ${normalizarNome(alvo)}`; };
    return ler(esperado) === ler(encontrado);
  }
  if (tipo === "AAAA") return String(esperado).trim().toLowerCase() === String(encontrado).trim().toLowerCase();
  return normalizarNome(esperado) === normalizarNome(encontrado);
}

/* Confere um registro esperado. `consultar` vem de criarConsulta().
   Devolve { situacao: "ok" | "diferente" | "ausente" | "erro", encontrados,
   explicacao, dica }. */
export async function conferirRegistro(esperado, consultar) {
  const resposta = await consultar(esperado.nome, esperado.tipo);
  const base = { ...esperado, resolvedor: resposta.resolvedor, encontrados: resposta.registros.map((r) => r.valor) };

  if (resposta.situacao === "erro") return { ...base, situacao: "erro", explicacao: `Não deu para consultar: ${resposta.mensagem}.`, dica: "" };

  if (resposta.registros.some((r) => valoresIguais(esperado.tipo, esperado.valor, r.valor))) {
    const sobra = esperado.tipo === "TXT" && /^v=dmarc1/i.test(esperado.valor) && resposta.registros.filter((r) => /^v=dmarc1/i.test(r.valor)).length > 1;
    return sobra
      ? { ...base, situacao: "diferente", explicacao: "O registro esperado está lá, mas há mais de um DMARC neste nome. Com dois, os provedores ignoram os dois.", dica: "Apague o registro DMARC que sobra." }
      : { ...base, situacao: "ok", explicacao: "Publicado como esperado.", dica: "" };
  }

  if (resposta.registros.length) {
    return { ...base, situacao: "diferente", explicacao: `Existe registro ${esperado.tipo} neste nome, mas com outro valor.`, dica: esperado.tipo === "CNAME" ? "Confira se o destino foi colado inteiro e sem o domínio repetido no fim." : "Compare os dois textos: costuma ser um trecho a mais, a menos ou aspas sobrando." };
  }

  /* Não achou. Antes de dizer "não existe", tenta os dois enganos mais
     comuns de cadastro. */
  const zona = zonaProvavel(esperado.nome);
  if (esperado.nome !== zona) {
    const repetido = await consultar(`${esperado.nome}.${zona}`, esperado.tipo);
    if (repetido.registros.some((r) => valoresIguais(esperado.tipo, esperado.valor, r.valor))) {
      return { ...base, situacao: "diferente", encontrados: [], explicacao: `O registro foi criado com o domínio repetido: está em ${esperado.nome}.${zona}.`, dica: `No painel de DNS, o campo de nome já acrescenta "${zona}" sozinho. Cadastre só "${esperado.nome.slice(0, -zona.length - 1)}".` };
    }
  }
  if (esperado.tipo === "CNAME") {
    const comoTxt = await consultar(esperado.nome, "TXT");
    if (comoTxt.registros.length) return { ...base, situacao: "diferente", encontrados: comoTxt.registros.map((r) => r.valor), explicacao: "O nome existe, mas como TXT, não como CNAME.", dica: "Apague o TXT e crie um registro do tipo CNAME com o destino esperado." };
  }
  const motivo = resposta.situacao === "inexistente" ? "O nome não existe no DNS." : `O nome existe, mas não tem registro ${esperado.tipo}.`;
  return { ...base, situacao: "ausente", explicacao: motivo, dica: "Se acabou de cadastrar, a propagação pode levar de minutos a algumas horas. Se já faz tempo, confira o nome e, em painéis com proxy, deixe este registro como \"somente DNS\"." };
}
