// js/search.js
export function initSearchBox() {
    const searchToggleBtnDesktop = document.getElementById('searchToggleBtn');
    const searchCloseBtnDesktop = document.getElementById('searchCloseBtn');
    const searchContainerDesktop = document.getElementById('searchContainer');
    const searchInputDesktop = document.getElementById('searchInput');

    const searchContainerMobile = document.getElementById('searchContainerMobile');
    const searchInputMobile = document.getElementById('searchInputMobile');
    const searchCloseBtnMobile = document.getElementById('searchCloseBtnMobile');

    const searchData = [
        {
            title: 'Validador JSON',
            url: 'json_validator.html',
            keywords: ['json', 'validar', 'formatar', 'api', 'estrutura'],
            category: 'Ferramentas'
        },
        {
            title: 'Gerador CSV Dock v.1',
            url: 'tools/arriba-csv-generator/csv-template-generator.html',
            keywords: ['csv', 'dock', 'massa', 'dados', 'contrato', 'parcela', 'financiado', 'avalista'],
            category: 'Ferramentas'
        },
        {
            title: 'Massa de Dados (Gerador Fictício CPF/CNPJ)',
            url: 'tools/massa-dados/massa-dados.html',
            keywords: ['cpf', 'cnpj', 'massa', 'dados', 'ficticio', 'json', 'teste', 'mock'],
            category: 'Ferramentas'
        },
        {
            title: 'Erros DataCob',
            url: 'erros/erros-datacob.html',
            keywords: ['erros', 'datacob', 'crm', 'falha', 'licenca', 'troubleshooting'],
            category: 'Documentação'
        },
        {
            title: 'API de Notificações',
            url: '#',
            keywords: ['api', 'notificacoes', 'webhook', 'mensagens'],
            category: 'APIs'
        },
        {
            title: 'API de Pagamentos (Mock)',
            url: '#',
            keywords: ['api', 'pagamentos', 'mock', 'teste'],
            category: 'APIs'
        },
        {
            title: 'API de Clima',
            url: '#',
            keywords: ['api', 'clima', 'tempo', 'weather'],
            category: 'APIs'
        },
        {
            title: 'API de Cotação de Moedas',
            url: '#',
            keywords: ['api', 'cotacao', 'moedas', 'cambio'],
            category: 'APIs'
        }
    ];

    if (typeof Fuse === 'undefined') {
        console.warn('Fuse.js não foi carregado. Adicione o CDN antes do main.js.');
        return;
    }

    const fuse = new Fuse(searchData, {
        includeScore: true,
        threshold: 0.38,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
            { name: 'title', weight: 0.7 },
            { name: 'keywords', weight: 0.3 }
        ]
    });

    const desktopSuggestions = createSuggestionsBox(searchContainerDesktop, 'searchSuggestionsDesktop');
    const mobileSuggestions = createSuggestionsBox(searchContainerMobile, 'searchSuggestionsMobile');

    if (searchToggleBtnDesktop && searchContainerDesktop && searchInputDesktop) {
        searchToggleBtnDesktop.addEventListener('click', function (event) {
            event.preventDefault();
            searchContainerDesktop.classList.add('search-active');
            searchInputDesktop.focus();
        });
    }

    if (searchCloseBtnDesktop && searchContainerDesktop && searchInputDesktop) {
        searchCloseBtnDesktop.addEventListener('click', function (event) {
            event.preventDefault();
            searchContainerDesktop.classList.remove('search-active');
            searchInputDesktop.value = '';
            clearSuggestions(desktopSuggestions);
        });
    }

    if (searchInputDesktop) {
        bindSearchInput(searchInputDesktop, desktopSuggestions, fuse, searchContainerDesktop, true);
    }

    if (searchInputMobile) {
        bindSearchInput(searchInputMobile, mobileSuggestions, fuse, searchContainerMobile, false);
    }

    if (searchCloseBtnMobile && searchInputMobile) {
        searchCloseBtnMobile.addEventListener('click', function (event) {
            event.preventDefault();
            searchInputMobile.value = '';
            clearSuggestions(mobileSuggestions);
        });
    }

    document.addEventListener('click', function (event) {
        const clickedInsideDesktop = searchContainerDesktop && searchContainerDesktop.contains(event.target);
        const clickedInsideDesktopSuggestions = desktopSuggestions && desktopSuggestions.contains(event.target);
        const clickedDesktopToggle = searchToggleBtnDesktop && searchToggleBtnDesktop.contains(event.target);

        if (!clickedInsideDesktop && !clickedInsideDesktopSuggestions && !clickedDesktopToggle) {
            if (searchContainerDesktop) {
                searchContainerDesktop.classList.remove('search-active');
            }
            if (searchInputDesktop) {
                searchInputDesktop.value = '';
            }
            clearSuggestions(desktopSuggestions);
        }

        const clickedInsideMobile = searchContainerMobile && searchContainerMobile.contains(event.target);
        const clickedInsideMobileSuggestions = mobileSuggestions && mobileSuggestions.contains(event.target);

        if (!clickedInsideMobile && !clickedInsideMobileSuggestions) {
            clearSuggestions(mobileSuggestions);
        }
    });
}

function bindSearchInput(inputEl, suggestionsEl, fuse, containerEl, closeOnEnter = false) {
    inputEl.addEventListener('input', function () {
        const query = inputEl.value.trim();

        if (query.length < 2) {
            clearSuggestions(suggestionsEl);
            return;
        }

        const results = fuse.search(query, { limit: 6 });
        renderSuggestions(results, query, suggestionsEl, inputEl);
    });

    inputEl.addEventListener('keydown', function (event) {
        const items = suggestionsEl ? suggestionsEl.querySelectorAll('.search-suggestion-item') : [];
        const activeItem = suggestionsEl ? suggestionsEl.querySelector('.search-suggestion-item.active') : null;
        let currentIndex = Array.from(items).indexOf(activeItem);

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!items.length) return;

            currentIndex = (currentIndex + 1) % items.length;
            setActiveSuggestion(items, currentIndex);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!items.length) return;

            currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            setActiveSuggestion(items, currentIndex);
        }

        if (event.key === 'Enter') {
            event.preventDefault();

            if (activeItem) {
                const url = activeItem.dataset.url;
                if (url && url !== '#') {
                    window.location.href = url;
                    return;
                }
            }

            const query = inputEl.value.trim();
            if (!query) return;

            const bestResult = typeof Fuse !== 'undefined'
                ? new Fuse(getSearchDataFallback(), {
                    includeScore: true,
                    threshold: 0.38,
                    ignoreLocation: true,
                    keys: ['title', 'keywords']
                }).search(query, { limit: 1 })
                : [];

            if (bestResult.length && bestResult[0].item.url && bestResult[0].item.url !== '#') {
                window.location.href = bestResult[0].item.url;
            } else {
                performSearch(query);
            }

            if (closeOnEnter && containerEl) {
                containerEl.classList.remove('search-active');
            }

            clearSuggestions(suggestionsEl);
        }

        if (event.key === 'Escape') {
            clearSuggestions(suggestionsEl);
            if (closeOnEnter && containerEl) {
                containerEl.classList.remove('search-active');
            }
        }
    });
}

function renderSuggestions(results, query, container, inputEl) {
    if (!container) return;

    clearSuggestions(container);

    if (!results.length) {
        container.innerHTML = `
            <div class="search-suggestion-empty">
                Nenhum resultado para <strong>${escapeHtml(query)}</strong>.
            </div>
        `;
        container.classList.add('show');
        return;
    }

    const bestMatch = results[0].item;

    const suggestionHeader = document.createElement('div');
    suggestionHeader.className = 'search-suggestion-header';
    suggestionHeader.innerHTML = `Você quis dizer: <strong>${escapeHtml(bestMatch.title)}</strong>?`;
    container.appendChild(suggestionHeader);

    results.forEach((result, index) => {
        const item = result.item;
        const button = document.createElement(item.url && item.url !== '#' ? 'a' : 'button');

        button.className = 'search-suggestion-item';
        button.dataset.url = item.url || '#';
        button.type = 'button';

        if (button.tagName.toLowerCase() === 'a') {
            button.href = item.url;
        }

        button.innerHTML = `
            <div class="search-suggestion-title">${escapeHtml(item.title)}</div>
            <div class="search-suggestion-meta">
                <span>${escapeHtml(item.category || 'Resultado')}</span>
                <span>•</span>
                <span>${escapeHtml((item.keywords || []).slice(0, 3).join(', '))}</span>
            </div>
        `;

        button.addEventListener('mouseenter', () => {
            const allItems = container.querySelectorAll('.search-suggestion-item');
            allItems.forEach(el => el.classList.remove('active'));
            button.classList.add('active');
        });

        button.addEventListener('click', (event) => {
            if (!item.url || item.url === '#') {
                event.preventDefault();
                inputEl.value = item.title;
                clearSuggestions(container);
                performSearch(item.title);
            }
        });

        if (index === 0) {
            button.classList.add('active');
        }

        container.appendChild(button);
    });

    container.classList.add('show');
}

function createSuggestionsBox(parent, id) {
    if (!parent) return null;

    let box = document.getElementById(id);
    if (box) return box;

    box = document.createElement('div');
    box.id = id;
    box.className = 'search-suggestions-box';
    parent.appendChild(box);

    injectSuggestionStyles();
    return box;
}

function clearSuggestions(container) {
    if (!container) return;
    container.innerHTML = '';
    container.classList.remove('show');
}

function setActiveSuggestion(items, index) {
    items.forEach(item => item.classList.remove('active'));
    if (items[index]) {
        items[index].classList.add('active');
        items[index].scrollIntoView({ block: 'nearest' });
    }
}

function performSearch(query) {
    if (query.trim() === '') return;
    alert('Função de pesquisa ativada! Termo: ' + query);
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getSearchDataFallback() {
    return [
        {
            title: 'Validador JSON',
            url: 'json_validator.html',
            keywords: ['json', 'validar', 'formatar', 'api'],
            category: 'Ferramentas'
        },
        {
            title: 'Gerador CSV Dock v.1',
            url: 'tools/arriba-csv-generator/csv-template-generator.html',
            keywords: ['csv', 'dock', 'massa', 'dados', 'contrato', 'parcela'],
            category: 'Ferramentas'
        },
        {
            title: 'Massa de Dados (Gerador Fictício CPF/CNPJ)',
            url: 'tools/massa-dados/massa-dados.html',
            keywords: ['cpf', 'cnpj', 'massa', 'dados', 'ficticio'],
            category: 'Ferramentas'
        },
        {
            title: 'Erros DataCob',
            url: 'erros/erros-datacob.html',
            keywords: ['erros', 'datacob', 'crm'],
            category: 'Documentação'
        }
    ];
}

let suggestionStylesInjected = false;

function injectSuggestionStyles() {
    if (suggestionStylesInjected) return;
    suggestionStylesInjected = true;

    const style = document.createElement('style');
    style.textContent = `
        .search-suggestions-box {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            background: #fff;
            border: 1px solid rgba(0,0,0,.08);
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,.12);
            overflow: hidden;
            z-index: 2000;
            display: none;
        }

        .search-suggestions-box.show {
            display: block;
        }

        .search-suggestion-header {
            padding: 10px 14px;
            font-size: 12px;
            color: #666;
            background: #f8f9fb;
            border-bottom: 1px solid rgba(0,0,0,.06);
        }

        .search-suggestion-item {
            display: block;
            width: 100%;
            text-align: left;
            padding: 12px 14px;
            border: 0;
            background: #fff;
            text-decoration: none;
            color: #222;
            cursor: pointer;
            transition: background-color .18s ease;
        }

        .search-suggestion-item:hover,
        .search-suggestion-item.active {
            background: #f2f5fa;
            color: #111;
        }

        .search-suggestion-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 2px;
        }

        .search-suggestion-meta {
            font-size: 12px;
            color: #777;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }

        .search-suggestion-empty {
            padding: 14px;
            font-size: 13px;
            color: #666;
            background: #fff;
        }

        body.dark-mode .search-suggestions-box {
            background: #171a21;
            border-color: #2a2f3a;
            box-shadow: 0 10px 30px rgba(0,0,0,.35);
        }

        body.dark-mode .search-suggestion-header {
            background: #101319;
            color: #b8c0cc;
            border-bottom-color: #2a2f3a;
        }

        body.dark-mode .search-suggestion-item {
            background: #171a21;
            color: #e6e6e6;
        }

        body.dark-mode .search-suggestion-item:hover,
        body.dark-mode .search-suggestion-item.active {
            background: #222836;
            color: #fff;
        }

        body.dark-mode .search-suggestion-meta,
        body.dark-mode .search-suggestion-empty {
            color: #aab2bf;
        }

        @media (max-width: 991.98px) {
            .search-suggestions-box {
                position: static;
                margin-top: 10px;
            }
        }
    `;
    document.head.appendChild(style);
}