 
 
 

import { useEffect, useRef, useState } from 'react'
import { SpeakButton } from '@/components/speak-button'
import { UmlautKeys } from '@/components/exercise/umlaut-keys'
import { Kbd, KeyHint } from '@/components/exercise/key-hint'
import { AnswerFeedback } from '@/components/exercise/answer-feedback'
import { charDiff } from '@/components/exercise/diff'
import { DiffLine } from '@/components/exercise/typed'
import { slotsPayload } from '@/components/exercise/payload'
import { insertAtCaret, umlautForAltKey, worstOutcome, type ShapeProps, type SlotVerdict } from '@/components/exercise/shape'
import { grade } from '@/lib/grade'

export function SlotsShape({ item, graded, onGrade }: ShapeProps) {
  const view = slotsPayload(item)
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const [values, setValues] = useState<string[]>(() => view.blanks.map(() => ''))

  useEffect(() => {
    setValues(view.blanks.map(() => ''))
    refs.current[0]?.focus()
     
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  const setAt = (i: number, next: string) => setValues((prev) => prev.map((v, j) => (j === i ? next : v)))

  const submit = () => {
    if (graded) return
    const verdicts: SlotVerdict[] = view.blanks.map((blank, i) => {
      const input = values[i] ?? ''
       
       
      const looksNominal = (blank.accepted[0] ?? '').trim().length > 0 && /^[A-ZÄÖÜ]/.test((blank.accepted[0] ?? '').trim())
      const result = grade(input, blank.accepted, { strictUmlaut: blank.strictUmlaut, gradeCase: looksNominal })
      return {
        label: blank.label,
        input,
        expected: blank.accepted[result.matched] ?? blank.accepted[0] ?? '',
        result,
      }
    })
    refs.current.forEach((el) => el?.blur())
    onGrade({ outcome: worstOutcome(verdicts.map((v) => v.result.outcome)), verdicts })
  }

  /** Tab wraps rather than escaping to the browser chrome mid-answer. */
  const move = (from: number, delta: number) => {
    const n = view.blanks.length
    if (n === 0) return
    refs.current[(from + delta + n) % n]?.focus()
  }

  const onKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    const umlaut = umlautForAltKey(e)
    if (umlaut) {
      e.preventDefault()
      const el = refs.current[i]
      if (el) {
        setAt(i, insertAtCaret(el, umlaut))
        el.focus()
      }
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      move(i, e.shiftKey ? -1 : 1)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  const blankInput = (i: number) => (
    <input
      key={i}
      ref={(el) => {
        refs.current[i] = el
      }}
      value={values[i] ?? ''}
      disabled={graded !== null}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      aria-label={view.blanks[i]?.label ?? `Blank ${i + 1}`}
      onChange={(e) => setAt(i, e.target.value)}
      onKeyDown={onKeyDown(i)}
      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 mx-1 w-32 rounded-md border px-2 py-1 text-center outline-none focus-visible:ring-[3px] disabled:opacity-70"
    />
  )

  const parts = view.prompt ? view.prompt.split('___') : null

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {view.heading && (
        <div className="flex items-center gap-2">
          <p className="text-2xl leading-relaxed font-medium">{view.heading}</p>
          <SpeakButton text={view.heading} size="icon-xs" />
        </div>
      )}

      {parts ? (
        <p className="max-w-2xl text-center text-xl leading-loose text-balance">
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && i < view.blanks.length && blankInput(i)}
            </span>
          ))}
        </p>
      ) : (
        <div className="flex w-full max-w-xl flex-col gap-3">
          {view.blanks.map((blank, i) => (
            <label key={blank.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{blank.label}</span>
              {blankInput(i)}
            </label>
          ))}
        </div>
      )}

      {view.english && <p className="text-muted-foreground text-sm">{view.english}</p>}

      {!graded && (
        <UmlautKeys
          onInsert={(char) => {
            const active = refs.current.findIndex((el) => el === document.activeElement)
            const i = active === -1 ? 0 : active
            const el = refs.current[i]
            if (!el) return
            setAt(i, insertAtCaret(el, char))
            el.focus()
          }}
        />
      )}

      {graded && (
        <div className="flex w-full max-w-xl flex-col gap-2">
          {graded.verdicts.map((verdict, i) => (
            <AnswerFeedback key={i} outcome={verdict.result.outcome} answer={verdict.expected}>
              <dl className="space-y-1 text-left font-mono text-sm">
                <div className="flex flex-wrap items-baseline gap-2">
                  <dt className="w-24 shrink-0 font-sans text-xs opacity-70">{verdict.label}</dt>
                  <dd className="break-all">
                    {verdict.input ? (
                      <DiffLine segments={charDiff(verdict.input, verdict.expected)} side="typed" />
                    ) : (
                      <span className="opacity-60">(nothing)</span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <dt className="w-24 shrink-0 font-sans text-xs opacity-70">answer</dt>
                  <dd className="flex items-center gap-1 break-all">
                    <DiffLine segments={charDiff(verdict.input, verdict.expected)} side="answer" />
                    <SpeakButton text={verdict.expected} size="icon-xs" />
                  </dd>
                </div>
              </dl>
            </AnswerFeedback>
          ))}
          {view.rationale && <p className="text-muted-foreground text-xs">{view.rationale}</p>}
        </div>
      )}

      <KeyHint>
        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>
            <Kbd>Tab</Kbd> <Kbd>Shift+Tab</Kbd> between blanks (wraps)
          </span>
          <span>
            <Kbd>Enter</Kbd> check all
          </span>
          <span>
            <Kbd>Alt</Kbd>+<Kbd>a</Kbd>/<Kbd>o</Kbd>/<Kbd>u</Kbd>/<Kbd>s</Kbd> ä ö ü ß
          </span>
        </span>
      </KeyHint>
    </div>
  )
}
