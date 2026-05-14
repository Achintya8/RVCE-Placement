import { toast } from 'sonner'
import type { PlacementRepository } from '../api/placementRepository'

const NOTIFICATION_OPT_OUT_KEY = 'notifications_opted_out'

let serviceWorkerMessageListenerRegistered = false

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray.buffer as ArrayBuffer
}

function canUsePushNotifications(): boolean {
  return (
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function getNotificationPreference(): {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  optedOut: boolean
} {
  return {
    supported: canUsePushNotifications(),
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
    optedOut: localStorage.getItem(NOTIFICATION_OPT_OUT_KEY) === 'true',
  }
}

export async function allowNotifications(): Promise<NotificationPermission> {
  localStorage.removeItem(NOTIFICATION_OPT_OUT_KEY)

  if (!canUsePushNotifications()) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'

  return Notification.requestPermission()
}

export async function blockNotifications(): Promise<void> {
  localStorage.setItem(NOTIFICATION_OPT_OUT_KEY, 'true')

  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    await subscription?.unsubscribe()
  } catch {
    /* ignore: blocking should still persist locally */
  }
}

function applicationServerKeysMatch(
  subscription: PushSubscription | null,
  publicKey: ArrayBuffer,
) {
  const currentKey = subscription?.options.applicationServerKey
  if (!currentKey) return false

  const current = new Uint8Array(currentKey)
  const expected = new Uint8Array(publicKey)
  if (current.byteLength !== expected.byteLength) return false

  return current.every((value, index) => value === expected[index])
}

function registerForegroundMessageListener() {
  if (serviceWorkerMessageListenerRegistered) return

  navigator.serviceWorker.addEventListener('message', (event) => {
    const payload = event.data as
      | {
          type?: string
          notification?: { title?: string; body?: string }
        }
      | undefined

    if (payload?.type !== 'PUSH_NOTIFICATION') return

    toast(payload.notification?.title ?? 'New notification', {
      description: payload.notification?.body ?? '',
    })
  })

  serviceWorkerMessageListenerRegistered = true
}

export async function registerNotifications(repo: PlacementRepository): Promise<void> {
  if (!canUsePushNotifications()) return
  if (localStorage.getItem(NOTIFICATION_OPT_OUT_KEY) === 'true') return

  const { configured, publicKey } = await repo.getNotificationPublicKey()
  if (!configured || !publicKey) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const registration = await navigator.serviceWorker.ready
  const applicationServerKey = urlBase64ToArrayBuffer(publicKey)
  let subscription =
    await registration.pushManager.getSubscription()

  if (
    subscription &&
    !applicationServerKeysMatch(subscription, applicationServerKey)
  ) {
    await subscription.unsubscribe()
    subscription = null
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
  }

  await repo.registerPushSubscription(subscription.toJSON())
  registerForegroundMessageListener()
}

export async function registerNotificationsSafely(
  repo: PlacementRepository,
): Promise<boolean> {
  try {
    await registerNotifications(repo)
    return true
  } catch (error) {
    console.warn('Notification registration failed', error)
    return false
  }
}
