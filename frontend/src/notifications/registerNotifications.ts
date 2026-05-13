import { getToken, onMessage } from 'firebase/messaging'
import { FIREBASE_VAPID_KEY } from '../config'
import { toast } from 'sonner'
import { getFirebaseMessaging } from './firebase'
import type { PlacementRepository } from '../api/placementRepository'

export async function registerNotifications(repo: PlacementRepository): Promise<void> {
  const messaging = await getFirebaseMessaging()
  if (!messaging) return

  if (!('Notification' in window)) return
  if (!('serviceWorker' in navigator)) return
  if (!FIREBASE_VAPID_KEY) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  // Ensure SW is ready before requesting token
  const registration = await navigator.serviceWorker.ready

  const token = await getToken(messaging, {
    vapidKey: FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  })

  if (!token) return

  await repo.registerFcmToken(token)

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? 'New notification'
    const body = payload.notification?.body ?? ''

    // Foreground UX: show toast + native notification (if allowed)
    toast(title, { description: body })

    try {
      if (Notification.permission === 'granted') {
        new Notification(title, { body })
      }
    } catch {
      /* ignore */
    }
  })
}

