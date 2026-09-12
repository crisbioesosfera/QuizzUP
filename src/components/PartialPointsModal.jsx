import { useState } from 'react'
import Modal from './Modal'

export default function PartialPointsModal({ puntosMaximos, puntosParciales, onConfirm, onCancel }) {
  const [manual, setManual] = useState('')

  return (
    <Modal title="Puntuación parcial" onClose={onCancel}>
      <p>Puntos máximos de la pregunta: <strong>{puntosMaximos}</strong></p>
      <label>Botones rápidos</label>
      <div className="flex-gap mb-2">
        {(puntosParciales || []).map((pct) => (
          <button key={pct} className="btn btn-info" onClick={() => onConfirm(Math.round((puntosMaximos * pct) / 100))}>
            {pct}% ({Math.round((puntosMaximos * pct) / 100)} pts)
          </button>
        ))}
      </div>
      <div className="field">
        <label>O introduce los puntos manualmente</label>
        <div className="flex-gap">
          <input type="number" value={manual} onChange={(e) => setManual(e.target.value)} style={{ maxWidth: 140 }} />
          <button className="btn btn-primary" disabled={manual === ''} onClick={() => onConfirm(Number(manual))}>
            Conceder puntos
          </button>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
