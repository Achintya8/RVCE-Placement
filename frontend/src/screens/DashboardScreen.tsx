import { useEffect, useMemo, useState } from 'react'
import { useAuthStore, repo } from '../store/useAuthStore'
import { useShallow } from 'zustand/react/shallow'
import { AdminPanel } from '../panels/AdminPanel'
import { ChatPanel } from '../panels/ChatPanel'
import { CompaniesPanel } from '../panels/CompaniesPanel'
import { FormsPanel } from '../panels/FormsPanel'
import { ProfilePanel } from '../panels/ProfilePanel'
import { 
  User, 
  Building2, 
  FileText, 
  MessageSquare, 
  Settings,
  Menu,
  X,
} from 'lucide-react'
import { CollegeLogo } from '@/components/modern/CollegeLogo'
import { cn } from '@/lib/utils'
import { registerNotificationsSafely } from '../notifications/registerNotifications'

type Panel = {
  id: string
  label: string
  icon: React.ReactNode
  element: React.ReactNode
}

const notificationPanelIds = new Set(['companies', 'forms', 'chat'])

function getRequestedPanelId() {
  const panel = new URLSearchParams(window.location.search).get('panel')
  return panel && notificationPanelIds.has(panel) ? panel : null
}

export default function DashboardScreen() {
  const { session } = useAuthStore(
    useShallow((state) => ({
      session: state.session,
    }))
  )
  const [selectedPanelId, setSelectedPanelId] = useState(() => {
    const urlPanel = new URLSearchParams(window.location.search).get('panel')
    const allowed = new Set(['companies', 'forms', 'chat', 'profile', 'admin'])
    if (urlPanel && allowed.has(urlPanel)) {
      return urlPanel
    }
    return localStorage.getItem('dashboard_active_panel') || 'companies'
  })
  const [showHeader, setShowHeader] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  const changePanel = (id: string) => {
    setSelectedPanelId(id)
    localStorage.setItem('dashboard_active_panel', id)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHeader(false)
    }, 10000)
    return () => clearTimeout(timer)
  }, [])

  const panels: Panel[] = useMemo(
    () => {
      if (!session) return []
      return [
        {
          id: 'companies',
          label: 'Companies',
          icon: <Building2 className="w-5 h-5" />,
          element: <CompaniesPanel />,
        },
        {
          id: 'forms',
          label: 'Forms',
          icon: <FileText className="w-5 h-5" />,
          element: <FormsPanel />,
        },
        {
          id: 'chat',
          label: 'Chat',
          icon: <MessageSquare className="w-5 h-5" />,
          element: <ChatPanel />,
        },
        {
          id: 'profile',
          label: 'Profile',
          icon: session.user.profilePictureUrl ? (
            <img
              src={session.user.profilePictureUrl}
              alt=""
              className="h-5 w-5 rounded-full object-cover"
            />
          ) : (
            <User className="w-5 h-5" />
          ),
          element: <ProfilePanel />,
        },
        ...(session.isSpc
          ? [
              {
                id: 'admin',
                label: 'SPC Admin',
                icon: <Settings className="w-5 h-5" />,
                element: <AdminPanel />,
              } satisfies Panel,
            ]
          : []),
      ]
    },
    [session],
  )

  useEffect(() => {
    const requestedPanelId = getRequestedPanelId()
    if (!requestedPanelId) return

    const hasPanel = panels.some((panel) => panel.id === requestedPanelId)
    if (!hasPanel) return

    changePanel(requestedPanelId)
    window.history.replaceState({}, '', window.location.pathname)
  }, [panels])

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>
      const targetPanel = customEvent.detail?.panel
      if (targetPanel) {
        const hasPanel = panels.some((p) => p.id === targetPanel)
        if (hasPanel) {
          changePanel(targetPanel)
        }
      }
    }
    window.addEventListener('navigate-to-panel', handleNavigate)
    return () => {
      window.removeEventListener('navigate-to-panel', handleNavigate)
    }
  }, [panels])

  useEffect(() => {
    if (session) {
      void registerNotificationsSafely(repo)
    }
  }, [session])

  if (!session) return null

  const safeIndex = useMemo(() => {
    const idx = panels.findIndex((p) => p.id === selectedPanelId)
    return idx >= 0 ? idx : 0
  }, [panels, selectedPanelId])

  const active = panels[safeIndex] ?? panels[0]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white">

      {/* ── CHAT LAYOUT: hamburger button + full-height chat ────────────── */}
      {active.id === 'chat' ? (
        <div className="relative h-[100dvh] w-full overflow-hidden bg-slate-100 text-slate-950 dark:bg-[#080d18] dark:text-white md:p-4">
          <div className="relative mx-auto h-full w-full max-w-6xl overflow-hidden">

            {/* Hamburger button — top-left corner */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/90 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-slate-900/90"
              aria-label="Navigation menu"
            >
              {menuOpen ? <X className="w-4 h-4 text-slate-700 dark:text-slate-200" /> : <Menu className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="absolute inset-0 z-[55]"
                  onClick={() => setMenuOpen(false)}
                />
                {/* Menu panel */}
                <div className="absolute left-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[60] min-w-[170px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 origin-top-left dark:border-white/10 dark:bg-slate-900">
                  {panels.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { changePanel(p.id); setMenuOpen(false) }}
                      className={cn(
                        "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors text-left",
                        i === safeIndex
                          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                      )}
                    >
                      {p.icon}
                      {p.label}
                      {i === safeIndex && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Chat fills full space */}
            <ChatPanel />
          </div>
        </div>

      ) : (
        /* ── DEFAULT LAYOUT: top header + bottom nav ──────────────────────── */
        <>
          <header className={cn(
            "sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur-xl transition-all duration-500 ease-in-out dark:border-white/10 dark:bg-slate-950/70 sm:px-6 lg:px-8 overflow-hidden",
            showHeader ? "max-h-24 opacity-100" : "max-h-0 opacity-0 py-0 border-b-0 pointer-events-none"
          )}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white px-1.5 py-1 shadow-sm">
                <CollegeLogo imageClassName="w-10 h-10 object-cover rounded-md" />
              </div>
              <div className="hidden min-w-0 sm:block">
                <h1 className="truncate text-base font-semibold lg:text-xl">
                  Welcome, {session.user.name?.trim() || 'Student'}
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  {session.isSpc ? 'Student + SPC' : 'Student Access'}
                </p>
              </div>
            </div>
          </header>

          <main className={cn(
            "mx-auto min-h-[calc(100vh-4rem)] w-full transition-all duration-500 ease-in-out",
            cn("max-w-7xl px-3 sm:px-5 lg:px-8 pb-28", showHeader ? "pt-6 sm:pt-8" : "pt-12 sm:pt-16")
          )}>
            {active.element}
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 px-2 py-2 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85">
            <div className="mx-auto flex max-w-3xl justify-around gap-1 sm:justify-center sm:gap-2">
            {panels.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => changePanel(p.id)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] sm:text-xs font-semibold transition-all sm:min-w-24 sm:flex-none sm:px-4 ${
                  i === safeIndex
                    ? 'bg-primary text-white shadow-md shadow-primary/20 dark:bg-primary dark:text-white dark:shadow-md dark:shadow-primary/30'
                    : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                {p.icon}
                <span className="max-w-full truncate">{p.label}</span>
              </button>
            ))}
            </div>
          </nav>
        </>
      )}
    </div>
  )
}
