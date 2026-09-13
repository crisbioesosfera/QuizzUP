import { useState } from 'react'
import { getQuiz, saveQuiz, getGame } from '../utils/storage'
import { createTeam, TEAM_COLORS, TEAM_ICONS } from '../models'
import ConfirmDialog from '../components/ConfirmDialog'

export default function TeamsSetupScreen({ quizId, onBack, onBackHome, onStartGame }) {
  const [quiz, setQuiz] = useState(() => getQuiz(quizId))
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)

  if (!quiz) {
    return (
      <div className="container">
        <p>No se encontró el concurso.</p>
        <button className="btn" onClick={onBackHome}>
          Volver al inicio
        </button>
      </div>
    )
  }

  function updateTeamsConfig(patch) {
    setQuiz((q) => ({ ...q, teamsConfig: { ...q.teamsConfig, ...patch } }))
  }

  function updateSettings(patch) {
    setQuiz((q) => ({ ...q, settings: { ...q.settings, ...patch } }))
  }

  function setCount(count) {
    const teams = quiz.teamsConfig.teams.slice(0, count)
    while (teams.length < count) teams.push(createTeam(teams.length))
    updateTeamsConfig({ count, teams })
  }

  function updateTeam(id, patch) {
    updateTeamsConfig({
      teams: quiz.teamsConfig.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })
  }

  function handleStart() {
    saveQuiz(quiz)
    const existingGame = getGame(quiz.id)
    if (existingGame && !existingGame.finished) {
      setConfirmOverwrite(true)
      return
    }
    onStartGame(quiz)
  }

  function confirmAndStart() {
    setConfirmOverwrite(false)
    onStartGame(quiz)
  }

  return (
    <div className="container">
      <div className="flex-gap mb-2">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Volver al editor
        </button>
      </div>

      <h1>Configura los equipos</h1>
      <p className="muted">Concurso: {quiz.name} · {quiz.questions.length} preguntas</p>

      <div className="card mb-3">
        <label>Número de equipos</label>
        <div className="flex-gap">
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button key={n} className={`btn ${quiz.teamsConfig.count === n ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCount(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="teams-grid mb-3">
        {quiz.teamsConfig.teams.map((team) => (
          <div key={team.id} className="team-config-card card" style={{ borderColor: team.color }}>
            <div className="flex-gap" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '2rem' }}>{team.icon}</span>
              <input type="text" value={team.name} onChange={(e) => updateTeam(team.id, { name: e.target.value })} style={{ flex: 1 }} />
            </div>
            <p className="muted mt-1" style={{ marginBottom: 4 }}>Color</p>
            <div className="color-swatches">
              {TEAM_COLORS.map((c) => (
                <div
                  key={c}
                  className={`color-swatch ${team.color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => updateTeam(team.id, { color: c })}
                />
              ))}
            </div>
            <p className="muted mt-1" style={{ marginBottom: 4 }}>Icono</p>
            <div className="icon-swatches">
              {TEAM_ICONS.map((icon) => (
                <div key={icon} className={`icon-swatch ${team.icon === icon ? 'selected' : ''}`} onClick={() => updateTeam(team.id, { icon })}>
                  {icon}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-3">
        <h3>Turnos</h3>
        <div className="flex-gap">
          <button className={`btn ${quiz.settings.turnMode === 'auto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateSettings({ turnMode: 'auto' })}>
            🔄 Turno automático
          </button>
          <button className={`btn ${quiz.settings.turnMode === 'manual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateSettings({ turnMode: 'manual' })}>
            🖐️ Turno manual
          </button>
        </div>
        <p className="muted mt-1">
          {quiz.settings.turnMode === 'auto'
            ? 'Los equipos se turnan automáticamente después de cada pregunta.'
            : 'Eliges tú qué equipo responde cada pregunta.'}
        </p>
      </div>

      <div className="card mb-3">
        <h3>Orden de las preguntas en el panel</h3>
        <div className="flex-gap">
          <button className={`btn ${quiz.settings.orderMode !== 'aleatorio' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateSettings({ orderMode: 'fijo' })}>
            🔢 Orden fijo (el del editor)
          </button>
          <button className={`btn ${quiz.settings.orderMode === 'aleatorio' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateSettings({ orderMode: 'aleatorio' })}>
            🔀 Orden aleatorio
          </button>
        </div>
        <p className="muted mt-1">
          {quiz.settings.orderMode === 'aleatorio'
            ? 'Las preguntas se reparten en las casillas del panel en un orden distinto cada partida.'
            : 'Las casillas del panel siguen el mismo orden en el que aparecen en el editor.'}
        </p>
      </div>

      <div className="card mb-3">
        <h3>Rebote: puntuación al pasar a otro equipo</h3>
        <div className="flex-gap">
          <button className={`btn ${quiz.settings.reboundPolicy === 'full' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateSettings({ reboundPolicy: 'full' })}>
            Mantener todos los puntos
          </button>
          <button className={`btn ${quiz.settings.reboundPolicy === 'fixed' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateSettings({ reboundPolicy: 'fixed' })}>
            Restar cantidad fija
          </button>
          <button className={`btn ${quiz.settings.reboundPolicy === 'percent' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateSettings({ reboundPolicy: 'percent' })}>
            Reducir un porcentaje
          </button>
        </div>
        {quiz.settings.reboundPolicy === 'fixed' && (
          <div className="field mt-2" style={{ maxWidth: 220 }}>
            <label>Puntos a restar por cada rebote</label>
            <input type="number" min="0" value={quiz.settings.reboundFixedAmount} onChange={(e) => updateSettings({ reboundFixedAmount: Number(e.target.value) })} />
          </div>
        )}
        {quiz.settings.reboundPolicy === 'percent' && (
          <div className="field mt-2" style={{ maxWidth: 220 }}>
            <label>% a reducir por cada rebote</label>
            <input type="number" min="0" max="100" value={quiz.settings.reboundPercent} onChange={(e) => updateSettings({ reboundPercent: Number(e.target.value) })} />
          </div>
        )}
      </div>

      <button className="btn btn-success btn-lg" onClick={handleStart}>
        🚀 Comenzar partida
      </button>

      {confirmOverwrite && (
        <ConfirmDialog
          title="Ya hay una partida en curso"
          message="Este concurso tiene una partida sin terminar. Si comienzas una nueva, se perderá el progreso actual. ¿Quieres continuar?"
          danger
          confirmLabel="Empezar de nuevo"
          onConfirm={confirmAndStart}
          onCancel={() => setConfirmOverwrite(false)}
        />
      )}
    </div>
  )
}
