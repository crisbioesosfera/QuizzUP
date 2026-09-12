import { useState, useRef } from 'react'
import Modal from '../components/Modal'

export default function ImportJsonModal({ onClose, onImport }) {
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.questions || !Array.isArray(data.questions)) {
          setError('El archivo no parece una copia de seguridad válida (falta "questions").')
          return
        }
        onImport(data)
      } catch (err) {
        setError('No se pudo leer el archivo JSON: ' + err.message)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <Modal title="Restaurar copia de seguridad (JSON)" onClose={onClose}>
      <p>Selecciona un archivo .json exportado previamente desde esta aplicación. Se creará un nuevo concurso con su contenido completo (incluidas imágenes y zonas interactivas).</p>
      <button className="btn btn-info" onClick={() => fileInputRef.current?.click()}>
        📂 Elegir archivo JSON
      </button>
      <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={handleFile} />
      {fileName && <p className="muted mt-1">{fileName}</p>}
      {error && <p className="error-text mt-1">{error}</p>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  )
}
