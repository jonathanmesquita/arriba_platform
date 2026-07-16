// js/chatbot.js

import { DATACOB_KNOWLEDGE_BASE, DATACOB_QUICK_TOPICS } from '../data/datacob-knowledge-base.js';

const MASCOT_FRAMES = {
    idle: 'sapolingo_idle.png',
    think: 'sapolingo_think.png',
    jump: 'Sapolingo_jump.png',
    love: 'sapolingo_love.png',
    music: 'sapolingo_music.png',
    angry: 'sapolingo_angry.png',
    crybaby: 'sapolingo_crybaby.png'
};

const MASCOT_ROTATION = ['idle', 'think', 'music', 'love', 'jump'];

const MASCOT_LABELS = {
    idle: 'Pronto para ajudar',
    think: 'Pensando na melhor resposta',
    jump: 'Resposta encontrada',
    love: 'Tudo certo por aqui',
    music: 'Modo leve ativado',
    angry: 'Investigando erro',
    crybaby: 'Nao consegui falar com a API'
};

export function initChatbot() {
    const chatbotBtn = document.getElementById('chatbotBtn');
    const chatbotPopup = document.getElementById('chatbot');
    const closeChatBtn = document.getElementById('closeChat');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChat');
    const chatWindow = document.getElementById('chatWindow');
    const modeButtons = document.querySelectorAll('.chat-mode-btn');

    let currentMode = 'datacob';
    let currentMood = 'idle';
    let isWaitingResponse = false;
    let rotationIndex = 0;
    const knowledgeById = new Map(DATACOB_KNOWLEDGE_BASE.map((item) => [item.id, item]));

    if (!chatbotBtn || !chatbotPopup || !closeChatBtn || !chatInput || !sendChatBtn || !chatWindow) {
        return;
    }

    const mascot = setupMascot();
    setMascotMood('idle');
    window.setInterval(rotateMascot, 6500);

    chatbotBtn.addEventListener('click', function () {
        chatbotPopup.classList.toggle('d-none');

        if (!chatbotPopup.classList.contains('d-none')) {
            setMascotMood(currentMood);
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
            setMascotMood(getMoodByMode(currentMode));

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

    chatWindow.addEventListener('click', handleKnowledgeAction);

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
        isWaitingResponse = true;
        setMascotMood('think');

        const botTypingMsg = appendMessage(
            'Arriba Bot',
            'Digitando...',
            'bot-message',
            true
        );

        const localResult = searchDatacobKnowledge(message);
        if (shouldUseLocalKnowledge(localResult)) {
            botTypingMsg.remove();
            renderLocalKnowledgeResponse(message, localResult);
            isWaitingResponse = false;
            return;
        }

        try {
            const apiBase = (window.ARRIBA_API_BASE || 'https://api.arriba.jm.dev.br').replace(/\/$/, '');
            const response = await fetch(`${apiBase}/chat`, {
                method: 'POST',
                credentials: 'include',
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
            setMascotMood(inferMoodFromResponse(data));

            appendMessage(
                'Arriba Bot',
                data.reply || getOfflineMessage(),
                'bot-message'
            );

        } catch (error) {
            botTypingMsg.remove();
            setMascotMood('crybaby');

            appendMessage(
                'Arriba Bot',
                getOfflineMessage(),
                'bot-message'
            );

            console.error('Erro ao chamar API:', error);
        } finally {
            isWaitingResponse = false;
        }
    }

    function appendMessage(sender, text, type, isTyping = false) {
        const msgDiv = document.createElement('div');

        msgDiv.classList.add('chat-message', type);
        const isBot = type === 'bot-message';
        const content = isTyping
            ? `<strong>${escapeHtml(sender)}:</strong><div><span class="typing-indicator">${escapeHtml(text)}</span></div>`
            : `<strong>${escapeHtml(sender)}:</strong><div>${formatBotText(text)}</div>`;

        if (isBot) {
            msgDiv.classList.add('chat-message-with-avatar');
            msgDiv.innerHTML = `
                <img class="chat-message-avatar" src="${getMascotSrc(currentMood)}" alt="" aria-hidden="true">
                <div class="chat-message-content">${content}</div>
            `;
        } else {
            msgDiv.innerHTML = content;
        }

        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        return msgDiv;
    }

    function appendRichBotMessage(html) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('chat-message', 'bot-message', 'chat-message-with-avatar');
        msgDiv.innerHTML = `
            <img class="chat-message-avatar" src="${getMascotSrc(currentMood)}" alt="" aria-hidden="true">
            <div class="chat-message-content">${html}</div>
        `;
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return msgDiv;
    }

    function shouldUseLocalKnowledge(result) {
        return currentMode === 'datacob' || Number(result.best?.score || 0) >= 14;
    }

    function renderLocalKnowledgeResponse(query, result) {
        if (result.best && result.best.score >= 14) {
            setMascotMood(result.best.item.id.includes('erro') ? 'angry' : 'love');
            appendRichBotMessage(renderKnowledgeCard(result.best.item, query));
            return;
        }

        setMascotMood('think');
        appendRichBotMessage(renderKnowledgeSuggestions(query, result.matches));
    }

    function searchDatacobKnowledge(query = '') {
        const normalizedQuery = normalizeText(query);
        const tokens = normalizedQuery
            .split(/\s+/)
            .filter((token) => token.length > 2 && !['quero', 'como', 'sobre', 'para', 'com', 'uma', 'uns', 'das', 'dos', 'que'].includes(token));

        const matches = DATACOB_KNOWLEDGE_BASE
            .map((item) => {
                const haystack = normalizeText([
                    item.titulo,
                    item.produto,
                    item.categoria,
                    item.perguntaExemplo,
                    item.caminhoTela,
                    item.resumo,
                    item.tipoFreshdeskSugerido,
                    item.quandoEncaminharDev,
                    ...(item.palavrasChave || []),
                    ...(item.passos || []),
                    ...(item.checklist || [])
                ].join(' '));
                const title = normalizeText(item.titulo);
                const path = normalizeText(item.caminhoTela);
                const question = normalizeText(item.perguntaExemplo);
                let score = 0;

                if (normalizedQuery && title.includes(normalizedQuery)) score += 18;
                if (normalizedQuery && question.includes(normalizedQuery)) score += 14;

                (item.palavrasChave || []).forEach((keyword) => {
                    const normalizedKeyword = normalizeText(keyword);
                    if (!normalizedKeyword) return;
                    if (normalizedQuery.includes(normalizedKeyword)) score += 8;
                    if (normalizedKeyword.includes(normalizedQuery) && normalizedQuery.length > 3) score += 5;
                });

                tokens.forEach((token) => {
                    if (haystack.includes(token)) score += 2;
                    if (title.includes(token)) score += 3;
                    if (path.includes(token)) score += 2;
                });

                return { item, score };
            })
            .filter((match) => match.score > 0)
            .sort((a, b) => b.score - a.score || a.item.titulo.localeCompare(b.item.titulo))
            .slice(0, 4);

        return {
            query,
            matches,
            best: matches[0] || null
        };
    }

    function renderKnowledgeCard(item, query) {
        const detailsId = `knowledge-details-${item.id}`;
        return `
            <article class="chat-knowledge-card" data-knowledge-card="${escapeHtml(item.id)}">
                <div class="chat-knowledge-meta">
                    <span>${escapeHtml(item.produto)}</span>
                    <span>${escapeHtml(item.categoria)}</span>
                    <span>${escapeHtml(item.tipoFreshdeskSugerido || 'Duvida')}</span>
                </div>
                <h4>${escapeHtml(item.titulo)}</h4>
                <p>${escapeHtml(item.resumo)}</p>
                <div class="chat-screen-path">
                    <span>Caminho da tela</span>
                    <strong>${escapeHtml(item.caminhoTela || 'A confirmar')}</strong>
                </div>
                <div class="chat-knowledge-details open" id="${detailsId}">
                    <div>
                        <strong>Passo a passo</strong>
                        <ol>${(item.passos || []).map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
                    </div>
                    <div>
                        <strong>Checklist</strong>
                        <ul>${(item.checklist || []).map((check) => `<li>${escapeHtml(check)}</li>`).join('')}</ul>
                    </div>
                    <div class="chat-dev-note">
                        <strong>Quando encaminhar para DEV</strong>
                        <p>${escapeHtml(item.quandoEncaminharDev || 'Encaminhar apenas se houver erro tecnico reproduzivel apos validacao operacional.')}</p>
                    </div>
                </div>
                <div class="chat-knowledge-actions">
                    <button type="button" data-chat-toggle="${escapeHtml(detailsId)}">Ver passo a passo</button>
                    <a href="${escapeAttr(item.linkManual || '/pages/docs/help-center/index.html')}" target="_blank" rel="noopener">Abrir manual</a>
                    <button type="button" data-chat-copy="${escapeHtml(item.id)}">Copiar resposta</button>
                    <button type="button" data-chat-client="${escapeHtml(item.id)}">Gerar resposta para cliente</button>
                </div>
                <small class="chat-query-note">Pergunta entendida: ${escapeHtml(query)}</small>
            </article>
        `;
    }

    function renderKnowledgeSuggestions(query, matches = []) {
        const suggestions = matches.length ? matches : DATACOB_KNOWLEDGE_BASE.slice(0, 4).map((item) => ({ item, score: 0 }));
        return `
            <article class="chat-knowledge-card">
                <div class="chat-knowledge-meta">
                    <span>Base local</span>
                    <span>Sem match exato</span>
                </div>
                <h4>Nao encontrei uma resposta exata para essa duvida.</h4>
                <p>Escolha um tema proximo para eu abrir a orientacao padronizada ou tente escrever com uma palavra-chave da rotina.</p>
                <div class="chat-suggestion-list">
                    ${suggestions.map(({ item }) => `
                        <button type="button" data-chat-suggestion="${escapeHtml(item.id)}">
                            <strong>${escapeHtml(item.titulo)}</strong>
                            <span>${escapeHtml(item.categoria)}</span>
                        </button>
                    `).join('')}
                </div>
                <small class="chat-query-note">Busca local: ${escapeHtml(query)}</small>
            </article>
        `;
    }

    async function handleKnowledgeAction(event) {
        const topicButton = event.target.closest('[data-chat-topic]');
        if (topicButton) {
            sendPresetQuery(topicButton.dataset.chatTopic || '');
            return;
        }

        const suggestionButton = event.target.closest('[data-chat-suggestion]');
        if (suggestionButton) {
            const item = knowledgeById.get(suggestionButton.dataset.chatSuggestion);
            if (item) sendPresetQuery(item.perguntaExemplo || item.titulo);
            return;
        }

        const toggleButton = event.target.closest('[data-chat-toggle]');
        if (toggleButton) {
            const details = document.getElementById(toggleButton.dataset.chatToggle);
            details?.classList.toggle('open');
            return;
        }

        const copyButton = event.target.closest('[data-chat-copy]');
        if (copyButton) {
            const item = knowledgeById.get(copyButton.dataset.chatCopy);
            if (item) await copyText(buildPlainKnowledgeAnswer(item));
            return;
        }

        const clientButton = event.target.closest('[data-chat-client]');
        if (clientButton) {
            const item = knowledgeById.get(clientButton.dataset.chatClient);
            if (item) appendRichBotMessage(renderClientReplyCard(item));
        }
    }

    function sendPresetQuery(text) {
        const query = String(text || '').trim();
        if (!query) return;
        chatInput.value = query;
        sendMessage();
    }

    function buildPlainKnowledgeAnswer(item) {
        return [
            item.titulo,
            '',
            `Caminho: ${item.caminhoTela || 'A confirmar'}`,
            '',
            item.resumo,
            '',
            'Passo a passo:',
            ...(item.passos || []).map((step, index) => `${index + 1}. ${step}`),
            '',
            'Checklist:',
            ...(item.checklist || []).map((check) => `- ${check}`),
            '',
            `Manual: ${item.linkManual || 'Nao informado'}`,
            '',
            `Quando encaminhar para DEV: ${item.quandoEncaminharDev || 'Apenas se houver erro tecnico reproduzivel.'}`
        ].join('\n');
    }

    function renderClientReplyCard(item) {
        const clientReply = buildClientReply(item);
        return `
            <article class="chat-knowledge-card">
                <div class="chat-knowledge-meta">
                    <span>Resposta para cliente</span>
                    <span>${escapeHtml(item.tipoFreshdeskSugerido || 'Duvida')}</span>
                </div>
                <h4>${escapeHtml(item.titulo)}</h4>
                <p>${formatBotText(clientReply)}</p>
                <div class="chat-knowledge-actions">
                    <button type="button" data-chat-copy="${escapeHtml(item.id)}">Copiar orientacao completa</button>
                </div>
            </article>
        `;
    }

    function buildClientReply(item) {
        const firstSteps = (item.passos || []).slice(0, 4).map((step, index) => `${index + 1}. ${step}`).join('\n');
        return `
Ola! Para essa rotina no DataCob, siga este caminho:
${item.caminhoTela || 'Caminho a confirmar'}

Orientacao inicial:
${firstSteps}

Antes de encaminhar para analise tecnica, valide os parametros e teste em um contrato de exemplo. Se o comportamento persistir mesmo com a parametrizacao correta, envie prints, log e exemplo para investigarmos.
        `.trim();
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            setMascotMood('love');
            appendMessage('Arriba Bot', 'Resposta copiada para a area de transferencia.', 'bot-message');
        } catch {
            appendMessage('Arriba Bot', 'Nao consegui copiar automaticamente. Selecione o texto do card e copie manualmente.', 'bot-message');
        }
    }

    function formatBotText(text = '') {
        return escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/- /g, '&bull; ')
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

    function escapeAttr(text = '') {
        return escapeHtml(text).replace(/`/g, '&#096;');
    }

    function getOfflineMessage() {
        return `
**Modo offline ativo**

A API nao respondeu agora.

Posso ajudar com:
- DataCob / Suporte
- SQL
- DevOps
- API REST
- Render
- Vercel
- Cloudflare

Portais uteis:
- https://ph3a.freshdesk.com/
- https://suporte.ph3a.com.br/pt-BR/support/solutions
        `.trim();
    }

    function setupMascot() {
        chatbotBtn.classList.add('chatbot-mascot-button');
        const oldIcon = chatbotBtn.querySelector('i');
        if (oldIcon) oldIcon.setAttribute('aria-hidden', 'true');

        const buttonImage = document.createElement('img');
        buttonImage.className = 'chatbot-mascot-button-img';
        buttonImage.alt = '';
        buttonImage.setAttribute('aria-hidden', 'true');
        chatbotBtn.appendChild(buttonImage);

        const header = chatbotPopup.querySelector('.card-header');
        const title = header?.querySelector('span');
        const headerImage = document.createElement('img');
        headerImage.className = 'chatbot-mascot-header-img';
        headerImage.alt = '';
        headerImage.setAttribute('aria-hidden', 'true');

        const status = document.createElement('small');
        status.className = 'chatbot-mascot-status';

        if (header && title && !header.querySelector('.chatbot-header-left')) {
            const left = document.createElement('div');
            left.className = 'chatbot-header-left';
            const titleWrap = document.createElement('div');
            titleWrap.className = 'chatbot-title-wrap';

            title.classList.add('chatbot-title');
            titleWrap.appendChild(title);
            titleWrap.appendChild(status);
            left.appendChild(headerImage);
            left.appendChild(titleWrap);
            header.insertBefore(left, closeChatBtn);
        }

        const stage = document.createElement('div');
        stage.className = 'chatbot-mascot-stage';
        stage.innerHTML = `
            <img class="chatbot-mascot-stage-img" alt="" aria-hidden="true">
            <div>
                <strong>PH3A Bot</strong>
                <span>Manual interativo DataCob pronto para orientar o suporte.</span>
            </div>
        `;
        chatWindow.appendChild(stage);

        const quickTopics = document.createElement('div');
        quickTopics.className = 'chat-quick-topics';
        quickTopics.innerHTML = DATACOB_QUICK_TOPICS
            .map((topic) => `<button type="button" data-chat-topic="${escapeAttr(topic)}">${escapeHtml(topic)}</button>`)
            .join('');
        chatWindow.appendChild(quickTopics);

        return {
            buttonImage,
            headerImage,
            status,
            stageImage: stage.querySelector('.chatbot-mascot-stage-img'),
            stageText: stage.querySelector('span')
        };
    }

    function setMascotMood(mood) {
        currentMood = MASCOT_FRAMES[mood] ? mood : 'idle';
        const src = getMascotSrc(currentMood);
        const label = MASCOT_LABELS[currentMood] || MASCOT_LABELS.idle;

        [mascot.buttonImage, mascot.headerImage, mascot.stageImage].forEach((image) => {
            if (image) image.src = src;
        });

        if (mascot.status) mascot.status.textContent = label;
        if (mascot.stageText) mascot.stageText.textContent = label;
        chatbotPopup.dataset.mascotMood = currentMood;
        chatbotBtn.dataset.mascotMood = currentMood;
    }

    function rotateMascot() {
        if (isWaitingResponse || !chatbotPopup.classList.contains('d-none')) return;
        rotationIndex = (rotationIndex + 1) % MASCOT_ROTATION.length;
        setMascotMood(MASCOT_ROTATION[rotationIndex]);
    }

    function getMoodByMode(mode) {
        const moods = {
            datacob: 'think',
            sql: 'think',
            devops: 'jump',
            produtividade: 'music',
            geral: 'idle'
        };
        return moods[mode] || 'idle';
    }

    function inferMoodFromResponse(data = {}) {
        if (MASCOT_FRAMES[data.mood]) return data.mood;
        if (MASCOT_FRAMES[data.avatar]) return data.avatar;

        const text = normalizeText(`${data.reply || ''} ${data.subject || ''} ${data.source || ''}`);

        if (data.source === 'local-fallback') return 'think';
        if (/erro|falha|bug|incidente|urgente|bloqueio|problema/.test(text)) return 'angry';
        if (/obrigado|sucesso|resolvido|aprovado|concluido|perfeito/.test(text)) return 'love';
        if (/checklist|validar|analise|duvida|sql|consulta/.test(text)) return 'think';
        if (/deploy|cloud|render|vercel|github|publicado/.test(text)) return 'jump';
        if (/produtividade|rotina|organiza/.test(text)) return 'music';
        return getMoodByMode(data.mode || currentMode);
    }

    function normalizeText(text = '') {
        return String(text)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function getMascotSrc(mood) {
        const filename = MASCOT_FRAMES[mood] || MASCOT_FRAMES.idle;
        return new URL(`../img/frames_sapolingo/${filename}`, import.meta.url).href;
    }
}
