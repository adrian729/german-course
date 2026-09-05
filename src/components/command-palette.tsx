// Search palette, opened with `/`. Opened empty it is a jump list, not a blank
// box — and nothing is remembered between visits.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BookOpen, GraduationCap, Layers, Library, FileText } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { search, setVocabIndex } from '@/lib/search'
import { loadVocab } from '@/content/loader'

const KIND_ICON = { word: BookOpen, point: GraduationCap, lesson: Layers, topic: FileText } as const
const KIND_HEADING = { word: 'Vocabulary', point: 'Grammar', lesson: 'Lessons', topic: 'Topics' } as const

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const results = useMemo(() => search(query), [query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  // Build the vocabulary index once, lazily, so `uber` finds `über`.
  useEffect(() => {
    loadVocab().then((b) => {
      setVocabIndex(b.entries.map((e) => ({ id: e.id, label: e.headword, hint: e.glosses[0] ?? '', to: `/vocabulary/${e.id}` })))
    })
  }, [])

  const go = (to: string) => {
    onOpenChange(false)
    navigate({ to })
  }

  const grouped = { word: [] as typeof results, point: [] as typeof results, lesson: [] as typeof results, topic: [] as typeof results }
  for (const r of results) grouped[r.kind].push(r)

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search words, grammar, lessons and topics" shouldFilter={false}>
      <CommandInput placeholder="Search German words, grammar, lessons…" value={query} onValueChange={setQuery} />
      <CommandList>
        {query.trim() === '' ? (
          <CommandGroup heading="Jump to">
            <CommandItem onSelect={() => go('/vocabulary')}>
              <BookOpen className="size-4" /> Vocabulary
            </CommandItem>
            <CommandItem onSelect={() => go('/grammar')}>
              <GraduationCap className="size-4" /> Grammar
            </CommandItem>
            <CommandItem onSelect={() => go('/reference')}>
              <Library className="size-4" /> Reference
            </CommandItem>
            <CommandItem onSelect={() => go('/practice')}>
              <Layers className="size-4" /> Practice
            </CommandItem>
            <CommandItem onSelect={() => go('/')}>
              <FileText className="size-4" /> All lessons
            </CommandItem>
          </CommandGroup>
        ) : (
          <>
            <CommandEmpty>No matches.</CommandEmpty>
            {(['word', 'point', 'lesson', 'topic'] as const).map((kind) =>
              grouped[kind].length ? (
                <CommandGroup key={kind} heading={KIND_HEADING[kind]}>
                  {grouped[kind].map((r, i) => {
                    const Icon = KIND_ICON[r.kind]
                    return (
                      <CommandItem key={`${r.kind}-${r.to}-${i}`} value={r.to} onSelect={() => go(r.to)}>
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1 truncate">{r.label}</span>
                        <span className="text-muted-foreground shrink-0 text-xs">{r.hint}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ) : null,
            )}
          </>
        )}
      </CommandList>

      <div className="text-muted-foreground flex items-center gap-4 border-t px-3 py-2 text-[11px]">
        <span className="flex items-center gap-1.5">
          <Key>Enter</Key> open
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Key>/</Key> anywhere
        </span>
      </div>
    </CommandDialog>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">
      {children}
    </kbd>
  )
}

/** `/` is a printable character, so it must never steal a real keystroke. */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el?.tagName) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

/**
 * `/` opens search from anywhere except while typing; Ctrl-K is the fallback
 * that works from inside a field.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return { open, setOpen }
}