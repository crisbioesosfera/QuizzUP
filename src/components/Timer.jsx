import { useEffect, useRef, useState } from 'react'

export default function Timer({ totalSeconds }) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const [running, setRunning] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    setRemaining(totalSeconds)
    setRunning(true)
  }, [totalSeconds])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0))
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  if (totalSeconds == null) return null

  return (
    <div className="flex-gap" style={{ alignItems: 'center' }}>
      <div className={`timer-display ${remaining <= 5 ? 'low' : ''}`}>
        ⏱️ {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRunning((r) => !r)}>
        {running ? '⏸️ Pausar' : '▶️ Reanudar'}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRemaining(totalSeconds); setRunning(true) }}>
        🔄 Reiniciar
      </button>
    </div>
  )
}
