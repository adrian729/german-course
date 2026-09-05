// order — a token sequence. Word order is never fuzzy (N5): a transposition is
// the error under test, so the verdict here is exact or wrong and nothing
// between.

import { useEffect, useMemo, useState } from 'react'
import { SpeakButton } from '@/components/speak-button'
import { Kbd, KeyHint } from '@/components/exercise/key-hint'
import { AnswerFeedback } from '@/components/exercise/answer-feedback'
import { orderPayload } from '@/components/exercise/payload'
import { gradeResult, useShapeKeys, type ShapeProps } from '@/components/exercise/shape'
import { l2 } from '@/lib/normalise'
import { cn } from '@/lib/utils'

/** The bank is scrambled once per item; re-scrambling on every keystroke would
 *  move the target out from under the digit the learner is about to press. */
function scrambleOrder(n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = idx[i]!
    idx[i] = idx[j]!
    idx[j] = tmp
  }
  return idx
}

export function OrderShape({ item, graded, onGrade }: ShapeProps) {
  const view = orderPayload(item)
  const bank = useMemo(
    () => scrambleOrder(view.expected.length).map((i) => ({ slot: i, text: view.expected[i] ?? '' })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.id],
  )
  const [placed, setPlaced] = useState<number[]>([])

  useEffect(() => setPlaced([]), [item.id])

  const place = (bankIndex: number) => {
    if (graded || placed.includes(bankIndex)) return
    setPlaced((p) => [...p, bankIndex])
  }

  const submit = (sequence: number[]) => {
    if (graded) return
    const answer = sequence.map((b) => bank[b]?.text ?? '')
    const expected = view.expected
    const correct = answer.length === expected.length && answer.every((t, i) => l2(t) === l2(expected[i] ?? ''))
    const outcome = correct ? 'exact' : 'wrong'
    onGrade({
      outcome,
      verdicts: [{ input: answer.join(' '), expected: expected.join(' '), result: gradeResult(outcome) }],
    })
  }

  useShapeKeys(
    (e) => {
      if (graded) return false
      const digit = Number.parseInt(e.key, 10)
      if (digit >= 1 && digit <= Math.min(9, bank.length)) {
        place(digit - 1)
        return true
      }
      if (e.key === 'Backspace') {
        setPlaced((p) => (e.shiftKey ? [] : p.slice(0, -1)))
        return true
      }
      if (e.key === 'Enter') {
        submit(placed)
        return true
      }
      // Space/→ must not skip an unbuilt sentence.
      if (e.key === ' ' || e.key === 'ArrowRight') return true
      return false
    },
    [graded, placed, bank, item.id],
  )

  const built = placed.map((b) => bank[b]?.text ?? '')

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-muted-foreground max-w-2xl text-center text-sm text-balance">{view.instruction}</p>

      <div className="border-input flex min-h-14 w-full max-w-2xl flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
        {built.length === 0 ? (
          <span className="text-muted-foreground text-sm">…</span>
        ) : (
          built.map((token, i) => (
            <span key={i} className="bg-muted rounded px-2 py-1 text-sm">
              {token}
            </span>
          ))
        )}
      </div>

      <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2">
        {bank.map((token, i) => {
          const used = placed.includes(i)
          return (
            <button
              key={`${token.slot}-${i}`}
              type="button"
              disabled={used || graded !== null}
              onClick={() => place(i)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                used ? 'text-muted-foreground opacity-50' : 'hover:bg-accent-hover hover:border-input',
              )}
            >
              <span className="text-muted-foreground font-mono text-[10px]">{i + 1}</span>
              {token.text}
              {used && <span className="text-green-600 dark:text-green-400">✓</span>}
            </button>
          )
        })}
      </div>

      {!graded && (
        <button
          type="button"
          onClick={() => submit(placed)}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Check
        </button>
      )}

      {graded && (
        <AnswerFeedback outcome={graded.outcome} answer={view.expected.join(' ')} className="max-w-xl">
          <div className="space-y-1 text-left text-sm">
            <div className="flex items-baseline gap-2">
              <span className="w-20 shrink-0 text-xs opacity-70">you built</span>
              <span>{built.join(' ') || '(nothing)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs opacity-70">answer</span>
              <span>{view.expected.join(' ')}</span>
              <SpeakButton text={view.expected.join(' ')} size="icon-xs" />
            </div>
            {view.english && <p className="pt-1 text-xs opacity-80">{view.english}</p>}
          </div>
        </AnswerFeedback>
      )}

      <KeyHint>
        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>
            <Kbd>1</Kbd>–<Kbd>{Math.min(9, Math.max(1, bank.length))}</Kbd> place
          </span>
          <span>
            <Kbd>Backspace</Kbd> undo
          </span>
          <span>
            <Kbd>Shift+Backspace</Kbd> clear
          </span>
          <span>
            <Kbd>Enter</Kbd> check
          </span>
        </span>
      </KeyHint>
    </div>
  )
}
