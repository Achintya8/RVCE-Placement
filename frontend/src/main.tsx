import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { Toaster } from '@/components/ui/sonner'
import { GOOGLE_CLIENT_ID } from './config.ts'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast.info('Updating to the latest version...', {
      description: 'Refreshing to apply the new changes.',
      duration: 3000,
    })
    setTimeout(() => {
      updateSW(true)
    }, 1500)
  },
  onOfflineReady() {
    console.log('App is ready for offline use.')
  }
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data
    if (data?.type === 'OFFLINE_SYNC_COMPLETE') {
      toast.success('Sync complete! Your offline changes have been synchronized.')
      window.dispatchEvent(new CustomEvent('offline-sync-complete', { detail: data }))
    }
  })

  navigator.serviceWorker.ready.then(async (registration) => {
    // Check for service worker updates on load
    registration.update().catch((err) => console.warn('SW update check failed:', err))

    // Check for updates when window gains focus
    const handleFocus = () => {
      registration.update().catch((err) => console.warn('SW update check failed on focus:', err))
    }
    window.addEventListener('focus', handleFocus)

    if ('periodicSync' in registration) {
      try {
        const status = await (navigator as any).permissions.query({
          name: 'periodic-background-sync',
        })
        if (status.state === 'granted') {
          await (registration as any).periodicSync.register('periodic-portal-update', {
            minInterval: 6 * 60 * 60 * 1000,
          })
          console.log('Periodic sync registered successfully')
        } else {
          console.warn('Periodic background sync permission not granted.')
        }
      } catch (err) {
        console.warn('Periodic background sync registration failed:', err)
      }
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <App />
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
