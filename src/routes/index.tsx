import { createFileRoute, Link } from '@tanstack/react-router'
import { allLessons, stats, topicsOfLesson } from '@/content/loader'
import { CefrBadge } from '@/components/sidebar-nav'
import { Card, CardHeader } from '@/components/ui/card'

export const Route = createFileRoute('/')({
  component: LessonList,
})

function LessonList() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Deutsch — A1 to B2</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {stats.lexemes} words · {Object.keys(useTopics()).length} topics · A1 → B2
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Lessons 1–2 are hand-checked. Lessons 3–12 are extracted from the source notes and marked unverified.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {allLessons.map((lesson) => {
          const topics = topicsOfLesson(lesson)
          const wordCount = topics.reduce((n, t) => n + t.counts.vocab, 0)
          const verified = lesson.status === 'authored'
          return (
            <Link key={lesson.id} to="/lessons/$lessonSlug" params={{ lessonSlug: lesson.id }} className="group">
              <Card className="hover:bg-accent-hover transition-colors">
                <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground tabular-nums">{lesson.number}</span>
                    <div>
                      <div className="font-medium group-hover:text-foreground">{lesson.title}</div>
                      <div className="text-muted-foreground text-xs">
                        {topics.length} topics · {wordCount} words
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {verified ? (
                      <span className="text-muted-foreground text-xs">verified</span>
                    ) : (
                      <span className="text-muted-foreground/70 text-xs">unverified</span>
                    )}
                    <CefrBadge level={lesson.level} />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function useTopics() {
  return Object.fromEntries(allLessons.flatMap((l) => topicsOfLesson(l).map((t) => [t.id, t])))
}