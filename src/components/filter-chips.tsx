import { cn } from '@/lib/utils'

export type ChipOption = { value: string | undefined; label: string; disabled?: boolean }

export function ChipRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: ChipOption[]
  selected: string | undefined
  onSelect: (value: string | undefined) => void
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-muted-foreground w-14 shrink-0 text-xs">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === selected
          return (
            <button
              key={option.value ?? '__all'}
              type="button"
              disabled={option.disabled}
              onClick={() => onSelect(option.value)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground hover:bg-primary-hover hover:border-primary-hover'
                  : 'border-border hover:bg-accent-hover hover:border-input text-muted-foreground hover:text-accent-foreground',
                option.disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:border-border',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
