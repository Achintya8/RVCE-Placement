/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string
    revision?: string
  }>
}

type PushNotificationPayload = {
  notification?: {
    title?: string
    body?: string
    data?: Record<string, string>
  }
}

clientsClaim()
self.skipWaiting()

precacheAndRoute(self.__WB_MANIFEST)

// Register a navigation route to serve index.html for all offline navigation requests (SPAs)
// Except for API requests which should bypass the service worker's shell caching
registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL('index.html'),
    {
      denylist: [/^\/api/],
    }
  )
)

// Cache API GET requests with Network-First strategy
registerRoute(
  ({ url, request }) => {
    const isApi = url.pathname.startsWith('/api') || url.pathname.includes('/api/');
    const isGet = request.method === 'GET';
    const isExport = url.pathname.endsWith('/export');
    return isApi && isGet && !isExport;
  },
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
)

// Cache file storage (resumes, profile pictures, attachments) with Cache-First strategy
registerRoute(
  ({ url }) => {
    const isStorage = 
      url.pathname.includes('/resumes/') || 
      url.pathname.includes('/attachments/') || 
      url.pathname.includes('/profile-pictures/');
    return isStorage;
  },
  new CacheFirst({
    cacheName: 'api-file-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
)

import { getConfig, getQueuedRequests, deleteQueuedRequest, getCachedIds, saveCachedIds } from './lib/offlineDb'

// REPLAY OF QUEUED REQUESTS
async function notifyClientsOfSync(url: string, method: string) {
  const clientsList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  for (const client of clientsList) {
    client.postMessage({
      type: 'OFFLINE_SYNC_COMPLETE',
      url,
      method,
    })
  }
}

async function replayQueuedRequests(): Promise<void> {
  const config = await getConfig()
  if (!config.apiBaseUrl) {
    console.warn('API base URL not found in config, aborting sync replay.')
    return
  }

  const queued = await getQueuedRequests()
  if (queued.length === 0) return

  for (const req of queued) {
    try {
      const url = `${config.apiBaseUrl}${req.url}`
      const headers = { ...req.headers }
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`
      }

      let body: any
      if (req.isFormData) {
        const formData = new FormData()
        for (const entry of req.body) {
          if (entry.isFile) {
            const file = new File([entry.value], entry.fileName, { type: entry.fileType })
            formData.append(entry.key, file)
          } else {
            formData.append(entry.key, entry.value)
          }
        }
        body = formData
      } else if (req.body) {
        body = JSON.stringify(req.body)
      }

      const res = await fetch(url, {
        method: req.method,
        headers,
        body,
      })

      if (res.ok) {
        await deleteQueuedRequest(req.id!)
        await notifyClientsOfSync(req.url, req.method)
      } else if (res.status >= 400 && res.status < 500) {
        await deleteQueuedRequest(req.id!)
      } else {
        throw new Error(`Request failed with status ${res.status}`)
      }
    } catch (err) {
      console.error('Failed to replay queued request:', req, err)
      throw err
    }
  }
}

// PERIODIC PORTAL UPDATE
async function fetchNewCompaniesAndForms(): Promise<void> {
  const config = await getConfig()
  if (!config.apiBaseUrl) return

  const headers: Record<string, string> = {}
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`
  }

  // 1. Fetch Companies
  try {
    const res = await fetch(`${config.apiBaseUrl}/companies`, { headers })
    if (res.ok) {
      const companies = await res.json()
      if (Array.isArray(companies)) {
        const previousIds = await getCachedIds('companies')
        const currentIds = companies.map((c: any) => Number(c.id)).filter(id => !Number.isNaN(id))
        const newCompanies = companies.filter((c: any) => !previousIds.includes(Number(c.id)) && previousIds.length > 0)
        await saveCachedIds('companies', currentIds)

        if (newCompanies.length > 0) {
          const title = newCompanies.length === 1 
            ? `New Opportunity: ${newCompanies[0].name}` 
            : `${newCompanies.length} New Placements Available!`
          const body = newCompanies.length === 1
            ? `Package: ${newCompanies[0].package} | Cutoff: ${newCompanies[0].minCgpa} CGPA`
            : `Check the portal for new registered companies.`

          await self.registration.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-64x64.png',
            data: { type: 'new_company' }
          })
        }
      }
    }
  } catch (err) {
    console.error('Periodic sync fetch companies failed:', err)
  }

  // 2. Fetch Assigned Forms
  try {
    const res = await fetch(`${config.apiBaseUrl}/forms/assigned/me`, { headers })
    if (res.ok) {
      const forms = await res.json()
      if (Array.isArray(forms)) {
        const previousIds = await getCachedIds('forms')
        const currentIds = forms.map((f: any) => Number(f.id)).filter(id => !Number.isNaN(id))
        const newForms = forms.filter((f: any) => !previousIds.includes(Number(f.id)) && previousIds.length > 0)
        await saveCachedIds('forms', currentIds)

        if (newForms.length > 0) {
          const title = newForms.length === 1 
            ? `New Form Assigned` 
            : `${newForms.length} New Forms Assigned`
          const body = newForms.length === 1
            ? `Please fill out: "${newForms[0].title}"`
            : `Check the portal for new assigned forms.`

          await self.registration.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-64x64.png',
            data: { type: 'new_form' }
          })
        }
      }
    }
  } catch (err) {
    console.error('Periodic sync fetch forms failed:', err)
  }
}

self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-api-requests') {
    event.waitUntil(replayQueuedRequests())
  }
})

self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'periodic-portal-update') {
    event.waitUntil(fetchNewCompaniesAndForms())
  }
})

function getNavigationUrl(data: Record<string, string> = {}) {
  const type = data.type || ''
  const params = new URLSearchParams()

  if (type === 'new_company' && data.companyId) {
    params.set('panel', 'companies')
    params.set('companyId', data.companyId)
    return `/?${params.toString()}`
  }

  if ((type === 'form_assignment' || type === 'new_form') && data.formId) {
    params.set('panel', 'forms')
    params.set('formId', data.formId)
    return `/?${params.toString()}`
  }

  if (
    type === 'message_mention' ||
    type === 'announcement' ||
    type === 'chat_message'
  ) {
    params.set('panel', 'chat')
    if (data.messageId) params.set('messageId', data.messageId)
    return `/?${params.toString()}`
  }

  if (type.startsWith('profile_')) {
    params.set('panel', 'profile')
    return `/?${params.toString()}`
  }

  return '/'
}

function readPushPayload(event: PushEvent): PushNotificationPayload {
  try {
    return (event.data?.json() ?? {}) as PushNotificationPayload
  } catch {
    return {
      notification: {
        title: 'New notification',
        body: event.data?.text() ?? '',
      },
    }
  }
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event)
  const notification = payload.notification ?? {}
  const title = notification.title ?? 'New notification'
  const data = notification.data ?? {}

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      windowClients.forEach((client) => {
        client.postMessage({
          type: 'PUSH_NOTIFICATION',
          notification: {
            title,
            body: notification.body ?? '',
            data,
          },
        })
      })

      const hasFocusedClient = windowClients.some((client) => client.focused)
      if (hasFocusedClient) return

      await self.registration.showNotification(title, {
        body: notification.body ?? '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-64x64.png',
        data,
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = getNavigationUrl(
    (event.notification.data ?? {}) as Record<string, string>,
  )

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of allClients) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NAVIGATE',
            url,
            data: event.notification.data,
          })
          await client.focus()
          return
        }
      }

      await self.clients.openWindow(url)
    })(),
  )
})
