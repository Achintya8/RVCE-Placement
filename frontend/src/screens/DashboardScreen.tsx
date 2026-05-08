import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AdminPanel } from '../panels/AdminPanel'
import { ChatPanel } from '../panels/ChatPanel'
import { CompaniesPanel } from '../panels/CompaniesPanel'
import { FormsPanel } from '../panels/FormsPanel'
import { ProfilePanel } from '../panels/ProfilePanel'

type Panel = {
  id: string
  label: string
  icon: string
  element: React.ReactNode
}

export default function DashboardScreen() {
  const { session, logout } = useAuth()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [wide, setWide] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 980px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 980px)')
    const fn = () => setWide(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const panels: Panel[] = useMemo(
    () => {
      if (!session) return []
      return [
        {
          id: 'profile',
          label: 'Profile',
          icon: '🪪',
          element: <ProfilePanel />,
        },
        {
          id: 'companies',
          label: 'Companies',
          icon: '🏢',
          element: <CompaniesPanel />,
        },
        {
          id: 'forms',
          label: 'Forms',
          icon: '📋',
          element: <FormsPanel />,
        },
        {
          id: 'chat',
          label: 'Chat',
          icon: '💬',
          element: <ChatPanel />,
        },
        ...(session.isSpc
          ? [
              {
                id: 'admin',
                label: 'SPC Admin',
                icon: '⚙️',
                element: <AdminPanel />,
              } satisfies Panel,
            ]
          : []),
      ]
    },
    [session],
  )

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, panels.length - 1)))
  }, [panels.length])

  if (!session) return null

  const safeIndex = Math.min(selectedIndex, panels.length - 1)
  const active = panels[safeIndex] ?? panels[0]

  return (
    <div className="plc-dash">
      <div className={`plc-dash-inner ${wide ? 'plc-dash-wide' : 'plc-dash-narrow'}`}>
        {wide ? (
          <aside className="plc-side-rail">
            <h2>Placement Desk</h2>
            <p className="muted">
              {session.isSpc
                ? 'Student + SPC access'
                : 'Student access'}
            </p>
            <nav className="plc-rail-nav">
              {panels.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={i === safeIndex ? 'is-active' : ''}
                  onClick={() => setSelectedIndex(i)}
                >
                  <span aria-hidden>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </nav>
            <button type="button" className="plc-btn-outline" onClick={logout}>
              Logout
            </button>
          </aside>
        ) : null}

        <div className="plc-dash-main">
          <header className="plc-header-bar">
            <div>
              <h1>
                Welcome,{' '}
                {session.user.name?.trim() ? session.user.name : 'Student'}
              </h1>
              <p>
                {session.isSpc
                  ? 'You can manage placement operations and still act as a student.'
                  : 'Keep your verified profile sharp and respond quickly to drives.'}
              </p>
            </div>
            {wide ? (
              <button type="button" className="plc-btn-outline" onClick={logout}>
                Logout
              </button>
            ) : null}
          </header>

          <div className="plc-panel-scroll">{active.element}</div>
        </div>
      </div>

      {!wide ? (
        <nav className="plc-bottom-nav" aria-label="Primary">
          {panels.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={i === safeIndex ? 'is-active' : ''}
              onClick={() => setSelectedIndex(i)}
            >
              <div>{p.icon}</div>
              {p.label}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  )
}
