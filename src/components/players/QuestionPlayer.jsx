import { useMemo, useState } from 'react'

export default function QuestionPlayer({ question, revealed, fiftyFiftyActive, onCheckTest, onCheckImage }) {
  switch (question.tipo) {
    case 'test':
      return <TestPlayer question={question} revealed={revealed} fiftyFiftyActive={fiftyFiftyActive} onCheck={onCheckTest} />
    case 'vf':
      return <VfPlayer question={question} revealed={revealed} />
    case 'hueco':
      return <HuecoPlayer question={question} revealed={revealed} />
    case 'corta':
      return <CortaPlayer question={question} revealed={revealed} />
    case 'imagen':
      return <ImagenPlayer question={question} revealed={revealed} onCheck={onCheckImage} />
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
function TestPlayer({ question, revealed, fiftyFiftyActive, onCheck }) {
  const esMultiple = question.respuestasCorrectas.length > 1
  const opciones = useMemo(() => {
    let opts = question.mezclar ? shuffle(question.opciones, question.id.length + question.opciones.length) : question.opciones
    if (fiftyFiftyActive) {
      const incorrectas = opts.filter((o) => !question.respuestasCorrectas.includes(o.id))
      const aOcultar = new Set(shuffle(incorrectas, question.id.length + 97).slice(0, Math.min(2, incorrectas.length)).map((o) => o.id))
      opts = opts.filter((o) => !aOcultar.has(o.id))
    }
    return opts
  }, [question, fiftyFiftyActive])

  if (esMultiple) {
    return <TestPlayerMultiple question={question} revealed={revealed} opciones={opciones} onCheck={onCheck} />
  }
  return <TestPlayerUnica question={question} revealed={revealed} opciones={opciones} onCheck={onCheck} />
}

// Una única respuesta correcta: pulsar una opción resuelve al instante.
function TestPlayerUnica({ question, revealed, opciones, onCheck }) {
  const [selectedId, setSelectedId] = useState(null)

  function handleClick(o) {
    if (revealed || !onCheck || selectedId) return
    setSelectedId(o.id)
    onCheck(question.respuestasCorrectas.includes(o.id))
  }

  return (
    <div className="options-grid">
      {opciones.map((o) => {
        const isCorrect = question.respuestasCorrectas.includes(o.id)
        let cls = ''
        if (revealed) cls = isCorrect ? 'correct-reveal' : 'wrong-reveal'
        else if (selectedId === o.id) cls = isCorrect ? 'correct-reveal' : 'wrong-reveal'
        return (
          <div
            key={o.id}
            className={`option-tile ${cls} ${onCheck ? 'option-clickable' : ''}`}
            onClick={() => handleClick(o)}
          >
            {o.texto} {(revealed || selectedId === o.id) && isCorrect ? '✅' : ''}
            {selectedId === o.id && !isCorrect && ' ❌'}
          </div>
        )
      })}
    </div>
  )
}

// Varias respuestas correctas: hay que marcarlas todas y pulsar Comprobar.
function TestPlayerMultiple({ question, revealed, opciones, onCheck }) {
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [checked, setChecked] = useState(null) // null | true | false
  const totalCorrectas = question.respuestasCorrectas.length
  const correctasSeleccionadas = [...selectedIds].filter((id) => question.respuestasCorrectas.includes(id)).length

  function toggle(id) {
    if (revealed || checked !== null) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function comprobar() {
    const correctSet = new Set(question.respuestasCorrectas)
    const esCorrecto = selectedIds.size === correctSet.size && [...selectedIds].every((id) => correctSet.has(id))
    setChecked(esCorrecto)
    onCheck?.(esCorrecto)
  }

  return (
    <div>
      <div className="options-grid">
        {opciones.map((o) => {
          const isCorrect = question.respuestasCorrectas.includes(o.id)
          const isSelected = selectedIds.has(o.id)
          let cls = ''
          if (revealed) cls = isCorrect ? 'correct-reveal' : 'wrong-reveal'
          else if (checked !== null && isSelected) cls = isCorrect ? 'correct-reveal' : 'wrong-reveal'
          else if (isSelected) cls = 'selected-multi'
          return (
            <div
              key={o.id}
              className={`option-tile ${cls} ${onCheck && checked === null ? 'option-clickable' : ''}`}
              onClick={() => toggle(o.id)}
            >
              {o.texto}
              {checked === null && isSelected && ' ☑️'}
              {checked !== null && isSelected && (isCorrect ? ' ✅' : ' ❌')}
            </div>
          )
        })}
      </div>
      {onCheck && checked === null && (
        <div className="flex-gap mt-2" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <span className="badge badge-success">
            {correctasSeleccionadas}/{totalCorrectas} correctas seleccionadas
          </span>
          <button type="button" className="btn btn-info" disabled={selectedIds.size === 0} onClick={comprobar}>
            ✅ Comprobar
          </button>
        </div>
      )}
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
function ImagenPlayer({ question, revealed, onCheck }) {
  const [marker, setMarker] = useState(null)
  const [checked, setChecked] = useState(null) // null | true | false

  function handleClick(e) {
    if (checked !== null) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMarker({ x, y })
  }

  function comprobar() {
    if (!marker) return
    const hit = (question.zonas || []).some((z) => Math.hypot(z.x - marker.x, z.y - marker.y) <= z.radio)
    setChecked(hit)
    onCheck?.(hit)
  }

  return (
    <div>
      <div className="image-click-wrap" onClick={handleClick} style={{ cursor: checked === null ? 'crosshair' : 'default' }}>
        <img src={question.imagen} alt="" />
        {revealed &&
          (question.zonas || []).map((z) => (
            <div key={z.id} className="zone-marker" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.radio * 2}%`, height: `${z.radio * 2}%` }} />
          ))}
        {marker && (
          <div
            className={`click-marker ${checked === null ? '' : checked ? 'hit' : 'miss'}`}
            style={{ left: `${marker.x}%`, top: `${marker.y}%`, background: checked === null ? 'rgba(255,204,51,0.85)' : undefined }}
          />
        )}
      </div>
      <div className="flex-gap mt-2" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn btn-info" disabled={!marker || checked !== null} onClick={comprobar}>
          ✅ Comprobar
        </button>
        {marker && checked === null && (
          <button type="button" className="btn btn-ghost" onClick={() => setMarker(null)}>
            🔄 Volver a señalar
          </button>
        )}
      </div>
      <p className="muted mt-1">
        {checked === null
          ? marker
            ? 'Pulsa "Comprobar" para confirmar el punto señalado.'
            : 'Haz clic en la imagen para señalar dónde crees que está.'
          : checked
            ? '✅ ¡Correcto!'
            : '❌ Incorrecto.'}
      </p>
    </div>
  )
}

// ---------- Ordena los elementos ----------
function OrdenPlayer({ question, revealed }) {
  const initial = useMemo(() => shuffle(question.elementos, question.id.length + 3), [question])
  const [items, setItems] = useState(initial)
  const [resultado, setResultado] = useState(null) // null | true | false
  const [dragIdx, setDragIdx] = useState(null)

  function onDrop(targetIdx) {
    if (dragIdx === null || dragIdx === targetIdx) return
    const copy = items.slice()
    const [moved] = copy.splice(dragIdx, 1)
    copy.splice(targetIdx, 0, moved)
    setItems(copy)
    setResultado(null)
  }

  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const copy = items.slice()
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    setItems(copy)
    setResultado(null)
  }

  function comprobar() {
    const esCorrecto = items.every((it, i) => it.id === question.elementos[i].id)
    setResultado(esCorrecto)
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
      {resultado !== null && (
        <p className={resultado ? 'result-ok' : 'result-fail'}>{resultado ? '✅ ¡Correcto!' : '❌ Incorrecto.'}</p>
      )}
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
  const [resultado, setResultado] = useState(null) // null | true | false

  function clickLeft(par) {
    if (resultado !== null) return
    setSelectedLeft(par.id)
  }
  function clickRight(par) {
    if (resultado !== null || !selectedLeft) return
    setMatches((m) => ({ ...m, [selectedLeft]: par.id }))
    setSelectedLeft(null)
  }

  function comprobar() {
    const completo = question.pares.every((p) => matches[p.id])
    if (!completo) return
    const esCorrecto = question.pares.every((p) => matches[p.id] === p.id)
    setResultado(esCorrecto)
  }

  function reiniciar() {
    setMatches({})
    setResultado(null)
  }

  const todasEmparejadas = question.pares.every((p) => matches[p.id])

  return (
    <div>
      <div className="match-columns">
        <div className="match-column">
          {question.pares.map((p) => {
            let cls = ''
            if (matches[p.id]) cls = 'matched'
            if (selectedLeft === p.id) cls = 'selected'
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
            const cls = matchedLeftId ? 'matched' : ''
            return (
              <div key={p.id} className={`match-item ${cls}`} onClick={() => clickRight(p)}>
                {p.derecha}
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex-gap mt-2" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn btn-info" disabled={!todasEmparejadas || resultado !== null} onClick={comprobar}>
          ✅ Comprobar
        </button>
        <button type="button" className="btn btn-ghost" onClick={reiniciar}>
          🔄 Reiniciar
        </button>
      </div>
      {resultado !== null && (
        <p className={resultado ? 'result-ok' : 'result-fail'}>{resultado ? '✅ ¡Correcto!' : '❌ Incorrecto.'}</p>
      )}
      {revealed && (
        <div className="reveal-box mt-2">
          <strong>Solución:</strong> {question.pares.map((p) => `${p.izquierda} = ${p.derecha}`).join(' · ')}
        </div>
      )}
    </div>
  )
}
