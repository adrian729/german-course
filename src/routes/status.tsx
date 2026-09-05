import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { errata, getLesson, lessons, points, stats } from '@/content/loader'
import { loadParadigms, loadVocab } from '@/content/loader'
import type { VocabEntry, Erratum } from '@/content/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/status')({
  component: StatusPage,
})

function StatusPage() {
  const [paradigmCount, setParadigmCount] = useState<number | null>(null)
  const [vocab, setVocab] = useState<VocabEntry[] | null>(null)

  useEffect(() => {
    loadParadigms().then((b) => setParadigmCount(b.paradigms.length))
    loadVocab().then((b) => setVocab(b.entries))
  }, [])

  const errataList: Erratum[] = Object.values(errata)
  const grammarPointsCount = Object.keys(points).length

  const unknownPlurals = vocab ? vocab.filter((e) => e.pos === 'noun' && e.plural.kind === 'unknown') : []
  const unknownPos = vocab ? vocab.filter((e) => e.pos === null) : []
  const conflicts = vocab ? vocab.filter((e) => e.conflicts && e.conflicts.length > 0) : []

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
      <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">
        How to read this: hard invariants fail the build. The lists below are soft warnings — cases where the source did
        not state a value and the extractor kept <span className="font-mono text-xs">unknown</span> instead of guessing.
        A human must judge whether to author an override or leave it unknown.
      </p>

      {/* Big number cards */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Words" value={stats.lexemes} />
        <StatCard label="Sentences" value={stats.sentences} />
        <StatCard label="Drill items" value={stats.drillItems} />
        <StatCard label="Grammar points" value={grammarPointsCount} />
        <StatCard label="Paradigms" value={paradigmCount ?? '…'} />
      </div>

      {/* Verification breakdown */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Verification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-2">
            <Badge variant="outline">extracted</Badge> {stats.byVerification.extracted}
          </span>
          <span className="inline-flex items-center gap-2">
            <Badge variant="outline">reviewed</Badge> {stats.byVerification.reviewed}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="bg-green-100 text-green-700 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium dark:bg-green-900/40 dark:text-green-300">
              authored
            </span>
            {stats.byVerification.authored}
          </span>
        </CardContent>
      </Card>

      {/* Unknown plurals */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Unknown plurals — {stats.unknownPlural}</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Nouns where the source did not state a plural. Filtered live from vocabulary.
        </p>
        {vocab === null ? (
          <p className="text-muted-foreground mt-3 text-sm">Loading…</p>
        ) : unknownPlurals.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">No unknown plurals.</p>
        ) : (
          <GroupedVocabList entries={unknownPlurals} kind="plural" />
        )}
      </section>

      {/* Unknown POS */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Unknown part of speech — {stats.unknownPos}</h2>
        <p className="text-muted-foreground mt-1 text-xs">Entries where POS could not be determined.</p>
        {vocab === null ? (
          <p className="text-muted-foreground mt-3 text-sm">Loading…</p>
        ) : unknownPos.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">No unknown POS.</p>
        ) : (
          <GroupedVocabList entries={unknownPos} kind="pos" />
        )}
      </section>

      {/* Merge conflicts */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Merge conflicts — {stats.conflicts}</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Entries that appear in multiple topics with differing values. Showing the conflicting values.
        </p>
        {vocab === null ? (
          <p className="text-muted-foreground mt-3 text-sm">Loading…</p>
        ) : conflicts.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">No conflicts.</p>
        ) : (
          <GroupedVocabList entries={conflicts} kind="conflicts" />
        )}
      </section>

      {/* Errata */}
      <section className="mt-10">
        <h2 className="text-base font-semibold">Errata — {errataList.length}</h2>
        {errataList.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">No errata recorded.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-left">
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Severity</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Note</th>
                  <th className="px-3 py-2 font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {errataList.map((er) => (
                  <tr key={er.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{er.id}</td>
                    <td className="px-3 py-2">
                      <Badge variant={er.severity === 'error' ? 'destructive' : 'outline'}>{er.severity}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {er.source.file}:{er.source.line}
                    </td>
                    <td className="px-3 py-2 text-xs">{er.note}</td>
                    <td className="px-3 py-2 text-xs">
                      {er.target.kind} {er.target.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-muted-foreground text-xs">{label}</div>
      </CardContent>
    </Card>
  )
}

function GroupedVocabList({
  entries,
  kind,
}: {
  entries: VocabEntry[]
  kind: 'plural' | 'pos' | 'conflicts'
}) {
  const grouped = new Map<string, VocabEntry[]>()
  for (const e of entries) {
    const firstTopic = e.occurrences[0]?.topicId
    const lessonId = firstTopic ? firstTopic.split('/')[0] ?? 'unknown' : 'unknown'
    const list = grouped.get(lessonId) ?? []
    list.push(e)
    grouped.set(lessonId, list)
  }
  const sortedKeys = [...grouped.keys()].sort((a, b) => {
    const la = getLesson(a)
    const lb = getLesson(b)
    if (la && lb) return la.number - lb.number
    return a.localeCompare(b)
  })

  return (
    <div className="mt-3 flex flex-col gap-4">
      {sortedKeys.map((lessonId) => {
        const lesson = getLesson(lessonId)
        const list = grouped.get(lessonId) ?? []
        const title = lesson ? `${lesson.number}. ${lesson.title}` : lessonId
        return (
          <div key={lessonId}>
            <div className="mb-1 flex items-center gap-2">
              {lesson ? (
                <Link
                  to="/lessons/$lessonSlug"
                  params={{ lessonSlug: lesson.id }}
                  className="text-primary text-xs font-medium hover:underline"
                >
                  {title}
                </Link>
              ) : (
                <span className="text-xs font-medium">{title}</span>
              )}
              <span className="text-muted-foreground text-xs">· {list.length}</span>
            </div>
            <ul className="border-border divide-y rounded-lg border text-sm">
              {list.slice(0, 80).map((e) => (
                <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/vocabulary/$wordSlug"
                      params={{ wordSlug: e.id }}
                      className="font-medium hover:underline"
                    >
                      {e.headword}
                    </Link>
                    <span className="text-muted-foreground text-xs">{e.glosses[0]}</span>
                  </div>
                  <div className="text-muted-foreground max-w-[60%] text-right text-xs">
                    {kind === 'conflicts' && e.conflicts
                      ? e.conflicts.map((c) => (
                          <div key={c.field}>
                            <span className="font-medium">{c.field}:</span> {c.values.join(' / ')}{' '}
                            <span className="opacity-60">({c.from.join(', ')})</span>
                          </div>
                        ))
                      : kind === 'plural'
                        ? 'plural unknown'
                        : 'POS unknown'}
                    {kind !== 'conflicts' && (
                      <span className="ml-2">
                        <Link
                          to="/vocabulary/$wordSlug"
                          params={{ wordSlug: e.id }}
                          className="text-primary hover:underline"
                        >
                          view
                        </Link>
                      </span>
                    )}
                  </div>
                </li>
              ))}
              {list.length > 80 && (
                <li className="text-muted-foreground px-3 py-2 text-xs">…and {list.length - 80} more</li>
              )}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

// Ensure lessons import is used (grouping uses getLesson) — keep for noUnusedLocals
void lessons.length
