import { useCallback, useEffect, useState } from 'react'
import type { AppUser } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Upload, Save, FileText, Clock } from 'lucide-react'

export function ProfilePanel() {
  const { repo } = useAuth()
  const { showToast } = useToast()
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [usn, setUsn] = useState('')
  const [collegeEmail, setCollegeEmail] = useState('')
  const [personalEmail, setPersonalEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [aadhar, setAadhar] = useState('')
  const [linkedIn, setLinkedIn] = useState('')
  const [gitHub, setGitHub] = useState('')
  const [cgpa, setCgpa] = useState('')
  const [tenth, setTenth] = useState('')
  const [twelfth, setTwelfth] = useState('')
  const [firstSem, setFirstSem] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const u = await repo.getProfile()
      setUser(u)
      setName(u.name)
      setUsn(u.usn ?? '')
      setCollegeEmail(u.collegeEmailId)
      setPersonalEmail(u.personalEmailId)
      setPhone(u.phoneNumber ?? '')
      setAadhar(u.aadhar ?? '')
      setLinkedIn(u.linkedIn ?? '')
      setGitHub(u.gitHub ?? '')
      setCgpa(u.ugCgpa === 0 ? '' : String(u.ugCgpa))
      setTenth(u.tenthMarks === 0 ? '' : String(u.tenthMarks))
      setTwelfth(u.twelfthMarks === 0 ? '' : String(u.twelfthMarks))
      setFirstSem(u.firstSemSgpa === 0 ? '' : String(u.firstSemSgpa))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => {
    void load()
  }, [load])

  const readOnly = Boolean(user?.verified) || saving

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await repo.updateProfile({
        name: name.trim(),
        usn: usn.trim(),
        collegeEmailId: collegeEmail.trim(),
        personalEmailId: personalEmail.trim(),
        phoneNumber: phone.trim(),
        aadhar: aadhar.trim(),
        linkedIn: linkedIn.trim(),
        gitHub: gitHub.trim(),
        ugCgpa: Number.parseFloat(cgpa) || user.ugCgpa,
        tenthMarks: Number.parseFloat(tenth) || user.tenthMarks,
        twelfthMarks: Number.parseFloat(twelfth) || user.twelfthMarks,
        firstSemSgpa: Number.parseFloat(firstSem) || user.firstSemSgpa,
      })
      showToast('Profile updated.')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const uploadResume = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        await repo.uploadResume(file)
        showToast('Resume uploaded.')
        await load()
      } catch (e) {
        showToast(e instanceof Error ? e.message : String(e))
      }
    }
    input.click()
  }

  const FormField = ({ label, value, onChange, id, type = 'text', disabled = false }: {
    label: string
    value: string
    onChange: (v: string) => void
    id: string
    type?: string
    disabled?: boolean
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-text-muted">{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border-white/10 text-white focus:ring-primary/50"
      />
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (err || !user) {
    return (
      <Card className="glass-panel border-destructive/20 text-center p-12 max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2 text-white">Failed to load profile</h3>
        <p className="text-text-muted mb-6">{err ?? 'An unknown error occurred.'}</p>
        <Button onClick={load}>Retry</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 lg:pb-8">
      {/* Verification & Resume Section */}
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-white">
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
              <CardDescription className="text-text-muted">
                {user.verified
                  ? 'Your profile is locked and verified by SPC.'
                  : 'Complete your profile and upload a resume to get verified.'}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={uploadResume} 
              disabled={readOnly}
              className="gap-2 border-white/10 text-white hover:bg-white/5"
            >
              <Upload className="w-4 h-4" />
              {user.resumeUrl ? 'Update Resume' : 'Upload Resume'}
            </Button>
          </div>
        </CardHeader>
        {user.resumeUrl && (
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="p-2 bg-white/10 rounded-lg border border-white/10 shadow-sm">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Current Resume</p>
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
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Academic & Personal Details</CardTitle>
          <CardDescription className="text-text-muted">
            Ensure all information matches your college records exactly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField label="Full Name" value={name} onChange={setName} id="pf-name" disabled={readOnly} />
            <FormField label="USN" value={usn} onChange={setUsn} id="pf-usn" disabled={readOnly} />
            <FormField label="College Email" value={collegeEmail} onChange={setCollegeEmail} id="pf-ce" type="email" disabled={readOnly} />
            <FormField label="Personal Email" value={personalEmail} onChange={setPersonalEmail} id="pf-pe" type="email" disabled={readOnly} />
            <FormField label="Phone Number" value={phone} onChange={setPhone} id="pf-phone" disabled={readOnly} />
            <FormField label="Aadhar Number" value={aadhar} onChange={setAadhar} id="pf-aadhar" disabled={readOnly} />
            <FormField label="LinkedIn URL" value={linkedIn} onChange={setLinkedIn} id="pf-li" disabled={readOnly} />
            <FormField label="GitHub URL" value={gitHub} onChange={setGitHub} id="pf-gh" disabled={readOnly} />
            <FormField label="UG CGPA" value={cgpa} onChange={setCgpa} id="pf-cgpa" type="number" disabled={readOnly} />
            <FormField label="1st Sem SGPA" value={firstSem} onChange={setFirstSem} id="pf-fs" type="number" disabled={readOnly} />
            <FormField label="10th Aggregate (%)" value={tenth} onChange={setTenth} id="pf-10" type="number" disabled={readOnly} />
            <FormField label="12th Aggregate (%)" value={twelfth} onChange={setTwelfth} id="pf-12" type="number" disabled={readOnly} />
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t border-white/10 p-6 bg-white/5">
          <Button onClick={saveProfile} disabled={readOnly} className="gap-2 bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}