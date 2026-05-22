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
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showHeader, setShowHeader] = useState(true)

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex((i) => Math.min(i, Math.max(0, panels.length - 1)))
  }, [panels.length])

  useEffect(() => {
    const requestedPanelId = getRequestedPanelId()
    if (!requestedPanelId) return

    const panelIndex = panels.findIndex((panel) => panel.id === requestedPanelId)
    if (panelIndex < 0) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(panelIndex)
    window.history.replaceState({}, '', window.location.pathname)
  }, [panels])

  useEffect(() => {
    if (session) {
      void registerNotificationsSafely(repo)
    }
  }, [session])

  if (!session) return null

  const safeIndex = Math.min(selectedIndex, panels.length - 1)
  const active = panels[safeIndex] ?? panels[0]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white">
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
        active.id === 'chat'
          ? cn("max-w-full pb-20 px-0", showHeader ? "pt-0" : "pt-6 sm:pt-8")
          : cn("max-w-7xl px-3 sm:px-5 lg:px-8 pb-28", showHeader ? "pt-6 sm:pt-8" : "pt-12 sm:pt-16")
      )}>
        {active.element}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 px-2 py-2 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-3xl justify-around gap-1 sm:justify-center sm:gap-2">
        {panels.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedIndex(i)}
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
    </div>
  )
}
