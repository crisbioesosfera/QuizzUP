const KEYS = {
  quizzes: 'concurso_quizzes_v1',
  games: 'concurso_games_v1',
  settings: 'concurso_settings_v1',
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (e) {
    console.warn('No se pudo leer localStorage', key, e)
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.warn('No se pudo guardar en localStorage', key, e)
    return false
  }
}

// ---- Quizzes ----
export function getAllQuizzes() {
  return readJson(KEYS.quizzes, {})
}

export function getQuiz(quizId) {
  const all = getAllQuizzes()
  return all[quizId] || null
}

export function saveQuiz(quiz) {
  const all = getAllQuizzes()
  all[quiz.id] = { ...quiz, updatedAt: Date.now() }
  writeJson(KEYS.quizzes, all)
  return all[quiz.id]
}

export function deleteQuiz(quizId) {
  const all = getAllQuizzes()
  delete all[quizId]
  writeJson(KEYS.quizzes, all)
  const games = getAllGames()
  delete games[quizId]
  writeJson(KEYS.games, games)
}

export function listQuizzes() {
  return Object.values(getAllQuizzes()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

// ---- Game states (una partida en curso por concurso) ----
export function getAllGames() {
  return readJson(KEYS.games, {})
}

export function getGame(quizId) {
  const all = getAllGames()
  return all[quizId] || null
}

export function saveGame(quizId, gameState) {
  const all = getAllGames()
  all[quizId] = { ...gameState, savedAt: Date.now() }
  writeJson(KEYS.games, all)
}

export function deleteGame(quizId) {
  const all = getAllGames()
  delete all[quizId]
  writeJson(KEYS.games, all)
}

// ---- Settings ----
export function getSettings() {
  return readJson(KEYS.settings, { soundMuted: false })
}

export function saveSettings(settings) {
  writeJson(KEYS.settings, settings)
}
