(function () {
  const packages = window.ARRIBA_PACKAGE_INDEX || [];
  const normalize = window.ARRIBA_NORMALIZE_PACKAGE_TEXT || ((value) => String(value || "").toLowerCase());
  const $ = (selector) => document.querySelector(selector);

  function unique(key) {
    return [...new Set(packages.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function scorePackage(pkg, term) {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) return 1;
    const haystack = pkg.normalizedSearchText || normalize(pkg.searchText || [
      pkg.id,
      pkg.description,
      pkg.client,
      pkg.category,
      pkg.routine,
      pkg.criticality,
      pkg.monitorArriba,
      ...(pkg.keywords || [])
    ].join(" "));

    return normalizedTerm.split(" ").reduce((score, token) => {
      if (!token) return score;
      if (String(pkg.id) === token) return score + 60;
      return score
        + (haystack.includes(token) ? 4 : 0)
        + (normalize(pkg.description).includes(token) ? 10 : 0)
        + (normalize(pkg.client).includes(token) ? 7 : 0)
        + (normalize(pkg.category).includes(token) ? 5 : 0)
        + (normalize(pkg.routine).includes(token) ? 5 : 0);
    }, 0);
  }

  function filters() {
    return {
      term: $("#packageSearchInput")?.value || "",
      category: $("#packageCategoryFilter")?.value || "",
      client: $("#packageClientFilter")?.value || ""
    };
  }

  function filteredPackages() {
    const f = filters();
    return packages
      .map((pkg) => ({ ...pkg, score: scorePackage(pkg, f.term) }))
      .filter((pkg) => (!f.term || pkg.score > 0)
        && (!f.category || pkg.category === f.category)
        && (!f.client || pkg.client === f.client))
      .sort((a, b) => b.score - a.score || Number(a.id) - Number(b.id))
      .slice(0, 100);
  }

  function renderFilters() {
    const category = $("#packageCategoryFilter");
    const client = $("#packageClientFilter");
    if (category) category.innerHTML = `<option value="">Todas as rotinas</option>` + unique("category").map((item) => `<option>${item}</option>`).join("");
    if (client) client.innerHTML = `<option value="">Todos os clientes</option>` + unique("client").map((item) => `<option>${item}</option>`).join("");
  }

  function renderStats(list) {
    const el = $("#packageStats");
    if (!el) return;
    const clients = new Set(list.map((item) => item.client)).size;
    const categories = new Set(list.map((item) => item.category)).size;
    const monitored = list.filter((item) => item.monitorArriba === "Sim").length;
    const high = list.filter((item) => item.criticality === "Alta").length;
    el.innerHTML = `
      <div class="manual-stat"><span>Pacotes</span><strong>${packages.length}</strong></div>
      <div class="manual-stat"><span>Exibidos</span><strong>${list.length}</strong></div>
      <div class="manual-stat"><span>Clientes</span><strong>${clients}</strong></div>
      <div class="manual-stat"><span>Rotinas</span><strong>${categories}</strong></div>
      <div class="manual-stat"><span>Monitorar</span><strong>${monitored}</strong></div>
      <div class="manual-stat"><span>Alta criticidade</span><strong>${high}</strong></div>
    `;
  }

  function badgeClass(value) {
    const v = normalize(value);
    if (v.includes("alta")) return "danger";
    if (v.includes("media")) return "warning";
    return "";
  }

  function renderPackages() {
    const list = filteredPackages();
    const results = $("#packageResults");
    const count = $("#packageResultsCount");
    if (count) count.textContent = `${list.length} pacote(s)`;
    renderStats(list);
    if (!results) return;
    if (!list.length) {
      results.innerHTML = `<article class="manual-card"><div><h4>Nenhum pacote encontrado</h4><p>Pesquise pelo ID, cliente, rotina ou descrição do pacote.</p></div></article>`;
      return;
    }
    results.innerHTML = list.map((pkg) => `
      <article class="manual-card package-card" data-package-id="${pkg.id}">
        <div>
          <span class="manual-eyebrow">Pacote #${pkg.id} · ${pkg.category}</span>
          <h4>${pkg.description}</h4>
          <p>Cliente/Origem: <strong>${pkg.client}</strong> · Rotina sugerida: <strong>${pkg.routine}</strong></p>
          <p class="manual-muted">Passos: <strong>${pkg.steps ?? 0}</strong> · Arquivo: <strong>${pkg.fileSteps ?? 0}</strong> · Cliente Web: <strong>${pkg.clientWeb || "Não"}</strong></p>
          <div class="manual-tags">
            <span class="manual-tag">${pkg.product}</span>
            <span class="manual-tag ${badgeClass(pkg.criticality)}">Criticidade ${pkg.criticality}</span>
            <span class="manual-tag">Monitorar: ${pkg.monitorArriba}</span>
            <span class="manual-tag">Score ${pkg.score}</span>
          </div>
        </div>
        <div class="manual-actions">
          <button class="manual-btn" type="button" data-copy-package="${pkg.id}">Copiar de/para</button>
          <a class="manual-btn primary" href="/tools/datacob/support-copilot/support-copilot.html">Usar no Copilot</a>
        </div>
      </article>
    `).join("");
  }

  function copyPackage(id) {
    const pkg = packages.find((item) => String(item.id) === String(id));
    if (!pkg) return;
    const text = [
      "De/Para Pacote DataCob",
      `ID: ${pkg.id}`,
      `Descrição: ${pkg.description}`,
      `Cliente/Origem: ${pkg.client}`,
      `Categoria: ${pkg.category}`,
      `Rotina sugerida: ${pkg.routine}`,
      `Criticidade: ${pkg.criticality}`,
      `Monitorar na Arriba: ${pkg.monitorArriba}`,
      `Cliente Web: ${pkg.clientWeb}`,
      `Qtd. passos: ${pkg.steps}`,
      `Qtd. passos com arquivo: ${pkg.fileSteps}`,
      `Job SQL: ${pkg.jobSql || "Não informado"}`,
      `Pasta destino: ${pkg.legacyPath || "Não informada"}`
    ].join("\\n");
    navigator.clipboard?.writeText(text);
  }

  function bind() {
    renderFilters();
    renderPackages();
    ["#packageSearchInput", "#packageCategoryFilter", "#packageClientFilter"].forEach((selector) => {
      $(selector)?.addEventListener("input", renderPackages);
      $(selector)?.addEventListener("change", renderPackages);
    });
    document.addEventListener("click", (event) => {
      const copy = event.target.closest("[data-copy-package]")?.dataset.copyPackage;
      if (copy) copyPackage(copy);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
