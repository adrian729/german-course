import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loadParadigms, lessons } from '@/content/loader'
import type { LessonId, Paradigm, ParadigmKind } from '@/content/types'
import { SpeakButton } from '@/components/speak-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/reference')({
  component: ReferencePage,
})

type Group = {
  kind: ParadigmKind
  label: string
  paradigms: Paradigm[]
}

const KIND_LABEL: Record<ParadigmKind, string> = {
  verb: 'Verbs',
  article: 'Articles & declension',
  pronoun: 'Pronouns',
  'adjective-ending': 'Adjective endings',
}

const KIND_ORDER: ParadigmKind[] = ['verb', 'article', 'pronoun', 'adjective-ending']

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

 
 
function lessonNumberFromId(id: string): number | null {
  const m = id.match(/^(\d+)/)
  if (!m || !m[1]) return null
  return Number.parseInt(m[1], 10)
}

function isRowDimmed(
  row: string,
  rowIntroducedIn: Record<string, LessonId> | undefined,
  asOf: LessonId | undefined,
): boolean {
  if (!asOf || !rowIntroducedIn) return false
  const introduced = rowIntroducedIn[row]
  if (!introduced) return false
  const asOfNum = lessonNumberFromId(asOf)
  const introducedNum = lessonNumberFromId(introduced)
  if (asOfNum === null || introducedNum === null) {
     
    return introduced > asOf
  }
  return introducedNum > asOfNum
}

function ParadigmTable({
  paradigm,
  asOf,
}: {
  paradigm: Paradigm
  asOf?: LessonId
}) {
  const [expanded, setExpanded] = useState(false)
   
  const shouldCollapse = paradigm.rows.length > 10
  const visibleCells = shouldCollapse && !expanded ? paradigm.cells.slice(0, 10) : paradigm.cells

  return (
    <Card id={kebab(paradigm.id)} className="scroll-mt-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{paradigm.title}</CardTitle>
        <div className="text-muted-foreground text-xs">
          <Link
            to="/practice"
            search={{ point: kebab(paradigm.id), mode: 'grammar', size: 20 } as never}
            className="text-primary hover:underline"
          >
            [ Drill this table → ]
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                {paradigm.cols.map((c) => (
                  <th key={c} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleCells.map((row, idx) => {
                const rowLabel = paradigm.rows[idx] ?? row[0] ?? ''
                const dimmed = isRowDimmed(rowLabel, paradigm.rowIntroducedIn, asOf)
                 
                 
                 
                return (
                  <tr
                    key={`${paradigm.id}-${idx}`}
                    className={dimmed ? 'opacity-40' : undefined}
                  >
                    {row.map((cell, colIdx) => {
                      const isFirstCol = colIdx === 0
                      return (
                        <td
                          key={`${paradigm.id}-${idx}-${colIdx}`}
                          className={
                            isFirstCol
                              ? 'bg-muted/20 px-3 py-2 font-medium whitespace-nowrap'
                              : 'px-3 py-2 whitespace-nowrap'
                          }
                        >
                          <span className="inline-flex items-center gap-1">
                            <span>{cell}</span>
                            {paradigm.kind === 'verb' && !isFirstCol && cell && cell !== '—' && (
                              <SpeakButton text={cell} size="icon-xs" />
                            )}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {paradigm.notes && Object.keys(paradigm.notes).length > 0 && (
          <div className="text-muted-foreground mt-3 text-xs">
            {Object.entries(paradigm.notes).map(([k, v]) => (
              <div key={k}>
                <span className="font-medium">{k}:</span> {v}
              </div>
            ))}
          </div>
        )}
        {shouldCollapse && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-primary mt-3 text-xs hover:underline"
          >
            {expanded ? 'Show less' : `Show all ${paradigm.rows.length} rows`}
          </button>
        )}
      </CardContent>
    </Card>
  )
}

function ReferencePage() {
  const [paradigms, setParadigms] = useState<Paradigm[] | null>(null)

  useEffect(() => {
    loadParadigms().then((b) => setParadigms(b.paradigms))
  }, [])

  if (!paradigms) {
    return <div className="text-muted-foreground mx-auto max-w-5xl px-4 py-8 text-sm">Loading reference…</div>
  }

  const groups: Group[] = KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    paradigms: paradigms.filter((p) => p.kind === kind),
  })).filter((g) => g.paradigms.length > 0 || kindHasPlaceholder(g.kind))

  function kindHasPlaceholder(_k: ParadigmKind): boolean {
    return false
  }

   
   
  const sections = groups

   
  const railTables = paradigms.map((p) => ({ id: kebab(p.id), title: p.title }))

   
  const _lessonCount = lessons.length
  void _lessonCount

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Reference</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Every declension and conjugation in one place. Use your browser find (⌘F) to jump to any form.
        </p>
      </div>

      <div className="flex gap-8">
        <div className="min-w-0 flex-1">
          {sections.map((section) => (
            <section key={section.kind} id={kebab(section.label)} className="scroll-mt-20">
              <h2 className="mt-10 mb-4 text-lg font-semibold tracking-tight first:mt-0">{section.label}</h2>
              <div className="flex flex-col gap-6">
                {section.paradigms.map((p) => (
                  <ParadigmTable key={p.id} paradigm={p} />
                ))}
              </div>
            </section>
          ))}
          {paradigms.length === 0 && (
            <p className="text-muted-foreground text-sm">No paradigms available.</p>
          )}
        </div>

        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20">
            <div className="text-xs font-semibold tracking-wide uppercase">On this page</div>
            <nav className="mt-3 flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto">
              {railTables.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="text-muted-foreground hover:text-foreground truncate text-sm hover:underline"
                  title={t.title}
                >
                  {t.title}
                </a>
              ))}
              <div className="border-border mt-3 border-t pt-3">
                <div className="text-muted-foreground text-xs">Tables: {paradigms.length}</div>
              </div>
            </nav>
          </div>
        </aside>
      </div>
    </div>
  )
}
