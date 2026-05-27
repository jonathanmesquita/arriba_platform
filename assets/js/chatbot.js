// js/chatbot.js

export function initChatbot() {
    const chatbotBtn = document.getElementById('chatbotBtn');
    const chatbotPopup = document.getElementById('chatbot');
    const closeChatBtn = document.getElementById('closeChat');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChat');
    const chatWindow = document.getElementById('chatWindow');
    const modeButtons = document.querySelectorAll('.chat-mode-btn');

    let currentMode = 'datacob';

    if (!chatbotBtn || !chatbotPopup || !closeChatBtn || !chatInput || !sendChatBtn || !chatWindow) {
        return;
    }

    chatbotBtn.addEventListener('click', function () {
        chatbotPopup.classList.toggle('d-none');

        if (!chatbotPopup.classList.contains('d-none')) {
            chatInput.focus();
        }
    });

    closeChatBtn.addEventListener('click', function () {
        chatbotPopup.classList.add('d-none');
    });

    modeButtons.forEach(button => {
        button.addEventListener('click', function () {
            modeButtons.forEach(btn => btn.classList.remove('active'));

            this.classList.add('active');
            currentMode = this.dataset.mode || 'datacob';

            appendMessage(
                'Arriba Bot',
                `Modo alterado para: **${this.textContent.trim()}**`,
                'bot-message'
            );

            chatInput.focus();
        });
    });

    sendChatBtn.addEventListener('click', function () {
        sendMessage();
    });

    chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = chatInput.value.trim();

        if (!message) return;

        appendMessage('Você', message, 'user-message');
        chatInput.value = '';

        const botTypingMsg = appendMessage(
            'Arriba Bot',
            'Digitando...',
            'bot-message',
            true
        );

        try {
            const response = await fetch('https://api.jm.dev.br/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    mode: currentMode
                })
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            botTypingMsg.remove();

            appendMessage(
                'Arriba Bot',
                data.reply || getOfflineMessage(),
                'bot-message'
            );

        } catch (error) {
            botTypingMsg.remove();

            appendMessage(
                'Arriba Bot',
                getOfflineMessage(),
                'bot-message'
            );

            console.error('Erro ao chamar API:', error);
        }
    }

    function appendMessage(sender, text, type, isTyping = false) {
        const msgDiv = document.createElement('div');

        msgDiv.classList.add('chat-message', type);

        if (isTyping) {
            msgDiv.innerHTML = `
                <strong>${escapeHtml(sender)}:</strong>
                <div><span class="typing-indicator">${escapeHtml(text)}</span></div>
            `;
        } else {
            msgDiv.innerHTML = `
                <strong>${escapeHtml(sender)}:</strong>
                <div>${formatBotText(text)}</div>
            `;
        }

        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        return msgDiv;
    }

    function formatBotText(text = '') {
        return escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/- /g, '• ')
            .replace(
                /(https?:\/\/[^\s<]+)/g,
                '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
            );
    }

    function escapeHtml(text = '') {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getOfflineMessage() {
        return `
**Modo offline ativo**

A API não respondeu agora.

Posso ajudar com:
- DataCob / Suporte
- SQL
- DevOps
- API REST
- Render
- Vercel
- Cloudflare

Portais úteis:
- https://ph3a.freshdesk.com/
- https://suporte.ph3a.com.br/pt-BR/support/solutions
        `.trim();
    }
}