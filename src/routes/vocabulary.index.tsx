// The vocabulary browser: filter/sort ~2,646 lexemes by lesson, theme, part of
// speech and gender, all reflected in the URL so any view is bookmarkable.
// The list is virtualised by hand (fixed row height, scroll-driven windowing)
// since the corpus is too large to render unvirtualised.

import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { allLessons, getLesson, loadVocab } from '@/content/loader'
import { GENDERS, POS, THEMES, type Gender, type LessonId, type Pos, type Theme, type VocabEntry } from '@/content/types'
import { foldForSearch } from '@/lib/normalise'
import { cn } from '@/lib/utils'
import { ChipRow, type ChipOption } from '@/components/filter-chips'
import { SpeakButton } from '@/components/speak-button'

const GENDER_COLOR: Record<string, string> = {
  m: 'text-blue-600 dark:text-blue-400',
  f: 'text-red-500 dark:text-red-400',
  n: 'text-green-600 dark:text-green-400',
}

const GENDER_ARTICLE: Record<Gender, string> = { m: 'der', f: 'die', n: 'das' }

const THEME_LABEL: Record<Theme, string> = {
  basics: 'Basics',
  greetings: 'Greetings',
  numbers: 'Numbers',
  time: 'Time',
  family: 'Family',
  'house-home': 'House & Home',
  'food-drink': 'Food & Drink',
  clothing: 'Clothing',
  'body-health': 'Body & Health',
  travel: 'Travel',
  transport: 'Transport',
  'city-places': 'City & Places',
  'nature-weather': 'Nature & Weather',
  'work-professions': 'Work & Professions',
  education: 'Education',
  school: 'School',
  technology: 'Technology',
  'media-culture': 'Media & Culture',
  'money-economy': 'Money & Economy',
  shopping: 'Shopping',
  'relations-feelings': 'Relations & Feelings',
  'daily-routine': 'Daily Routine',
  'leisure-hobbies': 'Leisure & Hobbies',
  abstract: 'Abstract',
  'word-formation': 'Word Formation',
  misc: 'Miscellaneous',
}

const POS_LABEL: Record<Pos, string> = {
  noun: 'Nouns',
  verb: 'Verbs',
  adjective: 'Adjectives',
  adverb: 'Adverbs',
  pronoun: 'Pronouns',
  preposition: 'Prepositions',
  conjunction: 'Conjunctions',
  particle: 'Particles',
  phrase: 'Phrases',
  interjection: 'Interjections',
  number: 'Numbers',
}

type SortMode = 'theme' | 'alpha'

type VocabSearch = {
  q?: string
  lesson?: LessonId
  theme?: Theme
  pos?: Pos
  gender?: Gender
  sort?: SortMode
}

function validateSearch(search: Record<string, unknown>): VocabSearch {
  const q = typeof search.q === 'string' && search.q ? search.q : undefined
  const lesson =
    typeof search.lesson === 'string' && allLessons.some((l) => l.id === search.lesson)
      ? (search.lesson as LessonId)
      : undefined
  const theme =
    typeof search.theme === 'string' && (THEMES as readonly string[]).includes(search.theme)
      ? (search.theme as Theme)
      : undefined
  const pos =
    typeof search.pos === 'string' && (POS as readonly string[]).includes(search.pos) ? (search.pos as Pos) : undefined
  const gender =
    typeof search.gender === 'string' && (GENDERS as readonly string[]).includes(search.gender)
      ? (search.gender as Gender)
      : undefined
  const sort = search.sort === 'alpha' ? 'alpha' : search.sort === 'theme' ? 'theme' : undefined
  return { q, lesson, theme, pos, gender, sort }
}

export const Route = createFileRoute('/vocabulary/')({
  validateSearch,
  component: VocabularyPage,
})

function stripArticle(headword: string): string {
  return headword.replace(/^(der|die|das)\s+/, '')
}

type Row = { kind: 'header'; key: string; label: string; count: number } | { kind: 'entry'; key: string; entry: VocabEntry }

const ROW_HEIGHT = 44
const OVERSCAN = 8

function VocabularyPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [entries, setEntries] = useState<VocabEntry[] | null>(null)

  useEffect(() => {
    let alive = true
    loadVocab().then((b) => {
      if (alive) setEntries(b.entries)
    })
    return () => {
      alive = false
    }
  }, [])

  const sortMode: SortMode = search.sort ?? 'theme'

  const setParam = <K extends keyof VocabSearch>(key: K, value: VocabSearch[K]) => {
    navigate({ search: (prev) => ({ ...prev, [key]: value }) })
  }

  const posPresent = useMemo(() => {
    if (!entries) return new Set<Pos>()
    return new Set(entries.map((e) => e.pos).filter((p): p is Pos => p !== null))
  }, [entries])

  const filtered = useMemo(() => {
    if (!entries) return []
    const needle = search.q ? foldForSearch(search.q) : ''
    const lessonNumber = search.lesson ? getLesson(search.lesson)?.number : undefined
    return entries.filter((e) => {
      if (needle) {
        const hay = foldForSearch([e.headword, e.lemma, e.glosses.join(' ')].join(' '))
        if (!hay.includes(needle)) return false
      }
      if (lessonNumber !== undefined && !e.occurrences.some((o) => o.lessonNumber === lessonNumber)) return false
      if (search.theme && !e.themes.includes(search.theme)) return false
      if (search.pos && e.pos !== search.pos) return false
      if (search.gender && e.gender !== search.gender) return false
      return true
    })
  }, [entries, search.q, search.lesson, search.theme, search.pos, search.gender])

  const rows = useMemo<Row[]>(() => {
    if (sortMode === 'alpha') {
      const sorted = [...filtered].sort((a, b) => stripArticle(a.headword).localeCompare(stripArticle(b.headword), 'de'))
      return sorted.map((e) => ({ kind: 'entry', key: e.id, entry: e }))
    }
    const groups = new Map<Theme, VocabEntry[]>()
    for (const e of filtered) {
      const theme = e.themes[0] ?? 'misc'
      const list = groups.get(theme) ?? []
      list.push(e)
      groups.set(theme, list)
    }
    const out: Row[] = []
    for (const theme of THEMES) {
      const list = groups.get(theme)
      if (!list || list.length === 0) continue
      list.sort((a, b) => stripArticle(a.headword).localeCompare(stripArticle(b.headword), 'de'))
      out.push({ kind: 'header', key: `h-${theme}`, label: THEME_LABEL[theme], count: list.length })
      for (const e of list) out.push({ kind: 'entry', key: e.id, entry: e })
    }
    return out
  }, [filtered, sortMode])

  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(560)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setViewportH(containerRef.current.clientHeight)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const totalRows = rows.length
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const visibleCount = Math.ceil(viewportH / ROW_HEIGHT) + OVERSCAN * 2
  const endIndex = Math.min(totalRows, startIndex + visibleCount)
  const visibleRows = rows.slice(startIndex, endIndex)
  const offsetY = startIndex * ROW_HEIGHT

  const lessonOptions: ChipOption[] = [
    { value: undefined, label: 'All' },
    ...[...allLessons].sort((a, b) => a.number - b.number).map((l) => ({ value: l.id, label: String(l.number) })),
  ]

  const themeOptions: ChipOption[] = [
    { value: undefined, label: 'All' },
    ...THEMES.map((t) => ({ value: t, label: THEME_LABEL[t] })),
  ]

  const posOptions: ChipOption[] = [
    { value: undefined, label: 'All' },
    ...POS.filter((p) => posPresent.has(p)).map((p) => ({ value: p, label: POS_LABEL[p] })),
  ]

  const genderOptions: ChipOption[] = [
    { value: undefined, label: 'All' },
    ...GENDERS.map((g) => ({ value: g, label: GENDER_ARTICLE[g] })),
  ]

  const summary: string[] = []
  if (search.lesson) {
    const l = getLesson(search.lesson)
    if (l) summary.push(`Lesson ${l.number}`)
  }
  if (search.theme) summary.push(THEME_LABEL[search.theme])
  if (search.pos) summary.push(POS_LABEL[search.pos])
  if (search.gender) summary.push(GENDER_ARTICLE[search.gender])
  if (search.q) summary.push(`"${search.q}"`)

  const practiceSearch = {
    ...(search.lesson ? { lesson: search.lesson } : {}),
    ...(search.theme ? { theme: search.theme } : {}),
    ...(search.pos ? { pos: search.pos } : {}),
    ...(search.gender ? { gender: search.gender } : {}),
    ...(search.q ? { q: search.q } : {}),
  }

  if (!entries) {
    return <div className="text-muted-foreground mx-auto max-w-6xl px-4 py-8 text-sm">Loading vocabulary…</div>
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Vocabulary</h1>

      <input
        type="text"
        value={search.q ?? ''}
        onChange={(e) => setParam('q', e.target.value || undefined)}
        placeholder="Filter words…"
        className="border-border bg-background mt-4 w-full max-w-sm rounded-md border px-3 py-1.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />

      <div className="mt-4 flex flex-col gap-2">
        <ChipRow label="Lesson" options={lessonOptions} selected={search.lesson} onSelect={(v) => setParam('lesson', v as LessonId | undefined)} />
        <ChipRow label="Theme" options={themeOptions} selected={search.theme} onSelect={(v) => setParam('theme', v as Theme | undefined)} />
        <ChipRow label="Part" options={posOptions} selected={search.pos} onSelect={(v) => setParam('pos', v as Pos | undefined)} />
        <ChipRow
          label="Gender"
          options={genderOptions.map((o) => ({
            ...o,
            label: o.value ? <span className={GENDER_COLOR[o.value]}>{o.label}</span> : o.label,
          })) as unknown as ChipOption[]}
          selected={search.gender}
          onSelect={(v) => setParam('gender', v as Gender | undefined)}
        />
      </div>

      <div className="mt-4 flex items-center gap-3 border-t pt-3">
        <span className="text-muted-foreground w-14 shrink-0 text-xs">Sort</span>
        <ChipRow
          label=""
          options={[
            { value: 'theme', label: 'Theme' },
            { value: 'alpha', label: 'A–Z' },
          ]}
          selected={sortMode}
          onSelect={(v) => setParam('sort', v as SortMode)}
        />
      </div>

      <div className="text-muted-foreground mt-4 text-sm">
        {filtered.length} words{summary.length > 0 ? ` · ${summary.join(' · ')}` : ''}
      </div>

      <div ref={containerRef} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} className="mt-3 max-h-[70vh] overflow-y-auto rounded-lg border">
        <div style={{ height: totalRows * ROW_HEIGHT, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
            {visibleRows.map((row) =>
              row.kind === 'header' ? (
                <div key={row.key} className="bg-muted/50 flex items-center border-b px-3 text-xs font-semibold" style={{ height: ROW_HEIGHT }}>
                  {row.label} <span className="text-muted-foreground ml-2 font-normal">· {row.count}</span>
                </div>
              ) : (
                <EntryRow key={row.key} entry={row.entry} />
              ),
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-right">
        <Link to="/practice" search={{ ...practiceSearch, size: 20 } as never} className="text-primary text-sm hover:underline">
          Practice these {filtered.length} words →
        </Link>
      </div>
    </div>
  )
}

function EntryRow({ entry }: { entry: VocabEntry }) {
  return (
    <div
      className="border-border/60 grid items-center gap-2 border-b px-3 text-sm last:border-b-0"
      style={{ height: ROW_HEIGHT, gridTemplateColumns: '3rem 5rem 1fr 1.5fr 2.5rem' }}
    >
      <span className={cn('font-semibold', entry.gender && GENDER_COLOR[entry.gender])}>{entry.gender ? GENDER_ARTICLE[entry.gender] : ''}</span>
      <span>
        {entry.plural.form ? (
          entry.plural.form
        ) : entry.plural.kind === 'none' ? (
          <span className="text-muted-foreground/70" title="This noun has no plural">
            —
          </span>
        ) : (
          <span className="text-muted-foreground/70" title="plural not given in the source">
            —
          </span>
        )}
      </span>
      <Link to="/vocabulary/$wordSlug" params={{ wordSlug: entry.id }} className="truncate font-medium hover:underline">
        {entry.headword}
      </Link>
      <span className="text-muted-foreground truncate">{entry.glosses[0]}</span>
      <SpeakButton text={entry.headword} size="icon-xs" />
    </div>
  )
}
