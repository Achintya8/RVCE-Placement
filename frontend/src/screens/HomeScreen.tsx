import { GoogleLogin } from '@react-oauth/google'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
export default function HomeScreen() {
  const { loginWithSpc, loginWithGoogle, errorMessage, clearError, status } =
    useAuth()
  const { showToast } = useToast()
  const [isSpc, setIsSpc] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (errorMessage) {
      showToast(errorMessage)
      clearError()
    }
  }, [errorMessage, clearError, showToast])

  const isBusy = status === 'loading'

  return (
    <div className="plc-login-page">
      <div
        className="plc-decor-circle"
        style={{ width: 260, height: 260, top: -100, right: -70 }}
      />
      <div
        className="plc-decor-circle"
        style={{ width: 240, height: 240, bottom: -90, left: -50 }}
      />

      <div className="plc-login-inner">
        <div className="plc-login-stack">
          <div style={{ textAlign: 'center' }}>
            <div className="plc-header-badge">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
              </svg>
              <span>RV College of Engineering</span>
            </div>
            <h1 className="plc-login-title">Placement</h1>
          </div>

          <div className="plc-login-card">
            <div className="plc-role-toggle">
              <button
                type="button"
                className={!isSpc ? 'is-active' : ''}
                onClick={() => setIsSpc(false)}
              >
                Student
              </button>
              <button
                type="button"
                className={isSpc ? 'is-active' : ''}
                onClick={() => setIsSpc(true)}
              >
                SPC
              </button>
            </div>

            {!isSpc ? (
              <>
                <p className="plc-login-hint">
                  Sign in with your RVCE Google account.
                </p>
                <div className="plc-google-wrap">
                  <GoogleLogin
                    onSuccess={(cred) => {
                      if (cred.credential) void loginWithGoogle(cred.credential)
                    }}
                    onError={() => showToast('Google sign-in failed.')}
                    useOneTap={false}
                    theme="filled_blue"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                    width="100%"
                  />
                </div>
              </>
            ) : (
              <>
                <input
                  className="plc-input"
                  placeholder="Username"
                  value={username}
                  disabled={isBusy}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <input
                  className="plc-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  disabled={isBusy}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isBusy) {
                      void loginWithSpc(username.trim(), password)
                    }
                  }}
                />
                <button
                  type="button"
                  className="plc-btn plc-btn-primary"
                  disabled={isBusy}
                  onClick={() => void loginWithSpc(username.trim(), password)}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
