import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadDrills, loadParadigms, loadSentences, loadVocab } from '@/content/loader'
import { buildDeck, type Bundles } from '@/lib/exercises/assemble'
import { validateDeckSearch, type DeckFilters, type ExerciseItem } from '@/lib/exercises/types'
import { bucketOf, type Graded } from '@/components/exercise/shape'
import { RevealShape } from '@/components/exercise/reveal'
import { ChoiceShape } from '@/components/exercise/choice'
import { TypedShape } from '@/components/exercise/typed'
import { SlotsShape } from '@/components/exercise/slots'
import { OrderShape } from '@/components/exercise/order'
import { PairShape } from '@/components/exercise/pair'
import { Provenance, Rubric } from '@/components/exercise/provenance'
import { answerTextOf, promptTextOf } from '@/components/exercise/payload'
import { getRate, initVoices, speak, stepRate, stopSpeaking } from '@/lib/tts'
import { SpeakButton } from '@/components/speak-button'

export const Route = createFileRoute('/practice/session')({
  validateSearch: (s: Record<string, unknown>) => validateDeckSearch(s),
  component: SessionPage,
})

type Record_ = { item: ExerciseItem; graded: Graded }

function SessionPage() {
  const search = Route.useSearch() as DeckFilters
  const navigate = useNavigate()
  const [bundles, setBundles] = useState<Bundles | null>(null)
  const [queue, setQueue] = useState<ExerciseItem[]>([])
  const [pos, setPos] = useState(0)
  const [graded, setGraded] = useState<Graded | null>(null)
  const [history, setHistory] = useState<Record_[]>([])
  const [rate, setRateState] = useState<number>(() => getRate())
  const [showKeys, setShowKeys] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([loadVocab(), loadSentences(), loadDrills(), loadParadigms()]).then(([vocab, sentences, drills, paradigms]) => {
      if (!alive) return
      const b = { vocab, sentences, drills, paradigms }
      setBundles(b)
      try {
        const deck = buildDeck(search, b)
        setQueue(deck.items)
      } catch {
        setQueue([])
      }
      setPos(0)
      setGraded(null)
      setHistory([])
      setDone(false)
    })
    initVoices()
    return () => {
      alive = false
      stopSpeaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(search)])

  const item = queue[pos]
  const total = queue.length

  const advance = useCallback(() => {
    if (!item) return
    if (!graded) return
    const g: Graded = graded
    setHistory((h) => [...h, { item, graded: g }])
    stopSpeaking()
    if (pos + 1 >= total) {
      setDone(true)
    } else {
      setPos((p) => p + 1)
      setGraded(null)
    }
  }, [graded, item, pos, total])

  const againLater = useCallback(() => {
    if (!item) return
    // The current card is spliced out and reinserted 3 later; the next card
    // slides into `pos`, so position stays — incrementing would skip a card,
    // and ending here would drop the deferred one.
    if (queue.length <= 1) {
      if (graded) {
        const g: Graded = graded
        setHistory((h) => [...h, { item, graded: g }])
        setDone(true)
      }
      return
    }
    setQueue((q) => {
      if (q.length <= 1) return q
      const next = [...q]
      const [cur] = next.splice(pos, 1)
      if (cur) {
        const at = Math.min(next.length, pos + 3)
        next.splice(at, 0, cur)
      }
      return next
    })
    if (graded) {
      const g: Graded = graded
      setHistory((h) => [...h, { item, graded: g }])
      setGraded(null)
    }
  }, [graded, item, pos, queue.length])

  const reviewOnly = useCallback(() => {
    const misses = history.filter((h) => bucketOf(h.graded.outcome) === 'review').map((h) => h.item)
    if (misses.length === 0) return
    setQueue(misses)
    setHistory([])
    setPos(0)
    setGraded(null)
    setDone(false)
  }, [history])

  // Global session keys. Shape components own their keys in capture phase and
  // stop propagation, so S is *das* on a gender card and "speak" elsewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (done) {
        if (e.key === 'r' || e.key === 'R') reviewOnly()
        return
      }
      if (e.key === 'Escape') {
        navigate({ to: '/practice', search: { ...search } as never })
        return
      }
      if (e.key === '?') {
        setShowKeys((v) => !v)
        return
      }
      if (e.key === '[' || e.key === ']') {
        setRateState(stepRate(e.key === ']' ? 1 : -1))
        return
      }
      if (!item) return
      const lower = e.key.toLowerCase()
      if (lower === 'a' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        againLater()
        return
      }
      if (lower === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        speak(e.shiftKey ? answerTextOf(item) : promptTextOf(item))
        return
      }
      if (lower === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const href = item.sourceHref
        if (href) {
          const m = /^\/lessons\/([^/]+)\/([^/]+)$/.exec(href)
          if (m) navigate({ to: '/lessons/$lessonSlug/$topicSlug', params: { lessonSlug: m[1]!, topicSlug: m[2]! } })
        }
        return
      }
      if ((e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') && graded) {
        // Reveal shapes consume these pre-grade; post-grade they advance.
        e.preventDefault()
        advance()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance, againLater, done, graded, item, reviewOnly, search])

  const counts = useMemo(() => {
    let exact = 0
    let almost = 0
    let review = 0
    for (const h of history) {
      const b = bucketOf(h.graded.outcome)
      if (b === 'exact') exact++
      else if (b === 'almost') almost++
      else review++
    }
    if (graded && item) {
      const b = bucketOf(graded.outcome)
      if (b === 'exact') exact++
      else if (b === 'almost') almost++
      else review++
    }
    return { exact, almost, review }
  }, [history, graded, item])

  const practiceAgain = () => {
    if (!bundles) return
    const deck = buildDeck(search, bundles)
    setQueue(deck.items)
    setHistory([])
    setPos(0)
    setGraded(null)
    setDone(false)
  }

  if (!bundles) return <div className="text-muted-foreground mx-auto max-w-3xl px-4 py-8 text-sm">Building deck…</div>
  if (total === 0)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm">No items match these filters.</p>
        <Link to="/practice" search={{ ...search } as never} className="text-primary text-sm hover:underline">
          ← Change deck
        </Link>
      </div>
    )

  if (done) {
    const all = history
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Session complete</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {total} items · {counts.exact} exact · {counts.almost} almost · {counts.review} to review
        </p>
        {counts.review > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold tracking-wide uppercase">To review</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {all
                .filter((h) => bucketOf(h.graded.outcome) === 'review')
                .map(({ item: it, graded: g }) => (
                  <li key={it.id} className="border-border flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                    <span className="truncate">{promptTextOf(it)}</span>
                    <span className="text-muted-foreground flex items-center gap-1 truncate">
                      → {g.verdicts[0]?.expected ?? answerTextOf(it)}
                      <SpeakButton text={answerTextOf(it)} size="icon-xs" />
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}
        <section className="mt-6">
          <h2 className="text-xs font-semibold tracking-wide uppercase">Everything in this deck</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {all.map(({ item: it }) => (
              <li key={it.id} className="text-muted-foreground flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{promptTextOf(it)}</span>
                <SpeakButton text={answerTextOf(it)} size="icon-xs" />
              </li>
            ))}
          </ul>
        </section>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={practiceAgain} className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
            Practice again
          </button>
          <Link to="/practice" search={{ ...search } as never} className="rounded-md border px-4 py-2 text-sm">
            Change deck
          </Link>
          {counts.review > 0 && (
            <button type="button" onClick={reviewOnly} className="rounded-md border px-4 py-2 text-sm">
              Review only (R)
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col px-4 py-6">
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <Link to="/practice" search={{ ...search } as never} className="hover:underline">
          ← Exit
        </Link>
        <span>
          ♪ {rate} · {pos + 1} / {total}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center py-8">
        {item.rubric && <Rubric text={item.rubric} />}
        <div className="mt-4 w-full">
          {item.shape === 'reveal' ? (
            <RevealShape item={item} graded={graded} onGrade={setGraded} onAdvance={advance} />
          ) : item.shape === 'choice' ? (
            <ChoiceShape item={item} graded={graded} onGrade={setGraded} onAdvance={advance} />
          ) : item.shape === 'typed' ? (
            <TypedShape item={item} graded={graded} onGrade={setGraded} onAdvance={advance} />
          ) : item.shape === 'slots' ? (
            <SlotsShape item={item} graded={graded} onGrade={setGraded} onAdvance={advance} />
          ) : item.shape === 'order' ? (
            <OrderShape item={item} graded={graded} onGrade={setGraded} onAdvance={advance} />
          ) : (
            <PairShape item={item} graded={graded} onGrade={setGraded} onAdvance={advance} />
          )}
        </div>
        <Provenance item={item} className="mt-6" />
      </div>
      <div className="flex items-center justify-center gap-3 border-t pt-4">
        <button type="button" onClick={againLater} className="rounded-md border px-4 py-2 text-sm">
          Again later (A)
        </button>
        <button type="button" onClick={advance} disabled={!graded} className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
          Next (Enter)
        </button>
      </div>
      <p className="text-muted-foreground mt-3 text-center text-[11px]">
        Space/Enter advance · A again later · S speak · G source · [ ] rate · ? keys · Esc exit
      </p>
      {showKeys && (
        <div className="border-border mx-auto mt-2 max-w-xl rounded-lg border p-3 text-xs">
          Choice: 1–4, Y/N judgement, D/F/S gender · Typed: Enter check, Alt+a/o/u/s umlauts · Slots: Tab between blanks ·
          Order: 1–9 place, Backspace undo · Pair: 1–6 + a–f.
        </div>
      )}
    </div>
  )
}
