import { GoogleLogin } from '@react-oauth/google'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { School, Download, Bell } from 'lucide-react'
import { usePWAInstall } from '../hooks/usePWAInstall'

export default function HomeScreen() {
  const { loginWithSpc, loginWithGoogle, errorMessage, clearError, status } =
    useAuth()
  const { showToast } = useToast()
  const { isInstallable, promptInstall } = usePWAInstall()
  const [isSpc, setIsSpc] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showNotifDialog, setShowNotifDialog] = useState(false)
  const [notificationPerm, setNotificationPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission()
      setNotificationPerm(perm)
      if (perm === 'granted') {
        showToast('Notifications enabled successfully!')
      } else {
        showToast('Notifications permission was denied.')
      }
    }
  }

  useEffect(() => {
    if (errorMessage) {
      showToast(errorMessage)
      clearError()
    }
  }, [errorMessage, clearError, showToast])

  const isBusy = status === 'loading'

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div
        className="absolute rounded-full blur-3xl opacity-40"
        style={{ width: 320, height: 320, top: -120, right: -80, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      />
      <div
        className="absolute rounded-full blur-3xl opacity-30"
        style={{ width: 280, height: 280, bottom: -100, left: -60, background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}
      />

      <div className="absolute top-4 right-4 z-50 flex flex-col sm:flex-row gap-2">
        <Button 
          onClick={() => notificationPerm === 'default' ? requestNotificationPermission() : setShowNotifDialog(true)} 
          variant="secondary" 
          size="sm" 
          className="gap-2 shadow-lg"
        >
          <Bell className="w-4 h-4" />
          <span className="hidden sm:inline">
            {notificationPerm === 'default' ? 'Enable Notifications' : 'Manage Notifications'}
          </span>
          <span className="sm:hidden">
            {notificationPerm === 'default' ? 'Notify' : 'Manage'}
          </span>
        </Button>
        {isInstallable && (
          <Button onClick={promptInstall} variant="secondary" size="sm" className="gap-2 shadow-lg">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Install App</span>
            <span className="sm:hidden">Install</span>
          </Button>
        )}
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 px-5 py-3 mb-6 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <School className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium text-white">RV College of Engineering</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Placement Portal</h1>
          <p className="mt-2 text-muted-foreground">Your gateway to career opportunities</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center gap-2 p-1 rounded-xl bg-white/5">
              <button
                type="button"
                onClick={() => setIsSpc(false)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !isSpc 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setIsSpc(true)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSpc 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                SPC
              </button>
            </div>
            <CardDescription className="text-white/60">
              {isSpc 
                ? 'Sign in with your SPC credentials' 
                : 'Sign in with your RVCE Google account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSpc ? (
              <div className="flex justify-center">
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
            ) : (
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Username"
                    value={username}
                    disabled={isBusy}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
                <div>
                  <Input
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
                </div>
                <Button
                  className="w-full"
                  disabled={isBusy}
                  onClick={() => void loginWithSpc(username.trim(), password)}
                >
                  {isBusy ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          RVCE MCA Placement Management System
        </p>
      </div>

      <Dialog open={showNotifDialog} onOpenChange={setShowNotifDialog}>
        <DialogContent className="glass-panel border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Notifications</DialogTitle>
            <DialogDescription className="text-text-muted">
              Notification permissions are managed by your browser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm text-white/80">
            <p>
              Your current notification status is: <strong className="text-white uppercase">{notificationPerm}</strong>.
            </p>
            <p>
              Because web browsers restrict apps from changing this permission directly after it's set, you'll need to update it via your browser settings:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Click the <strong>Lock icon</strong> or <strong>Site Settings icon</strong> next to the URL in your browser's address bar.</li>
              <li>Find <strong>Notifications</strong> in the dropdown.</li>
              <li>Change the setting to <strong>Ask</strong>, <strong>Allow</strong>, or <strong>Block</strong>.</li>
              <li>Refresh the page to apply your changes.</li>
            </ol>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNotifDialog(false)} className="text-white hover:bg-white/5">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}