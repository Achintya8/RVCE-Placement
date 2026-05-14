import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ApiClient } from '../api/client'
import { PlacementRepository } from '../api/placementRepository'
import type { Session } from '../api/types'
import { API_BASE_URL, AUTH_TOKEN_KEY } from '../config'
import { registerNotificationsSafely } from '../notifications/registerNotifications'

export type AuthStatus = 'checking' | 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  session: Session | null
  errorMessage: string | null
  
  // Instance helpers
  client: ApiClient
  repo: PlacementRepository

  // Actions
  restoreSession: () => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

// Initialize instances once outside the store
const client = new ApiClient(API_BASE_URL)
const repo = new PlacementRepository(client)

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: 'checking',
      session: null,
      errorMessage: null,
      client,
      repo,

      restoreSession: async () => {
        set({ status: 'checking', errorMessage: null })
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        
        if (!token) {
          client.setToken(null)
          set({ status: 'unauthenticated', session: null })
          return
        }

        client.setToken(token)
        try {
          const session = await repo.restoreSession()
          client.setToken(session.token)
          localStorage.setItem(AUTH_TOKEN_KEY, session.token)
          set({ status: 'authenticated', session, errorMessage: null })
          await registerNotificationsSafely(repo)
        } catch {
          localStorage.removeItem(AUTH_TOKEN_KEY)
          client.setToken(null)
          set({ status: 'unauthenticated', session: null })
        }
      },

      loginWithGoogle: async (idToken: string) => {
        set({ status: 'loading', errorMessage: null })
        try {
          const session = await repo.googleLogin(idToken)
          client.setToken(session.token)
          localStorage.setItem(AUTH_TOKEN_KEY, session.token)
          set({ status: 'authenticated', session, errorMessage: null })
          await registerNotificationsSafely(repo)
        } catch (e) {
          set({ 
            status: 'unauthenticated', 
            errorMessage: e instanceof Error ? e.message : String(e) 
          })
        }
      },

      logout: () => {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        client.setToken(null)
        set({ status: 'unauthenticated', session: null, errorMessage: null })
      },

      clearError: () => set({ errorMessage: null }),
    }),
    {
      name: 'rvce-auth-storage',
      // We only want to persist the session data, not status or instances
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => {
        // Sync token with client on load
        if (state?.session?.token) {
          client.setToken(state.session.token)
        }
      }
    }
  )
)

/** 
 * Backward compatibility hook. 
 * Eventually, components should use useAuthStore directly for better performance.
 */
export function useAuth() {
  return useAuthStore()
}
