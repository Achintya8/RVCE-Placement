import { useEffect } from 'react'
import { useAuthStore } from './store/useAuthStore'
import DashboardScreen from './screens/DashboardScreen'
import HomeScreen from './screens/HomeScreen'
import { LoadingRegion } from '@/components/modern/Skeleton'
import { CollegeLogo } from '@/components/modern/CollegeLogo'

const spinnerSpokes = Array.from({ length: 12 }, (_, index) => index)

function CupertinoActivityIndicator() {
  return (
    <div className="cupertino-activity-indicator" aria-hidden="true">
      {spinnerSpokes.map((spoke) => (
        <span key={spoke} />
      ))}
    </div>
  )
}

function Splash() {
  return (
    <LoadingRegion
      label="Initialising placement portal"
      className="ios-glass-screen min-h-screen flex flex-col items-center justify-center px-6 text-slate-950 dark:text-white"
    >
      <div className="ios-glass-panel relative z-10 rounded-[1.35rem] p-6">
        <CollegeLogo imageClassName="w-44 sm:w-48" />
      </div>
      <div className="relative z-10 mt-8 flex flex-col items-center gap-3">
        <CupertinoActivityIndicator />
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Initialising Portal</p>
      </div>
    </LoadingRegion>
  )
}

function AppContent() {
  const status = useAuthStore((state) => state.status)
  const restoreSession = useAuthStore((state) => state.restoreSession)

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  if (status === 'checking' || status === 'loading') {
    return <Splash />
  }

  if (status === 'authenticated') {
    return <DashboardScreen />
  }

  return <HomeScreen />
}

export default function App() {
  return (
    <AppContent />
  )
}
