import { useState } from 'react'
import { Link, Outlet, createRootRoute, useMatchRoute } from '@tanstack/react-router'
import { Menu, PanelLeftClose, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSidebarCollapsed, setSidebarCollapsed } from '@/lib/sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SidebarNav } from '@/components/sidebar-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { CommandPalette, useCommandPalette } from '@/components/command-palette'

export const Route = createRootRoute({ component: RootLayout })

function RootLayout() {
  const { open, setOpen } = useCommandPalette()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => getSidebarCollapsed())
  const matchRoute = useMatchRoute()

  const toggleCollapsed = (v: boolean) => {
    setCollapsed(v)
    setSidebarCollapsed(v)
  }

   
  const isSession = Boolean(matchRoute({ to: '/practice/session' }))

  if (isSession) {
    return (
      <>
        <Outlet />
        <CommandPalette open={open} onOpenChange={setOpen} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen">
      {!collapsed && (
        <aside className="bg-card/40 sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r md:flex">
          <div className="flex h-14 items-center pr-3 pl-5">
            <Link to="/" className="flex-1 text-sm font-semibold tracking-tight">
              Deutsch
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              onClick={() => toggleCollapsed(true)}
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>
          <SidebarNav />
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Show sidebar"
            title="Show sidebar"
            className={cn('hidden', collapsed && 'md:inline-flex')}
            onClick={() => toggleCollapsed(false)}
          >
            <Menu className="size-4" />
          </Button>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto p-0">
              <SheetTitle className="px-5 py-4 text-sm font-semibold">Deutsch</SheetTitle>
              <SidebarNav onNavigate={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="text-muted-foreground gap-2 font-normal"
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="bg-muted text-muted-foreground hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              /
            </kbd>
          </Button>
          <ThemeToggle />
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </div>
  )
}