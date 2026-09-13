import { useState } from 'react'
import QuestionPlayer from '../components/players/QuestionPlayer'
import Timer from '../components/Timer'
import PartialPointsModal from '../components/PartialPointsModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { sounds } from '../utils/sound'
import { WILDCARD_INFO } from '../models'

function computeEffectivePoints(basePoints, reboundCount, settings) {
  if (reboundCount === 0) return Math.round(basePoints)
  if (settings.reboundPolicy === 'fixed') return Math.max(0, Math.round(basePoints - settings.reboundFixedAmount * reboundCount))
  if (settings.reboundPolicy === 'percent') return Math.max(0, Math.round(basePoints * (1 - (settings.reboundPercent / 100) * reboundCount)))
  return Math.round(basePoints)
}

export default function QuestionPlayScreen({ quiz, question, tileNumber, gameState, dispatch, onBack }) {
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

  const comodines = answeringTeam?.comodines || { doble: 0, cincuenta: 0, cambiar: 0 }
  const sinPuntuarAun = answering.pointsAwardedThisQuestion === 0
  const incorrectCount = question.tipo === 'test' ? question.opciones.length - question.respuestasCorrectas.length : 0
  const otrasDisponibles = quiz.questions.filter((q) => q.id !== question.id && gameState.questionsState[q.id]?.status === 'disponible')

  const dobleDisabled = comodines.doble <= 0 || !!answering.doubleTeamId || !sinPuntuarAun
  const cincuentaDisabled = comodines.cincuenta <= 0 || answering.fiftyFiftyActive || question.tipo !== 'test' || incorrectCount < 2
  const cambiarDisabled = comodines.cambiar <= 0 || !sinPuntuarAun || otrasDisponibles.length === 0

  const puntosConRebote = computeEffectivePoints(question.puntosMaximos, answering.reboundCount, quiz.settings)
  const puntosEnJuego = answering.doubleTeamId === answeringTeam?.id ? puntosConRebote * 2 : puntosConRebote

  function activateDouble() {
    dispatch({ type: 'ACTIVATE_DOUBLE', teamId: answeringTeam.id })
    sounds.click()
  }

  function useFiftyFifty() {
    dispatch({ type: 'USE_FIFTY_FIFTY', teamId: answeringTeam.id })
    sounds.click()
  }

  function handleSwapQuestion() {
    const elegida = otrasDisponibles[Math.floor(Math.random() * otrasDisponibles.length)]
    dispatch({ type: 'SWAP_QUESTION', teamId: answeringTeam.id, oldQuestionId: question.id, newQuestionId: elegida.id })
    setRevealed(false)
    sounds.open()
  }

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

  // Al pulsar directamente una opción en preguntas tipo test: si es la
  // correcta, se da por correcta; si no, se marca incorrecta (y encadena
  // rebote/cierre igual que el botón "Respuesta incorrecta").
  function handleSelectTestOption(optionId) {
    if (question.respuestasCorrectas.includes(optionId)) {
      handleCorrect()
    } else {
      handleIncorrect()
    }
  }

  function nextAutoReboundTeam() {
    const order = gameState.turnOrder
    const currentIdx = order.indexOf(answering.answeringTeamId)
    for (let step = 1; step <= order.length; step++) {
      const candidateId = order[(currentIdx + step) % order.length]
      if (!attempted.has(candidateId)) {
        return gameState.teams.find((t) => t.id === candidateId)
      }
    }
    return null
  }

  function triggerRebound() {
    if (quiz.settings.reboundMode === 'automatico') {
      const siguiente = nextAutoReboundTeam()
      if (siguiente) handleReboundTo(siguiente.id)
    } else {
      setShowReboundPicker(true)
    }
  }

  function handleIncorrect() {
    const doublePenalty = answering.doubleTeamId === answeringTeam.id ? question.puntosMaximos : 0
    dispatch({ type: 'MARK_INCORRECT', questionId: question.id, teamId: answeringTeam.id, doublePenalty })
    sounds.incorrect()
    // Encadena directamente el siguiente paso lógico: si se puede rebotar, se
    // ofrece a quién (o se rebota solo al siguiente equipo en modo automático);
    // si no queda a quién rebotar, se cierra la pregunta.
    if (reboundDisabled) {
      handleClose()
    } else {
      triggerRebound()
    }
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
          <span className="badge">Pregunta {tileNumber ?? question.orden}</span>
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
        {answering.doubleTeamId === answeringTeam?.id && ' · 🎲 ¡DOBLE O NADA!'}
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

      <div className="flex-gap mt-1" style={{ justifyContent: 'center' }}>
        <span className="muted" style={{ alignSelf: 'center' }}>Comodines de {answeringTeam?.name}:</span>
        <button className="btn btn-sm btn-warn" disabled={dobleDisabled} onClick={activateDouble}>
          {WILDCARD_INFO.doble.icon} {WILDCARD_INFO.doble.label} ({comodines.doble})
        </button>
        <button className="btn btn-sm btn-info" disabled={cincuentaDisabled} onClick={useFiftyFifty}>
          {WILDCARD_INFO.cincuenta.icon} {WILDCARD_INFO.cincuenta.label} ({comodines.cincuenta})
        </button>
        <button className="btn btn-sm" disabled={cambiarDisabled} onClick={handleSwapQuestion}>
          {WILDCARD_INFO.cambiar.icon} {WILDCARD_INFO.cambiar.label} ({comodines.cambiar})
        </button>
      </div>

      <div className="question-body">
        <div className="points-display">
          {puntosEnJuego !== question.puntosMaximos && <span className="points-display-original">{question.puntosMaximos}</span>}
          {puntosEnJuego}
          <span className="points-display-label">
            PUNTOS{answering.reboundCount > 0 ? ' · REBOTE' : ''}
          </span>
        </div>
        <div className="question-statement">{question.enunciado}</div>
        {question.imagen && question.tipo !== 'imagen' && <img src={question.imagen} alt="" className="question-image" />}
        <QuestionPlayer
          key={answering.attemptedTeamIds.length}
          question={question}
          revealed={revealed}
          fiftyFiftyActive={answering.fiftyFiftyActive}
          onSelectTestOption={handleSelectTestOption}
        />
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
        <button className="btn" disabled={reboundDisabled} onClick={triggerRebound}>
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
