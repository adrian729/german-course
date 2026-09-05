// Declarative knobs for scripts/extract-corpus.ts. This is where the corpus's
// idiosyncrasy lives — a human edits this (not the parser) when extraction gets
// something wrong, then re-runs `pnpm extract`.

import type { Level } from '../src/content/types.ts'

export type LessonDef = {
  weekFile: string
  id: string
  number: number
  title: string
  shortTitle: string
  level: Level
  summary: string
}

export const LESSONS: LessonDef[] = [
  {
    weekFile: 'week_1.md',
    id: '01-foundations-and-core-grammar',
    number: 1,
    title: 'Foundations & Core Grammar',
    shortTitle: 'Foundations',
    level: 'A1',
    summary:
      'Pronunciation, the first 150 words, numbers and calendar, personal pronouns and the present tense, the nominative and accusative cases, the V2 rule, negation, and es gibt.',
  },
  {
    weekFile: 'week_2.md',
    id: '02-dative-modals-perfekt',
    number: 2,
    title: 'Dative, Modals, Perfekt & Prepositions',
    shortTitle: 'Dative & Modals',
    level: 'A1',
    summary:
      'The dative case, possessive articles and der-words, all six modal verbs, the conversational past (Perfekt), prepositions, telling time, adjective endings, and sentence connectors.',
  },
  {
    weekFile: 'week_3.md',
    id: '03-praeteritum-and-reflexives',
    number: 3,
    title: 'Präteritum, Reflexives & Adjective Declension',
    shortTitle: 'Präteritum',
    level: 'A2',
    summary:
      'The narrative past (Präteritum) including the 20 strong verbs, reflexive verbs with accusative and dative pronouns, indefinite pronouns, and the full adjective-declension system.',
  },
  {
    weekFile: 'week_4.md',
    id: '04-genitive-comparative',
    number: 4,
    title: 'Genitive, Comparative & N-Declension',
    shortTitle: 'Genitive',
    level: 'A2',
    summary:
      'The genitive case for possession, comparative and superlative forms, and N-declension weak masculine nouns.',
  },
  {
    weekFile: 'week_5.md',
    id: '05-separable-verbs',
    number: 5,
    title: 'Separable Verbs, Imperative & Indirect Questions',
    shortTitle: 'Separable Verbs',
    level: 'A2',
    summary:
      'Separable and inseparable prefix verbs, the imperative mood, indirect questions, and expanded conjunctions and adverbs.',
  },
  {
    weekFile: 'week_6.md',
    id: '06-futur-and-zu-infinitiv',
    number: 6,
    title: 'Futur, werden & zu + Infinitiv',
    shortTitle: 'Futur & zu+Inf',
    level: 'B1',
    summary:
      'The three functions of werden, the future tense (Futur I), zu + Infinitiv constructions, and relative clauses.',
  },
  {
    weekFile: 'week_7.md',
    id: '07-plusquamperfekt-konjunktiv2',
    number: 7,
    title: 'Plusquamperfekt, Konjunktiv II & Vorgangspassiv',
    shortTitle: 'Plusquamperfekt',
    level: 'B1',
    summary:
      'The past perfect, the subjunctive of unreality (Konjunktiv II) for hypotheticals and politeness, and the process passive.',
  },
  {
    weekFile: 'week_8.md',
    id: '08-double-infinitive',
    number: 8,
    title: 'Double Infinitive, Fixed Prepositions & Conjunctions',
    shortTitle: 'Double Infinitive',
    level: 'B1',
    summary:
      'The double infinitive with modals in the Perfekt, verbs and adjectives with fixed prepositions, adverbial clauses with indem, and two-part correlative conjunctions.',
  },
  {
    weekFile: 'week_9.md',
    id: '09-konjunktiv1',
    number: 9,
    title: 'Konjunktiv I, Futur II & Verb Valency',
    shortTitle: 'Konjunktiv I',
    level: 'B1',
    summary:
      'Indirect speech and Konjunktiv I, the future perfect (Futur II), verb valency patterns, and discourse connectors for text cohesion.',
  },
  {
    weekFile: 'week_10.md',
    id: '10-zustandspassiv',
    number: 10,
    title: 'Zustandspassiv, Participial Constructions & Konjunktiv II Past',
    shortTitle: 'Zustandspassiv',
    level: 'B2',
    summary:
      'The state passive, advanced passive constructions, participial adjectives and extended participial phrases, and past unreal Konjunktiv II.',
  },
  {
    weekFile: 'week_11.md',
    id: '11-konjunktiv1-nominalstil',
    number: 11,
    title: 'Konjunktiv I Complete, N-Declension Review & Nominalstil',
    shortTitle: 'Konjunktiv I Complete',
    level: 'B2',
    summary:
      'The complete Konjunktiv I system for reported speech, a comprehensive N-declension review, and nominal style (Nominalstil).',
  },
  {
    weekFile: 'week_12.md',
    id: '12-integration',
    number: 12,
    title: 'Advanced Structures & Full System Integration',
    shortTitle: 'Integration',
    level: 'B2',
    summary:
      'Advanced word order, unreal comparisons, brauchen + zu, lassen + Infinitiv, subjective modals, conditional sentences, integrated production exercises, and the complete reference tables.',
  },
]

export const lessonById = new Map(LESSONS.map((l) => [l.id, l]))

// --------------------------------------------------------------------- tables

/** Which column of a vocabulary table holds which role. Columns are 0-based. */
export type TableShape = {
  head: number
  gloss?: number
  example?: number
  literal?: number
  informal?: number
  looksLike?: number
  derivedFrom?: number
  /** Every row is a fixed phrase regardless of structure. */
  forcePhrase?: boolean
  /** The formal column is what we index; the informal word is a relation. */
  registerFromCol?: number
}

/**
 * Vocabulary table shapes are recognised by their header row. Headers are
 * normalised (lowercase, non-word chars dropped, spaces collapsed) and matched
 * against these signatures in priority order. Unknown shapes warn loudly — that
 * is the corpus-growth alarm.
 */
export const TABLE_SHAPES: Array<{ match: string[]; shape: TableShape }> = [
  {
    match: ['components', 'compound', 'gender from', 'english'],
    shape: { head: 1, gloss: 3, derivedFrom: 0 },
  },
  {
    match: ['verb + preposition', 'english', 'example'],
    shape: { head: 0, gloss: 1, example: 2, forcePhrase: false },
  },
  { match: ['german', 'literal meaning', 'figurative meaning', 'example'], shape: { head: 0, gloss: 2, literal: 1, example: 3, forcePhrase: true } },
  { match: ['formal', 'informal', 'english', 'example (formal)'], shape: { head: 0, gloss: 2, informal: 1, example: 3, registerFromCol: 0 } },
  { match: ['german', 'looks like', 'actually means', 'example'], shape: { head: 0, gloss: 2, looksLike: 1, example: 3 } },
  { match: ['base verb', 'prefix verb (ver-)', 'meaning', 'example'], shape: { head: 1, gloss: 2, example: 3, derivedFrom: 0 } },
  { match: ['base verb', 'prefix verb', 'meaning', 'example'], shape: { head: 1, gloss: 2, example: 3, derivedFrom: 0 } },
  { match: ['base word', 'adjective', 'english', 'example'], shape: { head: 1, gloss: 2, example: 3, derivedFrom: 0 } },
  { match: ['base word', 'negative (un-)', 'meaning', 'example'], shape: { head: 1, gloss: 2, example: 3, derivedFrom: 0 } },
  { match: ['verb', 'noun', 'gender', 'english'], shape: { head: 1, gloss: 3, derivedFrom: 0 } },
  { match: ['verb', 'noun', 'english'], shape: { head: 1, gloss: 2, derivedFrom: 0 } },
  { match: ['adjective', 'noun', 'english'], shape: { head: 1, gloss: 2, derivedFrom: 0 } },
  { match: ['base verb', '-ung noun', 'meaning', 'example'], shape: { head: 1, gloss: 2, example: 3, derivedFrom: 0 } },
  { match: ['partizip', 'base verb', 'meaning', 'example'], shape: { head: 0, gloss: 2, example: 3, derivedFrom: 1 } },
  { match: ['connector', 'english', 'usage note and example'], shape: { head: 0, gloss: 1 } },
  { match: ['idiom', 'english', 'example'], shape: { head: 0, gloss: 1, example: 2, forcePhrase: true } },
  { match: ['phrase', 'english', 'example'], shape: { head: 0, gloss: 1, example: 2, forcePhrase: true } },
  { match: ['german', 'english', 'example'], shape: { head: 0, gloss: 1, example: 2 } },
  { match: ['#', 'german', 'english'], shape: { head: 1, gloss: 2 } },
]

// ------------------------------------------------------------------ notation

/** Verb 3sg stem-change stems, so `(wäscht)` reads as a conjugation cell and
 *  never as a plural. Lowercase German word, no spaces, no '+' → 3sg. */
export const VERB_3SG_RE = /^[a-zäöüß]{2,}(st|t|t|en)$/i

/** Valency patterns: `(+D)`, `(an + Acc)`, `(auf + Akk)`, `+ D + A`. */
export const VALENCY_RE = /^[^)]*\+[^)]*$/

/** Capitalised full plural forms — `(Väter)`, `(Romane)`, `(Geschäfte)`. */
export const FULL_PLURAL_RE = /^[A-ZÄÖÜ]/

// ------------------------------------------------------------ drill handling

/** Practice section titles — a topic whose title matches one of these is a
 *  practice topic; its answer-key H3 is folded into DrillItem.expected. */
export const PRACTICE_RE = /Practice|Integrated Production/i
export const VOCAB_RE = /Vocabulary/i
export const APPLIED_RE = /Applied Skills/i

/** The answer-key boundary inside a practice section. */
export const ANSWER_KEY_RE = /^###\s+[\d.]+\s+Answer Key/i

// ------------------------------------------------------------ rewriting

/** "Week 5" → "Lesson 5" everywhere except in the German words Woche(nende). */
export const WEEK_RE = /\bWeeks?\s+(\d+)(?:\s*[-–]\s*(\d+))?/g
export const WEEK_REPLACE = (_m: string, a: string, b: string | undefined) =>
  `Lesson${b ? 's' : ''} ${a}${b ? `–${b}` : ''}`