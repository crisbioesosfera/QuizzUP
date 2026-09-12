import { uid } from './id'

export const CSV_COLUMNS = [
  'numero',
  'categoria',
  'tipo',
  'enunciado',
  'opcion_a',
  'opcion_b',
  'opcion_c',
  'opcion_d',
  'opcion_e',
  'opcion_f',
  'respuestas_correctas',
  'respuestas_aceptadas',
  'explicacion',
  'puntos_maximos',
  'puntos_parciales',
  'tiempo_segundos',
  'permitir_rebote',
  'maximo_rebotes',
  'imagen_url',
  'dificultad',
]

export const TIPOS_CSV = {
  test: 'test',
  vf: 'vf',
  hueco: 'hueco',
  corta: 'corta',
  imagen: 'imagen',
  orden: 'orden',
  relaciona: 'relaciona',
}

// ---------- Parser CSV robusto (soporta comillas, comas y saltos de línea dentro de campos) ----------
export function parseCsvText(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field)
        field = ''
      } else if (ch === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else {
        field += ch
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

function toBool(v) {
  if (typeof v !== 'string') return false
  return v.trim().toUpperCase() === 'TRUE'
}

function splitList(v) {
  if (!v) return []
  return v
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function csvRowsToObjects(rows) {
  if (rows.length === 0) return { header: [], objects: [] }
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const objects = rows.slice(1).map((r) => {
    const obj = {}
    header.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim()
    })
    return obj
  })
  return { header, objects }
}

// Valida y transforma filas de objeto CSV a preguntas. Devuelve { preguntas, errores }
export function validateAndBuildQuestions(objects) {
  const errores = []
  const preguntas = []
  const tiposValidos = Object.values(TIPOS_CSV)

  objects.forEach((row, idx) => {
    const numeroFila = idx + 2 // +2: fila 1 es cabecera, index base 0
    const tipo = (row.tipo || '').trim().toLowerCase()
    const enunciado = (row.enunciado || '').trim()

    if (!enunciado) {
      errores.push({ fila: numeroFila, error: 'El enunciado está vacío.' })
      return
    }
    if (!tiposValidos.includes(tipo)) {
      errores.push({
        fila: numeroFila,
        error: `Tipo "${row.tipo}" no reconocido. Usa uno de: ${tiposValidos.join(', ')}.`,
      })
      return
    }

    const puntosMaximos = Number(row.puntos_maximos) || 100
    const puntosParciales = row.puntos_parciales
      ? row.puntos_parciales
          .split('|')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n))
      : [25, 50, 75]
    const tiempoSegundos = row.tiempo_segundos ? Number(row.tiempo_segundos) : null
    const permitirRebote = row.permitir_rebote ? toBool(row.permitir_rebote) : true
    const maximoRebotes = row.maximo_rebotes ? Number(row.maximo_rebotes) : 0

    const base = {
      id: uid('q'),
      orden: row.numero ? Number(row.numero) : idx + 1,
      categoria: row.categoria || '',
      tipo,
      enunciado,
      imagen: row.imagen_url || '',
      explicacion: row.explicacion || '',
      dificultad: row.dificultad || '',
      puntosMaximos,
      puntosParciales,
      tiempoSegundos,
      permitirRebote,
      maximoRebotes,
    }

    const opciones = ['opcion_a', 'opcion_b', 'opcion_c', 'opcion_d', 'opcion_e', 'opcion_f']
      .map((k) => row[k])
      .filter((v) => v && v.trim().length > 0)

    if (tipo === 'test') {
      if (opciones.length < 2) {
        errores.push({ fila: numeroFila, error: 'Las preguntas tipo test necesitan al menos 2 opciones.' })
        return
      }
      const letras = ['a', 'b', 'c', 'd', 'e', 'f']
      const opcionesObj = opciones.map((text, i) => ({ id: letras[i], texto: text }))
      const correctas = splitList((row.respuestas_correctas || '').toLowerCase())
      const correctasValidas = correctas.filter((c) => letras.slice(0, opciones.length).includes(c))
      if (correctasValidas.length === 0) {
        errores.push({
          fila: numeroFila,
          error: 'Indica al menos una respuesta correcta en "respuestas_correctas" (a, b, c...).',
        })
        return
      }
      preguntas.push({ ...base, opciones: opcionesObj, respuestasCorrectas: correctasValidas, mezclar: true })
    } else if (tipo === 'vf') {
      const val = (row.respuestas_correctas || '').trim().toUpperCase()
      if (val !== 'V' && val !== 'F') {
        errores.push({ fila: numeroFila, error: 'Para verdadero/falso, "respuestas_correctas" debe ser V o F.' })
        return
      }
      preguntas.push({ ...base, correcta: val === 'V' })
    } else if (tipo === 'hueco') {
      const grupos = (row.respuestas_aceptadas || '').split(';').map((g) => splitList(g))
      if (grupos.length === 0 || grupos.every((g) => g.length === 0)) {
        errores.push({ fila: numeroFila, error: 'Indica las respuestas aceptadas para el/los huecos.' })
        return
      }
      preguntas.push({ ...base, huecos: grupos })
    } else if (tipo === 'corta') {
      const aceptadas = splitList(row.respuestas_aceptadas)
      if (aceptadas.length === 0) {
        errores.push({ fila: numeroFila, error: 'Indica al menos una respuesta aceptada o palabra clave.' })
        return
      }
      preguntas.push({ ...base, respuestasAceptadas: aceptadas })
    } else if (tipo === 'imagen') {
      if (!base.imagen) {
        errores.push({ fila: numeroFila, error: 'Las preguntas de "señala con el ratón" necesitan imagen_url.' })
        return
      }
      preguntas.push({ ...base, zonas: [] })
    } else if (tipo === 'orden') {
      if (opciones.length < 2) {
        errores.push({ fila: numeroFila, error: 'Las preguntas de ordenar necesitan al menos 2 elementos.' })
        return
      }
      preguntas.push({ ...base, elementos: opciones.map((texto) => ({ id: uid('el'), texto })) })
    } else if (tipo === 'relaciona') {
      const derechos = splitList(row.respuestas_aceptadas)
      if (opciones.length < 2 || derechos.length < 2 || opciones.length !== derechos.length) {
        errores.push({
          fila: numeroFila,
          error: 'Relaciona necesita el mismo número de elementos en opciones (izquierda) y respuestas_aceptadas (derecha).',
        })
        return
      }
      const pares = opciones.map((texto, i) => ({
        id: uid('par'),
        izquierda: texto,
        derecha: derechos[i],
      }))
      preguntas.push({ ...base, pares })
    }
  })

  return { preguntas, errores }
}

export function questionsToCsvRows(questions) {
  const rows = [CSV_COLUMNS]
  questions.forEach((q, i) => {
    const row = {}
    row.numero = q.orden ?? i + 1
    row.categoria = q.categoria || ''
    row.tipo = q.tipo
    row.enunciado = q.enunciado || ''
    row.opcion_a = ''
    row.opcion_b = ''
    row.opcion_c = ''
    row.opcion_d = ''
    row.opcion_e = ''
    row.opcion_f = ''
    row.respuestas_correctas = ''
    row.respuestas_aceptadas = ''
    row.explicacion = q.explicacion || ''
    row.puntos_maximos = q.puntosMaximos ?? 100
    row.puntos_parciales = (q.puntosParciales || []).join('|')
    row.tiempo_segundos = q.tiempoSegundos ?? ''
    row.permitir_rebote = q.permitirRebote ? 'TRUE' : 'FALSE'
    row.maximo_rebotes = q.maximoRebotes ?? ''
    row.imagen_url = q.imagen || ''
    row.dificultad = q.dificultad || ''

    if (q.tipo === 'test') {
      const letras = ['a', 'b', 'c', 'd', 'e', 'f']
      ;(q.opciones || []).forEach((op, idx) => {
        row[`opcion_${letras[idx]}`] = op.texto
      })
      row.respuestas_correctas = (q.respuestasCorrectas || []).join('|')
    } else if (q.tipo === 'vf') {
      row.respuestas_correctas = q.correcta ? 'V' : 'F'
    } else if (q.tipo === 'hueco') {
      row.respuestas_aceptadas = (q.huecos || []).map((g) => g.join('|')).join(';')
    } else if (q.tipo === 'corta') {
      row.respuestas_aceptadas = (q.respuestasAceptadas || []).join('|')
    } else if (q.tipo === 'orden') {
      const letras = ['a', 'b', 'c', 'd', 'e', 'f']
      ;(q.elementos || []).forEach((el, idx) => {
        row[`opcion_${letras[idx]}`] = el.texto
      })
    } else if (q.tipo === 'relaciona') {
      const letras = ['a', 'b', 'c', 'd', 'e', 'f']
      ;(q.pares || []).forEach((p, idx) => {
        row[`opcion_${letras[idx]}`] = p.izquierda
      })
      row.respuestas_aceptadas = (q.pares || []).map((p) => p.derecha).join('|')
    }

    rows.push(CSV_COLUMNS.map((c) => row[c] ?? ''))
  })
  return rows
}

function escapeCsvField(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function rowsToCsvText(rows) {
  return rows.map((r) => r.map(escapeCsvField).join(',')).join('\n')
}

export function downloadTextFile(filename, text, mime = 'text/csv;charset=utf-8;') {
  const bom = mime.includes('csv') ? '﻿' : ''
  const blob = new Blob([bom + text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const SAMPLE_CSV_ROWS = [
  CSV_COLUMNS,
  [
    '1', 'Ciencias', 'test', '¿Cuál es el planeta más cercano al Sol?',
    'Venus', 'Mercurio', 'Marte', 'Tierra', '', '',
    'b', '', 'Mercurio es el planeta más próximo al Sol.',
    '100', '25|50|75', '20', 'TRUE', '2', '', 'facil',
  ],
  [
    '2', 'Historia', 'vf', 'La Segunda Guerra Mundial terminó en 1945.',
    '', '', '', '', '', '', 'V', '', 'Terminó en 1945 con la rendición de Japón.',
    '100', '25|50|75', '15', 'TRUE', '2', '', 'facil',
  ],
  [
    '3', 'Lengua', 'hueco', 'El ___ es el astro que ilumina la Tierra durante el día.',
    '', '', '', '', '', '', '', 'sol', 'Se refiere al Sol.',
    '100', '25|50|75', '', 'TRUE', '1', '', 'facil',
  ],
  [
    '4', 'Geografía', 'corta', '¿Cuál es la capital de Francia?',
    '', '', '', '', '', '', '', 'paris|parís', 'La capital de Francia es París.',
    '100', '25|50|75', '20', 'TRUE', '2', '', 'media',
  ],
  [
    '5', 'Matemáticas', 'orden', 'Ordena estos números de menor a mayor.',
    '2', '15', '8', '23', '', '', '', '', 'Orden: 2, 8, 15, 23.',
    '100', '25|50|75', '30', 'FALSE', '0', '', 'media',
  ],
  [
    '6', 'Inglés', 'relaciona', 'Relaciona cada palabra en inglés con su traducción.',
    'Dog', 'Cat', 'House', 'Book', '', '', '', 'Perro|Gato|Casa|Libro',
    'Vocabulario básico en inglés.', '100', '25|50|75', '', 'FALSE', '0', '', 'facil',
  ],
]

export function getSampleCsvText() {
  return rowsToCsvText(SAMPLE_CSV_ROWS)
}
