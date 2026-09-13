// Reducer puro para el estado de una partida en curso.
// Todas las acciones registran una entrada en history para poder deshacer.
import { shuffleArray } from '../utils/shuffle'

function cloneState(state) {
  return JSON.parse(JSON.stringify(state))
}

function findTeamIndex(state, teamId) {
  return state.teams.findIndex((t) => t.id === teamId)
}

function nextTurnTeamId(state) {
  const order = state.turnOrder
  const idx = order.indexOf(state.activeTeamId)
  const nextIdx = (idx + 1) % order.length
  return order[nextIdx]
}

function pushHistory(state, entry) {
  state.history = [...state.history, { ...entry, ts: Date.now() }].slice(-100)
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'OPEN_QUESTION': {
      const { questionId } = action
      const qState = state.questionsState[questionId]
      if (!qState || qState.status !== 'disponible') return state
      const next = cloneState(state)
      next.currentQuestionId = questionId
      next.questionsState[questionId] = { ...qState, status: 'abierta' }
      next.currentAnswering = {
        answeringTeamId: state.activeTeamId,
        attemptedTeamIds: [state.activeTeamId],
        reboundCount: 0,
        pointsAwardedThisQuestion: 0,
        anyPointsAwarded: false,
        doubleTeamId: null,
        fiftyFiftyActive: false,
      }
      return next
    }

    case 'REOPEN_QUESTION': {
      const { questionId } = action
      const next = cloneState(state)
      next.currentQuestionId = questionId
      next.questionsState[questionId] = { status: 'abierta', respondidaPor: null, puntosOtorgados: 0 }
      next.currentAnswering = {
        answeringTeamId: state.activeTeamId,
        attemptedTeamIds: [state.activeTeamId],
        reboundCount: 0,
        pointsAwardedThisQuestion: 0,
        anyPointsAwarded: false,
        doubleTeamId: null,
        fiftyFiftyActive: false,
      }
      return next
    }

    case 'BACK_TO_PANEL': {
      const next = cloneState(state)
      next.currentQuestionId = null
      return next
    }

    case 'SET_ANSWERING_TEAM': {
      const { teamId } = action
      const next = cloneState(state)
      if (!next.currentAnswering) return state
      next.currentAnswering.answeringTeamId = teamId
      if (!next.currentAnswering.attemptedTeamIds.includes(teamId)) {
        next.currentAnswering.attemptedTeamIds.push(teamId)
      }
      if (next.currentAnswering.doubleTeamId && next.currentAnswering.doubleTeamId !== teamId) {
        next.currentAnswering.doubleTeamId = null
      }
      return next
    }

    case 'SET_ACTIVE_TEAM': {
      const { teamId } = action
      const next = cloneState(state)
      next.activeTeamId = teamId
      return next
    }

    case 'SET_TURN_MODE': {
      const next = cloneState(state)
      next.turnMode = action.mode
      return next
    }

    case 'AWARD_POINTS': {
      // action: { questionId, teamId, points, kind: 'correcta'|'parcial' }
      const { questionId, teamId, points, kind } = action
      const next = cloneState(state)
      const teamIdx = findTeamIndex(next, teamId)
      if (teamIdx === -1) return state
      const isDouble = !!(next.currentAnswering && next.currentAnswering.doubleTeamId === teamId)
      const finalPoints = isDouble ? points * 2 : points
      const prevScore = next.teams[teamIdx].score
      next.teams[teamIdx].score = prevScore + finalPoints
      if (next.currentAnswering) {
        next.currentAnswering.pointsAwardedThisQuestion += finalPoints
        next.currentAnswering.anyPointsAwarded = true
        if (isDouble) next.currentAnswering.doubleTeamId = null
      }
      pushHistory(next, {
        type: 'AWARD_POINTS',
        questionId,
        teamId,
        points: finalPoints,
        kind,
        prevScore,
      })
      return next
    }

    case 'ADJUST_SCORE': {
      // Suma/resta manual directa a un equipo (fuera de una pregunta concreta)
      const { teamId, delta } = action
      const next = cloneState(state)
      const teamIdx = findTeamIndex(next, teamId)
      if (teamIdx === -1) return state
      const prevScore = next.teams[teamIdx].score
      next.teams[teamIdx].score = prevScore + delta
      pushHistory(next, { type: 'ADJUST_SCORE', teamId, delta, prevScore })
      return next
    }

    case 'MARK_INCORRECT': {
      // doublePenalty: puntos a restar si el equipo tenía activo "doble o nada"
      const { questionId, teamId, doublePenalty } = action
      const next = cloneState(state)
      let prevScore
      if (doublePenalty) {
        const teamIdx = findTeamIndex(next, teamId)
        if (teamIdx !== -1) {
          prevScore = next.teams[teamIdx].score
          next.teams[teamIdx].score = prevScore - doublePenalty
        }
      }
      if (next.currentAnswering && next.currentAnswering.doubleTeamId === teamId) {
        next.currentAnswering.doubleTeamId = null
      }
      pushHistory(next, { type: 'MARK_INCORRECT', questionId, teamId, doublePenalty, prevScore })
      return next
    }

    case 'REBOUND': {
      const { toTeamId } = action
      const next = cloneState(state)
      if (!next.currentAnswering) return state
      next.currentAnswering.answeringTeamId = toTeamId
      next.currentAnswering.reboundCount += 1
      next.currentAnswering.doubleTeamId = null
      if (!next.currentAnswering.attemptedTeamIds.includes(toTeamId)) {
        next.currentAnswering.attemptedTeamIds.push(toTeamId)
      }
      pushHistory(next, { type: 'REBOUND', toTeamId, questionId: next.currentQuestionId })
      return next
    }

    case 'ACTIVATE_DOUBLE': {
      // "Doble o nada": dobla los puntos si acierta, los pierde si falla.
      const { teamId } = action
      const next = cloneState(state)
      if (!next.currentAnswering || next.currentAnswering.answeringTeamId !== teamId) return state
      const teamIdx = findTeamIndex(next, teamId)
      if (teamIdx === -1 || (next.teams[teamIdx].comodines?.doble || 0) <= 0) return state
      next.teams[teamIdx].comodines.doble -= 1
      next.currentAnswering.doubleTeamId = teamId
      pushHistory(next, { type: 'ACTIVATE_DOUBLE', teamId, questionId: next.currentQuestionId })
      return next
    }

    case 'USE_FIFTY_FIFTY': {
      const { teamId } = action
      const next = cloneState(state)
      if (!next.currentAnswering) return state
      const teamIdx = findTeamIndex(next, teamId)
      if (teamIdx === -1 || (next.teams[teamIdx].comodines?.cincuenta || 0) <= 0) return state
      next.teams[teamIdx].comodines.cincuenta -= 1
      next.currentAnswering.fiftyFiftyActive = true
      pushHistory(next, { type: 'USE_FIFTY_FIFTY', teamId, questionId: next.currentQuestionId })
      return next
    }

    case 'SWAP_QUESTION': {
      // "Cambiar pregunta": devuelve la pregunta actual al panel y abre otra al azar.
      const { teamId, oldQuestionId, newQuestionId } = action
      const next = cloneState(state)
      const teamIdx = findTeamIndex(next, teamId)
      if (teamIdx === -1 || (next.teams[teamIdx].comodines?.cambiar || 0) <= 0) return state
      if (!next.questionsState[newQuestionId] || next.questionsState[newQuestionId].status !== 'disponible') return state
      next.teams[teamIdx].comodines.cambiar -= 1
      next.questionsState[oldQuestionId] = { status: 'disponible', respondidaPor: null, puntosOtorgados: 0 }
      next.questionsState[newQuestionId] = { status: 'abierta', respondidaPor: null, puntosOtorgados: 0 }
      next.currentQuestionId = newQuestionId
      next.currentAnswering = {
        answeringTeamId: teamId,
        attemptedTeamIds: [teamId],
        reboundCount: 0,
        pointsAwardedThisQuestion: 0,
        anyPointsAwarded: false,
        doubleTeamId: null,
        fiftyFiftyActive: false,
      }
      pushHistory(next, { type: 'SWAP_QUESTION', teamId, oldQuestionId, newQuestionId })
      return next
    }

    case 'CLOSE_QUESTION': {
      // status: 'correcta' | 'fallida' | 'rebote'
      const { questionId, status, respondidaPor } = action
      const next = cloneState(state)
      const prevQState = next.questionsState[questionId]
      next.questionsState[questionId] = {
        status,
        respondidaPor: respondidaPor || null,
        puntosOtorgados: next.currentAnswering?.pointsAwardedThisQuestion || 0,
      }
      pushHistory(next, {
        type: 'CLOSE_QUESTION',
        questionId,
        prevQState,
      })
      next.currentQuestionId = null
      next.currentAnswering = null
      if (next.turnMode === 'auto') {
        next.activeTeamId = nextTurnTeamId(next)
      }
      return next
    }

    case 'REOPEN_QUESTION_FROM_PANEL': {
      // Permite al docente reabrir manualmente una pregunta ya usada (o abrir un desempate)
      const { questionId } = action
      const next = cloneState(state)
      next.questionsState[questionId] = { status: 'disponible', respondidaPor: null, puntosOtorgados: 0 }
      next.finished = false
      return next
    }

    case 'SET_TEAM_NAME': {
      const { teamId, name } = action
      const next = cloneState(state)
      const teamIdx = findTeamIndex(next, teamId)
      if (teamIdx === -1) return state
      next.teams[teamIdx].name = name
      return next
    }

    case 'UNDO': {
      if (state.history.length === 0) return state
      const next = cloneState(state)
      const last = next.history[next.history.length - 1]
      next.history = next.history.slice(0, -1)
      if (last.type === 'AWARD_POINTS') {
        const teamIdx = findTeamIndex(next, last.teamId)
        if (teamIdx !== -1) next.teams[teamIdx].score = last.prevScore
      } else if (last.type === 'ADJUST_SCORE') {
        const teamIdx = findTeamIndex(next, last.teamId)
        if (teamIdx !== -1) next.teams[teamIdx].score = last.prevScore
      } else if (last.type === 'CLOSE_QUESTION') {
        next.questionsState[last.questionId] = last.prevQState
      } else if (last.type === 'MARK_INCORRECT' && last.doublePenalty && last.prevScore !== undefined) {
        const teamIdx = findTeamIndex(next, last.teamId)
        if (teamIdx !== -1) next.teams[teamIdx].score = last.prevScore
      } else if (last.type === 'ACTIVATE_DOUBLE') {
        const teamIdx = findTeamIndex(next, last.teamId)
        if (teamIdx !== -1) next.teams[teamIdx].comodines.doble += 1
        if (next.currentAnswering) next.currentAnswering.doubleTeamId = null
      } else if (last.type === 'USE_FIFTY_FIFTY') {
        const teamIdx = findTeamIndex(next, last.teamId)
        if (teamIdx !== -1) next.teams[teamIdx].comodines.cincuenta += 1
        if (next.currentAnswering) next.currentAnswering.fiftyFiftyActive = false
      } else if (last.type === 'SWAP_QUESTION') {
        const teamIdx = findTeamIndex(next, last.teamId)
        if (teamIdx !== -1) next.teams[teamIdx].comodines.cambiar += 1
        next.questionsState[last.oldQuestionId] = { status: 'abierta', respondidaPor: null, puntosOtorgados: 0 }
        next.questionsState[last.newQuestionId] = { status: 'disponible', respondidaPor: null, puntosOtorgados: 0 }
        next.currentQuestionId = last.oldQuestionId
        next.currentAnswering = {
          answeringTeamId: last.teamId,
          attemptedTeamIds: [last.teamId],
          reboundCount: 0,
          pointsAwardedThisQuestion: 0,
          anyPointsAwarded: false,
          doubleTeamId: null,
          fiftyFiftyActive: false,
        }
      }
      return next
    }

    case 'FINISH_GAME': {
      const next = cloneState(state)
      next.finished = true
      return next
    }

    case 'RESTART_KEEP_TEAMS': {
      const next = cloneState(state)
      next.teams = next.teams.map((t) => ({ ...t, score: 0, comodines: { ...(next.wildcardCounts || t.comodines) } }))
      next.questionsState = Object.fromEntries(
        Object.keys(next.questionsState).map((qid) => [qid, { status: 'disponible', respondidaPor: null, puntosOtorgados: 0 }])
      )
      next.currentQuestionId = null
      next.currentAnswering = null
      next.history = []
      next.finished = false
      next.activeTeamId = next.turnOrder[0]
      next.startedAt = Date.now()
      if (next.orderMode === 'aleatorio') {
        next.tileOrder = shuffleArray(next.tileOrder)
      }
      return next
    }

    default:
      return state
  }
}

export function allQuestionsClosed(gameState) {
  const states = Object.values(gameState.questionsState)
  if (states.length === 0) return false
  return states.every((s) => s.status !== 'disponible' && s.status !== 'abierta')
}

export function computeRanking(teams) {
  const sorted = [...teams].sort((a, b) => b.score - a.score)
  const maxScore = sorted[0]?.score ?? 0
  const winners = sorted.filter((t) => t.score === maxScore)
  return { sorted, isTie: winners.length > 1, winners }
}
