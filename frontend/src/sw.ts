/// <reference lib="webworker" />
// ============================================================================
// MCA Placement Management System - Service Worker (sw.ts)
// Built with Workbox (injectManifest strategy)
// Responsibilities:
//  1. App Shell Precaching & Offline SPA Fallback
//  2. API Caching Strategies (Network-First for JSON, Cache-First for media)
//  3. Background Sync (Offline mutation queue replay via IndexedDB)
//  4. Periodic Sync (Background checks for new placement drives)
//  5. Web Push Notifications (Smart WhatsApp-style message aggregation)
// ============================================================================

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

// Immediately claim client tabs without waiting for reload
clientsClaim()
self.skipWaiting()

// ── 1. LIFECYCLE: Cache Activation & Cleanup ──────────────────────────────────
// When a new SW version activates, purge stale caches to prevent broken assets.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.delete('api-file-cache'),
      caches.delete('api-cache'),
      caches.delete('api-resume-cache'),
    ]).then(() => {
      console.log('Cleared old caches to resolve broken assets')
    })
  )
})

// Precache static assets compiled by Vite (HTML, JS, CSS, icons)
precacheAndRoute(self.__WB_MANIFEST)

// ── 2. SPA NAVIGATION ROUTE ──────────────────────────────────────────────────
// Serve index.html for all client page transitions while offline,
// explicitly excluding API endpoints from shell caching.
try {
  registerRoute(
    new NavigationRoute(
      createHandlerBoundToURL('index.html'),
      {
        denylist: [/^\/api/],
      }
    )
  )
} catch (error) {
  console.warn('NavigationRoute not registered (expected in dev mode):', error)
}

// ── 3. WORKBOX CACHING STRATEGIES ──────────────────────────────────────────

// A. Network-First for API GET Requests
// Fetches fresh data from backend. If network drops or takes >5 seconds, falls back to cached JSON.
// Note: Binary Excel exports (/export) are excluded so users always get fresh spreadsheets.
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
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days TTL
      }),
    ],
  })
)

// B. Network-First for Resumes
// Allows students to view cached resumes when offline, but attempts to fetch updated versions first.
registerRoute(
  ({ url }) => {
    const isResume = url.pathname.includes('/resumes/');
    return isResume;
  },
  new NetworkFirst({
    cacheName: 'api-resume-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days TTL
      }),
    ],
  })
)

// C. Cache-First for Profile Pictures & Media Attachments
// Static binary images have immutable URLs; served instantly from cache for fastest render speed.
registerRoute(
  ({ url }) => {
    const isStorage =
      url.pathname.includes('/attachments/') ||
      url.pathname.includes('/profile-pictures/');
    return isStorage;
  },
  new CacheFirst({
    cacheName: 'api-file-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days TTL
      }),
    ],
  })
)

import { getConfig, getQueuedRequests, deleteQueuedRequest, getCachedIds, saveCachedIds } from './lib/offlineDb'

// ── 4. OFFLINE MUTATION BACKGROUND SYNC ───────────────────────────────────────
// Broadcasts to open client browser tabs when an offline request is replayed.
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

      // Suppress system push popups if the student is currently focused inside the app tab
      const hasFocusedClient = windowClients.some((client) => client.focused)
      if (hasFocusedClient) return

      // ── 7. CHAT MESSAGE NOTIFICATION GROUPING (WhatsApp-style) ─────────────
      // Instead of spamming separate notifications for every chat message,
      // collapse multiple unread messages into a single stacked notification card.
      if (data.type === 'chat_message' || data.type === 'message_mention') {
        // Step A: Check if an active chat notification already exists on screen
        const activeNotifications = await self.registration.getNotifications({ tag: 'chat_notification' })

        let unreadMessages: Array<{ senderName: string; text: string; attachmentUrl?: string }> = []

        // Step B: If an existing notification is found, recover previous unread messages from its payload
        if (activeNotifications.length > 0) {
          const oldNotification = activeNotifications[0]
          if (oldNotification.data && Array.isArray(oldNotification.data.unreadMessages)) {
            unreadMessages = [...oldNotification.data.unreadMessages]
          }
        }

        // Step C: Append the newly received message to the accumulated list
        unreadMessages.push({
          senderName: title,
          text: notification.body ?? '',
          attachmentUrl: data.attachmentUrl || '',
        })

        // Step D: Format notification title and body based on sender variety
        let displayTitle: string
        let displayBody: string

        // Detect how many distinct people have sent unread messages
        const uniqueSenders = new Set(unreadMessages.map(m => m.senderName))

        if (uniqueSenders.size === 1) {
          // Scenario 1: Messages from a single person (e.g. "John Doe")
          displayTitle = title
          if (unreadMessages.length === 1) {
            displayBody = unreadMessages[0].text
          } else {
            // E.g. "Meeting at 4pm (+2 unread)"
            displayBody = `${unreadMessages[unreadMessages.length - 1].text} (+${unreadMessages.length - 1} unread)`
          }
        } else {
          // Scenario 2: Multiple senders across class group chat
          // E.g. "4 new messages" -> preview last 3 senders to prevent UI clutter
          displayTitle = `${unreadMessages.length} new messages`
          displayBody = unreadMessages
            .slice(-3)
            .map(m => `${m.senderName}: ${m.text}`)
            .join('\n')
          if (unreadMessages.length > 3) {
            displayBody += `\n(+${unreadMessages.length - 3} more)`
          }
        }

        // Step E: Construct Web Notification options
        // Using tag: 'chat_notification' instructs the OS to replace/update the existing card in-place
        const options: any = {
          body: displayBody,
          icon: '/pwa-192x192.png',
          badge: '/pwa-64x64.png',
          tag: 'chat_notification',
          data: {
            ...data,
            unreadMessages, // Store full unread list for subsequent stackings
          },
        }

        // Step F: If the latest message has an image attachment, attach large banner preview
        const latestMsg = unreadMessages[unreadMessages.length - 1]
        if (latestMsg.attachmentUrl) {
          const isImage = /\.(jpeg|jpg|gif|png|webp|svg)/i.test(latestMsg.attachmentUrl)
          if (isImage) {
            options.image = latestMsg.attachmentUrl
          }
        }

        await self.registration.showNotification(displayTitle, options)
      } else {
        // Standard notification (for Company Drives, Forms, Verification status, etc.)
        await self.registration.showNotification(title, {
          body: notification.body ?? '',
          icon: '/pwa-192x192.png',
          badge: '/pwa-64x64.png',
          data,
        })
      }
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
