import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { getLesson, points } from '@/content/loader'
import type { GrammarPoint } from '@/content/types'
import { foldForSearch } from '@/lib/normalise'
import { CefrBadge } from '@/components/sidebar-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/grammar')({
  component: GrammarPage,
})

function GrammarPage() {
  const allPoints = useMemo(() => Object.values(points).sort((a, b) => a.term.localeCompare(b.term, 'de')), [])
  const [query, setQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('q')
      return q ?? ''
    }
    return ''
  })

   
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (query) url.searchParams.set('q', query)
    else url.searchParams.delete('q')
    window.history.replaceState(null, '', url.toString())
  }, [query])

   
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return allPoints
    const needle = foldForSearch(query)
    return allPoints.filter((p) => {
      const hay = [p.term, p.englishTerm, ...(p.aliases ?? []), p.definition].join(' ')
      return foldForSearch(hay).includes(needle)
    })
  }, [allPoints, query])

  if (allPoints.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Grammar</h1>
        <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">Grammar points are being authored — check back soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Grammar</h1>
      <p className="text-muted-foreground mt-1 text-sm">{allPoints.length} points · A–Z</p>

      <div className="mt-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search grammar — e.g. dative, Konjunktiv, past"
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Search grammar points"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground mt-8 text-sm">No matches for “{query}”.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {filtered.map((point) => (
            <PointCard key={point.id} point={point} />
          ))}
        </div>
      )}
    </div>
  )
}

function PointCard({ point }: { point: GrammarPoint }) {
  const lesson = getLesson(point.lessonId)

  return (
    <Card id={point.id} className="scroll-mt-20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">
            {point.term} <span className="text-muted-foreground font-normal">— {point.englishTerm}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <CefrBadge level={point.level} />
            {lesson ? (
              <Link
                to="/lessons/$lessonSlug"
                params={{ lessonSlug: lesson.id }}
                className="text-primary text-xs hover:underline"
              >
                Lesson {lesson.number}
              </Link>
            ) : (
              <Badge variant="outline" className="text-xs">
                L — {point.lessonId}
              </Badge>
            )}
          </div>
        </div>
        {point.aliases.length > 0 && (
          <div className="text-muted-foreground text-xs">Also: {point.aliases.join(', ')}</div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed">{point.definition}</p>

        {point.sequence && point.sequence.length > 0 && (
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {point.sequence.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}

        {point.register && (
          <div className="bg-muted/40 rounded-md p-3 text-xs leading-relaxed">
            <div>
              <span className="font-medium">Spoken:</span> {point.register.spoken}
            </div>
            <div>
              <span className="font-medium">Written:</span> {point.register.written}
            </div>
          </div>
        )}

        {point.confusableWith.length > 0 && (
          <div className="border-t pt-3 text-xs">
            <span className="text-muted-foreground">Not to be confused with: </span>
            {point.confusableWith.map((otherId, idx) => {
              const other = points[otherId]
              return (
                <span key={otherId}>
                  {idx > 0 && ', '}
                  {other ? (
                    <a href={`#${otherId}`} className="text-primary hover:underline">
                      {other.term}
                    </a>
                  ) : (
                    <a href={`#${otherId}`} className="text-primary hover:underline">
                      {otherId}
                    </a>
                  )}
                </span>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
