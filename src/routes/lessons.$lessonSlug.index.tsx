import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { notFound } from '@tanstack/react-router'
import { getLesson, loadLessonIntro, topicsOfLesson } from '@/content/loader'
import { CefrBadge } from '@/components/sidebar-nav'
import { Card } from '@/components/ui/card'

export const Route = createFileRoute('/lessons/$lessonSlug/')({
  component: LessonPage,
})

function LessonPage() {
  const { lessonSlug } = Route.useParams()
  const lesson = getLesson(lessonSlug)
  const [intro, setIntro] = useState<string | null>(null)

  useEffect(() => {
    if (lesson) loadLessonIntro(lesson).then(setIntro)
  }, [lesson])

  if (!lesson) throw notFound()

  const topics = topicsOfLesson(lesson)
  const renderLabel: Record<string, string> = {
    prose: 'Grammar',
    vocabulary: 'Vocabulary',
    practice: 'Practice',
    applied: 'Applied skills',
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-muted-foreground text-xs">Lesson {lesson.number}</span>
        <CefrBadge level={lesson.level} />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
      {intro && <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{intro.replace(/^#.*\n+/, '').trim()}</p>}

      <div className="mt-8 flex flex-col gap-2">
        {topics.map((topic, i) => (
          <Link
            key={topic.id}
            to="/lessons/$lessonSlug/$topicSlug"
            params={{ lessonSlug: lesson.id, topicSlug: topic.slug }}
          >
            <Card className="hover:bg-accent-hover flex items-center justify-between gap-4 p-4 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground tabular-nums">{topic.number}</span>
                <span className="font-medium">{topic.title}</span>
                {topic.status !== 'authored' && (
                  <span className="bg-peach-500/70 size-1.5 rounded-full" title="Extracted — not hand-verified" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs">{renderLabel[topic.render] ?? 'Grammar'}</span>
                {i < topics.length - 1 ? (
                  <span className="text-muted-foreground/60 text-xs">→</span>
                ) : (
                  <span className="text-muted-foreground text-xs">→</span>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}