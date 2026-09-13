import { useEffect, useState } from 'react'
import { getQuiz, saveQuiz } from '../utils/storage'
import { createEmptyQuestion, TIPOS_PREGUNTA } from '../models'
import QuestionForm from '../components/QuestionForm'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import ImportCsvModal from './ImportCsvModal'
import HowToAiModal from './HowToAiModal'
import { downloadTextFile, questionsToCsvRows, rowsToCsvText } from '../utils/csv'
import { uid } from '../utils/id'

const MAX_QUESTIONS = 50

export default function EditorScreen({ quizId, onBack, onConfigureTeams }) {
  const [quiz, setQuiz] = useState(() => getQuiz(quizId))
  const [selectedId, setSelectedId] = useState(quiz?.questions[0]?.id || null)
  const [modal, setModal] = useState(null)
  const [typePicker, setTypePicker] = useState(false)

  useEffect(() => {
    if (quiz) saveQuiz(quiz)
  }, [quiz])

  if (!quiz) {
    return (
      <div className="container">
        <p>No se encontró el concurso.</p>
        <button className="btn" onClick={onBack}>
          Volver
        </button>
      </div>
    )
  }

  const selectedIndex = quiz.questions.findIndex((q) => q.id === selectedId)
  const selected = selectedIndex >= 0 ? quiz.questions[selectedIndex] : null

  function updateQuiz(patch) {
    setQuiz((q) => ({ ...q, ...patch, updatedAt: Date.now() }))
  }

  function updateQuestion(updated) {
    updateQuiz({ questions: quiz.questions.map((q) => (q.id === updated.id ? updated : q)) })
  }

  function addQuestion(tipo) {
    if (quiz.questions.length >= MAX_QUESTIONS) return
    const nueva = createEmptyQuestion(tipo, quiz.questions.length + 1)
    updateQuiz({ questions: [...quiz.questions, nueva] })
    setSelectedId(nueva.id)
    setTypePicker(false)
  }

  function duplicateQuestion(q) {
    if (quiz.questions.length >= MAX_QUESTIONS) return
    const copy = { ...JSON.parse(JSON.stringify(q)), id: uid('q'), orden: quiz.questions.length + 1 }
    updateQuiz({ questions: [...quiz.questions, copy] })
    setSelectedId(copy.id)
  }

  function deleteQuestion(id) {
    const remaining = quiz.questions.filter((q) => q.id !== id)
    updateQuiz({ questions: remaining })
    if (selectedId === id) setSelectedId(remaining[0]?.id || null)
    setModal(null)
  }

  function moveQuestion(id, dir) {
    const idx = quiz.questions.findIndex((q) => q.id === id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= quiz.questions.length) return
    const copy = quiz.questions.slice()
    ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
    updateQuiz({ questions: copy.map((q, i) => ({ ...q, orden: i + 1 })) })
  }

  function handleImportCsvAppend(preguntas) {
    const espacio = MAX_QUESTIONS - quiz.questions.length
    const aAgregar = preguntas.slice(0, espacio).map((p, i) => ({ ...p, orden: quiz.questions.length + i + 1 }))
    updateQuiz({ questions: [...quiz.questions, ...aAgregar] })
    setModal(null)
  }

  function handleExportCsv() {
    const rows = questionsToCsvRows(quiz.questions)
    downloadTextFile(`${quiz.name}.csv`, rowsToCsvText(rows))
  }

  function handleExportJson() {
    downloadTextFile(`${quiz.name}.json`, JSON.stringify(quiz, null, 2), 'application/json')
  }

  return (
    <div>
      <div className="topbar">
        <div className="flex-gap" style={{ alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            ← Inicio
          </button>
          <input
            type="text"
            value={quiz.name}
            onChange={(e) => updateQuiz({ name: e.target.value })}
            style={{ fontWeight: 800, fontSize: '1.1rem', minWidth: 220 }}
          />
          <span className="badge">{quiz.questions.length} / {MAX_QUESTIONS} preguntas</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'importCsv' })}>
            📄 Importar CSV
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportCsv}>
            ⬇️ CSV
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportJson}>
            ⬇️ JSON
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'howToAi' })}>
            🤖 Pedir a IA
          </button>
          <button className="btn btn-success" disabled={quiz.questions.length === 0} onClick={onConfigureTeams}>
            🚀 Configurar equipos e iniciar
          </button>
        </div>
      </div>

      <div className="container-wide">
        <div className="editor-layout">
          <div className="card">
            <div className="flex-between mb-2">
              <h3 style={{ margin: 0 }}>Preguntas</h3>
              <button className="btn btn-primary btn-sm" disabled={quiz.questions.length >= MAX_QUESTIONS} onClick={() => setTypePicker(true)}>
                ➕ Añadir
              </button>
            </div>
            <div className="question-list">
              {quiz.questions.length === 0 && <p className="muted">Añade tu primera pregunta.</p>}
              {quiz.questions.map((q, i) => (
                <div key={q.id} className={`question-list-item ${q.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(q.id)}>
                  <span className="num">{i + 1}</span>
                  <span className="title">{q.enunciado || '(sin enunciado)'}</span>
                  <div className="mini-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" title="Subir" onClick={() => moveQuestion(q.id, -1)} disabled={i === 0}>
                      ⬆️
                    </button>
                    <button className="icon-btn" title="Bajar" onClick={() => moveQuestion(q.id, 1)} disabled={i === quiz.questions.length - 1}>
                      ⬇️
                    </button>
                    <button className="icon-btn" title="Duplicar" onClick={() => duplicateQuestion(q)}>
                      📑
                    </button>
                    <button className="icon-btn" title="Eliminar" onClick={() => setModal({ type: 'deleteQuestion', question: q })}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            {selected ? (
              <>
                <div className="flex-between mb-2">
                  <button className="btn btn-ghost btn-sm" disabled={selectedIndex <= 0} onClick={() => setSelectedId(quiz.questions[selectedIndex - 1].id)}>
                    ‹ Anterior
                  </button>
                  <span className="muted">
                    Pregunta {selectedIndex + 1} de {quiz.questions.length}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={selectedIndex >= quiz.questions.length - 1}
                    onClick={() => setSelectedId(quiz.questions[selectedIndex + 1].id)}
                  >
                    Siguiente ›
                  </button>
                </div>
                <QuestionForm key={selected.id} question={selected} onChange={updateQuestion} />
                <div className="flex-between mt-3">
                  <button className="btn btn-ghost" disabled={selectedIndex <= 0} onClick={() => setSelectedId(quiz.questions[selectedIndex - 1].id)}>
                    ‹ Anterior
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={selectedIndex >= quiz.questions.length - 1}
                    onClick={() => setSelectedId(quiz.questions[selectedIndex + 1].id)}
                  >
                    Siguiente ›
                  </button>
                </div>
              </>
            ) : (
              <p className="muted">Selecciona una pregunta de la lista, o añade una nueva.</p>
            )}
          </div>
        </div>
      </div>

      {typePicker && (
        <Modal title="Elige el tipo de pregunta" onClose={() => setTypePicker(false)}>
          <div className="home-grid">
            {TIPOS_PREGUNTA.map((t) => (
              <button key={t.value} className="btn btn-lg btn-block" onClick={() => addQuestion(t.value)}>
                {t.label}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal?.type === 'deleteQuestion' && (
        <ConfirmDialog
          title="Eliminar pregunta"
          message={`¿Eliminar la pregunta "${modal.question.enunciado || '(sin enunciado)'}"? Esta acción no se puede deshacer.`}
          danger
          confirmLabel="Eliminar"
          onConfirm={() => deleteQuestion(modal.question.id)}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'importCsv' && (
        <ImportCsvModal mode="append" onClose={() => setModal(null)} onImport={handleImportCsvAppend} />
      )}

      {modal?.type === 'howToAi' && <HowToAiModal onClose={() => setModal(null)} />}
    </div>
  )
}
