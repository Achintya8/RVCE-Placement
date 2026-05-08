import { useCallback, useEffect, useState } from 'react'
import type { AppUser } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ErrorState, FieldBox, SectionCard } from '../placement/components'

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

  const save = async () => {
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

  if (loading) {
    return (
      <div className="plc-empty">
        <div className="plc-splash-spinner" />
      </div>
    )
  }

  if (err || !user) {
    return <ErrorState message={err ?? 'Failed to load profile.'} onRetry={load} />
  }

  return (
    <div>
      <SectionCard
        title="Profile Status"
        subtitle={
          user.verified
            ? 'Your profile has been verified by SPC and is now read-only.'
            : 'Complete the profile once and upload your latest resume before verification.'
        }
        action={
          <div className="plc-row-actions">
            <span className="plc-chip">
              {user.verified ? '✓ Verified' : '⏳ Awaiting verification'}
            </span>
            <button
              type="button"
              className="plc-btn-outline"
              disabled={readOnly}
              onClick={uploadResume}
            >
              {user.resumeUrl == null ? 'Upload Resume' : 'Replace Resume'}
            </button>
          </div>
        }
      >
        {user.resumeUrl != null ? (
          <p style={{ margin: 0 }}>Resume: {user.resumeUrl}</p>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Academic Profile"
        subtitle="This data powers eligibility checks and company exports."
        footer={
          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              className="plc-btn plc-btn-primary"
              style={{ width: 'auto', margin: 0 }}
              disabled={readOnly}
              onClick={() => void save()}
            >
              Save profile
            </button>
          </div>
        }
      >
        <div className="plc-form-grid">
          <FieldBox width={260}>
            <div className="plc-label-input">
              <label htmlFor="pf-name">Name</label>
              <input
                id="pf-name"
                value={name}
                disabled={readOnly}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={220}>
            <div className="plc-label-input">
              <label htmlFor="pf-usn">USN</label>
              <input
                id="pf-usn"
                value={usn}
                disabled={readOnly}
                onChange={(e) => setUsn(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={280}>
            <div className="plc-label-input">
              <label htmlFor="pf-ce">College email</label>
              <input
                id="pf-ce"
                value={collegeEmail}
                disabled={readOnly}
                onChange={(e) => setCollegeEmail(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={280}>
            <div className="plc-label-input">
              <label htmlFor="pf-pe">Personal email</label>
              <input
                id="pf-pe"
                value={personalEmail}
                disabled={readOnly}
                onChange={(e) => setPersonalEmail(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={220}>
            <div className="plc-label-input">
              <label htmlFor="pf-phone">Phone number</label>
              <input
                id="pf-phone"
                value={phone}
                disabled={readOnly}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={220}>
            <div className="plc-label-input">
              <label htmlFor="pf-aadhar">Aadhar</label>
              <input
                id="pf-aadhar"
                value={aadhar}
                disabled={readOnly}
                onChange={(e) => setAadhar(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={280}>
            <div className="plc-label-input">
              <label htmlFor="pf-li">LinkedIn URL</label>
              <input
                id="pf-li"
                value={linkedIn}
                disabled={readOnly}
                onChange={(e) => setLinkedIn(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={280}>
            <div className="plc-label-input">
              <label htmlFor="pf-gh">GitHub URL</label>
              <input
                id="pf-gh"
                value={gitHub}
                disabled={readOnly}
                onChange={(e) => setGitHub(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={180}>
            <div className="plc-label-input">
              <label htmlFor="pf-cgpa">UG CGPA</label>
              <input
                id="pf-cgpa"
                value={cgpa}
                disabled={readOnly}
                onChange={(e) => setCgpa(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={180}>
            <div className="plc-label-input">
              <label htmlFor="pf-fs">1st sem SGPA</label>
              <input
                id="pf-fs"
                value={firstSem}
                disabled={readOnly}
                onChange={(e) => setFirstSem(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={180}>
            <div className="plc-label-input">
              <label htmlFor="pf-10">10th marks</label>
              <input
                id="pf-10"
                value={tenth}
                disabled={readOnly}
                onChange={(e) => setTenth(e.target.value)}
              />
            </div>
          </FieldBox>
          <FieldBox width={180}>
            <div className="plc-label-input">
              <label htmlFor="pf-12">12th marks</label>
              <input
                id="pf-12"
                value={twelfth}
                disabled={readOnly}
                onChange={(e) => setTwelfth(e.target.value)}
              />
            </div>
          </FieldBox>
        </div>
      </SectionCard>
    </div>
  )
}
