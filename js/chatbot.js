// js/chatbot.js
export function initChatbot() {
    const chatbotBtn = document.getElementById('chatbotBtn');
    const chatbotPopup = document.getElementById('chatbot');
    const closeChatBtn = document.getElementById('closeChat');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChat');
    const chatWindow = document.getElementById('chatWindow');

    if (chatbotBtn && chatbotPopup && closeChatBtn && chatInput && sendChatBtn && chatWindow) {
        chatbotBtn.addEventListener('click', function () {
            chatbotPopup.classList.toggle('d-none');
            if (!chatbotPopup.classList.contains('d-none')) {
                chatInput.focus();
            }
        });

        closeChatBtn.addEventListener('click', function () {
            chatbotPopup.classList.add('d-none');
        });

        sendChatBtn.addEventListener('click', function () {
            sendMessage();
        });

        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        function sendMessage() {
            const message = chatInput.value.trim();
            if (message) {
                appendMessage('Você', message, 'user-message');
                chatInput.value = '';
                
                // Adicionar loader ou feedback de "digitando..."
                const botTypingMsg = appendMessage('Arriba Bot', '<span class="typing-indicator">Digitando...</span>', 'bot-message');

                setTimeout(() => {
                    botTypingMsg.remove(); // Remove o "digitando..."
                    appendMessage('Arriba Bot', 'Olá! Como posso ajudar?', 'bot-message');
                }, 1500); // Atraso maior para simular processamento
            }
        }

        function appendMessage(sender, text, type) {
            const msgDiv = document.createElement('div');
            msgDiv.classList.add('chat-message', type);
            msgDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
            chatWindow.appendChild(msgDiv);
            chatWindow.scrollTop = chatWindow.scrollHeight;
            return msgDiv; // Retorna o elemento para que possa ser removido/atualizado
        }
    }
}