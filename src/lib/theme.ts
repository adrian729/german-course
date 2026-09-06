 
 

export type Theme = 'light' | 'dark' | 'system'

const KEY = 'theme'

export const getTheme = (): Theme => (localStorage.getItem(KEY) as Theme | null) ?? 'system'

export function applyTheme(theme: Theme): void {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}
