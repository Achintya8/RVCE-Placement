import { initializeApp } from 'firebase/app'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'
import { FIREBASE_CONFIG } from '../config'

function isConfigPresent(): boolean {
  return Boolean(
    FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.authDomain &&
      FIREBASE_CONFIG.projectId &&
      FIREBASE_CONFIG.messagingSenderId &&
      FIREBASE_CONFIG.appId,
  )
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (!isConfigPresent()) return null
  if (!(await isSupported())) return null
  const app = initializeApp(FIREBASE_CONFIG)
  return getMessaging(app)
}

