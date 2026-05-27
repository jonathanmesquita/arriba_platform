const manualState = {
  selectedTemplate: "novaCarteira",
  sections: [],
  lastHtml: ""
};

const templates = {
  novaCarteira: {
    label: "Nova Carteira DataCob",
    category: "Ajuda",
    title: "Manual DataCob - Nova Carteira de Cobrança",
    subtitle: "Configuração operacional da carteira",
    description: "Cadastro de grupo, cliente, fase, régua, conta, modelo de carta, boleto, ocorrência, cálculo, acordo e recibo.",
    objective: "Este manual foi desenvolvido para auxiliar na configuração e inserção de uma nova carteira de cobrança no sistema DataCob.",
    sections: [
      {
        title: "Introdução e fluxo da rotina",
        text: "Explique o objetivo do manual, quando a rotina deve ser utilizada e quais cadastros serão abordados.",
        steps: [
          step("Mapear o fluxo de cobrança", "Liste os cadastros necessários: Grupo/Cliente/Fase, Régua, Conta, Modelo de Carta, Ocorrências, Políticas de Cálculo, Políticas de Acordo e Recibo.", "Antes de iniciar, confirme se a carteira já possui regra de negócio validada.")
        ]
      },
      {
        title: "Cadastro Grupo/Cliente/Fase",
        text: "Pré-cadastro obrigatório para identificação da carteira no DataCob.",
        steps: [
          step("Acessar cadastro", "Acesse o menu Parâmetros > Cadastro > Grupo/Cliente/Fase.", "Inicie pela aba Fase."),
          step("Cadastrar fase", "Clique em Adicionar e preencha Fase, Descrição, Sequência Fase e Cor.", "Exemplo: AM para fase amigável e JU para fase jurídica."),
          step("Cadastrar grupo e cliente", "Acesse a aba Grupo Cliente, cadastre o grupo e depois o cliente/produto vinculado.", "O cliente define o produto da carteira."),
          step("Vincular fase e empresa", "Selecione o cliente e clique em Vincular no grid Cliente Fase Empresa.", "Confirme o vínculo antes de recepcionar arquivos.")
        ]
      },
      {
        title: "Cadastro de Régua e Sub-Régua",
        text: "Configuração opcional para acompanhamento e automação das etapas de cobrança.",
        steps: [
          step("Acessar réguas", "Acesse Parâmetros > Réguas.", "Desconsidere o grid Cluster para rotina sistema Padrão."),
          step("Cadastrar tabela e régua", "Inclua a tabela de régua e depois cadastre as réguas desejadas.", "A categoria é apenas informativa."),
          step("Cadastrar sub-régua", "Selecione a régua e clique em Incluir no grid Sub-régua.", "A descrição da sub-régua é obrigatória."),
          step("Vincular na carteira", "Acesse Parâmetros > Visualização de Parâmetros > Opções > Régua e clique em Vincular.", "Selecione Grupo e Cliente ou todos da carteira.")
        ]
      },
      {
        title: "Validação final",
        text: "Confirme os vínculos e execute uma simulação da rotina antes da publicação.",
        steps: [
          step("Revisar parâmetros", "Valide grupo, cliente, fase, régua, conta, carta, ocorrência, cálculo, acordo e recibo.", "Sem vínculo, a rotina pode até existir, mas não aparece onde precisa. Fantasma operacional."),
          step("Registrar evidências", "Anexe prints de cada tela configurada e salve o manual em PDF.", "O print é a testemunha ocular do parâmetro.")
        ]
      }
    ]
  },
  apiDatacob: {
    label: "API DataCob",
    category: "API DataCob",
    title: "Manual DataCob - API",
    subtitle: "Configuração e validação de integração",
    description: "Passo a passo para documentar endpoints, credenciais, payloads, retorno e evidências.",
    objective: "Este manual orienta a configuração, validação e documentação de integrações API relacionadas ao DataCob.",
    sections: [
      {
        title: "Visão geral da integração",
        text: "Informe objetivo da API, sistema parceiro, ambiente, autenticação e responsáveis.",
        steps: [
          step("Registrar objetivo", "Descreva o que a integração faz e qual problema resolve.", "Exemplo: consulta de contrato, inclusão de histórico ou emissão de boleto."),
          step("Mapear ambientes", "Informe URLs de homologação e produção, método de autenticação e escopo de uso.", "Nunca publique segredo/token dentro do manual final.")
        ]
      },
      {
        title: "Payload e retorno",
        text: "Documente campos obrigatórios, exemplos de request/response e códigos de erro.",
        steps: [
          step("Adicionar request", "Cole exemplo de payload com dados fictícios.", "Evite dados reais. CPF de cliente real no manual é convite para dor de cabeça."),
          step("Adicionar response", "Cole exemplo de retorno de sucesso e retorno de erro.", "Inclua HTTP status, mensagem e regra de tratamento.")
        ]
      }
    ]
  },
  rotinaSistema: {
    label: "Rotina Sistemas",
    category: "Rotina Sistemas",
    title: "Manual DataCob - Rotina Sistema",
    subtitle: "Configuração por cliente/rotina",
    description: "Modelo para Banco BTG, Omni, Topázio, Credigy, Return, Remaza e outras rotinas específicas.",
    objective: "Este manual documenta a configuração da rotina sistema, suas regras, parâmetros e validações operacionais.",
    sections: [
      {
        title: "Contexto da rotina",
        text: "Descreva cliente, objetivo, regra de negócio e impacto operacional.",
        steps: [
          step("Identificar cliente e rotina", "Informe o cliente, rotina sistema, fase e regra de acionamento.", "Use o mesmo nome da pasta/manual para facilitar busca."),
          step("Mapear dependências", "Liste webservices, layouts, parâmetros e serviços automáticos envolvidos.", "Dependência invisível vira chamado reincidente.")
        ]
      },
      {
        title: "Configuração e testes",
        text: "Documente o caminho de menu, os campos preenchidos e o teste de validação.",
        steps: [
          step("Configurar parâmetros", "Acesse o menu da rotina e preencha os campos conforme regra aprovada.", "Inclua print da tela final."),
          step("Executar teste", "Realize teste com contrato/carteira de homologação e registre o resultado.", "Informe evidência de sucesso e erro comum.")
        ]
      }
    ]
  },
  acoesMassa: {
    label: "Ações em Massa",
    category: "Ações em Massa",
    title: "Manual DataCob - Ações em Massa",
    subtitle: "Boletagem, notificação e rotinas em lote",
    description: "Modelo para boletagem, disparos, enriquecimento, negativação, protesto e régua/sub-régua.",
    objective: "Este manual orienta a execução de ações em massa no DataCob, incluindo validações antes, durante e depois do processamento.",
    sections: [
      {
        title: "Preparação da ação",
        text: "Antes de executar ação em massa, valide filtros, carteira, fase, régua e volume estimado.",
        steps: [
          step("Selecionar rotina", "Acesse a rotina de ação em massa correspondente.", "Ex.: Boletagem, Notificação, Protesto, Enriquecimento ou Negativação."),
          step("Validar filtros", "Confira grupo, cliente, fase, régua, status e período.", "Filtro frouxo é pescaria com rede de arrasto. Cuidado.")
        ]
      },
      {
        title: "Processamento e conferência",
        text: "Documente a execução, logs, retorno e ações de correção.",
        steps: [
          step("Executar processamento", "Inicie a ação e acompanhe o progresso até finalizar.", "Inclua print da tela de progresso/log."),
          step("Validar resultado", "Confira total processado, recusado e erros de validação.", "Se houver falha, documente mensagem e tratamento.")
        ]
      }
    ]
  },
  recepcao: {
    label: "Recepção de arquivos",
    category: "Recepção",
    title: "Manual DataCob - Recepção de Arquivos",
    subtitle: "Carga, progresso, log e histórico",
    description: "Modelo para entrada de arquivos, CNABs, pacotes ETL e cargas por layout padrão.",
    objective: "Este manual orienta o envio, processamento e validação de arquivos de recepção no DataCob.",
    sections: [
      {
        title: "Preparação do arquivo",
        text: "Valide layout, campos obrigatórios e formato antes do processamento.",
        steps: [
          step("Selecionar tipo de recepção", "Acesse Recepções > Recepção de Arquivos e escolha a rotina correta.", "O tipo de recepção precisa bater com o layout."),
          step("Selecionar arquivo", "Localize o arquivo preenchido e transfira para a fila de processamento.", "Evite acento e caracteres estranhos no nome do arquivo.")
        ]
      },
      {
        title: "Processamento e log",
        text: "Acompanhe progresso e valide o log de retorno.",
        steps: [
          step("Processar arquivo", "Clique em Processar e acompanhe a aba Progresso.", "Não abandone o log. Ele sabe onde o cadáver está enterrado."),
          step("Validar histórico", "Consulte a aba Histórico pelo período, nome do arquivo ou ID do lote.", "Inclua print do log final no manual.")
        ]
      }
    ]
  },
  ocorrencias: {
    label: "Ocorrências",
    category: "Ocorrências",
    title: "Manual DataCob - Ocorrências",
    subtitle: "Sistema, cliente e vínculos",
    description: "Modelo para ocorrência sistema, ocorrência cliente, complementos e vínculos por carteira.",
    objective: "Este manual orienta o cadastro e vínculo de ocorrências utilizadas pelos operadores na inclusão de históricos.",
    sections: [
      {
        title: "Ocorrência do sistema",
        text: "Cadastre as ocorrências-base utilizadas pela operação.",
        steps: [
          step("Acessar ocorrência sistema", "Acesse Parâmetros > Ocorrências > Sistema.", "Cadastre código, descrição e marcações operacionais."),
          step("Configurar comportamento", "Defina marcações como cobrado, último histórico, ocorrência positiva, API, complemento e agendamento.", "Padronize antes de vincular ao cliente.")
        ]
      },
      {
        title: "Ocorrência cliente e vínculo",
        text: "Relacione ocorrência cliente com ocorrência sistema e carteira.",
        steps: [
          step("Cadastrar tabela cliente", "Acesse Parâmetros > Ocorrências > Cliente e crie a tabela de ocorrências.", "Uma carteira pode ter lista própria de ocorrências."),
          step("Vincular na carteira", "Acesse Visualização de Parâmetros > Opções > Ocorrências > Histórico e vincule a tabela.", "Inclua print confirmando o vínculo.")
        ]
      }
    ]
  }
};

function step(title, description, note = "", menuPath = "") {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    title,
    description,
    note,
    menuPath,
    images: []
  };
}

function section(title, text = "", steps = []) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    title,
    text,
    steps
  };
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("manualDate").valueAsDate = new Date();
  renderTemplateGrid();
  applyTemplate("novaCarteira");
  bindEvents();
  buildPreview();
});

function bindEvents() {
  document.querySelectorAll("[data-scroll-to]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".step-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  ["manualTitle", "manualCategory"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", updateChips);
    document.getElementById(id)?.addEventListener("change", updateChips);
  });

  document.getElementById("btnApplyTemplate")?.addEventListener("click", () => applyTemplate(manualState.selectedTemplate));
  document.getElementById("btnBlank")?.addEventListener("click", startBlank);
  document.getElementById("btnAddSection")?.addEventListener("click", addManualSection);
  document.getElementById("btnBuildPreview")?.addEventListener("click", buildPreview);
  document.getElementById("btnParseQuickText")?.addEventListener("click", parseQuickText);
  document.getElementById("btnDownloadPdf")?.addEventListener("click", downloadPdf);
  document.getElementById("btnCopyFreshdesk")?.addEventListener("click", copyFreshdeskHtml);
  document.getElementById("btnExportJson")?.addEventListener("click", exportJson);
  document.getElementById("btnPrint")?.addEventListener("click", () => window.print());
}

function renderTemplateGrid() {
  const grid = document.getElementById("templateGrid");
  grid.innerHTML = Object.entries(templates).map(([key, item]) => `
    <button type="button" class="template-card ${key === manualState.selectedTemplate ? "active" : ""}" data-template="${key}">
      <strong>${escapeHtml(item.label)}</strong>
      <small>${escapeHtml(item.description)}</small>
    </button>
  `).join("");

  grid.querySelectorAll("[data-template]").forEach(card => {
    card.addEventListener("click", () => {
      manualState.selectedTemplate = card.dataset.template;
      document.querySelectorAll(".template-card").forEach(item => item.classList.remove("active"));
      card.classList.add("active");
    });
  });
}

function applyTemplate(key) {
  const template = templates[key];
  if (!template) return;

  document.getElementById("manualTitle").value = template.title;
  document.getElementById("manualSubtitle").value = template.subtitle;
  document.getElementById("manualCategory").value = template.category;
  document.getElementById("manualObjective").value = template.objective;

  manualState.sections = structuredCloneSafe(template.sections);
  renderSectionsEditor();
  updateChips();
  setMessage("Modelo aplicado. Agora ajuste os textos, adicione prints e gere o preview.", "ok");
}

function startBlank() {
  document.getElementById("manualTitle").value = "Manual DataCob - Nova Rotina";
  document.getElementById("manualSubtitle").value = "Passo a passo operacional";
  document.getElementById("manualObjective").value = "Este manual foi desenvolvido para orientar a configuração e utilização da rotina no sistema DataCob.";

  manualState.sections = [section("Nova seção", "Descreva o objetivo desta etapa.", [step("Primeiro passo", "Descreva a ação que o usuário deve executar.")])];
  renderSectionsEditor();
  updateChips();
  setMessage("Manual em branco criado. Agora é só lapidar a pedra bruta.", "ok");
}

function renderSectionsEditor() {
  const container = document.getElementById("manualSections");

  container.innerHTML = manualState.sections.map((manualSection, sectionIndex) => `
    <article class="editable-card" data-section-index="${sectionIndex}">
      <div class="editable-card-header">
        <strong>Seção ${sectionIndex + 1}</strong>
        <button type="button" class="icon-btn" data-remove-section="${sectionIndex}" title="Remover seção"><i class="fa-solid fa-trash"></i></button>
      </div>

      <div class="form-grid">
        <div class="field double">
          <label>Título da seção</label>
          <input class="form-control" data-section-field="title" value="${escapeAttr(manualSection.title)}" />
        </div>
        <div class="field full">
          <label>Texto de abertura</label>
          <textarea class="form-control" data-section-field="text">${escapeHtml(manualSection.text || "")}</textarea>
        </div>
      </div>

      <div class="manual-step-list mt-3">
        ${(manualSection.steps || []).map((manualStep, stepIndex) => renderStepEditor(manualStep, sectionIndex, stepIndex)).join("")}
      </div>

      <div class="actions">
        <button type="button" class="btn-arriba btn-light-arriba" data-add-step="${sectionIndex}"><i class="fa-solid fa-plus me-2"></i>Adicionar passo</button>
      </div>
    </article>
  `).join("");

  bindEditorEvents();
  updateChips();
}

function renderStepEditor(manualStep, sectionIndex, stepIndex) {
  return `
    <div class="editable-card" data-step-index="${stepIndex}">
      <div class="editable-card-header">
        <strong>Passo ${stepIndex + 1}</strong>
        <button type="button" class="icon-btn" data-remove-step="${sectionIndex}:${stepIndex}" title="Remover passo"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="form-grid">
        <div class="field">
          <label>Título do passo</label>
          <input class="form-control" data-step-field="title" value="${escapeAttr(manualStep.title)}" />
        </div>
        <div class="field double">
          <label>Caminho de menu</label>
          <input class="form-control" data-step-field="menuPath" value="${escapeAttr(manualStep.menuPath || "")}" placeholder="Ex.: Parâmetros > Cadastro > Grupo/Cliente/Fase" />
        </div>
        <div class="field full">
          <label>Descrição</label>
          <textarea class="form-control" data-step-field="description">${escapeHtml(manualStep.description || "")}</textarea>
        </div>
        <div class="field full">
          <label>Observação / alerta</label>
          <textarea class="form-control" data-step-field="note">${escapeHtml(manualStep.note || "")}</textarea>
        </div>
        <div class="field full">
          <label>Prints da etapa</label>
          <input type="file" class="form-control" data-step-images="${sectionIndex}:${stepIndex}" accept="image/*" multiple />
          <div class="image-preview-list">
            ${(manualStep.images || []).map(img => `
              <div class="image-preview-item">
                <img src="${img.src}" alt="${escapeAttr(img.name)}" />
                <small>${escapeHtml(img.name)}</small>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindEditorEvents() {
  document.querySelectorAll("[data-section-field]").forEach(input => {
    input.addEventListener("input", event => {
      const sectionEl = event.target.closest("[data-section-index]");
      const sectionIndex = Number(sectionEl.dataset.sectionIndex);
      manualState.sections[sectionIndex][event.target.dataset.sectionField] = event.target.value;
      updateChips();
    });
  });

  document.querySelectorAll("[data-step-field]").forEach(input => {
    input.addEventListener("input", event => {
      const sectionEl = event.target.closest("[data-section-index]");
      const stepEl = event.target.closest("[data-step-index]");
      const sectionIndex = Number(sectionEl.dataset.sectionIndex);
      const stepIndex = Number(stepEl.dataset.stepIndex);
      manualState.sections[sectionIndex].steps[stepIndex][event.target.dataset.stepField] = event.target.value;
      updateChips();
    });
  });

  document.querySelectorAll("[data-add-step]").forEach(button => {
    button.addEventListener("click", () => {
      const sectionIndex = Number(button.dataset.addStep);
      manualState.sections[sectionIndex].steps.push(step("Novo passo", "Descreva a ação executada pelo usuário."));
      renderSectionsEditor();
    });
  });

  document.querySelectorAll("[data-remove-section]").forEach(button => {
    button.addEventListener("click", () => {
      manualState.sections.splice(Number(button.dataset.removeSection), 1);
      renderSectionsEditor();
    });
  });

  document.querySelectorAll("[data-remove-step]").forEach(button => {
    button.addEventListener("click", () => {
      const [sectionIndex, stepIndex] = button.dataset.removeStep.split(":").map(Number);
      manualState.sections[sectionIndex].steps.splice(stepIndex, 1);
      renderSectionsEditor();
    });
  });

  document.querySelectorAll("[data-step-images]").forEach(input => {
    input.addEventListener("change", async event => {
      const [sectionIndex, stepIndex] = event.target.dataset.stepImages.split(":").map(Number);
      const files = Array.from(event.target.files || []);
      const images = await Promise.all(files.map(readImageFile));
      manualState.sections[sectionIndex].steps[stepIndex].images.push(...images);
      renderSectionsEditor();
    });
  });
}

function addManualSection() {
  manualState.sections.push(section("Nova seção", "Descreva o objetivo desta etapa.", [step("Novo passo", "Descreva a ação executada pelo usuário.")]));
  renderSectionsEditor();
}

function parseQuickText() {
  const text = document.getElementById("quickText").value.trim();
  if (!text) {
    setMessage("Digite ou cole um roteiro antes de transformar em passos.", "error");
    return;
  }

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const parsedSections = [];
  let current = null;

  lines.forEach(line => {
    if (line.startsWith("#")) {
      current = section(line.replace(/^#+\s*/, ""), "", []);
      parsedSections.push(current);
      return;
    }

    if (!current) {
      current = section("Passo a passo", "", []);
      parsedSections.push(current);
    }

    if (/^(passo|etapa)\s*:/i.test(line)) {
      current.steps.push(step(line.replace(/^(passo|etapa)\s*:/i, "").trim(), "Descreva os detalhes desta etapa."));
    } else if (/^(obs|observacao|observação|alerta)\s*:/i.test(line)) {
      if (!current.steps.length) current.steps.push(step("Observação", ""));
      current.steps[current.steps.length - 1].note = line.replace(/^(obs|observacao|observação|alerta)\s*:/i, "").trim();
    } else {
      current.text = current.text ? `${current.text}\n${line}` : line;
    }
  });

  manualState.sections.push(...parsedSections);
  document.getElementById("quickText").value = "";
  renderSectionsEditor();
  setMessage("Texto transformado em seções e passos. Agora revise e adicione prints.", "ok");
}

function collectManualData() {
  return {
    title: getValue("manualTitle"),
    subtitle: getValue("manualSubtitle"),
    category: getValue("manualCategory"),
    client: getValue("manualClient"),
    version: getValue("manualVersion"),
    author: getValue("manualAuthor"),
    date: getValue("manualDate"),
    objective: getValue("manualObjective"),
    sections: manualState.sections
  };
}

function buildPreview() {
  const data = collectManualData();
  if (!data.title) {
    setMessage("Informe o título do manual antes de gerar o preview.", "error");
    return;
  }

  manualState.lastHtml = buildManualHtml(data);
  document.getElementById("manualPreview").innerHTML = manualState.lastHtml;
  updateChips();
  setMessage("Preview gerado. Confira o conteúdo antes de baixar o PDF.", "ok");
}

function buildManualHtml(data) {
  const tocRows = data.sections.map((item, index) => `
    <div class="toc-row"><span>${index + 1}. ${escapeHtml(item.title)}</span><span>${index + 3}</span></div>
  `).join("");

  const sectionPages = data.sections.map((item, sectionIndex) => `
    <section class="manual-page">
      <h2>${sectionIndex + 1}. ${escapeHtml(item.title)}</h2>
      ${formatParagraphs(item.text)}
      ${(item.steps || []).map((manualStep, stepIndex) => `
        <div class="manual-step">
          <h3>${sectionIndex + 1}.${stepIndex + 1} ${escapeHtml(manualStep.title)}</h3>
          ${manualStep.menuPath ? `<p><strong>Caminho:</strong> ${escapeHtml(manualStep.menuPath)}</p>` : ""}
          ${formatParagraphs(manualStep.description)}
          ${manualStep.note ? `<p><strong>Observação:</strong> ${escapeHtml(manualStep.note)}</p>` : ""}
          ${(manualStep.images || []).map(img => `<img src="${img.src}" alt="${escapeAttr(img.name)}"><p><small>${escapeHtml(img.name)}</small></p>`).join("")}
        </div>
      `).join("")}
      ${manualFooter()}
    </section>
  `).join("");

  return `
    <section class="manual-page manual-cover">
      <div>
        <h1>${escapeHtml(data.title)}</h1>
        <p style="font-size: 22px; color: #555;">${escapeHtml(data.subtitle || "")}</p>
        <p><strong>Categoria:</strong> ${escapeHtml(data.category || "")}</p>
        ${data.client ? `<p><strong>Cliente/Carteira:</strong> ${escapeHtml(data.client)}</p>` : ""}
        <div class="manual-logo">PH3A</div>
      </div>
    </section>

    <section class="manual-page">
      <h2>Sumário</h2>
      ${tocRows || `<p>Nenhuma seção cadastrada.</p>`}
      ${manualFooter()}
    </section>

    <section class="manual-page">
      <h2>Introdução</h2>
      ${formatParagraphs(data.objective)}
      <h2>Histórico e Autores do Documento</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <thead>
          <tr>
            <th style="border:1px solid #ddd; padding:8px;">Versão</th>
            <th style="border:1px solid #ddd; padding:8px;">Autor</th>
            <th style="border:1px solid #ddd; padding:8px;">Data</th>
            <th style="border:1px solid #ddd; padding:8px;">Ação</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #ddd; padding:8px;">${escapeHtml(data.version || "1.0")}</td>
            <td style="border:1px solid #ddd; padding:8px;">${escapeHtml(data.author || "Suporte")}</td>
            <td style="border:1px solid #ddd; padding:8px;">${formatDate(data.date)}</td>
            <td style="border:1px solid #ddd; padding:8px;">Criação do manual</td>
          </tr>
        </tbody>
      </table>
      ${manualFooter()}
    </section>

    ${sectionPages}

    <section class="manual-page">
      <h2>Encerramento</h2>
      <p>Estamos à disposição para maiores esclarecimentos.</p>
      <p><strong>https://suporte.ph3a.com.br</strong><br>suporte@ph3a.com.br</p>
      ${manualFooter()}
    </section>
  `;
}

function manualFooter() {
  return `<div class="manual-footer">www.ph3a.com.br · Documento interno de suporte · Gerado pela Arriba Platform</div>`;
}

async function downloadPdf() {
  if (!manualState.lastHtml) buildPreview();

  if (!window.jspdf || !window.html2canvas) {
    setMessage("Bibliotecas de PDF não carregadas. Use o botão Imprimir como alternativa.", "error");
    return;
  }

  const pages = Array.from(document.querySelectorAll("#manualPreview .manual-page"));
  if (!pages.length) {
    setMessage("Gere o preview antes de baixar o PDF.", "error");
    return;
  }

  setMessage("Gerando PDF. Calma, o pergaminho está sendo selado...", "warn");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  for (let index = 0; index < pages.length; index++) {
    const canvas = await html2canvas(pages[index], {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    if (index > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
  }

  pdf.save(`${slugify(getValue("manualTitle") || "manual-datacob")}.pdf`);
  setMessage("PDF gerado com sucesso.", "ok");
}

function copyFreshdeskHtml() {
  const data = collectManualData();
  const html = `
    <h1>${escapeHtml(data.title)}</h1>
    <p>${escapeHtml(data.subtitle || "")}</p>
    <h2>Introdução</h2>
    ${formatParagraphs(data.objective)}
    ${data.sections.map((item, sectionIndex) => `
      <h2>${sectionIndex + 1}. ${escapeHtml(item.title)}</h2>
      ${formatParagraphs(item.text)}
      ${(item.steps || []).map((manualStep, stepIndex) => `
        <h3>${sectionIndex + 1}.${stepIndex + 1} ${escapeHtml(manualStep.title)}</h3>
        ${manualStep.menuPath ? `<p><strong>Caminho:</strong> ${escapeHtml(manualStep.menuPath)}</p>` : ""}
        ${formatParagraphs(manualStep.description)}
        ${manualStep.note ? `<p><strong>Observação:</strong> ${escapeHtml(manualStep.note)}</p>` : ""}
      `).join("")}
    `).join("")}
  `;

  navigator.clipboard.writeText(html.trim()).then(() => {
    setMessage("HTML copiado. Pronto para colar no Freshdesk/Help Center.", "ok");
  }).catch(() => {
    setMessage("Não consegui copiar automaticamente. Gere o JSON ou use o preview.", "error");
  });
}

function exportJson() {
  const data = collectManualData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(data.title || "manual-datacob")}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setMessage("JSON exportado. Útil para reaproveitar o manual depois.", "ok");
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, src: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateChips() {
  document.getElementById("chipCategory").textContent = getValue("manualCategory") || "-";
  document.getElementById("chipTitle").textContent = getValue("manualTitle") || "Sem título";
  document.getElementById("chipSteps").textContent = String(manualState.sections.reduce((sum, item) => sum + (item.steps || []).length, 0));
}

function setMessage(text, type = "ok") {
  const box = document.getElementById("messageBox");
  if (!box) return;
  box.textContent = text;
  box.classList.toggle("warn", type === "warn");
  box.classList.toggle("error", type === "error");
}

function getValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function formatParagraphs(text = "") {
  const value = String(text || "").trim();
  if (!value) return "";
  return value.split(/\n+/).map(line => `<p>${escapeHtml(line)}</p>`).join("");
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replaceAll("'", "&#039;");
}

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "manual-datacob";
}

function structuredCloneSafe(value) {
  if (window.structuredClone) return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
