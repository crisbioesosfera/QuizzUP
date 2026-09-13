import { useMemo, useState } from 'react'
import { listQuizzes, saveQuiz, deleteQuiz, getGame } from '../utils/storage'
import { createEmptyQuiz } from '../models'
import { uid } from '../utils/id'
import { downloadTextFile, questionsToCsvRows, rowsToCsvText } from '../utils/csv'
import ConfirmDialog from '../components/ConfirmDialog'
import PromptModal from '../components/PromptModal'
import ImportCsvModal from './ImportCsvModal'
import ImportJsonModal from './ImportJsonModal'
import HowToAiModal from './HowToAiModal'

export default function HomeScreen({ onEditQuiz, onConfigureTeams, onContinueGame, onGoToEnd }) {
  const [quizzes, setQuizzes] = useState(() => listQuizzes())
  const [modal, setModal] = useState(null) // { type, quiz }

  const gamesById = useMemo(() => {
    const map = {}
    quizzes.forEach((q) => {
      map[q.id] = getGame(q.id)
    })
    return map
  }, [quizzes])

  function refresh() {
    setQuizzes(listQuizzes())
  }

  function handleCreateNew() {
    const quiz = createEmptyQuiz('Nuevo concurso')
    saveQuiz(quiz)
    onEditQuiz(quiz.id)
  }

  function handleDuplicate(quiz) {
    const copy = {
      ...quiz,
      id: uid('quiz'),
      name: `${quiz.name} (copia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    saveQuiz(copy)
    refresh()
  }

  function handleRename(quiz, newName) {
    saveQuiz({ ...quiz, name: newName })
    setModal(null)
    refresh()
  }

  function handleDelete(quiz) {
    deleteQuiz(quiz.id)
    setModal(null)
    refresh()
  }

  function handleExportCsv(quiz) {
    const rows = questionsToCsvRows(quiz.questions)
    downloadTextFile(`${slug(quiz.name)}.csv`, rowsToCsvText(rows))
  }

  function handleExportJson(quiz) {
    downloadTextFile(`${slug(quiz.name)}.json`, JSON.stringify(quiz, null, 2), 'application/json')
  }

  function handleImportCsvNew(preguntas, quizName) {
    const quiz = createEmptyQuiz(quizName)
    quiz.questions = preguntas
    saveQuiz(quiz)
    setModal(null)
    refresh()
  }

  function handleImportJson(data) {
    const quiz = {
      ...createEmptyQuiz(data.name || 'Concurso importado'),
      ...data,
      id: uid('quiz'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    saveQuiz(quiz)
    setModal(null)
    refresh()
  }

  return (
    <div className="container">
      <header className="home-header">
        <div className="brand-badge">🏆</div>
        <h1 className="brand">
          Quizz<span className="brand-accent">UP</span>
        </h1>
        <p className="brand-tagline">Concursos de preguntas por equipos, en directo y al estilo de un programa de televisión.</p>
      </header>

      <div className="card">
        <h3>Empezar</h3>
        <div className="flex-gap">
          <button className="btn btn-primary btn-lg" onClick={handleCreateNew}>
            ➕ Crear concurso nuevo
          </button>
          <button className="btn btn-info" onClick={() => setModal({ type: 'importCsv' })}>
            📄 Importar desde CSV
          </button>
          <button className="btn btn-ghost" onClick={() => setModal({ type: 'importJson' })}>
            💾 Restaurar copia (JSON)
          </button>
          <button className="btn btn-ghost" onClick={() => setModal({ type: 'howToAi' })}>
            🤖 Cómo pedir preguntas a una IA
          </button>
        </div>
      </div>

      <div className="mt-3">
        <h3>Tus concursos ({quizzes.length})</h3>
        {quizzes.length === 0 && <p className="muted">Todavía no has creado ningún concurso.</p>}
        <div className="quiz-list">
          {quizzes.map((quiz) => {
            const game = gamesById[quiz.id]
            const hasUnfinishedGame = game && !game.finished
            const hasFinishedGame = game && game.finished
            return (
              <div className="card" key={quiz.id}>
                <div className="flex-between">
                  <h3 style={{ marginBottom: 4 }}>{quiz.name}</h3>
                  {hasUnfinishedGame && <span className="badge badge-warn">Partida en curso</span>}
                </div>
                <p className="muted">
                  {quiz.questions.length} preguntas · {quiz.teamsConfig.count} equipos
                </p>

                <div className="quiz-item-actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => onEditQuiz(quiz.id)}>
                    ✏️ Editar
                  </button>
                  {hasUnfinishedGame ? (
                    <button className="btn btn-sm btn-success" onClick={() => onContinueGame(quiz.id)}>
                      ▶️ Continuar partida
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-success"
                      disabled={quiz.questions.length === 0}
                      onClick={() => onConfigureTeams(quiz.id)}
                    >
                      🚀 Iniciar partida
                    </button>
                  )}
                  {hasFinishedGame && (
                    <button className="btn btn-sm btn-info" onClick={() => onGoToEnd(quiz.id)}>
                      🏁 Ver resultados
                    </button>
                  )}
                  <button className="btn btn-sm btn-ghost" onClick={() => handleDuplicate(quiz)}>
                    📑 Duplicar
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setModal({ type: 'rename', quiz })}>
                    🔤 Renombrar
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleExportCsv(quiz)}>
                    ⬇️ CSV
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleExportJson(quiz)}>
                    ⬇️ JSON
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => setModal({ type: 'delete', quiz })}>
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title="Eliminar concurso"
          message={`¿Seguro que quieres eliminar "${modal.quiz.name}"? Esta acción no se puede deshacer.`}
          danger
          confirmLabel="Eliminar"
          onConfirm={() => handleDelete(modal.quiz)}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'rename' && (
        <PromptModal
          title="Renombrar concurso"
          label="Nuevo nombre"
          initialValue={modal.quiz.name}
          onConfirm={(name) => handleRename(modal.quiz, name)}
          onCancel={() => setModal(null)}
        />
      )}

      {modal?.type === 'importCsv' && (
        <ImportCsvModal mode="new" onClose={() => setModal(null)} onImport={handleImportCsvNew} />
      )}

      {modal?.type === 'importJson' && (
        <ImportJsonModal onClose={() => setModal(null)} onImport={handleImportJson} />
      )}

      {modal?.type === 'howToAi' && <HowToAiModal onClose={() => setModal(null)} />}
    </div>
  )
}

function slug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'concurso'
}

