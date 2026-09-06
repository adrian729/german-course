 
 
 

import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { loadVocab } from '@/content/loader'
import type { ReadingText, Topic, VocabEntry, WritingPrompt } from '@/content/types'
import { SpeakButton } from '@/components/speak-button'
import { Button } from '@/components/ui/button'

export function ReadingPanel({ reading }: { topic: Topic; reading: ReadingText }) {
  const [glossary, setGlossary] = useState<Map<string, VocabEntry>>(new Map())
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    loadVocab().then((b) => {
      const g = new Map<string, VocabEntry>()
      for (const e of b.entries) {
        const bare = e.headword.replace(/^(der|die|das)\s+/, '')
        if (bare && reading.body.includes(bare)) g.set(e.id, e)
      }
      setGlossary(g)
    })
  }, [reading])

  const sentences = reading.body.split(/(?<=[.!?])\s+/).filter(Boolean)

  const renderWithGlossary = (sentence: string): ReactNode => {
    if (glossary.size === 0) return sentence
     
    const terms = [...glossary.values()]
      .map((e) => e.headword.replace(/^(der|die|das)\s+/, ''))
      .filter((w) => w.length > 3)
      .sort((a, b) => b.length - a.length)
      .slice(0, 40)
    let parts: ReactNode[] = [sentence]
    let n = 0
    for (const term of terms) {
      const next: ReactNode[] = []
      for (const part of parts) {
        if (typeof part !== 'string') {
          next.push(part)
          continue
        }
         
         
        const entry = [...glossary.values()].find((e) => e.headword.endsWith(term))
        const title = entry ? `${entry.headword} — ${entry.glosses[0] ?? ''}` : term
        const chunks = part.split(term)
        for (let i = 0; i < chunks.length; i++) {
          const c = chunks[i]!
          if (i > 0) next.push(<abbr key={`gloss-${n++}`} title={title} className="decoration-dotted underline underline-offset-2">{term}</abbr>)
          if (c) next.push(c)
        }
      }
      parts = next
    }
    return parts
  }

  return (
    <div className="my-6 rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">{reading.title}</h3>
        <SpeakButton text={reading.body} />
      </div>
      {reading.glossary && (
        <p className="text-muted-foreground mb-3 text-xs italic">{reading.glossary}</p>
      )}
      <div className="text-[0.95rem] leading-7">
        {sentences.map((s, i) => (
          <span key={i} className="mr-2 inline">
            <span className="hover:bg-accent-hover cursor-default rounded px-0.5" title="Click to hear">
              {renderWithGlossary(s)}
            </span>
            <SpeakButton text={s} size="icon-xs" />
          </span>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Comprehension questions</h4>
          <SpeakButton text={reading.questions.map((q) => q.q).join(' ')} size="icon-xs" />
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {reading.questions.map((q, i) => (
            <li key={i}>
              <span>{q.q}</span>
              {q.answer && revealed && <span className="text-primary block">→ {q.answer}</span>}
            </li>
          ))}
        </ol>
        {!revealed && (
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setRevealed(true)}>
            Reveal answers
          </Button>
        )}
      </div>
    </div>
  )
}

export function WritingPanel({ prompt, topic }: { prompt: WritingPrompt; topic?: Topic }) {
  const [done, setDone] = useState<boolean[]>(() => prompt.requirements.map(() => false))
  const lessonLabel = topic ? topic.lessonId.replace(/^0/, 'Lesson ').replace(/-/g, ' ') : 'this lesson'

  return (
    <div className="my-6 rounded-lg border p-4">
      <h3 className="mb-2 font-semibold">Writing — {prompt.title}</h3>
      <p className="text-[0.95rem] leading-7">{prompt.prompt}</p>
      {prompt.requirements.length > 0 && (
        <div className="mt-3">
          <div className="text-muted-foreground mb-1 text-xs font-medium">Required constructions</div>
          <ul className="flex flex-col gap-1">
            {prompt.requirements.map((req, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={done[i] ?? false}
                    onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
                    className="accent-primary"
                  />
                  <span className={done[i] ? 'text-muted-foreground line-through' : ''}>{req}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-muted-foreground mt-3 text-xs">
        Write using {lessonLabel} grammar and vocabulary. There is no key — this is yours.
      </p>
    </div>
  )
}

export function AppliedPanels({ topic, readings, prompts }: { topic: Topic; readings: ReadingText[]; prompts: WritingPrompt[] }) {
  const reading = readings.find((r) => r.topicId === topic.id)
  const prompt = prompts.find((p) => p.topicId === topic.id)
  return (
    <>
      {reading && <ReadingPanel topic={topic} reading={reading} />}
      {prompt && <WritingPanel prompt={prompt} topic={topic} />}
      {!reading && !prompt && (
        <p className="text-muted-foreground my-6 text-sm">
          No reading or writing content extracted for this topic.
        </p>
      )}
      <Link to="/practice" search={{ topic: topic.id, mode: 'production' }} className="text-primary text-sm hover:underline">
        Practice the grammar of this lesson →
      </Link>
    </>
  )
}