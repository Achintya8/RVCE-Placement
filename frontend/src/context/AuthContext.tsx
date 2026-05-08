import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiClient } from '../api/client'
import { PlacementRepository } from '../api/placementRepository'
import type { Session } from '../api/types'
import { API_BASE_URL, AUTH_TOKEN_KEY } from '../config'

export type AuthStatus =
  | 'checking'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'

type AuthState = {
  status: AuthStatus
  session: Session | null
  errorMessage: string | null
}

type AuthContextValue = AuthState & {
  repo: PlacementRepository
  client: ApiClient
  restoreSession: () => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  loginWithSpc: (username: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new ApiClient(API_BASE_URL), [])
  const repo = useMemo(() => new PlacementRepository(client), [client])

  const [state, setState] = useState<AuthState>({
    status: 'checking',
    session: null,
    errorMessage: null,
  })

  const persistSession = useCallback(
    (session: Session) => {
      localStorage.setItem(AUTH_TOKEN_KEY, session.token)
      client.setToken(session.token)
      setState({
        status: 'authenticated',
        session,
        errorMessage: null,
      })
    },
    [client],
  )

  const restoreSession = useCallback(async () => {
    setState((s) => ({ ...s, status: 'checking', errorMessage: null }))
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      client.setToken(null)
      setState({ status: 'unauthenticated', session: null, errorMessage: null })
      return
    }
    client.setToken(token)
    try {
      const session = await repo.restoreSession()
      localStorage.setItem(AUTH_TOKEN_KEY, session.token)
      client.setToken(session.token)
      setState({
        status: 'authenticated',
        session,
        errorMessage: null,
      })
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      client.setToken(null)
      setState({
        status: 'unauthenticated',
        session: null,
        errorMessage: null,
      })
    }
  }, [client, repo])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      setState((s) => ({ ...s, status: 'loading', errorMessage: null }))
      try {
        const session = await repo.googleLogin(idToken)
        persistSession(session)
      } catch (e) {
        client.setToken(null)
        localStorage.removeItem(AUTH_TOKEN_KEY)
        setState({
          status: 'unauthenticated',
          session: null,
          errorMessage: e instanceof Error ? e.message : String(e),
        })
      }
    },
    [client, persistSession, repo],
  )

  const loginWithSpc = useCallback(
    async (username: string, password: string) => {
      setState((s) => ({ ...s, status: 'loading', errorMessage: null }))
      try {
        const session = await repo.spcLogin(username, password)
        persistSession(session)
      } catch (e) {
        client.setToken(null)
        localStorage.removeItem(AUTH_TOKEN_KEY)
        setState({
          status: 'unauthenticated',
          session: null,
          errorMessage: e instanceof Error ? e.message : String(e),
        })
      }
    },
    [client, persistSession, repo],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    client.setToken(null)
    setState({ status: 'unauthenticated', session: null, errorMessage: null })
  }, [client])

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, errorMessage: null }))
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      repo,
      client,
      restoreSession,
      loginWithGoogle,
      loginWithSpc,
      logout,
      clearError,
    }),
    [
      state,
      repo,
      client,
      restoreSession,
      loginWithGoogle,
      loginWithSpc,
      logout,
      clearError,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
