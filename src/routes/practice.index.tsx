import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { allLessons, loadDrills, loadParadigms, loadSentences, loadVocab } from '@/content/loader'
import { POS, THEMES, type Pos, type Theme } from '@/content/types'
import { buildDeck, type Bundles } from '@/lib/exercises/assemble'
import { validateDeckSearch, type DeckFilters, type DeckMode, type DeckSize } from '@/lib/exercises/types'

export const Route = createFileRoute('/practice/')({
  validateSearch: (s: Record<string, unknown>) => validateDeckSearch(s),
  component: PracticePage,
})

const MODES: Array<{ id: DeckMode; label: string }> = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'vocab', label: 'Vocab' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'production', label: 'Production' },
]
const SIZES: Array<{ id: DeckSize; label: string }> = [
  { id: 10, label: '10' },
  { id: 20, label: '20' },
  { id: 40, label: '40' },
  { id: 0, label: 'All' },
]

function PracticePage() {
  const search = Route.useSearch() as DeckFilters
  const [bundles, setBundles] = useState<Bundles | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([loadVocab(), loadSentences(), loadDrills(), loadParadigms()]).then(([vocab, sentences, drills, paradigms]) => {
      if (alive) setBundles({ vocab, sentences, drills, paradigms })
    })
    return () => {
      alive = false
    }
  }, [])

  const preview = useMemo(() => {
    if (!bundles) return null
    try {
       
      return buildDeck({ ...search, size: 20 }, bundles)
    } catch {
      return null
    }
  }, [bundles, search])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
      <p className="text-muted-foreground mt-2 text-sm">Every deck is a bookmarkable URL — share it, pin it, repeat it.</p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wide uppercase">Mode</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {MODES.map((m) => (
              <Link
                key={m.id}
                to="/practice"
                search={{ ...search, mode: m.id } as never}
                className={(search.mode ?? 'mixed') === m.id ? 'text-primary text-sm font-semibold' : 'text-muted-foreground text-sm hover:underline'}
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-wide uppercase">Size</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <Link
                key={s.id}
                to="/practice"
                search={{ ...search, size: s.id } as never}
                className={(search.size ?? 20) === s.id ? 'text-primary text-sm font-semibold' : 'text-muted-foreground text-sm hover:underline'}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-wide uppercase">Lesson</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link to="/practice" search={{ ...search, lesson: undefined } as never} className={!search.lesson ? 'text-primary text-sm font-semibold' : 'text-muted-foreground text-sm hover:underline'}>
              All
            </Link>
            {allLessons.map((l) => (
              <Link
                key={l.id}
                to="/practice"
                search={{ ...search, lesson: l.id } as never}
                className={search.lesson === l.id ? 'text-primary text-sm font-semibold' : 'text-muted-foreground text-sm hover:underline'}
              >
                {l.number}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-wide uppercase">Theme</div>
          <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            <Link to="/practice" search={{ ...search, theme: undefined } as never} className={!search.theme ? 'text-primary text-sm font-semibold' : 'text-muted-foreground text-sm hover:underline'}>
              All
            </Link>
            {(THEMES as readonly string[]).map((t) => (
              <Link
                key={t}
                to="/practice"
                search={{ ...search, theme: t as Theme } as never}
                className={search.theme === t ? 'text-primary text-sm font-semibold' : 'text-muted-foreground text-sm hover:underline'}
              >
                {t}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-wide uppercase">Part of speech</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link to="/practice" search={{ ...search, pos: undefined } as never} className={!search.pos ? 'text-primary text-sm font-semibold' : 'text-muted-foreground text-sm hover:underline'}>
              All
            </Link>
            {(POS as readonly string[]).map((p) => (
              <Link
                key={p}
                to="/practice"
                search={{ ...search, pos: p as Pos } as never}
                className={search.pos === p ? 'text-primary text-sm font-semibold' : 'text-muted-foreground text-sm hover:underline'}
              >
                {p}
              </Link>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Link to="/practice" search={{ ...search, unverified: !(search.unverified === true) } as never} className="hover:underline">
            <input type="checkbox" checked={search.unverified === true} readOnly className="accent-primary mr-2" />
            Include unverified lessons {search.unverified === true ? '(on)' : '(off)'}
          </Link>
        </label>

        <div className="border-t pt-4">
          <p className="text-muted-foreground text-sm">
            {!preview
              ? 'Loading preview…'
              : preview.meta.total > 0
                ? `${preview.meta.total} items ready`
                : 'No drillable material for these filters. Pick a vocabulary topic or a lesson with authored drills.'}
            {preview && preview.meta.total > 0 && Object.entries(preview.meta.byKind).filter(([, n]) => (n as number) > 0).length > 0 && (
              <span> · {Object.entries(preview.meta.byKind).filter(([, n]) => (n as number) > 0).map(([k, n]) => `${n} ${k}`).join(' · ')}</span>
            )}
          </p>
          <Link
            to="/practice/session"
            search={{ ...search } as never}
            aria-disabled={!preview || preview.meta.total === 0}
            className={`mt-3 inline-block rounded-md px-4 py-2 text-sm font-medium ${
              preview && preview.meta.total > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground pointer-events-none'
            }`}
          >
            Start session →
          </Link>
        </div>
      </div>
    </div>
  )
}
