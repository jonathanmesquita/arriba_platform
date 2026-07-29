// Motor de gamificacao generico para trilhas de treinamento (Arriba Platform).
// Track-agnostico: qualquer trilha (Track 7, futuras trilhas...) usa as
// mesmas funcoes passando o proprio trackId. Progresso fica 100% no
// localStorage do navegador - nao ha backend/conta de usuario.

const STORAGE_PREFIX = "arribaTrilha:";

function readRaw(trackId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + trackId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function defaultProgress() {
  return { pontos: 0, licoesConcluidas: {}, quizScores: {}, badges: [] };
}

export function getProgress(trackId) {
  const saved = readRaw(trackId);
  if (!saved) return defaultProgress();
  return { ...defaultProgress(), ...saved };
}

function saveProgress(trackId, progress) {
  try {
    localStorage.setItem(STORAGE_PREFIX + trackId, JSON.stringify(progress));
  } catch {
    // localStorage indisponivel (modo privado etc.) - progresso so dura a sessao.
  }
  return progress;
}

// Marca a licao como concluida e soma os pontos da licao (uma vez só - clicar
// "concluir" de novo numa licao ja concluida nao soma pontos em dobro).
export function marcarLicaoConcluida(trackId, licaoId, pontosLicao) {
  const progress = getProgress(trackId);
  if (progress.licoesConcluidas[licaoId]) return progress;
  progress.licoesConcluidas[licaoId] = true;
  progress.pontos += pontosLicao || 0;
  return saveProgress(trackId, progress);
}

export function licaoConcluida(trackId, licaoId) {
  return Boolean(getProgress(trackId).licoesConcluidas[licaoId]);
}

// Registra o resultado do quiz de uma licao (sobrescreve tentativa anterior).
// Bonus de pontos só é somado na primeira vez que o quiz bate 100%.
export function registrarQuiz(trackId, licaoId, acertos, total, pontosBonus100 = 0) {
  const progress = getProgress(trackId);
  const jaTinha100 = progress.quizScores[licaoId]?.acertos === progress.quizScores[licaoId]?.total
    && progress.quizScores[licaoId]?.total > 0;
  progress.quizScores[licaoId] = { acertos, total };
  if (total > 0 && acertos === total && !jaTinha100) {
    progress.pontos += pontosBonus100;
  }
  return saveProgress(trackId, progress);
}

export function desbloquearBadge(trackId, badgeId) {
  const progress = getProgress(trackId);
  if (progress.badges.includes(badgeId)) return progress;
  progress.badges.push(badgeId);
  return saveProgress(trackId, progress);
}

export function badgeDesbloqueado(trackId, badgeId) {
  return getProgress(trackId).badges.includes(badgeId);
}

// Verifica a lista de badges da trilha (cada badge tem badge.criterio.licaoId)
// e desbloqueia os que ja foram atingidos pelo progresso atual. Devolve a
// lista de badges recem-desbloqueados nesta chamada (para UI de celebracao).
export function verificarBadges(trackId, badges = []) {
  const progress = getProgress(trackId);
  const recemDesbloqueados = [];
  badges.forEach((badge) => {
    if (progress.badges.includes(badge.id)) return;
    const criterio = badge.criterio || {};
    let atingido = false;
    if (criterio.tipo === "licao") {
      atingido = Boolean(progress.licoesConcluidas[criterio.licaoId]);
    } else if (criterio.tipo === "todasLicoes") {
      atingido = (criterio.licoes || []).every((id) => progress.licoesConcluidas[id]);
    }
    if (atingido) {
      progress.badges.push(badge.id);
      recemDesbloqueados.push(badge);
    }
  });
  if (recemDesbloqueados.length) saveProgress(trackId, progress);
  return recemDesbloqueados;
}

export function resetProgress(trackId) {
  localStorage.removeItem(STORAGE_PREFIX + trackId);
}

export function calcularPercentualConcluido(trackId, totalLicoes) {
  if (!totalLicoes) return 0;
  const progress = getProgress(trackId);
  const concluidas = Object.keys(progress.licoesConcluidas).length;
  return Math.round((concluidas / totalLicoes) * 100);
}
