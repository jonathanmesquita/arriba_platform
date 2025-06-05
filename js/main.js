const translations = {
  pt: { inicio: "Início", titulo: "Plataforma de Produtividade & Erros", descricao: "Controle técnico, chatbot e acesso rápido às suas ferramentas." },
  en: { inicio: "Home", titulo: "Productivity & Errors Platform", descricao: "Technical control, chatbot and quick access to your daily tools." },
  es: { inicio: "Inicio", titulo: "Plataforma de Productividad y Errores", descricao: "Control técnico, chatbot y acceso rápido a tus herramientas diarias." }
};

document.getElementById("languageSelector").addEventListener("change", (e) => {
  const lang = e.target.value;
  document.querySelectorAll("[data-key]").forEach(el => {
    const key = el.getAttribute("data-key");
    el.textContent = translations[lang][key];
  });
});

document.getElementById("toggleTheme").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

document.getElementById("searchInput").addEventListener("keyup", function () {
  const val = this.value.toLowerCase();
  document.querySelectorAll("main section").forEach(sec => {
    const content = sec.innerText.toLowerCase();
    sec.style.display = content.includes(val) ? "block" : "none";
  });
});
