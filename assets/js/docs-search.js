document.addEventListener("input", event => {
    if (event.target.matches("#docSearchInput")) {
        const query = event.target.value.toLowerCase();
        document.querySelectorAll("[data-doc-keywords]").forEach(card => {
            const haystack = `${card.textContent} ${card.dataset.docKeywords}`.toLowerCase();
            card.style.display = haystack.includes(query) ? "" : "none";
        });
    }

    if (event.target.matches("#blogSearchInput")) {
        const query = event.target.value.toLowerCase();
        document.querySelectorAll("[data-blog-keywords]").forEach(card => {
            const haystack = `${card.textContent} ${card.dataset.blogKeywords}`.toLowerCase();
            card.style.display = haystack.includes(query) ? "" : "none";
        });
    }
});