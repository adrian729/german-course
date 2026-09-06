 
 
 
 

import type { ExerciseItem } from '@/lib/exercises/types'

export type RevealView = { front: string; back: string }

export function revealPayload(item: ExerciseItem): RevealView {
  if ('headword' in item) return { front: item.headword, back: item.gloss }
  if ('expected' in item) return { front: item.prompt, back: item.expected.join(' / ') }
  return { front: '', back: '' }
}

export type ChoiceView = {
  prompt: string
  options: Array<{ label: string; correct: boolean }>
  /** The corpus's own explanation of the error — judgement items carry it. */
  note: string | null
  /** The corrected form, shown beside the struck one. */
  correction: string | null
}

export function choicePayload(item: ExerciseItem): ChoiceView {
  const options = 'options' in item ? item.options.map((o) => ({ label: o.label as string, correct: o.correct })) : []
  const prompt = 'statement' in item ? item.statement : 'german' in item ? item.german : 'prompt' in item ? item.prompt : ''
  return {
    prompt,
    options,
    note: 'context' in item ? item.context : null,
    correction: 'correct' in item ? item.correct : null,
  }
}

export type TypedView = {
  prompt: string
  accepted: string[]
  strictUmlaut: boolean
  gradeCase: boolean
  expectsArticle: boolean
  orderSensitive: boolean
  english: string | null
  speakAnswer: string | null
  rationale: string | null
}

export function typedPayload(item: ExerciseItem): TypedView {
  const accepted = 'accepted' in item && item.accepted?.length ? item.accepted : 'expected' in item ? item.expected : []
  const primary = accepted[0] ?? ''
  return {
    prompt: 'prompt' in item ? item.prompt : '',
    accepted,
    strictUmlaut: 'strictUmlaut' in item ? Boolean(item.strictUmlaut) : false,
    gradeCase: 'gradeCase' in item ? Boolean((item as { gradeCase?: boolean }).gradeCase) : true,
    expectsArticle: 'expectsArticle' in item ? Boolean((item as { expectsArticle?: boolean }).expectsArticle) : false,
     
     
     
     
    orderSensitive: item.kind === 'authored' && 'chunks' in item && Boolean((item as { chunks?: string[] }).chunks?.length),
    english: 'english' in item ? (item as { english?: string | null }).english ?? null : null,
    speakAnswer: 'speakAnswer' in item ? (item as { speakAnswer?: string }).speakAnswer ?? (primary || null) : primary || null,
    rationale: 'rationale' in item ? (item as { rationale?: string | null }).rationale ?? null : null,
  }
}

export type SlotsView = {
  /** Shown above the blanks when there is no gapped sentence — e.g. the infinitive. */
  heading: string | null
  /** A prompt with `___` gaps, one per blank, when the kind has one. */
  prompt: string | null
  blanks: Array<{ label: string; accepted: string[]; strictUmlaut: boolean }>
  english: string | null
  rationale: string | null
}

export function slotsPayload(item: ExerciseItem): SlotsView {
  if ('expectedPartizip' in item) {
    return {
      heading: item.infinitive,
      prompt: null,
      blanks: [
        { label: 'Partizip II', accepted: [item.expectedPartizip], strictUmlaut: /[äöüÄÖÜ]/.test(item.expectedPartizip) },
        { label: 'haben or sein', accepted: [item.expectedAux], strictUmlaut: false },
      ],
      english: null,
      rationale: null,
    }
  }
  const blanks = 'blanks' in item && item.blanks ? item.blanks : []
  return {
    heading: null,
    prompt: 'prompt' in item ? item.prompt : null,
    blanks: blanks.map((b, i) => ({
      label: `Blank ${i + 1}`,
      accepted: b.accepted,
      strictUmlaut: b.strictUmlaut ?? false,
    })),
    english: 'english' in item ? item.english : null,
    rationale: 'rationale' in item ? item.rationale : null,
  }
}

export type OrderView = {
  instruction: string
  tokens: string[]
  /** The tokens in their accepted sequence. */
  expected: string[]
  english: string | null
}

export function orderPayload(item: ExerciseItem): OrderView {
  const tokens = 'tokens' in item && item.tokens ? item.tokens : []
  const order = 'expectedOrder' in item && item.expectedOrder ? item.expectedOrder : tokens.map((_, i) => i)
  return {
    instruction: 'sentence' in item ? 'Build the sentence.' : 'prompt' in item ? item.prompt : 'Build the sentence.',
    tokens,
    expected: order.map((i) => tokens[i] ?? ''),
    english: 'english' in item ? item.english : null,
  }
}

export type PairView = {
  left: Array<{ id: string; label: string }>
  right: Array<{ id: string; label: string }>
  /** left id → right id */
  solution: Record<string, string>
}

/**
 * Match Grid carries its own bipartite payload — six headwords against six
 * glosses from the same scope, so the learner must know the word, not the
 * category.
 */
export function pairPayload(item: ExerciseItem): PairView | null {
  if ('pairs' in item && Array.isArray((item as { pairs?: unknown }).pairs)) {
    const pairs = (item as { pairs: Array<{ left: string; right: string; lexemeId: string }> }).pairs
    return {
      left: pairs.map((p) => ({ id: p.lexemeId, label: p.left })),
      right: pairs.map((p) => ({ id: p.lexemeId, label: p.right })),
      solution: Object.fromEntries(pairs.map((p) => [p.lexemeId, p.lexemeId])),
    }
  }
  return null
}

/** What `S` speaks. */
export function promptTextOf(item: ExerciseItem): string {
  if (item.speakPrompt) return item.speakPrompt
  switch (item.shape) {
    case 'reveal':
      return revealPayload(item).front
    case 'choice':
      return choicePayload(item).prompt
    case 'typed':
      return typedPayload(item).prompt
    case 'slots':
      return slotsPayload(item).heading ?? slotsPayload(item).prompt ?? ''
    case 'order':
      return orderPayload(item).expected.join(' ')
    case 'pair':
      return ''
  }
}

/** What `Shift+S` speaks, and what the review list shows as the right answer. */
export function answerTextOf(item: ExerciseItem): string {
  switch (item.shape) {
    case 'reveal':
      return revealPayload(item).back
    case 'choice': {
      const view = choicePayload(item)
      return view.correction ?? view.options.find((o) => o.correct)?.label ?? ''
    }
    case 'typed': {
      const view = typedPayload(item)
      return view.speakAnswer ?? view.accepted[0] ?? ''
    }
    case 'slots':
      return slotsPayload(item)
        .blanks.map((b) => b.accepted[0] ?? '')
        .join(' · ')
    case 'order':
      return orderPayload(item).expected.join(' ')
    case 'pair':
      return ''
  }
}
