(function () {
  const manuals = window.ARRIBA_MANUALS_INDEX || [];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scoreManual(manual, term) {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) return 1;
    const haystack = normalize([
      manual.title,
      manual.product,
      manual.category,
      manual.routine,
      manual.module,
      manual.client,
      manual.kind,
      manual.summary,
      ...(manual.keywords || []),
      ...(manual.checklist || [])
    ].join(" "));
    return normalizedTerm.split(" ").reduce((score, token) => {
      if (!token) return score;
      return score + (haystack.includes(token) ? 5 : 0) + (normalize(manual.title).includes(token) ? 4 : 0) + (normalize(manual.client).includes(token) ? 3 : 0);
    }, 0);
  }

  function unique(key) {
    return [...new Set(manuals.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function renderFilters() {
    const categoryList = $("#manualCategoryList");
    if (categoryList) {
      categoryList.innerHTML = unique("category").map((value) => `<button class="manual-chip" data-filter-category="${value}">${value}</button>`).join("");
    }
    const categorySelect = $("#manualCategoryFilter");
    if (categorySelect) {
      categorySelect.innerHTML = `<option value="">Todas as categorias</option>` + unique("category").map((value) => `<option value="${value}">${value}</option>`).join("");
    }
    const clientSelect = $("#manualClientFilter");
    if (clientSelect) {
      clientSelect.innerHTML = `<option value="">Todos os clientes</option>` + unique("client").map((value) => `<option value="${value}">${value}</option>`).join("");
    }
  }

  function getFilters() {
    return {
      term: $("#manualSearchInput")?.value || "",
      category: $("#manualCategoryFilter")?.value || "",
      client: $("#manualClientFilter")?.value || ""
    };
  }

  function filteredManuals() {
    const { term, category, client } = getFilters();
    return manuals
      .map((manual) => ({ ...manual, score: scoreManual(manual, term) }))
      .filter((manual) => (!term || manual.score > 0) && (!category || manual.category === category) && (!client || manual.client === client))
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }

  function renderStats(list) {
    const stats = $("#manualStats");
    if (!stats) return;
    const clients = new Set(list.map((item) => item.client)).size;
    const categories = new Set(list.map((item) => item.category)).size;
    stats.innerHTML = `
      <div class="manual-stat"><span>Manuais</span><strong>${list.length}</strong></div>
      <div class="manual-stat"><span>Categorias</span><strong>${categories}</strong></div>
      <div class="manual-stat"><span>Clientes</span><strong>${clients}</strong></div>
      <div class="manual-stat"><span>Fonte</span><strong>Local</strong></div>
    `;
  }

  function renderManuals() {
    const list = filteredManuals();
    const results = $("#manualResults");
    const count = $("#manualResultsCount");
    if (count) count.textContent = `${list.length} manual(is)`;
    renderStats(list);
    if (!results) return;
    if (!list.length) {
      results.innerHTML = `<div class="manual-card"><div><h4>Nenhum manual encontrado</h4><p>Teste outro termo ou filtre por outra categoria. A base local ainda pode ser ampliada.</p></div></div>`;
      return;
    }
    results.innerHTML = list.map((manual) => `
      <article class="manual-card" data-manual-id="${manual.id}">
        <div>
          <span class="manual-eyebrow">${manual.category}</span>
          <h4>${manual.title}</h4>
          <p>${manual.summary || "Sem resumo."}</p>
          <div class="manual-tags">
            <span class="manual-tag">${manual.product}</span>
            <span class="manual-tag">${manual.client}</span>
            <span class="manual-tag">${manual.kind}</span>
            <span class="manual-tag">${manual.module}</span>
          </div>
          <div class="manual-preview" id="preview-${manual.id}">
            <strong>Checklist rápido</strong>
            <ul>${(manual.checklist || []).map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
        </div>
        <div class="manual-actions">
          <a class="manual-btn primary" href="${manual.url || "#"}">Abrir artigo</a>
          <button class="manual-btn" type="button" data-preview="${manual.id}">Checklist</button>
          <button class="manual-btn" type="button" data-copy="${manual.id}">Copiar resumo</button>
        </div>
      </article>
    `).join("");
  }

  function copyManual(id) {
    const manual = manuals.find((item) => item.id === id);
    if (!manual) return;
    const text = `${manual.title}\nCategoria: ${manual.category}\nCliente: ${manual.client}\nRotina: ${manual.routine}\n\nResumo:\n${manual.summary}\n\nChecklist:\n${(manual.checklist || []).map((item) => `- ${item}`).join("\n")}`;
    navigator.clipboard?.writeText(text);
  }

  function bind() {
    renderFilters();
    renderManuals();
    $("#manualSearchInput")?.addEventListener("input", renderManuals);
    $("#manualCategoryFilter")?.addEventListener("change", renderManuals);
    $("#manualClientFilter")?.addEventListener("change", renderManuals);
    document.addEventListener("click", (event) => {
      const category = event.target.closest("[data-filter-category]")?.dataset.filterCategory;
      if (category) {
        const select = $("#manualCategoryFilter");
        if (select) select.value = category;
        $$("[data-filter-category]").forEach((btn) => btn.classList.toggle("active", btn.dataset.filterCategory === category));
        renderManuals();
      }
      const preview = event.target.closest("[data-preview]")?.dataset.preview;
      if (preview) $("#preview-" + preview)?.classList.toggle("open");
      const copy = event.target.closest("[data-copy]")?.dataset.copy;
      if (copy) copyManual(copy);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
