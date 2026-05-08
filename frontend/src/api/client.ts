async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string }
    if (data?.message) return data.message
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed.'
}

export class ApiClient {
  private readonly baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string | null) {
    this.token = token
  }

  private authHeaders(): HeadersInit {
    const h: Record<string, string> = {}
    if (this.token) h.Authorization = `Bearer ${this.token}`
    return h
  }

  async getJson(path: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
    })
    if (!res.ok) throw new Error(await readErrorMessage(res))
    return (await res.json()) as Record<string, unknown>
  }

  async getList(path: string): Promise<unknown[]> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
    })
    if (!res.ok) throw new Error(await readErrorMessage(res))
    const data = await res.json()
    return Array.isArray(data) ? data : []
  }

  async postJson(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await readErrorMessage(res))
    return (await res.json()) as Record<string, unknown>
  }

  async putJson(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await readErrorMessage(res))
    return (await res.json()) as Record<string, unknown>
  }

  async postFormData(
    path: string,
    form: FormData,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: form,
    })
    if (!res.ok) throw new Error(await readErrorMessage(res))
    return (await res.json()) as Record<string, unknown>
  }

  async getBytes(path: string): Promise<Uint8Array> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
    })
    if (!res.ok) throw new Error(await readErrorMessage(res))
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  }
}
