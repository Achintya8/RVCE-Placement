/* eslint-disable react-hooks/static-components */
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AdminPanel } from '../panels/AdminPanel'
import { ChatPanel } from '../panels/ChatPanel'
import { CompaniesPanel } from '../panels/CompaniesPanel'
import { FormsPanel } from '../panels/FormsPanel'
import { ProfilePanel } from '../panels/ProfilePanel'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Building2, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut,
  Bell,
  BellOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { CollegeLogo } from '@/components/modern/CollegeLogo'
import { cn } from '@/lib/utils'
import {
  allowNotifications,
  blockNotifications,
  getNotificationPreference,
  registerNotificationsSafely,
} from '../notifications/registerNotifications'

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
  const { session, logout, repo } = useAuth()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [notificationPreference, setNotificationPreference] = useState(() =>
    getNotificationPreference(),
  )

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

    setSelectedIndex(panelIndex)
    window.history.replaceState({}, '', window.location.pathname)
  }, [panels])

  useEffect(() => {
    const handleFocus = () => setNotificationPreference(getNotificationPreference())
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  if (!session) return null

  const enableNotifications = async () => {
    const permission = await allowNotifications()
    setNotificationPreference(getNotificationPreference())

    if (permission !== 'granted') {
      toast.error('Notifications are blocked in your browser settings.')
      return
    }

    const registered = await registerNotificationsSafely(repo)
    setNotificationPreference(getNotificationPreference())

    if (registered) {
      toast.success('Notifications enabled for placement alerts.')
    } else {
      toast.error('Could not register this device for notifications.')
    }
  }

  const disableNotifications = async () => {
    await blockNotifications()
    setNotificationPreference(getNotificationPreference())
    toast('Notifications blocked for this portal.')
  }

  const notificationsEnabled =
    notificationPreference.permission === 'granted' &&
    !notificationPreference.optedOut

  const safeIndex = Math.min(selectedIndex, panels.length - 1)
  const active = panels[safeIndex] ?? panels[0]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70 sm:px-6 lg:px-8">
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
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              void (notificationsEnabled
                ? disableNotifications()
                : enableNotifications())
            }
            disabled={!notificationPreference.supported}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-slate-200 dark:bg-white/10 sm:w-auto sm:px-4"
            title={notificationsEnabled ? 'Block notifications' : 'Allow notifications'}
          >
            {notificationsEnabled ? (
              <BellOff className="w-4 h-4" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {notificationsEnabled ? 'Block notifications' : 'Allow notifications'}
            </span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={logout}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-slate-200 dark:bg-white/10 sm:w-auto sm:px-4"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className={cn("mx-auto min-h-[calc(100vh-4rem)] w-full px-3 py-4 pb-28 sm:px-5 lg:px-8", active.id === 'chat' ? "max-w-full lg:px-4" : "max-w-7xl")}>
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
