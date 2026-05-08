/** Same defaults as Flutter `app_config.dart` (web → localhost API). */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

/** Google OAuth Web Client ID — override with `VITE_GOOGLE_CLIENT_ID` in `.env`. */
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  '607953976042-9kpliq3pc8s3qcalg594dptolmkuvqkd.apps.googleusercontent.com'

export const AUTH_TOKEN_KEY = 'auth_token'
