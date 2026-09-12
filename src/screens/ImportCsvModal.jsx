import { useState, useRef } from 'react'
import Modal from '../components/Modal'
import { parseCsvText, csvRowsToObjects, validateAndBuildQuestions, getSampleCsvText, downloadTextFile } from '../utils/csv'

export default function ImportCsvModal({ mode = 'new', onClose, onImport }) {
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [quizName, setQuizName] = useState('Concurso importado')
  const [result, setResult] = useState(null) // { preguntas, errores }
  const fileInputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText(ev.target.result)
      setResult(null)
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleParse() {
    if (!csvText.trim()) return
    const rows = parseCsvText(csvText)
    const { objects } = csvRowsToObjects(rows)
    const { preguntas, errores } = validateAndBuildQuestions(objects)
    setResult({ preguntas, errores })
  }

  function handleConfirm() {
    if (!result || result.preguntas.length === 0) return
    onImport(result.preguntas, quizName)
  }

  return (
    <Modal title="Importar preguntas desde CSV" onClose={onClose} wide>
      {mode === 'new' && (
        <div className="field">
          <label>Nombre del nuevo concurso</label>
          <input type="text" value={quizName} onChange={(e) => setQuizName(e.target.value)} />
        </div>
      )}

      <div className="field">
        <label>Archivo CSV</label>
        <div className="flex-gap">
          <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
            📂 Elegir archivo CSV
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => downloadTextFile('plantilla_concurso.csv', getSampleCsvText())}
          >
            ⬇️ Descargar CSV de ejemplo
          </button>
          {fileName && <span className="muted">{fileName}</span>}
        </div>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
      </div>

      <div className="field">
        <label>O pega aquí el contenido CSV</label>
        <textarea
          rows={6}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value)
            setResult(null)
          }}
          placeholder="numero,categoria,tipo,enunciado,..."
        />
      </div>

      <button className="btn btn-info" onClick={handleParse} disabled={!csvText.trim()}>
        🔍 Previsualizar y validar
      </button>

      {result && (
        <div className="mt-3">
          <div className="flex-gap mb-2">
            <span className="badge badge-success">{result.preguntas.length} preguntas válidas</span>
            {result.errores.length > 0 && (
              <span className="badge badge-warn">{result.errores.length} filas con errores</span>
            )}
          </div>

          {result.errores.length > 0 && (
            <div className="scroll-area mb-2">
              <table className="table-simple">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errores.map((e, i) => (
                    <tr key={i}>
                      <td>{e.fila}</td>
                      <td className="error-text">{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.preguntas.length > 0 && (
            <div className="scroll-area">
              <table className="table-simple">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Enunciado</th>
                    <th>Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {result.preguntas.map((q) => (
                    <tr key={q.id}>
                      <td>{q.orden}</td>
                      <td>{q.tipo}</td>
                      <td>{q.categoria}</td>
                      <td>{q.enunciado}</td>
                      <td>{q.puntosMaximos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={handleConfirm} disabled={!result || result.preguntas.length === 0}>
          ✅ Confirmar importación
        </button>
      </div>
    </Modal>
  )
}
