/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string
    revision?: string
  }>
}

clientsClaim()
self.skipWaiting()

precacheAndRoute(self.__WB_MANIFEST)

// Firebase background notifications (FCM)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Only initialize if config is present (prevents SW crash in dev/envs)
if (
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
) {
  const app = initializeApp(firebaseConfig)
  const messaging = getMessaging(app)

  onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? 'New notification'
    const body = payload.notification?.body ?? ''
    const data = payload.data ?? {}

    self.registration.showNotification(title, {
      body,
      data,
    })
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = (event.notification.data ?? {}) as Record<string, string>

  const type = data.type || ''
  let url = '/'
  if (type === 'new_company' && data.companyId) url = `/companies/${data.companyId}`
  else if ((type === 'form_assignment' || type === 'new_form') && data.formId)
    url = `/forms/${data.formId}`
  else if (
    (type === 'message_mention' || type === 'announcement') &&
    data.messageId
  )
    url = `/messages`

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of allClients) {
        if ('focus' in client) {
          client.navigate(url)
          await client.focus()
          return
        }
      }

      await self.clients.openWindow(url)
    })(),
  )
})

