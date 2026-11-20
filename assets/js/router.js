/* Roteador das páginas de `pages/` dentro da home.
 *
 * Essas páginas são TRECHOS de HTML (só o <main>, sem CSS): a home busca o arquivo e põe o
 * conteúdo em #appContent. O endereço da barra é `/#/pages/...`, não o do arquivo — assim
 * F5, "copiar link" e o botão voltar funcionam. (A versão anterior fazia pushState para o
 * endereço do próprio trecho: recarregar abria o HTML cru, sem estilo, e um link relativo
 * dentro do trecho buscava um caminho que não existe.)
 *
 * Quem abrir o endereço antigo de um trecho cai numa <meta refresh> no <head> dele, que
 * leva para o endereço novo.
 *
 * Página COMPLETA em pages/ (tem folha de estilo própria, ex.: padroes-cnab.html) não é
 * trecho: o roteador navega para ela do jeito normal. */

const PREFIXO = "/pages/";

/** Caminho do trecho pedido (`/pages/...html`) ou null se não for rota válida do site. */
function caminhoDeRota(valor) {
    let destino;
    try {
        // Base na raiz: os hrefs são sempre relativos ao site, e um href relativo dentro de
        // um trecho (pages/x.html) não pode virar pages/y/pages/x.html.
        destino = new URL(valor, `${location.origin}/`);
    } catch {
        return null;
    }
    // Conferir a ORIGEM, e não o prefixo do texto: "//outrodominio/x" é protocolo-relativa,
    // não começa com "http", e o fetch resolveria para fora do site.
    if (destino.origin !== location.origin) return null;
    if (!destino.pathname.startsWith(PREFIXO) || !destino.pathname.endsWith(".html")) return null;
    return destino;
}

document.addEventListener("DOMContentLoaded", () => {
    const appContent = document.getElementById("appContent");
    if (!appContent) return;

    let emTrecho = false;
    const tituloDaHome = document.title;

    const mensagem = (titulo, texto) => {
        appContent.innerHTML = `
            <section class="rw-section">
                <div class="rw-container text-center">
                    ${titulo ? `<h2>${titulo}</h2>` : ""}
                    <p>${texto}</p>
                </div>
            </section>`;
    };

    async function carregar(destino) {
        mensagem("", "Carregando...");
        try {
            const resposta = await fetch(destino.pathname);
            if (!resposta.ok) throw new Error(`Erro ao carregar página: ${resposta.status}`);

            const analisado = new DOMParser().parseFromString(await resposta.text(), "text/html");
            const main = analisado.querySelector("main");

            // Página completa (tem CSS próprio): não cabe dentro da home.
            if (!main || analisado.querySelector('link[rel="stylesheet"]')) {
                location.replace(destino.pathname + destino.hash);
                return;
            }

            appContent.innerHTML = main.innerHTML;
            emTrecho = true;

            const titulo = analisado.querySelector("title")?.textContent;
            if (titulo) document.title = titulo;

            const ancora = destino.hash && document.getElementById(decodeURIComponent(destino.hash.slice(1)));
            if (ancora) ancora.scrollIntoView();
            else window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (erro) {
            console.error("Erro no router:", erro);
            mensagem("Não foi possível carregar esta página.", "Verifique se o caminho está correto.");
        }
    }

    // Abrir pelo endereço (F5, link copiado, botão voltar/avançar).
    function aoMudarEndereco() {
        const destino = location.hash.startsWith("#/") ? caminhoDeRota(location.hash.slice(1)) : null;
        if (destino) {
            carregar(destino);
        } else if (emTrecho) {
            // Voltou para a home: o conteúdo original não foi guardado, recarrega.
            location.reload();
        } else {
            document.title = tituloDaHome;
        }
    }

    document.addEventListener("click", event => {
        const link = event.target.closest("[data-route]");
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href || href === "#") return;

        const destino = caminhoDeRota(href);
        if (!destino) return; // fora de pages/: segue o link normal

        event.preventDefault();
        const novo = `#${destino.pathname}${destino.hash}`;
        if (location.hash === novo) carregar(destino); // mesmo endereço: hashchange não dispara
        else location.hash = novo;
    });

    window.addEventListener("hashchange", aoMudarEndereco);
    aoMudarEndereco();
});
