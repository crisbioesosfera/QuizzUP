import { useEffect, useMemo, useReducer, useState } from 'react'
import { getQuiz, getGame, saveGame, deleteGame } from '../utils/storage'
import { gameReducer, computeRanking } from '../game/gameReducer'
import { downloadTextFile } from '../utils/csv'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'

const CONFETTI_COLORS = ['#ffcc33', '#ff5470', '#2dd4bf', '#60a5fa', '#a78bfa', '#4ade80']

export default function EndScreen({ quizId, onExit, onPlayAgain }) {
  const [quiz] = useState(() => getQuiz(quizId))
  const [gameState, dispatch] = useReducer(gameReducer, null, () => getGame(quizId))
  const [showReview, setShowReview] = useState(false)
  const [showTiebreaker, setShowTiebreaker] = useState(false)
  const [confirmRestartFull, setConfirmRestartFull] = useState(false)

  useEffect(() => {
    if (gameState) saveGame(quizId, gameState)
  }, [gameState, quizId])

  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2.5 + Math.random() * 2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    []
  )

  if (!quiz || !gameState) {
    return (
      <div className="container">
        <p>No se encontró la partida.</p>
        <button className="btn" onClick={onExit}>Volver al inicio</button>
      </div>
    )
  }

  const { sorted, isTie, winners } = computeRanking(gameState.teams)
  const closedQuestions = quiz.questions.filter((q) => {
    const st = gameState.questionsState[q.id]
    return st.status !== 'disponible' && st.status !== 'abierta'
  })

  function handleExportResults() {
    const lines = ['Puesto,Equipo,Puntuación']
    sorted.forEach((t, i) => lines.push(`${i + 1},${t.name},${t.score}`))
    downloadTextFile(`${quiz.name}-resultados.csv`, lines.join('\n'))
  }

  function handlePlayAgainKeepTeams() {
    // Guarda de forma síncrona antes de navegar: si dependiéramos del efecto de
    // guardado, el cambio de vista desmontaría esta pantalla antes de que se ejecute.
    const next = gameReducer(gameState, { type: 'RESTART_KEEP_TEAMS' })
    saveGame(quizId, next)
    onPlayAgain()
  }

  function handleFullRestart() {
    deleteGame(quizId)
    onExit()
  }

  function openTiebreak(question) {
    const next = gameReducer(gameState, { type: 'REOPEN_QUESTION_FROM_PANEL', questionId: question.id })
    saveGame(quizId, next)
    setShowTiebreaker(false)
    onPlayAgain()
  }

  return (
    <div className="end-screen">
      {confetti.map((c) => (
        <div
          key={c.id}
          className="confetti-piece"
          style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}
        />
      ))}

      <h1 className="winner-banner">🏆 ¡Concurso terminado!</h1>

      {isTie ? (
        <p className="badge badge-warn" style={{ fontSize: '1rem' }}>
          Empate entre {winners.map((w) => w.name).join(' y ')}
        </p>
      ) : (
        <p style={{ fontSize: '1.3rem' }}>
          Equipo ganador: <strong style={{ color: winners[0]?.color }}>{winners[0]?.icon} {winners[0]?.name}</strong>
        </p>
      )}

      <div className="ranking-list">
        {sorted.map((t, i) => (
          <div key={t.id} className={`ranking-row ${i === 0 ? 'first' : ''}`} style={{ borderLeft: `6px solid ${t.color}` }}>
            <span className="ranking-pos">{i + 1}º</span>
            <span style={{ fontSize: '1.4rem' }}>{t.icon}</span>
            <span style={{ flex: 1 }}>{t.name}</span>
            <span>{t.score} pts</span>
          </div>
        ))}
      </div>

      <div className="flex-gap mt-3" style={{ justifyContent: 'center' }}>
        {isTie && (
          <button className="btn btn-warn" onClick={() => setShowTiebreaker(true)}>
            ⚖️ Pregunta de desempate
          </button>
        )}
        <button className="btn btn-info" onClick={() => setShowReview(true)}>
          📋 Revisar preguntas
        </button>
        <button className="btn btn-ghost" onClick={handleExportResults}>
          ⬇️ Exportar resultados
        </button>
        <button className="btn btn-success" onClick={handlePlayAgainKeepTeams}>
          🔁 Jugar de nuevo (mismos equipos)
        </button>
        <button className="btn btn-danger" onClick={() => setConfirmRestartFull(true)}>
          🗑️ Reiniciar completamente
        </button>
        <button className="btn btn-ghost" onClick={onExit}>
          🏠 Volver al inicio
        </button>
      </div>

      {showReview && (
        <Modal title="Revisión de preguntas" onClose={() => setShowReview(false)} wide>
          <div className="scroll-area">
            <table className="table-simple">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Enunciado</th>
                  <th>Estado</th>
                  <th>Respondida por</th>
                  <th>Puntos</th>
                </tr>
              </thead>
              <tbody>
                {quiz.questions.map((q, i) => {
                  const st = gameState.questionsState[q.id]
                  const team = gameState.teams.find((t) => t.id === st.respondidaPor)
                  return (
                    <tr key={q.id}>
                      <td>{i + 1}</td>
                      <td>{q.enunciado}</td>
                      <td>{st.status}</td>
                      <td>{team ? `${team.icon} ${team.name}` : '—'}</td>
                      <td>{st.puntosOtorgados || 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {showTiebreaker && (
        <Modal title="Elige una pregunta para el desempate" onClose={() => setShowTiebreaker(false)}>
          {closedQuestions.length === 0 && <p className="muted">No quedan preguntas disponibles para el desempate.</p>}
          <div className="scroll-area">
            {closedQuestions.map((q) => (
              <button key={q.id} className="btn btn-block mb-1" onClick={() => openTiebreak(q)}>
                #{q.orden} — {q.enunciado}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {confirmRestartFull && (
        <ConfirmDialog
          title="Reiniciar completamente"
          message="Se eliminará toda la partida (puntuaciones y progreso). El concurso y sus preguntas se conservarán. ¿Continuar?"
          danger
          confirmLabel="Reiniciar"
          onConfirm={handleFullRestart}
          onCancel={() => setConfirmRestartFull(false)}
        />
      )}
    </div>
  )
}
