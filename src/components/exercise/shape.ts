 
 
 

import { useEffect } from 'react'
import type { GradeOutcome, GradeResult } from '@/lib/grade'
import type { ExerciseItem } from '@/lib/exercises/types'
import { isTyping } from '@/components/command-palette'

/** One graded blank. `slots` yields several; every other shape yields one. */
export type SlotVerdict = {
  label?: string
  input: string
  expected: string
  result: GradeResult
}

export type Graded = {
  outcome: GradeOutcome
  verdicts: SlotVerdict[]
}

export type ShapeProps<T extends ExerciseItem = ExerciseItem> = {
  item: T
  graded: Graded | null
  onGrade: (graded: Graded) => void
  onAdvance: () => void
}

/** Best-to-worst, mirroring grade.ts's internal ranking. */
const SEVERITY: GradeOutcome[] = ['exact', 'umlaut-miss', 'case-miss', 'article-miss', 'near', 'almost', 'wrong']

/** A multi-blank answer is only as good as its worst blank. */
export function worstOutcome(outcomes: GradeOutcome[]): GradeOutcome {
  let worst: GradeOutcome = 'exact'
  for (const o of outcomes) if (SEVERITY.indexOf(o) > SEVERITY.indexOf(worst)) worst = o
  return worst
}

export type Bucket = 'exact' | 'almost' | 'review'

/** The session tally has three buckets and no percentage — peach is its own. */
export function bucketOf(outcome: GradeOutcome): Bucket {
  if (outcome === 'exact') return 'exact'
  if (outcome === 'wrong') return 'review'
  return 'almost'
}

export const gradeResult = (outcome: GradeOutcome): GradeResult => ({ outcome, matched: -1, distance: 0 })

/**
 * Shape keys listen in the capture phase and stop propagation once they consume
 * a key, so a shape can own a letter the global map also uses — `S` is *das* on
 * a gender card and "speak" everywhere else — with no second arbitration layer.
 * Return true from the handler to claim the key.
 */
export function useShapeKeys(handler: (e: KeyboardEvent) => boolean, deps: React.DependencyList): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || isTyping(e.target)) return
      if (handler(e)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Alt+a/o/u/s and the clickable row both land here, so the caret is preserved. */
export function insertAtCaret(el: HTMLInputElement, char: string): string {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  const next = el.value.slice(0, start) + char + el.value.slice(end)
  el.value = next
  const caret = start + char.length
  el.setSelectionRange(caret, caret)
  return next
}

const ALT_UMLAUT: Record<string, string> = { a: 'ä', o: 'ö', u: 'ü', s: 'ß' }

/** The insertion half of typing German on an English keyboard — see umlaut-keys. */
export function umlautForAltKey(e: KeyboardEvent | React.KeyboardEvent): string | null {
  if (!e.altKey || e.ctrlKey || e.metaKey) return null
  return ALT_UMLAUT[e.key.toLowerCase()] ?? null
}
