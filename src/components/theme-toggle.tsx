import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getTheme, setTheme, applyTheme, type Theme } from '@/lib/theme'

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const ICON = { system: Monitor, light: Sun, dark: Moon }
const LABEL: Record<Theme, string> = {
  system: 'Theme: follow system',
  light: 'Theme: light',
  dark: 'Theme: dark',
}

export function ThemeToggle() {
  const [theme, setLocal] = useState<Theme>('system')

  useEffect(() => {
    setLocal(getTheme())
     
    const media = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => getTheme() === 'system' && applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const Icon = ICON[theme]
  return (
    <Button
      variant="ghost"
      size="icon"
      title={LABEL[theme]}
      aria-label={LABEL[theme]}
      onClick={() => {
        const next = NEXT[theme]
        setLocal(next)
        setTheme(next)
      }}
    >
      <Icon className="size-4" />
    </Button>
  )
}
