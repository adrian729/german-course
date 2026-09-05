import { Button } from '@/components/ui/button'

const UMLAUTS = [
  { char: 'ä', alt: 'a' },
  { char: 'ö', alt: 'o' },
  { char: 'ü', alt: 'u' },
  { char: 'ß', alt: 's' },
] as const

export function UmlautKeys({ onInsert }: { onInsert: (char: string) => void }) {
  return (
    <div className="flex gap-1">
      {UMLAUTS.map((u) => (
        <Button
          key={u.char}
          variant="outline"
          size="xs"
          type="button"
          onClick={() => onInsert(u.char)}
          title={`Alt+${u.alt} → ${u.char}`}
          className="h-7 px-2 font-mono text-xs"
        >
          {u.char}
        </Button>
      ))}
    </div>
  )
}
