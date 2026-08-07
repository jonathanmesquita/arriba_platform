/* =====================================================================
   Respostas Predefinidas - Arriba Platform

   Biblioteca de respostas prontas para tickets DataCob. Consome a MESMA
   fonte de dados usada pela aba "Respostas Prontas" do Support Copilot
   (assets/data/respostas-predefinidas.js) — editar esse arquivo atualiza
   as duas telas, nada aqui duplica conteudo.
   ===================================================================== */

import { RESPOSTAS_PREDEFINIDAS } from "../../../assets/data/respostas-predefinidas.js";

let grupoAtual = "todos";
let buscaAtiva = "";
let respostasSessao = [];

/* ---------------------------------------------------------------------
   Espaco reservado (placeholders) - baseado no painel "Espaço Reservado"
   do Freshdesk (Admin > Respostas Predefinidas). Os campos padrao do
   ticket/contato batem com a documentacao do Freshdesk; os campos
   personalizados (ex.: VstsId, Em Backlog) sao um chute razoavel no
   padrao {{ticket.cf_snake_case}} - confira o nome real no admin antes
   de usar em produção.
   --------------------------------------------------------------------- */
const PLACEHOLDER_GROUPS = [
  {
    nome: "Ticket",
    itens: [
      { label: "ID do ticket", token: "{{ticket.id}}", exemplo: "48213" },
      { label: "Assunto", token: "{{ticket.subject}}", exemplo: "Erro ao gerar boleto" },
      { label: "Descrição", token: "{{ticket.description}}", exemplo: "Cliente relata falha ao emitir boleto." },
      { label: "URL do ticket", token: "{{ticket.url}}", exemplo: "https://suporte.ph3a.com.br/a/tickets/48213" },
      { label: "Tags", token: "{{ticket.tags}}", exemplo: "boleto, urgente" },
      { label: "Último comentário público", token: "{{ticket.latest_public_comment}}", exemplo: "Aguardando retorno do cliente." },
      { label: "Último comentário privado", token: "{{ticket.latest_private_note}}", exemplo: "Escalado para desenvolvimento." },
      { label: "Nome do grupo", token: "{{ticket.group}}", exemplo: "Suporte DataCob" },
      { label: "Nome do Agente", token: "{{agent.name}}", exemplo: "Jonathan Mesquita" },
      { label: "E-mail do Agente", token: "{{agent.email}}", exemplo: "jonathan.mesquita@ph3a.com.br" }
    ]
  },
  {
    nome: "Campos de ticket",
    itens: [
      { label: "Status", token: "{{ticket.status}}", exemplo: "Aberto" },
      { label: "Prioridade", token: "{{ticket.priority}}", exemplo: "Alta" },
      { label: "Origem", token: "{{ticket.source}}", exemplo: "E-mail" },
      { label: "Tipo de Ticket", token: "{{ticket.type}}", exemplo: "Incidente" },
      { label: "Contato", token: "{{ticket.requester_name}}", exemplo: "Maria Souza" },
      { label: "Telefone", token: "{{ticket.phone}}", exemplo: "(11) 98888-0000" },
      { label: "Hora de início do compromisso", token: "{{ticket.cf_hora_inicio_compromisso}}", exemplo: "09:00" },
      { label: "Hora de término do compromisso", token: "{{ticket.cf_hora_termino_compromisso}}", exemplo: "10:00" },
      { label: "Testes", token: "{{ticket.cf_testes}}", exemplo: "OK" },
      { label: "Em Backlog", token: "{{ticket.cf_em_backlog}}", exemplo: "Não" }
    ]
  },
  {
    nome: "Helpdesk",
    itens: [
      { label: "Nome do Helpdesk", token: "{{helpdesk.name}}", exemplo: "PH3A Suporte" },
      { label: "Nome do Portal do Produto", token: "{{helpdesk.product_name}}", exemplo: "DataCob" },
      { label: "Descrição do Produto", token: "{{helpdesk.product_description}}", exemplo: "CRM de cobrança com priorização via Big Data" }
    ]
  },
  {
    nome: "Contato",
    itens: [
      { label: "Contato Nome", token: "{{contact.name}}", exemplo: "Maria" },
      { label: "Contato Sobrenome", token: "{{contact.last_name}}", exemplo: "Souza" },
      { label: "Contato Celular", token: "{{contact.mobile}}", exemplo: "(11) 98888-0000" },
      { label: "Contato E-mail", token: "{{contact.email}}", exemplo: "maria.souza@cliente.com.br" },
      { label: "Contato Telefone", token: "{{contact.phone}}", exemplo: "(11) 3333-0000" },
      { label: "Contato Endereço", token: "{{contact.address}}", exemplo: "Av. Paulista, 1000" }
    ]
  },
  {
    nome: "Empresa",
    itens: [
      { label: "Empresa Nome", token: "{{company.name}}", exemplo: "Cliente Exemplo S.A." },
      { label: "Empresa Descrição", token: "{{company.description}}", exemplo: "Recuperação de crédito" },
      { label: "Empresa Domínios", token: "{{company.domains}}", exemplo: "clienteexemplo.com.br" },
      { label: "Empresa Setor", token: "{{company.industry}}", exemplo: "Financeiro" }
    ]
  }
];
let placeholderTabAtiva = PLACEHOLDER_GROUPS[0].nome;

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function gruposCombinados() {
  return RESPOSTAS_PREDEFINIDAS.map((grupo) => ({
    ...grupo,
    respostas: [
      ...grupo.respostas,
      ...respostasSessao.filter((r) => r.grupoId === grupo.id)
    ]
  }));
}

function renderGrupos() {
  const container = document.getElementById("listaGrupos");
  const grupos = gruposCombinados();
  const totalGeral = grupos.reduce((sum, g) => sum + g.respostas.length, 0);
  const chips = [{ id: "todos", nome: "Todos", icone: "🗂️", total: totalGeral }, ...grupos.map((g) => ({ ...g, total: g.respostas.length }))];

  container.innerHTML = chips.map((grupo) => `
    <button type="button" class="side-item ${grupo.id === grupoAtual ? "active" : ""}" data-grupo="${escapeHtml(grupo.id)}">
      <span>${escapeHtml(grupo.icone || "")}</span>
      <span>${escapeHtml(grupo.nome)}</span>
      <span class="count">${grupo.total}</span>
    </button>
  `).join("");

  container.querySelectorAll("[data-grupo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      grupoAtual = btn.dataset.grupo;
      renderGrupos();
      renderRespostas();
    });
  });
}

function renderRespostas() {
  const target = document.getElementById("listaRespostas");
  const query = normalizeText(buscaAtiva);
  const todosGrupos = gruposCombinados();

  const grupos = grupoAtual === "todos"
    ? todosGrupos
    : todosGrupos.filter((g) => g.id === grupoAtual);

  const cards = [];
  grupos.forEach((grupo) => {
    grupo.respostas.forEach((resposta) => {
      if (query) {
        const haystack = normalizeText(`${resposta.titulo} ${resposta.mensagem} ${grupo.nome}`);
        if (!haystack.includes(query)) return;
      }
      cards.push({ grupo, resposta });
    });
  });

  if (!cards.length) {
    target.innerHTML = `
      <div class="empty-msg">
        <i class="fa-solid fa-magnifying-glass"></i>
        Nenhuma resposta encontrada para esse filtro.
      </div>`;
    return;
  }

  target.innerHTML = cards.map(({ grupo, resposta }) => `
    <article class="resposta-card">
      <span class="grupo-tag">${escapeHtml(grupo.icone || "")} ${escapeHtml(grupo.nome)}</span>
      ${resposta.sessao ? `<span class="sessao-tag">Nesta sessão</span>` : ""}
      <h3>${escapeHtml(resposta.titulo)}</h3>
      <p class="resposta-msg">${escapeHtml(resposta.mensagem)}</p>
      <button type="button" class="btn-arriba btn-dark-arriba" data-copiar="${escapeHtml(grupo.id)}:${escapeHtml(resposta.id)}">
        <i class="fa-regular fa-copy me-2"></i>Copiar
      </button>
    </article>
  `).join("");

  target.querySelectorAll("[data-copiar]").forEach((btn) => {
    btn.addEventListener("click", () => copiarResposta(btn));
  });
}

function findResposta(grupoId, respostaId) {
  const grupo = gruposCombinados().find((g) => g.id === grupoId);
  return grupo?.respostas.find((r) => r.id === respostaId) || null;
}

async function copiarResposta(btn) {
  const [grupoId, respostaId] = btn.dataset.copiar.split(":");
  const resposta = findResposta(grupoId, respostaId);
  if (!resposta) return;

  try {
    await navigator.clipboard.writeText(resposta.mensagem);
    const original = btn.innerHTML;
    btn.classList.add("copiado");
    btn.innerHTML = `<i class="fa-solid fa-check me-2"></i>Copiado!`;
    setTimeout(() => {
      btn.classList.remove("copiado");
      btn.innerHTML = original;
    }, 1600);
  } catch {
    alert("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
  }
}

document.getElementById("buscaInput").addEventListener("input", (e) => {
  buscaAtiva = e.target.value;
  renderRespostas();
});

/* ---------------------------------------------------------------------
   Composer: nova resposta predefinida (título, grupo, mensagem),
   inserção de espaço reservado, preview com dados de exemplo e
   exportação em Markdown. Nada aqui grava em
   assets/data/respostas-predefinidas.js - "Adicionar à lista" so
   guarda em memoria, para esta sessao do navegador.
   --------------------------------------------------------------------- */

function preencherSelectGrupo() {
  const select = document.getElementById("composerGrupo");
  select.innerHTML = RESPOSTAS_PREDEFINIDAS.map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.icone || "")} ${escapeHtml(g.nome)}</option>`).join("");
}

function toggleComposer(mostrar) {
  document.getElementById("composerPanel").classList.toggle("hidden", !mostrar);
  document.getElementById("placeholderPanel").classList.add("hidden");
  document.getElementById("previewPanel").classList.add("hidden");
}

function inserirPlaceholder(token) {
  const textarea = document.getElementById("composerMensagem");
  const inicio = textarea.selectionStart ?? textarea.value.length;
  const fim = textarea.selectionEnd ?? textarea.value.length;
  textarea.value = textarea.value.slice(0, inicio) + token + textarea.value.slice(fim);
  const novaPosicao = inicio + token.length;
  textarea.focus();
  textarea.setSelectionRange(novaPosicao, novaPosicao);
}

function renderPlaceholderPicker() {
  const tabsEl = document.getElementById("placeholderTabs");
  const gridEl = document.getElementById("placeholderGrid");

  tabsEl.innerHTML = PLACEHOLDER_GROUPS.map((g) => `
    <button type="button" class="placeholder-tab ${g.nome === placeholderTabAtiva ? "active" : ""}" data-tab="${escapeHtml(g.nome)}">${escapeHtml(g.nome)}</button>
  `).join("");
  tabsEl.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      placeholderTabAtiva = btn.dataset.tab;
      renderPlaceholderPicker();
    });
  });

  const grupoAtivo = PLACEHOLDER_GROUPS.find((g) => g.nome === placeholderTabAtiva) || PLACEHOLDER_GROUPS[0];
  gridEl.innerHTML = grupoAtivo.itens.map((item) => `
    <button type="button" class="placeholder-btn" data-token="${escapeHtml(item.token)}">
      ${escapeHtml(item.label)}<small>${escapeHtml(item.token)}</small>
    </button>
  `).join("");
  gridEl.querySelectorAll("[data-token]").forEach((btn) => {
    btn.addEventListener("click", () => inserirPlaceholder(btn.dataset.token));
  });
}

function substituirComExemplos(mensagem) {
  let resultado = escapeHtml(mensagem);
  PLACEHOLDER_GROUPS.forEach((grupo) => {
    grupo.itens.forEach((item) => {
      const tokenEscapado = escapeHtml(item.token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      resultado = resultado.replace(new RegExp(tokenEscapado, "g"), `<mark>${escapeHtml(item.exemplo)}</mark>`);
    });
  });
  return resultado;
}

function lerComposer() {
  return {
    titulo: document.getElementById("composerTitulo").value.trim(),
    grupoId: document.getElementById("composerGrupo").value,
    shortcode: document.getElementById("composerShortcode").value.trim(),
    mensagem: document.getElementById("composerMensagem").value
  };
}

function limparComposer() {
  document.getElementById("composerTitulo").value = "";
  document.getElementById("composerShortcode").value = "";
  document.getElementById("composerMensagem").value = "";
}

function slugify(texto) {
  return normalizeText(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "resposta";
}

function exportarMarkdown() {
  const { titulo, shortcode, mensagem } = lerComposer();
  if (!titulo || !mensagem) {
    alert("Preencha ao menos o Título da resposta e a Mensagem antes de exportar.");
    return;
  }

  const linhas = [
    `# ${titulo}`,
    "",
    ...(shortcode ? [`_Short code: \`${shortcode}\`_`, ""] : []),
    mensagem
  ];

  const blob = new Blob([linhas.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(titulo)}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

function adicionarAListaSessao() {
  const { titulo, grupoId, mensagem } = lerComposer();
  if (!titulo || !mensagem) {
    alert("Preencha ao menos o Título da resposta e a Mensagem antes de adicionar à lista.");
    return;
  }

  respostasSessao.push({
    id: `sessao-${Date.now()}`,
    titulo,
    mensagem,
    grupoId,
    sessao: true
  });

  toggleComposer(false);
  limparComposer();
  grupoAtual = grupoId;
  renderGrupos();
  renderRespostas();
}

document.getElementById("btnNovaResposta").addEventListener("click", () => {
  preencherSelectGrupo();
  toggleComposer(true);
  document.getElementById("composerPanel").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("btnTogglePlaceholders").addEventListener("click", () => {
  const painel = document.getElementById("placeholderPanel");
  const abrindo = painel.classList.contains("hidden");
  painel.classList.toggle("hidden", !abrindo);
  if (abrindo) renderPlaceholderPicker();
});

document.getElementById("btnVisualizar").addEventListener("click", () => {
  const { mensagem } = lerComposer();
  const painel = document.getElementById("previewPanel");
  if (!mensagem.trim()) {
    alert("Escreva a mensagem antes de visualizar.");
    return;
  }
  document.getElementById("previewBox").innerHTML = substituirComExemplos(mensagem);
  painel.classList.remove("hidden");
});

document.getElementById("btnExportarMd").addEventListener("click", exportarMarkdown);
document.getElementById("btnAdicionarLista").addEventListener("click", adicionarAListaSessao);

renderGrupos();
renderRespostas();
