import { toast } from 'sonner'
import type { PlacementRepository } from '../api/placementRepository'

const NOTIFICATION_OPT_OUT_KEY = 'notifications_opted_out'

let serviceWorkerMessageListenerRegistered = false

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
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
  isIOS: boolean
  isStandalone: boolean
} {
  return {
    supported: canUsePushNotifications(),
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
    optedOut: localStorage.getItem(NOTIFICATION_OPT_OUT_KEY) === 'true',
    isIOS: isIOS(),
    isStandalone: isStandalone(),
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
  publicKey: Uint8Array,
) {
  const currentKey = subscription?.options.applicationServerKey
  if (!currentKey) return false

  const current = new Uint8Array(currentKey)
  if (current.byteLength !== publicKey.byteLength) return false

  return current.every((value, index) => value === publicKey[index])
}

function registerForegroundMessageListener() {
  if (serviceWorkerMessageListenerRegistered) return

  navigator.serviceWorker.addEventListener('message', (event) => {
    const payload = event.data as
      | {
          type?: string
          url?: string
          notification?: {
            title?: string
            body?: string
            data?: {
              type?: string
              companyId?: string
              formId?: string
              messageId?: string
            }
          }
          data?: Record<string, string>
        }
      | undefined

    if (!payload) return

    if (payload.type === 'NAVIGATE') {
      const pushType = payload.data?.type
      let targetPanel = ''
      if (pushType === 'new_company') {
        targetPanel = 'companies'
      } else if (pushType === 'form_assignment' || pushType === 'new_form') {
        targetPanel = 'forms'
      } else if (pushType === 'message_mention' || pushType === 'announcement' || pushType === 'chat_message') {
        targetPanel = 'chat'
      } else if (pushType && pushType.startsWith('profile_')) {
        targetPanel = 'profile'
      }

      if (targetPanel) {
        window.dispatchEvent(
          new CustomEvent('navigate-to-panel', {
            detail: { panel: targetPanel },
          })
        )
      }
      return
    }

    if (payload.type !== 'PUSH_NOTIFICATION') return

    const pushType = payload.notification?.data?.type
    let targetPanel = ''
    if (pushType === 'new_company') {
      targetPanel = 'companies'
    } else if (pushType === 'form_assignment' || pushType === 'new_form') {
      targetPanel = 'forms'
    } else if (pushType === 'message_mention' || pushType === 'announcement' || pushType === 'chat_message') {
      targetPanel = 'chat'
    } else if (pushType && pushType.startsWith('profile_')) {
      targetPanel = 'profile'
    }

    toast(payload.notification?.title ?? 'New notification', {
      description: payload.notification?.body ?? '',
      action: targetPanel
        ? {
            label: 'View',
            onClick: () => {
              window.dispatchEvent(
                new CustomEvent('navigate-to-panel', {
                  detail: { panel: targetPanel },
                })
              )
            },
          }
        : undefined,
    })
  })

  serviceWorkerMessageListenerRegistered = true
}

export async function registerNotifications(repo: PlacementRepository): Promise<void> {
  localStorage.removeItem(NOTIFICATION_OPT_OUT_KEY)
  if (!canUsePushNotifications()) return

  const { configured, publicKey } = await repo.getNotificationPublicKey()
  if (!configured || !publicKey) return

  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
  }

  const registration = await navigator.serviceWorker.ready
  const applicationServerKey = urlBase64ToUint8Array(publicKey)
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
      applicationServerKey: applicationServerKey as BufferSource,
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
