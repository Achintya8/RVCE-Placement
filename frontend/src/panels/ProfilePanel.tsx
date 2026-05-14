import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useProfileStore } from '../store/useProfileStore'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Upload, Save, FileText, Clock, Unlock, Camera, Moon, Sun, User } from 'lucide-react'
import { StudentProfileSkeleton } from '@/components/modern/Skeleton'

const FormField = ({ label, value, onChange, id, type = 'text', disabled = false }: {
  label: string
  value: string
  onChange: (v: string) => void
  id: string
  type?: string
  disabled?: boolean
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium text-slate-600 dark:text-muted-foreground">{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="border-slate-200 bg-white text-slate-950 focus:ring-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
    />
  </div>
)

export function ProfilePanel() {
  const { theme, setTheme } = useTheme()
  const { 
    profile: user, 
    draft, 
    loading, 
    saving, 
    error: err,
    fetchProfile,
    setDraftField,
    saveProfile,
    uploadResume,
    uploadProfilePicture,
    requestUnlock
  } = useProfileStore()

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const readOnly = Boolean(user?.verified) || saving

  const onSave = async () => {
    try {
      await saveProfile()
      toast.success('Profile updated.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const onUploadResume = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        await uploadResume(file)
        toast.success('Resume uploaded.')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e))
      }
    }
    input.click()
  }

  const onUploadProfilePicture = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        await uploadProfilePicture(file)
        toast.success('Profile picture updated.')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e))
      }
    }
    input.click()
  }

  const onRequestUnlock = async () => {
    try {
      await requestUnlock()
      toast.success('Edit request sent to SPC.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const load = fetchProfile // For retry button

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md">
        <StudentProfileSkeleton />
      </div>
    )
  }

  if (err || !user) {
    return (
      <Card className="glass-panel border-destructive/20 text-center p-12 max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2 text-slate-950 dark:text-white">Failed to load profile</h3>
        <p className="text-slate-600 dark:text-muted-foreground mb-6">{err ?? 'An unknown error occurred.'}</p>
        <Button onClick={load}>Retry</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="glass-panel overflow-hidden">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/10">
              {user.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-9 w-9 text-slate-500 dark:text-white/70" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-slate-950 dark:text-white">
                {user.name || 'Student'}
              </p>
              <p className="truncate text-sm text-slate-600 dark:text-muted-foreground">
                {user.collegeEmailId}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={onUploadProfilePicture}
              disabled={saving}
              className="w-full gap-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-slate-200 dark:bg-white/10 sm:w-auto"
            >
              <Camera className="w-4 h-4" />
              Upload Photo
            </Button>
            <Button
              variant="outline"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full gap-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-slate-200 dark:bg-white/10 sm:w-auto"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verification & Resume Section */}
      <Card className="glass-panel">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex flex-wrap items-center gap-2 text-slate-950 dark:text-white">
                Verification Status
                {user.verified ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/20 gap-1.5 hover:bg-green-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-400 border-amber-400/20 bg-amber-400/10 gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Awaiting Verification
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-muted-foreground">
                {user.verified
                  ? 'Your profile is locked and verified by SPC.'
                  : 'Complete your profile and upload a resume to get verified.'}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              {user.verified && (
                <Button
                  variant="outline"
                  onClick={onRequestUnlock}
                  disabled={user.unlockRequested || saving}
                  className="w-full gap-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-slate-200 dark:bg-white/10 sm:w-auto"
                >
                  <Unlock className="w-4 h-4" />
                  {user.unlockRequested ? 'Edit Request Pending' : 'Request Profile Edit'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onUploadResume}
                disabled={saving}
                className="w-full gap-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-slate-200 dark:bg-white/10 sm:w-auto"
              >
                <Upload className="w-4 h-4" />
                {user.resumeUrl ? 'Update Resume' : 'Upload Resume'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {user.resumeUrl && (
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 dark:bg-white/5 dark:border-white/10">
              <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm dark:bg-white/10 dark:border-white/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-muted-foreground">Current Resume</p>
                <a
                  href={user.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:underline truncate block"
                >
                  {user.resumeUrl.split('/').pop()}
                </a>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Profile Form */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-slate-950 dark:text-white">Academic & Personal Details</CardTitle>
          <CardDescription className="text-slate-600 dark:text-muted-foreground">
            Ensure all information matches your college records exactly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField label="Full Name" value={draft.name ?? ''} onChange={(v) => setDraftField('name', v)} id="pf-name" disabled={readOnly} />
            <FormField label="USN" value={draft.usn ?? ''} onChange={(v) => setDraftField('usn', v)} id="pf-usn" disabled={readOnly} />
            <FormField label="College Email" value={draft.collegeEmailId ?? ''} onChange={(v) => setDraftField('collegeEmailId', v)} id="pf-ce" type="email" disabled={readOnly} />
            <FormField label="Personal Email" value={draft.personalEmailId ?? ''} onChange={(v) => setDraftField('personalEmailId', v)} id="pf-pe" type="email" disabled={readOnly} />
            <FormField label="Phone Number" value={draft.phoneNumber ?? ''} onChange={(v) => setDraftField('phoneNumber', v)} id="pf-phone" disabled={readOnly} />
            <FormField label="Aadhar Number" value={draft.aadhar ?? ''} onChange={(v) => setDraftField('aadhar', v)} id="pf-aadhar" disabled={readOnly} />
            <FormField label="LinkedIn URL" value={draft.linkedIn ?? ''} onChange={(v) => setDraftField('linkedIn', v)} id="pf-li" disabled={readOnly} />
            <FormField label="GitHub URL" value={draft.gitHub ?? ''} onChange={(v) => setDraftField('gitHub', v)} id="pf-gh" disabled={readOnly} />
            <FormField label="UG CGPA" value={String(draft.ugCgpa ?? '')} onChange={(v) => setDraftField('ugCgpa', v)} id="pf-cgpa" type="number" disabled={readOnly} />
            <FormField label="1st Sem SGPA" value={String(draft.firstSemSgpa ?? '')} onChange={(v) => setDraftField('firstSemSgpa', v)} id="pf-fs" type="number" disabled={readOnly} />
            <FormField label="10th Aggregate (%)" value={String(draft.tenthMarks ?? '')} onChange={(v) => setDraftField('tenthMarks', v)} id="pf-10" type="number" disabled={readOnly} />
            <FormField label="12th Aggregate (%)" value={String(draft.twelfthMarks ?? '')} onChange={(v) => setDraftField('twelfthMarks', v)} id="pf-12" type="number" disabled={readOnly} />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t border-slate-200 p-4 bg-slate-50 dark:border-white/10 dark:bg-white/5 sm:p-6">
          <Button onClick={onSave} disabled={readOnly} className="w-full gap-2 bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 sm:w-auto">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
