import { useState } from 'react'
import { isMuted, toggleMuted } from '../utils/sound'

export default function MuteButton() {
  const [muted, setMuted] = useState(isMuted())
  return (
    <button
      className="mute-btn"
      onClick={() => setMuted(toggleMuted())}
      title={muted ? 'Activar sonido' : 'Silenciar sonido'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
