/* =====================================================================
   Validador de CSV - UI

   Divisao igual a das outras ferramentas do site: parser.js le, rules.js
   confere, schemas.js guarda os layouts prontos, e este arquivo so
   amarra tela e resultado. Nada aqui interpreta CSV na mao.

   Tudo roda no navegador: o arquivo nunca sai da maquina de quem abriu -
   o que importa aqui, porque CSV de recepcao carrega nome, CPF e
   endereco de devedor.
   ===================================================================== */

import { analisarCsv, montarCsv, DELIMITADORES, nomeDelimitador } from "./parser.js";
import { validarComSchema, acharLinhasDuplicadas, TIPOS, normalizar } from "./rules.js";
import { montarSchemaDataCob, listarSchemasDataCob, reconhecerLayout, conferirCabecalhoContraLayout } from "./schemas.js";

const LIMITE_GRADE = 300;   // linhas desenhadas (a validacao roda em todas)
const LIMITE_LISTA = 200;   // achados listados

const estado = {
  texto: "",
  nomeArquivo: "",
  dados: null,       // saida do analisarCsv
  schema: null,      // schema em uso
  achados: [],
  modoSchema: "auto", // auto | datacob | personalizado | nenhum
  layoutEscolhido: "",
  soErros: false
};

export function initUI() {
  // Seletor de layout do DataCob
  const select = el("layoutSelect");
  listarSchemasDataCob().forEach(({ key, label }) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = label;
    select.appendChild(opt);
  });

  // Delimitador
  const delim = el("delimitadorSelect");
  DELIMITADORES.forEach(({ valor, nome }) => {
    const opt = document.createElement("option");
    opt.value = valor;
    opt.textContent = nome;
    delim.appendChild(opt);
  });

  el("dropZone").addEventListener("click", () => el("fileInput").click());
  el("dropZone").addEventListener("dragover", (e) => { e.preventDefault(); el("dropZone").classList.add("drag"); });
  el("dropZone").addEventListener("dragleave", () => el("dropZone").classList.remove("drag"));
  el("dropZone").addEventListener("drop", (e) => {
    e.preventDefault();
    el("dropZone").classList.remove("drag");
    if (e.dataTransfer.files[0]) lerArquivo(e.dataTransfer.files[0]);
  });
  el("fileInput").addEventListener("change", (e) => { if (e.target.files[0]) lerArquivo(e.target.files[0]); });

  el("btnValidar").addEventListener("click", () => {
    estado.texto = el("rawInput").value;
    estado.nomeArquivo = estado.nomeArquivo || "colado.csv";
    processar();
  });
  el("btnLimpar").addEventListener("click", limpar);
  el("btnExemplo").addEventListener("click", carregarExemplo);

  el("temCabecalho").addEventListener("change", processar);
  el("checarDuplicadas").addEventListener("change", processar);
  el("delimitadorSelect").addEventListener("change", processar);
  el("layoutSelect").addEventListener("change", () => {
    estado.layoutEscolhido = el("layoutSelect").value;
    estado.modoSchema = estado.layoutEscolhido ? "datacob" : "auto";
    sincronizarModo();
    processar();
  });
  document.querySelectorAll("[name=modoSchema]").forEach((radio) => {
    radio.addEventListener("change", () => {
      estado.modoSchema = radio.value;
      sincronizarModo();
      processar();
    });
  });

  el("btnBaixarRelatorio").addEventListener("click", baixarRelatorio);
  el("btnBaixarLimpo").addEventListener("click", baixarLimpo);
  el("filtroErros").addEventListener("change", () => {
    estado.soErros = el("filtroErros").checked;
    renderGrade();
  });

  sincronizarModo();
}

const el = (id) => document.getElementById(id);

function lerArquivo(file) {
  estado.nomeArquivo = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    estado.texto = String(reader.result);
    el("rawInput").value = estado.texto.length > 400000
      ? estado.texto.slice(0, 400000) + "\n… (arquivo grande: a caixa mostra só o começo, a validação usou o arquivo inteiro)"
      : estado.texto;
    processar();
  };
  // UTF-8 primeiro; se vier caractere de substituicao, tenta Latin-1 -
  // CSV exportado de sistema legado costuma vir em ISO-8859-1, e o
  // usuario nao tem por que saber disso.
  reader.onerror = () => msg("erro", "Não consegui ler o arquivo.");
  reader.readAsText(file, "UTF-8");
  reader.addEventListener("loadend", () => {
    if (String(reader.result || "").includes("�")) {
      const segunda = new FileReader();
      segunda.onload = () => {
        estado.texto = String(segunda.result);
        el("rawInput").value = estado.texto.slice(0, 400000);
        processar(`O arquivo não estava em UTF-8 (apareceram caracteres inválidos); reli como ISO-8859-1, que é o padrão de exportação de sistemas mais antigos.`);
      };
      segunda.readAsText(file, "ISO-8859-1");
    }
  }, { once: true });
}

function limpar() {
  estado.texto = "";
  estado.dados = null;
  estado.achados = [];
  estado.nomeArquivo = "";
  el("rawInput").value = "";
  el("resultado").classList.add("hidden");
  msg("", "Aguardando arquivo.");
}

function carregarExemplo() {
  // Exemplo proposital com defeito: layout de Parcela com CPF invalido,
  // data que nao existe, linha com coluna a mais, duplicada e cabecalho
  // com espaco. Serve para ver a ferramenta trabalhando.
  estado.nomeArquivo = "exemplo-parcela.csv";
  estado.texto = [
    "Tipo_Registro;Nr_Contrato;Dt_Vencimento;Tipo_Parcela;Nr_Parcela ;Vl_Original;Vl_Saldo;Vl_Tarifa;Cliente;Dt_Inclusao;Dt_Devolucao;Dt_Inibicao;Motivo;Dt_Notificacao;Marcar_Dt_Lote;Dt_Lote;Documento;Cpf_Cnpj;Plano",
    "7;0030-ARRIBA;09/02/2026;0;1;100,00;100,00;;;;;;Teste;;;;;11122233396;",
    "7;0030-ARRIBA;31/02/2026;0;2;150,00;150,00;;;;;;Data que nao existe;;;;;11122233396;",
    "7;0030-ARRIBA;10/03/2026;0;3;200,00;200,00;;;;;;CPF invalido;;;;;12345678900;",
    "7;0030-ARRIBA;10/04/2026;0;4;abc;250,00;;;;;;Valor nao numerico;;;;;11122233396;",
    "6;0030-ARRIBA;10/05/2026;0;5;300,00;300,00;;;;;;Tipo_Registro de outro layout;;;;;11122233396;",
    "7;0030-ARRIBA;10/06/2026;0;6;350,00;350,00;;;;;;Coluna a mais;;;;;11122233396;;SOBRA",
    "7;0030-ARRIBA;10/06/2026;0;6;350,00;350,00;;;;;;Coluna a mais;;;;;11122233396;;SOBRA"
  ].join("\r\n");
  el("rawInput").value = estado.texto;
  processar();
}

/* ---------------------------------------------------------------------
   Processamento
   --------------------------------------------------------------------- */

function processar(avisoExtra = "") {
  if (!estado.texto.trim()) { msg("erro", "Cole o conteúdo ou envie um arquivo .csv."); return; }

  const dados = analisarCsv(estado.texto, {
    temCabecalho: el("temCabecalho").checked,
    delimitador: el("delimitadorSelect").value || ""
  });
  estado.dados = dados;

  if (dados.vazio) {
    el("resultado").classList.add("hidden");
    msg("erro", dados.problemas.map((p) => p.mensagem).join(" "));
    return;
  }

  const reconhecido = definirSchema(dados);
  estado.achados = [
    ...validarComSchema(dados, estado.schema),
    ...(el("checarDuplicadas").checked ? acharLinhasDuplicadas(dados) : [])
  ];

  renderResumo(avisoExtra, reconhecido);
  renderProblemasEstrutura();
  renderCabecalhoLayout(reconhecido);
  renderAchados();
  renderGrade();
  renderEditorSchema();

  el("resultado").classList.remove("hidden");
}

// Decide qual schema usar e devolve o reconhecimento (quando houve).
function definirSchema(dados) {
  if (estado.modoSchema === "nenhum") { estado.schema = null; return null; }

  if (estado.modoSchema === "personalizado") {
    if (!estado.schema || estado.schema.id !== "personalizado" || estado.schema.baseCabecalho !== dados.cabecalho.join("|")) {
      estado.schema = {
        id: "personalizado",
        nome: "Schema personalizado",
        baseCabecalho: dados.cabecalho.join("|"),
        colunas: dados.cabecalho.map((coluna) => ({ coluna, obrigatorio: false, tipo: "texto", unico: false }))
      };
    }
    return null;
  }

  if (estado.modoSchema === "datacob" && estado.layoutEscolhido) {
    estado.schema = montarSchemaDataCob(estado.layoutEscolhido);
    return { key: estado.layoutEscolhido, confianca: "manual", motivo: "Layout escolhido na barra lateral." };
  }

  const reconhecido = reconhecerLayout(dados);
  estado.schema = reconhecido ? montarSchemaDataCob(reconhecido.key) : null;
  return reconhecido;
}

/* ---------------------------------------------------------------------
   Render
   --------------------------------------------------------------------- */

function renderResumo(avisoExtra, reconhecido) {
  const { meta } = estado.dados;
  const erros = estado.achados.filter((a) => a.gravidade === "erro").length
    + estado.dados.problemas.filter((p) => p.gravidade === "erro").length;
  const avisos = estado.achados.filter((a) => a.gravidade === "aviso").length
    + estado.dados.problemas.filter((p) => p.gravidade === "aviso").length;

  el("resumo").innerHTML = `
    <div class="summary-item"><span>Registros</span><strong>${meta.totalRegistros}</strong></div>
    <div class="summary-item"><span>Colunas</span><strong>${meta.totalColunas}</strong></div>
    <div class="summary-item"><span>Delimitador</span><strong>${escHtml(meta.delimitadorNome)}</strong></div>
    <div class="summary-item"><span>Fim de linha</span><strong>${escHtml(meta.quebraLinha)}${meta.quebraMisturada ? " ⚠" : ""}</strong></div>
    <div class="summary-item"><span>BOM</span><strong>${meta.bom ? "sim" : "não"}</strong></div>
    <div class="summary-item"><span>Erros</span><strong class="${erros ? "ruim" : "bom"}">${erros}</strong></div>
    <div class="summary-item"><span>Avisos</span><strong class="${avisos ? "atencao" : "bom"}">${avisos}</strong></div>`;

  const partes = [];
  if (avisoExtra) partes.push(avisoExtra);
  if (reconhecido && estado.schema) {
    partes.push(`Layout reconhecido: <strong>${escHtml(estado.schema.nome)}</strong> (confiança ${escHtml(reconhecido.confianca)} — ${escHtml(reconhecido.motivo)}).`);
  } else if (estado.modoSchema === "auto") {
    partes.push("Não reconheci nenhum layout do DataCob neste arquivo — validando só a estrutura. Escolha um layout ou monte um schema na barra lateral para conferir o conteúdo.");
  }
  partes.push(erros
    ? `<strong>${erros} erro(s)</strong> encontrado(s).`
    : "Nenhum erro encontrado.");

  msgHtml(erros ? "erro" : (avisos ? "" : "ok"), partes.join(" "));
}

function renderProblemasEstrutura() {
  const box = el("problemasEstrutura");
  const lista = estado.dados.problemas;
  if (!lista.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
  box.classList.remove("hidden");
  box.innerHTML = `
    <h3>Estrutura do arquivo</h3>
    <ul>${lista.map((p) => `
      <li class="${p.gravidade}">
        <span class="pill ${p.gravidade === "erro" ? "bad" : "warn"}">${p.gravidade}</span>
        ${escHtml(p.mensagem)}
      </li>`).join("")}</ul>`;
}

function renderCabecalhoLayout(reconhecido) {
  const box = el("cabecalhoLayout");
  const key = estado.schema?.id?.startsWith("datacob:") ? estado.schema.id.split(":")[1] : null;
  if (!key) { box.classList.add("hidden"); box.innerHTML = ""; return; }

  const conf = conferirCabecalhoContraLayout(estado.dados.cabecalho, key);
  if (!conf) { box.classList.add("hidden"); return; }

  const tudoCerto = !conf.faltando.length && !conf.sobrando.length && !conf.foraDeOrdem;
  box.classList.remove("hidden");
  box.innerHTML = `
    <h3>Cabeçalho × layout ${escHtml(conf.layout.label)}</h3>
    ${tudoCerto
      ? '<p class="ok-line">✓ As colunas batem com o layout, na mesma ordem.</p>'
      : `<ul>
          ${conf.faltando.length ? `<li class="erro"><span class="pill bad">faltando</span> ${conf.faltando.map(escHtml).join(", ")}</li>` : ""}
          ${conf.sobrando.length ? `<li class="aviso"><span class="pill warn">a mais</span> ${conf.sobrando.map(escHtml).join(", ")}</li>` : ""}
          ${conf.foraDeOrdem ? '<li class="aviso"><span class="pill warn">ordem</span> As colunas existem, mas em ordem diferente da do layout. O DataCob importa pelo nome, então costuma funcionar — só confira se o destino também usa o nome.</li>' : ""}
        </ul>`}`;
}

function renderAchados() {
  const box = el("listaAchados");
  if (!estado.achados.length) {
    box.innerHTML = '<p class="ok-line">✓ Nenhum problema de conteúdo encontrado nas regras aplicadas.</p>';
    return;
  }
  const mostrados = estado.achados.slice(0, LIMITE_LISTA);
  box.innerHTML = `
    <div class="table-wrap">
      <table class="csv-table">
        <thead><tr><th>Linha</th><th>Coluna</th><th>Valor</th><th>Problema</th></tr></thead>
        <tbody>${mostrados.map((a) => `
          <tr class="${a.gravidade}">
            <td>${a.linha}</td>
            <td>${escHtml(a.coluna)}</td>
            <td class="valor">${a.valor ? escHtml(recortar(a.valor, 40)) : "<em>vazio</em>"}</td>
            <td>${escHtml(a.mensagem)}</td>
          </tr>`).join("")}</tbody>
      </table>
    </div>
    ${estado.achados.length > LIMITE_LISTA
      ? `<p class="hint">Mostrando ${LIMITE_LISTA} de ${estado.achados.length} achados. Baixe o relatório para ver todos.</p>`
      : ""}`;
}

function renderGrade() {
  if (!estado.dados) return;
  const box = el("grade");
  const { cabecalho, linhas } = estado.dados;

  // Mapa linha -> colunas com erro, para pintar a celula certa.
  const porLinha = new Map();
  estado.achados.forEach((a) => {
    if (a.indiceColuna < 0) return;
    if (!porLinha.has(a.linha)) porLinha.set(a.linha, new Map());
    porLinha.get(a.linha).set(a.indiceColuna, a.mensagem);
  });

  const visiveis = (estado.soErros ? linhas.filter((l) => porLinha.has(l.linha)) : linhas).slice(0, LIMITE_GRADE);

  box.innerHTML = `
    <div class="table-wrap">
      <table class="csv-table grade">
        <thead><tr><th class="num-linha">#</th>${cabecalho.map((c) => `<th>${escHtml(c)}</th>`).join("")}</tr></thead>
        <tbody>${visiveis.map((registro) => {
          const erros = porLinha.get(registro.linha);
          return `<tr>
            <td class="num-linha">${registro.linha}</td>
            ${cabecalho.map((_, i) => {
              const valor = registro.campos[i];
              const problema = erros?.get(i);
              return `<td class="${problema ? "celula-erro" : ""}${valor === undefined ? " celula-ausente" : ""}"${problema ? ` title="${escHtml(problema)}"` : ""}>${valor === undefined ? "—" : escHtml(recortar(valor, 32))}</td>`;
            }).join("")}
          </tr>`;
        }).join("")}</tbody>
      </table>
    </div>
    <p class="hint">
      ${estado.soErros
        ? `${visiveis.length} linha(s) com erro exibida(s).`
        : `Mostrando ${visiveis.length} de ${linhas.length} linha(s)${linhas.length > LIMITE_GRADE ? " (a validação rodou em todas)" : ""}.`}
      Passe o mouse na célula vermelha para ver o motivo.
    </p>`;
}

/* Editor do schema: aparece no modo personalizado e tambem deixa
   ajustar um layout do DataCob antes de revalidar. */
function renderEditorSchema() {
  const box = el("editorSchema");
  if (!estado.schema) { box.classList.add("hidden"); box.innerHTML = ""; return; }

  box.classList.remove("hidden");
  const opcoesTipo = Object.entries(TIPOS).map(([k, t]) => ({ k, nome: t.nome }));

  box.innerHTML = `
    <h3>Regras por coluna <span class="hint-inline">${escHtml(estado.schema.nome)}</span></h3>
    <div class="table-wrap">
      <table class="csv-table">
        <thead><tr><th>Coluna</th><th>Tipo</th><th>Obrigatório</th><th>Único</th><th>Tam. máx.</th><th>Valores aceitos</th></tr></thead>
        <tbody>${estado.schema.colunas.map((regra, i) => `
          <tr>
            <td><strong>${escHtml(regra.coluna)}</strong>${regra.ajuda ? `<br><small>${escHtml(regra.ajuda)}</small>` : ""}</td>
            <td>
              <select class="form-select" data-regra="${i}" data-campo="tipo">
                ${opcoesTipo.map((t) => `<option value="${t.k}"${regra.tipo === t.k ? " selected" : ""}>${escHtml(t.nome)}</option>`).join("")}
              </select>
            </td>
            <td class="centro"><input type="checkbox" data-regra="${i}" data-campo="obrigatorio"${regra.obrigatorio ? " checked" : ""}></td>
            <td class="centro"><input type="checkbox" data-regra="${i}" data-campo="unico"${regra.unico ? " checked" : ""}></td>
            <td><input class="form-control estreito" type="number" min="1" data-regra="${i}" data-campo="tamanhoMax" value="${regra.tamanhoMax || ""}"></td>
            <td><input class="form-control" data-regra="${i}" data-campo="valores" value="${escHtml((regra.valores || []).join(", "))}" placeholder="separe por vírgula"></td>
          </tr>`).join("")}</tbody>
      </table>
    </div>
    <div class="actions">
      <button type="button" class="btn-arriba btn-red-arriba" id="btnRevalidar">
        <i class="fa-solid fa-rotate me-2"></i>Aplicar regras e revalidar
      </button>
    </div>`;

  box.querySelectorAll("[data-regra]").forEach((campo) => {
    campo.addEventListener("change", () => {
      const regra = estado.schema.colunas[Number(campo.dataset.regra)];
      const nome = campo.dataset.campo;
      if (nome === "obrigatorio" || nome === "unico") regra[nome] = campo.checked;
      else if (nome === "tamanhoMax") regra.tamanhoMax = campo.value ? Number(campo.value) : null;
      else if (nome === "valores") regra.valores = campo.value.split(",").map((v) => v.trim()).filter(Boolean);
      else regra[nome] = campo.value;
    });
  });

  el("btnRevalidar").addEventListener("click", () => {
    estado.achados = [
      ...validarComSchema(estado.dados, estado.schema),
      ...(el("checarDuplicadas").checked ? acharLinhasDuplicadas(estado.dados) : [])
    ];
    renderResumo("", null);
    renderAchados();
    renderGrade();
  });
}

function sincronizarModo() {
  document.querySelectorAll("[name=modoSchema]").forEach((r) => { r.checked = r.value === estado.modoSchema; });
  el("layoutSelect").disabled = estado.modoSchema !== "datacob";
  if (estado.modoSchema !== "datacob") el("layoutSelect").value = estado.layoutEscolhido || "";
}

/* ---------------------------------------------------------------------
   Exportacoes
   --------------------------------------------------------------------- */

function baixarRelatorio() {
  if (!estado.dados) return;
  const linhas = [
    ["Gravidade", "Linha", "Coluna", "Valor", "Problema"],
    ...estado.dados.problemas.map((p) => [p.gravidade, p.linha ?? "", "(estrutura)", "", p.mensagem]),
    ...estado.achados.map((a) => [a.gravidade, a.linha, a.coluna, a.valor, a.mensagem])
  ];
  const csv = linhas
    .map((campos) => campos.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  baixar(`relatorio-${nomeBase()}.csv`, "﻿" + csv);
}

function baixarLimpo() {
  if (!estado.dados) return;
  // So as linhas com a largura certa: e o arquivo que importa sem
  // quebrar. O relatorio diz o que ficou de fora.
  const largura = estado.dados.cabecalho.length;
  const boas = estado.dados.linhas.filter((l) => l.campos.length === largura);
  const fora = estado.dados.linhas.length - boas.length;
  baixar(`limpo-${nomeBase()}.csv`, montarCsv(estado.dados.cabecalho, boas, estado.dados.meta.delimitador, true));
  msgHtml(fora ? "" : "ok", fora
    ? `Arquivo normalizado baixado com ${boas.length} linha(s). <strong>${fora} linha(s) com número de colunas errado ficaram de fora</strong> — elas estão no relatório.`
    : `Arquivo normalizado baixado com ${boas.length} linha(s) (mesmo conteúdo, delimitador e fim de linha padronizados).`);
}

function nomeBase() {
  return (estado.nomeArquivo || "arquivo.csv").replace(/\.csv$/i, "");
}

function baixar(nome, conteudo) {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------------------------------------------------------------
   Utilidades
   --------------------------------------------------------------------- */

function msg(tipo, texto) { msgHtml(tipo, escHtml(texto)); }

function msgHtml(tipo, html) {
  const box = el("mensagem");
  box.className = "validation-msg" + (tipo ? " " + tipo : "");
  box.innerHTML = html;
}

function recortar(valor, max) {
  const texto = String(valor ?? "");
  return texto.length > max ? texto.slice(0, max - 1) + "…" : texto;
}

function escHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
