// js/language.js
export function initLanguageModal() {
    const currentLanguageFlag = document.getElementById('currentLanguageFlag');
    const languageModalElement = document.getElementById('languageModal');
    let languageModal;

    if (languageModalElement) {
        languageModal = new bootstrap.Modal(languageModalElement);
    }

    document.querySelectorAll('.select-lang').forEach(item => {
        item.addEventListener('click', function (event) {
            event.preventDefault();
            const flagSrc = this.querySelector('img').src;
            const countryName = this.dataset.country;

            if (currentLanguageFlag) {
                currentLanguageFlag.src = flagSrc;
                currentLanguageFlag.alt = `Bandeira de ${countryName}`;
            }

            if (languageModal) {
                languageModal.hide();
            }

            localStorage.setItem('selectedLanguageFlag', flagSrc);
            localStorage.setItem('selectedLanguageCountry', countryName);
        });
    });

    const savedFlag = localStorage.getItem('selectedLanguageFlag');
    const savedCountry = localStorage.getItem('selectedLanguageCountry');
    if (savedFlag && savedCountry && currentLanguageFlag) {
        currentLanguageFlag.src = savedFlag;
        currentLanguageFlag.alt = `Bandeira de ${savedCountry}`;
    }
}