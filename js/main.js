// ========== Firebase: Inicialização ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAv3mBOhNMiZYYbB2_Ll15BYzfo7LSLOFE",
  authDomain: "jmplatform-c2f3c.firebaseapp.com",
  projectId: "jmplatform-c2f3c",
  storageBucket: "jmplatform-c2f3c.appspot.com",
  messagingSenderId: "245301522502",
  appId: "1:245301522502:web:39bc4c12016a4033421a47",
  measurementId: "G-BDLFHJF2C9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ========== Tema Claro / Escuro ==========
function setTheme(mode) {
  const isDark = mode === "dark";
  document.body.classList.toggle("dark-mode", isDark);

  const icon = document.getElementById("themeIcon");
  if (icon) {
    icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
  }

  localStorage.setItem("theme", mode);
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains("dark-mode") ? "dark" : "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
}

// ========== Inicialização Geral ==========
document.addEventListener("DOMContentLoaded", () => {
  // Aplica o tema salvo anteriormente
  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);

  // Botão para alternar o tema
  document.getElementById("toggleTheme")?.addEventListener("click", toggleTheme);

  // ========== Login ==========
  document.getElementById("entrar")?.addEventListener("click", () => {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    signInWithEmailAndPassword(auth, email, senha)
      .then(userCredential => {
        document.getElementById("loginStatus").innerHTML =
          `<div class='alert alert-success'>Bem-vindo, ${userCredential.user.email}</div>`;
        document.getElementById("loginSection").classList.add("d-none");
        document.getElementById("logoutLink").classList.remove("d-none");
      })
      .catch(error => {
        document.getElementById("loginStatus").innerHTML =
          `<div class='alert alert-danger'>Erro: ${error.message}</div>`;
      });
  });

  // ========== Logout ==========
  document.getElementById("logoutLink")?.addEventListener("click", () => {
    signOut(auth).then(() => {
      document.getElementById("loginStatus").innerHTML =
        `<div class='alert alert-info'>Você saiu com sucesso.</div>`;
      document.getElementById("loginSection").classList.remove("d-none");
      document.getElementById("logoutLink").classList.add("d-none");
    });
  });

  // Verifica se o usuário já está logado
  onAuthStateChanged(auth, user => {
    if (user) {
      document.getElementById("loginSection").classList.add("d-none");
      document.getElementById("logoutLink").classList.remove("d-none");
    }
  });

  // ========== Chatbot Simples ==========
  const respostas = {
    "erro 500": "Verifique se o token do boleto está válido.",
    "login falhou": "Confirme se seu usuário está ativo e se o ambiente é homologação.",
    "erro 401": "A autenticação falhou. Revise suas credenciais.",
    "como usar": "Digite sua dúvida e clique em Enviar. Pronto!"
  };

  document.getElementById("sendChat")?.addEventListener("click", () => {
    const input = document.getElementById("chatInput").value.trim().toLowerCase();
    const output = respostas[input] || "Ainda não sei como ajudar com isso. Tente outra pergunta.";
    const chatWindow = document.getElementById("chatWindow");

    chatWindow.innerHTML += `
      <p><strong>Você:</strong> ${input}</p>
      <p><strong>Arriba:</strong> ${output}</p>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    document.getElementById("chatInput").value = "";
  });
});


  // Tema 01 
document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.getElementById("toggleTheme");
  const themeIcon = document.getElementById("themeIcon");
  const chatbotBtn = document.getElementById("chatbotBtn");
  const chatPopup = document.getElementById("chatbot");
  const closeChat = document.getElementById("closeChat");

  // Tema
  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);

  themeBtn.addEventListener("click", () => {
    const newTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    setTheme(newTheme);
  });

  function setTheme(mode) {
    document.body.classList.toggle("dark-mode", mode === "dark");
    themeIcon.className = mode === "dark" ? "fas fa-sun" : "fas fa-moon";
    localStorage.setItem("theme", mode);
  }

  // Chatbot popup
  chatbotBtn.addEventListener("click", () => {
    chatPopup.classList.toggle("d-none");
  });

  closeChat.addEventListener("click", () => {
    chatPopup.classList.add("d-none");
  });

  // Chatbot simulado
  const respostas = {
    "erro 500": "Verifique se o token do boleto está válido.",
    "login falhou": "Confirme se o usuário está ativo.",
    "como usar": "Digite sua dúvida e clique em Enviar."
  };

  document.getElementById("sendChat").addEventListener("click", () => {
    const input = document.getElementById("chatInput").value.trim().toLowerCase();
    const output = respostas[input] || "Ainda não sei como ajudar com isso.";
    const chatWindow = document.getElementById("chatWindow");
    chatWindow.innerHTML += `<p><strong>Você:</strong> ${input}</p><p><strong>Bot:</strong> ${output}</p>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    document.getElementById("chatInput").value = "";
  });
});
