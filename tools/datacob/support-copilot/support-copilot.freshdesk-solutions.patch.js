/* PATCH v2.7.8 - cole/adapte no support-copilot.js
   Objetivo: buscar artigos reais do Freshdesk e abrir link direto. */

async function searchFreshdeskSolutionsFromCopilot(term) {
  const query = String(term || '').trim();
  if (!query) {
    showCopilotToast?.('Informe um termo para buscar na base.', 'Digite parte do título do artigo ou palavra-chave.', 'warning');
    return [];
  }

  const base = window.ARRIBA_API_BASE || 'https://api.arriba.jm.dev.br';
  const url = `${base}/freshdesk/solutions/search?term=${encodeURIComponent(query)}&lang=pt-BR&limit=10`;

  try {
    setCopilotStep?.('base');
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.message || 'Falha ao buscar Freshdesk Solutions.');

    renderFreshdeskSolutionResults(payload.results || []);
    showCopilotToast?.('Base Freshdesk consultada', `${payload.total || 0} artigo(s) encontrado(s).`, 'success');
    return payload.results || [];
  } catch (error) {
    renderFreshdeskSolutionResults([], error.message);
    showCopilotToast?.('Não foi possível consultar a base Freshdesk', 'A busca local continua disponível. Verifique permissões/API depois.', 'warning');
    return [];
  }
}

function renderFreshdeskSolutionResults(results, errorMessage = '') {
  const container = document.querySelector('[data-freshdesk-solutions-results]') || document.querySelector('#freshdeskSolutionsResults');
  if (!container) return;

  if (errorMessage) {
    container.innerHTML = `<div class="rw-soft-alert rw-soft-alert-warning"><strong>Freshdesk indisponível:</strong> ${escapeHtml(errorMessage)}</div>`;
    return;
  }

  if (!results.length) {
    container.innerHTML = `<div class="rw-empty-soft">Nenhum artigo Freshdesk encontrado para esse termo.</div>`;
    return;
  }

  container.innerHTML = results.map((article) => `
    <article class="rw-kb-result-card rw-kb-result-card--freshdesk">
      <div>
        <span class="rw-kb-source">Freshdesk Solutions</span>
        <h4>${escapeHtml(article.title || 'Artigo Freshdesk')}</h4>
        <p>${escapeHtml((article.description || '').slice(0, 220))}${(article.description || '').length > 220 ? '...' : ''}</p>
        <small>ID ${escapeHtml(article.articleId || article.id || '')} • Score ${escapeHtml(article.score || 0)}</small>
      </div>
      <div class="rw-kb-actions">
        <a class="btn btn-outline-light btn-sm" href="${escapeAttr(article.freshdeskUrl || article.url)}" target="_blank" rel="noopener">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir Freshdesk
        </a>
        <button class="btn btn-outline-light btn-sm" type="button" onclick="navigator.clipboard.writeText('${escapeAttr(article.freshdeskUrl || article.url)}')">
          <i class="fa-regular fa-copy"></i> Copiar link
        </button>
      </div>
    </article>
  `).join('');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
