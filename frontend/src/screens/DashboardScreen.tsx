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
import { FloatingDock } from '@/components/ui/floating-dock'


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

  useEffect(() => {
    if (selectedPanelId === 'chat' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if ('getNotifications' in registration) {
          void registration.getNotifications({ tag: 'chat_notification' }).then((notifications) => {
            notifications.forEach((n) => n.close())
          })
        }
      }).catch(console.error)
    }
  }, [selectedPanelId])

  if (!session) return null

  const safeIndex = useMemo(() => {
    const idx = panels.findIndex((p) => p.id === selectedPanelId)
    return idx >= 0 ? idx : 0
  }, [panels, selectedPanelId])

  const active = panels[safeIndex] ?? panels[0]

  const dockItems = useMemo(
    () =>
      panels.map((p, i) => ({
        title: p.label,
        icon: p.icon,
        onClick: () => changePanel(p.id),
        active: i === safeIndex,
      })),
    [panels, safeIndex]
  )


  return (
    <div className="min-h-screen ios-glass-screen text-slate-950 dark:text-white">

      {/* ── CHAT LAYOUT: bottom nav + full-height chat ────────────── */}
      {active.id === 'chat' ? (
        <div className="flex flex-col h-screen w-full overflow-hidden pb-0 md:pb-20">
          {/* Chat fills remaining space */}
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <ChatPanel />
          </div>

          {/* Floating Dock for Chat (Top-left Menu button on Mobile) */}
          <FloatingDock
            items={dockItems}
            desktopClassName="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex gap-8 px-10 pb-3"
            mobileClassName="fixed left-3 z-50 block md:hidden top-safe-mobile-menu"
            mobileExpandDirection="down"
            mobileAlign="left"
          />
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

          {/* Floating Dock for Default Layout (Keep Dock only on Mobile) */}
          <FloatingDock
            items={dockItems}
            desktopClassName="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-10 pb-3"
            mobileClassName="hidden"
          />
        </>
      )}
    </div>
  )
}
