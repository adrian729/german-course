import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getLesson, loadSentences, loadVocab } from '@/content/loader'
import type { Sentence, VocabEntry } from '@/content/types'
import { CefrBadge } from '@/components/sidebar-nav'
import { VerifiedBadge } from '@/components/verified-badge'
import { SpeakButton } from '@/components/speak-button'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/vocabulary/$wordSlug')({
  component: WordPage,
})

function WordPage() {
  const { wordSlug } = Route.useParams()
  const [entry, setEntry] = useState<VocabEntry | null | undefined>(undefined)
  const [examples, setExamples] = useState<Sentence[]>([])

  useEffect(() => {
    let alive = true
    Promise.all([loadVocab(), loadSentences()]).then(([v, s]) => {
      if (!alive) return
      const found = v.entries.find((e) => e.id === wordSlug) ?? null
      setEntry(found)
      if (found) {
        const byId = new Map(s.sentences.map((x) => [x.id, x]))
        setExamples(found.exampleIds.map((id) => byId.get(id)).filter((x): x is Sentence => Boolean(x)).slice(0, 8))
      }
    })
    return () => {
      alive = false
    }
  }, [wordSlug])

  if (entry === undefined) return <div className="text-muted-foreground mx-auto max-w-3xl px-4 py-8 text-sm">Loading…</div>
  if (entry === null) throw notFound()

  const firstOcc = entry.occurrences[0]
  const firstLesson = firstOcc ? getLesson(firstOcc.topicId.split('/')[0]!) : undefined
  const alsoLessons = [...new Set(entry.occurrences.slice(1).map((o) => o.topicId.split('/')[0]))].slice(0, 6)
  const related = entry.relations.slice(0, 8)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
        <Link to="/vocabulary" className="hover:text-foreground">
          Vocabulary
        </Link>
        <span>›</span>
        <span>{entry.headword}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{entry.headword}</h1>
        <SpeakButton text={entry.headword} size="icon" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <CefrBadge level={entry.level} />
        <VerifiedBadge status={entry.verification} />
        {entry.pos && <Badge variant="outline">{entry.pos}</Badge>}
        {entry.gender && <Badge variant="outline">{entry.gender === 'm' ? 'der' : entry.gender === 'f' ? 'die' : 'das'}</Badge>}
        {entry.register !== 'neutral' && <Badge variant="outline">{entry.register}</Badge>}
      </div>
      <p className="mt-3 text-lg">{entry.glosses.join(' · ')}</p>
      {entry.literal && <p className="text-muted-foreground mt-1 text-sm italic">literally: {entry.literal}</p>}

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {entry.pos === 'noun' && (
          <>
            <dt className="text-muted-foreground">Plural</dt>
            <dd>
              {entry.plural.form ?? '—'}
              {entry.plural.kind === 'unknown' && (
                <span className="text-muted-foreground/70 ml-2 text-xs" title="plural not given in the source">
                  (not given in the source)
                </span>
              )}
              {entry.plural.kind === 'none' && <span className="text-muted-foreground/70 ml-2 text-xs">(no plural)</span>}
            </dd>
          </>
        )}
        {entry.verb && (
          <>
            {entry.verb.present3sg && (
              <>
                <dt className="text-muted-foreground">3sg present</dt>
                <dd>
                  {entry.verb.present3sg} <SpeakButton text={entry.verb.present3sg} size="icon-xs" />
                </dd>
              </>
            )}
            {entry.verb.partizip2 && (
              <>
                <dt className="text-muted-foreground">Partizip II</dt>
                <dd>
                  {entry.verb.partizip2} ({entry.verb.auxiliary ?? 'haben'})
                </dd>
              </>
            )}
            {entry.verb.reflexive && (
              <>
                <dt className="text-muted-foreground">Reflexive</dt>
                <dd>+{entry.verb.reflexive}</dd>
              </>
            )}
          </>
        )}
        {entry.falseFriend && (
          <>
            <dt className="text-muted-foreground">False friend</dt>
            <dd>
              looks like <em>{entry.falseFriend.looksLike}</em>, means <em>{entry.falseFriend.actuallyMeans}</em>
            </dd>
          </>
        )}
      </dl>

      {examples.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Examples</h2>
          <ul className="flex flex-col gap-2">
            {examples.map((s) => (
              <li key={s.id} className="border-border flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
                <span>{s.text}</span>
                <SpeakButton text={s.speakable} size="icon-xs" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-muted-foreground mt-6 text-xs">
        Introduced in {firstLesson ? `Lesson ${firstLesson.number} · ${firstLesson.shortTitle}` : firstOcc?.topicId}
        {alsoLessons.length > 0 && ` · also in ${alsoLessons.join(', ')}`}
      </p>
      {related.length > 0 && (
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">See also </span>
          {related.map((r, i) => (
            <span key={`${r.kind}:${r.lexemeId}`}>
              {i > 0 && ', '}
              <Link to="/vocabulary/$wordSlug" params={{ wordSlug: r.lexemeId }} className="text-primary hover:underline">
                {r.lexemeId}
              </Link>
            </span>
          ))}
        </p>
      )}

      <div className="mt-8 border-t pt-4">
        <Link to="/practice" search={{ lexeme: entry.id, mode: 'mixed' }} className="text-primary text-sm hover:underline">
          Practice this word →
        </Link>
      </div>
    </div>
  )
}
