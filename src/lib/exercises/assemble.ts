// Deck assembly: claim → cap → spread

import { audioAvailable } from '@/lib/tts'
import { foldForSearch } from '@/lib/normalise'
import type { DrillBundle, ParadigmBundle, SentenceBundle, VocabBundle } from '@/content/types'
import { topics } from '@/content/loader'
import type { Deck, DeckFilters, ExerciseItem } from './types'
import {
  authoredItemsFromDrills,
  clozeFromDrills,
  conjugationCells,
  genderSnap,
  judgementFromWrongForms,
  matchGrid,
  meaningMCQ,
  partizipPairs,
  pluralForge,
  sentenceBuilders,
  typedRecall,
  vocabReveal,
} from './generators'

export type Bundles = {
  vocab: VocabBundle
  sentences: SentenceBundle
  drills: DrillBundle
  paradigms: ParadigmBundle
}

const KINDS_ORDER: ExerciseItem['kind'][] = [
  'vocab-reveal',
  'gender',
  'meaning-mcq',
  'typed-recall',
  'conjugation-cell',
  'plural',
  'partizip-pair',
  'cloze',
  'sentence-builder',
  'match-grid',
  'judgement',
  'authored',
]

function kindMatchesMode(kind: ExerciseItem['kind'], mode: DeckFilters['mode']): boolean {
  if (mode === 'mixed' || !mode) return true
  if (mode === 'vocab') return ['vocab-reveal', 'gender', 'meaning-mcq', 'typed-recall', 'plural', 'partizip-pair', 'match-grid'].includes(kind)
  if (mode === 'grammar') return ['conjugation-cell', 'cloze', 'sentence-builder', 'judgement', 'authored'].includes(kind)
  if (mode === 'production') return ['typed-recall', 'cloze', 'sentence-builder', 'authored'].includes(kind)
  if (mode === 'listening') return false // dictation kinds not shipped — always empty
  return true
}

export function buildDeck(filters: DeckFilters, bundles: Bundles, _options?: { seed?: number }): Deck {
  // Generate all pools
  const entries = bundles.vocab.entries
  const sentences = bundles.sentences.sentences
  const drills = bundles.drills.drills
  const wrongForms = bundles.drills.wrongForms
  const paradigms = bundles.paradigms.paradigms

  // Apply pre-filtering to entries/sentences based on theme, pos, level, point, lexeme, lesson, topic
  let filteredEntries = entries
  if (filters.theme) filteredEntries = filteredEntries.filter((e) => e.themes.includes(filters.theme!))
  if (filters.pos) filteredEntries = filteredEntries.filter((e) => e.pos === filters.pos)
  if (filters.level) filteredEntries = filteredEntries.filter((e) => e.level === filters.level)
  if (filters.gender) filteredEntries = filteredEntries.filter((e) => e.gender === filters.gender)
  if (filters.lexeme) filteredEntries = filteredEntries.filter((e) => e.id === filters.lexeme)
  if (filters.q) {
    const q = foldForSearch(filters.q)
    filteredEntries = filteredEntries.filter(
      (e) => foldForSearch(e.headword).includes(q) || foldForSearch(e.lemma).includes(q) || e.glosses.some((g) => foldForSearch(g).includes(q)),
    )
  }
  if (filters.lesson) {
    filteredEntries = filteredEntries.filter((e) => e.occurrences.some((o) => o.topicId.startsWith(filters.lesson!)))
  }
  if (filters.topic) {
    filteredEntries = filteredEntries.filter((e) => e.occurrences.some((o) => o.topicId === filters.topic))
  }
  if (filters.point) {
    // points belong to topics — match topic
    const pointTopicIds = Object.values(topics)
      .filter((t) => t.points.includes(filters.point!))
      .map((t) => t.id)
    const set = new Set(pointTopicIds)
    filteredEntries = filteredEntries.filter((e) => e.occurrences.some((o) => set.has(o.topicId)))
  }

  let filteredSentences = sentences
  if (filters.theme) {
    const ids = new Set(filteredEntries.map((e) => e.id))
    filteredSentences = filteredSentences.filter((s) => s.lexemeIds.some((id) => ids.has(id)))
  }
  if (filters.lesson) {
    filteredSentences = filteredSentences.filter((s) => s.topicId.startsWith(filters.lesson!))
  }
  if (filters.topic) {
    filteredSentences = filteredSentences.filter((s) => s.topicId === filters.topic)
  }
  if (filters.level) filteredSentences = filteredSentences.filter((s) => s.level === filters.level)

  // Build kind pools
  const pools = new Map<ExerciseItem['kind'], ExerciseItem[]>()

  const addPool = (kind: ExerciseItem['kind'], items: ExerciseItem[]) => {
    let filtered = items
    // Pools are already built from lesson/topic-filtered entries and
    // sentences; this only re-checks item-level hrefs with exact prefixes —
    // slug-substring matching leaks across lessons (02-vocabulary repeats).
    if (filters.lesson) {
      const prefix = `/lessons/${filters.lesson}/`
      const entryIds = new Set(filteredEntries.map((e) => e.id))
      filtered = filtered.filter((it) => {
        if (it.sourceHref?.startsWith(prefix)) return true
        // Vocab-sourced items whose href is missing: keep iff a source lexeme
        // survived the entry filter (any, not just the first).
        if (it.sourceIds.length) {
          if (it.sourceIds.some((sid) => entryIds.has(sid))) return true
          const entry = entries.find((e) => e.id === it.sourceIds[0])
          if (entry) return entry.occurrences.some((o) => o.topicId.startsWith(prefix.slice(9)))
        }
        return false
      })
    }
    if (filters.topic) {
      const href = `/lessons/${filters.topic}`
      const entryIds = new Set(filteredEntries.map((e) => e.id))
      filtered = filtered.filter((it) => {
        if (it.sourceHref === href) return true
        // check via occurrences
        if (it.sourceIds.some((sid) => entryIds.has(sid))) {
          const entry = entries.find((e) => it.sourceIds.includes(e.id))
          if (entry) return entry.occurrences.some((o) => o.topicId === filters.topic)
        }
        return false
      })
    }
    // unverified filtering: extracted = unverified, reviewed/authored = verified
    if (filters.unverified === false) {
      filtered = filtered.filter((it) => !(it.riskyWhenUnverified && it.verification === 'extracted'))
    }
    // audio filtering
    const audioOff = filters.audio === 'off' || !audioAvailable()
    if (audioOff) {
      // No dictation kinds shipped, so nothing to drop; but keep for future
    }
    // mode filtering
    filtered = filtered.filter((it) => kindMatchesMode(it.kind, filters.mode))
    pools.set(kind, shuffle(filtered))
  }

  addPool('vocab-reveal', vocabReveal(filteredEntries))
  addPool('gender', genderSnap(filteredEntries))
  addPool('meaning-mcq', meaningMCQ(filteredEntries))
  addPool('typed-recall', typedRecall(filteredEntries))
  addPool('conjugation-cell', conjugationCells(filteredEntries, paradigms))
  addPool('plural', pluralForge(filteredEntries))
  addPool('partizip-pair', partizipPairs(filteredEntries))
  addPool('cloze', clozeFromDrills(filteredEntries, filteredSentences))
  addPool('sentence-builder', sentenceBuilders(filteredSentences))
  addPool('match-grid', matchGrid(filteredEntries))
  addPool('judgement', judgementFromWrongForms(wrongForms.filter((wf) => {
    if (filters.lesson && !wf.topicId.startsWith(filters.lesson)) return false
    if (filters.topic && wf.topicId !== filters.topic) return false
    return true
  })))
  addPool('authored', authoredItemsFromDrills(drills.filter((d) => {
    if (filters.lesson && !d.topicId.startsWith(filters.lesson)) return false
    if (filters.topic && d.topicId !== filters.topic) return false
    return true
  })))

  // Determine deck size
  const size = filters.size ?? 20
  const targetSize = size === 0 ? Number.POSITIVE_INFINITY : size

  // 1) claim: round-robin admitting only if sourceIds not already claimed
  const claimed = new Set<string>()
  const deck: ExerciseItem[] = []

  // Round-robin
  let progress = true
  // total available
  const totalAvailable = [...pools.values()].reduce((a, b) => a + b.length, 0)
  const maxIterations = totalAvailable * 2 + 10
  let iter = 0
  while (deck.length < targetSize && progress && iter < maxIterations) {
    progress = false
    for (const kind of KINDS_ORDER) {
      if (deck.length >= targetSize) break
      const pool = pools.get(kind)
      if (!pool || pool.length === 0) continue
      // Find first item in pool whose sourceIds not claimed
      const pos = pool.findIndex((it) => it.sourceIds.every((sid) => !claimed.has(sid)))
      if (pos === -1) continue
      const [item] = pool.splice(pos, 1)
      if (!item) continue
      deck.push(item)
      for (const sid of item.sourceIds) claimed.add(sid)
      progress = true
    }
    iter++
  }

  // If still under target and pools have items with claimed overlap, we already exhausted claimable
  // No further items (spec says admit only if none of sourceIds already claimed)

  // Shuffle deck initial order? Keep round-robin order but add small randomization for direction already done

  // 2) cap: no single kind exceeds 30% of deck (unless size=0).
  // Recomputed after each removal — shrinking the deck lowers the cap.
  if (size !== 0 && deck.length > 0) {
    for (const kind of KINDS_ORDER) {
      const cap = Math.ceil(deck.length * 0.3)
      const count = deck.filter((it) => it.kind === kind).length
      if (count > cap) {
        const excess = count - cap
        // find indices of this kind
        const indices: number[] = []
        deck.forEach((it, i) => { if (it.kind === kind) indices.push(i) })
        const toRemove = shuffle(indices).slice(0, excess).sort((a, b) => b - a)
        for (const r of toRemove) deck.splice(r, 1)
      }
    }
  }

  // 3) spread: one linear pass swapping forward any item that would be third consecutive of its kind
  for (let i = 2; i < deck.length; i++) {
    const a = deck[i - 2]!
    const b = deck[i - 1]!
    const c = deck[i]!
    if (a.kind === b.kind && b.kind === c.kind) {
      // find forward swap target
      let swapIdx = -1
      for (let j = i + 1; j < deck.length; j++) {
        if (deck[j]!.kind !== c.kind) { swapIdx = j; break }
      }
      if (swapIdx !== -1) {
        const tmp = deck[i]!
        deck[i] = deck[swapIdx]!
        deck[swapIdx] = tmp
      }
    }
  }

  // Build meta
  const byKind: Record<string, number> = {}
  for (const k of KINDS_ORDER) byKind[k] = 0
  for (const it of deck) byKind[it.kind] = (byKind[it.kind] ?? 0) + 1

  const lessonLabels: string[] = []
  if (filters.lesson) {
    // fallback: use lesson id
    lessonLabels.push(filters.lesson)
  } else {
    // collect lessons from items
    const set = new Set<string>()
    for (const it of deck) {
      if (it.sourceHref) {
        const match = it.sourceHref.match(/^\/lessons\/([^/]+)/)
        if (match?.[1]) set.add(match[1]!)
      }
    }
    lessonLabels.push(...[...set].slice(0, 5))
  }

  const themeLabels: string[] = []
  if (filters.theme) themeLabels.push(filters.theme)
  else {
    const tset = new Set<string>()
    for (const it of filteredEntries.slice(0, 20)) {
      for (const th of it.themes) tset.add(th)
    }
    // limit
  }

  const wordCount = new Set(deck.flatMap((d) => d.sourceIds)).size

  // Final truncation to size (if claim produced more than target due to infinite? but we limited)
  const finalItems = size === 0 ? deck : deck.slice(0, size)

  return {
    items: finalItems,
    meta: {
      total: finalItems.length,
      byKind: byKind as Deck['meta']['byKind'],
      lessonLabels,
      themeLabels,
      wordCount,
    },
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}
