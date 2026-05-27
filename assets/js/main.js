// js/main.js
import { initThemeToggle } from './theme.js';
import { initSearchBox } from './search.js';
import { initChatbot } from './chatbot.js';
import { initLanguageModal } from './language.js';
import { initMegaMenu } from './megaMenu.js';

document.addEventListener('DOMContentLoaded', function () {
    // Torna o objeto Bootstrap acessível globalmente para módulos
    // Isso é crucial porque `type="module"` isola o escopo e o Bootstrap é carregado globalmente.
    if (typeof bootstrap !== 'undefined') {
        window.bootstrap = bootstrap;
    }

    // Inicializa todos os módulos
    initThemeToggle();
    initSearchBox();
    initChatbot();
    initLanguageModal();
    initMegaMenu();

    // Ocultar a caixa de pesquisa ao carregar a página (comportamento global)
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.classList.add('search-closed');
    }

    // Lógica específica da página inicial, se houver
    // (Este bloco está OK, sem necessidade de alteração funcional)
    const welcomeText = document.getElementById('welcomeText');
    const selectToolText = document.getElementById('selectToolText');
    if (welcomeText && selectToolText && (window.location.pathname === '/' || window.location.pathname.endsWith('index.html'))) {
        // Nada a fazer aqui se for apenas texto estático
        // Se houver lógica de "selecionar ferramenta para começar" no index, pode ser aqui.
    }
});