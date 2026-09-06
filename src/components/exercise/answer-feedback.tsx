 
 
 

import type { ReactNode } from 'react'
import { Check, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GradeOutcome } from '@/lib/grade'

const LEADING_ARTICLE = /^(der|die|das)\b/i

type Tone = 'exact' | 'almost' | 'wrong'

const TONE: Record<GradeOutcome, Tone> = {
  exact: 'exact',
  'umlaut-miss': 'almost',
  'case-miss': 'almost',
  'article-miss': 'almost',
  near: 'almost',
  almost: 'almost',
  wrong: 'wrong',
}

const HEADLINE: Record<GradeOutcome, string> = {
  exact: 'Correct',
  'umlaut-miss': 'Almost — German spells it with an umlaut',
  'case-miss': 'Almost — capitalisation',
  'article-miss': 'Almost — the gender',
  near: 'Almost — check the spelling',
  almost: 'Almost — check the order',
  wrong: 'Not quite',
}

/** The exact wording the plan specifies for each outcome. */
function message(outcome: GradeOutcome, answer: string): ReactNode {
  const article = answer.match(LEADING_ARTICLE)?.[1]
  switch (outcome) {
    case 'exact':
      return null
    case 'umlaut-miss':
      return (
        <>
          Right word. German spells it <strong className="font-semibold">{answer}</strong>
        </>
      )
    case 'case-miss':
      return (
        <>
          German capitalises every noun: <strong className="font-semibold">{answer}</strong>
        </>
      )
    case 'article-miss':
      return (
        <>
          You have the noun. Its gender is <strong className="font-semibold">{article ?? answer}</strong>
        </>
      )
    case 'near':
      return (
        <>
          Close. The answer is <strong className="font-semibold">{answer}</strong>
        </>
      )
    case 'almost':
      return <>All the right words — check the order</>
    case 'wrong':
      return (
        <>
          The answer is <strong className="font-semibold">{answer}</strong>
        </>
      )
  }
}

const TONE_CLASS: Record<Tone, string> = {
  exact: 'border-green-400/50 bg-green-100/60 text-green-800 dark:border-green-700/60 dark:bg-green-900/25 dark:text-green-200',
  almost: 'border-peach-300/60 bg-peach-100/50 text-peach-900 dark:border-peach-500/50 dark:bg-peach-900/20 dark:text-peach-100',
  wrong: 'border-red-400/50 bg-red-100/50 text-red-800 dark:border-red-700/60 dark:bg-red-900/25 dark:text-red-200',
}

export function AnswerFeedback({
  outcome,
  answer,
  children,
  className,
}: {
  outcome: GradeOutcome
  /** The accepted answer, interpolated into the outcome's sentence. */
  answer: string
  children?: ReactNode
  className?: string
}) {
  const tone = TONE[outcome]
  const Icon = tone === 'exact' ? Check : tone === 'wrong' ? X : TriangleAlert
  const body = message(outcome, answer)

  return (
    <div className={cn('w-full rounded-lg border px-4 py-3 text-sm', TONE_CLASS[tone], className)} role="status">
      <div className="flex items-center gap-2 font-medium">
        <Icon className="size-4 shrink-0" />
        <span>{HEADLINE[outcome]}</span>
      </div>
      {body && <p className="mt-1.5 leading-relaxed">{body}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
