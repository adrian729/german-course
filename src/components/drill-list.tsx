// Practice topic renderer: the answer-key is folded into DrillItem.expected,
// so answers are revealed per item — never dumped all at once.

import { useEffect, useState } from 'react'
import { loadDrills } from '@/content/loader'
import type { Drill, Topic } from '@/content/types'
import { SpeakButton } from '@/components/speak-button'
import { cn } from '@/lib/utils'

export function DrillList({ topic }: { topic: Topic }) {
  const [drills, setDrills] = useState<Drill[] | null>(null)

  useEffect(() => {
    let alive = true
    loadDrills().then((b) => {
      if (alive) setDrills(b.drills.filter((d) => d.topicId === topic.id))
    })
    return () => {
      alive = false
    }
  }, [topic.id])

  if (!drills) return <div className="text-muted-foreground my-8 text-sm">Loading drills…</div>

  return (
    <div className="my-6 flex flex-col gap-10">
      {drills.map((drill) => (
        <section key={drill.id}>
          <h3 className="mb-1 font-semibold">{drill.title}</h3>
          {(() => {
            const rubrics = [...new Set(drill.items.map((i) => i.rubric).filter(Boolean))] as string[]
            return rubrics.length > 0 ? (
              <div className="text-muted-foreground mb-3 space-y-1 text-xs italic">
                {rubrics.map((r) => (
                  <p key={r}>{r}</p>
                ))}
              </div>
            ) : null
          })()}
          <ol className="flex flex-col gap-3">
            {drill.items.map((item) => (
              <DrillItemRow key={item.id} item={item} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

function DrillItemRow({ item }: { item: Drill['items'][number] }) {
  const [revealed, setRevealed] = useState(false)
  const prompt = item.prompt

  return (
    <li className="border-border rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <span className="text-muted-foreground mr-2 tabular-nums">{item.n}.</span>
          <span className="font-medium">{prompt}</span>
          {!item.expected.length && (
            <span className="bg-peach-500/70 text-muted-foreground ml-2 rounded px-1.5 py-0.5 text-[10px]">no key</span>
          )}
        </div>
        <SpeakButton text={prompt.replace(/___/g, '…')} size="icon-xs" />
      </div>
      {item.rubric && (
        <p className="text-muted-foreground mt-1 pl-6 text-xs italic">{item.rubric}</p>
      )}
      {item.english && (
        <p className="text-muted-foreground mt-1 pl-6 text-xs italic">“{item.english}”</p>
      )}
      {item.chunks && (
        <p className="text-muted-foreground mt-1 pl-6 font-mono text-xs">
          {item.chunks.map((c, i) => (
            <span key={i}>
              <span className="border-border rounded border px-1">{c}</span>{' '}
            </span>
          ))}
        </p>
      )}
      {revealed ? (
        <div className="mt-2 pl-6">
          {item.expected.map((ans, i) => (
            <span key={i} className="text-primary inline-flex items-center gap-1 font-medium">
              {ans}
              <SpeakButton text={ans} size="icon-xs" />
            </span>
          ))}
          {item.rationale && <span className="text-muted-foreground ml-2 text-xs italic">— {item.rationale}</span>}
        </div>
      ) : (
        item.expected.length > 0 && (
          <button
            onClick={() => setRevealed(true)}
            className="text-primary mt-2 ml-6 text-xs hover:underline"
          >
            Reveal answer
          </button>
        )
      )}
      <div className={cn('text-muted-foreground/60 mt-1 pl-6 text-[10px]')}>{item.id}</div>
    </li>
  )
}