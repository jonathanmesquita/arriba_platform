// js/search.js
export function initSearchBox() {
    const searchToggleBtn = document.getElementById('searchToggleBtn');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchBox = document.getElementById('searchBox');
    const searchInput = searchBox ? searchBox.querySelector('.search-input') : null;

    if (searchToggleBtn && searchBox && searchInput) {
        searchToggleBtn.addEventListener('click', function () {
            searchBox.classList.remove('search-closed');
            searchBox.classList.add('search-opened');
            searchInput.focus();
        });
    }

    if (searchCloseBtn && searchBox && searchInput) {
        searchCloseBtn.addEventListener('click', function () {
            searchBox.classList.remove('search-opened');
            searchBox.classList.add('search-closed');
            searchInput.value = '';
        });
    }

    document.addEventListener('click', function (event) {
        if (searchBox && searchToggleBtn && !searchBox.contains(event.target) && !searchToggleBtn.contains(event.target)) {
            searchBox.classList.remove('search-opened');
            searchBox.classList.add('search-closed');
            if (searchInput) {
                searchInput.value = '';
            }
        }
    });
}