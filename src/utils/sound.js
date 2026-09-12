import { getSettings, saveSettings } from './storage'

let ctx = null
function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) ctx = new AudioCtx()
  }
  return ctx
}

function isMuted() {
  return !!getSettings().soundMuted
}

export function setMuted(muted) {
  const s = getSettings()
  saveSettings({ ...s, soundMuted: muted })
}

export function toggleMuted() {
  const muted = !isMuted()
  setMuted(muted)
  return muted
}

function tone(freq, start, duration, type = 'sine', gain = 0.18) {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = 0
  osc.connect(g)
  g.connect(c.destination)
  const t0 = c.currentTime + start
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

function play(sequence) {
  if (isMuted()) return
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  sequence.forEach(([freq, start, duration, type, gain]) => tone(freq, start, duration, type, gain))
}

export const sounds = {
  correct: () => play([[523.25, 0, 0.14, 'triangle'], [659.25, 0.12, 0.14, 'triangle'], [783.99, 0.24, 0.22, 'triangle']]),
  incorrect: () => play([[220, 0, 0.18, 'sawtooth', 0.15], [174.61, 0.14, 0.28, 'sawtooth', 0.15]]),
  rebound: () => play([[392, 0, 0.1, 'square', 0.12], [493.88, 0.09, 0.12, 'square', 0.12]]),
  open: () => play([[440, 0, 0.08, 'sine', 0.12], [554.37, 0.07, 0.1, 'sine', 0.12]]),
  click: () => play([[300, 0, 0.05, 'sine', 0.08]]),
  final: () =>
    play([
      [523.25, 0, 0.16, 'triangle'],
      [659.25, 0.15, 0.16, 'triangle'],
      [783.99, 0.3, 0.16, 'triangle'],
      [1046.5, 0.45, 0.35, 'triangle'],
    ]),
}

export { isMuted }
