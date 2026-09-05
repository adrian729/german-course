// The data-driven vocabulary topic renderer. Entries are grouped by the
// corpus's own thematic H3 sections, with a per-group "practise these N words"
// link.

import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { loadSentences, loadVocab } from '@/content/loader'
import type { Sentence, Topic, VocabEntry } from '@/content/types'
import { SpeakButton } from '@/components/speak-button'
import { cn } from '@/lib/utils'

const GENDER_COLOR: Record<string, string> = {
  m: 'text-blue-600 dark:text-blue-400',
  f: 'text-red-500 dark:text-red-400',
  n: 'text-green-600 dark:text-green-400',
}

export function VocabTable({ topic }: { topic: Topic }) {
  const [entries, setEntries] = useState<VocabEntry[] | null>(null)
  const [sentences, setSentences] = useState<Map<string, Sentence>>(new Map())

  useEffect(() => {
    let alive = true
    Promise.all([loadVocab(), loadSentences()]).then(([v, s]) => {
      if (!alive) return
      setEntries(v.entries.filter((e) => e.occurrences.some((o) => o.topicId === topic.id)))
      setSentences(new Map(s.sentences.map((x) => [x.id, x])))
    })
    return () => {
      alive = false
    }
  }, [topic.id])

  const grouped = useMemo(() => {
    if (!entries) return []
    const groups = new Map<string, VocabEntry[]>()
    for (const e of entries) {
      const section = e.occurrences.find((o) => o.topicId === topic.id)?.sourceSection ?? 'Vocabulary'
      const list = groups.get(section) ?? []
      list.push(e)
      groups.set(section, list)
    }
    return [...groups.entries()].map(([section, list]) => ({ section: section.replace(/^[\d.]+\.\s*/, ''), list }))
  }, [entries, topic.id])

  if (!entries) return <div className="text-muted-foreground my-8 text-sm">Loading vocabulary…</div>

  return (
    <div className="my-6 flex flex-col gap-8">
      {grouped.map((group) => (
        <section key={group.section}>
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <h3 className="font-semibold">{group.section}</h3>
            <Link
              to="/practice"
              search={{ topic: topic.id, size: 20 }}
              className="text-primary text-xs hover:underline"
            >
              Practise these {group.list.length} words →
            </Link>
          </div>
          <div className="border-border overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {group.list.map((e) => {
                  const example = e.exampleIds.map((id) => sentences.get(id)).find(Boolean)
                  return (
                    <tr key={e.id} className="border-border/60 border-b last:border-b-0">
                      <td className="px-3 py-2 align-top">
                        <Link
                          to="/vocabulary/$wordSlug"
                          params={{ wordSlug: e.id }}
                          className="font-medium hover:underline"
                        >
                          {e.headword}
                        </Link>
                        <SpeakButton text={e.headword} size="icon-xs" />
                      </td>
                      <td className="px-3 py-2 align-top">
                        {e.gender && <span className={cn('font-semibold', GENDER_COLOR[e.gender])}>{e.gender === 'm' ? 'der' : e.gender === 'f' ? 'die' : 'das'}</span>}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {e.plural.form ? (
                          <span>{e.plural.form}</span>
                        ) : e.plural.kind === 'unknown' ? (
                          <span className="text-muted-foreground/70" title="plural not given in the source">
                            —
                          </span>
                        ) : (
                          <span className="text-muted-foreground/70">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-muted-foreground">{e.glosses[0]}</td>
                      <td className="px-3 py-2 align-top">
                        {example && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-xs">{example.text}</span>
                            <SpeakButton text={example.text} size="icon-xs" />
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}