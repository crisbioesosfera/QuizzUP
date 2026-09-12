import { useEffect, useState, useCallback } from 'react'
import HomeScreen from './screens/HomeScreen'
import EditorScreen from './screens/EditorScreen'
import TeamsSetupScreen from './screens/TeamsSetupScreen'
import GamePanelScreen from './screens/GamePanelScreen'
import EndScreen from './screens/EndScreen'
import MuteButton from './components/MuteButton'
import { buildDemoQuiz } from './data/demoQuiz'
import { getAllQuizzes, saveQuiz, saveGame, deleteGame } from './utils/storage'
import { createInitialGameState } from './models'

// Vistas: 'home' | 'editor' | 'teams' | 'game' | 'end'

export default function App() {
  const [view, setView] = useState('home')
  const [currentQuizId, setCurrentQuizId] = useState(null)
  const [homeRefreshKey, setHomeRefreshKey] = useState(0)

  useEffect(() => {
    const all = getAllQuizzes()
    if (Object.keys(all).length === 0) {
      const demo = buildDemoQuiz()
      saveQuiz(demo)
      setHomeRefreshKey((k) => k + 1)
    }
  }, [])

  const goHome = useCallback(() => {
    setCurrentQuizId(null)
    setView('home')
    setHomeRefreshKey((k) => k + 1)
  }, [])

  const openEditor = useCallback((quizId) => {
    setCurrentQuizId(quizId)
    setView('editor')
  }, [])

  const openTeamsSetup = useCallback((quizId) => {
    setCurrentQuizId(quizId)
    setView('teams')
  }, [])

  const startGameWithQuiz = useCallback((quiz) => {
    const fresh = createInitialGameState(quiz)
    saveGame(quiz.id, fresh)
    setCurrentQuizId(quiz.id)
    setView('game')
  }, [])

  const continueGame = useCallback((quizId) => {
    setCurrentQuizId(quizId)
    setView('game')
  }, [])

  const goToEnd = useCallback((quizId) => {
    setCurrentQuizId(quizId)
    setView('end')
  }, [])

  return (
    <div className="app-shell">
      {view === 'home' && (
        <HomeScreen
          key={homeRefreshKey}
          onEditQuiz={openEditor}
          onConfigureTeams={openTeamsSetup}
          onContinueGame={continueGame}
          onGoToEnd={goToEnd}
        />
      )}
      {view === 'editor' && currentQuizId && (
        <EditorScreen quizId={currentQuizId} onBack={goHome} onConfigureTeams={() => setView('teams')} />
      )}
      {view === 'teams' && currentQuizId && (
        <TeamsSetupScreen
          quizId={currentQuizId}
          onBack={() => setView('editor')}
          onBackHome={goHome}
          onStartGame={startGameWithQuiz}
        />
      )}
      {view === 'game' && currentQuizId && (
        <GamePanelScreen quizId={currentQuizId} onExit={goHome} onFinish={() => setView('end')} />
      )}
      {view === 'end' && currentQuizId && (
        <EndScreen quizId={currentQuizId} onExit={goHome} onPlayAgain={() => setView('game')} />
      )}
      <MuteButton />
    </div>
  )
}
