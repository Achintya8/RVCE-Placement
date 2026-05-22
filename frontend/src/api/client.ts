import { saveTokenAndUrl, queueRequest } from '../lib/offlineDb'

interface ValidationErrorDetail {
  path?: string[] | string
  message?: string
  code?: string
  format?: string
  pattern?: string
  type?: string
  minimum?: number | string
  maximum?: number | string
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      !navigator.onLine ||
      error instanceof TypeError ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('network connection')
    )
  }
  return !navigator.onLine
}

async function registerSyncTag() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready
      const regWithSync = reg as unknown as {
        sync: {
          register: (tag: string) => Promise<void>
        }
      }
      await regWithSync.sync.register('sync-api-requests')
    } catch (e) {
      console.warn('Background sync registration failed:', e)
    }
  }
}

type SerializedFormEntry = 
  | { key: string; value: File; isFile: true; fileName: string; fileType: string }
  | { key: string; value: string; isFile: false }

async function serializeFormData(form: FormData) {
  const entries: SerializedFormEntry[] = []
  for (const [key, value] of form.entries()) {
    if (value instanceof File) {
      entries.push({
        key,
        value,
        isFile: true,
        fileName: value.name,
        fileType: value.type
      })
    } else {
      entries.push({
        key,
        value: String(value),
        isFile: false
      })
    }
  }
  return entries
}

export class ApiClientError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.details = details
  }
}

async function readError(res: Response): Promise<Error> {
  try {
    const data = (await res.json()) as { message?: string; details?: unknown }
    if (data?.message) {
      let msg = data.message
      if (msg.trim().startsWith('[') && msg.trim().endsWith(']')) {
        try {
          const parsed = JSON.parse(msg)
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && typeof parsed[0] === 'object') {
            const fieldLabels: Record<string, string> = {
              name: 'Full Name',
              usn: 'USN',
              collegeEmailId: 'College Email',
              personalEmailId: 'Personal Email',
              phoneNumber: 'Phone Number',
              aadhar: 'Aadhar Number',
              linkedIn: 'LinkedIn URL',
              gitHub: 'GitHub URL',
              ugCgpa: 'UG CGPA',
              tenthMarks: '10th Aggregate (%)',
              twelfthMarks: '12th Aggregate (%)',
              firstSemSgpa: '1st Sem SGPA',
              username: 'Username',
              password: 'Password',
              title: 'Title',
              type: 'Type',
              companyId: 'Company ID',
              questionText: 'Question Text',
              fieldType: 'Field Type',
              options: 'Options',
              minCgpa: 'Minimum CGPA',
              package: 'Package',
              stipend: 'Stipend',
              testDate: 'Test Date',
              interviewDate: 'Interview Date',
              deadline: 'Deadline',
              status: 'Status',
              reason: 'Reason',
              messageText: 'Message Text',
            }

            const formatted = parsed.map((err: ValidationErrorDetail) => {
              const path = Array.isArray(err.path) ? err.path.join('.') : ''
              const label = fieldLabels[path] || (typeof path === 'string' ? path : '') || 'Field'
              let errMessage = err.message || 'Invalid value'

              if (err.code === 'invalid_format' && err.format === 'email') {
                errMessage = 'Invalid email address'
              } else if (err.code === 'invalid_format' && err.format === 'regex' && err.pattern === '/^\\d+$/') {
                errMessage = 'Must contain only digits'
              } else if (err.code === 'too_small' && err.type === 'string') {
                errMessage = `Must be at least ${err.minimum} characters`
              } else if (err.code === 'too_big' && err.type === 'string') {
                errMessage = `Must be at most ${err.maximum} characters`
              } else if (err.message && err.message.startsWith('Invalid string: must match pattern')) {
                errMessage = 'Invalid format'
              }
              return `${label}: ${errMessage}`
            })
            msg = formatted.join('\n')
          }
        } catch {
          // ignore
        }
      }
      
      let details = data.details
      if (!details) {
        try {
          const parsed = JSON.parse(data.message || '')
          if (Array.isArray(parsed)) {
            details = parsed
          }
        } catch {
          // ignore
        }
      }

      return new ApiClientError(msg, res.status, details)
    }
  } catch {
    /* ignore */
  }
  return new ApiClientError(res.statusText || 'Request failed.', res.status)
}

export class ApiClient {
  private readonly baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    void saveTokenAndUrl(this.token, this.baseUrl)
  }

  setToken(token: string | null) {
    this.token = token
    void saveTokenAndUrl(token, this.baseUrl)
  }

  private authHeaders(): HeadersInit {
    const h: Record<string, string> = {}
    if (this.token) h.Authorization = `Bearer ${this.token}`
    return h
  }

  private getFullUrl(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`
    return `${this.baseUrl}${p}`
  }

  async getJson(path: string): Promise<Record<string, unknown>> {
    const res = await fetch(this.getFullUrl(path), {
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
    })
    if (!res.ok) throw await readError(res)
    return (await res.json()) as Record<string, unknown>
  }

  async getList(path: string): Promise<unknown[]> {
    const res = await fetch(this.getFullUrl(path), {
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
    })
    if (!res.ok) throw await readError(res)
    const data = await res.json()
    return Array.isArray(data) ? data : []
  }

  async postJson(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const res = await fetch(this.getFullUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw await readError(res)
      return (await res.json()) as Record<string, unknown>
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        await queueRequest({
          url: path,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(this.authHeaders() as Record<string, string>) },
          body,
          isFormData: false,
          createdAt: Date.now()
        })
        await registerSyncTag()
        throw new ApiClientError('You are offline. Your submission has been queued and will be sent automatically when you reconnect.', 0)
      }
      throw err
    }
  }

  async putJson(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const res = await fetch(this.getFullUrl(path), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw await readError(res)
      return (await res.json()) as Record<string, unknown>
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        await queueRequest({
          url: path,
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(this.authHeaders() as Record<string, string>) },
          body,
          isFormData: false,
          createdAt: Date.now()
        })
        await registerSyncTag()
        throw new ApiClientError('You are offline. Your edits have been queued and will sync automatically when you reconnect.', 0)
      }
      throw err
    }
  }

  async postFormData(
    path: string,
    form: FormData,
  ): Promise<Record<string, unknown>> {
    try {
      const res = await fetch(this.getFullUrl(path), {
        method: 'POST',
        headers: this.authHeaders(),
        body: form,
      })
      if (!res.ok) throw await readError(res)
      return (await res.json()) as Record<string, unknown>
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const serialized = await serializeFormData(form)
        await queueRequest({
          url: path,
          method: 'POST',
          headers: this.authHeaders() as Record<string, string>,
          body: serialized,
          isFormData: true,
          createdAt: Date.now()
        })
        await registerSyncTag()
        throw new ApiClientError('You are offline. Your file upload has been queued and will run automatically when you reconnect.', 0)
      }
      throw err
    }
  }

  async getBytes(path: string): Promise<Uint8Array> {
    const res = await fetch(this.getFullUrl(path), {
      headers: this.authHeaders(),
    })
    if (!res.ok) throw await readError(res)
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  }

  async delete(path: string): Promise<void> {
    try {
      const res = await fetch(this.getFullUrl(path), {
        method: 'DELETE',
        headers: this.authHeaders(),
      })
      if (!res.ok) throw await readError(res)
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        await queueRequest({
          url: path,
          method: 'DELETE',
          headers: this.authHeaders() as Record<string, string>,
          body: null,
          isFormData: false,
          createdAt: Date.now()
        })
        await registerSyncTag()
        throw new ApiClientError('You are offline. Your deletion request has been queued and will execute automatically when you reconnect.', 0)
      }
      throw err
    }
  }
}
