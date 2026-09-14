import { uid } from './utils/id'
import { shuffleArray } from './utils/shuffle'

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
      orderMode: 'fijo', // 'fijo' | 'aleatorio'
      reboundMode: 'manual', // 'manual' | 'automatico'
      reboundPolicy: 'full', // 'full' | 'fixed' | 'percent'
      reboundFixedAmount: 20,
      reboundPercent: 20,
      wildcards: { ...DEFAULT_WILDCARD_COUNTS },
    },
  }
}

// tipos: null = disponible en cualquier tipo de pregunta; si no, solo en esos tipos.
export const WILDCARD_INFO = {
  doble: { label: 'Doble o nada', icon: '🎲', tipos: null },
  cincuenta: { label: '50/50', icon: '✂️', tipos: ['test'] },
  cambiar: { label: 'Cambiar pregunta', icon: '🔄', tipos: null },
  segunda: { label: 'Segunda oportunidad', icon: '🔂', tipos: null },
  asegurado: { label: 'Puntos asegurados', icon: '🛡️', tipos: null },
  pieza: { label: 'Coloca una pieza', icon: '🧩', tipos: ['orden'] },
  pareja: { label: 'Revela una pareja', icon: '🔗', tipos: ['relaciona'] },
}

export const DEFAULT_WILDCARD_COUNTS = { doble: 1, cincuenta: 1, cambiar: 1, segunda: 1, asegurado: 1, pieza: 1, pareja: 1 }

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
      return { ...base, correcta: true, permitirRebote: false }
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

const CAMPOS_COMUNES = [
  'id',
  'orden',
  'enunciado',
  'imagen',
  'explicacion',
  'categoria',
  'dificultad',
  'puntosMaximos',
  'puntosParciales',
  'tiempoSegundos',
  'permitirRebote',
  'maximoRebotes',
]

// Cambia el tipo de una pregunta ya creada, conservando los campos comunes
// (enunciado, puntos, tiempo, rebote...) y reiniciando los campos propios
// del tipo anterior (opciones, huecos, zonas, elementos, pares...).
export function convertQuestionType(question, nuevoTipo) {
  if (question.tipo === nuevoTipo) return question
  const fresh = createEmptyQuestion(nuevoTipo, question.orden)
  const comunes = {}
  CAMPOS_COMUNES.forEach((campo) => {
    if (question[campo] !== undefined) comunes[campo] = question[campo]
  })
  return { ...fresh, ...comunes, tipo: nuevoTipo }
}

export function createInitialGameState(quiz) {
  const wildcardCounts = { ...DEFAULT_WILDCARD_COUNTS, ...(quiz.settings?.wildcards || {}) }
  const teams = quiz.teamsConfig.teams.map((t) => ({ ...t, score: 0, comodines: { ...wildcardCounts } }))
  const questionsState = {}
  quiz.questions.forEach((q) => {
    questionsState[q.id] = { status: 'disponible', respondidaPor: null, puntosOtorgados: 0 }
  })
  const orderMode = quiz.settings?.orderMode || 'fijo'
  const questionIds = quiz.questions.map((q) => q.id)
  return {
    quizId: quiz.id,
    quizName: quiz.name,
    teams,
    turnOrder: teams.map((t) => t.id),
    turnMode: quiz.settings?.turnMode || 'auto',
    orderMode,
    wildcardCounts: wildcardCounts,
    tileOrder: orderMode === 'aleatorio' ? shuffleArray(questionIds) : questionIds,
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
