document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('jsonInput');
    const validateBtn = document.getElementById('validateJsonBtn');
    const result = document.getElementById('jsonValidationResult');

    if (!input || !validateBtn || !result) return;

    function showMessage(text, variant) {
        result.innerHTML = '';
        const p = document.createElement('p');
        p.className = `text-center mb-0 text-${variant}`;
        p.textContent = text;
        result.appendChild(p);
    }

    function showFormatted(parsed) {
        result.innerHTML = '';
        const badge = document.createElement('p');
        badge.className = 'text-success fw-bold mb-2';
        badge.textContent = 'JSON válido';
        const pre = document.createElement('pre');
        pre.className = 'mb-0';
        pre.textContent = JSON.stringify(parsed, null, 2);
        result.appendChild(badge);
        result.appendChild(pre);
    }

    function validate() {
        const raw = input.value.trim();
        if (!raw) {
            showMessage('Cole um JSON na área acima e clique em Validar.', 'muted');
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            showFormatted(parsed);
        } catch (error) {
            showMessage(`JSON inválido: ${error.message}`, 'danger');
        }
    }

    validateBtn.addEventListener('click', validate);
});
