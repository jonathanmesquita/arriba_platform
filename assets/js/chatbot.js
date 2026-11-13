// js/chatbot.js — Arriba Bot, o chat do site.
//
// Redesenhado em nov/2026 com três regras de escrita para chatbot:
//
// 1. Dizer o que é e o que sabe fazer, logo no primeiro balão. É um
//    assistente AUTOMÁTICO que explica as ferramentas deste site — não um
//    atendente, não um buscador geral.
// 2. Quando não sabe, dizer que não sabe, e oferecer um caminho. Antes ele
//    respondia "qual a capital da França" despejando três cartões de
//    ferramenta sem explicação nenhuma.
// 3. Falar com quem visita o site. A resposta vinha com "Quando encaminhar
//    para DEV", "Gerar resposta para cliente" e "Abrir manual" — sobras do
//    copiloto de suporte, que falava com atendente.
//
// O subtítulo do cabeçalho mostra DE ONDE vem a resposta (base do site ou
// provedor de IA). Antes ele mostrava um "humor" do mascote ("Pensando na
// melhor resposta"), que ficava preso depois que a resposta chegava.
//
// Configuração do provedor de IA: NÃO mora mais aqui. Até nov/2026 era um
// painel aberto pela engrenagem, à vista de qualquer visitante; agora é a
// página de administração pages/admin/configurar-chat.html, que só abre o
// formulário depois que a Arriba API confirma a sessão de administrador.
// O chat só mostra a engrenagem — um LINK para essa página — no navegador
// em que o administrador já entrou (arriba-api.js, pareceAdmin()).
//
// Estilo: assets/css/chatbot.css. Conteúdo: assets/data/base-conhecimento.js.

import { KNOWLEDGE_BASE as BASE_CONHECIMENTO, QUICK_TOPICS as TOPICOS_RAPIDOS } from '../data/base-conhecimento.js';

import { PROVEDORES, getConfig, configCompleta, conversar } from './llm-providers.js';
import { chatPublicoAtivo, pareceAdmin, perguntarAoChatPublico } from './arriba-api.js';

// Caminho absoluto: o chat é carregado a partir de páginas em pastas
// diferentes, e o link relativo quebraria fora da raiz.
const PAGINA_CONFIG = '/pages/admin/configurar-chat.html';

// Quantas mensagens do histórico vão junto a cada chamada ao provedor.
// Segura o custo por token e evita estourar a janela de modelo pequeno.
const MAX_HISTORICO = 10;

// Nota mínima da busca local para responder com um cartão. Abaixo disso a
// pergunta vira "talvez seja uma destas" (ou vai para o provedor de IA).
const NOTA_RESPOSTA_DIRETA = 14;

// Mascote: sapo pixelado laranja, um arquivo por estado. A imagem muda com
// a resposta (achou / não achou), mas NÃO anima sozinha: o rodízio
// automático de imagens a cada 6,5 s saiu em nov/2026 (movimento sem pausa
// — WCAG 2.2.2 — e enfeite que distrai).
// O desenho antigo (sapolingo_*.png) continua em assets/img/frames_arriba/
// como BACKUP — não é referenciado por nada; não remover sem combinar.
const MASCOT_DIR = 'frames-arriba-sapo-laranja';
const MASCOT_FRAMES = {
    idle: 'sapo-pixelado-laranja-observando.png',
    think: 'sapo-pixelado-laranja-bug-encontrado.png',
    hack: 'sapo-pixelado-laranja-programando.png',
    jump: 'sapo-pixelado-laranja-pequena-vitoria.png'
};

// Palavras que não dizem o assunto da pergunta. Sem esta lista, "quem
// ganhou a copa" casava com qualquer texto da base que tivesse "quem".
const PALAVRAS_VAZIAS = new Set([
    'quero', 'como', 'sobre', 'para', 'com', 'uma', 'uns', 'umas', 'das', 'dos', 'que', 'qual', 'quais',
    'onde', 'quem', 'quando', 'porque', 'por', 'pra', 'isso', 'isto', 'esse', 'essa', 'este', 'esta',
    'tem', 'ter', 'tenho', 'mais', 'sem', 'nos', 'nas', 'num', 'numa', 'meu', 'minha', 'seu', 'sua',
    'aqui', 'site', 'ser', 'sao', 'foi', 'pode', 'posso', 'the'
]);

// Conversa curta que não é pergunta sobre ferramenta. Comparadas já sem
// acento e em minúsculas.
const SAUDACAO = /^(oi|ola|ola+|e ai|eai|bom dia|boa tarde|boa noite|hey|hello|hi)\b/;
const AGRADECIMENTO = /^(obrigad|valeu|vlw|brigad|thanks|thank you)/;

export function initChatbot() {
    const chatbotBtn = document.getElementById('chatbotBtn');
    const chatbotPopup = document.getElementById('chatbot');
    const closeChatBtn = document.getElementById('closeChat');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatWindow = document.getElementById('chatWindow');
    const subtitulo = document.getElementById('chatSubtitle');

    if (!chatbotBtn || !chatbotPopup || !closeChatBtn || !chatForm || !chatInput || !chatWindow) {
        return;
    }

    let currentMood = 'idle';
    let aguardando = false;
    // A IA do servidor (chat público). Vira false nesta visita se o
    // servidor disser que está desligada, para não perguntar de novo.
    let iaDoSite = chatPublicoAtivo();
    // Histórico só em memória: fecha a aba, some.
    const historico = [];
    const knowledgeById = new Map(BASE_CONHECIMENTO.map((item) => [item.id, item]));

    const mascot = setupMascot();
    setMascotMood('idle');
    montarAtalhoAdmin();
    boasVindas();

    /* ---------------- Abrir e fechar ---------------- */

    chatbotBtn.addEventListener('click', () => {
        if (estaAberto()) fechar();
        else abrir();
    });

    closeChatBtn.addEventListener('click', fechar);

    chatbotPopup.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            fechar();
        }
    });

    // Outros botões do site (topo e hero, em navigation-v2.js) abrem o chat
    // tirando o d-none direto. Observar a classe mantém o aria-expanded do
    // lançador certo seja quem for que abriu.
    new MutationObserver(() => {
        chatbotBtn.setAttribute('aria-expanded', String(estaAberto()));
    }).observe(chatbotPopup, { attributes: true, attributeFilter: ['class'] });

    function estaAberto() {
        return !chatbotPopup.classList.contains('d-none');
    }

    function abrir() {
        chatbotPopup.classList.remove('d-none');
        chatInput.focus();
    }

    function fechar() {
        chatbotPopup.classList.add('d-none');
        chatbotBtn.focus();
    }

    /* ---------------- Enviar ---------------- */

    // <form> no lugar de ouvir "Enter": o envio pelo teclado, pelo botão e
    // pelo "Ir" do teclado do celular passam pelo mesmo caminho.
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        enviar();
    });

    chatWindow.addEventListener('click', tratarClique);

    async function enviar() {
        const mensagem = chatInput.value.trim();
        if (!mensagem || aguardando) return;

        appendMessage('Você', mensagem, 'user-message');
        chatInput.value = '';

        const curta = normalizeText(mensagem);
        if (SAUDACAO.test(curta) && curta.length <= 20) {
            responderSaudacao();
            return;
        }
        if (AGRADECIMENTO.test(curta)) {
            setMascotMood('jump');
            appendMessage('Arriba Bot', 'De nada. Se quiser conhecer outra ferramenta, é só perguntar.', 'bot-message');
            return;
        }

        const resultado = buscarNaBase(mensagem);
        if (resultado.best && resultado.best.score >= NOTA_RESPOSTA_DIRETA) {
            setMascotMood('jump');
            appendRichBotMessage(renderCartao(resultado.best.item));
            return;
        }

        // A base local não tem resposta direta. Quem responde, nesta ordem:
        // 1. o provedor que o administrador configurou neste navegador;
        // 2. a IA do servidor (chat público), se estiver ligada;
        // 3. ninguém — e a resposta é honesta: não sei.
        const config = getConfig();
        const provedorProprio = config.provedor !== 'local' && configCompleta(config);
        if (!provedorProprio && !iaDoSite) {
            responderSemResposta(resultado);
            return;
        }

        aguardando = true;
        setMascotMood('hack');
        const digitando = appendMessage('Arriba Bot', 'Digitando…', 'bot-message', true);
        historico.push({ role: 'user', content: mensagem });

        const r = provedorProprio
            ? await conversar({
                config,
                sistema: montarSistema(resultado),
                mensagens: historico.slice(-MAX_HISTORICO)
            })
            : await perguntarAoChatPublico({
                historico,
                contexto: trechosDaBase(resultado),
                // O servidor grátis dorme sem uso: avisar é melhor do que
                // parecer travado.
                aoDemorar: () => {
                    const texto = digitando.querySelector('.typing-indicator');
                    if (texto) texto.textContent = 'A IA do site está acordando — pode levar até um minuto…';
                }
            });

        digitando.remove();
        aguardando = false;

        if (!r.ok && r.desligado) {
            // O servidor está com a IA desligada: não é falha, é configuração.
            iaDoSite = false;
            historico.pop();
            atualizarFonte();
            responderSemResposta(resultado);
            return;
        }

        if (r.ok) {
            historico.push({ role: 'assistant', content: r.texto });
            setMascotMood('jump');
            appendMessage('Arriba Bot', r.texto, 'bot-message');
            return;
        }

        // Falha do provedor nunca deixa a pessoa sem resposta: diz o que
        // aconteceu e responde pela base do site.
        historico.pop();
        const nome = provedorProprio ? (PROVEDORES[config.provedor]?.nome || config.provedor) : 'a IA do site';
        const motivo = String(r.erro || 'sem detalhe').replace(/[.\s]+$/, '');
        appendMessage('Arriba Bot', `Não consegui falar com ${nome} agora (${motivo}). Respondi pela base do site.`, 'bot-message');
        responderSemResposta(resultado);
    }

    /* ---------------- Respostas ---------------- */

    function boasVindas() {
        appendMessage(
            'Arriba Bot',
            'Olá! Sou o Arriba Bot, o assistente automático deste site. Explico o que cada ferramenta faz e mostro onde ela fica.',
            'bot-message'
        );
        // Quem digita precisa saber ANTES se o que escreve pode sair do navegador.
        const cfg = getConfig();
        if (iaDoSite && !(cfg.provedor !== 'local' && configCompleta(cfg))) {
            appendMessage(
                'Arriba Bot',
                'Quando a base do site não tiver a resposta, sua pergunta é enviada a um serviço de IA. Não escreva dados pessoais (CPF, telefone, endereço).',
                'bot-message'
            );
        }
        appendMessage('Arriba Bot', 'Escolha um assunto ou escreva sua pergunta:', 'bot-message');
        appendRespostasRapidas(TOPICOS_RAPIDOS.map((t) => ({ rotulo: t.rotulo, titulo: t.resumo, valor: t.rotulo })));
    }

    function responderSaudacao() {
        setMascotMood('idle');
        appendMessage('Arriba Bot', 'Olá! Posso explicar qualquer ferramenta do site. Por onde quer começar?', 'bot-message');
        appendRespostasRapidas(TOPICOS_RAPIDOS.map((t) => ({ rotulo: t.rotulo, titulo: t.resumo, valor: t.rotulo })));
    }

    // Dois casos que antes davam a mesma resposta: "achei algo parecido" e
    // "não tenho nada sobre isso". Misturar os dois era o que fazia a
    // pergunta sobre a capital da França virar uma lista de ferramentas.
    function responderSemResposta(resultado) {
        setMascotMood('think');
        if (resultado.matches.length) {
            appendMessage('Arriba Bot', 'Não achei uma resposta exata. Talvez você procure uma destas:', 'bot-message');
            appendRespostasRapidas(resultado.matches.map(({ item }) => ({
                rotulo: item.titulo,
                titulo: item.resumo,
                valor: item.perguntaExemplo || item.titulo
            })));
            return;
        }
        appendMessage(
            'Arriba Bot',
            'Não sei responder isso. Eu só conheço as ferramentas deste site — sobre elas, posso ajudar com:',
            'bot-message'
        );
        appendRespostasRapidas(TOPICOS_RAPIDOS.map((t) => ({ rotulo: t.rotulo, titulo: t.resumo, valor: t.rotulo })));
    }

    function renderCartao(item) {
        const passos = (item.passos || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('');
        const bomSaber = (item.checklist || []).map((c) => `<li>${escapeHtml(c)}</li>`).join('');
        return `
            <article class="chat-card">
                <h3>${escapeHtml(item.titulo)}</h3>
                <p>${escapeHtml(item.resumo)}</p>
                <p class="chat-card-where">Onde fica: <strong>${escapeHtml(item.caminhoTela || '')}</strong></p>
                <div class="chat-card-actions">
                    ${item.linkManual ? `<a class="chat-btn chat-btn-primary" href="${escapeAttr(item.linkManual)}">Abrir a ferramenta</a>` : ''}
                    ${passos ? `
                    <details>
                        <summary>Ver passo a passo</summary>
                        <ol>${passos}</ol>
                        ${bomSaber ? `<div class="chat-good-to-know"><strong>Bom saber</strong><ul>${bomSaber}</ul></div>` : ''}
                    </details>` : ''}
                </div>
            </article>
        `;
    }

    /* ---------------- Busca na base local ---------------- */

    function buscarNaBase(query = '') {
        const normalizedQuery = normalizeText(query);
        const tokens = normalizedQuery
            .split(/[^a-z0-9]+/)
            .filter((token) => token.length > 2 && !PALAVRAS_VAZIAS.has(token));

        // Palavra-chave casa por PALAVRA INTEIRA: comparando por pedaço de
        // texto, "api" casava dentro de "capital" e a pergunta sobre a
        // capital da França voltava a sugerir ferramenta.
        const consultaEmPalavras = ` ${normalizedQuery.replace(/[^a-z0-9]+/g, ' ').trim()} `;

        const matches = BASE_CONHECIMENTO
            .map((item) => {
                const haystack = normalizeText([
                    item.titulo,
                    item.categoria,
                    item.perguntaExemplo,
                    item.caminhoTela,
                    item.resumo,
                    ...(item.palavrasChave || []),
                    ...(item.passos || []),
                    ...(item.checklist || [])
                ].join(' '));
                const title = normalizeText(item.titulo);
                const path = normalizeText(item.caminhoTela);
                const question = normalizeText(item.perguntaExemplo);
                // Palavra solta casa pelo COMEÇO de uma palavra do texto
                // ("valida" acha "validador"), não por qualquer pedaço.
                // Vale também o inverso para plural e flexão curta: "validadores"
                // acha "validador" (a palavra da base é o começo do que foi digitado).
                const comeca = (texto, token) => texto.split(/[^a-z0-9]+/).some((palavra) =>
                    palavra.startsWith(token)
                    || (palavra.length >= 4 && token.startsWith(palavra) && token.length - palavra.length <= 3));
                let score = 0;

                if (normalizedQuery && title.includes(normalizedQuery)) score += 18;
                if (normalizedQuery && question.includes(normalizedQuery)) score += 14;

                (item.palavrasChave || []).forEach((keyword) => {
                    const normalizedKeyword = normalizeText(keyword);
                    if (!normalizedKeyword) return;
                    if (consultaEmPalavras.includes(` ${normalizedKeyword.replace(/[^a-z0-9]+/g, ' ').trim()} `)) score += 8;
                    if (normalizedKeyword.includes(normalizedQuery) && normalizedQuery.length > 3) score += 5;
                });

                tokens.forEach((token) => {
                    if (comeca(haystack, token)) score += 2;
                    if (comeca(title, token)) score += 3;
                    if (comeca(path, token)) score += 2;
                });

                return { item, score };
            })
            .filter((match) => match.score > 0)
            .sort((a, b) => b.score - a.score || a.item.titulo.localeCompare(b.item.titulo))
            .slice(0, 4);

        return { query, matches, best: matches[0] || null };
    }

    /* Contexto do sistema para o provedor de IA: quem o modelo é e o que a
       base local sabe sobre a pergunta. Só os trechos relevantes, não a
       base inteira — custo baixo e resposta ancorada no site. */
    function trechosDaBase(resultado) {
        return (resultado?.matches || []).slice(0, 3).map(({ item }) =>
            `- ${item.titulo}: ${(item.resumo || '').slice(0, 300)}`
        ).join('\n');
    }

    function montarSistema(resultado) {
        const trechos = trechosDaBase(resultado);

        return [
            'Você é o Arriba Bot, assistente automático da Arriba Platform, um protótipo de estudos com ferramentas técnicas.',
            'Responda em português do Brasil, em frases curtas e diretas.',
            'Se não souber, diga que não sabe — não invente passo de tela nem código de erro.',
            'Nunca peça nem repita dado pessoal (CPF, nome completo, telefone, endereço).',
            trechos ? `\nTrechos da base do site que podem ajudar:\n${trechos}` : ''
        ].filter(Boolean).join('\n');
    }

    /* ---------------- Cliques dentro da conversa ---------------- */

    function tratarClique(event) {
        const botao = event.target.closest('[data-chat-reply]');
        if (!botao) return;
        // A resposta rápida vira a fala da pessoa, como se ela tivesse
        // digitado — assim o histórico conta a conversa inteira.
        chatInput.value = botao.dataset.chatReply || '';
        enviar();
    }

    /* ---------------- Montagem das mensagens ---------------- */

    function appendMessage(sender, text, type, isTyping = false) {
        const msg = document.createElement('div');
        msg.classList.add('chat-message', type);
        const corpo = isTyping
            ? `<span class="typing-indicator">${escapeHtml(text)}</span>`
            : formatBotText(text);
        const fala = `<span class="chat-sr-only">${escapeHtml(sender)}:</span>${corpo}`;

        if (type === 'bot-message') {
            msg.innerHTML = `
                <img class="chat-message-avatar" src="${getMascotSrc(currentMood)}" alt="" aria-hidden="true">
                <div class="chat-message-content">${fala}</div>
            `;
        } else {
            msg.innerHTML = fala;
        }

        chatWindow.appendChild(msg);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return msg;
    }

    function appendRichBotMessage(html) {
        const msg = document.createElement('div');
        msg.classList.add('chat-message', 'bot-message');
        msg.innerHTML = `
            <img class="chat-message-avatar" src="${getMascotSrc(currentMood)}" alt="" aria-hidden="true">
            <div class="chat-message-content"><span class="chat-sr-only">Arriba Bot:</span>${html}</div>
        `;
        chatWindow.appendChild(msg);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return msg;
    }

    function appendRespostasRapidas(opcoes) {
        const grupo = document.createElement('div');
        grupo.className = 'chat-quick-replies';
        grupo.setAttribute('role', 'group');
        grupo.setAttribute('aria-label', 'Sugestões');
        grupo.innerHTML = opcoes.map((o) => `
            <button type="button" data-chat-reply="${escapeAttr(o.valor)}" title="${escapeAttr(o.titulo || '')}">${escapeHtml(o.rotulo)}</button>
        `).join('');
        chatWindow.appendChild(grupo);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    /* ---------------- Atalho de administração ----------------
       Visitante não vê nada. No navegador em que o administrador já entrou,
       a engrenagem leva à página de configuração — que confere a sessão
       na API de novo: a marca local só decide se o atalho aparece. */

    function montarAtalhoAdmin() {
        const header = chatbotPopup.querySelector('.chat-header');
        if (header && pareceAdmin()) {
            const link = document.createElement('a');
            link.className = 'chat-header-btn';
            link.id = 'btnConfigIA';
            link.href = PAGINA_CONFIG;
            link.title = 'Configurar o chat (administração)';
            link.setAttribute('aria-label', 'Configurar o chat (área de administração)');
            link.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
            header.insertBefore(link, closeChatBtn);
        }
        atualizarFonte();
    }

    /* O subtítulo diz de onde vem a resposta. Quem digita precisa saber se
       o que escreve pode sair do navegador. */
    function atualizarFonte() {
        const cfg = getConfig();
        const ativo = configCompleta(cfg) ? cfg.provedor : 'local';
        if (subtitulo) {
            subtitulo.textContent = ativo !== 'local'
                ? `Assistente automático · usa ${PROVEDORES[ativo].nome.split(' ')[0]} quando a base não cobre`
                : iaDoSite
                    ? 'Assistente automático · usa a IA do site quando a base não cobre'
                    : 'Assistente automático · responde pela base do site';
        }
        const btn = document.getElementById('btnConfigIA');
        if (btn) btn.classList.toggle('active', ativo !== 'local');
    }

    /* ---------------- Mascote ---------------- */

    function setupMascot() {
        chatbotBtn.classList.add('chatbot-mascot-button');

        const buttonImage = document.createElement('img');
        buttonImage.className = 'chatbot-mascot-button-img';
        buttonImage.alt = '';
        buttonImage.setAttribute('aria-hidden', 'true');
        chatbotBtn.appendChild(buttonImage);

        const headerImage = document.createElement('img');
        headerImage.className = 'chatbot-mascot-header-img';
        headerImage.alt = '';
        headerImage.setAttribute('aria-hidden', 'true');
        const header = chatbotPopup.querySelector('.chat-header');
        header?.insertBefore(headerImage, header.firstChild);

        return { buttonImage, headerImage };
    }

    function setMascotMood(mood) {
        currentMood = MASCOT_FRAMES[mood] ? mood : 'idle';
        const src = getMascotSrc(currentMood);
        [mascot.buttonImage, mascot.headerImage].forEach((img) => { if (img) img.src = src; });
    }

    function getMascotSrc(mood) {
        const filename = MASCOT_FRAMES[mood] || MASCOT_FRAMES.idle;
        return new URL(`../img/${MASCOT_DIR}/${filename}`, import.meta.url).href;
    }

    /* ---------------- Texto ---------------- */

    function formatBotText(text = '') {
        return escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
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

    function normalizeText(text = '') {
        return String(text)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .trim();
    }
}
