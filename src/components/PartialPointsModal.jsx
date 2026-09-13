import { useState } from 'react'
import Modal from './Modal'

export default function PartialPointsModal({ puntosMaximos, puntosOriginales, puntosParciales, onConfirm, onCancel }) {
  const [manual, setManual] = useState('')
  const hayDescuento = puntosOriginales != null && puntosOriginales !== puntosMaximos

  return (
    <Modal title="Puntuación parcial" onClose={onCancel}>
      <p>
        Puntos en juego para esta pregunta: <strong>{puntosMaximos}</strong>
        {hayDescuento && (
          <>
            {' '}
            (<s>{puntosOriginales}</s> por el rebote)
          </>
        )}
      </p>
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
