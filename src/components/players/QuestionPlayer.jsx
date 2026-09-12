import { useMemo, useState } from 'react'

export default function QuestionPlayer({ question, revealed }) {
  switch (question.tipo) {
    case 'test':
      return <TestPlayer question={question} revealed={revealed} />
    case 'vf':
      return <VfPlayer question={question} revealed={revealed} />
    case 'hueco':
      return <HuecoPlayer question={question} revealed={revealed} />
    case 'corta':
      return <CortaPlayer question={question} revealed={revealed} />
    case 'imagen':
      return <ImagenPlayer question={question} revealed={revealed} />
    case 'orden':
      return <OrdenPlayer question={question} revealed={revealed} />
    case 'relaciona':
      return <RelacionaPlayer question={question} revealed={revealed} />
    default:
      return null
  }
}

function shuffle(arr, seed) {
  const a = arr.slice()
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- Tipo test ----------
function TestPlayer({ question, revealed }) {
  const opciones = useMemo(() => {
    if (!question.mezclar) return question.opciones
    return shuffle(question.opciones, question.id.length + question.opciones.length)
  }, [question])
  return (
    <div className="options-grid">
      {opciones.map((o) => {
        const isCorrect = question.respuestasCorrectas.includes(o.id)
        const cls = revealed ? (isCorrect ? 'correct-reveal' : 'wrong-reveal') : ''
        return (
          <div key={o.id} className={`option-tile ${cls}`}>
            {o.texto} {revealed && isCorrect ? '✅' : ''}
          </div>
        )
      })}
    </div>
  )
}

// ---------- Verdadero / Falso ----------
function VfPlayer({ question, revealed }) {
  return (
    <div className="vf-grid">
      <div className={`vf-btn card ${revealed && question.correcta ? 'correct-reveal' : ''}`} style={{ background: revealed && question.correcta ? undefined : 'var(--bg-card-2)' }}>
        ✅ Verdadero
      </div>
      <div className={`vf-btn card ${revealed && !question.correcta ? 'correct-reveal' : ''}`} style={{ background: revealed && !question.correcta ? undefined : 'var(--bg-card-2)' }}>
        ❌ Falso
      </div>
    </div>
  )
}

// ---------- Rellena el hueco ----------
function HuecoPlayer({ question, revealed }) {
  const partes = question.enunciado.split('___')
  let huecoIdx = -1
  return (
    <div className="blank-text">
      {partes.map((parte, i) => {
        const isLast = i === partes.length - 1
        if (!isLast) huecoIdx++
        const idxForBlank = isLast ? null : huecoIdx
        return (
          <span key={i}>
            {parte}
            {!isLast && (
              <span className="blank-slot">
                {revealed ? (question.huecos?.[idxForBlank] || []).join(' / ') || '—' : '_____'}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

// ---------- Respuesta corta ----------
function CortaPlayer({ question, revealed }) {
  return (
    <div>
      {revealed && (
        <div className="reveal-box">
          <strong>Respuestas de referencia:</strong> {(question.respuestasAceptadas || []).join(', ')}
        </div>
      )}
      {!revealed && <p className="muted">Escucha la respuesta del equipo y decide si es correcta.</p>}
    </div>
  )
}

// ---------- Señala con el ratón ----------
function ImagenPlayer({ question, revealed }) {
  const [marker, setMarker] = useState(null)

  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const hit = (question.zonas || []).some((z) => Math.hypot(z.x - x, z.y - y) <= z.radio)
    setMarker({ x, y, hit })
  }

  return (
    <div>
      <div className="image-click-wrap" onClick={handleClick} style={{ cursor: 'crosshair' }}>
        <img src={question.imagen} alt="" />
        {revealed &&
          (question.zonas || []).map((z) => (
            <div key={z.id} className="zone-marker" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.radio * 2}%`, height: `${z.radio * 2}%` }} />
          ))}
        {marker && (
          <div
            className={`click-marker ${marker.hit ? 'hit' : 'miss'}`}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          />
        )}
      </div>
      <p className="muted mt-1">
        {marker ? (marker.hit ? '✅ Dentro de una zona marcada (orientativo).' : '❌ Fuera de las zonas marcadas (orientativo).') : 'Haz clic en la imagen para señalar. El docente decide si la respuesta es válida.'}
      </p>
    </div>
  )
}

// ---------- Ordena los elementos ----------
function OrdenPlayer({ question, revealed }) {
  const initial = useMemo(() => shuffle(question.elementos, question.id.length + 3), [question])
  const [items, setItems] = useState(initial)
  const [checked, setChecked] = useState(null) // array of booleans por posición
  const [dragIdx, setDragIdx] = useState(null)

  function onDrop(targetIdx) {
    if (dragIdx === null || dragIdx === targetIdx) return
    const copy = items.slice()
    const [moved] = copy.splice(dragIdx, 1)
    copy.splice(targetIdx, 0, moved)
    setItems(copy)
    setDragIdx(null)
    setChecked(null)
  }

  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const copy = items.slice()
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    setItems(copy)
    setChecked(null)
  }

  function comprobar() {
    const result = items.map((it, i) => it.id === question.elementos[i].id)
    setChecked(result)
  }

  return (
    <div>
      <div className="order-list">
        {items.map((it, i) => (
          <div
            key={it.id}
            className={`order-item ${dragIdx === i ? 'dragging' : ''}`}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            style={
              checked
                ? { border: `3px solid ${checked[i] ? 'var(--success)' : 'var(--danger)'}`, background: checked[i] ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)' }
                : undefined
            }
          >
            <span className="drag-handle">⠿</span>
            <span>{it.texto}</span>
            <div className="order-controls">
              <button type="button" className="icon-btn" onClick={() => move(i, -1)}>⬆️</button>
              <button type="button" className="icon-btn" onClick={() => move(i, 1)}>⬇️</button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex-gap mt-2" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn btn-info" onClick={comprobar}>✅ Comprobar</button>
      </div>
      {revealed && (
        <div className="reveal-box mt-2">
          <strong>Orden correcto:</strong> {question.elementos.map((e) => e.texto).join(' → ')}
        </div>
      )}
    </div>
  )
}

// ---------- Relaciona ----------
function RelacionaPlayer({ question, revealed }) {
  const derechaShuffled = useMemo(() => shuffle(question.pares, question.id.length + 5), [question])
  const [selectedLeft, setSelectedLeft] = useState(null)
  const [matches, setMatches] = useState({}) // izqId -> derId
  const [checked, setChecked] = useState(false)

  function clickLeft(par) {
    setSelectedLeft(par.id)
  }
  function clickRight(par) {
    if (!selectedLeft) return
    setMatches((m) => ({ ...m, [selectedLeft]: par.id }))
    setSelectedLeft(null)
    setChecked(false)
  }

  const isCorrectMatch = (izqId) => matches[izqId] === izqId

  return (
    <div>
      <div className="match-columns">
        <div className="match-column">
          {question.pares.map((p) => {
            let cls = ''
            if (checked) cls = isCorrectMatch(p.id) ? 'correct' : matches[p.id] ? 'incorrect' : ''
            else if (matches[p.id]) cls = 'matched'
            else if (selectedLeft === p.id) cls = 'selected'
            return (
              <div key={p.id} className={`match-item ${cls}`} onClick={() => clickLeft(p)}>
                {p.izquierda}
              </div>
            )
          })}
        </div>
        <div className="match-column">
          {derechaShuffled.map((p) => {
            const matchedLeftId = Object.entries(matches).find(([, derId]) => derId === p.id)?.[0]
            let cls = matchedLeftId ? 'matched' : ''
            if (checked && matchedLeftId) cls = matchedLeftId === p.id ? 'correct' : 'incorrect'
            return (
              <div key={p.id} className={`match-item ${cls}`} onClick={() => clickRight(p)}>
                {p.derecha}
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex-gap mt-2" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn btn-info" onClick={() => setChecked(true)}>✅ Comprobar</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setMatches({}); setChecked(false) }}>
          🔄 Reiniciar
        </button>
      </div>
      {revealed && (
        <div className="reveal-box mt-2">
          <strong>Solución:</strong> {question.pares.map((p) => `${p.izquierda} = ${p.derecha}`).join(' · ')}
        </div>
      )}
    </div>
  )
}
