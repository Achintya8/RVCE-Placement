import { GoogleLogin } from '@react-oauth/google'
import { Bell, BellOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { AuthCardSkeleton } from '@/components/modern/Skeleton'
import { CollegeLogo } from '@/components/modern/CollegeLogo'
import { Button } from '@/components/ui/button'
import {
  allowNotifications,
  blockNotifications,
  getNotificationPreference,
} from '../notifications/registerNotifications'

export default function HomeScreen() {
  const { loginWithGoogle, errorMessage, clearError, status } = useAuth()
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

  const toggleNotifications = async () => {
    if (!notificationPreference.supported) {
      toast.error('Notifications are not supported in this browser.')
      return
    }

    if (
      notificationPreference.permission === 'granted' &&
      !notificationPreference.optedOut
    ) {
      await blockNotifications()
      refreshNotificationPreference()
      toast('Notifications blocked for this portal.')
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

  const notificationButtonLabel =
    notificationPreference.permission === 'denied'
      ? 'Notifications blocked'
      : notificationPreference.permission === 'granted' &&
          !notificationPreference.optedOut
        ? 'Block notifications'
        : 'Allow notifications'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8fbff] px-5 py-10 text-slate-950">
      <div className="pointer-events-none absolute inset-x-[-35%] top-[-8rem] h-[25rem] rounded-b-[55%] bg-[#dff0ff]" />
      <div className="pointer-events-none absolute inset-x-[-25%] top-[-2rem] h-[20rem] rounded-b-[55%] bg-white" />

      <main className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-20 flex flex-col items-center sm:mb-16">
          <CollegeLogo imageClassName="w-48" />
          <h1 className="mt-3 text-xl font-medium tracking-tight">Placement</h1>
        </div>

        {isBusy ? (
          <AuthCardSkeleton />
        ) : (
          <section
            aria-label="Placement portal sign in"
            className="w-full rounded-[2rem] border border-slate-200 dark:border-white/10 bg-[#444444] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.28)] animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <p className="mb-6 text-center text-sm font-medium text-slate-700 dark:text-white/80">
              Sign in with your RVCE Google account
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mb-4 w-full bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-white/20"
              onClick={() => void toggleNotifications()}
              disabled={!notificationPreference.supported}
            >
              {notificationPreference.permission === 'granted' &&
              !notificationPreference.optedOut ? (
                <BellOff />
              ) : (
                <Bell />
              )}
              {notificationButtonLabel}
            </Button>
            <div className="flex justify-center rounded-2xl bg-[#0d72d9] px-3 py-3 hover:bg-blue-600 transition-colors">
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
