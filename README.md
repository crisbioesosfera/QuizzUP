# Concurso por Equipos

Aplicación web para organizar concursos de preguntas por equipos en el aula, al estilo de un concurso de televisión. Pensada para usarse en directo, proyectada desde el ordenador del docente: sin cuentas, sin backend, sin multijugador online.

## Cómo ejecutarla

```bash
npm install
npm run dev
```

Abre la URL que indique Vite (por defecto `http://localhost:5173`). Todo se guarda en el `localStorage` del navegador.

## Funcionalidades principales

- Editor de concursos (hasta 50 preguntas) con 7 tipos de pregunta: test, verdadero/falso, rellenar hueco, respuesta corta, señalar en imagen, ordenar elementos y relacionar columnas.
- Configuración de 2 a 8 equipos (nombre, color, icono).
- Panel de concurso al estilo TV con casillas numeradas y estados visuales (disponible, abierta, correcta, fallida, rebote).
- Gestión de puntuaciones: respuesta correcta, incorrecta, parcial (con botones rápidos configurables), rebote con distintas políticas de penalización, ajustes manuales, deshacer e historial.
- Importación/exportación de preguntas en CSV (con validación y previsualización) y copias de seguridad completas en JSON.
- Pantalla final con clasificación, empates, pregunta de desempate, revisión de preguntas y exportación de resultados.
- Sonidos generados con Web Audio API (sin archivos externos) y botón de silencio.
- Guardado automático de la partida en curso para poder continuarla tras recargar la página.

## Plantilla CSV

Descárgala desde "Importar desde CSV → Descargar CSV de ejemplo", o pide una a una IA con el prompt incluido en "Cómo pedir preguntas a una IA".
