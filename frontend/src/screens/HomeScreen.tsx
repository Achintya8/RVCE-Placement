import { GoogleLogin } from '@react-oauth/google'
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '../store/useAuthStore'
import { useShallow } from 'zustand/react/shallow'
import { AuthCardSkeleton } from '@/components/modern/Skeleton'
import { CollegeLogo } from '@/components/modern/CollegeLogo'
import { Button } from '@/components/ui/button'
import {
  allowNotifications,
  getNotificationPreference,
} from '../notifications/registerNotifications'

export default function HomeScreen() {
  const { loginWithGoogle, errorMessage, clearError, status } = useAuthStore(
    useShallow((state) => ({
      loginWithGoogle: state.loginWithGoogle,
      errorMessage: state.errorMessage,
      clearError: state.clearError,
      status: state.status,
    }))
  )
  const isBusy = status === 'loading'
  const [notificationPreference, setNotificationPreference] = useState(() =>
    getNotificationPreference(),
  )

  const refreshNotificationPreference = () => {
    setNotificationPreference(getNotificationPreference())
  }

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage)
      clearError()
    }
  }, [errorMessage, clearError])

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
      toast.success('Notifications allowed. Sign in to receive placement alerts.')
    } else {
      toast.error('Notifications are blocked in your browser settings.')
    }
  }

  const notificationsGranted = notificationPreference.permission === 'granted'

  return (
    <div className="ios-glass-screen flex min-h-screen items-center justify-center px-5 py-10 text-slate-950 dark:text-white">
      <main className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-16 flex flex-col items-center sm:mb-14">
          <div className="ios-glass-panel rounded-[1.5rem] p-5">
            <CollegeLogo imageClassName="w-44" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Placement</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">RVCE portal</p>
        </div>

        {isBusy ? (
          <div className="w-full overflow-hidden rounded-[1.75rem]">
            <AuthCardSkeleton />
          </div>
        ) : (
          <section
            aria-label="Placement portal sign in"
            className="ios-glass-panel w-full rounded-[1.75rem] p-7 shadow-[0_24px_70px_rgba(15,23,42,0.14)] animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <div className="mb-6 text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Sign in with your RVCE Google account
              </p>
            </div>

            {notificationPreference.isIOS && !notificationPreference.isStandalone && (
              <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 backdrop-blur-xl dark:bg-amber-500/5 text-amber-800 dark:text-amber-300">
                <p className="font-semibold text-sm flex items-center gap-1.5 justify-center">
                  <Bell className="w-4 h-4 animate-pulse shrink-0 text-amber-600 dark:text-amber-400" />
                  iOS PWA Setup Required
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-350 mt-1.5 leading-relaxed text-center">
                  To receive real-time placement alerts, tap the Safari <strong>Share</strong> button and select <strong>'Add to Home Screen'</strong>, then launch the app from your Home Screen.
                </p>
              </div>
            )}

            {notificationPreference.supported && (
              notificationsGranted ? (
                <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/15 px-4 py-2.5 backdrop-blur-xl">
                  <Bell className="w-4 h-4 text-green-600 dark:text-green-300 shrink-0" />
                  <span className="text-sm font-semibold text-green-700 dark:text-green-200">Notifications enabled</span>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  className="mb-4 w-full gap-2"
                  onClick={() => void enableNotifications()}
                >
                  <Bell className="w-4 h-4" />
                  Enable placement alerts
                </Button>
              )
            )}


            <div className="flex justify-center rounded-[1.35rem] bg-primary px-3 py-3 shadow-[0_14px_30px_rgba(0,122,255,0.22)] transition-colors hover:bg-primary/90">
              <GoogleLogin
                onSuccess={(cred) => {
                  if (cred.credential) void loginWithGoogle(cred.credential)
                }}
                onError={() => toast.error('Google sign-in failed.')}
                useOneTap={false}
                theme="filled_blue"
                size="large"
                text="continue_with"
                shape="pill"
                width="300"
              />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
