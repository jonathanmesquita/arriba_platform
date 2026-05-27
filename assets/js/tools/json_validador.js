// js/tools/json_validator.js
document.addEventListener('DOMContentLoaded', function() {
    const jsonInput = document.getElementById('jsonInput');
    const validateBtn = document.getElementById('validateJsonBtn');
    const resultDiv = document.getElementById('jsonValidationResult');

    if (validateBtn && jsonInput && resultDiv) {
        validateBtn.addEventListener('click', function() {
            const jsonString = jsonInput.value.trim();
            resultDiv.innerHTML = `
                <div class="alert alert-info d-flex align-items-center justify-content-center">
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Validando...
                </div>
            `; // Loader/Feedback inicial

            // Simula um pequeno atraso para mostrar o loader, mesmo que a validação seja instantânea
            setTimeout(() => {
                try {
                    const parsedJson = JSON.parse(jsonString);
                    // Se chegou aqui, é um JSON válido
                    resultDiv.innerHTML = `
                        <div class="alert alert-success">JSON Válido!</div>
                        <pre class="json-editor-container" style="white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(parsedJson, null, 2)}</pre>
                    `;
                } catch (e) {
                    // Se houver um erro, não é um JSON válido
                    resultDiv.innerHTML = `
                        <div class="alert alert-danger">JSON Inválido:</div>
                        <pre class="json-editor-container" style="white-space: pre-wrap; word-wrap: break-word; color: #721c24;">${e.message}</pre>
                    `;
                }
            }, 500); // Atraso de 500ms
        });
    }
});