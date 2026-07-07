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
  Bell,
} from 'lucide-react'
import { CollegeLogo } from '@/components/modern/CollegeLogo'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  registerNotificationsSafely,
  allowNotifications,
  getNotificationPreference,
} from '../notifications/registerNotifications'
import { FloatingDock } from '@/components/ui/floating-dock'
import { resolveBackendUrl } from '../config'


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

  const [notificationPreference, setNotificationPreference] = useState(() =>
    getNotificationPreference(),
  )

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem('dismissed_notification_banner') === 'true'
  })

  const dismissBanner = () => {
    localStorage.setItem('dismissed_notification_banner', 'true')
    setBannerDismissed(true)
  }

  const refreshNotificationPreference = () => {
    setNotificationPreference(getNotificationPreference())
  }

  useEffect(() => {
    const handleFocus = () => refreshNotificationPreference()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const enableNotifications = async () => {
    if (!notificationPreference.supported) {
      toast.error('Notifications are not supported in this browser.')
      return
    }

    const permission = await allowNotifications()
    refreshNotificationPreference()

    if (permission === 'granted') {
      toast.success('Notifications enabled! Subscribing for placement alerts...')
      await registerNotificationsSafely(repo)
    } else {
      toast.error('Notifications are blocked in your browser settings.')
    }
  }

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
              src={resolveBackendUrl(session.user.profilePictureUrl)}
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
        <div className="fixed inset-0 flex flex-col h-[100dvh] w-full overflow-hidden pb-0 md:pb-20">
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

            <div className="flex items-center gap-2">
              {notificationPreference.supported && notificationPreference.permission !== 'granted' && (
                <Button
                  onClick={() => void enableNotifications()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 rounded-full border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400 hover:bg-amber-500/20 shadow-sm"
                >
                  <Bell className="h-3.5 w-3.5 animate-bounce shrink-0" />
                  <span>Enable Alerts</span>
                </Button>
              )}
            </div>
          </header>

          <main className={cn(
            "mx-auto min-h-[calc(100vh-4rem)] w-full transition-all duration-500 ease-in-out",
            cn("max-w-7xl px-3 sm:px-5 lg:px-8 pb-28", showHeader ? "pt-6 sm:pt-8" : "pt-12 sm:pt-16")
          )}>
            {/* iOS PWA Installation Banner */}
            {notificationPreference.isIOS && !notificationPreference.isStandalone && !bannerDismissed && (
              <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 backdrop-blur-xl dark:bg-amber-500/5 text-amber-800 dark:text-amber-300 relative overflow-hidden shadow-sm flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top duration-300">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
                  <div>
                    <h3 className="font-semibold text-sm">iOS Placement Alerts Setup</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">
                      To receive real-time placement alerts on iOS, tap the Safari <strong>Share</strong> button (usually a square with an up arrow at the bottom of the screen) and select <strong>'Add to Home Screen'</strong>.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={dismissBanner}
                  className="text-amber-800/60 hover:text-amber-900 dark:text-amber-400/60 dark:hover:text-amber-300 text-xs font-semibold shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* General Push Notification Prompt Banner */}
            {notificationPreference.supported && notificationPreference.permission !== 'granted' && !bannerDismissed && (
              <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 backdrop-blur-xl dark:bg-indigo-500/5 text-indigo-900 dark:text-indigo-300 relative overflow-hidden shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top duration-300">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 mt-0.5 sm:mt-0 shrink-0 text-indigo-600 dark:text-indigo-400 animate-bounce" />
                  <div>
                    <h3 className="font-semibold text-sm">Enable Real-Time Placement Alerts</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-350 mt-0.5 leading-relaxed">
                      Authorize push notifications to get instantly notified about company postings, registration deadlines, and SPC chat updates.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
                  <button 
                    onClick={dismissBanner}
                    className="text-indigo-800/60 hover:text-indigo-900 dark:text-indigo-400/60 dark:hover:text-indigo-300 text-xs font-semibold px-2"
                  >
                    Maybe Later
                  </button>
                  <Button
                    onClick={() => void enableNotifications()}
                    size="sm"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm text-xs px-4 py-1.5 h-8 w-full sm:w-auto"
                  >
                    Enable
                  </Button>
                </div>
              </div>
            )}

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
