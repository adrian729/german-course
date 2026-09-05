// Typed German grading. The layer at which equality first holds is the grade.
//
// N1  — umlaut folding is DISABLED when the umlaut IS the answer (Vater→Väter,
//       Maus→Mäuse, hoch→höher, groß→größten). strictUmlaut is computed once
//       per item at generation time, so it costs one comparison here.
// N2  — capitalisation is graded whenever the answer is or contains a noun.
// N3  — the article is part of a noun; its absence is a diagnosis, not a typo.
// N4  — the fuzzy radius must be smaller than the distance to the nearest
//       paradigm sibling (keine/keinen/keinem/keiner). Checked at build.
// N5  — word order is never fuzzy.
// N6  — never-fuzzy blocklist, seeded from the false-friend table.

import { l1, l2, l3, l4, tokens, umlautFold } from './normalise'

export type GradeOutcome =
  | 'exact'
  | 'umlaut-miss'
  | 'case-miss'
  | 'article-miss'
  | 'near'
  | 'wrong'
  | 'almost' // word order right, order wrong — Translation only

export type GradeResult = {
  outcome: GradeOutcome
  /** Which accepted answer (index) matched, when any. */
  matched: number
  /** Damerau–Levenshtein distance to the closest accepted answer. */
  distance: number
}

// ------------------------------------------------------------------ fuzzy

/** Damerau–Levenshtein distance; transpositions count as one. */
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prevRow: number[] = new Array(n + 1)
  const currRow: number[] = new Array(n + 1)
  const twoBack: number[] = new Array(n + 1)
  for (let j = 0; j <= n; j++) prevRow[j] = j
  for (let i = 1; i <= m; i++) {
    currRow[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      currRow[j] = Math.min(currRow[j - 1]! + 1, prevRow[j]! + 1, prevRow[j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        currRow[j] = Math.min(currRow[j]!, twoBack[j - 2]! + 1)
      }
    }
    for (let j = 0; j <= n; j++) {
      twoBack[j] = prevRow[j]!
      prevRow[j] = currRow[j]!
    }
  }
  return prevRow[n]!
}

/** Radius: len ≤ 6 → 1, 7–12 → 2, >12 → 3; transpositions count as one. */
export const fuzzyRadius = (len: number): number => (len <= 6 ? 1 : len <= 12 ? 2 : 3)

/** The never-fuzzy blocklist (N6) — seeded from the false-friend table. */
export const NEVER_FUZZY = new Set(['rat', 'rad', 'see', 'sehe', 'note', 'not'])

// ---------------------------------------------------------------- grading

export type GradeOptions = {
  /** true when the umlaut IS the answer — N1. */
  strictUmlaut?: boolean
  /** true when capitalisation is graded — N2 (nouns, dictation, translation). */
  gradeCase?: boolean
  /** true when a leading article is expected (noun answers) — N3. */
  expectsArticle?: boolean
  /** N5: whether word order matters (sentence-building shapes). */
  orderSensitive?: boolean
}

const ARTICLES = /^(der|die|das|den|dem|des|ein|eine|einen|einem|eines|einer|kein|keine|keinen|keinem|keines|keiner)\s+/i

const stripArticle = (s: string): string => s.replace(ARTICLES, '')

/**
 * Closed-class paradigm families (N4). Fuzzy matching is disabled when both
 * sides look like short grammatical words — keine/keinen, dem/den/des/der,
 * nimmst/nimmt, dass/das, wenn/wann/denn — because the edit radius is smaller
 * than the distance between siblings and would otherwise accept a wrong cell.
 */
const CLOSED_CLASS = new Set(
  [
    'der', 'die', 'das', 'den', 'dem', 'des',
    'ein', 'eine', 'einen', 'einem', 'eines', 'einer',
    'kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines',
    'mein', 'meine', 'meinen', 'meinem', 'meiner', 'meins',
    'dein', 'deine', 'seine', 'seiner', 'ihre', 'ihrer', 'unsere', 'eure',
    'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr',
    'mich', 'dich', 'sich', 'uns', 'euch',
    'mir', 'dir', 'ihm', 'ihnen',
    'bin', 'bist', 'ist', 'sind', 'seid',
    'habe', 'hast', 'hat', 'haben', 'habt',
    'werde', 'wirst', 'wird', 'werden', 'werdet',
    'kann', 'kannst', 'will', 'willst', 'muss', 'musst', 'soll', 'sollst', 'darf', 'darfst', 'mag', 'magst',
    'nimmst', 'nimmt', 'nehme', 'nehmen', 'nehmt',
    'dass', 'das', 'wenn', 'wann', 'denn',
    'nicht', 'kein',
  ].map((w) => w.toLowerCase()),
)

export function grade(input: string, accepted: string[], opts: GradeOptions = {}): GradeResult {
  const raw = l1(input)
  const i2 = l2(raw)
  const i4 = l4(raw)
  const strictUmlaut = opts.strictUmlaut ?? false

  let best: GradeResult = { outcome: 'wrong', matched: -1, distance: Number.MAX_SAFE_INTEGER }
  const consider = (r: GradeResult) => {
    if (rank(r.outcome) < rank(best.outcome)) best = r
  }

  for (let ai = 0; ai < accepted.length; ai++) {
    const ans = accepted[ai]!
    const a2 = l2(ans)
    const a4 = l4(ans)

    // exact — L2 equal. When case is not graded (verb forms, endings,
    // particles), case-insensitive equality counts as exact — but folding
    // stays enabled only when the umlaut is NOT the answer (N1).
    if (i2 === a2) return { outcome: 'exact', matched: ai, distance: 0 }
    if (opts.gradeCase === false && !strictUmlaut && i4 === a4) return { outcome: 'exact', matched: ai, distance: 0 }
    if (opts.gradeCase === false && strictUmlaut && l2(raw).toLowerCase() === l2(ans).toLowerCase()) {
      return { outcome: 'exact', matched: ai, distance: 0 }
    }

    // N1: umlaut-miss (peach) — unless the umlaut IS the answer.
    // When strict, folding is disabled entirely: no umlaut-miss and no fuzzy,
    // so Vater for Väter grades wrong, not "almost".
    if (!strictUmlaut) {
      if (l3(raw) === l3(ans)) {
        consider({ outcome: 'umlaut-miss', matched: ai, distance: 0 })
        continue
      }
    }

    // case-miss (peach) — folded equal but casing differs. Only when graded.
    if (opts.gradeCase !== false && i4 === a4 && i2 !== a2) {
      consider({ outcome: 'case-miss', matched: ai, distance: 0 })
      continue
    }

    // N3: article-miss (peach) — noun without its article (or with an extra
    // one). Strip a leading article from BOTH sides: if the stripped forms
    // match while the full forms do not, the learner knew the word but not
    // its gender.
    if (opts.expectsArticle && a4 !== i4) {
      if (stripArticle(i4) === stripArticle(a4)) {
        consider({ outcome: 'article-miss', matched: ai, distance: 0 })
        continue
      }
    }

    // N4/N6: fuzzy. Skipped when the umlaut is the answer (N1), between
    // single-token closed-class paradigm siblings (N4 — keine/keinen, never
    // article+noun pairs, where the article alone must not disable fuzzy),
    // on the never-fuzzy blocklist (N6), and for word-order shapes
    // (N5 — handled as `almost` below).
    const foldedInput = umlautFold(i2).toLowerCase()
    const foldedAnswer = umlautFold(a2).toLowerCase()
    const singleToken = !i4.includes(' ') && !a4.includes(' ')
    const closedClassPair = singleToken && (CLOSED_CLASS.has(i4) || CLOSED_CLASS.has(a4))
    if (!strictUmlaut && !opts.orderSensitive && !NEVER_FUZZY.has(foldedInput) && !NEVER_FUZZY.has(foldedAnswer) && !closedClassPair) {
      const radius = fuzzyRadius(a4.length)
      const dist = damerauLevenshtein(i4, a4)
      if (dist <= radius && dist > 0) {
        consider({ outcome: 'near', matched: ai, distance: dist })
      }
    }
  }

  // N5: word order is never fuzzy — but Translation softens to `almost` when
  // the token multiset matches. Ranked, never returned outright, so a better
  // peach (case/article-miss) still wins.
  if (opts.orderSensitive) {
    const my = tokens(raw)
    accepted.forEach((ans, ai) => {
      const their = tokens(ans)
      if (my.length === their.length && [...my].sort().join(' ') === [...their].sort().join(' ')) {
        consider({ outcome: 'almost', matched: ai, distance: 1 })
      }
    })
  }

  return best
}

const RANK: Record<GradeOutcome, number> = {
  exact: 0,
  'umlaut-miss': 1,
  'case-miss': 2,
  'article-miss': 3,
  near: 4,
  almost: 5,
  wrong: 6,
}
const rank = (o: GradeOutcome): number => RANK[o]