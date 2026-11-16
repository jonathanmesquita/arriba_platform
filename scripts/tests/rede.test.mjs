/* Ferramentas de rede: a lógica de DNS (tools/rede/dns/dns-logica.js) e a
   detecção de navegador e sistema (tools/rede/meu-dispositivo/detectar.js).
   Nenhum teste sai para a rede: o resolvedor é simulado. Os domínios são
   os reservados para documentação (exemplo.com.br não existe de verdade). */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analisarDkim, analisarDmarc, analisarSpf, conferirRegistro, criarConsulta, inferirTipo,
  interpretarResposta, lerEsperados, lerTxt, nomeValido, normalizarNome, normalizarTxt, valoresIguais, zonaProvavel
} from "../../tools/rede/dns/dns-logica.js";
import { detectarNavegador, detectarSistema, ipValido, montarResumo } from "../../tools/rede/meu-dispositivo/detectar.js";

/* ------------------------------------------------------------------ */
/* Resolvedor simulado: um mapa "nome|TIPO" -> lista de respostas.     */
/* ------------------------------------------------------------------ */
const NUMERO = { A: 1, CNAME: 5, MX: 15, TXT: 16, AAAA: 28 };
function resolvedorDeMentira(zona, { falhar = [] } = {}) {
  const chamadas = [];
  const buscar = async (url) => {
    chamadas.push(url);
    if (falhar.some((trecho) => url.includes(trecho))) throw new TypeError("rede");
    const u = new URL(url);
    const nome = u.searchParams.get("name");
    const tipo = u.searchParams.get("type");
    const respostas = zona[`${nome}|${tipo}`];
    const existe = Object.keys(zona).some((chave) => chave.startsWith(`${nome}|`));
    const corpo = respostas
      ? { Status: 0, Answer: respostas.map((r) => ({ name: `${nome}.`, type: NUMERO[r.tipo || tipo], TTL: 300, data: r.dado ?? r })) }
      : { Status: existe ? 0 : 3 };
    return { ok: true, status: 200, json: async () => corpo };
  };
  return { consultar: criarConsulta(buscar), chamadas };
}

test("nome de DNS: limpa o que a pessoa cola e aceita sublinhado", () => {
  assert.equal(normalizarNome("  HTTPS://Exemplo.com.br/caminho?x=1 "), "exemplo.com.br");
  assert.equal(normalizarNome("exemplo.com.br."), "exemplo.com.br");
  assert.equal(normalizarNome("exemplo.com.br:8080"), "exemplo.com.br");
  assert.equal(nomeValido("_dmarc.exemplo.com.br"), true);
  assert.equal(nomeValido("s1._domainkey.exemplo.com.br"), true);
  assert.equal(nomeValido("exemplo"), false);
  assert.equal(nomeValido("exem plo.com"), false);
  assert.equal(nomeValido("-exemplo.com"), false);
});

test("zona provável: três partes em .com.br, duas em .com", () => {
  assert.equal(zonaProvavel("em1.exemplo.com.br"), "exemplo.com.br");
  assert.equal(zonaProvavel("s1._domainkey.exemplo.com.br"), "exemplo.com.br");
  assert.equal(zonaProvavel("mail.exemplo.com"), "exemplo.com");
  assert.equal(zonaProvavel("exemplo.com.br"), "exemplo.com.br");
});

test("TXT: tira as aspas e junta registro partido em pedaços", () => {
  assert.equal(lerTxt('"v=spf1 -all"'), "v=spf1 -all");
  assert.equal(lerTxt('"v=DKIM1; k=rsa; p=AAAA" "BBBB"'), "v=DKIM1; k=rsa; p=AAAABBBB");
  assert.equal(lerTxt("v=spf1 -all"), "v=spf1 -all");
  assert.equal(lerTxt('"com \\"aspas\\" dentro"'), 'com "aspas" dentro');
});

test("resposta do resolvedor: achou, vazio, inexistente e erro", () => {
  const achou = interpretarResposta({ Status: 0, Answer: [{ name: "em1.exemplo.com.br.", type: 5, TTL: 60, data: "u1.wl.envio.exemplo.net." }] }, "em1.exemplo.com.br", "CNAME");
  assert.equal(achou.situacao, "ok");
  assert.deepEqual(achou.registros, [{ nome: "em1.exemplo.com.br", tipo: "CNAME", ttl: 60, valor: "u1.wl.envio.exemplo.net" }]);

  assert.equal(interpretarResposta({ Status: 0 }, "exemplo.com.br", "MX").situacao, "vazio");
  assert.equal(interpretarResposta({ Status: 3 }, "nao-existe.exemplo.com.br", "A").situacao, "inexistente");
  assert.equal(interpretarResposta({ Status: 2 }, "exemplo.com.br", "A").situacao, "erro");

  // Pediu TXT e o nome é um apelido: a cadeia fica guardada à parte.
  const viaApelido = interpretarResposta({ Status: 0, Answer: [
    { name: "s1._domainkey.exemplo.com.br.", type: 5, TTL: 60, data: "s1.chave.exemplo.net." },
    { name: "s1.chave.exemplo.net.", type: 16, TTL: 60, data: '"k=rsa; p=AAAA"' }
  ] }, "s1._domainkey.exemplo.com.br", "TXT");
  assert.equal(viaApelido.registros.length, 1);
  assert.equal(viaApelido.apelidos[0].valor, "s1.chave.exemplo.net");
});

test("consulta: usa o segundo resolvedor quando o primeiro falha", async () => {
  const { consultar, chamadas } = resolvedorDeMentira({ "exemplo.com.br|A": ["192.0.2.10"] }, { falhar: ["dns.google"] });
  const r = await consultar("Exemplo.com.br.", "A");
  assert.equal(r.situacao, "ok");
  assert.equal(r.resolvedor, "Cloudflare");
  assert.equal(chamadas.length, 2);

  const semRede = resolvedorDeMentira({}, { falhar: ["dns.google", "cloudflare"] });
  const falha = await semRede.consultar("exemplo.com.br", "A");
  assert.equal(falha.situacao, "erro");
  assert.match(falha.mensagem, /conexão/);
});

test("DMARC: registro bom, com os avisos que cabem", () => {
  const r = analisarDmarc("v=DMARC1; p=quarantine; ruf=mailto:ti@exemplo.com.br; rua=mailto:ti@exemplo.com.br", "_dmarc.exemplo.com.br");
  assert.equal(r.valido, true);
  assert.equal(r.politica, "quarantine");
  assert.match(r.oQueFaz, /spam/);
  assert.equal(r.erros.length, 0);
  assert.equal(r.avisos.length, 1);          // só o de "ruf"
  assert.match(r.avisos[0], /ruf/);
});

test("DMARC: erros que os provedores não perdoam", () => {
  assert.match(analisarDmarc("p=reject; v=DMARC1").erros[0], /começar com "v=DMARC1"/);
  assert.match(analisarDmarc("v=DMARC1; rua=mailto:a@exemplo.com.br").erros[0], /Falta a política/);
  assert.match(analisarDmarc("v=DMARC1; p=bloquear").erros[0], /Política desconhecida/);
  assert.match(analisarDmarc("v=DMARC1; p=none; rua=ti@exemplo.com.br").erros[0], /mailto:/);
  assert.match(analisarDmarc("v=DMARC1; p=none; pct=150").erros[0], /0 a 100/);
  assert.match(analisarDmarc("v=DMARC1; p=none; adkim=x").erros[0], /adkim/);
  assert.match(analisarDmarc("v=DMARC1; p=none; p=reject").erros[0], /mais de uma vez/);
});

test("DMARC: avisos — só monitora, sem relatório, relatório em outro domínio", () => {
  const soMonitora = analisarDmarc("v=DMARC1; p=none");
  assert.equal(soMonitora.valido, true);
  assert.ok(soMonitora.avisos.some((a) => /só recebe relatórios/.test(a)));
  assert.ok(soMonitora.avisos.some((a) => /Sem "rua="/.test(a)));

  const fora = analisarDmarc("v=DMARC1; p=reject; rua=mailto:relatorios@outro-exemplo.net", "exemplo.com.br");
  assert.ok(fora.avisos.some((a) => /exemplo\.com\.br\._report\._dmarc\.outro-exemplo\.net/.test(a)));

  assert.ok(analisarDmarc("v=DMARC1; rua=mailto:a@exemplo.com.br; p=reject").avisos.some((a) => /logo depois/.test(a)));
});

test("SPF: leitura, limite de consultas e os finais perigosos", () => {
  const bom = analisarSpf("v=spf1 include:_spf.exemplo.net ip4:192.0.2.0/24 ~all");
  assert.equal(bom.valido, true);
  assert.equal(bom.final, "~all");
  assert.equal(bom.consultas, 1);
  assert.deepEqual(bom.quemEnvia, ["_spf.exemplo.net", "192.0.2.0/24"]);

  assert.match(analisarSpf("spf1 -all").erros[0], /começar com "v=spf1"/);
  assert.match(analisarSpf("v=spf1 +all").erros[0], /qualquer servidor/);
  assert.match(analisarSpf("v=spf1 ip4:999.1.1.1 -all").erros[0], /IPv4 inválido/);
  assert.ok(analisarSpf("v=spf1 include:a.exemplo.net").avisos.some((a) => /Falta o "all"/.test(a)));

  const muitos = analisarSpf(`v=spf1 ${Array.from({ length: 11 }, (_, i) => `include:s${i}.exemplo.net`).join(" ")} -all`);
  assert.equal(muitos.valido, false);
  assert.match(muitos.erros[0], /limite é 10/);
});

test("DKIM: chave presente, revogada, cortada e tamanho estimado", () => {
  const chave2048 = "A".repeat(392);
  const boa = analisarDkim(`v=DKIM1; k=rsa; p=${chave2048}`);
  assert.equal(boa.valido, true);
  assert.equal(boa.bits, 2048);

  const fraca = analisarDkim(`k=rsa; p=${"A".repeat(216)}`);
  assert.equal(fraca.bits, 1024);
  assert.ok(fraca.avisos.some((a) => /1024/.test(a)));

  assert.match(analisarDkim("v=DKIM1; p=").erros[0], /revogada/);
  assert.match(analisarDkim("v=DKIM1; k=rsa").erros[0], /Falta a chave/);
  assert.match(analisarDkim("v=DKIM1; p=AAA*BBB").erros[0], /Base64/);
});

test("tipo do registro pelo valor esperado", () => {
  assert.equal(inferirTipo("u1.wl.envio.exemplo.net"), "CNAME");
  assert.equal(inferirTipo("192.0.2.10"), "A");
  assert.equal(inferirTipo("2001:db8::1"), "AAAA");
  assert.equal(inferirTipo("10 mx.exemplo.net"), "MX");
  assert.equal(inferirTipo("v=DMARC1; p=none"), "TXT");
  assert.equal(inferirTipo("v=spf1 -all"), "TXT");
});

test("registros esperados: dois blocos (nomes e valores) ou uma linha por registro", () => {
  const emBlocos = lerEsperados([
    "em1.exemplo.com.br", "s1._domainkey.exemplo.com.br", "_dmarc.exemplo.com.br", " ",
    "u1.wl.envio.exemplo.net", "s1.domainkey.u1.wl.envio.exemplo.net", "v=DMARC1; p=quarantine; rua=mailto:ti@exemplo.com.br"
  ].join("\n"));
  assert.equal(emBlocos.erros.length, 0);
  assert.deepEqual(emBlocos.registros.map((r) => r.tipo), ["CNAME", "CNAME", "TXT"]);
  assert.equal(emBlocos.registros[2].nome, "_dmarc.exemplo.com.br");
  assert.match(emBlocos.registros[2].valor, /^v=DMARC1/);

  const emLinhas = lerEsperados('em1.exemplo.com.br -> u1.wl.envio.exemplo.net\n_dmarc.exemplo.com.br\t"v=DMARC1; p=none"\nexemplo.com.br 192.0.2.10');
  assert.deepEqual(emLinhas.registros.map((r) => [r.tipo, r.valor]), [["CNAME", "u1.wl.envio.exemplo.net"], ["TXT", "v=DMARC1; p=none"], ["A", "192.0.2.10"]]);

  assert.match(lerEsperados("a.exemplo.com.br\nb.exemplo.com.br\n\nx.exemplo.net").erros[0], /mesma quantidade/);
  assert.match(lerEsperados("so-um-nome.exemplo.com.br").erros[0], /Não achei o valor/);
});

test("comparação: o que muda e o que não muda o significado", () => {
  assert.equal(valoresIguais("CNAME", "U1.WL.Envio.exemplo.net.", "u1.wl.envio.exemplo.net"), true);
  assert.equal(valoresIguais("TXT", "v=DMARC1; p=none;", '"v=DMARC1;p=none"'), true);
  assert.equal(valoresIguais("TXT", "v=DMARC1; p=none", "v=DMARC1; p=reject"), false);
  assert.equal(valoresIguais("MX", "10 mx.exemplo.net", "10 MX.exemplo.net."), true);
  assert.equal(normalizarTxt('"v=spf1   -all"'), "v=spf1 -all");
});

test("conferir registro: publicado, diferente, ausente e os enganos de cadastro", async () => {
  const zona = {
    "em1.exemplo.com.br|CNAME": ["u1.wl.envio.exemplo.net."],
    "em2.exemplo.com.br|CNAME": ["outro.destino.exemplo.net."],
    "_dmarc.exemplo.com.br|TXT": ['"v=DMARC1; p=quarantine; rua=mailto:ti@exemplo.com.br"'],
    // cadastrado com o domínio repetido
    "em3.exemplo.com.br.exemplo.com.br|CNAME": ["u1.wl.envio.exemplo.net."],
    // criado como TXT em vez de CNAME
    "em4.exemplo.com.br|TXT": ['"u1.wl.envio.exemplo.net"'],
    "duplo.exemplo.com.br|TXT": ['"v=DMARC1; p=none"', '"v=DMARC1; p=reject"']
  };
  const { consultar } = resolvedorDeMentira(zona);
  const conferir = (nome, valor, tipo = inferirTipo(valor)) => conferirRegistro({ nome, valor, tipo }, consultar);

  assert.equal((await conferir("em1.exemplo.com.br", "u1.wl.envio.exemplo.net")).situacao, "ok");
  assert.equal((await conferir("_dmarc.exemplo.com.br", "v=DMARC1;p=quarantine;rua=mailto:ti@exemplo.com.br")).situacao, "ok");

  const diferente = await conferir("em2.exemplo.com.br", "u1.wl.envio.exemplo.net");
  assert.equal(diferente.situacao, "diferente");
  assert.deepEqual(diferente.encontrados, ["outro.destino.exemplo.net"]);

  const repetido = await conferir("em3.exemplo.com.br", "u1.wl.envio.exemplo.net");
  assert.equal(repetido.situacao, "diferente");
  assert.match(repetido.explicacao, /domínio repetido/);
  assert.match(repetido.dica, /Cadastre só "em3"/);

  const tipoErrado = await conferir("em4.exemplo.com.br", "u1.wl.envio.exemplo.net");
  assert.match(tipoErrado.explicacao, /como TXT, não como CNAME/);

  const ausente = await conferir("em9.exemplo.com.br", "u1.wl.envio.exemplo.net");
  assert.equal(ausente.situacao, "ausente");
  assert.match(ausente.explicacao, /não existe/);

  const doisDmarc = await conferir("duplo.exemplo.com.br", "v=DMARC1; p=none");
  assert.equal(doisDmarc.situacao, "diferente");
  assert.match(doisDmarc.explicacao, /mais de um DMARC/);

  const semRede = resolvedorDeMentira({}, { falhar: ["dns.google", "cloudflare"] });
  assert.equal((await conferirRegistro({ nome: "em1.exemplo.com.br", valor: "x.exemplo.net", tipo: "CNAME" }, semRede.consultar)).situacao, "erro");
});

/* ------------------------------------------------------------------ */
/* Navegador e sistema                                                 */
/* ------------------------------------------------------------------ */
const UA = {
  chromeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  edgeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  operaWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/114.0.0.0",
  firefoxLinux: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
  safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  samsung: "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  firefoxAndroidTablet: "Mozilla/5.0 (Android 14; Tablet; rv:131.0) Gecko/131.0 Firefox/131.0",
  ie11: "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko"
};

test("navegador: do mais específico para o mais geral", () => {
  const n = (ua, marcas) => { const r = detectarNavegador(ua, marcas); return `${r.nome} ${r.versao} (${r.motor})`; };
  assert.equal(n(UA.chromeWin), "Google Chrome 130.0.0.0 (Blink)");
  assert.equal(n(UA.edgeWin), "Microsoft Edge 130.0.0.0 (Blink)");      // tem "Chrome" no texto, mas é Edge
  assert.equal(n(UA.operaWin), "Opera 114.0.0.0 (Blink)");
  assert.equal(n(UA.firefoxLinux), "Firefox 131.0 (Gecko)");
  assert.equal(n(UA.safariMac), "Safari 17.6 (WebKit)");
  assert.equal(n(UA.chromeIphone), "Google Chrome 130.0.6723.90 (WebKit)");  // no iPhone, tudo é WebKit
  assert.equal(n(UA.samsung), "Samsung Internet 26.0 (Blink)");
  assert.equal(n(UA.ie11), "Internet Explorer 11.0 (Trident)");
  assert.equal(n("qualquer coisa"), "Não identificado  ()");
});

test("navegador: as marcas do Client Hints ganham do texto, e a marca falsa é ignorada", () => {
  const marcas = [{ brand: "Not?A_Brand", version: "99.0.0.0" }, { brand: "Chromium", version: "130.0.6723.70" }, { brand: "Brave", version: "130.1.71.118" }];
  const r = detectarNavegador(UA.chromeWin, marcas);
  assert.equal(r.nome, "Brave");
  assert.equal(r.versao, "130.1.71.118");
  assert.equal(r.origem, "client-hints");
});

test("sistema: Windows 10 e 11 só se distinguem pelo Client Hints", () => {
  const semDica = detectarSistema(UA.chromeWin);
  assert.equal(semDica.nome, "Windows");
  assert.equal(semDica.versao, "10 ou 11");
  assert.match(semDica.observacao, /não informa/);
  assert.equal(semDica.arquitetura, "x86 (Intel ou AMD), 64 bits");
  assert.equal(semDica.dispositivo, "Computador");

  assert.equal(detectarSistema(UA.chromeWin, { platform: "Windows", platformVersion: "15.0.0", architecture: "x86", bitness: "64" }).versao, "11");
  assert.equal(detectarSistema(UA.chromeWin, { platform: "Windows", platformVersion: "10.0.0" }).versao, "10");
  assert.equal(detectarSistema(UA.ie11).versao, "7");
  assert.match(detectarSistema(UA.ie11).arquitetura, /32 bits/);
});

test("sistema: versões congeladas não são repetidas como verdade", () => {
  const android = detectarSistema(UA.chromeAndroid);
  assert.equal(android.nome, "Android");
  assert.equal(android.versao, "");
  assert.match(android.observacao, /Android 10/);
  assert.equal(android.dispositivo, "Celular");
  assert.equal(detectarSistema(UA.chromeAndroid, { platform: "Android", platformVersion: "14.0.0", mobile: true, model: "Pixel 8" }).versao, "14");
  assert.equal(detectarSistema(UA.samsung).versao, "13");

  const mac = detectarSistema(UA.safariMac);
  assert.equal(mac.nome, "macOS");
  assert.equal(mac.versao, "");
  assert.match(mac.observacao, /10\.15\.7/);
  assert.equal(detectarSistema(UA.safariMac, { platform: "macOS", platformVersion: "14.5.0", architecture: "arm", bitness: "64" }).versao, "14.5");
});

test("sistema: iPhone, iPad disfarçado de Mac, tablet Android e Linux", () => {
  const iphone = detectarSistema(UA.safariIphone);
  assert.deepEqual([iphone.nome, iphone.versao, iphone.dispositivo], ["iOS", "17.5", "Celular"]);

  const ipad = detectarSistema(UA.safariMac, {}, 5);       // mesmo texto do Mac, mas com tela de toque
  assert.deepEqual([ipad.nome, ipad.dispositivo], ["iPadOS", "Tablet"]);

  const tablet = detectarSistema(UA.firefoxAndroidTablet);
  assert.deepEqual([tablet.nome, tablet.versao, tablet.dispositivo], ["Android", "14", "Tablet"]);

  const linux = detectarSistema(UA.firefoxLinux);
  assert.deepEqual([linux.nome, linux.versao], ["Linux", "Ubuntu"]);
});

test("resumo para o suporte e validação de IP", () => {
  assert.equal(montarResumo([["IP", "192.0.2.10"], ["IPv6", ""], ["Navegador", "Firefox 131.0"], ["Modelo", null]]), "IP: 192.0.2.10\nNavegador: Firefox 131.0");
  assert.equal(ipValido("192.0.2.10"), "IPv4");
  assert.equal(ipValido("2001:db8::1"), "IPv6");
  assert.equal(ipValido("999.1.1.1"), "");
  assert.equal(ipValido("<script>"), "");
});
