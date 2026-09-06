 
 

import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { audioAvailable, initVoices, speak } from '@/lib/tts'
import { Button } from '@/components/ui/button'

export function SpeakButton({ text, size = 'sm' }: { text: string; size?: 'xs' | 'sm' | 'icon' | 'icon-xs' }) {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    initVoices(() => setOk(audioAvailable()))
    setOk(audioAvailable())
  }, [])

  if (ok === false) return null
  return (
    <Button
      variant="ghost"
      size={size}
      className="text-muted-foreground hover:text-foreground"
      aria-label={`Hear: ${text}`}
      title={`Hear: ${text}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        speak(text)
      }}
    >
      <Volume2 className="size-3.5" />
    </Button>
  )
}