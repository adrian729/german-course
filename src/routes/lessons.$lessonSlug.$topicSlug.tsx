import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getLesson, getTopic, lessonHasPractice, loadApplied, loadTopicBody, resolveRevisits, topicHasPractice, topicPosition } from '@/content/loader'
import type { ReadingText, WritingPrompt } from '@/content/types'
import { MarkdownBody } from '@/components/markdown-body'
import { VocabTable } from '@/components/vocab-table'
import { DrillList } from '@/components/drill-list'
import { AppliedPanels } from '@/components/reading-writing-panels'
import { CefrBadge } from '@/components/sidebar-nav'
import { VerifiedBadge } from '@/components/verified-badge'
import { SpeakButton } from '@/components/speak-button'

export const Route = createFileRoute('/lessons/$lessonSlug/$topicSlug')({
  component: TopicPage,
})

function TopicPage() {
  const { lessonSlug, topicSlug } = Route.useParams()
  const topic = getTopic(`${lessonSlug}/${topicSlug}`)
  const [body, setBody] = useState<string | null>(null)
  const [applied, setApplied] = useState<{ readings: ReadingText[]; prompts: WritingPrompt[] } | null>(null)

  useEffect(() => {
    if (!topic) return
    setBody(null)
    loadTopicBody(topic).then(setBody)
    if (topic.render === 'applied') loadApplied().then(setApplied)
  }, [topic])

  if (!topic) throw notFound()
  const lesson = getLesson(lessonSlug)
  if (!lesson) throw notFound()

  const pos = topicPosition(topic)
  const revisits = resolveRevisits(topic)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex gap-8">
        <div className="mx-auto min-w-0 max-w-3xl flex-1">
      <div className="mb-1 flex items-center gap-2 text-xs">
        <Link to="/lessons/$lessonSlug" params={{ lessonSlug: lesson.id }} className="text-muted-foreground hover:text-foreground">
          Lesson {lesson.number}
        </Link>
        <span className="text-muted-foreground">›</span>
        <span className="text-muted-foreground">{topic.title}</span>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{topic.title}</h1>
        <SpeakButton text={topic.title} size="icon" />
      </div>
      <div className="mb-6 flex items-center gap-2">
        <CefrBadge level={lesson.level} />
        <VerifiedBadge status={topic.status} />
        <span className="text-muted-foreground/70 text-xs">Topic {topic.number} of {lesson.topicOrder.length}</span>
      </div>

      {revisits.length > 0 && (
        <div className="border-primary/30 my-4 rounded-lg border-l-2 pl-4">
          {revisits.map((r) => (
            <p key={r.pointId} className="text-muted-foreground text-sm">
              {r.direction === 'back' ? 'Built on' : 'See also'} <Link to="/grammar" hash={r.pointId} className="text-primary hover:underline">{r.point.term}</Link> — {r.note}
            </p>
          ))}
        </div>
      )}

      {body === null ? (
        <div className="text-muted-foreground my-8 text-sm">Loading…</div>
      ) : topic.render === 'prose' ? (
        <MarkdownBody source={body} />
      ) : topic.render === 'vocabulary' ? (
        <>
          {body && <MarkdownBody source={body} />}
          <VocabTable topic={topic} />
        </>
      ) : topic.render === 'practice' ? (
        <>
          {body && <MarkdownBody source={body} />}
          <DrillList topic={topic} />
        </>
      ) : (
        <>
          {body && <MarkdownBody source={body} />}
          {applied && <AppliedPanels topic={topic} readings={applied.readings} prompts={applied.prompts} />}
        </>
      )}

      <div className="text-muted-foreground mt-10 flex items-center justify-between gap-4 border-t pt-4 text-sm">
        {pos.prev ? (
          <Link
            to="/lessons/$lessonSlug/$topicSlug"
            params={{ lessonSlug: lesson.id, topicSlug: pos.prev.slug }}
            className="hover:underline"
          >
            ← {pos.prev.title}
          </Link>
        ) : (
          <span />
        )}
        {topicHasPractice(topic.id) ? (
          <Link to="/practice" search={{ topic: topic.id, mode: 'mixed' }} className="text-primary shrink-0 hover:underline">
            Practice this topic →
          </Link>
        ) : lessonHasPractice(lesson.id) ? (
          <Link to="/practice" search={{ lesson: lesson.id, mode: 'mixed' }} className="text-primary shrink-0 hover:underline">
            Practice lesson {lesson.number} →
          </Link>
        ) : null}
        {pos.next ? (
          <Link
            to="/lessons/$lessonSlug/$topicSlug"
            params={{ lessonSlug: lesson.id, topicSlug: pos.next.slug }}
            className="hover:underline"
          >
            {pos.next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
        </div>
        <TopicRail body={body} />
      </div>
    </div>
  )
}

function TopicRail({ body }: { body: string | null }) {
  if (!body) return null
  const headings = [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].slice(0, 12).map((m, i) => ({
    id: `h-${i}-${(m[1] ?? '').toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40)}`,
    label: (m[1] ?? '').replace(/\*\*/g, '').slice(0, 48),
  }))
  if (headings.length === 0) return null
  return (
    <aside className="hidden w-48 shrink-0 xl:block">
      <div className="sticky top-20">
        <div className="text-xs font-semibold tracking-wide uppercase">On this page</div>
        <nav className="mt-3 flex flex-col gap-1.5">
          {headings.map((h) => (
            <span key={h.id} className="text-muted-foreground text-sm">
              {h.label}
            </span>
          ))}
        </nav>
      </div>
    </aside>
  )
}