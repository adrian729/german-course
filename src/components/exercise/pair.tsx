// pair — bipartite matching. 1–6 picks left, a–f picks partner;
// correct pairs lock and grey. Every binding is printed under the controls.

import { useMemo, useState } from 'react'
import { Kbd, KeyHint } from '@/components/exercise/key-hint'
import { AnswerFeedback } from '@/components/exercise/answer-feedback'
import { pairPayload } from '@/components/exercise/payload'
import { gradeResult, useShapeKeys, type ShapeProps } from '@/components/exercise/shape'
import { cn } from '@/lib/utils'

export function PairShape({ item, graded, onGrade }: ShapeProps) {
  const view = pairPayload(item)
  const [leftSel, setLeftSel] = useState<string | null>(null)
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)

  const left = useMemo(() => view?.left ?? [], [view])
  const right = useMemo(() => {
    const r = [...(view?.right ?? [])]
    // Deterministic shuffle per item so the answer is not positional.
    let h = 0
    for (const c of item.id) h = (h * 31 + c.charCodeAt(0)) >>> 0
    for (let i = r.length - 1; i > 0; i--) {
      h = (h * 1103515245 + 12345) >>> 0
      const j = h % (i + 1)
      const tmp = r[i]!
      r[i] = r[j]!
      r[j] = tmp
    }
    return r
  }, [view, item.id])

  if (!view) {
    return <p className="text-muted-foreground text-sm">This matching item has no pairs.</p>
  }

  const solution = view.solution

  const tryMatch = (leftId: string, rightId: string) => {
    if (graded || locked.has(leftId)) return
    if (solution[leftId] === rightId) {
      const next = new Set(locked)
      next.add(leftId)
      setLocked(next)
      setLeftSel(null)
      setWrongFlash(null)
      if (next.size === left.length) {
        onGrade({ outcome: 'exact', verdicts: [{ input: `${next.size}/${left.length}`, expected: `${left.length}/${left.length}`, result: gradeResult('exact') }] })
      }
    } else {
      setWrongFlash(rightId)
      setTimeout(() => setWrongFlash(null), 450)
    }
  }

  const pickLeft = (idx: number) => {
    const entry = left[idx]
    if (!entry || graded || locked.has(entry.id)) return
    setLeftSel(entry.id)
  }

  const pickRight = (idx: number) => {
    const entry = right[idx]
    if (!entry || graded) return
    if (!leftSel) return
    tryMatch(leftSel, entry.id)
  }

  useShapeKeys(
    (e) => {
      if (graded) return false
      if (e.ctrlKey || e.metaKey || e.altKey) return false
      const digit = Number.parseInt(e.key, 10)
      if (digit >= 1 && digit <= 6) {
        pickLeft(digit - 1)
        return true
      }
      const lower = e.key.toLowerCase()
      if (lower >= 'a' && lower <= 'f') {
        pickRight(lower.charCodeAt(0) - 97)
        return true
      }
      return false
    },
    [graded, item.id, leftSel, locked],
  )

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-2xl font-medium">Match the words</p>
      <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          {left.map((l, i) => {
            const done = locked.has(l.id)
            return (
              <button
                key={l.id}
                type="button"
                disabled={graded !== null || done}
                onClick={() => pickLeft(i)}
                className={cn(
                  'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                  done && 'bg-green-100/60 opacity-60 dark:bg-green-900/30',
                  !done && leftSel === l.id && 'border-primary bg-accent',
                  !done && leftSel !== l.id && 'hover:bg-accent-hover',
                )}
              >
                <span className="text-muted-foreground mr-2 font-mono text-xs">{i + 1}</span>
                {l.label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-col gap-2">
          {right.map((r, i) => {
            const done = locked.has(r.id)
            return (
              <button
                key={`${r.id}-${i}`}
                type="button"
                disabled={graded !== null || done}
                onClick={() => pickRight(i)}
                className={cn(
                  'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                  done && 'bg-green-100/60 opacity-60 dark:bg-green-900/30',
                  !done && wrongFlash === r.id && 'border-destructive bg-red-100/60',
                  !done && wrongFlash !== r.id && 'hover:bg-accent-hover',
                )}
              >
                <span className="text-muted-foreground mr-2 font-mono text-xs">{String.fromCharCode(97 + i)}</span>
                {r.label}
              </button>
            )
          })}
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        {locked.size}/{left.length} matched
      </p>
      {graded && (
        <AnswerFeedback outcome={graded.outcome} answer={`${left.length}/${left.length} pairs`}>
          <p className="text-left text-xs">All pairs matched.</p>
        </AnswerFeedback>
      )}
      <KeyHint>
        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>
            <Kbd>1</Kbd>–<Kbd>6</Kbd> pick left
          </span>
          <span>
            <Kbd>a</Kbd>–<Kbd>f</Kbd> pick partner
          </span>
        </span>
      </KeyHint>
    </div>
  )
}
