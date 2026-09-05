// Practice exercise types — discriminated union over six response shapes.
import type { Level, Pos, Theme, Verification } from '@/content/types'

export type Shape = 'reveal' | 'choice' | 'typed' | 'slots' | 'order' | 'pair'

export type ExerciseKind =
  | 'vocab-reveal'
  | 'gender'
  | 'meaning-mcq'
  | 'typed-recall'
  | 'conjugation-cell'
  | 'plural'
  | 'partizip-pair'
  | 'cloze'
  | 'sentence-builder'
  | 'judgement'
  | 'match-grid'
  | 'authored'

export type DeckMode = 'mixed' | 'vocab' | 'grammar' | 'production' | 'listening'
export type DeckSize = 10 | 20 | 40 | 0

export type DeckFilters = {
  lesson?: string
  topic?: string
  theme?: Theme
  pos?: Pos
  level?: Level
  point?: string
  lexeme?: string
  mode?: DeckMode
  size?: DeckSize
  unverified?: boolean
  audio?: 'on' | 'off'
}

export type Deck = {
  items: ExerciseItem[]
  meta: {
    total: number
    byKind: Record<ExerciseKind, number>
    lessonLabels: string[]
    themeLabels: string[]
    wordCount: number
  }
}

type BaseExercise = {
  id: string
  shape: Shape
  kind: ExerciseKind
  sourceIds: string[]
  verification: Verification
  riskyWhenUnverified: boolean
  origin: 'generated' | 'authored'
  rubric?: string
  sourceHref?: string
  speakPrompt?: string
}

// -- reveal
export type VocabRevealItem = BaseExercise & {
  shape: 'reveal'
  kind: 'vocab-reveal'
  headword: string
  gloss: string
  lexemeId: string
  level: Level
}

// -- choice variants
export type GenderItem = BaseExercise & {
  shape: 'choice'
  kind: 'gender'
  prompt: string
  options: Array<{ label: 'der' | 'die' | 'das'; correct: boolean }>
  lexemeId: string
}

export type MeaningMcqItem = BaseExercise & {
  shape: 'choice'
  kind: 'meaning-mcq'
  german: string
  options: Array<{ label: string; correct: boolean }>
  lexemeId: string
}

export type JudgementItem = BaseExercise & {
  shape: 'choice'
  kind: 'judgement'
  statement: string
  correct: string | null
  context: string
  options: Array<{ label: 'right' | 'wrong'; correct: boolean }>
  formId: string
}

// -- typed variants
export type TypedRecallItem = BaseExercise & {
  shape: 'typed'
  kind: 'typed-recall'
  prompt: string
  accepted: string[]
  strictUmlaut: boolean
  gradeCase: boolean
  expectsArticle: boolean
  speakAnswer: string
  lexemeId: string
}

export type ConjugationCellItem = BaseExercise & {
  shape: 'typed'
  kind: 'conjugation-cell'
  prompt: string
  accepted: string[]
  strictUmlaut: boolean
  gradeCase: false
  lexemeId: string
  infinitive: string
}

export type PluralItem = BaseExercise & {
  shape: 'typed'
  kind: 'plural'
  prompt: string
  accepted: string[]
  strictUmlaut: true
  lexemeId: string
}

// -- slots variants
export type PartizipPairItem = BaseExercise & {
  shape: 'slots'
  kind: 'partizip-pair'
  infinitive: string
  expectedPartizip: string
  expectedAux: 'haben' | 'sein'
  lexemeId: string
}

export type ClozeItem = BaseExercise & {
  shape: 'slots'
  kind: 'cloze'
  prompt: string
  blanks: Array<{ accepted: string[]; strictUmlaut?: boolean }>
  english: string | null
  lexemeId: string
}

// -- order variant
export type SentenceBuilderItem = BaseExercise & {
  shape: 'order'
  kind: 'sentence-builder'
  sentence: string
  tokens: string[]
  expectedOrder: number[]
  sourceIsEligible: true
  sentenceId: string
}

// -- pair variant
export type MatchGridItem = BaseExercise & {
  shape: 'pair'
  kind: 'match-grid'
  pairs: Array<{ left: string; right: string; lexemeId: string }>
}

// -- authored wraps DrillItem
export type AuthoredItem = BaseExercise & {
  shape: 'typed' | 'slots' | 'order' | 'choice' | 'reveal' | 'pair'
  kind: 'authored'
  drillId: string
  prompt: string
  expected: string[]
  english: string | null
  rationale: string | null
  chunks?: string[]
  // derived shape helpers
  authoredShape: 'typed' | 'slots' | 'order'
  // for typed/slots grading
  accepted?: string[]
  blanks?: Array<{ accepted: string[]; strictUmlaut?: boolean }>
  tokens?: string[]
  expectedOrder?: number[]
}

export type ExerciseItem =
  | VocabRevealItem
  | GenderItem
  | MeaningMcqItem
  | JudgementItem
  | TypedRecallItem
  | ConjugationCellItem
  | PluralItem
  | PartizipPairItem
  | ClozeItem
  | SentenceBuilderItem
  | MatchGridItem
  | AuthoredItem

// ------------------------------------------------------------------ validation

export const MODES: DeckMode[] = ['mixed', 'vocab', 'grammar', 'production', 'listening']
export const SIZES: DeckSize[] = [10, 20, 40, 0]

export function validateDeckSearch(search: Record<string, unknown>): DeckFilters {
  const out: DeckFilters = {}
  if (typeof search.lesson === 'string' && search.lesson) out.lesson = search.lesson
  if (typeof search.topic === 'string' && search.topic) out.topic = search.topic
  if (typeof search.theme === 'string' && (search.theme as Theme)) out.theme = search.theme as Theme
  if (typeof search.pos === 'string' && search.pos) out.pos = search.pos as Pos
  if (typeof search.level === 'string' && search.level) out.level = search.level as Level
  if (typeof search.point === 'string' && search.point) out.point = search.point
  if (typeof search.lexeme === 'string' && search.lexeme) out.lexeme = search.lexeme
  if (typeof search.mode === 'string' && (MODES as string[]).includes(search.mode)) out.mode = search.mode as DeckMode
  else if (!search.mode) out.mode = 'mixed'
  if (search.size != null) {
    const n = Number(search.size)
    if (n === 10 || n === 20 || n === 40 || n === 0) out.size = n as DeckSize
    else out.size = 20
  } else {
    out.size = 20
  }
  if (typeof search.unverified === 'string') out.unverified = search.unverified === 'true'
  else if (typeof search.unverified === 'boolean') out.unverified = search.unverified
  else out.unverified = false
  if (search.audio === 'off') out.audio = 'off'
  else out.audio = 'on'
  return out
}
