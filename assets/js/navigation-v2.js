/* =====================================================================
   Menu e busca — FONTE ÚNICA dos nomes que aparecem no site.

   Regra de nome (nov/2026): cada rótulo diz O QUE A FERRAMENTA FAZ, em
   português, para quem não conhece o domínio — um recrutador tem de
   entender sem perguntar. Sigla de nicho (CNAB, JWT) vai junto de uma
   explicação; código interno ("Track 7", "DX001") não aparece.

   Os CAMINHOS dos arquivos não mudaram: só o texto. Renomear pasta
   quebraria link e import relativo (ver CLAUDE.md).
   ===================================================================== */
const menuData = {
    plataforma: {
        label: "Sobre o projeto",
        children: {
            overview: {
                label: "Visão geral",
                badge: "Comece aqui",
                title: "Arriba Platform",
                description: "Protótipo de estudos com ferramentas que rodam inteiras no navegador: validação de arquivos, SQL, editor web e um chat com IA.",
                links: [
                    ["Página inicial", "index.html"],
                    ["Sobre o autor", "pages/about/about_jonathan.html", true],
                    ["Como o site foi construído", "pages/case-study/arriba-platform.html", true],
                    ["Todos os estudos de caso", "pages/case-study/index.html", true]
                ]
            },
            cases: {
                label: "Estudos de caso",
                badge: "Decisões técnicas",
                title: "Estudos de caso",
                description: "O problema, a decisão tomada e o porquê de cada parte do projeto.",
                links: [
                    ["Arquitetura do site", "pages/case-study/arriba-platform.html", true],
                    ["Chatbot com IA", "pages/case-study/chatbot-ai.html", true],
                    ["Deploy e DNS (Vercel, Render, Cloudflare)", "pages/case-study/deploy-cloud.html", true]
                ]
            }
        }
    },
    ferramentas: {
        label: "Ferramentas",
        children: {
            validar: {
                label: "Validar arquivos",
                badge: "Validação",
                title: "Validar arquivos",
                description: "Confere o arquivo campo a campo e aponta a linha e a coluna do erro — sem enviar nada para servidor.",
                links: [
                    ["Arquivo bancário (CNAB 400)", "tools/cobranca/cnab400/cnab400.html"],
                    ["Validador de CSV", "tools/dados/csv-validator/csv-validator.html"],
                    ["Validador de JSON", "tools/dados/json-validator/json_validator.html"]
                ]
            },
            gerar: {
                label: "Gerar dados de teste",
                badge: "Massa de teste",
                title: "Gerar dados de teste",
                description: "Cria arquivos e documentos de exemplo com dados inventados, para testar sem usar dado de pessoa real.",
                links: [
                    ["Gerador de dados fictícios (CPF, nome, endereço)", "tools/cobranca/massa-dados/massa-dados.html"],
                    ["Gerador de CSV por layout", "tools/cobranca/arriba-csv-generator/csv-template-generator.html"],
                    ["Editor de cartas com variáveis", "tools/cobranca/modelo-carta-decoder/modelo-carta-builder.html"],
                    ["Leitor de cartas modelo", "tools/cobranca/modelo-carta-decoder/modelo-carta-decoder.html"]
                ]
            },
            converter: {
                label: "Converter e decodificar",
                badge: "Conversão",
                title: "Converter e decodificar",
                description: "Transforma um formato em outro e revela o que está codificado.",
                links: [
                    ["CSV para JSON", "tools/dados/csv-to-json/csv-to-json.html"],
                    ["Base64 para PDF", "tools/dados/base64-pdf/base64-pdf.html"],
                    ["Decodificador (Base64, URL, JWT, hex)", "tools/dados/decodificador/decodificador.html"],
                    ["Calculadora de hash (MD5, SHA)", "tools/dados/hash-generator/hash-generator.html"]
                ]
            },
            codigo: {
                label: "Código e SQL",
                badge: "Desenvolvimento",
                title: "Código e SQL",
                description: "Escreva e execute HTML, CSS, JavaScript e SQL no navegador, e teste a API do projeto.",
                links: [
                    ["Editor HTML, CSS e JS (preview ao vivo)", "tools/dados/editor-web/editor-web.html"],
                    ["Validar e consultar pela API (área restrita)", "tools/dados/api-privada/api-privada.html"],
                    ["SQL Playground (simulador no navegador)", "tools/cobranca/sql-playground/sql-playground.html"],
                    ["Construtor visual de consultas SQL", "tools/cobranca/query-builder/query-builder.html"]
                ]
            }
        }
    },
    aprender: {
        label: "Aprender",
        children: {
            trilhas: {
                label: "Trilhas",
                badge: "Prática",
                title: "Centro de Aprendizado",
                description: "Teoria curta, exemplo real e exercício corrigido na hora, com pontos e progresso.",
                links: [
                    ["Centro de Aprendizado", "pages/aprender/index.html", true],
                    ["Curso de SQL com exercícios", "tools/cobranca/treinamento-sql/treinamento-sql.html"],
                    ["SQL Playground", "tools/cobranca/sql-playground/sql-playground.html"],
                    ["Editor HTML, CSS e JS", "tools/dados/editor-web/editor-web.html"]
                ]
            },
            diagnostico: {
                label: "Guias de diagnóstico",
                badge: "Checklists",
                title: "Guias de diagnóstico",
                description: "Roteiros curtos para investigar um problema antes de escalar.",
                links: [
                    ["Todos os guias", "pages/docs/blog/index.html", true],
                    ["Falha de conexão com uma API", "pages/docs/blog/index.html#dx001", true],
                    ["Acesso ou credencial recusada", "pages/docs/blog/index.html#lv005", true],
                    ["Processamento interrompido", "pages/docs/blog/index.html#pr102", true]
                ]
            },
            downloads: {
                label: "Downloads",
                badge: "Arquivos",
                title: "Downloads",
                description: "Modelos e exemplos para baixar e usar nos testes.",
                links: [
                    ["Central de downloads", "pages/docs/downloads/index.html", true],
                    ["Gerador de CSV por layout", "tools/cobranca/arriba-csv-generator/csv-template-generator.html"],
                    ["Gerador de dados fictícios", "tools/cobranca/massa-dados/massa-dados.html"]
                ]
            }
        }
    },
    lab: {
        label: "Laboratório",
        children: {
            experimentos: {
                label: "Experimentos",
                badge: "Em andamento",
                title: "Laboratório",
                description: "Ideias em estágio inicial — protótipos que ainda não viraram ferramenta.",
                links: [
                    ["IA aplicada", "pages/lab/ai/index.html", true],
                    ["Portfólio em pixel art", "pages/lab/gamedev/index.html", true],
                    ["Interface e performance", "pages/lab/experiments/index.html", true],
                    ["Comportamento e UX", "pages/lab/index.html", true]
                ]
            }
        }
    }
};

/* [título, palavras-chave, caminho, rota?]
   As palavras-chave são escritas SEM acento de propósito: normalizeSearch
   tira o acento dos dois lados (ver .claude/rules/idioma-ptbr.md). */
export const searchItems = [
    ["Arquivo bancário (CNAB 400)", "cnab 400 arquivo bancario banco multi banco bradesco 237 itau 341 bmp 274 retorno remessa boleto ocorrencia liquidacao gerador leitor validador parser arquivo posicional", "tools/cobranca/cnab400/cnab400.html"],
    ["Validador de CSV", "csv validador validar arquivo delimitador ponto e virgula cabecalho coluna layout importacao erro linha duplicada cpf cnpj invalido data valor decimal aspas rfc 4180 schema estrutura planilha", "tools/dados/csv-validator/csv-validator.html"],
    ["Gerador de CSV por layout", "gerador csv carga titular contrato parcela layout recepcao modelo cabecalho exemplo arquivo", "tools/cobranca/arriba-csv-generator/csv-template-generator.html"],
    ["Gerador de dados fictícios", "massa de dados massa de teste dados ficticios fake cpf rg identidade cnpj nome telefone cep endereco email csv teste", "tools/cobranca/massa-dados/massa-dados.html"],
    ["Editor de cartas com variáveis", "carta modelo template variaveis campos editor criador documento mala direta", "tools/cobranca/modelo-carta-decoder/modelo-carta-builder.html"],
    ["Leitor de cartas modelo", "carta modelo template decodificador leitor html gzip variaveis campos impressao", "tools/cobranca/modelo-carta-decoder/modelo-carta-decoder.html"],
    ["Base64 para PDF", "base64 boleto pdf decode decodificar converter arquivo data uri json download visualizar", "tools/dados/base64-pdf/base64-pdf.html"],
    ["Validador de JSON", "json validador validar formatar indentar sintaxe erro parse", "tools/dados/json-validator/json_validator.html"],
    ["Decodificador (Base64, URL, JWT, hex)", "decodificador decode encode codificar base64 url html entities hexadecimal hex binario rot13 unicode escape jwt token json web token", "tools/dados/decodificador/decodificador.html"],
    ["Editor HTML, CSS e JS", "editor web html css javascript js try it yourself playground preview ao vivo iframe sandbox testar codigo front-end frontend pagina snippet aprender praticar", "tools/dados/editor-web/editor-web.html"],
    ["Validar e consultar pela API", "api privada backend rest endpoint validar consultar cpf cnpj alfanumerico email celular telefone cep endereco viacep brasilapi banco bancos csv json postman curl chave login area restrita render express", "tools/dados/api-privada/api-privada.html"],
    ["CSV para JSON", "csv json converter transformar tabela", "tools/dados/csv-to-json/csv-to-json.html"],
    ["Calculadora de hash", "hash md5 sha1 sha256 checksum assinatura integridade", "tools/dados/hash-generator/hash-generator.html"],
    ["Curso de SQL com exercícios", "sql tsql curso treinamento trilha licao select where join group by having quiz gamificacao exercicio sandbox", "tools/cobranca/treinamento-sql/treinamento-sql.html"],
    ["SQL Playground", "sql playground simulador sandbox alasql try it yourself consulta query historico consultas salvas schema select join group by csv", "tools/cobranca/sql-playground/sql-playground.html"],
    ["Construtor visual de consultas SQL", "sql query builder construtor consulta relatorios diagrama tabelas filtros case when tsql export xlsx csv", "tools/cobranca/query-builder/query-builder.html"],
    ["Centro de Aprendizado", "aprender centro aprendizado hub trilhas curso treinamento tutorial licoes exemplos try it yourself progresso pontos badges quiz exercicios simulador sql cnab base64", "pages/aprender/index.html", true],
    ["Guias de diagnóstico", "erros topicos diagnostico checklist troubleshooting conexao api credencial processamento blog tecnico", "pages/docs/blog/index.html", true],
    ["Downloads", "modelos arquivos exemplos baixar", "pages/docs/downloads/index.html", true],
    ["Chatbot com IA (estudo de caso)", "chat chatbot ia assistente provedores base de conhecimento streaming", "pages/case-study/chatbot-ai.html", true],
    ["Deploy e DNS (estudo de caso)", "vercel render cloudflare dns deploy hospedagem dominio", "pages/case-study/deploy-cloud.html", true],
    ["Arquitetura do site (estudo de caso)", "case arquitetura decisoes site estatico tokens fonte unica", "pages/case-study/arriba-platform.html", true],
    ["Portfólio em pixel art", "pixel art portfolio jogo gamedev", "pages/lab/gamedev/index.html", true],
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
                `).join("") : `<span class="enterprise-menu-empty">Nada aqui ainda.</span>`}
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