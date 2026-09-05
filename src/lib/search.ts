// Substring match across lessons, topics, grammar points and vocabulary, with
// umlaut folding so typing `uber` finds `über`. Vocabulary is lazy, so the
// search index builds once the first bundle is loaded.

import { allLessons, allTopics, points } from '@/content/loader'
import { foldForSearch } from '@/lib/normalise'

export type SearchResult =
  | { kind: 'lesson'; label: string; hint: string; to: string }
  | { kind: 'topic'; label: string; hint: string; to: string }
  | { kind: 'point'; label: string; hint: string; to: string }
  | { kind: 'word'; label: string; hint: string; to: string }

let vocabIndex: Array<{ id: string; label: string; hint: string; to: string }> | null = null

export function setVocabIndex(index: typeof vocabIndex): void {
  vocabIndex = index
}

export function search(query: string): SearchResult[] {
  const q = foldForSearch(query)
  if (!q) return []
  const out: Array<{ score: number; result: SearchResult }> = []

  for (const lesson of allLessons) {
    const label = lesson.title
    const key = foldForSearch(label)
    if (!key.includes(q)) continue
    out.push({ score: key.startsWith(q) ? 0 : 3, result: { kind: 'lesson', label, hint: `Lesson ${lesson.number} · ${lesson.level}`, to: `/lessons/${lesson.id}` } })
  }

  for (const topic of allTopics) {
    const key = foldForSearch(topic.title)
    if (!key.includes(q)) continue
    out.push({ score: 4, result: { kind: 'topic', label: topic.title, hint: `Lesson ${topic.lessonId}`, to: `/lessons/${topic.lessonId}/${topic.slug}` } })
  }

  for (const point of Object.values(points)) {
    const key = foldForSearch(`${point.term} ${point.englishTerm} ${point.definition}`)
    if (!key.includes(q)) continue
    out.push({ score: 1, result: { kind: 'point', label: point.term, hint: point.englishTerm, to: `/grammar#${point.id}` } })
  }

  if (vocabIndex) {
    for (const w of vocabIndex) {
      const key = foldForSearch(w.label)
      if (!key.includes(q)) continue
      out.push({ score: key.startsWith(q) ? 2 : 5, result: { kind: 'word', label: w.label, hint: w.hint, to: w.to } })
    }
  }

  return out.sort((a, b) => a.score - b.score).slice(0, 24).map((s) => s.result)
}