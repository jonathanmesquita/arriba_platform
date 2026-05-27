/*
 * PATCH - Sequência oficial por Tipo_Registro do Layout Recepção de Contratos.
 * Aplicar após o script principal do gerador.
 */

(function () {
  const sequence = [
    { key: "configuracao", label: "Configuração", tipoRegistro: 0, primary: false, description: "Diretivas operacionais do lote." },
    { key: "loja", label: "Loja", tipoRegistro: 1, primary: false, description: "Dados de loja/origem." },
    { key: "financiado", label: "Financiado", tipoRegistro: 2, primary: true, description: "Dados cadastrais do financiado." },
    { key: "email", label: "E-mail", tipoRegistro: 3, primary: false, description: "E-mails vinculados ao financiado." },
    { key: "telefone", label: "Telefone", tipoRegistro: 4, primary: false, description: "Telefones vinculados ao financiado." },
    { key: "endereco", label: "Endereço", tipoRegistro: 5, primary: false, description: "Endereços vinculados ao financiado." },
    { key: "contrato", label: "Contrato", tipoRegistro: 6, primary: true, description: "Dados do contrato e vínculo principal." },
    { key: "parcela", label: "Parcela", tipoRegistro: 7, primary: true, description: "Vencimento, valor e número da parcela." },
    { key: "historico", label: "Histórico", tipoRegistro: 8, primary: false, description: "Histórico operacional." },
    { key: "garantia", label: "Garantia", tipoRegistro: 10, primary: false, description: "Garantias associadas ao contrato." },
    { key: "avalista", label: "Avalista", tipoRegistro: 11, primary: false, description: "Avalistas vinculados ao contrato." },
    { key: "dados_auxiliares", label: "Dados Auxiliares", tipoRegistro: 12, primary: false, description: "Campos auxiliares do layout." },
    { key: "processo", label: "Processo", tipoRegistro: 13, primary: false, description: "Dados de processo." },
    { key: "processo_andamento", label: "Processo Andamento", tipoRegistro: 14, primary: false, description: "Andamentos do processo." },
    { key: "processo_data", label: "Processo Data", tipoRegistro: 15, primary: false, description: "Datas do processo." },
    { key: "processo_localizador", label: "Processo Localizador", tipoRegistro: 16, primary: false, description: "Localizadores do processo." },
    { key: "despesa", label: "Despesa", tipoRegistro: 17, primary: false, description: "Despesas vinculadas." },
    { key: "mensagem_operacao", label: "Mensagem Operação", tipoRegistro: 18, primary: false, description: "Mensagens operacionais do lote." }
  ];

  const primaryKeys = ["financiado", "contrato", "parcela"];

  function normalizeKey(value = "") {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");
  }

  function sortKeys(keys = []) {
    const order = new Map(sequence.map(item => [item.key, item.tipoRegistro]));
    return [...keys].sort((a, b) => (order.get(normalizeKey(a)) ?? 999) - (order.get(normalizeKey(b)) ?? 999));
  }

  function injectStyles() {
    if (document.getElementById("tipoRegistroPatchStyle")) return;

    const style = document.createElement("style");
    style.id = "tipoRegistroPatchStyle";
    style.textContent = `
      .tipo-registro-panel {
        margin-top: 22px;
        padding: 18px;
        border: 1px solid #ddd6cf;
        border-radius: 10px;
        background: #fff;
      }

      .tipo-registro-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .tipo-registro-header p {
        margin: 6px 0 0;
        color: #625c56;
        line-height: 1.45;
      }

      .tipo-registro-primary-btn {
        border: 0;
        background: #1f1b19;
        color: #fff;
        border-radius: 999px;
        padding: 10px 14px;
        font-weight: 900;
        cursor: pointer;
        white-space: nowrap;
      }

      .tipo-registro-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .tipo-registro-card {
        display: grid;
        grid-template-columns: auto auto minmax(0, 1fr);
        gap: 10px;
        align-items: flex-start;
        border: 1px solid #ddd6cf;
        border-radius: 9px;
        padding: 12px;
        cursor: pointer;
        background: #fff;
        transition: .18s ease;
      }

      .tipo-registro-card:hover,
      .tipo-registro-card.selected {
        border-color: #c74634;
        box-shadow: 0 8px 22px rgba(199,70,52,.12);
        transform: translateY(-1px);
      }

      .tipo-registro-card.primary {
        background: #fffaf0;
      }

      .tipo-registro-number {
        display: inline-grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #efede9;
        font-weight: 900;
        color: #1f1b19;
        font-size: .82rem;
      }

      .tipo-registro-card.selected .tipo-registro-number {
        background: #c74634;
        color: #fff;
      }

      .tipo-registro-card strong,
      .tipo-registro-card small {
        display: block;
      }

      .tipo-registro-card small {
        color: #625c56;
        line-height: 1.35;
        margin-top: 4px;
      }

      @media (max-width: 980px) {
        .tipo-registro-header { flex-direction: column; }
        .tipo-registro-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }

      @media (max-width: 620px) {
        .tipo-registro-grid { grid-template-columns: 1fr; }
        .tipo-registro-primary-btn { width: 100%; }
      }
    `;

    document.head.appendChild(style);
  }

  function findStepOne() {
    return (
      document.querySelector("#step-load-type") ||
      document.querySelector("[id*='step'][id*='type']") ||
      Array.from(document.querySelectorAll("section")).find(section =>
        /layout|tipo de arquivo|tipo da carga/i.test(section.textContent || "")
      ) ||
      document.querySelector("section")
    );
  }

  function createSelectionPanel() {
    const stepOne = findStepOne();
    if (!stepOne || document.getElementById("datacobTipoRegistroPanel")) return;

    const panel = document.createElement("div");
    panel.id = "datacobTipoRegistroPanel";
    panel.className = "tipo-registro-panel";
    panel.innerHTML = `
      <div class="tipo-registro-header">
        <div>
          <strong>Sequência oficial por Tipo_Registro</strong>
          <p>As tabelas abaixo seguem a ordem do layout padrão. Para a primeira recepção, use Financiado + Contrato + Parcela.</p>
        </div>
        <button type="button" class="tipo-registro-primary-btn" id="btnPrimeiraRecepcao">
          Usar primeira recepção recomendada
        </button>
      </div>
      <div class="tipo-registro-grid" id="tipoRegistroGrid"></div>
    `;

    stepOne.appendChild(panel);

    const grid = panel.querySelector("#tipoRegistroGrid");
    grid.innerHTML = sequence.map(item => `
      <label class="tipo-registro-card ${item.primary ? "primary" : ""}" data-tipo-registro-card="${item.key}">
        <input type="checkbox" value="${item.key}" ${item.primary ? "checked" : ""}>
        <span class="tipo-registro-number">${item.tipoRegistro}</span>
        <span>
          <strong>${item.label}</strong>
          <small>${item.description}</small>
        </span>
      </label>
    `).join("");

    panel.querySelector("#btnPrimeiraRecepcao").addEventListener("click", () => {
      panel.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = primaryKeys.includes(input.value);
      });
      updateSelectedLayoutState();
    });

    panel.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener("change", updateSelectedLayoutState);
    });

    updateSelectedLayoutState();
  }

  function updateSelectedLayoutState() {
    const panel = document.getElementById("datacobTipoRegistroPanel");
    if (!panel) return;

    const selected = Array.from(panel.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
    const ordered = sortKeys(selected);

    window.datacobSelectedTipoRegistro = ordered;

    panel.querySelectorAll("[data-tipo-registro-card]").forEach(card => {
      card.classList.toggle("selected", ordered.includes(card.dataset.tipoRegistroCard));
    });

    updateDownloadButtons(ordered);
  }

  function updateDownloadButtons(ordered) {
    const labelMap = Object.fromEntries(sequence.map(item => [item.key, item.label]));
    const isPrimaryOnly = ordered.length === 3 && primaryKeys.every(key => ordered.includes(key));
    const label = isPrimaryOnly
      ? "Baixar primeira recepção"
      : ordered.length
        ? `Baixar ${ordered.map(key => labelMap[key]).join(" + ")}`
        : "Baixar Todos";

    document.querySelectorAll("button, a").forEach(el => {
      const text = el.textContent || "";
      if (/baixar todos|baixar primeira recep|baixar contrato|financiado|parcela/i.test(text) && /baixar/i.test(text)) {
        el.textContent = label;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    createSelectionPanel();
  });
})();
