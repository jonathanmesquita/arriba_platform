const API_DEFAULT = "https://api.jm.dev.br";
const LOCAL_LOG_KEY = "arribaSupportCopilotLocalLogs";

const demoTicket = {
  ticketId: "65841",
  title: "Negociar debitos com parcelamento",
  customerId: "1155",
  customerName: "BCBR CARD LTDA",
  requesterName: "Ana Paula da Costa Melo",
  requesterEmail: "ana.melo@finazul.com.br",
  agentName: "Jonathan Oliveira Mesquita",
  product: "DataCob",
  message: "Cliente solicita apoio sobre negociacao de debitos com parcelamento no DataCob. Precisa entender a regra aplicada, o comportamento da tela e quais evidencias deve enviar para validacao."
};

const ids = [
  "ticketId",
  "title",
  "customerId",
  "customerName",
  "requesterName",
  "requesterEmail",
  "agentName",
  "product",
  "message",
  "apiBase"
];

let lastCopilotResult = null;
let currentTicketContext = null;
let selectedTicketFilter = "requesterOpenTickets";

const $ = (id) => document.getElementById(id);

function getEl(id) {
  return document.getElementById(id);
}

function safeSet(id, value) {
  const el = getEl(id);
  if (el) el.textContent = value || "-";
}

function safeHtml(id, value) {
  const el = getEl(id);
  if (el) el.innerHTML = value || "";
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


function isPresentationMode() {
  return Boolean(getEl("presentationModeToggle")?.checked);
}

function maskEmail(value = "") {
  const text = String(value || "");
  const [user, domain] = text.split("@");
  if (!user || !domain) return text ? "***" : "-";
  return `${user.slice(0, 2)}***@${domain}`;
}

function maskPhone(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "-";
  return digits.length > 4 ? `${digits.slice(0, 2)} *****-${digits.slice(-4)}` : "*****";
}

function maskName(value = "") {
  const text = String(value || "").trim();
  if (!text) return "-";
  const parts = text.split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts.slice(1).map(() => "***").join(" ")}` : `${parts[0].slice(0, 2)}***`;
}

function displayValue(label, value) {
  if (!isPresentationMode()) return value || "-";
  const key = normalizeText(label);
  if (key.includes("e-mail") || key.includes("email")) return maskEmail(value);
  if (key.includes("telefone") || key.includes("celular")) return maskPhone(value);
  if (key.includes("solicitante") || key.includes("agente")) return maskName(value);
  if (key.includes("empresa") || key.includes("cliente") || key.includes("razao")) return value ? "EMPRESA DEMO" : "-";
  if (key.includes("id externo") || key.includes("endereco")) return value ? "***" : "-";
  return value || "-";
}

function maskTicketSubject(value = "") {
  if (!isPresentationMode()) return value || "Sem assunto";
  return value ? "Assunto mascarado para apresentação" : "Sem assunto";
}

function apiBase() {
  const input = getEl("apiBase");
  const value = (input?.value || API_DEFAULT).trim().replace(/\/$/, "");
  localStorage.setItem("arribaSupportApiBase", value);
  return value;
}


function showAuthOverlay(message = "") {
  const overlay = getEl("authOverlay");
  const msg = getEl("authMessage");
  if (msg) msg.textContent = message || "";
  overlay?.classList.remove("d-none");
  setTimeout(() => getEl("authUsername")?.focus(), 80);
}

function hideAuthOverlay() {
  getEl("authOverlay")?.classList.add("d-none");
  const msg = getEl("authMessage");
  if (msg) msg.textContent = "";
}

async function fetchAuthStatus() {
  return requestJson(`${apiBase()}/auth/status`);
}

async function handleAuthLogin(event) {
  event?.preventDefault();
  const username = getEl("authUsername")?.value.trim();
  const password = getEl("authPassword")?.value || "";
  const message = getEl("authMessage");
  if (message) message.textContent = "";

  if (!username || !password) {
    if (message) message.textContent = "Informe usuário e senha.";
    return;
  }

  await withLoading(getEl("authLoginBtn"), "Entrando...", async () => {
    try {
      await requestJson(`${apiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      hideAuthOverlay();
      showCopilotNotice("success", "Sessão iniciada", "Acesso liberado para consultar tickets e base de conhecimento.", "Auth → Copilot");
    } catch (error) {
      if (message) message.textContent = getFriendlyErrorMessage(error);
      showCopilotNotice("warning", "Login não realizado", getFriendlyErrorMessage(error), "Auth");
    }
  });
}

async function checkAuthOnLoad() {
  try {
    const status = await fetchAuthStatus();
    if (status.enabled && !status.authenticated) {
      showAuthOverlay("Faça login para usar o Support Copilot.");
    }
  } catch (error) {
    // Se a rota de auth ainda não estiver no backend, não bloqueia o uso atual.
    console.warn("Auth status indisponível.", error);
  }
}


function readForm() {
  return {
    id: getEl("ticketId")?.value.trim(),
    ticketId: getEl("ticketId")?.value.trim(),
    subject: getEl("title")?.value.trim(),
    title: getEl("title")?.value.trim(),
    customerId: getEl("customerId")?.value.trim(),
    customerName: getEl("customerName")?.value.trim(),
    requester_name: getEl("requesterName")?.value.trim(),
    requester_email: getEl("requesterEmail")?.value.trim(),
    agent_name: getEl("agentName")?.value.trim() || "Jonathan Oliveira Mesquita",
    product: getEl("product")?.value.trim(),
    message: getEl("message")?.value.trim(),
    description: getEl("message")?.value.trim(),
    channel: "Manual / Freshdesk",
    requester: {
      name: getEl("requesterName")?.value.trim(),
      email: getEl("requesterEmail")?.value.trim()
    },
    company: {
      name: getEl("customerName")?.value.trim()
    }
  };
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function fillForm(data = {}) {
  const map = {
    ticketId: data.ticketId || data.id,
    title: data.title || data.subject,
    customerId: data.customerId || data.company_id,
    customerName: data.customerName || data.company_name || data.company?.name || data.company?.businessname,
    requesterName: data.requesterName || data.requester_name || data.requester?.name || data.name,
    requesterEmail: data.requesterEmail || data.requester_email || data.requester?.email || data.email,
    agentName: data.agentName || data.agent_name || data.agent?.name || data.agent?.contact?.name || data.responder_name,
    product: data.product,
    message: data.message || data.description_text || stripHtml(data.description || "")
  };

  Object.entries(map).forEach(([key, value]) => {
    const input = getEl(key);
    if (input && value !== undefined && value !== null) input.value = value;
  });
}

function inferDevelopmentType(text, freshdeskType) {
  if (/customizacao|customizacao|cliente especifico|regra especifica|personalizado|particularidade|excecao/.test(text)) return "Customizacao";
  if (/bug|erro|falha|nao funciona|parado|travado|exception|indisponivel|recepcao travada/.test(text) || freshdeskType === "Incidente") return "BUG (Erros)";
  return "Melhoria";
}

function inferLocal(input) {
  const text = normalizeText(`${input.subject} ${input.product} ${input.message}`);
  const isVersionTicket = /versao|versão|atualizacao de versao|atualização de versão|agendamento automatico|agendamento automático|checklist versao|checklist versão|virada de versao|virada de versão|homologacao|homologação/.test(text);
  const product = isVersionTicket ? "DataCob" : (input.product || (text.includes("databusca") ? "DataBusca" : text.includes("datacob") || text.includes("contrato") || text.includes("parcelamento") ? "DataCob" : "Nao identificado"));
  const freshdeskType = isVersionTicket
    ? "Versao"
    : /comercial|proposta|orcamento|licenca|demo|teste/.test(text)
    ? "Prospect"
    : /recepcao|importacao|layout|csv|arquivo/.test(text)
      ? "Recepcao de Arquivo"
      : /bug|erro|falha|nao funciona|problema/.test(text)
        ? "Incidente"
        : /melhoria|feature|sugestao/.test(text)
          ? "Melhorias"
          : "Duvida";
  const priority = /recepcao travada|sistema parado|operacao parada|urgente|indisponivel|parado/.test(text)
    ? "Urgente"
    : freshdeskType === "Incidente"
      ? "Alta"
      : freshdeskType === "Versao"
        ? "Media"
        : "Baixa";
  const recommendedScenario = freshdeskType === "Versao"
    ? "Mover para Datacob"
    : freshdeskType === "Prospect"
      ? "Mover para Comercial"
    : /bug|corrigir|melhoria|feature|customizacao|customizacao/.test(text)
      ? "Mover para Desenvolvimento"
      : product === "DataBusca"
        ? "Mover para CRM/DataBusca"
        : product === "DataCob"
          ? "Mover para Datacob"
          : "Revisao manual pelo Suporte";
  const needsDevelopmentSpec = recommendedScenario === "Mover para Desenvolvimento" || freshdeskType === "Incidente" || freshdeskType === "Melhorias";
  const developmentType = needsDevelopmentSpec ? inferDevelopmentType(text, freshdeskType) : "Nao indicado";
  const versionChecklist = [
    "Confirmar se a solicitacao e sobre atualizacao/agendamento de versao do DataCob",
    "Confirmar se o cliente esta no ambiente de homologacao",
    "Orientar acesso ao icone de ajuda (?) e a opcao Checklist versao",
    "Confirmar se o checklist foi finalizado com sucesso",
    "Validar data e horario pretendidos para a virada",
    "Se for mesmo dia, confirmar se o checklist foi finalizado ate as 17h",
    "Se for sexta, sabado ou domingo, orientar que o suporte devera atuar para efetivar no proximo dia util",
    "Se necessario, enviar/anexar o manual de agendamento automatico de versao"
  ];
  const checklist = isVersionTicket ? versionChecklist : [
    "Solicitar print da tela ou erro apresentado",
    "Confirmar passo a passo realizado",
    "Confirmar comportamento atual e esperado",
    "Confirmar cliente, carteira ou contrato afetado",
    "Registrar horario aproximado da ocorrencia"
  ];
  const recommendedTemplate = freshdeskType === "Versao"
    ? { key: "versaoAgendamento", title: "@Respostas para o cliente quer atualizar versao - (Resposta do agendamento)" }
    : freshdeskType === "Prospect"
      ? { key: "direcionamentoComercial", title: "Direcionamento para Comercial" }
    : recommendedScenario === "Mover para Desenvolvimento"
      ? { key: "encaminharDesenvolvimento", title: "Chamado encaminhado para Desenvolvimento" }
      : { key: "solicitarEvidencias", title: "Solicitar mais evidencias" };
  const summary = `${input.customerName || input.company?.name || "Cliente"} relata: ${input.message || input.description || "descricao nao informada."}`;
  const versionReply = `Boa tarde, ${input.requester?.name || input.requester_name || ""},\n\nO agendamento deve ocorrer no ambiente de homologacao.\n\nEm anexo, segue o manual com as instrucoes para o agendamento automatico de versao do DataCob.\n\nDe forma resumida, o cliente deve acessar o ambiente de homologacao, abrir a opcao Checklist versao, validar os itens necessarios e finalizar o checklist para selecionar a data e horario da virada.\n\nAtencao as principais regras:\n- Para agendamento no mesmo dia, o checklist deve ser finalizado ate as 17h;\n- Agendamentos automaticos devem ocorrer de segunda a quinta-feira, entre 20h e 00h;\n- Agendamentos para sexta-feira, sabado ou domingo exigem atuacao/validacao do suporte;\n- Em caso de cancelamento do agendamento, sera necessario contato com o suporte para nova orientacao.\n\nObrigado!`;
  const responseBody = isVersionTicket ? versionReply : `Ola ${input.requester?.name || input.requester_name || ""},\n\nRecebemos sua solicitacao e ja estamos analisando o cenario informado.\n\nPara seguirmos com a validacao, poderia nos encaminhar:\n${checklist.map((item) => "- " + item).join("\n")}\n\nAtenciosamente,\n${input.agent_name || "Analista responsavel"}`;
  const internalBody = `Analise IA - Support Copilot\n\nTicket: #${input.id || input.ticketId || "manual"}\nAssunto: ${input.subject || "-"}\nSolicitante: ${input.requester?.name || input.requester_name || "-"}\nEmpresa: ${input.customerName || input.company?.name || "-"}\n\nResumo da solicitacao:\n${summary}\n\nProduto identificado:\n${product}\n\nTipo Freshdesk sugerido:\n${freshdeskType}\n\nTipo DEV sugerido:\n${developmentType}\n\nPrioridade sugerida:\n${priority}\n\nCenario recomendado:\n${recommendedScenario}\n\nResposta predefinida recomendada:\n${recommendedTemplate.title}\n\nChecklist de evidencias:\n${checklist.map((item) => "- " + item).join("\n")}`;
  return {
    ticket: input,
    conversations: [],
    context: {},
    analysis: {
      source: "fallback-local-frontend",
      product,
      requestType: freshdeskType === "Incidente" ? "Erro tecnico" : freshdeskType === "Prospect" ? "Solicitacao comercial" : "Duvida operacional",
      freshdeskType,
      priority,
      recommendedScenario,
      developmentType,
      needsDevelopmentSpec,
      recommendedTemplate,
      confidence: 0.72,
      routine: input.subject || "Rotina a confirmar",
      summary,
      currentScenario: summary,
      expectedBehavior: "O atendimento deve validar evidencias, orientar o cliente ou encaminhar com contexto suficiente.",
      suggestedReply: responseBody,
      checklist,
      evidenceNeeded: checklist,
      agentValidation: {
        status: "Nao validado",
        message: "Validacao de agente/grupo disponivel quando o ticket vem do Freshdesk."
      },
      knowledgeBase: isVersionTicket ? [{
        id: "datacob-agendamento-automatico-versao",
        title: "Manual - Agendamento automatico de versao",
        source: "fallback-local-frontend",
        product: "DataCob",
        freshdeskType: "Versao",
        summary: "Manual usado para orientar agendamento automatico de versao do DataCob em homologacao.",
        rules: [
          "Checklist deve ser finalizado ate as 17h para agendamento no mesmo dia.",
          "Agendamento automatico ocorre de segunda a quinta-feira entre 20h e 00h.",
          "Sexta, sabado, domingo ou cancelamento exigem atuacao do suporte."
        ],
        checklist
      }] : [],
      knowledgeSummary: isVersionTicket ? "Manual - Agendamento automatico de versao: orientar ambiente de homologacao, checklist versao e regras de horario." : "Sem base relacionada.",
      nextAction: isVersionTicket ? "Usar resposta predefinida de agendamento de versao, anexar/indicar o manual e confirmar data/horario conforme regras do checklist." : "Revisar a analise, confirmar evidencias e usar a resposta predefinida recomendada.",
      developmentSpec: buildLocalDevelopmentSpec(input, product, priority, developmentType, checklist)
    },
    renderedTemplates: {
      recommended: recommendedTemplate,
      customerReply: { title: recommendedTemplate.title, type: "public_reply", body: responseBody, variables: {} },
      internalNote: { title: "@Anotacoes - Analise IA Support Copilot", type: "private_note", body: internalBody, variables: {} }
    }
  };
}

function buildLocalDevelopmentSpec(input, product, priority, developmentType, checklist) {
  const customer = `${input.customerId ? input.customerId + " - " : ""}${input.customerName || input.company?.name || "<NOME DO CLIENTE>"}`;
  return `------------| Especificacao de Requisito PARA DESENVOLVIMENTO |------------\n\nCliente: ${customer}\nVersao do cliente:\nVersao PH3A:\n\nAnalista Responsavel: ${input.agent_name || "Jonathan Oliveira Mesquita"}\nTicket Freshdesk: #${input.id || input.ticketId || "<ID_TICKET>"}\nProduto: ${product}\nTipo DEV: ${developmentType}\nPrioridade sugerida: ${priority}\n\n---------------------------------------\nRotina:\n${input.subject || "Rotina a confirmar"}\n\nO cenario atual:\n${input.message || input.description || "Descricao nao informada."}\n\nA necessidade e:\nA rotina deve ser analisada para corrigir, melhorar ou validar o comportamento descrito pelo cliente.\n\nCriterio de aceite:\n- Deve ser possivel reproduzir e validar o cenario informado.\n- O comportamento esperado deve ser entregue sem gerar regressao.\n- O suporte deve conseguir homologar com base nas evidencias.\n\n------------------------------------------------\nAnexo:\n${checklist.map((item) => "- " + item).join("\n")}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 || payload?.code === "AUTH_REQUIRED") {
    showAuthOverlay(payload?.message || payload?.error || "Faça login para continuar.");
  }

  if (!response.ok) {
    const message = payload.error || payload.message || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    if (response.status === 401) error.authRequired = true;
    if (response.status === 403 || payload.permissionDenied) error.permissionDenied = true;
    throw error;
  }
  return payload;
}

async function analyzeManualTicket(input) {
  try {
    return await requestJson(`${apiBase()}/support/copilot/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: input })
    });
  } catch (error) {
    console.warn("Support Copilot API indisponivel. Usando fallback local.", error);
    return inferLocal(input);
  }
}

async function fetchFreshdeskContext(ticketId) {
  return requestJson(`${apiBase()}/freshdesk/tickets/${encodeURIComponent(ticketId)}/context`);
}

async function searchFreshdeskTickets(term) {
  return requestJson(`${apiBase()}/freshdesk/tickets/search?term=${encodeURIComponent(term)}`);
}

async function analyzeFreshdeskTicket(ticketId) {
  return requestJson(`${apiBase()}/freshdesk/tickets/${encodeURIComponent(ticketId)}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addInternalNote: false, updateTags: false })
  });
}

async function fetchQualityDashboard() {
  return requestJson(`${apiBase()}/freshdesk/quality/dashboard`);
}

async function fetchKnowledgeAdmin(force = false) {
  return requestJson(`${apiBase()}/freshdesk/knowledge/admin?force=${force ? "true" : "false"}`);
}

async function searchKnowledgeBase(term, force = false) {
  return requestJson(`${apiBase()}/freshdesk/knowledge/search?term=${encodeURIComponent(term)}&force=${force ? "true" : "false"}`);
}

async function syncKnowledgeBase() {
  return requestJson(`${apiBase()}/freshdesk/knowledge/sync?force=true`);
}

async function searchManualsBase(term) {
  return requestJson(`${apiBase()}/freshdesk/manuals/search?term=${encodeURIComponent(term || "")}&limit=8`);
}

async function searchPackagesBase(term) {
  return requestJson(`${apiBase()}/freshdesk/packages/search?term=${encodeURIComponent(term || "")}&limit=10`);
}


async function registerValidation(payload) {
  return requestJson(`${apiBase()}/support/copilot/validation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function normalizeResult(data) {
  if (data.analysis) return data;
  if (data.classification) {
    return {
      ticket: data.ticket || {},
      context: data.context || {},
      conversations: data.conversations || [],
      analysis: {
        source: data.source,
        product: data.classification.product,
        requestType: data.classification.requestType,
        freshdeskType: data.classification.requestType,
        priority: data.classification.priority,
        recommendedScenario: data.classification.scenario,
        summary: data.summary?.short,
        currentScenario: data.summary?.technical,
        checklist: data.checklist,
        developmentSpec: data.developmentSpec,
        nextAction: data.supportPrediction?.recurrenceSignal
      },
      renderedTemplates: {
        recommended: { title: data.response?.predefinedRecommended || "-" },
        customerReply: { body: data.response?.suggestedMessage || "-" },
        internalNote: { body: data.internalNote || "-" }
      }
    };
  }
  return data;
}

function renderList(items = []) {
  const ul = getEl("outChecklist");
  if (!ul) return;
  ul.innerHTML = "";
  (Array.isArray(items) ? items : [items]).filter(Boolean).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  });
}

function renderContact(context = {}, ticket = {}, analysis = {}) {
  const contact = context.contact || ticket.requester || {};
  const company = context.company || ticket.company || {};
  const group = context.group || {};
  const agent = context.agent || {};
  const validation = analysis.agentValidation || {};
  const rows = [
    ["Solicitante", contact.name || ticket.requester_name || "-"],
    ["E-mail", contact.email || ticket.requester_email || "-"],
    ["Telefone", contact.phone || "-"],
    ["Celular", contact.mobile || "-"],
    ["Endereco", contact.address || "-"],
    ["ID externo", contact.unique_external_id || "-"],
    ["Empresa", company.name || company.businessname || ticket.company_name || ticket.company_id || "-"],
    ["Razao social", company.businessname || "-"],
    ["Segmento", company.industry || "-"],
    ["Health score", company.health_score || "-"],
    ["Grupo", group.name || ticket.group_name || analysis.recommendedGroup || "-"],
    ["Agente", agent.name || ticket.responder_name || ticket.agent_name || "-"],
    ["Validacao", `${validation.status || "Nao validado"} - ${validation.message || ""}`]
  ];
  const agents = validation.validAgents || [];
  const agentsHtml = agents.length
    ? `<div class="context-row context-row-wide"><span>Agentes validos Suporte DataCob</span><strong>${agents.map(escapeHtml).join(" • ")}</strong></div>`
    : "";
  safeHtml("outContact", rows.map(([label, value]) => `<div class="context-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(displayValue(label, value))}</strong></div>`).join("") + agentsHtml);
}

function freshdeskTicketUrl(ticket = {}) {
  if (ticket.url) return ticket.url;
  const id = ticket.id || ticket.display_id || ticket.ticket_id;
  if (!id) return "";
  return `https://ph3a.freshdesk.com/a/tickets/${encodeURIComponent(id)}`;
}

function statusLabel(value) {
  const map = { 2: "Aberto", 3: "Pendente", 4: "Resolvido", 5: "Fechado", 6: "Aguardando Cliente", 7: "Aguardando Aprovação", 8: "Análise", 9: "Desenvolvendo", 10: "Homologado", 11: "Rejeitado", 12: "Em Backlog" };
  return map[value] || value || "-";
}

function priorityLabel(value) {
  const map = { 1: "Baixa", 2: "Média", 3: "Alta", 4: "Urgente" };
  return map[value] || value || "-";
}

function ticketDate(ticket = {}) {
  const raw = ticket.updated_at || ticket.created_at || ticket.due_by || "";
  if (!raw) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(raw));
  } catch {
    return raw;
  }
}


function dedupeByTicketId(items = []) {
  const map = new Map();
  (items || []).filter(Boolean).forEach((ticket) => {
    const key = String(ticket.id || ticket.display_id || ticket.ticket_id || JSON.stringify(ticket));
    if (!map.has(key)) map.set(key, ticket);
  });
  return Array.from(map.values());
}

function isTicketOpen(ticket = {}) {
  const numericStatus = Number(ticket.status);
  if ([4, 5].includes(numericStatus)) return false;
  const label = normalizeText(ticket.status_name || ticket.status_label || ticket.status || "");
  return !/(resolvido|fechado|closed|resolved|encerrado)/.test(label);
}

function priorityClassName(priority = "") {
  const key = normalizeText(priority);
  if (key.includes("urgente") || key === "4") return "priority-urgent";
  if (key.includes("alta") || key === "3") return "priority-high";
  if (key.includes("media") || key.includes("média") || key === "2") return "priority-medium";
  return "priority-low";
}

function statusClassName(status = "") {
  const key = normalizeText(status);
  if (/fechado|resolvido|closed|resolved/.test(key)) return "status-closed";
  if (/aguardando cliente|pendente/.test(key)) return "status-waiting";
  if (/desenvolvendo|analise|análise|homologado|backlog/.test(key)) return "status-progress";
  return "status-open";
}

function getTicketCollections(context = {}) {
  const openAll = dedupeByTicketId([...(context.openTickets || []), ...(context.requesterOpenTickets || []), ...(context.companyOpenTickets || []), ...((context.associatedTickets || []).filter(isTicketOpen))]);
  const closedAll = dedupeByTicketId([...(context.closedTickets || []), ...(context.requesterClosedTickets || []), ...(context.companyClosedTickets || []), ...((context.requesterAllTickets || []).filter((item) => !isTicketOpen(item)))]);
  return {
    openAll,
    associatedTickets: context.associatedTickets || [],
    companyOpenTickets: context.companyOpenTickets || [],
    requesterAllTickets: context.requesterAllTickets || [],
    requesterOpenTickets: context.requesterOpenTickets || [],
    closedTickets: closedAll,
    recurrenceCandidates: context.recurrenceCandidates || []
  };
}

const ticketFilterLabels = {
  openAll: "Abertos",
  associatedTickets: "Tickets associados",
  companyOpenTickets: "Tickets abertos da empresa",
  requesterAllTickets: "Todos do solicitante",
  requesterOpenTickets: "Abertos do solicitante",
  closedTickets: "Tickets encerrados"
};

function renderRecurrenceInsights(context = {}) {
  const insights = context.recurrenceInsights || {};
  const topProblems = Object.entries(insights.topProblems || {});
  const priorityCounts = Object.entries(insights.priorityCounts || {});
  const statusCounts = Object.entries(insights.statusCounts || {});
  const alerts = insights.alerts || [];
  const renderMiniCounts = (title, entries) => `
    <div class="recurrence-mini-card">
      <span>${escapeHtml(title)}</span>
      ${entries.length ? entries.slice(0, 5).map(([label, count]) => `<strong>${escapeHtml(label)} <em>${escapeHtml(count)}</em></strong>`).join("") : `<small>Nenhum dado suficiente.</small>`}
    </div>`;
  return `
    <div class="recurrence-panel">
      <div class="ticket-list-header mb-2">
        <h4>Analise IA de recorrencia</h4>
        <span>${escapeHtml(insights.totalAnalyzedTickets ?? 0)} ticket(s) avaliados</span>
      </div>
      <div class="recurrence-grid">
        ${renderMiniCounts("Problemas recorrentes", topProblems)}
        ${renderMiniCounts("Prioridades", priorityCounts)}
        ${renderMiniCounts("Status", statusCounts)}
      </div>
      ${alerts.length ? `<div class="recurrence-alerts mt-2">${alerts.map((item) => `<div><i class="fa-solid fa-triangle-exclamation me-2"></i>${escapeHtml(item)}</div>`).join("")}</div>` : `<p class="text-secondary mb-0 mt-2">Sem alerta de recorrencia forte com os dados retornados.</p>`}
    </div>`;
}

function renderTicketList(title, items = [], emptyText = "Nenhum ticket retornado pela API.") {
  const list = Array.isArray(items) ? items : [];
  return `
    <div class="ticket-list-block">
      <div class="ticket-list-header">
        <h4>${escapeHtml(title)}</h4>
        <span>${list.length} encontrado(s)</span>
      </div>
      <div class="ticket-card-list">
        ${list.length
          ? list.slice(0, 15).map((ticket) => {
              const id = ticket.id || ticket.display_id || ticket.ticket_id || "-";
              const url = freshdeskTicketUrl(ticket);
              const subject = maskTicketSubject(ticket.subject || ticket.title || "Sem assunto");
              const status = ticket.status_name || ticket.status_label || statusLabel(ticket.status);
              const priority = ticket.priority_name || ticket.priority_label || priorityLabel(ticket.priority);
              const rawRequester = ticket.requester?.name || ticket.requester_name || ticket.requester_email || ticket.email || "";
              const requester = displayValue(rawRequester.includes("@") ? "E-mail" : "Solicitante", rawRequester);
              const date = ticketDate(ticket);
              return `
                <article class="ticket-context-card">
                  <div>
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><strong>#${escapeHtml(id)}</strong> - ${escapeHtml(subject)}</a>
                    <small>${escapeHtml(requester)}${requester && date ? " • " : ""}${escapeHtml(date)}</small>
                  </div>
                  <div class="ticket-badges">
                    <span class="${statusClassName(status)}">${escapeHtml(status)}</span>
                    <span class="${priorityClassName(priority)}">${escapeHtml(priority)}</span>
                  </div>
                </article>`;
            }).join("")
          : `<p class="text-secondary mb-0">${escapeHtml(emptyText)}</p>`}
      </div>
    </div>`;
}

function renderTickets(context = {}, filterKey = selectedTicketFilter) {
  currentTicketContext = context || {};
  const summary = context.requesterTicketSummary || {};
  const collections = getTicketCollections(context);
  const activeKey = collections[filterKey] ? filterKey : "requesterOpenTickets";
  selectedTicketFilter = activeKey;
  const activeList = collections[activeKey] || [];
  const header = `
    <div class="ticket-summary-strip">
      <div><span>Solicitante</span><strong>${escapeHtml(summary.requesterEmail || "-")}</strong></div>
      <div><span>Total localizado</span><strong>${escapeHtml(summary.totalFound ?? collections.requesterAllTickets.length ?? "-")}</strong></div>
      <div><span>Abertos</span><strong>${escapeHtml(summary.openFound ?? collections.requesterOpenTickets.length ?? "-")}</strong></div>
      <div><span>Empresa</span><strong>${escapeHtml(summary.companyOpenFound ?? collections.companyOpenTickets.length ?? "-")}</strong></div>
      <div><span>Encerrados</span><strong>${escapeHtml(summary.closedFound ?? collections.closedTickets.length ?? "-")}</strong></div>
      <div><span>Associados</span><strong>${escapeHtml(summary.associatedFound ?? collections.associatedTickets.length ?? "-")}</strong></div>
    </div>`;

  const filterBar = `
    <div class="ticket-filter-bar" role="group" aria-label="Filtros de tickets relacionados">
      ${Object.entries(ticketFilterLabels).map(([key, label]) => `
        <button type="button" class="ticket-filter-btn ${key === activeKey ? "active" : ""}" data-ticket-filter="${key}">
          ${escapeHtml(label)} <span>${escapeHtml((collections[key] || []).length)}</span>
        </button>`).join("")}
    </div>`;

  safeHtml("outTickets", `
    ${header}
    ${filterBar}
    ${renderTicketList(ticketFilterLabels[activeKey] || "Tickets", activeList, "Nenhum ticket retornado para este filtro.")}
    ${renderRecurrenceInsights(context)}
  `);

  document.querySelectorAll("[data-ticket-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTicketFilter = button.dataset.ticketFilter || "requesterOpenTickets";
      renderTickets(currentTicketContext || {}, selectedTicketFilter);
    });
  });
}

function buildKnowledgeText(analysis = {}) {
  const articles = Array.isArray(analysis.knowledgeBase) ? analysis.knowledgeBase : [];
  if (!articles.length) return "Nenhuma base de conhecimento sugerida para este chamado.";
  return articles.map((article, index) => {
    const rules = Array.isArray(article.rules) ? article.rules.map((item) => `- ${item}`).join("\n") : "- Regras nao informadas.";
    const checklist = Array.isArray(article.checklist) ? article.checklist.map((item) => `- ${item}`).join("\n") : "- Checklist nao informado.";
    return `${index + 1}. ${article.title}
Tipo: ${article.freshdeskType || "-"}
Produto: ${article.product || "-"}
Fonte: ${article.source || "-"}
Resumo: ${article.summary || "-"}

Regras:
${rules}

Checklist:
${checklist}`;
  }).join("\n\n---\n\n");
}

function renderKnowledgeAdminPanel(data = {}) {
  if (!data || !data.index) {
    safeHtml("knowledgeAdminPanel", "");
    return;
  }

  const index = data.index || {};
  const gaps = data.gaps || {};
  const cache = data.cache || {};
  const totals = index.totals || {};
  const sync = index.sync || {};
  const gapText = gaps.coverageRate === null || gaps.coverageRate === undefined ? "-" : `${gaps.coverageRate}%`;
  const freshdeskRate = gaps.freshdeskUsageRate === null || gaps.freshdeskUsageRate === undefined ? "-" : `${gaps.freshdeskUsageRate}%`;

  safeHtml("knowledgeAdminPanel", `
    <div class="knowledge-admin-grid">
      <div class="knowledge-admin-card"><span>Modo</span><strong>${escapeHtml(data.mode || "read-only")}</strong><small>Escrita: ${data.writesEnabled ? "ativa" : "desativada"}</small></div>
      <div class="knowledge-admin-card"><span>Artigos Freshdesk</span><strong>${escapeHtml(totals.freshdesk ?? 0)}</strong><small>Pastas: ${escapeHtml((data.cache?.cachedFolders || []).join(", ") || "-")}</small></div>
      <div class="knowledge-admin-card"><span>Base local</span><strong>${escapeHtml(totals.local ?? 0)}</strong><small>Fallback versionado</small></div>
      <div class="knowledge-admin-card"><span>Cobertura</span><strong>${escapeHtml(gapText)}</strong><small>Uso Freshdesk: ${escapeHtml(freshdeskRate)}</small></div>
    </div>
    <div class="knowledge-sync mt-2">
      <span class="ticket-chip">Sync: ${escapeHtml(sync.syncedAt ? new Date(sync.syncedAt).toLocaleString("pt-BR") : "não sincronizado")}</span>
      <span class="ticket-chip">Cache: ${escapeHtml(cache.cachedArticles ?? 0)}</span>
      <span class="ticket-chip">TTL: ${escapeHtml(index.config?.cacheTtlMinutes ?? "-")} min</span>
      ${cache.lastError ? `<span class="ticket-chip danger">Erro: ${escapeHtml(cache.lastError)}</span>` : ""}
    </div>
    ${(gaps.missingTerms || []).length ? `<div class="mt-2"><strong>Lacunas de conhecimento detectadas</strong><div class="d-flex flex-wrap gap-2 mt-2">${gaps.missingTerms.map((item) => `<span class="ticket-chip">${escapeHtml(item.term)} (${escapeHtml(item.count)})</span>`).join("")}</div></div>` : ""}
  `);
}

function renderKnowledgeSearchResults(result = {}) {
  const articles = Array.isArray(result.combined) ? result.combined : [];
  if (!articles.length) {
    safeHtml("knowledgeSearchResults", `<div class="empty-mini">Nenhum artigo localizado para a busca.</div>`);
    return;
  }

  safeHtml("knowledgeSearchResults", `
    <div class="knowledge-sync mb-2">
      <span class="ticket-chip">Termo: ${escapeHtml(result.term || "-")}</span>
      <span class="ticket-chip">Fonte: ${escapeHtml(result.source || "-")}</span>
      <span class="ticket-chip">Freshdesk: ${escapeHtml(result.freshdesk?.length ?? 0)}</span>
      <span class="ticket-chip">Local: ${escapeHtml(result.local?.length ?? 0)}</span>
    </div>
    ${articles.map((article) => `
      <article class="knowledge-card compact">
        <div class="d-flex justify-content-between gap-2 flex-wrap">
          <div>
            <span class="knowledge-source">${escapeHtml(article.sourceLabel || article.source || "base")}</span>
            <h4>${escapeHtml(article.title || "Artigo sem titulo")}</h4>
          </div>
          <div class="d-flex gap-2 flex-wrap align-items-start">
            <span class="ticket-chip">${escapeHtml(article.product || "-")}</span>
            <span class="ticket-chip">${escapeHtml(article.freshdeskType || "-")}</span>
            <span class="ticket-chip">Score ${escapeHtml(article.score ?? "-")}</span>
          </div>
        </div>
        <p>${escapeHtml(article.summary || "Sem resumo.")}</p>
        ${article.url ? `<a class="btn btn-sm btn-outline-light mt-2" href="${escapeHtml(article.url)}" target="_blank" rel="noopener">Abrir artigo</a>` : ""}
      </article>
    `).join("")}
  `);
}

async function handleRefreshKnowledgeAdmin(force = false) {
  await withLoading(getEl("refreshKnowledgeAdminBtn"), "Atualizando...", async () => {
    try {
      const data = await fetchKnowledgeAdmin(force);
      renderKnowledgeAdminPanel(data);
      showToast("Status da base atualizado.");
    } catch (error) {
      safeHtml("knowledgeAdminPanel", `<div class="empty-mini">Nao foi possivel carregar o status da base: ${escapeHtml(error.message)}</div>`);
      showCopilotError("Falha ao carregar status da base", error, "Base → Freshdesk Solutions");
    }
  });
}

async function handleSyncKnowledge() {
  await withLoading(getEl("syncKnowledgeBtn"), "Sincronizando...", async () => {
    try {
      await syncKnowledgeBase();
      const data = await fetchKnowledgeAdmin(false);
      renderKnowledgeAdminPanel(data);
      showToast("Base Freshdesk sincronizada.");
    } catch (error) {
      safeHtml("knowledgeAdminPanel", `<div class="empty-mini">Nao foi possivel sincronizar a base Freshdesk: ${escapeHtml(error.message)}</div>`);
      showToast("Falha ao sincronizar base.");
    }
  });
}

async function handleKnowledgeSearch() {
  const term = getEl("knowledgeSearchInput")?.value?.trim() || getEl("title")?.value?.trim() || "versao";
  await withLoading(getEl("knowledgeSearchBtn"), "Buscando...", async () => {
    try {
      const result = await searchKnowledgeBase(term, false);
      renderKnowledgeSearchResults(result);
      showToast("Busca na base concluida.");
    } catch (error) {
      safeHtml("knowledgeSearchResults", `<div class="empty-mini">Falha na busca da base: ${escapeHtml(error.message)}</div>`);
      showToast("Falha ao buscar na base.");
    }
  });
}


function renderManualSuggestions(manuals = [], match = {}) {
  const target = getEl("manualSuggestions");
  if (!target) return;
  const list = Array.isArray(manuals) ? manuals : [];
  if (!list.length) {
    target.innerHTML = `<div class="empty-mini">Nenhum manual sugerido ainda. Use a busca manual ou analise um ticket.</div>`;
    return;
  }
  const detected = match.detected || {};
  target.innerHTML = `
    <div class="manual-match-summary mb-2">
      <span class="ticket-chip">Rotina: ${escapeHtml(detected.routine || "A confirmar")}</span>
      <span class="ticket-chip">Categoria: ${escapeHtml(detected.category || "A confirmar")}</span>
      <span class="ticket-chip">Cliente: ${escapeHtml(detected.client || "Geral")}</span>
    </div>
    ${list.slice(0, 6).map((manual) => `
      <article class="manual-suggestion-card">
        <div>
          <span class="knowledge-source">${escapeHtml(manual.kind || manual.source || "Manual")}</span>
          <h4>${escapeHtml(manual.title || "Manual sem titulo")}</h4>
          <p>${escapeHtml(manual.summary || manual.suggestedReply || "Sem resumo.")}</p>
          <div class="d-flex gap-2 flex-wrap">
            <span class="ticket-chip">${escapeHtml(manual.category || "-")}</span>
            <span class="ticket-chip">${escapeHtml(manual.client || "Geral")}</span>
            <span class="ticket-chip">Score ${escapeHtml(manual.score ?? "-")}</span>
          </div>
          ${manual.checklist?.length ? `<details class="mt-2"><summary>Checklist rápido</summary><ul class="mt-2">${manual.checklist.slice(0, 6).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details>` : ""}
        </div>
        <div class="manual-suggestion-actions">
          ${manual.url ? `<a class="btn btn-sm btn-danger" href="${escapeHtml(manual.url)}" target="_blank" rel="noopener">Abrir artigo</a>` : ""}
          <button class="btn btn-sm btn-outline-light" type="button" data-manual-copy="${escapeHtml(manual.id || "")}">Copiar</button>
        </div>
      </article>
    `).join("")}
  `;
}

async function handleManualSearch() {
  const term = getEl("manualSearchInput")?.value?.trim() || getEl("title")?.value?.trim() || getEl("message")?.value?.trim() || "renegociacao";
  await withLoading(getEl("manualSearchBtn"), "Buscando...", async () => {
    try {
      const result = await searchManualsBase(term);
      renderManualSuggestions(result.manuals || [], { detected: { routine: term, category: "Busca manual", client: "A confirmar" } });
      showToast("Busca de manuais concluida.");
    } catch (error) {
      safeHtml("manualSuggestions", `<div class="empty-mini">Falha ao buscar manuais: ${escapeHtml(error.message)}</div>`);
    }
  });
}


function renderPackageSuggestions(packages = [], match = {}) {
  const target = getEl("packageSuggestions");
  if (!target) return;
  const list = Array.isArray(packages) ? packages : [];
  if (!list.length) {
    target.innerHTML = `<div class="empty-mini">Nenhum pacote sugerido ainda. Busque por ID, cliente, rotina ou analise um ticket.</div>`;
    return;
  }
  const detected = match.detected || {};
  target.innerHTML = `
    <div class="manual-match-summary mb-2">
      <span class="ticket-chip">Rotina: ${escapeHtml(detected.routine || "A confirmar")}</span>
      <span class="ticket-chip">Categoria: ${escapeHtml(detected.category || "A confirmar")}</span>
      <span class="ticket-chip">Cliente: ${escapeHtml(detected.client || "A confirmar")}</span>
    </div>
    ${list.slice(0, 8).map((pkg) => `
      <article class="manual-suggestion-card package-suggestion-card">
        <div>
          <span class="knowledge-source">Pacote #${escapeHtml(pkg.id || "-")} · ${escapeHtml(pkg.category || "Rotina")}</span>
          <h4>${escapeHtml(pkg.description || "Pacote sem descricao")}</h4>
          <p>Cliente/origem: <strong>${escapeHtml(pkg.client || "Geral")}</strong> · Rotina: <strong>${escapeHtml(pkg.routine || "A confirmar")}</strong></p>
          <p class="mini-muted">Passos: <strong>${escapeHtml(pkg.steps ?? pkg.qtde_passos ?? 0)}</strong> · Arquivo: <strong>${escapeHtml(pkg.fileSteps ?? pkg.qtde_passos_arquivo ?? 0)}</strong> · Cliente Web: <strong>${escapeHtml(pkg.clientWeb || "Não")}</strong></p>
          <div class="d-flex gap-2 flex-wrap">
            <span class="ticket-chip">${escapeHtml(pkg.product || "DataCob")}</span>
            <span class="ticket-chip">${escapeHtml(pkg.module || pkg.category || "-")}</span>
            <span class="ticket-chip">Criticidade ${escapeHtml(pkg.criticality || pkg.criticidade || "-")}</span>
            <span class="ticket-chip">Monitorar: ${escapeHtml(pkg.monitorArriba || pkg.monitorar_arriba || "Não")}</span>
            <span class="ticket-chip">Score ${escapeHtml(pkg.score ?? "-")}</span>
          </div>
        </div>
        <div class="manual-suggestion-actions">
          <button class="btn btn-sm btn-outline-light" type="button" data-package-copy="${escapeHtml(pkg.id || "")}">Copiar de/para</button>
        </div>
      </article>
    `).join("")}
  `;
}

async function handlePackageSearch() {
  const term = getEl("packageSearchInput")?.value?.trim() || getEl("title")?.value?.trim() || getEl("message")?.value?.trim() || "recepcao";
  await withLoading(getEl("packageSearchBtn"), "Buscando...", async () => {
    try {
      const result = await searchPackagesBase(term);
      renderPackageSuggestions(result.packages || [], { detected: { routine: term, category: "Busca manual", client: "A confirmar" } });
      showToast("Busca de pacotes concluida.");
    } catch (error) {
      safeHtml("packageSuggestions", `<div class="empty-mini">Falha ao buscar pacotes: ${escapeHtml(error.message)}</div>`);
    }
  });
}

function copyPackageFromCard(button) {
  const card = button.closest(".package-suggestion-card");
  if (!card) return;
  navigator.clipboard?.writeText(card.innerText.trim());
  showToast("De/para do pacote copiado.");
}

function renderKnowledge(analysis = {}, context = {}) {
  const articles = Array.isArray(analysis.knowledgeBase) ? analysis.knowledgeBase : [];
  const searchInfo = context.knowledgeSearch || {};
  renderManualSuggestions(context.manuals || analysis.manuals || [], context.manualMatch || {});
  renderPackageSuggestions(context.packages || analysis.packages || [], context.packageMatch || {});
  safeSet("outKnowledgeText", buildKnowledgeText(analysis));

  const infoHtml = `
    <div class="knowledge-sync mb-3">
      <span class="ticket-chip">Fonte: ${escapeHtml(searchInfo.source || "local")}</span>
      <span class="ticket-chip">Local: ${escapeHtml(searchInfo.localCount ?? "-")}</span>
      <span class="ticket-chip">Freshdesk: ${escapeHtml(searchInfo.freshdeskCount ?? "-")}</span>
      <span class="ticket-chip">Total: ${escapeHtml(searchInfo.totalCount ?? articles.length)}</span>
      ${searchInfo.sync?.syncedAt ? `<span class="ticket-chip">Sync: ${escapeHtml(new Date(searchInfo.sync.syncedAt).toLocaleString("pt-BR"))}</span>` : ""}
    </div>`;

  if (!articles.length) {
    safeHtml("outKnowledge", `${infoHtml}<div class="empty-mini">Nenhuma base relacionada encontrada. Para melhorar, cadastre palavras-chave ou conecte a base de conhecimento do Freshdesk.</div>`);
    return;
  }

  safeHtml("outKnowledge", infoHtml + articles.map((article) => `
    <article class="knowledge-card">
      <div class="d-flex justify-content-between gap-2 flex-wrap">
        <div>
          <span class="knowledge-source">${escapeHtml(article.sourceLabel || article.source || "base")}</span>
          <h4>${escapeHtml(article.title || "Artigo sem titulo")}</h4>
        </div>
        <div class="d-flex gap-2 flex-wrap align-items-start">
          <span class="ticket-chip">${escapeHtml(article.product || "-")}</span>
          <span class="ticket-chip">${escapeHtml(article.freshdeskType || "-")}</span>
          <span class="ticket-chip">Score ${escapeHtml(article.score ?? "-")}</span>
        </div>
      </div>
      <p>${escapeHtml(article.summary || "Sem resumo.")}</p>
      <div class="knowledge-columns">
        <div>
          <strong>Regras principais</strong>
          <ul>${(article.rules || []).slice(0, 6).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>A confirmar.</li>"}</ul>
        </div>
        <div>
          <strong>Checklist sugerido</strong>
          <ul>${(article.checklist || []).slice(0, 7).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>A confirmar.</li>"}</ul>
        </div>
      </div>
      ${article.url ? `<a class="btn btn-sm btn-outline-light mt-2" href="${escapeHtml(article.url)}" target="_blank" rel="noopener">Abrir artigo</a>` : ""}
      ${article.suggestedReply ? `<details class="mt-2"><summary>Ver resposta baseada no manual</summary><pre class="copy-box mt-2">${escapeHtml(article.suggestedReply)}</pre></details>` : ""}
    </article>
  `).join(""));
}

function formatVariables(variables = {}) {
  const entries = Object.entries(variables || {}).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return "Variaveis nao retornadas para este modo de analise.";
  return entries.map(([key, value]) => `${key}: ${value || "-"}`).join("\n");
}

function saveLocalLog(data) {
  try {
    const result = normalizeResult(data);
    const analysis = result.analysis || {};
    const ticket = result.ticket || {};
    const context = result.context || {};
    const logs = JSON.parse(localStorage.getItem(LOCAL_LOG_KEY) || "[]");
    logs.push({
      createdAt: new Date().toISOString(),
      ticketId: ticket.id || ticket.ticketId || null,
      subject: ticket.subject || ticket.title || null,
      companyName: context.company?.name || context.company?.businessname || ticket.company_name || null,
      product: analysis.product || null,
      freshdeskType: analysis.freshdeskType || null,
      developmentType: analysis.developmentType || null,
      priority: analysis.priority || null,
      recommendedScenario: analysis.recommendedScenario || null,
      routine: analysis.routine || null,
      needsDevelopmentSpec: Boolean(analysis.needsDevelopmentSpec)
    });
    localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(logs.slice(-200)));
  } catch (error) {
    console.warn("Nao foi possivel gravar log local do navegador.", error);
  }
}

function buildLocalQualityDashboard() {
  const logs = JSON.parse(localStorage.getItem(LOCAL_LOG_KEY) || "[]");
  const countBy = (key) => logs.reduce((acc, item) => {
    const label = item[key] || "Nao informado";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  return {
    mode: "browser-local-logs",
    totalAnalyses: logs.length,
    urgentCount: logs.filter((item) => item.priority === "Urgente").length,
    devCount: logs.filter((item) => item.needsDevelopmentSpec || ["Melhoria", "Customizacao", "BUG (Erros)"].includes(item.developmentType)).length,
    commercialCount: logs.filter((item) => item.recommendedScenario === "Mover para Comercial" || item.freshdeskType === "Prospect").length,
    recurrenceAlerts: [],
    topProducts: countBy("product"),
    topTypes: countBy("freshdeskType"),
    topPriorities: countBy("priority"),
    topScenarios: countBy("recommendedScenario"),
    recentLogs: logs.slice(-10).reverse()
  };
}

function renderCountMap(title, map = {}) {
  const entries = Object.entries(map || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return `<div class="quality-card"><h4>${escapeHtml(title)}</h4>${entries.length ? entries.map(([key, value]) => `<div class="quality-row"><span>${escapeHtml(key)}</span><strong>${value}</strong></div>`).join("") : `<p class="text-secondary mb-0">Sem dados.</p>`}</div>`;
}

function renderQualityDashboard(data = buildLocalQualityDashboard()) {
  const alerts = Array.isArray(data.recurrenceAlerts) ? data.recurrenceAlerts : [];
  const recent = Array.isArray(data.recentLogs) ? data.recentLogs : [];
  safeHtml("outQuality", `
    <div class="quality-summary-grid">
      <div class="quality-card"><span>Total de analises</span><strong>${data.totalAnalyses || 0}</strong><small>${escapeHtml(data.mode || "local")}</small></div>
      <div class="quality-card"><span>Últimas 24h</span><strong>${data.last24hAnalyses ?? "-"}</strong><small>Volume recente analisado</small></div>
      <div class="quality-card"><span>Urgentes</span><strong>${data.urgentCount || 0}</strong><small>Recepcao travada, sistema parado ou bug bloqueante</small></div>
      <div class="quality-card"><span>DEV</span><strong>${data.devCount || 0}</strong><small>Melhoria, Customizacao ou BUG</small></div>
      <div class="quality-card"><span>Comercial</span><strong>${data.commercialCount || 0}</strong><small>Prospect, proposta, demo ou licenca</small></div>
      <div class="quality-card"><span>Validações</span><strong>${data.validationCount || 0}</strong><small>${data.validationApprovalRate !== null && data.validationApprovalRate !== undefined ? data.validationApprovalRate + "% aprovadas" : "sem validações"}</small></div>
    </div>
    <div class="quality-alerts mt-3">
      <h4>Alertas de recorrencia</h4>
      ${alerts.length ? alerts.map((item) => `<div class="quality-alert"><i class="fa-solid fa-triangle-exclamation me-2"></i>${escapeHtml(item)}</div>`).join("") : `<p class="text-secondary mb-0">Ainda nao ha recorrencias suficientes nos logs locais.</p>`}
    </div>
    <div class="quality-grid mt-3">
      ${renderCountMap("Produtos", data.topProducts)}
      ${renderCountMap("Tipos Freshdesk", data.topTypes)}
      ${renderCountMap("Prioridades", data.topPriorities)}
      ${renderCountMap("Cenarios", data.topScenarios)}
      ${renderCountMap("Empresas", data.topCompanies)}
      ${renderCountMap("Agentes", data.topAgents)}
    </div>
    <div class="quality-card mt-3">
      <h4>Ultimas analises</h4>
      ${recent.length ? recent.map((item) => `<div class="quality-row"><span>#${escapeHtml(item.ticketId || "manual")} - ${escapeHtml(item.subject || item.routine || "Sem assunto")}</span><strong>${escapeHtml(item.priority || "-")}</strong></div>`).join("") : `<p class="text-secondary mb-0">Sem historico local.</p>`}
    </div>
  `);
}

function applyPriorityClass(priority) {
  const el = getEl("outPriority");
  if (!el) return;
  el.className = "priority-badge";
  const key = normalizeText(priority);
  if (key.includes("urgente")) el.classList.add("priority-urgent");
  else if (key.includes("alta")) el.classList.add("priority-high");
  else if (key.includes("media")) el.classList.add("priority-medium");
  else el.classList.add("priority-low");
}


function buildValidationChecklist(data = lastCopilotResult) {
  if (!data) return "Sem analise carregada.";
  const ticket = data.ticket || {};
  const analysis = data.analysis || {};
  return `Checklist de validação - PH3A Support Copilot

Ticket: #${ticket.id || ticket.ticketId || "manual"}
Assunto: ${ticket.subject || ticket.title || "-"}

Validar manualmente:
[ ] Produto correto? Esperado: __________ | IA: ${analysis.product || "-"}
[ ] Tipo Freshdesk correto? Esperado: __________ | IA: ${analysis.freshdeskType || analysis.requestType || "-"}
[ ] Prioridade correta? Esperado: __________ | IA: ${analysis.priority || "-"}
[ ] Cenário correto? Esperado: __________ | IA: ${analysis.recommendedScenario || "-"}
[ ] Tipo DEV correto? Esperado: __________ | IA: ${analysis.developmentType || "Nao indicado"}
[ ] Resumo claro e útil?
[ ] Checklist ajuda o analista?
[ ] Resposta sugerida está natural?
[ ] Tickets do solicitante aparecem corretamente?

Alertas de regra:
${(analysis.ruleWarnings || []).map((item) => "- " + item).join("\n") || "- Nenhum alerta retornado."}

Observações:
______________________________________________`;
}

function buildFullAnalysisText(data = lastCopilotResult) {
  if (!data) return "Sem analise carregada.";
  const ticket = data.ticket || {};
  const context = data.context || {};
  const analysis = data.analysis || {};
  const templates = data.renderedTemplates || {};
  const contact = context.contact || ticket.requester || {};
  const company = context.company || ticket.company || {};
  return `PH3A Support Copilot - Analise completa

Ticket: #${ticket.id || ticket.ticketId || "manual"}
Assunto: ${ticket.subject || ticket.title || "-"}
Solicitante: ${displayValue("Solicitante", contact.name || ticket.requester_name || "-")}
E-mail: ${displayValue("E-mail", contact.email || ticket.requester_email || "-")}
Telefone: ${displayValue("Telefone", contact.phone || contact.mobile || "-")}
Empresa: ${displayValue("Empresa", company.name || company.businessname || ticket.company_name || "-")}

Classificacao:
Produto: ${analysis.product || "-"}
Tipo Freshdesk: ${analysis.freshdeskType || analysis.requestType || "-"}
Prioridade: ${analysis.priority || "-"}
Cenario recomendado: ${analysis.recommendedScenario || "-"}
Tipo DEV: ${analysis.developmentType || "Nao indicado"}
Confianca: ${analysis.confidence ?? "-"}

Resumo:
${analysis.summary || "-"}

Resumo tecnico:
${analysis.currentScenario || analysis.expectedBehavior || "-"}

Base de conhecimento:
${buildKnowledgeText(analysis)}

Checklist:
${(analysis.checklist || analysis.evidenceNeeded || []).map((item) => "- " + item).join("\n") || "-"}

Resposta sugerida:
${templates.customerReply?.body || analysis.suggestedReply || "-"}

Nota interna sugerida:
${templates.internalNote?.body || "-"}

Especificacao DEV:
${analysis.developmentSpec || "Nao indicado"}`;
}

function renderValidation(data = lastCopilotResult) {
  safeSet("outValidation", buildValidationChecklist(data));
}


function getPrimaryManual(analysis = {}, context = {}) {
  const manuals = [
    ...(Array.isArray(context.manuals) ? context.manuals : []),
    ...(Array.isArray(analysis.manuals) ? analysis.manuals : []),
    ...(Array.isArray(context.knowledge?.manuals) ? context.knowledge.manuals : [])
  ];
  const article = Array.isArray(analysis.knowledgeArticles) ? analysis.knowledgeArticles[0] : null;
  return manuals[0] || article || null;
}

function getPrimaryPackage(analysis = {}, context = {}) {
  const packages = [
    ...(Array.isArray(context.packages) ? context.packages : []),
    ...(Array.isArray(analysis.packages) ? analysis.packages : []),
    ...(Array.isArray(context.packageMatch?.packages) ? context.packageMatch.packages : [])
  ];
  return packages[0] || null;
}

function riskLabel(priority = "", scenario = "") {
  const p = normalizeText(priority);
  const s = normalizeText(scenario);
  if (p.includes("urgente")) return "Alto";
  if (s.includes("desenvolvimento") || p.includes("alta")) return "Atenção";
  if (s.includes("comercial")) return "Roteamento";
  return "Controlado";
}

function renderDiagnostic(analysis = {}, context = {}, templates = {}) {
  const manual = getPrimaryManual(analysis, context);
  const pkg = getPrimaryPackage(analysis, context);
  const recommended = templates.recommended || analysis.recommendedTemplate || {};
  const titleParts = [analysis.product, analysis.freshdeskType || analysis.requestType].filter(Boolean);
  const title = titleParts.length ? titleParts.join(" · ") : "Diagnóstico gerado";
  const reason = analysis.nextAction || analysis.knowledgeSummary || analysis.summary || "Revise a análise e confirme a ação antes de responder o cliente.";
  safeSet("diagnosticTitle", title);
  safeSet("diagnosticReason", reason);
  safeSet("diagnosticManual", manual?.title || manual?.description || pkg?.description || "Manual não sugerido");
  safeSet("diagnosticTemplate", recommended.title || templates.customerReply?.title || analysis.recommendedTemplateTitle || "A confirmar");
  const confidence = Number(analysis.confidence);
  safeSet("diagnosticConfidence", Number.isFinite(confidence) ? `${Math.round(confidence * 100)}%` : "Revisão humana");
  safeSet("diagnosticRisk", riskLabel(analysis.priority, analysis.recommendedScenario));
}

function updateFlowStatus(step = "input") {
  const order = ["input", "ticket", "knowledge", "analysis"];
  const labels = {
    input: "Entrada",
    ticket: "Ticket carregado",
    knowledge: "Base consultada",
    analysis: "Análise pronta"
  };
  const activeIndex = Math.max(0, order.indexOf(step));
  const currentStep = order[activeIndex] || "input";
  const container = document.getElementById("copilotFlowStatus");
  const fill = document.getElementById("copilotFlowFill");
  const title = document.getElementById("copilotFlowTitle");

  if (container) container.dataset.flowState = currentStep;
  if (fill) fill.style.width = `${(activeIndex / (order.length - 1)) * 100}%`;
  if (title) title.textContent = labels[currentStep] || "Entrada";

  document.querySelectorAll("[data-flow-step]").forEach((item) => {
    const idx = order.indexOf(item.dataset.flowStep);
    const isDone = idx < activeIndex;
    const isCurrent = idx === activeIndex;
    const isActive = idx <= activeIndex;

    item.classList.toggle("active", isActive);
    item.classList.toggle("current", isCurrent);
    item.classList.toggle("done", isDone);
    item.classList.toggle("pending", idx > activeIndex);
    item.dataset.stepStatus = isCurrent ? "current" : isDone ? "done" : "pending";
  });
}

function activateTab(targetId) {
  const trigger = document.querySelector(`[data-bs-target="#${targetId}"]`);
  if (trigger && window.bootstrap) bootstrap.Tab.getOrCreateInstance(trigger).show();
}

async function copyTextFromElement(id, fallbackMessage) {
  const target = getEl(id);
  const text = target?.textContent || "";
  if (!text.trim()) return showToast(fallbackMessage || "Nada para copiar ainda.");
  await navigator.clipboard.writeText(text);
  showToast("Conteúdo copiado.");
}

function renderResult(rawData, options = {}) {
  const data = normalizeResult(rawData);
  lastCopilotResult = data;
  const ticket = data.ticket || {};
  const context = data.context || {};
  const analysis = data.analysis || {};
  const templates = data.renderedTemplates || {};
  const customerReply = templates.customerReply || {};
  const internalNote = templates.internalNote || {};
  const recommended = templates.recommended || analysis.recommendedTemplate || {};

  getEl("emptyState")?.classList.add("d-none");
  getEl("resultContent")?.classList.remove("d-none");

  renderDiagnostic(analysis, context, templates);
  updateFlowStatus("analysis");

  safeSet("analysisSource", analysis.source || "analise");
  safeSet("outProduct", analysis.product || "-");
  safeSet("outType", analysis.freshdeskType || analysis.requestType || "-");
  safeSet("outDevType", analysis.developmentType || "Nao indicado");
  safeSet("outPriority", analysis.priority || "-");
  safeSet("outScenario", analysis.recommendedScenario || "-");
  safeSet("outSummary", analysis.summary || "-");
  safeSet("outTechnical", analysis.currentScenario || analysis.expectedBehavior || "-");
  safeSet("outPrediction", analysis.nextAction || "Sem sinal de recorrencia com os dados informados.");
  safeSet("outPredefined", recommended.title || customerReply.title || "-");
  safeSet("outTemplateReason", `Modelo: ${recommended.key || customerReply.key || "recomendado pela analise"}`);
  safeSet("outResponse", customerReply.body || analysis.suggestedReply || "-");
  safeSet("outDevSpec", analysis.developmentSpec || "Nao indicado neste momento.");
  safeSet("outInternalNote", internalNote.body || "-");
  safeSet("outVariables", formatVariables(internalNote.variables || customerReply.variables || {}));

  renderList(analysis.checklist || analysis.evidenceNeeded || []);
  renderContact(context, ticket, analysis);
  renderTickets(context);
  renderKnowledge(analysis, context);
  applyPriorityClass(analysis.priority || "");
  saveLocalLog(data);
  renderQualityDashboard();
  handleRefreshKnowledgeAdmin(false).catch(() => {});
  renderValidation(data);

  const copyFullBtn = getEl("copyFullAnalysisBtn");
  if (copyFullBtn) copyFullBtn.disabled = false;

  const addNoteBtn = getEl("addNoteBtn");
  if (addNoteBtn) addNoteBtn.disabled = true;

  if (options.notify !== false) {
    showCopilotNotice(
      "success",
      "Análise concluída",
      "Resumo, base sugerida e próximos passos estão prontos para revisão humana.",
      "Entrada → Ticket → Base → Análise"
    );
  }
}


function getFriendlyErrorMessage(error) {
  const payload = error?.payload || {};
  const raw = String(payload.message || payload.error || error?.message || error || "").trim();

  if (payload.permissionDenied || error?.permissionDenied || /401|403|unauthorized|forbidden|permissao negada|permissão negada/i.test(raw)) {
    return payload.hint || "Permissão negada na base do Freshdesk. Use uma API key de agente com permissão em Solutions, especialmente para artigos em rascunho ou privados.";
  }

  if (error?.authRequired || payload.code === "AUTH_REQUIRED") {
    return "Sua sessão expirou ou o acesso protegido está ativo. Faça login para continuar.";
  }

  if (!raw) return "Não consegui concluir a ação agora. Tente novamente em alguns instantes.";

  if (/failed to fetch|network|load failed|cors|fetch failed/i.test(raw)) {
    return payload.hint || "A API não respondeu ou a conexão com o Freshdesk falhou. Valide domínio, CORS, FRESHDESK_DOMAIN e tente novamente.";
  }

  if (/404|not found/i.test(raw)) {
    return "Não encontrei o recurso solicitado. Confira o número do ticket, artigo, pasta ou idioma.";
  }

  if (/500|502|503|504|server/i.test(raw)) {
    return payload.hint || "A API respondeu com instabilidade. Aguarde alguns segundos e tente novamente.";
  }

  return raw.length > 180 ? `${raw.slice(0, 177)}...` : raw;
}

function showCopilotNotice(type = "info", title = "Aviso do Copilot", message = "", meta = "") {
  const stack = getEl("copilotNoticeStack");
  if (!stack) return showToast(message || title);
  const safeType = ["success", "warning", "error", "info"].includes(type) ? type : "info";
  const icons = {
    success: "fa-solid fa-circle-check",
    warning: "fa-solid fa-triangle-exclamation",
    error: "fa-solid fa-circle-exclamation",
    info: "fa-solid fa-sparkles"
  };
  const labels = {
    success: "Concluído",
    warning: "Atenção",
    error: "Ops, algo falhou",
    info: "Copilot"
  };
  const notice = document.createElement("section");
  notice.className = `copilot-notice ${safeType}`;
  notice.setAttribute("role", safeType === "error" ? "alert" : "status");
  notice.innerHTML = `
    <div class="copilot-notice-icon"><i class="${icons[safeType]}"></i></div>
    <div class="copilot-notice-content">
      <span class="copilot-notice-kicker">${escapeHtml(labels[safeType])}</span>
      <h3 class="copilot-notice-title">${escapeHtml(title)}</h3>
      ${message ? `<p class="copilot-notice-message">${escapeHtml(message)}</p>` : ""}
      ${meta ? `<span class="copilot-notice-meta"><i class="fa-solid fa-route"></i>${escapeHtml(meta)}</span>` : ""}
    </div>
    <button type="button" class="copilot-notice-close" aria-label="Fechar aviso"><i class="fa-solid fa-xmark"></i></button>
  `;
  const close = () => {
    notice.classList.add("is-leaving");
    window.setTimeout(() => notice.remove(), 280);
  };
  notice.querySelector(".copilot-notice-close")?.addEventListener("click", close);
  stack.appendChild(notice);
  while (stack.children.length > 3) stack.firstElementChild?.remove();
  window.setTimeout(close, safeType === "error" ? 7600 : 5200);
}

function showCopilotError(title, error, meta = "") {
  const payload = error?.payload || {};
  if (payload.permissionDenied || error?.permissionDenied) {
    showCopilotNotice(
      "warning",
      "Permissão na base Freshdesk",
      getFriendlyErrorMessage(error),
      meta || "Freshdesk Solutions → API key"
    );
    return;
  }

  if (error?.authRequired || payload.code === "AUTH_REQUIRED") {
    showAuthOverlay(payload.message || payload.error || "Faça login para continuar.");
    showCopilotNotice("info", "Sessão necessária", getFriendlyErrorMessage(error), "Arriba Auth");
    return;
  }

  showCopilotNotice("error", title, getFriendlyErrorMessage(error), meta || "Ação preservada em modo seguro");
}

function showToast(message = "Conteudo copiado.") {
  const toastEl = getEl("copyToast");
  const body = toastEl?.querySelector(".toast-body");
  if (body) body.textContent = message;
  if (window.bootstrap && toastEl) {
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
  }
}

function setupCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = getEl(button.dataset.copyTarget);
      if (!target) return;
      await navigator.clipboard.writeText(target.textContent || "");
      showToast(button.dataset.copyTarget === "outInternalNote" ? "Anotacao copiada para colar no Freshdesk." : "Conteudo copiado.");
    });
  });
}

function clearForm() {
  ids.forEach((id) => {
    if (id === "apiBase") return;
    const input = getEl(id);
    if (input) input.value = id === "agentName" ? "Jonathan Oliveira Mesquita" : "";
  });
  safeHtml("searchResults", "");
  getEl("searchResults")?.classList.add("d-none");
}

async function withLoading(button, label, action) {
  if (!button) return action();
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${label}`;
  try {
    return await action();
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

function isProbablyTicketId(value = "") {
  return /^\d+$/.test(String(value).trim());
}

function renderSearchResults(tickets = []) {
  const box = getEl("searchResults");
  if (!box) return;
  box.classList.remove("d-none");
  if (!tickets.length) {
    box.innerHTML = `<div class="search-result-empty">Nenhum ticket encontrado para o assunto informado.</div>`;
    return;
  }
  box.innerHTML = tickets.slice(0, 8).map((ticket) => `
    <button type="button" class="search-result-item" data-ticket-id="${escapeHtml(ticket.id || "")}">
      <strong>#${escapeHtml(ticket.id || "-")} - ${escapeHtml(ticket.subject || "Sem assunto")}</strong>
      <span>Status: ${escapeHtml(ticket.status_name || ticket.status || "-")} • Prioridade: ${escapeHtml(ticket.priority_name || ticket.priority || "-")}</span>
    </button>
  `).join("");

  box.querySelectorAll("[data-ticket-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const ticketId = button.dataset.ticketId;
      if (!ticketId) return;
      getEl("ticketId").value = ticketId;
      await handleFetchTicket();
    });
  });
}

async function handleFetchTicket() {
  const term = getEl("ticketId")?.value.trim();
  if (!term) {
    alert("Informe o numero do ticket ou parte do assunto.");
    return;
  }

  updateFlowStatus("ticket");
  try {
    await withLoading(getEl("fetchTicketBtn"), "Buscando...", async () => {
      if (!isProbablyTicketId(term)) {
        const data = await searchFreshdeskTickets(term);
        renderSearchResults(data.tickets || []);
        showCopilotNotice("info", "Busca concluída", "Confira os tickets encontrados e selecione o chamado correto.", "Entrada → Ticket");
        return;
      }

      const data = await fetchFreshdeskContext(term);
      fillForm({ ...data.ticket, company: data.context?.company, agent: data.context?.agent });
      renderContact(data.context || {}, data.ticket || {}, {});
      renderTickets(data.context || {});
      renderSearchResults([]);
      getEl("searchResults")?.classList.add("d-none");
      updateFlowStatus("knowledge");
      showCopilotNotice("info", "Ticket carregado", "Contexto do Freshdesk disponível. Agora você pode analisar o chamado.", "Entrada → Ticket → Base");
    });
  } catch (error) {
    updateFlowStatus("input");
    showCopilotError("Não foi possível buscar o ticket", error, "Entrada → Ticket");
  }
}

async function handleAnalyzeFreshdesk() {
  const ticketId = getEl("ticketId")?.value.trim();
  if (!ticketId || !isProbablyTicketId(ticketId)) {
    alert("Para analisar no Freshdesk, informe o numero do ticket.");
    return;
  }

  updateFlowStatus("knowledge");
  try {
    await withLoading(getEl("analyzeFreshdeskBtn"), "Analisando ticket...", async () => {
      const result = await analyzeFreshdeskTicket(ticketId);
      fillForm({ ...result.ticket, company: result.context?.company, agent: result.context?.agent });
      renderResult(result);
      document.getElementById("resultContent")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } catch (error) {
    updateFlowStatus("knowledge");
    showCopilotError("Análise não concluída", error, "Base → Análise");
  }
}


async function handleCopyFullAnalysis() {
  if (!lastCopilotResult) return showToast("Nenhuma analise carregada.");
  await navigator.clipboard.writeText(buildFullAnalysisText(lastCopilotResult));
  showToast("Analise completa copiada.");
}

async function handleCopyValidation() {
  await navigator.clipboard.writeText(buildValidationChecklist(lastCopilotResult));
  showToast("Checklist de validacao copiado.");
}

async function handleApproveValidation() {
  if (!lastCopilotResult) return showToast("Nenhuma analise carregada para validar.");
  const ticket = lastCopilotResult.ticket || {};
  const analysis = lastCopilotResult.analysis || {};
  const payload = {
    ticketId: ticket.id || ticket.ticketId || null,
    generated: {
      ticketId: ticket.id || ticket.ticketId || null,
      subject: ticket.subject || ticket.title || null,
      product: analysis.product,
      freshdeskType: analysis.freshdeskType,
      priority: analysis.priority,
      recommendedScenario: analysis.recommendedScenario
    },
    approved: true,
    notes: "Validado no frontend pelo analista em modo read-only."
  };
  try {
    await registerValidation(payload);
    showToast("Validacao registrada na API.");
  } catch {
    showToast("API indisponivel. Checklist copiado como alternativa.");
    await navigator.clipboard.writeText(buildValidationChecklist(lastCopilotResult));
  }
}

function handlePresentationModeChange() {
  document.body.classList.toggle("presentation-mode", isPresentationMode());
  if (lastCopilotResult) renderResult(lastCopilotResult, { notify: false });
}

async function handleAddNote() {
  showToast("Modo seguro ativo: copie a nota interna e cole manualmente no Freshdesk.");
}

async function handleRefreshQuality() {
  await withLoading(getEl("refreshQualityBtn"), "Atualizando...", async () => {
    try {
      const dashboard = await fetchQualityDashboard();
      renderQualityDashboard(dashboard);
      showToast("Painel de qualidade atualizado pela API.");
    } catch (error) {
      renderQualityDashboard();
      showToast("API indisponivel. Usando logs locais do navegador.");
    }
  });
}

function setupEvents() {
  const savedApi = localStorage.getItem("arribaSupportApiBase");
  if (savedApi && getEl("apiBase")) getEl("apiBase").value = savedApi;

  getEl("loadDemoBtn")?.addEventListener("click", () => {
    updateFlowStatus("input");
    fillForm(demoTicket);
    renderResult(inferLocal(readForm()));
    document.getElementById("analisar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  getEl("clearBtn")?.addEventListener("click", clearForm);
  getEl("fetchTicketBtn")?.addEventListener("click", handleFetchTicket);
  getEl("analyzeFreshdeskBtn")?.addEventListener("click", handleAnalyzeFreshdesk);
  getEl("addNoteBtn")?.addEventListener("click", handleAddNote);
  getEl("refreshQualityBtn")?.addEventListener("click", handleRefreshQuality);
  getEl("refreshKnowledgeAdminBtn")?.addEventListener("click", () => handleRefreshKnowledgeAdmin(false));
  getEl("syncKnowledgeBtn")?.addEventListener("click", handleSyncKnowledge);
  getEl("knowledgeSearchBtn")?.addEventListener("click", handleKnowledgeSearch);
  getEl("manualSearchBtn")?.addEventListener("click", handleManualSearch);
  getEl("packageSearchBtn")?.addEventListener("click", handlePackageSearch);
  getEl("copyFullAnalysisBtn")?.addEventListener("click", handleCopyFullAnalysis);
  getEl("copyFinalReplyBtn")?.addEventListener("click", () => copyTextFromElement("outResponse", "Analise um ticket antes de copiar a resposta."));
  getEl("copyInternalNoteShortcutBtn")?.addEventListener("click", () => copyTextFromElement("outInternalNote", "Analise um ticket antes de copiar a nota interna."));
  getEl("focusKnowledgeBtn")?.addEventListener("click", () => activateTab("knowledgeTab"));
  getEl("copyValidationBtn")?.addEventListener("click", handleCopyValidation);
  getEl("approveValidationBtn")?.addEventListener("click", handleApproveValidation);
  getEl("presentationModeToggle")?.addEventListener("change", handlePresentationModeChange);
  getEl("authLoginForm")?.addEventListener("submit", handleAuthLogin);
  setupCopyButtons();
  getEl("packageSuggestions")?.addEventListener("click", (event) => {
    const copyBtn = event.target.closest("[data-package-copy]");
    if (copyBtn) copyPackageFromCard(copyBtn);
  });

  getEl("manualSuggestions")?.addEventListener("click", (event) => {
    const copyBtn = event.target.closest("[data-manual-copy]");
    if (!copyBtn) return;
    const card = copyBtn.closest(".manual-suggestion-card");
    const text = card ? card.innerText.replace(/\n{3,}/g, "\n\n") : "";
    navigator.clipboard?.writeText(text);
    showToast("Resumo do manual copiado.");
  });
  renderQualityDashboard();
  updateFlowStatus("input");
  checkAuthOnLoad();

  getEl("supportForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = readForm();

    if (!input.subject && !input.message && !input.ticketId) {
      alert("Informe o ticket, assunto ou descricao do chamado.");
      return;
    }

    updateFlowStatus("knowledge");
    try {
      await withLoading(getEl("analyzeBtn"), "Analisando...", async () => {
        const result = await analyzeManualTicket(input);
        renderResult(result);
      });
    } catch (error) {
      updateFlowStatus("input");
      showCopilotError("Não consegui analisar o texto", error, "Entrada → Análise");
    }
  });
}

document.addEventListener("DOMContentLoaded", setupEvents);
