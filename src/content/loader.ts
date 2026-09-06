 
 
 
 

import { contentIndex } from './generated/index'
import type {
  AppliedBundle,
  ContentIndex,
  DrillBundle,
  GrammarPoint,
  Lesson,
  LessonId,
  ParadigmBundle,
  PointId,
  SentenceBundle,
  Topic,
  TopicId,
  VocabBundle,
} from './types'

export const { lessons, topics, points, errata, stats } = contentIndex

const lessonBodies = import.meta.glob('../../content/lessons/*/topics/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

const lessonIntros = import.meta.glob('../../content/lessons/*/index.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

export const allLessons = lessons
export const allTopics = Object.values(topics)

export const getLesson = (id: LessonId): Lesson | undefined => lessons.find((l) => l.id === id)
export const getTopic = (id: TopicId): Topic | undefined => topics[id]
export const getPoint = (id: PointId): GrammarPoint | undefined => points[id]

/** Build-time snapshot of what drillable material a topic contributes. A missing
 *  entry means the index predates topicStats — assume drillable. */
export function topicPracticeStats(id: TopicId) {
  return contentIndex.topicStats?.[id]
}

export function topicHasPractice(id: TopicId): boolean {
  const s = contentIndex.topicStats?.[id]
  if (!s) return true
  return s.entries > 0 || s.answerableDrills > 0 || s.wrongForms > 0
}

export function lessonHasPractice(id: LessonId): boolean {
  const lesson = getLesson(id)
  if (!lesson) return false
  return lesson.topicOrder.some((tid) => topicHasPractice(tid))
}

export const topicsOfLesson = (lesson: Lesson): Topic[] =>
  lesson.topicOrder.map((id) => topics[id]).filter((t): t is Topic => Boolean(t))

export async function loadTopicBody(topic: Topic): Promise<string> {
  const path = `../../content/lessons/${topic.lessonId}/topics/${topic.slug}.md`
  const load = lessonBodies[path]
  if (!load) throw new Error(`No markdown file for topic "${topic.id}" (looked for ${path})`)
  return load()
}

export async function loadLessonIntro(lesson: Lesson): Promise<string | null> {
  const load = lessonIntros[`../../content/lessons/${lesson.id}/index.md`]
  return load ? load() : null
}

 

let vocabPromise: Promise<VocabBundle> | null = null
let sentencePromise: Promise<SentenceBundle> | null = null
let drillPromise: Promise<DrillBundle> | null = null
let paradigmPromise: Promise<ParadigmBundle> | null = null
let appliedPromise: Promise<AppliedBundle> | null = null

export const loadVocab = (): Promise<VocabBundle> => (vocabPromise ??= import('./generated/vocab').then((m) => m.vocabbundle))
export const loadSentences = (): Promise<SentenceBundle> => (sentencePromise ??= import('./generated/sentences').then((m) => m.sentencebundle))
export const loadDrills = (): Promise<DrillBundle> => (drillPromise ??= import('./generated/drills').then((m) => m.drillbundle))
export const loadParadigms = (): Promise<ParadigmBundle> => (paradigmPromise ??= import('./generated/paradigms').then((m) => m.paradigmbundle))
export const loadApplied = (): Promise<AppliedBundle> => (appliedPromise ??= import('./generated/applied').then((m) => m.appliedbundle))

/** The word of a lesson, in reading order — one topic = one H2. */
export function lessonPosition(lesson: Lesson) {
  const index = lessons.indexOf(lesson)
  return {
    index,
    total: lessons.length,
    prev: index > 0 ? lessons[index - 1] : undefined,
    next: index < lessons.length - 1 ? lessons[index + 1] : undefined,
  }
}

/** Topic neighbours within a lesson — the prev/next the wireframe wants. */
export function topicPosition(topic: Topic): { index: number; total: number; prev?: Topic; next?: Topic } {
  const lesson = getLesson(topic.lessonId)
  if (!lesson) return { index: 0, total: 1 }
  const order = lesson.topicOrder
  const index = order.indexOf(topic.id)
  const prevId = index > 0 ? order[index - 1] : undefined
  const nextId = index >= 0 && index < order.length - 1 ? order[index + 1] : undefined
  return {
    index,
    total: order.length,
    prev: prevId ? topics[prevId] : undefined,
    next: nextId ? topics[nextId] : undefined,
  }
}

/** Global reading order for revisits direction — lesson number then topic order. */
function globalPosition(topic: Topic): number {
  const lesson = getLesson(topic.lessonId)
  if (!lesson) return Number.MAX_SAFE_INTEGER
  return lesson.number * 1000 + lesson.topicOrder.indexOf(topic.id)
}

/** Resolved revisits with direction computed from ordering — never authored. */
export function resolveRevisits(topic: Topic): Array<{ pointId: PointId; note: string; direction: 'back' | 'forward'; point: GrammarPoint }> {
  const here = globalPosition(topic)
  return (topic.revisits ?? []).flatMap((r) => {
    const point = points[r.pointId]
    if (!point) return []
    const target = topics[point.topicId]
    if (!target) return []
    return [{ pointId: r.pointId, note: r.note, direction: globalPosition(target) < here ? ('back' as const) : ('forward' as const), point }]
  })
}

export function bySlugOf(lesson: Lesson, topicSlug: string): Topic | undefined {
  return topics[`${lesson.id}/${topicSlug}`]
}

export type { ContentIndex }