 
 

import { SpeakButton } from '@/components/speak-button'
import { Kbd, KeyHint } from '@/components/exercise/key-hint'
import { revealPayload } from '@/components/exercise/payload'
import { gradeResult, useShapeKeys, type ShapeProps } from '@/components/exercise/shape'

export function RevealShape({ item, graded, onGrade }: ShapeProps) {
  const view = revealPayload(item)
  const revealed = graded !== null

   
   
   
  const reveal = () => onGrade({ outcome: 'exact', verdicts: [{ input: '', expected: view.back, result: gradeResult('exact') }] })

  useShapeKeys(
    (e) => {
      if (revealed) return false
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        reveal()
        return true
      }
      return false
    },
    [revealed, item.id],
  )

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex items-center gap-2">
        <p className="text-2xl leading-relaxed font-medium text-balance">{view.front}</p>
        <SpeakButton text={view.front} size="icon-xs" />
      </div>

      {revealed ? (
        <div className="w-full max-w-xl border-t pt-6 text-center">
          <p className="text-lg leading-relaxed">{view.back}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={reveal}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          Reveal
        </button>
      )}

      <KeyHint>
        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>
            <Kbd>Space</Kbd> <Kbd>Enter</Kbd> reveal, then advance
          </span>
        </span>
      </KeyHint>
    </div>
  )
}
