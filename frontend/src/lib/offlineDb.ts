export interface QueuedRequest {
  id?: number
  url: string
  method: string
  headers: Record<string, string>
  body: any
  isFormData: boolean
  createdAt: number
}

const DB_NAME = 'PlacementOfflineDB'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('syncCache')) {
        db.createObjectStore('syncCache', { keyPath: 'key' })
      }
    }
  })
}

export async function saveTokenAndUrl(token: string | null, apiBaseUrl: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('config', 'readwrite')
      const store = tx.objectStore('config')
      const request = store.put({ key: 'auth', token, apiBaseUrl })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Failed to save config to IndexedDB:', err)
  }
}

export async function getConfig(): Promise<{ token: string | null; apiBaseUrl: string }> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('config', 'readonly')
      const store = tx.objectStore('config')
      const request = store.get('auth')
      request.onsuccess = () => {
        if (request.result) {
          resolve({
            token: request.result.token ?? null,
            apiBaseUrl: request.result.apiBaseUrl ?? '',
          })
        } else {
          resolve({ token: null, apiBaseUrl: '' })
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Failed to read config from IndexedDB:', err)
    return { token: null, apiBaseUrl: '' }
  }
}

export async function queueRequest(req: Omit<QueuedRequest, 'id'>): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('requests', 'readwrite')
      const store = tx.objectStore('requests')
      const request = store.add(req)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Failed to queue offline request:', err)
  }
}

export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('requests', 'readonly')
      const store = tx.objectStore('requests')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Failed to get queued requests:', err)
    return []
  }
}

export async function deleteQueuedRequest(id: number): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('requests', 'readwrite')
      const store = tx.objectStore('requests')
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Failed to delete queued request:', err)
  }
}

export async function getCachedIds(key: string): Promise<number[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncCache', 'readonly')
      const store = tx.objectStore('syncCache')
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result?.ids || [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Failed to read syncCache IDs:', err)
    return []
  }
}

export async function saveCachedIds(key: string, ids: number[]): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncCache', 'readwrite')
      const store = tx.objectStore('syncCache')
      const request = store.put({ key, ids })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Failed to save syncCache IDs:', err)
  }
}

export async function clearOfflineData(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['requests', 'syncCache'], 'readwrite')
      tx.objectStore('requests').clear()
      tx.objectStore('syncCache').clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn('Failed to clear offline data from IndexedDB:', err)
  }
}

