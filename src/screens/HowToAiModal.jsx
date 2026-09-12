import Modal from '../components/Modal'
import { CSV_COLUMNS } from '../utils/csv'

const PROMPT = `Genera un archivo CSV para un concurso de preguntas por equipos en clase. Debe tener exactamente estas columnas, en este orden, separadas por comas y con la primera fila como cabecera:

${CSV_COLUMNS.join(',')}

Reglas:
- "tipo" debe ser uno de: test, vf, hueco, corta, imagen, orden, relaciona.
- Para tipo "test": rellena opcion_a, opcion_b, opcion_c, opcion_d (y opcion_e/opcion_f si hace falta) y pon en "respuestas_correctas" la(s) letra(s) correctas separadas por "|" (ej: "b" o "a|c").
- Para tipo "vf": deja las opciones vacías y pon en "respuestas_correctas" el valor "V" o "F".
- Para tipo "hueco": escribe el enunciado con un hueco marcado como ___ y pon en "respuestas_aceptadas" las respuestas válidas separadas por "|". Si hay varios huecos, sepáralos con ";" y dentro de cada uno usa "|" para sinónimos.
- Para tipo "corta": pon en "respuestas_aceptadas" las respuestas o palabras clave válidas separadas por "|".
- Para tipo "imagen": deja imagen_url vacío (lo añadiré yo después) y describe en el enunciado lo que hay que señalar.
- Para tipo "orden": pon los elementos EN EL ORDEN CORRECTO en opcion_a, opcion_b, opcion_c... (mínimo 2, máximo 6).
- Para tipo "relaciona": pon los elementos de la izquierda en opcion_a, opcion_b... y sus parejas correctas EN EL MISMO ORDEN en "respuestas_aceptadas" separadas por "|".
- "puntos_maximos" es un número (por defecto 100).
- "puntos_parciales" son tres porcentajes separados por "|" (por defecto 25|50|75).
- "tiempo_segundos" es un número o vacío si no hay límite de tiempo.
- "permitir_rebote" es TRUE o FALSE.
- "maximo_rebotes" es un número (0 significa sin límite).
- "dificultad" es opcional: facil, media o dificil.
- Usa español correcto, con tildes y eñes, codificado en UTF-8.
- No incluyas explicaciones fuera del CSV: solo el CSV, empezando por la fila de cabecera.

Tema del concurso: [ESCRIBE AQUÍ EL TEMA, CURSO Y NÚMERO DE PREGUNTAS QUE QUIERES]`

export default function HowToAiModal({ onClose }) {
  return (
    <Modal title="Cómo pedir las preguntas a una IA" onClose={onClose} wide>
      <p>
        Copia este texto, complétalo con el tema que quieras y pégalo en tu asistente de IA favorito. Te devolverá un
        CSV que puedes pegar o subir directamente en «Importar CSV».
      </p>
      <div className="field">
        <textarea readOnly rows={16} value={PROMPT} onFocus={(e) => e.target.select()} />
      </div>
      <div className="modal-actions">
        <button
          className="btn btn-info"
          onClick={() => {
            navigator.clipboard?.writeText(PROMPT)
          }}
        >
          📋 Copiar prompt
        </button>
        <button className="btn btn-primary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  )
}
