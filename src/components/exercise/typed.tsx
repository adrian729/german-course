 
 
 
 

import { useEffect, useRef, useState } from 'react'
import { SpeakButton } from '@/components/speak-button'
import { UmlautKeys } from '@/components/exercise/umlaut-keys'
import { Kbd, KeyHint } from '@/components/exercise/key-hint'
import { AnswerFeedback } from '@/components/exercise/answer-feedback'
import { charDiff, type DiffSeg } from '@/components/exercise/diff'
import { typedPayload } from '@/components/exercise/payload'
import { insertAtCaret, umlautForAltKey, type ShapeProps } from '@/components/exercise/shape'
import { grade } from '@/lib/grade'
import { cn } from '@/lib/utils'

export function TypedShape({ item, graded, onGrade }: ShapeProps) {
  const view = typedPayload(item)
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue('')
    inputRef.current?.focus()
  }, [item.id])

  const submit = () => {
    if (graded) return
    const result = grade(value, view.accepted, {
      strictUmlaut: view.strictUmlaut,
      gradeCase: view.gradeCase,
      expectsArticle: view.expectsArticle,
      orderSensitive: view.orderSensitive,
    })
    const expected = view.accepted[result.matched] ?? view.accepted[0] ?? ''
     
     
    inputRef.current?.blur()
    onGrade({ outcome: result.outcome, verdicts: [{ input: value, expected, result }] })
  }

  const insert = (char: string) => {
    const el = inputRef.current
    if (!el || graded) return
    setValue(insertAtCaret(el, char))
    el.focus()
  }

  const verdict = graded?.verdicts[0]
  const segments = verdict ? charDiff(verdict.input, verdict.expected) : []

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex items-center gap-2">
        <p className="text-2xl leading-relaxed font-medium text-balance">{view.prompt}</p>
        <SpeakButton text={view.prompt} size="icon-xs" />
      </div>

      <div className="flex w-full max-w-xl flex-col items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          disabled={graded !== null}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Your answer"
          placeholder="Type your answer"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            const umlaut = umlautForAltKey(e)
            if (umlaut) {
              e.preventDefault()
              insert(umlaut)
              return
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-center text-lg outline-none focus-visible:ring-[3px] disabled:opacity-70"
        />
        {!graded && <UmlautKeys onInsert={insert} />}
      </div>

      {verdict && (
        <AnswerFeedback outcome={verdict.result.outcome} answer={verdict.expected} className="max-w-xl">
          <dl className="space-y-1 text-left font-mono text-sm">
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="w-20 shrink-0 font-sans text-xs opacity-70">you wrote</dt>
              <dd className="break-all">
                {verdict.input ? <DiffLine segments={segments} side="typed" /> : <span className="opacity-60">(nothing)</span>}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <dt className="w-20 shrink-0 font-sans text-xs opacity-70">answer</dt>
              <dd className="flex items-center gap-1 break-all">
                <DiffLine segments={segments} side="answer" />
                <SpeakButton text={view.speakAnswer ?? verdict.expected} size="icon-xs" />
              </dd>
            </div>
          </dl>
          {view.accepted.length > 1 && (
            <p className="mt-2 text-left text-xs opacity-80">Also accepted: {view.accepted.slice(1).join(' · ')}</p>
          )}
          {view.english && <p className="mt-2 text-left text-xs opacity-80">{view.english}</p>}
          {view.rationale && <p className="mt-1 text-left text-xs opacity-80">{view.rationale}</p>}
        </AnswerFeedback>
      )}

      <KeyHint>
        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>
            <Kbd>Enter</Kbd> check
          </span>
          <span>
            <Kbd>Alt</Kbd>+<Kbd>a</Kbd>/<Kbd>o</Kbd>/<Kbd>u</Kbd>/<Kbd>s</Kbd> ä ö ü ß
          </span>
        </span>
      </KeyHint>
    </div>
  )
}

/** One side of the character diff: the typed side hides insertions, and the
 *  answer side hides deletions, so both read as real words. */
export function DiffLine({ segments, side }: { segments: DiffSeg[]; side: 'typed' | 'answer' }) {
  const hidden = side === 'typed' ? 'ins' : 'del'
  return (
    <span>
      {segments
        .filter((s) => s.kind !== hidden)
        .map((s, i) => (
          <span
            key={i}
            className={cn(
              s.kind !== 'same' &&
                'rounded-sm px-0.5 font-semibold underline decoration-2 underline-offset-2',
              s.kind === 'del' && 'bg-red-200/60 dark:bg-red-900/50',
              s.kind === 'ins' && 'bg-green-200/60 dark:bg-green-900/50',
            )}
          >
            {s.text}
          </span>
        ))}
    </span>
  )
}
