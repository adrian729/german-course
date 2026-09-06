 
 

const KEY = 'sidebar'

export const getSidebarCollapsed = (): boolean => localStorage.getItem(KEY) === 'true'

export function setSidebarCollapsed(v: boolean): void {
  localStorage.setItem(KEY, String(v))
}
