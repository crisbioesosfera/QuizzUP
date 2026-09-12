import { uid } from './utils/id'

export const TEAM_COLORS = [
  '#ff5470', '#2dd4bf', '#facc15', '#60a5fa',
  '#a78bfa', '#fb923c', '#4ade80', '#f472b6',
]

export const TEAM_ICONS = ['🦁', '🦊', '🐯', '🐺', '🦅', '🐙', '🐲', '🦈']

export const TIPOS_PREGUNTA = [
  { value: 'test', label: 'Tipo test' },
  { value: 'vf', label: 'Verdadero o falso' },
  { value: 'hueco', label: 'Rellena el hueco' },
  { value: 'corta', label: 'Respuesta corta' },
  { value: 'imagen', label: 'Señala con el ratón' },
  { value: 'orden', label: 'Ordena los elementos' },
  { value: 'relaciona', label: 'Relaciona' },
]

export function createEmptyQuiz(name = 'Nuevo concurso') {
  const now = Date.now()
  return {
    id: uid('quiz'),
    name,
    createdAt: now,
    updatedAt: now,
    questions: [],
    teamsConfig: {
      count: 4,
      teams: [0, 1, 2, 3].map((i) => createTeam(i)),
    },
    settings: {
      turnMode: 'auto',
      reboundPolicy: 'full', // 'full' | 'fixed' | 'percent'
      reboundFixedAmount: 20,
      reboundPercent: 20,
    },
  }
}

export function createTeam(index) {
  return {
    id: uid('team'),
    name: `Equipo ${index + 1}`,
    color: TEAM_COLORS[index % TEAM_COLORS.length],
    icon: TEAM_ICONS[index % TEAM_ICONS.length],
  }
}

export function createEmptyQuestion(tipo = 'test', orden = 1) {
  const base = {
    id: uid('q'),
    orden,
    enunciado: '',
    tipo,
    imagen: '',
    explicacion: '',
    categoria: '',
    dificultad: '',
    puntosMaximos: 100,
    puntosParciales: [25, 50, 75],
    tiempoSegundos: null,
    permitirRebote: true,
    maximoRebotes: 0,
  }
  switch (tipo) {
    case 'test':
      return {
        ...base,
        opciones: [
          { id: 'a', texto: '' },
          { id: 'b', texto: '' },
        ],
        respuestasCorrectas: ['a'],
        mezclar: true,
      }
    case 'vf':
      return { ...base, correcta: true }
    case 'hueco':
      return { ...base, huecos: [[]] }
    case 'corta':
      return { ...base, respuestasAceptadas: [] }
    case 'imagen':
      return { ...base, zonas: [] }
    case 'orden':
      return {
        ...base,
        elementos: [
          { id: uid('el'), texto: '' },
          { id: uid('el'), texto: '' },
        ],
      }
    case 'relaciona':
      return {
        ...base,
        pares: [
          { id: uid('par'), izquierda: '', derecha: '' },
          { id: uid('par'), izquierda: '', derecha: '' },
        ],
      }
    default:
      return base
  }
}

export function createInitialGameState(quiz) {
  const teams = quiz.teamsConfig.teams.map((t) => ({ ...t, score: 0 }))
  const questionsState = {}
  quiz.questions.forEach((q) => {
    questionsState[q.id] = { status: 'disponible', respondidaPor: null, puntosOtorgados: 0 }
  })
  return {
    quizId: quiz.id,
    quizName: quiz.name,
    teams,
    turnOrder: teams.map((t) => t.id),
    turnMode: quiz.settings?.turnMode || 'auto',
    activeTeamId: teams[0]?.id || null,
    activeTeamIndex: 0,
    questionsState,
    currentQuestionId: null,
    currentAnswering: null, // { answeringTeamId, attemptedTeamIds: [], reboundCount, pointsAwardedThisQuestion }
    history: [],
    finished: false,
    startedAt: Date.now(),
  }
}

export function totalQuestions(quiz) {
  return quiz.questions.length
}
