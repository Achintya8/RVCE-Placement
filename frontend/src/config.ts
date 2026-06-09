/** Same defaults as Flutter `app_config.dart` (web → localhost API). */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

/** Google OAuth Web Client ID — override with `VITE_GOOGLE_CLIENT_ID` in `.env`. */
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  '607953976042-9kpliq3pc8s3qcalg594dptolmkuvqkd.apps.googleusercontent.com'

export const AUTH_TOKEN_KEY = 'auth_token'

export function resolveBackendUrl(url: string | null | undefined): string {
  if (!url) return ''
  
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url
  }

  // Rewrite absolute localhost/127.0.0.1 URLs to use the current client hostname (preserving the port)
  if (url.startsWith('http')) {
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
        parsedUrl.hostname = window.location.hostname
        return parsedUrl.toString()
      }
    } catch {
      // ignore
    }
  }

  // Prepend correct backend host for relative URLs
  if (url.startsWith('/')) {
    let apiOrigin = ''
    if (API_BASE_URL.startsWith('http')) {
      try {
        const parsed = new URL(API_BASE_URL)
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
          parsed.hostname = window.location.hostname
        }
        apiOrigin = parsed.origin
      } catch {
        apiOrigin = ''
      }
    } else {
      apiOrigin = window.location.origin
    }
    return `${apiOrigin}${url}`
  }

  return url
}
