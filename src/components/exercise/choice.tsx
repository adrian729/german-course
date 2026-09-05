// choice — one of two to four. Grading is immediate: a choice card has no
// second step, and the aliases are read off the option labels, so a future kind
// whose options happen to be der/die/das inherits D/F/S for free.

import { SpeakButton } from '@/components/speak-button'
import { Kbd, KeyHint } from '@/components/exercise/key-hint'
import { AnswerFeedback } from '@/components/exercise/answer-feedback'
import { choicePayload } from '@/components/exercise/payload'
import { gradeResult, useShapeKeys, type ShapeProps } from '@/components/exercise/shape'
import { cn } from '@/lib/utils'

const GENDER_ALIAS: Record<string, string> = { d: 'der', f: 'die', s: 'das' }
const BINARY_ALIAS: Record<string, string> = { y: 'right', n: 'wrong' }

export function ChoiceShape({ item, graded, onGrade }: ShapeProps) {
  const view = choicePayload(item)
  const answer = view.correction ?? view.options.find((o) => o.correct)?.label ?? ''
  const chosen = graded?.verdicts[0]?.input ?? null

  const labels = view.options.map((o) => o.label.toLowerCase())
  const isGender = labels.every((l) => l === 'der' || l === 'die' || l === 'das')
  const isBinary = labels.every((l) => l === 'right' || l === 'wrong')

  const pick = (label: string) => {
    if (graded) return
    const option = view.options.find((o) => o.label === label)
    if (!option) return
    const outcome = option.correct ? 'exact' : 'wrong'
    onGrade({ outcome, verdicts: [{ input: label, expected: answer, result: gradeResult(outcome) }] })
  }

  useShapeKeys(
    (e) => {
      if (graded) return false
      const digit = Number.parseInt(e.key, 10)
      if (digit >= 1 && digit <= view.options.length) {
        pick(view.options[digit - 1]!.label)
        return true
      }
      const key = e.key.toLowerCase()
      if (e.ctrlKey || e.metaKey || e.altKey) return false
      const alias = isGender ? GENDER_ALIAS[key] : isBinary ? BINARY_ALIAS[key] : undefined
      const match = alias ? view.options.find((o) => o.label.toLowerCase() === alias) : undefined
      if (match) {
        pick(match.label)
        return true
      }
      // Ungraded choice cards swallow the advance keys: skipping a question
      // without answering it is the one thing the tally cannot represent.
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') return true
      return false
    },
    [graded, item.id],
  )

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex items-center gap-2">
        <p className="text-2xl leading-relaxed font-medium text-balance">{view.prompt}</p>
        <SpeakButton text={view.prompt} size="icon-xs" />
      </div>

      <div className={cn('grid w-full max-w-xl gap-2', view.options.length > 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2')}>
        {view.options.map((option, i) => {
          const isChosen = chosen === option.label
          return (
            <button
              key={option.label}
              type="button"
              disabled={graded !== null}
              onClick={() => pick(option.label)}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                !graded && 'hover:bg-accent-hover hover:border-input',
                graded && option.correct && 'border-green-500/60 bg-green-100/60 dark:bg-green-900/25',
                graded && isChosen && !option.correct && 'border-red-500/60 bg-red-100/50 dark:bg-red-900/25',
                graded && !option.correct && !isChosen && 'opacity-50',
              )}
            >
              <span className="border-border text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded border font-mono text-[10px]">
                {i + 1}
              </span>
              <span className="flex-1">{option.label}</span>
            </button>
          )
        })}
      </div>

      {graded && (
        <AnswerFeedback outcome={graded.outcome} answer={answer} className="max-w-xl">
          {(view.correction || view.note) && (
            <div className="space-y-2 text-left">
              {view.correction && (
                <div className="space-y-1 font-mono text-sm">
                  <div className="line-through opacity-70">✗ {view.prompt}</div>
                  <div className="flex items-center gap-2">
                    <span>✓ {view.correction}</span>
                    <SpeakButton text={view.correction} size="icon-xs" />
                  </div>
                </div>
              )}
              {view.note && <p className="text-xs leading-relaxed opacity-90">{view.note}</p>}
            </div>
          )}
        </AnswerFeedback>
      )}

      <KeyHint>
        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>
            <Kbd>1</Kbd>–<Kbd>{Math.min(4, Math.max(2, view.options.length))}</Kbd> pick
          </span>
          {isGender && (
            <span>
              <Kbd>D</Kbd> <Kbd>F</Kbd> <Kbd>S</Kbd> der / die / das
            </span>
          )}
          {isBinary && (
            <span>
              <Kbd>Y</Kbd> <Kbd>N</Kbd> right / wrong
            </span>
          )}
        </span>
      </KeyHint>
    </div>
  )
}
