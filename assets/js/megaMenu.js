// js/megaMenu.js
export function initMegaMenu() {
    const navItems = document.querySelectorAll('.u30navitem');
    const closenavBtns = document.querySelectorAll('.closenav');
    const navbarCollapse = document.getElementById('navbarNav');

    navItems.forEach(item => {
        item.addEventListener('click', function () {
            const targetId = this.dataset.navtarget;
            const targetMenu = document.getElementById(targetId + 'DropdownMenu');

            document.querySelectorAll('.u30navw2.active').forEach(menu => {
                if (menu.id !== targetMenu.id) {
                    menu.classList.remove('active');
                    const relatedBtn = document.querySelector(`[data-navtarget="${menu.dataset.dropdown}"]`);
                    if (relatedBtn) {
                        relatedBtn.setAttribute('aria-expanded', 'false');
                    }
                }
            });

            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
            targetMenu.classList.toggle('active');

            if (window.innerWidth < 992 && targetMenu.classList.contains('active')) {
                const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse, { toggle: false });
                if (navbarCollapse.classList.contains('show')) {
                    bsCollapse.hide();
                }
            }
        });
    });

    closenavBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const parentMenu = this.closest('.u30navw2');
            if (parentMenu) {
                parentMenu.classList.remove('active');
                const relatedBtn = document.querySelector(`[data-navtarget="${parentMenu.dataset.dropdown}"]`);
                if (relatedBtn) {
                    relatedBtn.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    document.addEventListener('click', function (event) {
        const isClickInsideNavbar = event.target.closest('.navbar-nav');
        const isClickInsideActiveMegaMenu = event.target.closest('.u30navw2.active');
        const openLanguageModalBtn = document.getElementById('openLanguageModalBtn'); // Re-obter aqui
        const isClickOnLanguageBtn = openLanguageModalBtn && openLanguageModalBtn.contains(event.target);

        if (!isClickInsideNavbar && !isClickInsideActiveMegaMenu && !isClickOnLanguageBtn) {
            document.querySelectorAll('.u30navw2.active').forEach(menu => {
                menu.classList.remove('active');
                const relatedBtn = document.querySelector(`[data-navtarget="${menu.dataset.dropdown}"]`);
                if (relatedBtn) {
                    relatedBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }
    });

    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler) {
        navbarToggler.addEventListener('click', function() {
            if (!navbarCollapse.classList.contains('show')) {
                document.querySelectorAll('.u30navw2.active').forEach(menu => {
                    menu.classList.remove('active');
                    const relatedBtn = document.querySelector(`[data-navtarget="${menu.dataset.dropdown}"]`);
                    if (relatedBtn) {
                        relatedBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        });
    }

    window.addEventListener('resize', function() {
        if (window.innerWidth >= 992) {
            document.querySelectorAll('.u30navw2.active').forEach(menu => {
                menu.classList.remove('active');
                const relatedBtn = document.querySelector(`[data-navtarget="${menu.dataset.dropdown}"]`);
                if (relatedBtn) {
                    relatedBtn.setAttribute('aria-expanded', 'false');
                }
            });
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse, { toggle: false });
            if (navbarCollapse.classList.contains('show')) {
                bsCollapse.hide();
            }
        } else {
            if (!navbarCollapse.classList.contains('show')) {
                document.querySelectorAll('.u30navw2.active').forEach(menu => {
                    menu.classList.remove('active');
                    const relatedBtn = document.querySelector(`[data-navtarget="${menu.dataset.dropdown}"]`);
                    if (relatedBtn) {
                        relatedBtn.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        }
    });
}