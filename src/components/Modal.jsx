export default function Modal({ title, onClose, children, wide = false, actions = null }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal-box ${wide ? 'modal-wide' : ''}`}>
        <div className="flex-between mb-2">
          <h2>{title}</h2>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar" style={{ fontSize: '1.4rem' }}>
              ✕
            </button>
          )}
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  )
}
