import { useEffect, useReducer, useState } from 'react'
import { getQuiz, getGame, saveGame } from '../utils/storage'
import { gameReducer, allQuestionsClosed } from '../game/gameReducer'
import ScoreBoard from '../components/ScoreBoard'
import QuestionPlayScreen from './QuestionPlayScreen'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { sounds } from '../utils/sound'

const STATUS_ICON = {
  disponible: '',
  abierta: '🔓',
  correcta: '✅',
  fallida: '✖️',
  rebote: '🔁',
}

export default function GamePanelScreen({ quizId, onExit, onFinish }) {
  const [quiz] = useState(() => getQuiz(quizId))
  const [gameState, dispatch] = useReducer(gameReducer, null, () => getGame(quizId))
  const [confirmExit, setConfirmExit] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [reopenMode, setReopenMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(null)

  useEffect(() => {
    if (gameState) saveGame(quizId, gameState)
  }, [gameState, quizId])

  useEffect(() => {
    if (gameState && !gameState.finished && allQuestionsClosed(gameState)) {
      dispatch({ type: 'FINISH_GAME' })
      sounds.final()
    }
  }, [gameState])

  useEffect(() => {
    if (gameState?.finished) {
      onFinish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.finished])

  if (!quiz || !gameState) {
    return (
      <div className="container">
        <p>No se encontró la partida.</p>
        <button className="btn" onClick={onExit}>Volver al inicio</button>
      </div>
    )
  }

  const currentQuestion = gameState.currentQuestionId
    ? quiz.questions.find((q) => q.id === gameState.currentQuestionId)
    : null

  function handleTileClick(question) {
    const st = gameState.questionsState[question.id]
    if (reopenMode) {
      if (st.status !== 'disponible' && st.status !== 'abierta') {
        setConfirmReopen(question)
      }
      return
    }
    if (st.status === 'disponible') {
      sounds.open()
      dispatch({ type: 'OPEN_QUESTION', questionId: question.id })
    } else if (st.status === 'abierta') {
      dispatch({ type: 'REOPEN_QUESTION', questionId: question.id })
    }
  }

  if (currentQuestion) {
    return (
      <QuestionPlayScreen
        quiz={quiz}
        question={currentQuestion}
        gameState={gameState}
        dispatch={dispatch}
        onBack={() => dispatch({ type: 'BACK_TO_PANEL' })}
      />
    )
  }

  return (
    <div className="container-wide">
      <div className="topbar" style={{ background: 'transparent', border: 'none', padding: '10px 0' }}>
        <div className="topbar-title">🏆 {quiz.name}</div>
        <div className="topbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'SET_TURN_MODE', mode: gameState.turnMode === 'auto' ? 'manual' : 'auto' })}>
            {gameState.turnMode === 'auto' ? '🔄 Turno automático' : '🖐️ Turno manual'}
          </button>
          <button className="btn btn-ghost btn-sm" disabled={gameState.history.length === 0} onClick={() => dispatch({ type: 'UNDO' })}>
            ↩️ Deshacer
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(true)}>
            📜 Historial
          </button>
          <button className={`btn btn-sm ${reopenMode ? 'btn-warn' : 'btn-ghost'}`} onClick={() => setReopenMode((r) => !r)}>
            🔓 {reopenMode ? 'Saliendo de reabrir…' : 'Reabrir pregunta'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmFinish(true)}>
            🏁 Finalizar concurso
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmExit(true)}>
            🚪 Salir
          </button>
        </div>
      </div>

      <ScoreBoard gameState={gameState} dispatch={dispatch} />

      <h2 className="panel-title">Panel de preguntas</h2>
      {reopenMode && <p className="text-center muted">Modo reabrir activo: haz clic en una casilla cerrada para reabrirla.</p>}
      <div className="questions-grid">
        {quiz.questions.map((q, i) => {
          const st = gameState.questionsState[q.id]
          return (
            <button key={q.id} className={`question-tile ${st.status}`} onClick={() => handleTileClick(q)} disabled={st.status !== 'disponible' && st.status !== 'abierta' && !reopenMode}>
              <span>{i + 1}</span>
              <span className="tile-icon">{STATUS_ICON[st.status]}</span>
            </button>
          )
        })}
      </div>

      {confirmExit && (
        <ConfirmDialog
          title="Salir de la partida"
          message="La partida sigue en curso. El progreso se ha guardado automáticamente y podrás continuar más tarde. ¿Quieres salir al inicio?"
          confirmLabel="Salir"
          onConfirm={onExit}
          onCancel={() => setConfirmExit(false)}
        />
      )}

      {confirmFinish && (
        <ConfirmDialog
          title="Finalizar concurso"
          message="¿Seguro que quieres terminar la partida ahora y mostrar la clasificación final? Las preguntas sin responder quedarán sin puntuar."
          danger
          confirmLabel="Finalizar ahora"
          onConfirm={() => {
            setConfirmFinish(false)
            dispatch({ type: 'FINISH_GAME' })
          }}
          onCancel={() => setConfirmFinish(false)}
        />
      )}

      {confirmReopen && (
        <ConfirmDialog
          title="Reabrir pregunta"
          message={`¿Reabrir la pregunta ${confirmReopen.orden}? Se perderá el resultado que tenía guardado.`}
          confirmLabel="Reabrir"
          onConfirm={() => {
            dispatch({ type: 'REOPEN_QUESTION_FROM_PANEL', questionId: confirmReopen.id })
            setConfirmReopen(null)
            setReopenMode(false)
          }}
          onCancel={() => setConfirmReopen(null)}
        />
      )}

      {showHistory && (
        <Modal title="Historial de puntuaciones" onClose={() => setShowHistory(false)}>
          {gameState.history.length === 0 && <p className="muted">Todavía no hay movimientos.</p>}
          <div className="scroll-area">
            <table className="table-simple">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {gameState.history.slice().reverse().map((h, i) => (
                  <tr key={i}>
                    <td>{new Date(h.ts).toLocaleTimeString()}</td>
                    <td>{describeHistory(h)}</td>
                    <td>{h.points ?? h.delta ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}

function describeHistory(h) {
  switch (h.type) {
    case 'AWARD_POINTS':
      return h.kind === 'parcial' ? 'Puntuación parcial' : 'Respuesta correcta'
    case 'ADJUST_SCORE':
      return 'Ajuste manual'
    case 'CLOSE_QUESTION':
      return 'Pregunta cerrada'
    case 'MARK_INCORRECT':
      return 'Respuesta incorrecta'
    case 'REBOUND':
      return 'Rebote'
    default:
      return h.type
  }
}
