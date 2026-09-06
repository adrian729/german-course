 
 
 
 
 
 

import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { getPoint, getTopic, loadVocab } from '@/content/loader'
import type { VocabEntry } from '@/content/types'
import type { MarkdownComponentProps } from '@/components/markdown-body'

const VOCAB_HREF = /^\/vocabulary#(.+)$/
const GRAMMAR_HREF = /^\/grammar#(.+)$/
const LESSON_HREF = /^\/lessons\/([^/]+)\/([^/]+)$/

function useVocabEntry(id: string): VocabEntry | undefined {
  const [entry, setEntry] = useState<VocabEntry | undefined>()
  useEffect(() => {
    let alive = true
    loadVocab().then((b) => {
      if (alive) setEntry(b.entries.find((e) => e.id === id))
    })
    return () => {
      alive = false
    }
  }, [id])
  return entry
}

export function ContentAnchor({ href, children, ...props }: MarkdownComponentProps<'a'>) {
  const vocab = typeof href === 'string' ? VOCAB_HREF.exec(href)?.[1] : undefined
  const pointId = typeof href === 'string' ? GRAMMAR_HREF.exec(href)?.[1] : undefined
  const lessonMatch = typeof href === 'string' ? LESSON_HREF.exec(href) : null

  if (lessonMatch) {
    const topic = getTopic(`${lessonMatch[1]}/${lessonMatch[2]}`)
    if (topic) {
      return (
        <Link to="/lessons/$lessonSlug/$topicSlug" params={{ lessonSlug: topic.lessonId, topicSlug: topic.slug }} className="decoration-primary/60 hover:decoration-primary underline decoration-dotted underline-offset-4">
          {children}
        </Link>
      )
    }
  }

  if (vocab) {
    return (
      <VocabularyLink id={vocab}>
        {children}
      </VocabularyLink>
    )
  }

  if (pointId) {
    const point = getPoint(pointId)
    return (
      <HoverCard openDelay={300} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Link to="/grammar" hash={pointId} className="decoration-primary/60 hover:decoration-primary underline decoration-dotted underline-offset-4">
            {children}
          </Link>
        </HoverCardTrigger>
        {point && (
          <HoverCardContent className="w-80 text-sm" side="top" align="start">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="font-semibold">{point.term}</span>
              <span className="text-muted-foreground shrink-0 text-xs">{point.englishTerm}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">{point.definition}</p>
            <Link to="/grammar" hash={point.id} className="text-primary mt-2 inline-block text-xs hover:underline">
              See in grammar →
            </Link>
          </HoverCardContent>
        )}
      </HoverCard>
    )
  }

  const external = typeof href === 'string' && /^https?:/.test(href)
  return (
    <a
      href={href}
      className="decoration-primary/50 underline underline-offset-2"
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      {...props}
    >
      {children}
    </a>
  )
}

function VocabularyLink({ id, children }: { id: string; children: React.ReactNode }) {
  const entry = useVocabEntry(id)
  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Link to="/vocabulary/$wordSlug" params={{ wordSlug: id }} className="decoration-primary/60 hover:decoration-primary underline decoration-dotted underline-offset-4">
          {children}
        </Link>
      </HoverCardTrigger>
      {entry && (
        <HoverCardContent className="w-80 text-sm" side="top" align="start">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="font-semibold">{entry.headword}</span>
            {entry.pos && <span className="text-muted-foreground shrink-0 text-xs">{entry.pos}</span>}
          </div>
          <p className="text-muted-foreground leading-relaxed">{entry.glosses[0]}</p>
          <Link to="/vocabulary/$wordSlug" params={{ wordSlug: id }} className="text-primary mt-2 inline-block text-xs hover:underline">
            Word page →
          </Link>
        </HoverCardContent>
      )}
    </HoverCard>
  )
}