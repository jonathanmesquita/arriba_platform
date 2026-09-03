/* =====================================================================
   Centro de Aprendizado (Arriba Platform)

   Hub das trilhas e simuladores, no espírito do W3Schools: cada tópico
   mostra a teoria, um exemplo de código REAL e um botão pra testar na
   hora. A identidade visual é a do Arriba (tokens.css / paleta Redwood),
   não a do site que serviu de referência.

   O painel "Seu progresso" NÃO tem dados próprios: ele lê o que as
   ferramentas já gravam no localStorage —
   assets/js/gamification.js (pontos/lições/badges da trilha) e
   assets/js/sql-query-store.js (execuções no sandbox/playground). Se um
   dia entrar uma segunda trilha, é só somar aqui.

   Os cards saem de TOPICOS (abaixo), então adicionar tópico é adicionar
   um objeto — nenhum HTML de card é escrito à mão na página.
   ===================================================================== */

import { TRACK_7_LICOES, TRACK_7_BADGES } from "../../assets/data/tracks/track-7-sql.js";
import { getProgress, badgeDesbloqueado, calcularPercentualConcluido } from "../../assets/js/gamification.js";
import { getEstatisticas } from "../../assets/js/sql-query-store.js";

const TRACK_ID = "track-7-sql";
const PLAYGROUND_ID = "sql-playground";

/* ---------------------------------------------------------------------
   Tópicos do hub. `exemplo` é código de verdade — o mesmo que roda na
   ferramenta indicada, para o card não prometer algo que não acontece.
   --------------------------------------------------------------------- */
const TOPICOS = [
  {
    id: "sql",
    titulo: "SQL / T-SQL",
    tagline: "A linguagem para consultar os dados do DataCob no SQL Server.",
    chips: [`${TRACK_7_LICOES.length} lições`, "Trilha completa", "Simulador"],
    pronto: true,
    exemploTitulo: "Exemplo: contratos por carteira",
    exemplo: `SELECT g.Descricao AS Carteira,
       COUNT(c.Id_Contrato) AS Contratos
  FROM Contrato c
  JOIN Grupo g ON g.Id_Grupo = c.Id_Grupo
 GROUP BY g.Descricao
 ORDER BY Contratos DESC;`,
    acoes: [
      { label: "Aprender SQL", href: "../../tools/datacob/treinamento-sql/treinamento-sql.html", estilo: "btn-red-arriba", icone: "fa-graduation-cap" },
      { label: "Try it Yourself", href: "../../tools/datacob/sql-playground/sql-playground.html", estilo: "btn-dark-arriba", icone: "fa-play" }
    ]
  },
  {
    id: "relatorios",
    titulo: "Consultas para relatório",
    tagline: "Montar query de relatório por regras, sem escrever SQL do zero.",
    chips: ["Gerador de query", "CASE WHEN", "Export"],
    pronto: true,
    exemploTitulo: "Exemplo: classificar por faixa de valor",
    exemplo: `SELECT pa.Id_Acordo, pa.Vl_Parcela,
       CASE
         WHEN pa.Vl_Parcela < 500  THEN 'Baixo'
         WHEN pa.Vl_Parcela <= 1500 THEN 'Medio'
         ELSE 'Alto'
       END AS Faixa
  FROM Parcela_Acordo pa;`,
    acoes: [
      { label: "Abrir gerador", href: "../../tools/datacob/query-builder/query-builder.html", estilo: "btn-red-arriba", icone: "fa-table-columns" },
      { label: "Testar no simulador", href: "../../tools/datacob/sql-playground/sql-playground.html", estilo: "btn-outline-arriba", icone: "fa-play" }
    ]
  },
  {
    id: "cnab",
    titulo: "CNAB 400",
    tagline: "O arquivo de cobrança trocado com os bancos — ler, validar e gerar.",
    chips: ["Bradesco", "Itaú", "BMP Money Plus"],
    pronto: true,
    exemploTitulo: "Exemplo: header de Retorno (posições 1 a 26)",
    exemplo: `02RETORNO01COBRANCA
│││       ││
│││       │└─ 12-26  Literal "COBRANCA"
│││       └── 10-11  Código do serviço ("01")
││└────────── 03-09  Literal "RETORNO"
│└─────────── 02      Tipo de arquivo (2 = retorno)
└──────────── 01      Tipo de registro (0 = header)

-- posições são 1-indexadas e inclusivas`,
    acoes: [
      { label: "Abrir validador", href: "../../tools/datacob/cnab400/cnab400.html", estilo: "btn-red-arriba", icone: "fa-file-invoice-dollar" }
    ]
  },
  {
    id: "codificacao",
    titulo: "Codificação de dados",
    tagline: "Base64, URL, hex, JWT e companhia — decodificar o que chega no chamado.",
    chips: ["Base64", "JWT", "Hex", "Detecção automática"],
    pronto: true,
    exemploTitulo: "Exemplo: Base64 que vira PDF",
    exemplo: `JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PC9MZW5n...

-- os bytes "%PDF" no início (magic bytes) são
-- o que identifica o conteúdo como PDF depois
-- de decodificar`,
    acoes: [
      { label: "Abrir decodificador", href: "../../tools/dados/decodificador/decodificador.html", estilo: "btn-red-arriba", icone: "fa-right-left" },
      { label: "Base64 → PDF", href: "../../tools/dados/base64-pdf/base64-pdf.html", estilo: "btn-outline-arriba", icone: "fa-file-pdf" }
    ]
  },
  {
    id: "massa-dados",
    titulo: "Massa de dados de teste",
    tagline: "Gerar nome, CPF válido, celular, CEP e endereço fictícios para testar.",
    chips: ["CPF com dígito válido", "Dados BR", "Fictício"],
    pronto: true,
    exemploTitulo: "Exemplo: por que o CPF precisa ser válido",
    exemplo: `-- CPF fictício, mas com dígito verificador correto:
-- o sistema recusa 111.111.111-11, então massa de
-- teste boa precisa passar pelo mesmo cálculo
-- (módulo 11) que o CPF real.

11122233396   ← aceito na validação
11111111111   ← recusado`,
    acoes: [
      { label: "Gerar massa", href: "../../tools/datacob/massa-dados/massa-dados.html", estilo: "btn-red-arriba", icone: "fa-users" }
    ]
  },
  {
    id: "datacob-produto",
    titulo: "DataCob (produto)",
    tagline: "Como operar o sistema: cadastro de carteira, régua, ocorrências.",
    chips: ["Passo a passo", "Para o cliente"],
    pronto: true,
    exemploTitulo: "Onde isso te ajuda",
    exemplo: `Cadastro de nova carteira:

  Grupo (carteira)
    └─ Cliente (credor)
         └─ Fase (estágio da dívida)
              └─ Régua (sequência de ações)

-- é a configuração que define o que o sistema
-- vai cobrar, de quem e em que ordem`,
    acoes: [
      { label: "Abrir treinamento", href: "../../tools/datacob/treinamento-cliente/index.html", estilo: "btn-red-arriba", icone: "fa-book-open" },
      { label: "Base de conhecimento", href: "../../tools/datacob/support-copilot/docs/datacob-manuais/", estilo: "btn-outline-arriba", icone: "fa-folder-open" }
    ]
  }
];

/* ---------------------------------------------------------------------
   Progresso (lido das ferramentas, não duplicado aqui)
   --------------------------------------------------------------------- */
function renderProgresso() {
  const progresso = getProgress(TRACK_ID);
  const percentual = calcularPercentualConcluido(TRACK_ID, TRACK_7_LICOES.length);
  // licoesConcluidas é um mapa { licaoId: true }, não array — contar por chave.
  const licoesFeitas = Object.keys(progresso.licoesConcluidas || {}).length;
  const statsTrilha = getEstatisticas(TRACK_ID);
  const statsPlayground = getEstatisticas(PLAYGROUND_ID);
  const execucoes = statsTrilha.execucoes + statsPlayground.execucoes;

  document.getElementById("statRow").innerHTML = `
    <div class="stat"><strong>${progresso.pontos || 0}</strong><span>Pontos</span></div>
    <div class="stat"><strong>${licoesFeitas}/${TRACK_7_LICOES.length}</strong><span>Lições</span></div>
    <div class="stat"><strong>${execucoes}</strong><span>Consultas rodadas</span></div>
    <div class="stat"><strong>${statsPlayground.totalSalvas}</strong><span>Consultas salvas</span></div>
  `;

  document.getElementById("barra").style.width = `${percentual}%`;
  document.getElementById("barraLabel").textContent = `${percentual}% da trilha de SQL concluída`;

  // Mostra o convite só pra quem realmente não começou nada.
  const nadaFeito = licoesFeitas === 0 && execucoes === 0;
  document.getElementById("progressoVazio").style.display = nadaFeito ? "block" : "none";

  const desbloqueados = TRACK_7_BADGES.filter((b) => badgeDesbloqueado(TRACK_ID, b.id));
  document.getElementById("badgesRow").innerHTML = TRACK_7_BADGES.map((badge) => {
    const unlocked = badgeDesbloqueado(TRACK_ID, badge.id);
    return `<div class="badge-icon ${unlocked ? "unlocked" : ""}" title="${escHtml(badge.nome)}${unlocked ? "" : " (bloqueado)"}">${badge.emoji}</div>`;
  }).join("");
  document.getElementById("badgesLabel").textContent =
    `${desbloqueados.length} de ${TRACK_7_BADGES.length} conquistas desbloqueadas`;
}

/* ---------------------------------------------------------------------
   Cards de tópico
   --------------------------------------------------------------------- */
function renderTopicos() {
  document.getElementById("topicos").innerHTML = TOPICOS.map((t) => `
    <article class="panel topico">
      <div class="topico-info">
        <h3>${escHtml(t.titulo)}</h3>
        <p class="topico-tag">${escHtml(t.tagline)}</p>
        <div class="topico-meta">
          ${t.pronto ? '<span class="chip pronto">Disponível</span>' : ""}
          ${t.chips.map((c) => `<span class="chip">${escHtml(c)}</span>`).join("")}
        </div>
        <div class="topico-actions">
          ${t.acoes.map((a) => `
            <a class="btn-arriba ${a.estilo}" href="${a.href}">
              <i class="fa-solid ${a.icone} me-2"></i>${escHtml(a.label)}
            </a>
          `).join("")}
        </div>
      </div>
      <div class="exemplo">
        <p class="exemplo-title">${escHtml(t.exemploTitulo)}</p>
        <pre class="code-block">${escHtml(t.exemplo)}</pre>
      </div>
    </article>
  `).join("");
}

function escHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

renderProgresso();
renderTopicos();
