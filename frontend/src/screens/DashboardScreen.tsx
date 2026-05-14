/* eslint-disable react-hooks/static-components */
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AdminPanel } from '../panels/AdminPanel'
import { ChatPanel } from '../panels/ChatPanel'
import { CompaniesPanel } from '../panels/CompaniesPanel'
import { FormsPanel } from '../panels/FormsPanel'
import { ProfilePanel } from '../panels/ProfilePanel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  User, 
  Building2, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  BellOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { CollegeLogo } from '@/components/modern/CollegeLogo'
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

export default function DashboardScreen() {
  const { session, logout, repo } = useAuth()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [notificationPreference, setNotificationPreference] = useState(() =>
    getNotificationPreference(),
  )

  const panels: Panel[] = useMemo(
    () => {
      if (!session) return []
      return [
        {
          id: 'profile',
          label: 'Profile',
          icon: <User className="w-5 h-5" />,
          element: <ProfilePanel />,
        },
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

  const Sidebar = ({ className = '' }: { className?: string }) => (
    <aside className={`flex flex-col h-full ${className}`}>
      <div className="p-6 border-b border-white/10">
        <div className="flex flex-col gap-3">
          <div className="w-fit rounded-xl bg-white px-3 py-2 shadow-sm">
            <CollegeLogo imageClassName="w-40" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Placement Desk</h2>
            <p className="text-xs text-muted-foreground">
              {session.isSpc ? 'Student + SPC' : 'Student Access'}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-1">
          {panels.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedIndex(i)
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                i === safeIndex
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }`}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-white/10">
        <Button
          variant="outline"
          className="mb-3 w-full justify-start gap-3"
          onClick={() =>
            void (notificationsEnabled
              ? disableNotifications()
              : enableNotifications())
          }
          disabled={!notificationPreference.supported}
        >
          {notificationsEnabled ? (
            <BellOff className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {notificationsEnabled ? 'Block notifications' : 'Allow notifications'}
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 z-40">
        <Card className="w-full h-full rounded-none border-0 bg-white/5 backdrop-blur-xl border-r border-white/10">
          <Sidebar />
        </Card>
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white px-2 py-1 shadow-sm">
            <CollegeLogo imageClassName="w-28" />
          </div>
          <span className="font-semibold text-white">Placement</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 bottom-0 w-72" 
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="h-full rounded-none border-0 bg-slate-900 border-l border-white/10">
              <Sidebar />
            </Card>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:ml-72">
        <main className="min-h-screen pt-16 lg:pt-0">
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between px-8 py-6 border-b border-white/10 bg-white/5 backdrop-blur-xl">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Welcome, {session.user.name?.trim() || 'Student'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {session.isSpc
                  ? 'You can manage placement operations and still act as a student.'
                  : 'Keep your verified profile sharp and respond quickly to drives.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  void (notificationsEnabled
                    ? disableNotifications()
                    : enableNotifications())
                }
                disabled={!notificationPreference.supported}
                className="gap-2"
              >
                {notificationsEnabled ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {notificationsEnabled ? 'Block notifications' : 'Allow notifications'}
              </Button>
              <Button variant="outline" onClick={logout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </header>

          <div className="p-4 lg:p-8">
            {active.element}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 bg-white/5 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        {panels.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedIndex(i)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
              i === safeIndex
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {p.icon}
            <span className="text-xs font-medium">{p.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
