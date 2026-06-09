/** Same defaults as Flutter `app_config.dart` (web → localhost API). */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? 'https://rvce-placement.onrender.com/api' : 'http://localhost:4000/api')

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

  // 1. Determine the API Origin from API_BASE_URL
  let apiOrigin = ''
  if (API_BASE_URL.startsWith('http')) {
    try {
      const parsedApi = new URL(API_BASE_URL)
      // If API_BASE_URL is localhost/127.0.0.1, but the user is accessing via an IP address (e.g. on mobile),
      // we dynamically swap the API hostname to match the current location hostname.
      if (parsedApi.hostname === 'localhost' || parsedApi.hostname === '127.0.0.1') {
        parsedApi.hostname = window.location.hostname
      }
      apiOrigin = parsedApi.origin
    } catch {
      apiOrigin = ''
    }
  } else {
    // Relative, same origin as frontend
    apiOrigin = window.location.origin
  }

  // 2. Rewrite localhost/127.0.0.1 in the URL to the resolved apiOrigin
  if (url.startsWith('http')) {
    try {
      const parsedUrl = new URL(url)
      if ((parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') && apiOrigin) {
        const targetOrigin = new URL(apiOrigin)
        parsedUrl.protocol = targetOrigin.protocol
        parsedUrl.hostname = targetOrigin.hostname
        parsedUrl.port = targetOrigin.port // Explicitly copy port (clears :4000 if target has no port)
        return parsedUrl.toString()
      }
    } catch {
      // ignore
    }
  }

  // 3. Prepend backend origin to relative URLs
  if (url.startsWith('/')) {
    return `${apiOrigin}${url}`
  }

  return url
}
