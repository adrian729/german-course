// A fold that resets on reload is worse than no fold, so this persists to
// localStorage (see also lib/theme.ts).

const KEY = 'sidebar'

export const getSidebarCollapsed = (): boolean => localStorage.getItem(KEY) === 'true'

export function setSidebarCollapsed(v: boolean): void {
  localStorage.setItem(KEY, String(v))
}
