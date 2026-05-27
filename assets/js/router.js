document.addEventListener("DOMContentLoaded", () => {
    const appContent = document.getElementById("appContent");

    if (!appContent) return;

    document.addEventListener("click", async event => {
        const link = event.target.closest("[data-route]");
        if (!link) return;

        const pageUrl = link.getAttribute("href");
        if (!pageUrl || pageUrl === "#" || pageUrl.startsWith("http")) return;

        event.preventDefault();

        try {
            appContent.innerHTML = `
                <section class="rw-section">
                    <div class="rw-container text-center">
                        <p>Carregando...</p>
                    </div>
                </section>
            `;

            const response = await fetch(pageUrl);
            if (!response.ok) throw new Error(`Erro ao carregar página: ${response.status}`);

            const html = await response.text();
            const parsed = new DOMParser().parseFromString(html, "text/html");
            const main = parsed.querySelector("main");

            appContent.innerHTML = main ? main.innerHTML : html;

            const title = parsed.querySelector("title")?.textContent;
            if (title) document.title = title;

            history.pushState(null, "", pageUrl);
            window.scrollTo({ top: 0, behavior: "smooth" });

        } catch (error) {
            console.error("Erro no router:", error);
            appContent.innerHTML = `
                <section class="rw-section">
                    <div class="rw-container text-center">
                        <h2>Não foi possível carregar esta página.</h2>
                        <p>Verifique se o caminho está correto.</p>
                    </div>
                </section>
            `;
        }
    });

    window.addEventListener("popstate", () => window.location.reload());
});