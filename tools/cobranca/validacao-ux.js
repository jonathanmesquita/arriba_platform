/* Validação de formulário — comportamento compartilhado pelos geradores de CNAB (400 e 240).
   Só DOM. Quem chama decide O QUE é erro (validarValor); aqui fica COMO aparece:
   - a mensagem vai logo abaixo do campo, ligada a ele por aria-describedby;
   - o resumo lista cada problema como botão que leva ao campo (abre o bloco recolhido);
   - ao corrigir um campo, a mensagem e o item do resumo somem sozinhos;
   - o contador mostra quantos campos obrigatórios já foram preenchidos.
   Texto digitado nunca entra por innerHTML. */

let contador = 0;

const criar = (tag, classe, texto) => {
  const n = document.createElement(tag);
  if (classe) n.className = classe;
  if (texto !== undefined) n.textContent = texto;
  return n;
};

export function limparMensagem(el) {
  el.classList.remove("field-invalid");
  el.removeAttribute("aria-invalid");
  el.removeAttribute("aria-describedby");
  const nota = el.nextElementSibling;
  if (nota?.classList.contains("erro-campo")) nota.remove();
}

/** achados = [{ nivel: "erro"|"aviso", mensagem }]; lista vazia só limpa. */
export function mostrarMensagem(el, achados) {
  limparMensagem(el);
  if (!achados.length) return false;
  const erro = achados.some((a) => a.nivel === "erro");
  if (erro) { el.classList.add("field-invalid"); el.setAttribute("aria-invalid", "true"); }
  if (!el.id) el.id = `campo_ux_${++contador}`;
  const nota = criar("div", `erro-campo${erro ? "" : " aviso"}`, achados.map((a) => a.mensagem).join(" "));
  nota.id = `${el.id}_msg`;
  el.setAttribute("aria-describedby", nota.id);
  el.insertAdjacentElement("afterend", nota);
  return erro;
}

/** Leva até o campo: abre o bloco recolhido, rola até o meio da tela e põe o foco. */
export function irParaCampo(el) {
  el.closest("details")?.setAttribute("open", "");
  el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  el.focus({ preventScroll: true });
}

/**
 * Resumo de problemas. `itens` = [{ nivel, onde, texto, el }]. Devolve o controle
 * `{ remover(el), vazio() }`, para o resumo acompanhar as correções ao vivo.
 */
export function mostrarResumo(caixa, itens, { aoCorrigirTudo } = {}) {
  caixa.replaceChildren();
  caixa.className = "resumo-validacao";
  if (!itens.length) { caixa.hidden = true; return { remover() {} }; }
  caixa.hidden = false;

  const erros = itens.filter((i) => i.nivel === "erro").length;
  const avisos = itens.length - erros;
  if (!erros) caixa.classList.add("so-avisos");

  const titulo = criar("h4");
  const sub = criar("p");
  const lista = criar("ul");
  caixa.append(titulo, sub, lista);

  const atualizarTitulo = () => {
    const e = lista.querySelectorAll("li.erro").length;
    const a = lista.querySelectorAll("li.aviso").length;
    const partes = [];
    if (e) partes.push(`${e} ${e === 1 ? "campo precisa" : "campos precisam"} de correção`);
    if (a) partes.push(`${a} ${a === 1 ? "aviso" : "avisos"}`);
    titulo.textContent = partes.join(" · ") || "Tudo certo";
    sub.textContent = e ? "Clique em um item para ir até o campo. Ao corrigir, ele sai desta lista." : (a ? "Nada impede de gerar, mas vale conferir." : "");
    caixa.classList.toggle("so-avisos", !e && a > 0);
    caixa.classList.toggle("ok", !e && !a);
    if (!e && !a) { caixa.hidden = true; aoCorrigirTudo?.(); }
  };

  for (const item of itens) {
    const li = criar("li", item.nivel);
    li.dataset.campo = item.el?.id || "";
    const botao = criar("button");
    botao.type = "button";
    botao.append(criar("span", "onde", item.onde), document.createTextNode(` — ${item.texto}`));
    if (item.el) {
      botao.append(criar("span", "vai", "ir ao campo →"));
      botao.addEventListener("click", () => irParaCampo(item.el));
    }
    li.appendChild(botao);
    lista.appendChild(li);
  }
  atualizarTitulo();

  return {
    remover(el) {
      if (!el?.id) return;
      lista.querySelectorAll(`li[data-campo="${el.id}"]`).forEach((li) => li.remove());
      atualizarTitulo();
    },
  };
}

/** Contador "X de Y obrigatórios preenchidos". `campos` = [{ el, obrigatorio }]. */
export function atualizarProgresso(caixa, campos) {
  const obrig = campos.filter((c) => c.obrigatorio);
  const feitos = obrig.filter((c) => String(c.el.value || "").trim() !== "").length;
  const pct = obrig.length ? Math.round((feitos / obrig.length) * 100) : 100;
  caixa.replaceChildren();
  caixa.className = "progresso-obrigatorios";
  const texto = criar("span");
  const forte = criar("strong", "", `${feitos} de ${obrig.length}`);
  texto.append(forte, document.createTextNode(" campos obrigatórios preenchidos"));
  const barra = criar("span", "barra");
  const dentro = criar("span");
  dentro.style.width = `${pct}%`;
  barra.appendChild(dentro);
  barra.setAttribute("role", "progressbar");
  barra.setAttribute("aria-valuemin", "0");
  barra.setAttribute("aria-valuemax", String(obrig.length));
  barra.setAttribute("aria-valuenow", String(feitos));
  barra.setAttribute("aria-label", "Campos obrigatórios preenchidos");
  caixa.append(texto, barra);
}
