export function KeyHint({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground text-[11px]">{children}</span>
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border-border bg-muted rounded border px-1 py-0.5 font-mono text-[10px]">{children}</kbd>
  )
}
