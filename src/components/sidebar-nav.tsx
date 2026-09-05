import { Link, useMatchRoute } from '@tanstack/react-router'
import { ChevronRight, BookOpen, Library, Layers, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { allLessons, topicsOfLesson } from '@/content/loader'

const LEVEL_COLOR: Record<string, string> = {
  A1: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  A2: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  B1: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  B2: 'bg-mauve-100 text-mauve-700 dark:bg-mauve-900/40 dark:text-mauve-300',
}

export function CefrBadge({ level, className }: { level: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', LEVEL_COLOR[level] ?? '', className)}>
      {level}
    </span>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const matchRoute = useMatchRoute()
  const lessonMatch = (matchRoute({ to: '/lessons/$lessonSlug', fuzzy: true }) as { lessonSlug: string } | false) || null
  const topicMatch = (matchRoute({ to: '/lessons/$lessonSlug/$topicSlug', fuzzy: true }) as { lessonSlug?: string; topicSlug?: string } | false) || null
  // On a topic page the lesson id comes from the topic match; on a lesson
  // page it comes from the lesson match.
  const openLessonId = topicMatch && 'lessonSlug' in topicMatch && topicMatch.lessonSlug ? (topicMatch.lessonSlug as string) : lessonMatch?.lessonSlug ?? null

  return (
    <nav className="flex flex-col gap-1 p-3 text-sm">
      {allLessons.map((lesson) => {
        const isOpen = openLessonId === lesson.id
        return (
          <div key={lesson.id}>
            <Link
              to="/lessons/$lessonSlug"
              params={{ lessonSlug: lesson.id }}
              onClick={onNavigate}
              className={cn(
                'hover:bg-accent-hover hover:text-accent-foreground flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors',
                isOpen && 'font-medium',
              )}
            >
              <ChevronRight className={cn('size-3.5 shrink-0 transition-transform', isOpen && 'rotate-90')} />
              <span className="tabular-nums">{lesson.number}</span>
              <span className="truncate">{lesson.shortTitle}</span>
              <CefrBadge level={lesson.level} className="ml-auto" />
            </Link>

            {isOpen && (
              <ul className="border-border/60 mt-0.5 mb-1 ml-[1.05rem] flex flex-col border-l">
                {topicsOfLesson(lesson).map((topic) => {
                  const active = topicMatch?.topicSlug === topic.slug
                  return (
                    <li key={topic.id}>
                      <Link
                        to="/lessons/$lessonSlug/$topicSlug"
                        params={{ lessonSlug: lesson.id, topicSlug: topic.slug }}
                        onClick={onNavigate}
                        className={cn(
                          'hover:text-foreground -ml-px flex items-center gap-2 border-l py-1 pl-3 transition-colors',
                          active ? 'border-primary text-foreground font-medium' : 'text-muted-foreground border-transparent',
                        )}
                      >
                        <span className={cn('size-1.5 shrink-0 rounded-full', active ? 'bg-primary' : 'bg-transparent')} />
                        <span className="truncate">{topic.title}</span>
                        {topic.status !== 'authored' && (
                          <span className="bg-peach-500/70 size-1.5 ml-auto shrink-0 rounded-full" title="Extracted — not hand-verified" />
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}

      <div className="bg-border my-2 h-px" />

      <Link
        to="/vocabulary"
        onClick={onNavigate}
        className="hover:bg-accent-hover hover:text-accent-foreground [&.active]:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 [&.active]:font-medium"
      >
        <BookOpen className="size-3.5" /> Vocabulary
      </Link>
      <Link
        to="/grammar"
        onClick={onNavigate}
        className="hover:bg-accent-hover hover:text-accent-foreground [&.active]:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 [&.active]:font-medium"
      >
        <GraduationCap className="size-3.5" /> Grammar
      </Link>
      <Link
        to="/reference"
        onClick={onNavigate}
        className="hover:bg-accent-hover hover:text-accent-foreground [&.active]:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 [&.active]:font-medium"
      >
        <Library className="size-3.5" /> Reference
      </Link>
      <Link
        to="/practice"
        onClick={onNavigate}
        className="hover:bg-accent-hover hover:text-accent-foreground [&.active]:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 [&.active]:font-medium"
      >
        <Layers className="size-3.5" /> Practice
      </Link>
    </nav>
  )
}