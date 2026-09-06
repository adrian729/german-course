 
 
 

import { Link } from '@tanstack/react-router'
import { getLesson, topics } from '@/content/loader'
import type { Topic } from '@/content/types'
import { VerifiedBadge } from '@/components/verified-badge'
import { cn } from '@/lib/utils'
import type { ExerciseItem } from '@/lib/exercises/types'

let byHref: Map<string, Topic> | null = null

/** Generators emit `/lessons/<lessonId>/<slug>`; resolve it back to the topic. */
function topicOfHref(href: string | undefined): Topic | undefined {
  if (!href) return undefined
  if (!byHref) {
    byHref = new Map()
    for (const topic of Object.values(topics)) byHref.set(`/lessons/${topic.lessonId}/${topic.slug}`, topic)
  }
  return byHref.get(href)
}

export function sourceTopicOf(item: ExerciseItem): Topic | undefined {
  return topicOfHref(item.sourceHref)
}

export function Provenance({ item, className }: { item: ExerciseItem; className?: string }) {
  const topic = sourceTopicOf(item)
  const lesson = topic ? getLesson(topic.lessonId) : undefined

  return (
    <div className={cn('text-muted-foreground flex flex-wrap items-center justify-center gap-2 text-xs', className)}>
      {topic && lesson ? (
        <Link
          to="/lessons/$lessonSlug/$topicSlug"
          params={{ lessonSlug: topic.lessonId, topicSlug: topic.slug }}
          className="hover:text-foreground transition-colors"
        >
          Lesson {lesson.number} · {topic.title} →
        </Link>
      ) : (
        <span>Source unavailable</span>
      )}
      {item.verification !== 'authored' && <VerifiedBadge status={item.verification} />}
      {item.origin === 'authored' && <span className="opacity-70">from the book</span>}
    </div>
  )
}

/** The section rubric, verbatim. Summarising it is the bug it exists to prevent. */
export function Rubric({ text }: { text: string }) {
  return (
    <p className="border-border text-muted-foreground mx-auto max-w-xl border-l-2 py-1 pl-3 text-left text-xs leading-relaxed italic">
      {text}
    </p>
  )
}
