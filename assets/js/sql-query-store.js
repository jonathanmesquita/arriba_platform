/* =====================================================================
   Armazenamento de consultas SQL (Arriba Platform)

   Guarda histórico de execuções, consultas salvas pelo usuário e
   estatísticas de uso. Mesmo padrão do assets/js/gamification.js:
   100% localStorage, sem backend e sem conta de usuário — cada
   navegador tem o seu. Genérico por `toolId`, então tanto o playground
   quanto o sandbox das lições (ou uma ferramenta futura) usam o mesmo
   módulo passando o próprio id.

   Nada aqui sai do navegador: o SQL digitado fica só na máquina de quem
   digitou, o que também evita levar dado sensível pra fora sem querer.
   ===================================================================== */

const STORAGE_PREFIX = "arribaSqlStore:";

// Histórico é uma fila: passando disso, a execução mais antiga cai fora.
const LIMITE_HISTORICO = 50;
const LIMITE_SALVAS = 100;
// Trava de tamanho por SQL guardado, pra não estourar a cota do
// localStorage com uma query gigante colada de outro lugar.
const LIMITE_SQL_CHARS = 20000;

function chave(toolId) {
  return STORAGE_PREFIX + toolId;
}

function estadoVazio() {
  return { historico: [], salvas: [], stats: { execucoes: 0, sucessos: 0, erros: 0, comandos: {} } };
}

function ler(toolId) {
  try {
    const raw = localStorage.getItem(chave(toolId));
    if (!raw) return estadoVazio();
    const salvo = JSON.parse(raw);
    const base = estadoVazio();
    return {
      historico: Array.isArray(salvo.historico) ? salvo.historico : base.historico,
      salvas: Array.isArray(salvo.salvas) ? salvo.salvas : base.salvas,
      stats: { ...base.stats, ...(salvo.stats || {}), comandos: { ...(salvo.stats?.comandos || {}) } }
    };
  } catch {
    // JSON corrompido ou localStorage bloqueado: começa limpo em vez de quebrar a tela.
    return estadoVazio();
  }
}

function gravar(toolId, estado) {
  try {
    localStorage.setItem(chave(toolId), JSON.stringify(estado));
  } catch {
    // Cota cheia ou modo privado: segue sem persistir (só perde na próxima sessão).
  }
  return estado;
}

function truncarSql(sql) {
  return String(sql ?? "").slice(0, LIMITE_SQL_CHARS);
}

// Primeiro comando do SQL (SELECT, INSERT, WITH...), usado nas
// estatísticas de uso. Ignora comentários de linha e espaços à frente.
export function comandoDoSql(sql) {
  const limpo = String(sql ?? "")
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim();
  const primeira = limpo.match(/^([A-Za-zÀ-ú_]+)/);
  return primeira ? primeira[1].toUpperCase() : "?";
}

/* ---------------------------------------------------------------------
   Histórico de execuções
   --------------------------------------------------------------------- */

// Registra uma execução. `ok` diz se rodou sem erro; `linhas` é a
// contagem devolvida (0 é válido); `erro` a mensagem, quando falhou.
export function registrarExecucao(toolId, { sql, ok, linhas = 0, erro = null, duracaoMs = 0 }) {
  const estado = ler(toolId);
  const entrada = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sql: truncarSql(sql),
    ok: Boolean(ok),
    linhas: Number(linhas) || 0,
    erro: erro ? String(erro).slice(0, 500) : null,
    duracaoMs: Number(duracaoMs) || 0,
    em: new Date().toISOString()
  };

  estado.historico.unshift(entrada);
  if (estado.historico.length > LIMITE_HISTORICO) {
    estado.historico = estado.historico.slice(0, LIMITE_HISTORICO);
  }

  estado.stats.execucoes += 1;
  if (entrada.ok) estado.stats.sucessos += 1;
  else estado.stats.erros += 1;
  const cmd = comandoDoSql(sql);
  estado.stats.comandos[cmd] = (estado.stats.comandos[cmd] || 0) + 1;

  gravar(toolId, estado);
  return entrada;
}

export function getHistorico(toolId) {
  return ler(toolId).historico;
}

export function limparHistorico(toolId) {
  const estado = ler(toolId);
  estado.historico = [];
  return gravar(toolId, estado);
}

/* ---------------------------------------------------------------------
   Consultas salvas ("minhas consultas")
   --------------------------------------------------------------------- */

// Salva/atualiza uma consulta nomeada. Salvar de novo com o mesmo nome
// sobrescreve, em vez de criar duplicata.
export function salvarConsulta(toolId, { nome, sql }) {
  const nomeLimpo = String(nome ?? "").trim();
  if (!nomeLimpo) return { erro: "Dê um nome para a consulta." };

  const estado = ler(toolId);
  const existente = estado.salvas.find((c) => c.nome.toLowerCase() === nomeLimpo.toLowerCase());

  if (existente) {
    existente.sql = truncarSql(sql);
    existente.atualizadoEm = new Date().toISOString();
    gravar(toolId, estado);
    return { consulta: existente, atualizada: true };
  }

  if (estado.salvas.length >= LIMITE_SALVAS) {
    return { erro: `Limite de ${LIMITE_SALVAS} consultas salvas atingido — remova alguma antes.` };
  }

  const consulta = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nome: nomeLimpo,
    sql: truncarSql(sql),
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
  estado.salvas.push(consulta);
  gravar(toolId, estado);
  return { consulta, atualizada: false };
}

export function getConsultasSalvas(toolId) {
  return ler(toolId).salvas;
}

export function removerConsulta(toolId, id) {
  const estado = ler(toolId);
  estado.salvas = estado.salvas.filter((c) => c.id !== id);
  return gravar(toolId, estado);
}

/* ---------------------------------------------------------------------
   Estatísticas de uso
   --------------------------------------------------------------------- */

// Devolve os contadores acumulados + os comandos mais usados já
// ordenados, prontos pra exibir.
export function getEstatisticas(toolId) {
  const { stats, historico, salvas } = ler(toolId);
  const comandos = Object.entries(stats.comandos)
    .map(([comando, total]) => ({ comando, total }))
    .sort((a, b) => b.total - a.total);

  const comDuracao = historico.filter((h) => h.duracaoMs > 0);
  const duracaoMedia = comDuracao.length
    ? Math.round(comDuracao.reduce((s, h) => s + h.duracaoMs, 0) / comDuracao.length)
    : 0;

  return {
    execucoes: stats.execucoes,
    sucessos: stats.sucessos,
    erros: stats.erros,
    taxaSucesso: stats.execucoes ? Math.round((stats.sucessos / stats.execucoes) * 100) : 0,
    comandos,
    duracaoMediaMs: duracaoMedia,
    totalSalvas: salvas.length
  };
}

// Zera tudo (histórico, salvas e estatísticas) da ferramenta.
export function resetStore(toolId) {
  try {
    localStorage.removeItem(chave(toolId));
  } catch {
    // sem localStorage não há o que limpar
  }
}
