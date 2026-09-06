 
 
 

import { cn } from '@/lib/utils'
import type { Verification } from '@/content/types'

export function VerifiedBadge({ status, className }: { status: Verification; className?: string }) {
  if (status === 'authored') {
    return (
      <span className={cn('bg-green-100 text-green-700 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium dark:bg-green-900/40 dark:text-green-300', className)}>
        verified
      </span>
    )
  }
  return (
    <span
      className={cn('bg-peach-500/70 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white', className)}
      title="Extracted from the source notes — not yet hand-verified"
    >
      unverified
    </span>
  )
}