import { useEffect, useState } from 'react'
import { useAuthStore } from './store/useAuthStore'
import DashboardScreen from './screens/DashboardScreen'
import HomeScreen from './screens/HomeScreen'
import { LoadingRegion } from '@/components/modern/Skeleton'
import { CollegeLogo } from '@/components/modern/CollegeLogo'

const spinnerSpokes = Array.from({ length: 12 }, (_, index) => index)

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return isOnline
}

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
  const isOnline = useOnlineStatus()
  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-amber-600/90 text-white px-4 py-2 text-center text-xs font-medium tracking-wide shadow-lg backdrop-blur-md border-b border-amber-500/20 transition-all duration-300">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          Offline Mode — Showing Cached Content
        </div>
      )}
      <AppContent />
    </>
  )
}
