(function () {
  const API_BASE = (window.ARRIBA_API_BASE || localStorage.getItem("arribaSupportApiBase") || "https://api.arriba.jm.dev.br").replace(/\/$/, "");
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const state = {
    term: "",
    filter: "all",
    freshdeskLoadedFor: "",
    freshdeskResults: []
  };

  function normalize(value = "") {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value = "") {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function sourceBadge(source) {
    const labels = {
      manual: "Manual local",
      package: "Pacote DataCob",
      article: "Página / artigo",
      freshdesk: "Freshdesk"
    };
    return labels[source] || "Base";
  }

  function iconFor(source) {
    const icons = {
      manual: "fa-book-open",
      package: "fa-box-archive",
      article: "fa-file-lines",
      freshdesk: "fa-cloud"
    };
    return icons[source] || "fa-magnifying-glass";
  }

  function buildSearchText(item) {
    return normalize([
      item.title,
      item.summary,
      item.description,
      item.product,
      item.category,
      item.client,
      item.routine,
      item.module,
      item.kind,
      item.status,
      item.criticality,
      item.id,
      item.url,
      ...(item.keywords || []),
      ...(item.checklist || [])
    ].join(" "));
  }

  function scoreItem(item, term) {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) return 1;
    const tokens = normalizedTerm.split(" ").filter(Boolean);
    const title = normalize(item.title || item.description || "");
    const haystack = item.searchText || buildSearchText(item);
    let score = 0;
    tokens.forEach((token) => {
      if (haystack.includes(token)) score += 8;
      if (title.includes(token)) score += 10;
      if (normalize(item.client).includes(token)) score += 6;
      if (normalize(item.category).includes(token)) score += 5;
      if (normalize(item.product).includes(token)) score += 4;
    });
    if (title === normalizedTerm) score += 40;
    if (title.includes(normalizedTerm)) score += 20;
    return score;
  }

  function getDocCards() {
    return $$("#docSearchCards .rw-doc-card").map((card, index) => {
      const title = card.querySelector("h2")?.textContent?.trim() || "Artigo rápido";
      const summary = card.querySelector("p")?.textContent?.trim() || "";
      const url = card.querySelector("a")?.getAttribute("href") || "#";
      return {
        id: `doc-card-${index}`,
        source: "article",
        title,
        summary,
        product: title.includes("DataCob") ? "DataCob" : "Arriba",
        category: "Base rápida",
        kind: "Atalho",
        url,
        keywords: (card.dataset.docKeywords || "").split(/\s+/).filter(Boolean)
      };
    });
  }

  function getManualItems() {
    return (window.ARRIBA_MANUALS_INDEX || []).map((manual) => ({
      ...manual,
      source: "manual",
      title: manual.title || "Manual sem título",
      summary: manual.summary || "Manual local do Help Center.",
      url: manual.url || "#"
    }));
  }

  function getPackageItems() {
    return (window.ARRIBA_PACKAGE_INDEX || []).map((pkg) => ({
      ...pkg,
      source: "package",
      title: pkg.description || `Pacote ${pkg.id}`,
      summary: `ID ${pkg.id} · Cliente/origem: ${pkg.client || "Geral"} · Rotina: ${pkg.routine || pkg.category || "A confirmar"}`,
      product: pkg.product || "DataCob",
      category: pkg.category || "Pacote",
      kind: pkg.kind || "Pacote de recepção/carga",
      url: pkg.url || "/pages/docs/help-center/index.html#pacotes-datacob",
      keywords: pkg.keywords || []
    }));
  }

  function getFreshdeskItems() {
    return (state.freshdeskResults || []).map((article, index) => ({
      id: article.id || article.articleId || `freshdesk-${index}`,
      source: "freshdesk",
      title: article.title || "Artigo Freshdesk",
      summary: article.summary || article.description_text || article.description || "Artigo retornado pela base Freshdesk.",
      product: article.product || "Freshdesk",
      category: article.category || article.folder_name || "Solutions",
      kind: "Artigo Freshdesk",
      url: article.url || article.public_url || article.freshdesk_url || article.link || "#",
      score: article.score || 0,
      keywords: article.keywords || []
    }));
  }

  function allItems() {
    return [
      ...getManualItems(),
      ...getPackageItems(),
      ...getDocCards(),
      ...getFreshdeskItems()
    ];
  }

  function filterItems() {
    const term = state.term;
    const activeFilter = state.filter;
    return allItems()
      .map((item) => ({ ...item, computedScore: item.source === "freshdesk" && item.score ? item.score : scoreItem(item, term) }))
      .filter((item) => activeFilter === "all" || item.source === activeFilter)
      .filter((item) => !term || item.computedScore > 0)
      .sort((a, b) => b.computedScore - a.computedScore || String(a.title).localeCompare(String(b.title)))
      .slice(0, 60);
  }

  function actionLabel(item) {
    if (item.source === "package") return "Ver de/para";
    if (item.source === "freshdesk") return "Abrir Freshdesk";
    if (item.source === "manual") return "Abrir manual";
    return "Abrir artigo";
  }

  function copyResult(item) {
    const text = `${item.title}\nFonte: ${sourceBadge(item.source)}\nProduto: ${item.product || "-"}\nCategoria: ${item.category || "-"}\n\nResumo:\n${item.summary || "-"}\n\nLink:\n${item.url || "-"}`;
    navigator.clipboard?.writeText(text);
  }

  function renderInsights(list) {
    const insights = $("#knowledgeInsights");
    if (!insights) return;
    const bySource = list.reduce((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {});
    const mainSource = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0]?.[0] || "local";
    insights.innerHTML = `
      <div><span>Resultados</span><strong>${list.length}</strong></div>
      <div><span>Fonte principal</span><strong>${escapeHtml(sourceBadge(mainSource))}</strong></div>
      <div><span>Termo</span><strong>${escapeHtml(state.term || "-")}</strong></div>
      <div><span>Manuais</span><strong>${bySource.manual || 0}</strong></div>
      <div><span>Pacotes</span><strong>${bySource.package || 0}</strong></div>
      <div><span>Freshdesk</span><strong>${bySource.freshdesk || 0}</strong></div>
    `;
  }

  function renderHeroPreview(list) {
    const preview = $("#knowledgeHeroResults");
    if (!preview) return;

    if (!state.term.trim()) {
      preview.hidden = true;
      preview.innerHTML = "";
      return;
    }

    preview.hidden = false;
    const shown = list.slice(0, 4);
    if (!shown.length) {
      preview.innerHTML = `
        <div class="knowledge-hero-empty">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Nenhum resultado local ainda. Clique em <strong>Buscar</strong> para consultar Freshdesk ou tente outro termo.
        </div>`;
      return;
    }

    preview.innerHTML = `
      <div class="knowledge-hero-result-head">
        <strong>${shown.length} sugestão(ões) rápida(s)</strong>
        <button type="button" id="openKnowledgeConsoleBtn">Ver todos</button>
      </div>
      <div class="knowledge-hero-result-list">
        ${shown.map((item) => `
          <a href="${escapeHtml(item.url || "#")}" target="${item.url && item.url.startsWith("http") ? "_blank" : "_self"}" rel="noopener">
            <span>${escapeHtml(sourceBadge(item.source))}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(String(item.summary || "Sem resumo.").replace(/<[^>]+>/g, " ").slice(0, 110))}</small>
          </a>`).join("")}
      </div>`;

    $("#openKnowledgeConsoleBtn")?.addEventListener("click", () => {
      $("#knowledge-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function syncManualRouter(term) {
    const manualInput = $("#manualSearchInput");
    if (!manualInput || manualInput.value === term) return;
    manualInput.value = term;
    manualInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function renderResults() {
    const list = filterItems();
    renderHeroPreview(list);
    const container = $("#knowledgeGlobalResults");
    const count = $("#knowledgeResultsCount");
    if (count) count.textContent = state.term ? `${list.length} resultado(s)` : "Digite para pesquisar";
    renderInsights(list);
    syncCardsVisibility();
    if (!container) return;
    if (!state.term) {
      container.innerHTML = `
        <div class="knowledge-empty-state">
          <i class="fa-regular fa-lightbulb"></i>
          <strong>Comece pesquisando um problema real.</strong>
          <p>Exemplo: “BTG encerramento ticket”, “versão homologação”, “pacote 186”, “negativação retorno” ou “DataCob 4.0 API”.</p>
        </div>`;
      return;
    }
    if (!list.length) {
      container.innerHTML = `
        <div class="knowledge-empty-state warning">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <strong>Nenhum resultado local encontrado.</strong>
          <p>Tente outro termo ou cadastre esse erro como novo artigo. Isso é sinal claro de lacuna na base.</p>
        </div>`;
      return;
    }
    container.innerHTML = list.map((item) => `
      <article class="knowledge-global-card ${escapeHtml(item.source)}">
        <div class="knowledge-global-icon"><i class="fa-solid ${iconFor(item.source)}"></i></div>
        <div class="knowledge-global-content">
          <div class="knowledge-global-meta">
            <span>${escapeHtml(sourceBadge(item.source))}</span>
            <span>${escapeHtml(item.product || "-")}</span>
            <span>${escapeHtml(item.category || item.routine || "-")}</span>
            <span>Score ${escapeHtml(Math.round(item.computedScore || item.score || 0))}</span>
          </div>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(String(item.summary || "Sem resumo.").replace(/<[^>]+>/g, " ").slice(0, 260))}</p>
          <div class="knowledge-global-tags">
            ${(item.client ? [`Cliente: ${item.client}`] : []).concat(item.routine ? [`Rotina: ${item.routine}`] : []).concat(item.kind ? [item.kind] : []).slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>
        <div class="knowledge-global-actions">
          <a href="${escapeHtml(item.url || "#")}" target="${item.url && item.url.startsWith("http") ? "_blank" : "_self"}" rel="noopener">${actionLabel(item)}</a>
          <button type="button" data-knowledge-copy="${escapeHtml(item.source)}:${escapeHtml(item.id)}">Copiar</button>
        </div>
      </article>
    `).join("");
  }

  function syncCardsVisibility() {
    const term = normalize(state.term);
    const cards = $$("#docSearchCards .rw-doc-card");
    cards.forEach((card) => {
      const haystack = normalize(card.textContent + " " + (card.dataset.docKeywords || ""));
      card.style.display = !term || haystack.includes(term) ? "" : "none";
    });
  }

  async function fetchFreshdeskResults(term) {
    const status = $("#knowledgeSourceStatus");
    if (!term || term.length < 3 || state.freshdeskLoadedFor === term) return;
    state.freshdeskLoadedFor = term;
    if (status) status.innerHTML = `<span><i class="fa-solid fa-database"></i> Base local pronta</span><span class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Consultando Freshdesk</span>`;
    try {
      const response = await fetch(`${API_BASE}/freshdesk/solutions/search?term=${encodeURIComponent(term)}&force=false`, { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) throw new Error(payload.error || payload.message || `HTTP ${response.status}`);
      const freshdesk = payload.combined || payload.articles || payload.results || payload.freshdesk || [];
      state.freshdeskResults = Array.isArray(freshdesk) ? freshdesk : [];
      if (status) status.innerHTML = `<span><i class="fa-solid fa-database"></i> Base local pronta</span><span class="ok"><i class="fa-solid fa-cloud-check"></i> Freshdesk consultado</span>`;
    } catch (error) {
      state.freshdeskResults = [];
      if (status) status.innerHTML = `<span><i class="fa-solid fa-database"></i> Base local pronta</span><span class="warn"><i class="fa-solid fa-cloud-exclamation"></i> Freshdesk indisponível: usando local</span>`;
    }
    renderResults();
  }

  function runSearch({ freshdesk = false, syncManual = true } = {}) {
    state.term = ($("#docSearchInput")?.value || "").trim();
    if (syncManual) syncManualRouter(state.term);
    renderResults();
    if (freshdesk && state.term.length >= 3) fetchFreshdeskResults(state.term);
  }

  function bind() {
    const input = $("#docSearchInput");
    input?.addEventListener("input", () => {
      state.freshdeskResults = [];
      state.freshdeskLoadedFor = "";
      runSearch({ freshdesk: false, syncManual: true });
    });
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        runSearch({ freshdesk: true, syncManual: true });
        $("#knowledge-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    $("#knowledgeSearchButton")?.addEventListener("click", () => {
      runSearch({ freshdesk: true, syncManual: true });
      $("#knowledge-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.querySelector(".rw-search-trigger")?.addEventListener("click", (event) => {
      event.preventDefault();
      input?.focus();
      $("#help-search")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $$('[data-knowledge-query]').forEach((button) => {
      button.addEventListener("click", () => {
        if (input) input.value = button.dataset.knowledgeQuery || "";
        runSearch({ freshdesk: true, syncManual: true });
        $("#knowledge-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    const manualInput = $("#manualSearchInput");
    manualInput?.addEventListener("input", () => {
      const term = manualInput.value.trim();
      if (input && input.value.trim() !== term) input.value = term;
      state.term = term;
      renderResults();
    });
    $$('[data-knowledge-filter]').forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.knowledgeFilter || "all";
        $$('[data-knowledge-filter]').forEach((btn) => btn.classList.toggle("active", btn === button));
        renderResults();
      });
    });
    document.addEventListener("click", (event) => {
      const key = event.target.closest("[data-knowledge-copy]")?.dataset.knowledgeCopy;
      if (!key) return;
      const [source, id] = key.split(":");
      const item = allItems().find((entry) => String(entry.source) === source && String(entry.id) === id);
      if (item) copyResult(item);
    });
    renderResults();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
