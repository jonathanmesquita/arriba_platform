/* CNAB 240 — formulário do gerador. Só DOM: a montagem do arquivo é de
   gerar240.js e a conferência é de validacao240.js / cnab400/validacao.js.
   Valor digitado entra por textContent/value, nunca por innerHTML. */
import { gerarNome, gerarCpf, gerarValorAleatorio, formatarNumeroBr } from "../../../assets/js/fake-data-br.js";
import { validarValor } from "../cnab400/validacao.js";
import { gerarArquivo240 } from "./gerar240.js";
import { analisar240 } from "./validacao240.js";

const el = (tag, { texto, classe, attrs } = {}, filhos = []) => {
  const n = document.createElement(tag);
  if (texto !== undefined) n.textContent = texto;
  if (classe) n.className = classe;
  if (attrs) for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  filhos.forEach((f) => n.appendChild(f));
  return n;
};

const tamanho = (d) => d.fim - d.ini + 1;
const parseDinheiro = (t) => parseFloat(String(t ?? "").replace(/\./g, "").replace(",", ".")) || 0;
const semAcento = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const iso = (d) => d.toISOString().slice(0, 10);

/* Um campo do formulário: rótulo (com * se obrigatório), entrada e linha de ajuda. */
function campo(def, id) {
  const caixa = el("div", { classe: "campo-gerador" });
  const rotulo = el("label", { attrs: { for: id } });
  rotulo.appendChild(document.createTextNode(def.nome));
  if (def.obrigatorio) rotulo.appendChild(el("span", { texto: " *", classe: "req-mark", attrs: { "aria-label": "obrigatório" } }));
  caixa.appendChild(rotulo);

  let entrada;
  const opcoes = def.opcoes || (def.tabela ? Object.keys(def.tabela) : null);
  if (opcoes) {
    entrada = el("select", { classe: "form-select", attrs: { id } });
    if (!def.obrigatorio) entrada.appendChild(el("option", { texto: "—", attrs: { value: "" } }));
    for (const o of opcoes) {
      const desc = def.tabela?.[o];
      entrada.appendChild(el("option", { texto: desc ? `${o} — ${desc}` : o, attrs: { value: o } }));
    }
    if (def.exemplo && opcoes.includes(def.exemplo) && def.obrigatorio) entrada.value = def.exemplo;
  } else if (def.fmt === "dataDMA") {
    entrada = el("input", { classe: "form-control", attrs: { id, type: "date" } });
  } else {
    entrada = el("input", { classe: "form-control", attrs: { id, autocomplete: "off", placeholder: def.fmt === "valor" ? "0,00" : (def.exemplo || "") } });
  }
  entrada.dataset.k = def.key;
  caixa.appendChild(entrada);
  const dica = [`posições ${def.ini}–${def.fim} (${tamanho(def)})`, def.ajuda].filter(Boolean).join(" · ");
  caixa.appendChild(el("div", { texto: dica, classe: "dica-campo" }));
  return caixa;
}

/* Obrigatórios à vista; opcionais num bloco recolhido que abre sozinho se tiver erro. */
function blocoDeCampos(defs, chaves, prefixo) {
  const lista = chaves.map((k) => defs.find((d) => d.key === k)).filter(Boolean);
  const obrig = lista.filter((d) => d.obrigatorio);
  const opc = lista.filter((d) => !d.obrigatorio);
  const raiz = el("div");
  raiz.appendChild(el("div", { classe: "grade-campos" }, obrig.map((d) => campo(d, `${prefixo}_${d.key}`))));
  if (opc.length) {
    raiz.appendChild(el("details", { classe: "opcionais" }, [
      el("summary", { texto: `Campos opcionais (${opc.length})` }),
      el("div", { classe: "grade-campos" }, opc.map((d) => campo(d, `${prefixo}_${d.key}`))),
    ]));
  }
  return raiz;
}

export function montarGerador(raiz, layout, direcao, { aoMudarEstado } = {}) {
  const L = layout[direcao];
  const form = L.formulario;
  let contador = 0;
  let linhasGeradas = null;

  raiz.replaceChildren();
  const caixaArquivo = el("div");
  const caixaLote = el("div");
  const listaTitulos = el("div");
  const defsDoTitulo = (chave) => L.segmentos[chave];

  const secao = (titulo, conteudo) => el("section", { classe: "secao-gerador" }, [el("h3", { texto: titulo }), conteudo]);
  caixaArquivo.appendChild(blocoDeCampos(L.headerArquivo, form.arquivo, "arq"));
  caixaLote.appendChild(blocoDeCampos(L.headerLote, form.lote, "lote"));

  function novoTitulo() {
    contador += 1;
    const n = contador;
    const cartao = el("div", { classe: "titulo-cartao" });
    const topo = el("div", { classe: "titulo-topo" }, [el("strong", { texto: `Título ${n}` })]);
    const remover = el("button", { classe: "btn-arriba btn-outline-arriba btn-pequeno", texto: "Remover", attrs: { type: "button" } });
    remover.addEventListener("click", () => cartao.remove());
    topo.appendChild(remover);
    cartao.appendChild(topo);
    for (const [seg, chaves] of Object.entries(form.titulo)) {
      cartao.appendChild(el("h4", { texto: `Segmento ${seg}`, classe: "titulo-segmento" }));
      const bloco = blocoDeCampos(defsDoTitulo(seg), chaves, `t${n}_${seg}`);
      bloco.dataset.segmento = seg;
      cartao.appendChild(bloco);
    }
    listaTitulos.appendChild(cartao);
  }

  const mensagem = el("p", { classe: "status-linha", attrs: { role: "status" } });
  const problemas = el("div", { classe: "resultados" });
  const previa = el("pre", { classe: "caixa-codigo hidden", attrs: { tabindex: "0", "aria-label": "Prévia do arquivo gerado" } });
  const btnAdd = el("button", { classe: "btn-arriba btn-outline-arriba", attrs: { type: "button" } }, [el("i", { classe: "fa-solid fa-plus", attrs: { "aria-hidden": "true" } }), document.createTextNode("Adicionar título")]);
  const btnExemplo = el("button", { classe: "btn-arriba btn-outline-arriba", attrs: { type: "button" } }, [el("i", { classe: "fa-solid fa-wand-magic-sparkles", attrs: { "aria-hidden": "true" } }), document.createTextNode("Preencher com exemplo")]);
  const btnGerar = el("button", { classe: "btn-arriba btn-red-arriba", attrs: { type: "button" } }, [el("i", { classe: "fa-solid fa-gears", attrs: { "aria-hidden": "true" } }), document.createTextNode("Gerar e conferir")]);
  const btnBaixar = el("button", { classe: "btn-arriba btn-dark-arriba", attrs: { type: "button", disabled: "" } }, [el("i", { classe: "fa-solid fa-download", attrs: { "aria-hidden": "true" } }), document.createTextNode("Baixar arquivo")]);

  raiz.append(
    el("p", { classe: "descricao", texto: "Digite os campos obrigatórios (*) do arquivo, do lote e de cada título; os opcionais ficam recolhidos. Sem tempo? \"Preencher com exemplo\" completa o que falta com dados fictícios." }),
    secao("Arquivo", caixaArquivo),
    secao("Lote", caixaLote),
    secao("Títulos", el("div", {}, [listaTitulos, btnAdd])),
    el("div", { classe: "acoes" }, [btnExemplo, btnGerar, btnBaixar]),
    mensagem, problemas, previa,
  );
  novoTitulo();

  /* ---- leitura e validação ---- */
  const campos = (container) => [...container.querySelectorAll("[data-k]")];
  const defDe = (defs, k) => defs.find((d) => d.key === k);

  function limpar() {
    raiz.querySelectorAll(".erro-campo").forEach((n) => n.remove());
    raiz.querySelectorAll("[aria-invalid]").forEach((n) => { n.removeAttribute("aria-invalid"); n.classList.remove("field-invalid"); });
  }

  function validarContainer(container, defs, rotulo) {
    const saida = [];
    for (const e of campos(container)) {
      const def = defDe(defs, e.dataset.k);
      if (!def) continue;
      const achados = validarValor(def, e.value);
      if (!achados.length) continue;
      const erro = achados.find((a) => a.nivel === "erro");
      for (const a of achados) saida.push({ nivel: a.nivel, texto: `${rotulo}, ${def.nome}: ${a.mensagem}` });
      if (erro) {
        e.classList.add("field-invalid");
        e.setAttribute("aria-invalid", "true");
        e.closest("details")?.setAttribute("open", "");
      }
      e.insertAdjacentElement("afterend", el("div", { texto: achados.map((a) => a.mensagem).join(" "), classe: `erro-campo${erro ? "" : " aviso"}` }));
    }
    return saida;
  }

  function valores(container, defs) {
    const v = {};
    for (const e of campos(container)) {
      const def = defDe(defs, e.dataset.k);
      v[e.dataset.k] = def?.fmt === "valor" ? parseDinheiro(e.value) : e.value.trim();
    }
    return v;
  }

  function lerDados() {
    const titulos = [...listaTitulos.children].map((cartao) => {
      const t = {};
      for (const bloco of cartao.querySelectorAll("[data-segmento]")) t[bloco.dataset.segmento] = valores(bloco, defsDoTitulo(bloco.dataset.segmento));
      return t;
    });
    return { arquivo: valores(caixaArquivo, L.headerArquivo), lote: valores(caixaLote, L.headerLote), titulos };
  }

  function mostrarProblemas(erros, avisos, tituloErros) {
    problemas.replaceChildren();
    const lista = (titulo, itens, tipo) => {
      if (!itens.length) return;
      const ul = el("ul");
      itens.forEach((t) => ul.appendChild(el("li", { texto: t })));
      problemas.appendChild(el("div", { classe: "item", attrs: { "data-tipo": tipo } }, [el("div", { classe: "item-topo" }, [el("span", { classe: "item-nome", texto: titulo })]), ul]));
    };
    lista(tituloErros || `${erros.length} ${erros.length === 1 ? "erro" : "erros"}`, erros, "erro");
    lista(`${avisos.length} ${avisos.length === 1 ? "aviso" : "avisos"}`, avisos, "aviso");
  }

  function gerar() {
    limpar();
    linhasGeradas = null;
    btnBaixar.disabled = true;
    previa.classList.add("hidden");

    const todos = [
      ...validarContainer(caixaArquivo, L.headerArquivo, "Arquivo"),
      ...validarContainer(caixaLote, L.headerLote, "Lote"),
    ];
    [...listaTitulos.children].forEach((cartao, i) => {
      for (const bloco of cartao.querySelectorAll("[data-segmento]")) {
        todos.push(...validarContainer(bloco, defsDoTitulo(bloco.dataset.segmento), `Título ${i + 1}, segmento ${bloco.dataset.segmento}`));
      }
    });
    // Obrigatório vazio: validarValor já cobra; este erro só explica o que fazer.
    const erros = todos.filter((p) => p.nivel === "erro").map((p) => p.texto);
    const avisos = todos.filter((p) => p.nivel === "aviso").map((p) => p.texto);
    if (!listaTitulos.children.length) erros.push("Adicione ao menos um título.");

    if (erros.length) {
      mostrarProblemas(erros, avisos, `${erros.length} ${erros.length === 1 ? "erro" : "erros"} — o arquivo não foi gerado`);
      mensagem.textContent = `Corrija os campos destacados (${erros.length} ${erros.length === 1 ? "erro" : "erros"}) para gerar o arquivo.`;
      mensagem.dataset.tipo = "erro";
      aoMudarEstado?.();
      return;
    }

    const linhas = gerarArquivo240(layout, direcao, lerDados());
    // Autoverificação: o arquivo gerado passa pelo mesmo validador da leitura.
    const r = analisar240(linhas.join("\r\n"), { layout, direcao });
    const errosArquivo = r.erros.map((p) => p.mensagem);
    const avisosArquivo = r.avisos.filter((p) => p.codigo !== "acento").map((p) => p.mensagem);
    mostrarProblemas(errosArquivo, [...avisos, ...avisosArquivo]);
    previa.textContent = linhas.join("\n");
    previa.classList.remove("hidden");

    const bom = errosArquivo.length === 0;
    mensagem.textContent = bom
      ? `Arquivo gerado: ${linhas.length} linhas de 240 posições, conferido pelas mesmas regras da leitura: sem erros.`
      : `Arquivo gerado com ${errosArquivo.length} erro(s) na conferência — download bloqueado.`;
    mensagem.dataset.tipo = bom ? "ok" : "erro";
    linhasGeradas = bom ? linhas : null;
    btnBaixar.disabled = !bom;
    aoMudarEstado?.();
  }

  function baixar() {
    if (!linhasGeradas) return;
    const blob = new Blob([`${linhasGeradas.join("\r\n")}\r\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { attrs: { href: url, download: `CB240-${layout.code}-teste.${direcao === "remessa" ? "REM" : "RET"}` } });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exemplo() {
    const hoje = new Date();
    const maisDias = (n) => { const d = new Date(hoje); d.setDate(d.getDate() + n); return iso(d); };
    const preencher = (container, defs, indice) => {
      for (const e of campos(container)) {
        const def = defDe(defs, e.dataset.k);
        if (!def || e.value.trim() || !(def.obrigatorio || def.exemploPreenche)) continue;
        let v = def.exemplo ?? "";
        if (def.exemploFn) v = def.exemploFn(indice);
        else if (def.fmt === "dataDMA") v = /vencimento/i.test(def.key) ? maisDias(30 + indice) : iso(hoje);
        else if (def.fmt === "valor") v = formatarNumeroBr(gerarValorAleatorio(50, 2000));
        else if (def.key === "nomePagador") v = semAcento(gerarNome()).slice(0, tamanho(def));
        else if (def.key === "numInscPagador") v = gerarCpf();
        else if (def.key === "numInscricao") v = "11222333000181"; // CNPJ de exemplo público (dígitos válidos)
        e.value = v;
      }
    };
    preencher(caixaArquivo, L.headerArquivo, 0);
    preencher(caixaLote, L.headerLote, 0);
    [...listaTitulos.children].forEach((cartao, i) => {
      for (const bloco of cartao.querySelectorAll("[data-segmento]")) preencher(bloco, defsDoTitulo(bloco.dataset.segmento), i);
    });
    mensagem.textContent = 'Campos obrigatórios completados com dados fictícios. Confira, ajuste o que quiser e clique em "Gerar e conferir".';
    mensagem.dataset.tipo = "ok";
  }

  btnAdd.addEventListener("click", novoTitulo);
  btnExemplo.addEventListener("click", exemplo);
  btnGerar.addEventListener("click", gerar);
  btnBaixar.addEventListener("click", baixar);
}
