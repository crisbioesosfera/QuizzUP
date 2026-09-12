import { useRef } from 'react'
import { TIPOS_PREGUNTA } from '../models'
import { uid } from '../utils/id'

const LETRAS = ['a', 'b', 'c', 'd', 'e', 'f']

export default function QuestionForm({ question, onChange }) {
  function update(patch) {
    onChange({ ...question, ...patch })
  }

  return (
    <div>
      <div className="field-row">
        <div className="field">
          <label>Número / orden</label>
          <input type="number" min="1" value={question.orden} onChange={(e) => update({ orden: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label>Tipo de pregunta</label>
          <select value={question.tipo} disabled>
            {TIPOS_PREGUNTA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Categoría / tema (opcional)</label>
          <input type="text" value={question.categoria || ''} onChange={(e) => update({ categoria: e.target.value })} />
        </div>
        <div className="field">
          <label>Dificultad (opcional)</label>
          <select value={question.dificultad || ''} onChange={(e) => update({ dificultad: e.target.value })}>
            <option value="">Sin especificar</option>
            <option value="facil">Fácil</option>
            <option value="media">Media</option>
            <option value="dificil">Difícil</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>Enunciado</label>
        <textarea rows={3} value={question.enunciado} onChange={(e) => update({ enunciado: e.target.value })} />
      </div>

      <div className="field">
        <label>Imagen (opcional, URL o subida)</label>
        <ImageField value={question.imagen} onChange={(url) => update({ imagen: url })} />
      </div>

      <div className="divider" />

      <TypeSpecificFields question={question} update={update} />

      <div className="divider" />

      <div className="field-row">
        <div className="field">
          <label>Puntos máximos</label>
          <input type="number" min="0" value={question.puntosMaximos} onChange={(e) => update({ puntosMaximos: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label>Puntos parciales (% rápidos, separados por comas)</label>
          <input
            type="text"
            value={(question.puntosParciales || []).join(', ')}
            onChange={(e) =>
              update({
                puntosParciales: e.target.value
                  .split(',')
                  .map((s) => Number(s.trim()))
                  .filter((n) => !Number.isNaN(n)),
              })
            }
          />
        </div>
        <div className="field">
          <label>Tiempo para responder (segundos, opcional)</label>
          <input
            type="number"
            min="0"
            value={question.tiempoSegundos ?? ''}
            onChange={(e) => update({ tiempoSegundos: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="checkbox-row" style={{ flex: 1 }}>
          <input
            type="checkbox"
            id="permitirRebote"
            checked={!!question.permitirRebote}
            onChange={(e) => update({ permitirRebote: e.target.checked })}
          />
          <label htmlFor="permitirRebote">Permitir rebote</label>
        </div>
        {question.permitirRebote && (
          <div className="field" style={{ flex: 1 }}>
            <label>Máximo de rebotes (0 = sin límite)</label>
            <input type="number" min="0" value={question.maximoRebotes || 0} onChange={(e) => update({ maximoRebotes: Number(e.target.value) })} />
          </div>
        )}
      </div>

      <div className="field">
        <label>Explicación / solución ampliada (opcional)</label>
        <textarea rows={2} value={question.explicacion || ''} onChange={(e) => update({ explicacion: e.target.value })} />
      </div>
    </div>
  )
}

function ImageField({ value, onChange }) {
  const fileRef = useRef(null)
  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target.result)
    reader.readAsDataURL(file)
  }
  return (
    <div>
      <div className="flex-gap">
        <input type="text" placeholder="https://..." value={value?.startsWith('data:') ? '' : value || ''} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
          📁 Subir imagen
        </button>
        {value && (
          <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange('')}>
            Quitar
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      {value && <img src={value} alt="" style={{ maxWidth: 200, maxHeight: 120, marginTop: 8, borderRadius: 8 }} />}
    </div>
  )
}

function TypeSpecificFields({ question, update }) {
  switch (question.tipo) {
    case 'test':
      return <TestFields question={question} update={update} />
    case 'vf':
      return <VfFields question={question} update={update} />
    case 'hueco':
      return <HuecoFields question={question} update={update} />
    case 'corta':
      return <CortaFields question={question} update={update} />
    case 'imagen':
      return <ImagenFields question={question} update={update} />
    case 'orden':
      return <OrdenFields question={question} update={update} />
    case 'relaciona':
      return <RelacionaFields question={question} update={update} />
    default:
      return null
  }
}

// ---------- Tipo test ----------
function TestFields({ question, update }) {
  const opciones = question.opciones || []
  function setOpcionTexto(id, texto) {
    update({ opciones: opciones.map((o) => (o.id === id ? { ...o, texto } : o)) })
  }
  function addOpcion() {
    if (opciones.length >= 6) return
    const id = LETRAS[opciones.length]
    update({ opciones: [...opciones, { id, texto: '' }] })
  }
  function removeOpcion(id) {
    if (opciones.length <= 2) return
    update({
      opciones: opciones.filter((o) => o.id !== id),
      respuestasCorrectas: (question.respuestasCorrectas || []).filter((c) => c !== id),
    })
  }
  function toggleCorrecta(id) {
    const set = new Set(question.respuestasCorrectas || [])
    if (set.has(id)) set.delete(id)
    else set.add(id)
    update({ respuestasCorrectas: Array.from(set) })
  }
  return (
    <div>
      <label>Opciones (marca la/las correctas)</label>
      {opciones.map((o) => (
        <div key={o.id} className="checkbox-row">
          <input type="checkbox" checked={(question.respuestasCorrectas || []).includes(o.id)} onChange={() => toggleCorrecta(o.id)} />
          <input type="text" value={o.texto} placeholder={`Opción ${o.id.toUpperCase()}`} onChange={(e) => setOpcionTexto(o.id, e.target.value)} style={{ flex: 1 }} />
          {opciones.length > 2 && (
            <button type="button" className="icon-btn" onClick={() => removeOpcion(o.id)}>
              🗑️
            </button>
          )}
        </div>
      ))}
      {opciones.length < 6 && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={addOpcion}>
          ➕ Añadir opción
        </button>
      )}
      <div className="checkbox-row mt-1">
        <input type="checkbox" checked={question.mezclar !== false} onChange={(e) => update({ mezclar: e.target.checked })} />
        <label>Mezclar el orden de las opciones al proyectarlas</label>
      </div>
    </div>
  )
}

// ---------- Verdadero / Falso ----------
function VfFields({ question, update }) {
  return (
    <div className="field">
      <label>Respuesta correcta</label>
      <div className="flex-gap">
        <button type="button" className={`btn ${question.correcta ? 'btn-success' : 'btn-ghost'}`} onClick={() => update({ correcta: true })}>
          ✅ Verdadero
        </button>
        <button type="button" className={`btn ${!question.correcta ? 'btn-danger' : 'btn-ghost'}`} onClick={() => update({ correcta: false })}>
          ❌ Falso
        </button>
      </div>
    </div>
  )
}

// ---------- Rellena el hueco ----------
function HuecoFields({ question, update }) {
  const huecos = question.huecos || [[]]
  const numHuecos = (question.enunciado.match(/___/g) || []).length
  function setGrupo(i, texto) {
    const nuevo = huecos.slice()
    nuevo[i] = texto
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
    update({ huecos: nuevo })
  }
  function addHueco() {
    update({ enunciado: question.enunciado + ' ___', huecos: [...huecos, []] })
  }
  return (
    <div>
      <p className="muted">Escribe "___" (tres guiones bajos) en el enunciado donde quieras un hueco.</p>
      <button type="button" className="btn btn-ghost btn-sm mb-1" onClick={addHueco}>
        ➕ Insertar hueco en el enunciado
      </button>
      <p className="muted">Huecos detectados en el enunciado: {numHuecos}</p>
      {Array.from({ length: Math.max(numHuecos, 1) }).map((_, i) => (
        <div className="field" key={i}>
          <label>Respuestas aceptadas para el hueco {i + 1} (separadas por |)</label>
          <input type="text" value={(huecos[i] || []).join(' | ')} onChange={(e) => setGrupo(i, e.target.value)} placeholder="sol | el sol" />
        </div>
      ))}
    </div>
  )
}

// ---------- Respuesta corta ----------
function CortaFields({ question, update }) {
  return (
    <div className="field">
      <label>Respuestas aceptadas / palabras clave (separadas por |)</label>
      <input
        type="text"
        value={(question.respuestasAceptadas || []).join(' | ')}
        onChange={(e) =>
          update({
            respuestasAceptadas: e.target.value
              .split('|')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        placeholder="paris | parís"
      />
      <p className="muted">La aplicación las muestra como referencia; el docente decide si la respuesta oral es correcta.</p>
    </div>
  )
}

// ---------- Señala con el ratón ----------
function ImagenFields({ question, update }) {
  const zonas = question.zonas || []
  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    update({ zonas: [...zonas, { id: uid('z'), x, y, radio: 10 }] })
  }
  function updateZona(id, patch) {
    update({ zonas: zonas.map((z) => (z.id === id ? { ...z, ...patch } : z)) })
  }
  function removeZona(id) {
    update({ zonas: zonas.filter((z) => z.id !== id) })
  }
  if (!question.imagen) {
    return <p className="muted">Añade una imagen arriba para poder marcar las zonas correctas.</p>
  }
  return (
    <div>
      <label>Haz clic sobre la imagen para añadir una zona correcta</label>
      <div className="image-click-wrap" onClick={handleClick} style={{ cursor: 'crosshair' }}>
        <img src={question.imagen} alt="" />
        {zonas.map((z) => (
          <div key={z.id} className="zone-marker" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.radio * 2}%`, height: `${z.radio * 2}%` }} />
        ))}
      </div>
      {zonas.map((z, i) => (
        <div key={z.id} className="flex-gap mt-1" style={{ alignItems: 'center' }}>
          <span className="badge">Zona {i + 1}</span>
          <label style={{ margin: 0 }}>Radio</label>
          <input type="range" min="3" max="30" value={z.radio} onChange={(e) => updateZona(z.id, { radio: Number(e.target.value) })} style={{ width: 120 }} />
          <button type="button" className="icon-btn" onClick={() => removeZona(z.id)}>
            🗑️
          </button>
        </div>
      ))}
    </div>
  )
}

// ---------- Ordena los elementos ----------
function OrdenFields({ question, update }) {
  const elementos = question.elementos || []
  function setTexto(id, texto) {
    update({ elementos: elementos.map((el) => (el.id === id ? { ...el, texto } : el)) })
  }
  function addElemento() {
    if (elementos.length >= 8) return
    update({ elementos: [...elementos, { id: uid('el'), texto: '' }] })
  }
  function removeElemento(id) {
    if (elementos.length <= 2) return
    update({ elementos: elementos.filter((el) => el.id !== id) })
  }
  function move(idx, dir) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= elementos.length) return
    const copy = elementos.slice()
    ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
    update({ elementos: copy })
  }
  return (
    <div>
      <label>Elementos, en el ORDEN CORRECTO (2 a 8)</label>
      {elementos.map((el, i) => (
        <div key={el.id} className="checkbox-row">
          <span className="badge">{i + 1}</span>
          <input type="text" value={el.texto} onChange={(e) => setTexto(el.id, e.target.value)} style={{ flex: 1 }} />
          <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0}>
            ⬆️
          </button>
          <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === elementos.length - 1}>
            ⬇️
          </button>
          {elementos.length > 2 && (
            <button type="button" className="icon-btn" onClick={() => removeElemento(el.id)}>
              🗑️
            </button>
          )}
        </div>
      ))}
      {elementos.length < 8 && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={addElemento}>
          ➕ Añadir elemento
        </button>
      )}
    </div>
  )
}

// ---------- Relaciona ----------
function RelacionaFields({ question, update }) {
  const pares = question.pares || []
  function setPar(id, patch) {
    update({ pares: pares.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  }
  function addPar() {
    if (pares.length >= 8) return
    update({ pares: [...pares, { id: uid('par'), izquierda: '', derecha: '' }] })
  }
  function removePar(id) {
    if (pares.length <= 2) return
    update({ pares: pares.filter((p) => p.id !== id) })
  }
  return (
    <div>
      <label>Parejas (columna izquierda ↔ columna derecha)</label>
      {pares.map((p) => (
        <div key={p.id} className="checkbox-row">
          <input type="text" value={p.izquierda} placeholder="Elemento A" onChange={(e) => setPar(p.id, { izquierda: e.target.value })} style={{ flex: 1 }} />
          <span>↔</span>
          <input type="text" value={p.derecha} placeholder="Pareja correcta" onChange={(e) => setPar(p.id, { derecha: e.target.value })} style={{ flex: 1 }} />
          {pares.length > 2 && (
            <button type="button" className="icon-btn" onClick={() => removePar(p.id)}>
              🗑️
            </button>
          )}
        </div>
      ))}
      {pares.length < 8 && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={addPar}>
          ➕ Añadir pareja
        </button>
      )}
    </div>
  )
}
