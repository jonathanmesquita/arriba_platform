const menuData = {
    plataforma: {
        label: "Plataforma",
        children: {
            overview: {
                label: "Visão geral",
                badge: "Produto",
                title: "Arriba Platform",
                description: "Portal técnico com ferramentas, documentação, cases, labs e assistente inteligente.",
                links: [
                    ["Visão geral", "index.html"],
                    ["Arquitetura da plataforma", "pages/case-study/arriba-platform.html", true],
                    ["Sobre Jonathan", "pages/about/about_jonathan.html", true]
                ]
            },
            cases: {
                label: "Case Study",
                badge: "Portfolio",
                title: "Cases técnicos",
                description: "Documentação de decisões técnicas, arquitetura, deploy e IA.",
                links: [
                    ["Todos os cases", "pages/case-study/index.html", true],
                    ["Arriba Platform", "pages/case-study/arriba-platform.html", true],
                    ["Chatbot AI", "pages/case-study/chatbot-ai.html", true],
                    ["Deploy Cloud", "pages/case-study/deploy-cloud.html", true]
                ]
            }
        }
    },
    ferramentas: {
        label: "Ferramentas",
        children: {
            dados: {
                label: "Dados",
                badge: "Utilitários",
                title: "Ferramentas de dados",
                description: "Validadores, conversores e utilitários para a rotina técnica.",
                links: [
                    ["Validador JSON", "tools/dados/json-validator/json_validator.html"],
                    ["Validador de CSV", "tools/dados/csv-validator/csv-validator.html"],
                    ["CSV para JSON", "tools/dados/csv-to-json/csv-to-json.html"],
                    ["Calculadora de Hash", "tools/dados/hash-generator/hash-generator.html"],
                    ["Boleto Base64 → PDF", "tools/dados/base64-pdf/base64-pdf.html"],
                    ["Decodificador Universal", "tools/dados/decodificador/decodificador.html"],
                    ["Editor Web (HTML/CSS/JS)", "tools/dados/editor-web/editor-web.html"],
                    ["Descriptografador (MD5 + 3DES)", "https://decrypt.jm.dev.br/"],
                ]
            },
            crms: {
                label: "Cobrança",
                badge: "Domínio",
                title: "Ferramentas de cobrança",
                description: "Arquivo bancário, geração de CSV, massa fictícia e SQL — o domínio usado como estudo de caso.",
                links: [
                    ["Validador CNAB 400", "tools/cobranca/cnab400/cnab400.html"],
                    ["Gerador de CSV", "tools/cobranca/arriba-csv-generator/csv-template-generator.html"],
                    ["Validador de CSV", "tools/dados/csv-validator/csv-validator.html"],
                    ["Massa de Dados", "tools/cobranca/massa-dados/massa-dados.html"],
                    ["Modelo de Carta · decodificador", "tools/cobranca/modelo-carta-decoder/modelo-carta-decoder.html"],
                    ["Modelo de Carta · criador", "tools/cobranca/modelo-carta-decoder/modelo-carta-builder.html"],
                    ["Treinamento SQL", "tools/cobranca/treinamento-sql/treinamento-sql.html"],
                    ["SQL Playground", "tools/cobranca/sql-playground/sql-playground.html"],
                    ["Gerador de consulta T-SQL", "tools/cobranca/query-builder/query-builder.html"]
                ]
            },
            cloudtools: {
                label: "Cloud",
                badge: "Deploy",
                title: "Ferramentas Cloud",
                description: "Acesso rápido à API, Render, Vercel, Cloudflare e documentação técnica.",
                links: [
                    ["Deploy Cloud", "pages/case-study/deploy-cloud.html", true],
                    ["Arquitetura da plataforma", "pages/case-study/arriba-platform.html", true],
                    ["Chatbot AI", "pages/case-study/chatbot-ai.html", true]
                ]
            }
        }
    },
    docs: {
        label: "Documentação",
        children: {
            aprender: {
                label: "Aprender",
                badge: "Trilhas",
                title: "Centro de Aprendizado",
                description: "Trilhas com teoria, exemplos e simulador para praticar na hora.",
                links: [
                    ["Centro de Aprendizado", "pages/aprender/index.html", true],
                    ["Track 7 · Treinamento SQL", "tools/cobranca/treinamento-sql/treinamento-sql.html"],
                    ["SQL Playground", "tools/cobranca/sql-playground/sql-playground.html"],
                    ["Editor Web (HTML/CSS/JS)", "tools/dados/editor-web/editor-web.html"]
                ]
            },
            help: {
                label: "Troubleshooting",
                badge: "Blog",
                title: "Erros e tópicos",
                description: "Anotações de diagnóstico em formato de blog técnico.",
                links: [
                    ["Blog de troubleshooting", "pages/docs/blog/index.html", true]
                ]
            },
            downloads: {
                label: "Downloads",
                badge: "Arquivos",
                title: "Downloads",
                description: "Modelos, exemplos e arquivos úteis para operação e testes.",
                links: [
                    ["Central de Downloads", "pages/docs/downloads/index.html", true],
                    ["Gerador de CSV", "tools/cobranca/arriba-csv-generator/csv-template-generator.html"],
                    ["Validador de CSV", "tools/dados/csv-validator/csv-validator.html"],
                    ["Massa de Dados", "tools/cobranca/massa-dados/massa-dados.html"]
                ]
            },
            errors: {
                label: "Erros e tópicos",
                badge: "Blog",
                title: "Erros e documentação",
                description: "Pesquise erros e encontre tópicos em formato de blog técnico.",
                links: [
                    ["Erro DX001 - Falha de conexão", "pages/docs/blog/index.html#dx001", true],
                    ["Erro LV005 - Licença inválida", "pages/docs/blog/index.html#lv005", true],
                    ["Erro PR102 - Processamento interrompido", "pages/docs/blog/index.html#pr102", true]
                ]
            }
        }
    },
    cloud: {
        label: "DevOps e Cloud",
        children: {
            deploy: {
                label: "Deploy",
                badge: "Cloud",
                title: "Deploy e DNS",
                description: "Vercel, Render, Cloudflare e dominio proprio.",
                links: [
                    ["Deploy Cloud", "pages/case-study/deploy-cloud.html", true],
                    ["Arquitetura da plataforma", "pages/case-study/arriba-platform.html", true]
                ]
            },
            api: {
                label: "IA",
                badge: "Protótipo",
                title: "Assistentes e IA",
                description: "Chat multi-provedor com base de conhecimento, histórico e painel de administração.",
                links: [
                    ["Chatbot AI", "pages/case-study/chatbot-ai.html", true],
                    ["Centro de Aprendizado", "pages/aprender/index.html", true]
                ]
            }
        }
    },
    lab: {
        label: "Lab / Portfólios",
        children: {
            personal: {
                label: "Portfolios",
                badge: "Lab",
                title: "Projetos pessoais",
                description: "GameDev, IA e experimentos.",
                links: [
                    ["Lab Psicologia", "pages/lab/index.html", true],
                    ["Portfolio GameDev", "pages/lab/gamedev/index.html", true],
                    ["Lab IA", "pages/lab/ai/index.html", true]
                ]
            }
        }
    }
};

export const searchItems = [
    ["Validador CNAB 400", "cnab 400 multi banco bradesco 237 itau 341 bmp 274 retorno remessa boleto ocorrencia liquidacao gerador leitor validador parser arquivo posicional", "tools/cobranca/cnab400/cnab400.html"],
    ["Validador de CSV", "csv validador validar arquivo delimitador ponto e virgula cabecalho coluna layout importacao erro linha duplicada cpf cnpj invalido data valor decimal aspas rfc 4180 schema estrutura planilha", "tools/dados/csv-validator/csv-validator.html"],
    ["Gerador de CSV", "gerador csv carga titular contrato parcela layout recepcao modelo cabecalho", "tools/cobranca/arriba-csv-generator/csv-template-generator.html"],
    ["Massa de Dados", "dados ficticios fake cpf cnpj nome telefone cep endereco email csv teste", "tools/cobranca/massa-dados/massa-dados.html"],
    ["Modelo de Carta", "modelo carta decodificador criador template variaveis campos impressao", "tools/cobranca/modelo-carta-decoder/modelo-carta-decoder.html"],
    ["Boleto Base64 → PDF", "base64 boleto pdf decode decodificar converter arquivo data uri json download visualizar", "tools/dados/base64-pdf/base64-pdf.html"],
    ["Validador de JSON", "json validador validar formatar indentar sintaxe erro parse", "tools/dados/json-validator/json_validator.html"],
    ["Decodificador Universal", "decodificador decode encode codificar base64 url html entities hexadecimal hex binario rot13 unicode escape jwt token json web token", "tools/dados/decodificador/decodificador.html"],
    ["Editor Web (HTML/CSS/JS)", "editor web html css javascript js try it yourself playground preview ao vivo iframe sandbox testar codigo front-end frontend pagina snippet aprender praticar", "tools/dados/editor-web/editor-web.html"],
    ["CSV para JSON", "csv json converter transformar tabela", "tools/dados/csv-to-json/csv-to-json.html"],
    ["Calculadora de Hash", "hash md5 sha1 sha256 checksum assinatura", "tools/dados/hash-generator/hash-generator.html"],
    ["Treinamento SQL", "sql tsql treinamento curso licao select where join group by having quiz gamificacao exercicio sandbox", "tools/cobranca/treinamento-sql/treinamento-sql.html"],
    ["SQL Playground", "sql playground simulador sandbox alasql try it yourself consulta query historico consultas salvas schema select join group by csv", "tools/cobranca/sql-playground/sql-playground.html"],
    ["Gerador de consulta T-SQL", "sql query builder relatorios diagrama tabelas filtros case when tsql export xlsx csv", "tools/cobranca/query-builder/query-builder.html"],
    ["Centro de Aprendizado", "aprender centro aprendizado hub trilhas curso treinamento tutorial licoes exemplos try it yourself progresso pontos badges quiz exercicios simulador sql cnab base64", "pages/aprender/index.html"],
    ["Blog de troubleshooting", "erros topicos diagnostico blog tecnico", "pages/docs/blog/index.html", true],
    ["Downloads", "modelos arquivos exemplos", "pages/docs/downloads/index.html", true],
    ["Chatbot AI", "chat ia assistente provedores base de conhecimento streaming", "pages/case-study/chatbot-ai.html", true],
    ["Deploy Cloud", "vercel render cloudflare dns deploy", "pages/case-study/deploy-cloud.html", true],
    ["Arquitetura da plataforma", "case arquitetura decisoes site estatico tokens fonte unica", "pages/case-study/arriba-platform.html", true],
    ["Descriptografador (MD5 + 3DES)", "descriptografador decrypt senha criptografada md5 3des hexadecimal base64 chave salt", "https://decrypt.jm.dev.br/"],
    ["Lab GameDev", "pixel art portfolio jogo", "pages/lab/gamedev/index.html", true],
];

function normalizeSearch(value = "") {
    return String(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

document.addEventListener("DOMContentLoaded", () => {
    buildEnterpriseMenu();
    setupEnterpriseMenu();
    setupSearchPanel();
    setupChatOpeners();
    syncThemeIcon();
});

function buildEnterpriseMenu() {
    const menu = document.getElementById("enterpriseMenu");
    if (!menu) return;

    menu.innerHTML = `
        <div class="enterprise-menu-header">
            <a class="rw-brand" href="index.html">ARRIBA</a>
            <button class="enterprise-menu-close" id="enterpriseMenuClose" aria-label="Fechar menu">x</button>
        </div>

        <div class="enterprise-menu-column" id="enterpriseMenuColumn"></div>
        <div class="enterprise-menu-subcolumn" id="enterpriseMenuSubcolumn"></div>
        <div class="enterprise-menu-detail" id="enterpriseMenuDetail"></div>
    `;

    const firstSection = Object.keys(menuData)[0];
    renderMenuSections(firstSection);
}

function renderMenuSections(activeSection) {
    const column = document.getElementById("enterpriseMenuColumn");
    if (!column) return;

    column.innerHTML = Object.entries(menuData).map(([key, section]) => `
        <button class="enterprise-menu-item ${key === activeSection ? "active" : ""}" data-section="${key}">
            ${section.label}
        </button>
    `).join("");

    column.querySelectorAll("[data-section]").forEach(button => {
        button.addEventListener("mouseenter", () => renderSubmenu(button.dataset.section));
        button.addEventListener("click", () => renderSubmenu(button.dataset.section));
    });

    renderSubmenu(activeSection);
}

function renderSubmenu(sectionKey) {
    const section = menuData[sectionKey];
    const columnButtons = document.querySelectorAll(".enterprise-menu-item");
    const subcolumn = document.getElementById("enterpriseMenuSubcolumn");
    if (!section || !subcolumn) return;

    columnButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.section === sectionKey);
    });

    const firstChild = Object.keys(section.children)[0];

    subcolumn.innerHTML = Object.entries(section.children).map(([key, item]) => `
        <button class="enterprise-submenu-item ${key === firstChild ? "active" : ""}" data-section="${sectionKey}" data-child="${key}">
            ${item.label}
        </button>
    `).join("");

    subcolumn.querySelectorAll("[data-child]").forEach(button => {
        button.addEventListener("mouseenter", () => renderDetail(button.dataset.section, button.dataset.child));
        button.addEventListener("click", () => renderDetail(button.dataset.section, button.dataset.child));
    });

    renderDetail(sectionKey, firstChild);
}

function renderDetail(sectionKey, childKey, activeTabKey) {
    const detail = document.getElementById("enterpriseMenuDetail");
    const item = menuData[sectionKey]?.children?.[childKey];
    if (!detail || !item) return;

    document.querySelectorAll(".enterprise-submenu-item").forEach(button => {
        button.classList.toggle("active", button.dataset.child === childKey);
    });

    const hasTabs = Array.isArray(item.tabs);
    const activeTab = hasTabs
        ? (item.tabs.find(t => t.key === activeTabKey) || item.tabs[0])
        : null;
    const links = hasTabs ? activeTab.links : item.links;

    detail.innerHTML = `
        <div class="enterprise-menu-detail-panel active">
            <span class="enterprise-menu-badge">${item.badge}</span>
            <h2>${item.title}</h2>
            <p>${item.description}</p>

            ${hasTabs ? `
            <div class="enterprise-menu-tabs" role="tablist">
                ${item.tabs.map(tab => `
                    <button type="button" class="enterprise-menu-tab ${tab.key === activeTab.key ? "active" : ""}" data-tab="${tab.key}">${tab.label}</button>
                `).join("")}
            </div>` : ""}

            <div class="enterprise-menu-detail-list">
                ${links.length ? links.map(([label, href, route]) => `
                    <a href="${href}" ${route ? "data-route" : ""}>${label}</a>
                `).join("") : `<span class="enterprise-menu-empty">Em breve: ferramentas para outros CRMs.</span>`}
            </div>

            <div class="enterprise-menu-note">
                Navegação em camadas, leve e sem travar o usuário. O menu troca de contexto ao passar o mouse ou clicar.
            </div>
        </div>
    `;

    if (hasTabs) {
        detail.querySelectorAll("[data-tab]").forEach(button => {
            button.addEventListener("click", event => {
                event.stopPropagation();
                renderDetail(sectionKey, childKey, button.dataset.tab);
            });
        });
    }
}

function setupEnterpriseMenu() {
    const toggle = document.getElementById("enterpriseMenuToggle");
    const menu = document.getElementById("enterpriseMenu");
    const backdrop = document.getElementById("enterpriseMenuBackdrop");

    function openMenu() {
        menu?.classList.add("active");
        backdrop?.classList.add("active");
        toggle?.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
        menu?.classList.remove("active");
        backdrop?.classList.remove("active");
        toggle?.setAttribute("aria-expanded", "false");
    }

    toggle?.addEventListener("click", openMenu);
    backdrop?.addEventListener("click", closeMenu);

    document.addEventListener("click", event => {
        if (event.target.closest("#enterpriseMenuClose")) closeMenu();
        const link = event.target.closest("#enterpriseMenu a");
        if (link) closeMenu();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
    });
}

/* ---------------------------------------------------------------------
   Busca do topo.

   O campo onde se digita e o campo da topbar (#topbarSearchInput) — o
   painel logo abaixo mostra SO os resultados. Antes a topbar era um
   botao falso (um <span> com o texto de placeholder) e o painel trazia
   um segundo <input>: ao clicar apareciam dois campos de busca, um em
   cima do outro. Se a pagina nao tiver o input da topbar, o painel cria
   o proprio campo (fallback para paginas que so tem #searchToggleBtn).
   --------------------------------------------------------------------- */
function setupSearchPanel() {
    const topbarInput = document.getElementById("topbarSearchInput");
    const trigger = document.getElementById("searchToggleBtn");
    if (!topbarInput && !trigger) return;

    if (!document.getElementById("oracleSearchPanel")) {
        const panel = document.createElement("div");
        panel.className = "oracle-search-panel";
        panel.id = "oracleSearchPanel";
        panel.innerHTML = `
            ${topbarInput ? "" : '<input type="search" id="oracleSearchInput" placeholder="Pesquisar erro, documentação, ferramenta ou case..." autocomplete="off" />'}
            <strong>Resultados e links rápidos</strong>
            <div class="quick-links" id="oracleSearchResults"></div>
        `;
        document.body.appendChild(panel);
    }

    const panel = document.getElementById("oracleSearchPanel");
    const input = topbarInput || document.getElementById("oracleSearchInput");
    const results = document.getElementById("oracleSearchResults");
    if (!panel || !results || !input) return;

    function renderResults(query = "") {
        const normalized = normalizeSearch(query);
        const filtered = normalized
            ? searchItems.filter(([title, keywords]) => normalizeSearch(`${title} ${keywords}`).includes(normalized))
            : searchItems.slice(0, 8);

        results.innerHTML = filtered.length
            ? filtered.map(([title, keywords, href, route]) => `<a href="${href}" ${route ? "data-route" : ""}><strong>${title}</strong><br><small>${keywords}</small></a>`).join("")
            : `<span>Nenhum resultado encontrado. Tente "CNAB", "CSV", "SQL" ou "editor".</span>`;
    }

    // Ancora o painel embaixo do campo da topbar (mesma largura), em vez
    // de deixa-lo centralizado na tela como o CSS padrao faz.
    function posicionarPainel() {
        if (!topbarInput) return;
        const caixa = topbarInput.getBoundingClientRect();
        panel.style.transform = "none";
        panel.style.left = `${Math.max(12, caixa.left)}px`;
        panel.style.top = `${caixa.bottom + 8}px`;
        panel.style.width = `${caixa.width}px`;
    }

    function abrirPainel() {
        renderResults(input.value);
        posicionarPainel();
        panel.classList.add("active");
        input.setAttribute("aria-expanded", "true");
    }

    function fecharPainel() {
        panel.classList.remove("active");
        input.setAttribute("aria-expanded", "false");
    }

    renderResults();

    trigger?.addEventListener("click", () => {
        if (topbarInput) {
            abrirPainel();
            input.focus();
            return;
        }
        if (panel.classList.contains("active")) fecharPainel();
        else abrirPainel();
    });

    if (topbarInput) {
        topbarInput.addEventListener("focus", abrirPainel);
        window.addEventListener("resize", () => {
            if (panel.classList.contains("active")) posicionarPainel();
        });
        window.addEventListener("scroll", () => {
            if (panel.classList.contains("active")) posicionarPainel();
        }, { passive: true });
    }

    input.addEventListener("input", abrirPainel);
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            const primeiro = results.querySelector("a");
            if (primeiro) primeiro.click();
        }
        if (event.key === "ArrowDown") {
            const primeiro = results.querySelector("a");
            if (primeiro) {
                event.preventDefault();
                primeiro.focus();
            }
        }
        if (event.key === "Escape") {
            // Em <input type="search"> o Esc limpa o campo por padrao, e essa
            // limpeza dispara um evento "input" que reabriria o painel. Corta
            // o comportamento nativo e fecha na mao.
            event.preventDefault();
            fecharPainel();
            input.blur();
        }
    });

    document.addEventListener("click", event => {
        if (panel.classList.contains("active") && !panel.contains(event.target)
            && event.target !== input && !event.target.closest("#searchToggleBtn")) {
            fecharPainel();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") fecharPainel();
    });

    document.addEventListener("click", event => {
        if (event.target.closest("#oracleSearchResults a")) fecharPainel();
    });
}

function setupChatOpeners() {
    const openers = [
        document.getElementById("openChatFromHero"),
        document.getElementById("openChatFromTopbar")
    ];

    openers.forEach(opener => {
        opener?.addEventListener("click", () => {
            const chatbot = document.getElementById("chatbot");
            const input = document.getElementById("chatInput");
            chatbot?.classList.remove("d-none");
            input?.focus();
        });
    });
}

function syncThemeIcon() {
    const icon = document.getElementById("themeIcon");
    if (!icon) return;

    const observer = new MutationObserver(() => {
        const dark = document.body.classList.contains("dark-mode");
        icon.classList.toggle("fa-moon", !dark);
        icon.classList.toggle("fa-sun", dark);
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}