import { useState } from 'react'
import QuestionPlayer from '../components/players/QuestionPlayer'
import Timer from '../components/Timer'
import PartialPointsModal from '../components/PartialPointsModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { sounds } from '../utils/sound'

function computeEffectivePoints(basePoints, reboundCount, settings) {
  if (reboundCount === 0) return Math.round(basePoints)
  if (settings.reboundPolicy === 'fixed') return Math.max(0, Math.round(basePoints - settings.reboundFixedAmount * reboundCount))
  if (settings.reboundPolicy === 'percent') return Math.max(0, Math.round(basePoints * (1 - (settings.reboundPercent / 100) * reboundCount)))
  return Math.round(basePoints)
}

export default function QuestionPlayScreen({ quiz, question, gameState, dispatch, onBack }) {
  const [revealed, setRevealed] = useState(false)
  const [showPartial, setShowPartial] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [showReboundPicker, setShowReboundPicker] = useState(false)

  const answering = gameState.currentAnswering
  const answeringTeam = gameState.teams.find((t) => t.id === answering.answeringTeamId)
  const attempted = new Set(answering.attemptedTeamIds)
  const availableForRebound = gameState.teams.filter((t) => !attempted.has(t.id))
  const reboundLimitReached = question.maximoRebotes > 0 && answering.reboundCount >= question.maximoRebotes
  const reboundDisabled = !question.permitirRebote || availableForRebound.length === 0 || reboundLimitReached

  function award(points, kind) {
    const effective = computeEffectivePoints(points, answering.reboundCount, quiz.settings)
    dispatch({ type: 'AWARD_POINTS', questionId: question.id, teamId: answeringTeam.id, points: effective, kind })
    sounds.correct()
  }

  function handleCorrect() {
    award(question.puntosMaximos, 'correcta')
    dispatch({
      type: 'CLOSE_QUESTION',
      questionId: question.id,
      status: answering.reboundCount > 0 ? 'rebote' : 'correcta',
      respondidaPor: answeringTeam.id,
    })
    onBack()
  }

  function handlePartialConfirm(points) {
    setShowPartial(false)
    award(points, 'parcial')
  }

  function handleIncorrect() {
    dispatch({ type: 'MARK_INCORRECT', questionId: question.id, teamId: answeringTeam.id })
    sounds.incorrect()
  }

  function handleReboundTo(teamId) {
    setShowReboundPicker(false)
    dispatch({ type: 'REBOUND', toTeamId: teamId })
    sounds.rebound()
  }

  function doClose() {
    const points = answering.pointsAwardedThisQuestion
    dispatch({
      type: 'CLOSE_QUESTION',
      questionId: question.id,
      status: points > 0 ? (answering.reboundCount > 0 ? 'rebote' : 'correcta') : 'fallida',
      respondidaPor: points > 0 ? answeringTeam.id : null,
    })
    onBack()
  }

  function handleClose() {
    if (answering.pointsAwardedThisQuestion === 0) {
      setConfirmClose(true)
    } else {
      doClose()
    }
  }

  return (
    <div className="question-screen">
      <div className="question-top">
        <div className="question-meta">
          <span className="badge">Pregunta {question.orden}</span>
          {question.categoria && <span className="badge">{question.categoria}</span>}
          {question.dificultad && <span className="badge">{question.dificultad}</span>}
          <span className="badge badge-success">{question.puntosMaximos} pts</span>
          {answering.reboundCount > 0 && <span className="badge badge-warn">Rebote #{answering.reboundCount}</span>}
        </div>
        <Timer totalSeconds={question.tiempoSegundos} key={question.id} />
      </div>

      <div
        className="answering-banner"
        style={{ background: answeringTeam?.color, color: '#111', alignSelf: 'center' }}
      >
        {answeringTeam?.icon} Responde: {answeringTeam?.name}
      </div>

      <div className="flex-gap mt-1" style={{ justifyContent: 'center' }}>
        <span className="muted" style={{ alignSelf: 'center' }}>Cambiar equipo:</span>
        {gameState.teams.map((t) => (
          <button
            key={t.id}
            className="btn btn-sm"
            style={{ background: t.id === answeringTeam?.id ? t.color : 'var(--bg-card-2)', color: t.id === answeringTeam?.id ? '#111' : 'var(--text-main)' }}
            onClick={() => dispatch({ type: 'SET_ANSWERING_TEAM', teamId: t.id })}
          >
            {t.icon} {t.name}
          </button>
        ))}
      </div>

      <div className="question-body">
        <div className="question-statement">{question.enunciado}</div>
        {question.imagen && question.tipo !== 'imagen' && <img src={question.imagen} alt="" className="question-image" />}
        <QuestionPlayer question={question} revealed={revealed} />
        {revealed && question.explicacion && (
          <div className="reveal-box">
            <strong>Explicación:</strong> {question.explicacion}
          </div>
        )}
      </div>

      <div className="control-bar">
        <button className="btn btn-warn" onClick={() => setRevealed((r) => !r)}>
          {revealed ? '🙈 Ocultar respuesta' : '👁️ Mostrar respuesta'}
        </button>
        <button className="btn btn-success btn-lg" onClick={handleCorrect}>
          ✅ Respuesta correcta
        </button>
        <button className="btn btn-danger" onClick={handleIncorrect}>
          ❌ Respuesta incorrecta
        </button>
        <button className="btn btn-info" onClick={() => setShowPartial(true)}>
          🎯 Puntuación parcial
        </button>
        <button className="btn" disabled={reboundDisabled} onClick={() => setShowReboundPicker(true)}>
          🔁 Rebote
        </button>
        <button className="btn btn-ghost" onClick={handleClose}>
          🔒 Cerrar pregunta
        </button>
        <button className="btn btn-ghost" onClick={onBack}>
          ↩️ Volver al panel sin cerrar
        </button>
      </div>

      {showPartial && (
        <PartialPointsModal
          puntosMaximos={question.puntosMaximos}
          puntosParciales={question.puntosParciales}
          onConfirm={handlePartialConfirm}
          onCancel={() => setShowPartial(false)}
        />
      )}

      {showReboundPicker && (
        <ConfirmDialog
          title="Elige el equipo al que rebota"
          message={
            <span>
              {availableForRebound.map((t) => (
                <button key={t.id} className="btn btn-block mb-1" style={{ background: t.color, color: '#111' }} onClick={() => handleReboundTo(t.id)}>
                  {t.icon} {t.name}
                </button>
              ))}
            </span>
          }
          confirmLabel="Cerrar"
          onConfirm={() => setShowReboundPicker(false)}
          onCancel={() => setShowReboundPicker(false)}
        />
      )}

      {confirmClose && (
        <ConfirmDialog
          title="Cerrar sin puntuar"
          message="Vas a cerrar esta pregunta sin que ningún equipo haya obtenido puntos. ¿Confirmas que quieres marcarla como fallida?"
          danger
          confirmLabel="Cerrar sin puntuar"
          onConfirm={() => {
            setConfirmClose(false)
            doClose()
          }}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </div>
  )
}
