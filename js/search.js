// Botão de Pesquisa Index js/search.js
export function initSearchBox() {
    // Versão Desktop
    const searchToggleBtnDesktop = document.getElementById('searchToggleBtn');
    const searchCloseBtnDesktop = document.getElementById('searchCloseBtn');
    const searchContainerDesktop = document.getElementById('searchContainer'); // Corrigido para searchContainer
    const searchInputDesktop = document.getElementById('searchInput'); // Corrigido para searchInput

    // Versão Mobile (dentro do overlay)
    const searchContainerMobile = document.getElementById('searchContainerMobile'); // Nova adição para mobile
    const searchInputMobile = document.getElementById('searchInputMobile'); // Nova adição para mobile
    const searchCloseBtnMobile = document.getElementById('searchCloseBtnMobile'); // Nova adição para mobile

    // Lógica para Desktop
    if (searchToggleBtnDesktop && searchContainerDesktop && searchInputDesktop) {
        searchToggleBtnDesktop.addEventListener('click', function () {
            searchContainerDesktop.classList.add('search-active'); // Adiciona classe para exibir
            searchInputDesktop.focus();
        });
    }

    if (searchCloseBtnDesktop && searchContainerDesktop && searchInputDesktop) {
        searchCloseBtnDesktop.addEventListener('click', function () {
            searchContainerDesktop.classList.remove('search-active'); // Remove classe para ocultar
            searchInputDesktop.value = ''; // Limpa o campo
        });
    }

    // Lógica de pesquisa (executada ao pressionar Enter no input desktop)
    if (searchInputDesktop) {
        searchInputDesktop.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Previne a submissão de formulário padrão se o input estiver em um
                performSearch(searchInputDesktop.value); // Chama a função de pesquisa
                searchInputDesktop.value = ''; // Limpa o campo após a pesquisa
                searchContainerDesktop.classList.remove('search-active'); // Oculta a barra após a pesquisa
            }
        });
    }

    // Ocultar a caixa de pesquisa desktop ao clicar fora dela
    document.addEventListener('click', function (event) {
        if (searchContainerDesktop && searchToggleBtnDesktop &&
            !searchContainerDesktop.contains(event.target) &&
            !searchToggleBtnDesktop.contains(event.target)) {
            searchContainerDesktop.classList.remove('search-active');
            if (searchInputDesktop) {
                searchInputDesktop.value = '';
            }
        }
    });

    // Lógica para Mobile (barra de busca direta no overlay)
    if (searchContainerMobile && searchInputMobile && searchCloseBtnMobile) {
        // A barra de busca mobile já deve estar visível/ocultada pelo próprio overlay
        // Mas adicionamos a lógica de fechar e pesquisar aqui.

        searchCloseBtnMobile.addEventListener('click', function () {
            // Supondo que você queira fechar o menu mobile ou apenas limpar o campo
            // Se o botão de fechar pesquisa móvel também fechar o overlay, você precisará acionar isso aqui
            searchInputMobile.value = ''; // Limpa o campo
            // Você pode querer adicionar uma lógica para fechar o overlay ou apenas a busca, dependendo do design
        });

        searchInputMobile.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                performSearch(searchInputMobile.value); // Chama a função de pesquisa
                searchInputMobile.value = ''; // Limpa o campo após a pesquisa
                // Você pode querer adicionar uma lógica para fechar o overlay ou apenas a busca, dependendo do design
            }
        });
    }
}

// Função placeholder para a pesquisa real
function performSearch(query) {
    if (query.trim() === '') {
        console.log('Nenhum termo de pesquisa inserido.');
        return;
    }
    console.log('Realizando pesquisa por: ' + query);
    // TODO: Adicione sua lógica de pesquisa real aqui!
    // Exemplos:
    // 1. Filtrar elementos na página (se o conteúdo for estático e pequeno)
    //    Ex: filterPageContent(query);
    // 2. Redirecionar para uma página de resultados de pesquisa
    //    Ex: window.location.href = '/search-results.html?q=' + encodeURIComponent(query);
    // 3. Fazer uma requisição AJAX para uma API de busca
    //    Ex: fetch('/api/search?q=' + encodeURIComponent(query)).then(response => response.json()).then(data => displayResults(data));
    alert('Função de pesquisa ativada! Termo: ' + query + '\n(Você precisa implementar a lógica de pesquisa real nesta função.)');
}