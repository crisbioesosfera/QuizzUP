import { useState } from 'react'
import Modal from './Modal'

export default function PromptModal({ title, label, initialValue = '', confirmLabel = 'Guardar', onConfirm, onCancel }) {
  const [value, setValue] = useState(initialValue)
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="field">
        <label>{label}</label>
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onConfirm(value.trim())
          }}
        />
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={!value.trim()} onClick={() => onConfirm(value.trim())}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
