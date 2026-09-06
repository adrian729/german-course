 
 
 
 
 
 
 

export type Rate = 0.75 | 0.9 | 1.0

const RATE_KEY = 'tts-rate'

export const RATES: Rate[] = [0.75, 0.9, 1.0]
export const RATE_LABEL: Record<Rate, string> = { 0.75: 'Slow', 0.9: 'Normal', 1.0: 'Native' }

export const getRate = (): Rate => {
  const v = Number(localStorage.getItem(RATE_KEY))
  return RATES.includes(v as Rate) ? (v as Rate) : 0.9
}

export const setRate = (rate: Rate): void => {
  localStorage.setItem(RATE_KEY, String(rate))
}

let voices: SpeechSynthesisVoice[] | null = null

function readVoices(): SpeechSynthesisVoice[] {
  try {
    return window.speechSynthesis?.getVoices() ?? []
  } catch {
    return []
  }
}

function resolveVoice(): SpeechSynthesisVoice | null {
  if (voices === null || voices.length === 0) voices = readVoices()
  if (!voices || voices.length === 0) return null
  const exact = voices.find((v) => v.lang === 'de-DE')
  if (exact) return exact
  const anyDe = voices.find((v) => v.lang.startsWith('de-'))
  if (anyDe) return anyDe
  return voices.find((v) => v.lang.toLowerCase().startsWith('de')) ?? null
}

let available: boolean | null = null

/** Whether a usable German voice exists. Re-probes while voices are empty. */
export function audioAvailable(): boolean {
  if (available !== null && voices !== null && voices.length > 0) return available
  const v = resolveVoice()
   
  if (!v && (!voices || voices.length === 0)) return false
  available = v !== null
  return available
}

/** Chrome returns [] on the first getVoices() call — subscribe AND poll. */
export function initVoices(onReady?: () => void): void {
  const probe = () => {
    const found = readVoices()
    if (found.length) {
      voices = found
      available = resolveVoice() !== null
      onReady?.()
      return true
    }
    return false
  }
  if (probe()) return
  const onVoices = () => probe()
  window.speechSynthesis?.addEventListener('voiceschanged', onVoices)
   
   
  let attempts = 0
  const t = setInterval(() => {
    attempts++
    if (probe() || attempts >= 8) clearInterval(t)
  }, 250)
  window.addEventListener('unload', () => clearInterval(t), { once: true })
}

/** Step the persisted rate: Slow 0.75 / Normal 0.9 / Native 1.0. */
export function stepRate(delta: 1 | -1): Rate {
  const idx = RATES.indexOf(getRate())
  const next = RATES[Math.min(RATES.length - 1, Math.max(0, idx + delta))] ?? 0.9
  setRate(next)
  return next
}

/**
 * Speak German text. Safe to call from anywhere: synthesises wedge after tab
 * backgrounding, so cancel() runs before every speak(), unconditionally.
 * Long texts are split per sentence and queued via onend chaining so Chrome's
 * ~15s truncation never cuts a reading text mid-paragraph.
 */
export function speak(text: string, rate: Rate = getRate()): void {
  const synth = window.speechSynthesis
  if (!synth || !text) return
  const voice = resolveVoice()
  if (!voice) return
  synth.cancel()
  const sentences = text.match(/[^.!?…]+[.!?…]+["”)]?\s*|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text]
  const chunks = sentences.length > 0 ? sentences : [text]
  let i = 0
  const speakNext = () => {
    if (i >= chunks.length) return
    const u = new SpeechSynthesisUtterance(chunks[i++]!)
    u.lang = voice.lang
    u.voice = voice
    u.rate = rate
    if (i < chunks.length) {
      u.onend = () => speakNext()
    }
     
    synth.speak(u)
  }
  speakNext()
}

export const stopSpeaking = (): void => {
  window.speechSynthesis?.cancel()
}