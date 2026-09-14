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
  const [retryNonce, setRetryNonce] = useState(0)
  const [autoPlaceSignal, setAutoPlaceSignal] = useState(0)
  const [autoPairSignal, setAutoPairSignal] = useState(0)

  const answering = gameState.currentAnswering
  const answeringTeam = gameState.teams.find((t) => t.id === answering.answeringTeamId)
  const attempted = new Set(answering.attemptedTeamIds)
  const availableForRebound = gameState.teams.filter((t) => !attempted.has(t.id))
  const reboundLimitReached = question.maximoRebotes > 0 && answering.reboundCount >= question.maximoRebotes
  // Verdadero/falso no admite rebote: solo hay dos opciones, no tiene sentido pasarla a otro equipo.
  const reboundDisabled = question.tipo === 'vf' || !question.permitirRebote || availableForRebound.length === 0 || reboundLimitReached

  const comodines = answeringTeam?.comodines || {}
  const numComodin = (key) => comodines[key] || 0
  const sinPuntuarAun = answering.pointsAwardedThisQuestion === 0
  const incorrectCount = question.tipo === 'test' ? question.opciones.length - question.respuestasCorrectas.length : 0
  const otrasDisponibles = quiz.questions.filter((q) => q.id !== question.id && gameState.questionsState[q.id]?.status === 'disponible')
  const hayElementoMalColocado = question.tipo === 'orden'
  const hayParejaSinAsignar = question.tipo === 'relaciona'

  const dobleDisabled = numComodin('doble') <= 0 || !!answering.doubleTeamId || !sinPuntuarAun
  const cincuentaDisabled = numComodin('cincuenta') <= 0 || answering.fiftyFiftyActive || question.tipo !== 'test' || incorrectCount < 2
  const cambiarDisabled = numComodin('cambiar') <= 0 || !sinPuntuarAun || otrasDisponibles.length === 0
  const segundaDisabled = numComodin('segunda') <= 0 || !!answering.segundaTeamId
  const aseguradoDisabled = numComodin('asegurado') <= 0 || !!answering.aseguradoTeamId
  const piezaDisabled = numComodin('pieza') <= 0 || !hayElementoMalColocado
  const parejaDisabled = numComodin('pareja') <= 0 || !hayParejaSinAsignar

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

  function activateSegunda() {
    dispatch({ type: 'ACTIVATE_SEGUNDA', teamId: answeringTeam.id })
    sounds.click()
  }

  function activateAsegurado() {
    dispatch({ type: 'ACTIVATE_ASEGURADO', teamId: answeringTeam.id })
    sounds.click()
  }

  function usarPieza() {
    dispatch({ type: 'USE_WILDCARD', teamId: answeringTeam.id, key: 'pieza' })
    setAutoPlaceSignal((n) => n + 1)
    sounds.click()
  }

  function usarPareja() {
    dispatch({ type: 'USE_WILDCARD', teamId: answeringTeam.id, key: 'pareja' })
    setAutoPairSignal((n) => n + 1)
    sounds.click()
  }

  const WILDCARD_HANDLERS = {
    doble: { disabled: dobleDisabled, onClick: activateDouble, cls: 'btn-warn' },
    cincuenta: { disabled: cincuentaDisabled, onClick: useFiftyFifty, cls: 'btn-info' },
    cambiar: { disabled: cambiarDisabled, onClick: handleSwapQuestionClick, cls: '' },
    segunda: { disabled: segundaDisabled, onClick: activateSegunda, cls: 'btn-warn' },
    asegurado: { disabled: aseguradoDisabled, onClick: activateAsegurado, cls: 'btn-info' },
    pieza: { disabled: piezaDisabled, onClick: usarPieza, cls: '' },
    pareja: { disabled: parejaDisabled, onClick: usarPareja, cls: '' },
  }

  function handleSwapQuestionClick() {
    const elegida = otrasDisponibles[Math.floor(Math.random() * otrasDisponibles.length)]
    dispatch({ type: 'SWAP_QUESTION', teamId: answeringTeam.id, oldQuestionId: question.id, newQuestionId: elegida.id })
    setRevealed(false)
    sounds.open()
  }

  function award(points, kind) {
    // El descuento por rebote ya se aplicó al calcular la base (puntosConRebote):
    // aquí solo se dobla si procede (lo hace el reducer según doubleTeamId).
    dispatch({ type: 'AWARD_POINTS', questionId: question.id, teamId: answeringTeam.id, points, kind })
    sounds.correct()
  }

  function handleCorrect() {
    award(puntosConRebote, 'correcta')
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

  // Preguntas tipo test: si hay una única respuesta correcta, pulsar una
  // opción resuelve al instante; si hay varias, hay que marcarlas todas y
  // pulsar "Comprobar". En ambos casos, correcta puntúa y cierra, e
  // incorrecta encadena el mismo flujo que "Respuesta incorrecta".
  function handleCheckTest(esCorrecto) {
    if (esCorrecto) {
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
    // Segunda oportunidad: se gasta y el mismo equipo repite, sin rebote ni cierre.
    if (answering.segundaTeamId === answeringTeam.id) {
      dispatch({ type: 'MARK_INCORRECT', questionId: question.id, teamId: answeringTeam.id, doublePenalty: 0 })
      dispatch({ type: 'CONSUME_SEGUNDA', teamId: answeringTeam.id })
      sounds.incorrect()
      setRevealed(false)
      setRetryNonce((n) => n + 1)
      return
    }

    const doublePenalty = answering.doubleTeamId === answeringTeam.id ? question.puntosMaximos : 0
    dispatch({ type: 'MARK_INCORRECT', questionId: question.id, teamId: answeringTeam.id, doublePenalty })
    sounds.incorrect()

    // Puntos asegurados: aunque falle, se lleva el 25% de la pregunta.
    let puntosSeguro = 0
    if (answering.aseguradoTeamId === answeringTeam.id) {
      puntosSeguro = Math.round(puntosConRebote * 0.25)
      dispatch({ type: 'AWARD_POINTS', questionId: question.id, teamId: answeringTeam.id, points: puntosSeguro, kind: 'asegurado' })
      dispatch({ type: 'CONSUME_ASEGURADO', teamId: answeringTeam.id })
    }

    // Verdadero/falso: sin rebote posible, se cierra directamente como fallida
    // y se sale al panel, sin pedir confirmación (no hay puntos que perder ni
    // nadie más a quien preguntar) — salvo que haya puntos asegurados de por medio.
    if (question.tipo === 'vf') {
      doClose(puntosSeguro)
      return
    }
    // Encadena directamente el siguiente paso lógico: si se puede rebotar, se
    // ofrece a quién (o se rebota solo al siguiente equipo en modo automático);
    // si no queda a quién rebotar, se cierra la pregunta.
    if (reboundDisabled) {
      handleClose(puntosSeguro)
    } else {
      triggerRebound()
    }
  }

  // Preguntas de "señala con el ratón": al pulsar Comprobar, se resuelve
  // automáticamente igual que si el docente hubiera pulsado el botón
  // correspondiente (correcta cierra y puntúa; incorrecta encadena rebote).
  function handleCheckImage(hit) {
    if (hit) {
      handleCorrect()
    } else {
      handleIncorrect()
    }
  }

  function handleReboundTo(teamId) {
    setShowReboundPicker(false)
    dispatch({ type: 'REBOUND', toTeamId: teamId })
    sounds.rebound()
  }

  function doClose(extraPoints = 0) {
    const points = answering.pointsAwardedThisQuestion + extraPoints
    dispatch({
      type: 'CLOSE_QUESTION',
      questionId: question.id,
      status: points > 0 ? (answering.reboundCount > 0 ? 'rebote' : 'correcta') : 'fallida',
      respondidaPor: points > 0 ? answeringTeam.id : null,
    })
    onBack()
  }

  function handleClose(extraPoints = 0) {
    if (answering.pointsAwardedThisQuestion + extraPoints === 0) {
      setConfirmClose(true)
    } else {
      doClose(extraPoints)
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
        {answering.segundaTeamId === answeringTeam?.id && ' · 🔂 Segunda oportunidad activa'}
        {answering.aseguradoTeamId === answeringTeam?.id && ' · 🛡️ Puntos asegurados'}
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
        {Object.entries(WILDCARD_INFO)
          .filter(([, info]) => !info.tipos || info.tipos.includes(question.tipo))
          .map(([key, info]) => {
            const h = WILDCARD_HANDLERS[key]
            return (
              <button key={key} className={`btn btn-sm ${h.cls}`} disabled={h.disabled} onClick={h.onClick}>
                {info.icon} {info.label} ({numComodin(key)})
              </button>
            )
          })}
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
          key={`${answering.attemptedTeamIds.length}-${retryNonce}`}
          question={question}
          revealed={revealed}
          fiftyFiftyActive={answering.fiftyFiftyActive}
          autoPlaceSignal={autoPlaceSignal}
          autoPairSignal={autoPairSignal}
          onCheckTest={handleCheckTest}
          onCheckImage={handleCheckImage}
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
        {question.tipo !== 'vf' && (
          <button className="btn" disabled={reboundDisabled} onClick={triggerRebound}>
            🔁 Rebote
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => handleClose()}>
          🔒 Cerrar pregunta
        </button>
        <button className="btn btn-ghost" onClick={onBack}>
          ↩️ Volver al panel sin cerrar
        </button>
      </div>

      {showPartial && (
        <PartialPointsModal
          puntosMaximos={puntosConRebote}
          puntosOriginales={question.puntosMaximos}
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
