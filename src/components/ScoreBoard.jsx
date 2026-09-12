import { useState } from 'react'

export default function ScoreBoard({ gameState, dispatch, editable = true }) {
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')

  function startEdit(team) {
    setEditingId(team.id)
    setDraftName(team.name)
  }

  function commitEdit() {
    if (draftName.trim()) {
      dispatch({ type: 'SET_TEAM_NAME', teamId: editingId, name: draftName.trim() })
    }
    setEditingId(null)
  }

  return (
    <div className="scoreboard">
      {gameState.teams.map((team) => (
        <div key={team.id} className={`score-card ${team.id === gameState.activeTeamId ? 'active-turn' : ''}`} style={{ background: `linear-gradient(160deg, ${team.color}33, var(--bg-card))`, borderColor: team.id === gameState.activeTeamId ? team.color : 'transparent' }}>
          {team.id === gameState.activeTeamId && <span className="turn-tag">TURNO</span>}
          <div className="team-icon">{team.icon}</div>
          {editingId === team.id ? (
            <input
              autoFocus
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
              style={{ textAlign: 'center', padding: '4px 6px' }}
            />
          ) : (
            <div className="team-name" onClick={() => editable && startEdit(team)} title="Clic para renombrar">
              {team.name}
            </div>
          )}
          <div className="team-score">{team.score}</div>
          {editable && (
            <div className="score-adjust-row">
              <button className="icon-btn" onClick={() => dispatch({ type: 'ADJUST_SCORE', teamId: team.id, delta: -10 })}>-10</button>
              <button className="icon-btn" onClick={() => dispatch({ type: 'ADJUST_SCORE', teamId: team.id, delta: -5 })}>-5</button>
              <button className="icon-btn" onClick={() => dispatch({ type: 'ADJUST_SCORE', teamId: team.id, delta: 5 })}>+5</button>
              <button className="icon-btn" onClick={() => dispatch({ type: 'ADJUST_SCORE', teamId: team.id, delta: 10 })}>+10</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
