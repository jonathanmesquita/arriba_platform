const menuData = {
    plataforma: {
        label: "Plataforma",
        children: {
            overview: {
                label: "Visao geral",
                badge: "Produto",
                title: "Arriba Platform",
                description: "Portal tecnico com ferramentas, documentacao, cases, labs e assistente inteligente.",
                links: [
                    ["Visao geral", "index.html"],
                    ["Arquitetura", "pages/case-study/arriba-platform.html", true],
                    ["Sobre Jonathan", "pages/about/about_jonathan.html", true]
                ]
            },
            cases: {
                label: "Case Study",
                badge: "Portfolio",
                title: "Cases tecnicos",
                description: "Documentacao de decisoes tecnicas, arquitetura, deploy e IA.",
                links: [
                    ["Todos os cases", "pages/case-study/index.html", true],
                    ["PH3A Support Copilot", "pages/case-study/ph3a-support-copilot.html", true],
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
                badge: "Utilitarios",
                title: "Ferramentas de dados",
                description: "Validadores, conversores e utilitarios para rotina tecnica.",
                links: [
                    ["Validador JSON", "tools/dados/json-validator.html"],
                    ["CSV para JSON", "tools/dados/csv-to-json.html"],
                    ["Calculadora de Hash", "tools/dados/hash-generator.html"]
                    ["Boleto Base64 → PDF", "tools/dados/base64-pdf/base64-pdf.html"],
                ]
            },
            datacobtools: {
                label: "DataCob",
                badge: "Operacao",
                title: "Ferramentas DataCob",
                description: "Geracao de CSV, massa ficticia, suporte e apoio operacional.",
                links: [
                    ["Gerador CSV DataCob", "tools/datacob/arriba-csv-generator/csv-template-generator.html"],
                    ["Massa de Dados", "tools/datacob/massa-dados/massa-dados.html"],
                    ["Gerador de Manual DataCob", "tools/datacob/manual-builder/manual-builder.html"],
                    ["Treinamento DataCob Cliente", "tools/datacob/treinamento-cliente/index.html"],                
                    ["Modelo Carta Decoder", "tools/datacob/modelo-carta-decoder/modelo-carta-decoder.html"],
                     ["CNAB 400 Bradesco", "tools/datacob/cnab400-bradesco/cnab400-bradesco.html"],
                     ["Support Copilot", "tools/datacob/support-copilot/support-copilot.html"],
                     ["Modelo Carta Builder", "tools/datacob/modelo-carta-decoder/modelo-carta-builder.html"],
                    ["Documentacao de erros", "pages/docs/datacob/erros-datacob.html", true]
                ]
            },
            suporte: {
                label: "Suporte",
                badge: "IA",
                title: "Ferramentas de Suporte",
                description: "Copiloto de IA para triagem de chamados, templates Freshdesk e especificacao para Desenvolvimento.",
                links: [
                    ["PH3A Support Copilot", "tools/datacob/support-copilot/support-copilot.html"],
                    ["Case Study Support Copilot", "pages/case-study/ph3a-support-copilot.html", true],
                    ["API Freshdesk Status", "https://api.arriba.jm.dev.br/freshdesk/status"]
                ]
            },
            cloudtools: {
                label: "Cloud",
                badge: "Deploy",
                title: "Ferramentas Cloud",
                description: "Acesso rapido a API, Render, Vercel, Cloudflare e documentacao tecnica.",
                links: [
                    ["API Arriba", "https://api.arriba.jm.dev.br"],
                    ["Status Freshdesk API", "https://api.arriba.jm.dev.br/freshdesk/status"],
                    ["Deploy Cloud", "pages/case-study/deploy-cloud.html", true],
                    ["Arquitetura Arriba", "pages/case-study/arriba-platform.html", true]
                ]
            }
        }
    },
    docs: {
        label: "Documentacao",
        children: {
            help: {
                label: "Help Center",
                badge: "Ajuda",
                title: "Centro de Ajuda",
                description: "Busca, topicos, tutoriais e documentacao rapida para suporte tecnico.",
                links: [
                    ["Help Center", "pages/docs/help-center/index.html", true],
                    ["Documentacao DataCob", "pages/docs/datacob/erros-datacob.html", true],
                    ["Blog de troubleshooting", "pages/docs/blog/index.html", true],
                    ["Gerador de Manual DataCob", "tools/datacob/manual-builder/manual-builder.html"]
                ]
            },
            downloads: {
                label: "Downloads",
                badge: "Arquivos",
                title: "Downloads",
                description: "Modelos, exemplos e arquivos uteis para operacao e testes.",
                links: [
                    ["Central de Downloads", "pages/docs/downloads/index.html", true],
                    ["Gerador CSV", "tools/datacob/arriba-csv-generator/csv-template-generator.html"],
                    ["Massa de Dados", "tools/datacob/massa-dados/massa-dados.html"],
                    ["Gerador de Manual DataCob", "tools/datacob/manual-builder/manual-builder.html"]
                ]
            },
            errors: {
                label: "Erros e topicos",
                badge: "Blog",
                title: "Erros e documentacao",
                description: "Pesquise erros e encontre topicos em formato de blog tecnico.",
                links: [
                    ["Erro DX001 - Falha de conexao", "pages/docs/blog/index.html#dx001", true],
                    ["Erro LV005 - Licenca invalida", "pages/docs/blog/index.html#lv005", true],
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
                    ["API Arriba", "https://api.arriba.jm.dev.br"],
                    ["Freshdesk Status", "https://api.arriba.jm.dev.br/freshdesk/status"],
                    ["Case de arquitetura", "pages/case-study/arriba-platform.html", true]
                ]
            },
            api: {
                label: "API e IA",
                badge: "Backend",
                title: "Backend e IA",
                description: "API Node, OpenAI, Freshdesk, fallback local e proximos webhooks.",
                links: [
                    ["Chatbot AI", "pages/case-study/chatbot-ai.html", true],
                    ["PH3A Support Copilot", "pages/case-study/ph3a-support-copilot.html", true],
                    ["API publica", "https://api.arriba.jm.dev.br"],
                    ["Freshdesk Status", "https://api.arriba.jm.dev.br/freshdesk/status"],
                    ["Help Center", "pages/docs/help-center/index.html", true]
                ]
            }
        }
    },
    lab: {
        label: "Lab / Portfolios",
        children: {
            personal: {
                label: "Portfolios",
                badge: "Lab",
                title: "Projetos pessoais",
                description: "GameDev, IA, psicologia e experimentos.",
                links: [
                    ["Todos os labs", "pages/lab/index.html", true],
                    ["Portfolio GameDev", "pages/lab/gamedev/index.html", true],
                    ["Lab IA", "pages/lab/ai/index.html", true],
                    ["Lab Psicologia", "pages/lab/psychology/index.html", true]
                ]
            }
        }
    }
};

const searchItems = [
    ["PH3A Support Copilot", "Freshdesk suporte IA chamados triagem templates anotacao desenvolvimento especificacao", "tools/datacob/support-copilot/support-copilot.html"],
    ["Case Support Copilot", "case study suporte clientes Freshdesk IA", "pages/case-study/ph3a-support-copilot.html", true],
    ["API Freshdesk Status", "status api freshdesk render node", "https://api.arriba.jm.dev.br/freshdesk/status"],
    ["Gerador CSV DataCob", "Carga titular contrato parcela combinada", "tools/datacob/arriba-csv-generator/csv-template-generator.html"],
    ["Massa de Dados", "Dados ficticios CPF CNPJ DataCob CSV", "tools/datacob/massa-dados/massa-dados.html"],
    ["Gerador de Manual DataCob", "manual pdf documentacao rotina passo a passo freshdesk help center", "tools/datacob/manual-builder/manual-builder.html"],
    ["Treinamento DataCob Cliente", "curso aula cliente onboarding passo a passo prints documentacao PH3A", "tools/datacob/treinamento-cliente/index.html"],
    ["CNAB 400 Bradesco", "cnab 400 retorno remessa bradesco 237 boleto ocorrencia liquidacao gerador leitor validador parser arquivo", "tools/datacob/cnab400-bradesco/cnab400-bradesco.html"],
    ["Help Center", "Ajuda documentacao suporte", "pages/docs/help-center/index.html", true],
    ["Cadastro Nova Carteira DataCob", "nova carteira grupo cliente fase regua boleto ocorrencia calculo acordo recibo layout padrao", "tools/datacob/support-copilot/docs/datacob-manuais/carteira/cadastro-nova-carteira-datacob/"],
    ["API DataCob Token Usuarios", "api datacob swagger token usuario api key login ativar desativar 400 403", "tools/datacob/support-copilot/docs/datacob-manuais/api/cadastro-token-usuarios-datacob/"],
    ["Downloads", "Modelos arquivos exemplos", "pages/docs/downloads/index.html", true],
    ["Erro DX001", "Falha de conexao DataCob CRM", "pages/docs/blog/index.html#dx001", true],
    ["Erro LV005", "Licenca invalida DataCob", "pages/docs/blog/index.html#lv005", true],
    ["Erro PR102", "Processamento interrompido DataCob", "pages/docs/blog/index.html#pr102", true],
    ["Chatbot AI", "OpenAI fallback local modos", "pages/case-study/chatbot-ai.html", true],
    ["Deploy Cloud", "Vercel Render Cloudflare DNS", "pages/case-study/deploy-cloud.html", true],
    ["API Arriba", "Node Render OpenAI Freshdesk backend", "https://api.arriba.jm.dev.br"],
    ["Lab GameDev", "Pixel art Windows 98 portfolio", "pages/lab/gamedev/index.html", true]
    ["Boleto Base64 → PDF", "base64 boleto pdf decode decodificar converter arquivo data uri json api resposta chamado suporte download visualizar guru", "tools/dados/base64-pdf/base64-pdf.html"],
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

function renderDetail(sectionKey, childKey) {
    const detail = document.getElementById("enterpriseMenuDetail");
    const item = menuData[sectionKey]?.children?.[childKey];
    if (!detail || !item) return;

    document.querySelectorAll(".enterprise-submenu-item").forEach(button => {
        button.classList.toggle("active", button.dataset.child === childKey);
    });

    detail.innerHTML = `
        <div class="enterprise-menu-detail-panel active">
            <span class="enterprise-menu-badge">${item.badge}</span>
            <h2>${item.title}</h2>
            <p>${item.description}</p>

            <div class="enterprise-menu-detail-list">
                ${item.links.map(([label, href, route]) => `
                    <a href="${href}" ${route ? "data-route" : ""}>${label}</a>
                `).join("")}
            </div>

            <div class="enterprise-menu-note">
                Navegacao em camadas, leve e sem travar o usuario. O menu troca de contexto ao passar o mouse ou clicar.
            </div>
        </div>
    `;
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

function setupSearchPanel() {
    if (!document.getElementById("oracleSearchPanel")) {
        const panel = document.createElement("div");
        panel.className = "oracle-search-panel";
        panel.id = "oracleSearchPanel";
        panel.innerHTML = `
            <input type="text" id="oracleSearchInput" placeholder="Pesquisar erro, documentacao, ferramenta ou case..." />
            <strong>Resultados e links rapidos</strong>
            <div class="quick-links" id="oracleSearchResults"></div>
        `;
        document.body.appendChild(panel);
    }

    const trigger = document.getElementById("searchToggleBtn");
    const panel = document.getElementById("oracleSearchPanel");
    const input = document.getElementById("oracleSearchInput");
    const results = document.getElementById("oracleSearchResults");
    if (!panel || !results) return;

    function renderResults(query = "") {
        const normalized = normalizeSearch(query);
        const filtered = normalized
            ? searchItems.filter(([title, keywords]) => normalizeSearch(`${title} ${keywords}`).includes(normalized))
            : searchItems.slice(0, 8);

        results.innerHTML = filtered.length
            ? filtered.map(([title, keywords, href, route]) => `<a href="${href}" ${route ? "data-route" : ""}><strong>${title}</strong><br><small>${keywords}</small></a>`).join("")
            : `<span>Nenhum resultado encontrado. Tente "DataCob", "Freshdesk", "Cloud", "CSV" ou "IA".</span>`;
    }

    renderResults();

    trigger?.addEventListener("click", () => {
        panel.classList.toggle("active");
        renderResults();
        if (panel.classList.contains("active")) input?.focus();
    });

    input?.addEventListener("input", () => renderResults(input.value));
    input?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            const first = results.querySelector("a");
            if (first) first.click();
        }
    });

    document.addEventListener("click", event => {
        if (panel.classList.contains("active") && !panel.contains(event.target) && !event.target.closest("#searchToggleBtn")) {
            panel.classList.remove("active");
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") panel.classList.remove("active");
    });

    document.addEventListener("click", event => {
        if (event.target.closest("#oracleSearchResults a")) panel.classList.remove("active");
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