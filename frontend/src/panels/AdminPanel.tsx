import { useCallback, useEffect, useState } from 'react'
import type {
  Company,
  FormQuestion,
  FormResponseRecord,
  PlacementFormSummary,
  StudentSummary,
} from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ErrorState, FieldBox, SectionCard } from '../placement/components'
import { downloadBlob } from '../placement/format'

const EXPORT_FIELDS: { key: string; label: string }[] = [
  { key: 'usn', label: 'USN' },
  { key: 'personal_email_id', label: 'Personal Email' },
  { key: 'phone_number', label: 'Phone Number' },
  { key: 'aadhar', label: 'Aadhar' },
  { key: 'linkedIn', label: 'LinkedIn' },
  { key: 'gitHub', label: 'GitHub' },
  { key: 'tenth_marks', label: '10th Marks' },
  { key: 'twelfth_marks', label: '12th Marks' },
  { key: 'first_sem_sgpa', label: '1st Sem SGPA' },
]

type AdminData = {
  companies: Company[]
  questions: FormQuestion[]
  forms: PlacementFormSummary[]
  students: StudentSummary[]
}

export function AdminPanel() {
  const { repo } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [cName, setCName] = useState('')
  const [cCgpa, setCCgpa] = useState('')
  const [cPkg, setCPkg] = useState('')
  const [cStip, setCStip] = useState('')
  const [cTest, setCTest] = useState('')
  const [cInt, setCInt] = useState('')

  const [qText, setQText] = useState('')
  const [qType, setQType] = useState<'text' | 'number' | 'boolean' | 'dropdown'>(
    'text',
  )
  const [qOpts, setQOpts] = useState('')

  const [fTitle, setFTitle] = useState('')
  const [fType, setFType] = useState<'consent' | 'tracker' | 'custom'>('custom')
  const [fCompanyId, setFCompanyId] = useState<number | null>(null)
  const [mapFormId, setMapFormId] = useState<number | null>(null)
  const [mapped, setMapped] = useState<Record<number, boolean>>({})
  const [required, setRequired] = useState<Set<number>>(() => new Set())

  const [exportCompanyId, setExportCompanyId] = useState<number | null>(null)
  const [exportFields, setExportFields] = useState<Set<string>>(
    () => new Set(EXPORT_FIELDS.map((f) => f.key)),
  )

  const [responsesModal, setResponsesModal] = useState<{
    formId: number
    title: string
    rows: FormResponseRecord[]
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [companies, questions, forms, students] = await Promise.all([
        repo.getCompanies(),
        repo.getQuestions(),
        repo.getAllForms(),
        repo.getStudents(),
      ])
      setData({ companies, questions, forms, students })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (task: () => Promise<void>, ok?: string) => {
    setBusy(true)
    try {
      await task()
      await load()
      if (ok) showToast(ok)
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const createCompany = () =>
    run(async () => {
      await repo.createCompany({
        name: cName.trim(),
        minCgpa: Number.parseFloat(cCgpa) || 0,
        package: cPkg.trim(),
        stipend: cStip.trim(),
        testDate: cTest.trim() || null,
        interviewDate: cInt.trim() || null,
      })
      setCName('')
      setCCgpa('')
      setCPkg('')
      setCStip('')
      setCTest('')
      setCInt('')
    }, 'Company created.')

  const createQuestion = () =>
    run(async () => {
      const options = qOpts
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      await repo.createQuestion({
        questionText: qText.trim(),
        fieldType: qType,
        options: qType === 'dropdown' ? options : undefined,
      })
      setQText('')
      setQOpts('')
    }, 'Question created.')

  const createForm = () =>
    run(async () => {
      await repo.createForm({
        title: fTitle.trim(),
        type: fType,
        companyId: fCompanyId,
      })
      setFTitle('')
    }, 'Form created.')

  const saveMapping = () => {
    if (mapFormId == null) {
      showToast('Select a form to map questions.')
      return
    }
    const questions = Object.entries(mapped)
      .filter(([, on]) => on)
      .map(([id]) => ({
        questionId: Number(id),
        isRequired: required.has(Number(id)),
      }))
    return run(
      async () => {
        await repo.mapQuestionsToForm(mapFormId, questions)
      },
      'Form questions mapped.',
    )
  }

  const sendForm = () => {
    if (mapFormId == null) {
      showToast('Select a form to send.')
      return
    }
    return run(async () => {
      await repo.sendForm(mapFormId)
    }, 'Form notifications sent.')
  }

  const verifyStudent = (id: number) =>
    run(async () => {
      await repo.verifyStudent(id)
    }, 'Student verified.')

  const doExportCompany = () => {
    if (exportCompanyId == null) return
    const id = exportCompanyId
    const fields = [...exportFields]
    void run(async () => {
      const bytes = await repo.exportCompany(id, fields)
      downloadBlob(bytes, `company-${id}.xlsx`)
    })
    setExportCompanyId(null)
  }

  const openResponses = async (formId: number, title: string) => {
    try {
      const rows = await repo.getFormResponses(formId)
      setResponsesModal({ formId, title, rows })
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    }
  }

  const exportFormExcel = async (formId: number) => {
    try {
      const bytes = await repo.exportFormResponses(formId)
      downloadBlob(bytes, `form-${formId}-responses.xlsx`)
      showToast('Download started.')
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    }
  }

  if (loading) {
    return (
      <div className="plc-empty">
        <div className="plc-splash-spinner" />
      </div>
    )
  }

  if (err || !data) {
    return <ErrorState message={err ?? 'Failed to load admin data.'} onRetry={load} />
  }

  return (
    <div>
      {exportCompanyId != null ? (
        <div
          className="plc-modal-backdrop"
          role="presentation"
          onClick={() => setExportCompanyId(null)}
        >
          <div
            className="plc-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Select Columns to Export</h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Name, College Email, CGPA, Resume URL, and form questions are always
              included on the backend.
            </p>
            <div className="plc-dialog-list">
              {EXPORT_FIELDS.map((f) => (
                <label key={f.key} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={exportFields.has(f.key)}
                    onChange={(e) => {
                      setExportFields((prev) => {
                        const n = new Set(prev)
                        if (e.target.checked) n.add(f.key)
                        else n.delete(f.key)
                        return n
                      })
                    }}
                  />
                  {f.label}
                </label>
              ))}
            </div>
            <div className="plc-dialog-actions">
              <button
                type="button"
                className="plc-btn-outline"
                onClick={() => setExportCompanyId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="plc-btn plc-btn-primary"
                style={{ width: 'auto', margin: 0 }}
                onClick={doExportCompany}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {responsesModal ? (
        <div
          className="plc-modal-backdrop"
          role="presentation"
          onClick={() => setResponsesModal(null)}
        >
          <div
            className="plc-dialog"
            style={{ maxWidth: 900 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>{responsesModal.title}</h3>
            {responsesModal.rows.length === 0 ? (
              <p>No responses yet.</p>
            ) : (
              <div className="plc-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>USN</th>
                      <th>Email</th>
                      {responsesModal.rows[0].answers.map((a) => (
                        <th key={a.id}>{a.questionText}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {responsesModal.rows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.studentName}</td>
                        <td>{r.usn}</td>
                        <td>{r.collegeEmailId}</td>
                        {r.answers.map((a) => (
                          <td key={a.id}>{a.answer ?? '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="plc-dialog-actions">
              <button
                type="button"
                className="plc-btn-outline"
                onClick={() => setResponsesModal(null)}
              >
                Close
              </button>
              {responsesModal.rows.length > 0 ? (
                <button
                  type="button"
                  className="plc-btn plc-btn-primary"
                  style={{ width: 'auto', margin: 0 }}
                  onClick={() => void exportFormExcel(responsesModal.formId)}
                >
                  Download Excel
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <SectionCard
        title="Create Company"
        subtitle="Use ISO dates like 2026-06-12 to stay aligned with the backend."
        footer={
          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              className="plc-btn plc-btn-primary"
              style={{ width: 'auto', margin: 0 }}
              disabled={busy}
              onClick={() => void createCompany()}
            >
              Create company
            </button>
          </div>
        }
      >
        <div className="plc-form-grid">
          <FieldBox width={220}>
            <div className="plc-label-input">
              <label>Company name</label>
              <input value={cName} onChange={(e) => setCName(e.target.value)} />
            </div>
          </FieldBox>
          <FieldBox width={140}>
            <div className="plc-label-input">
              <label>Min CGPA</label>
              <input value={cCgpa} onChange={(e) => setCCgpa(e.target.value)} />
            </div>
          </FieldBox>
          <FieldBox width={180}>
            <div className="plc-label-input">
              <label>Package</label>
              <input value={cPkg} onChange={(e) => setCPkg(e.target.value)} />
            </div>
          </FieldBox>
          <FieldBox width={180}>
            <div className="plc-label-input">
              <label>Stipend</label>
              <input value={cStip} onChange={(e) => setCStip(e.target.value)} />
            </div>
          </FieldBox>
          <FieldBox width={180}>
            <div className="plc-label-input">
              <label>Test date</label>
              <input value={cTest} onChange={(e) => setCTest(e.target.value)} />
            </div>
          </FieldBox>
          <FieldBox width={180}>
            <div className="plc-label-input">
              <label>Interview date</label>
              <input value={cInt} onChange={(e) => setCInt(e.target.value)} />
            </div>
          </FieldBox>
        </div>
      </SectionCard>

      <SectionCard
        title="Question Bank"
        subtitle="Dropdown options are stored without changing the schema."
        footer={
          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              className="plc-btn plc-btn-primary"
              style={{ width: 'auto', margin: 0 }}
              disabled={busy}
              onClick={() => void createQuestion()}
            >
              Create question
            </button>
          </div>
        }
      >
        <div className="plc-form-grid">
          <FieldBox width={340}>
            <div className="plc-label-input">
              <label>Question text</label>
              <input value={qText} onChange={(e) => setQText(e.target.value)} />
            </div>
          </FieldBox>
          <FieldBox width={180}>
            <div className="plc-label-input">
              <label>Field type</label>
              <select
                value={qType}
                onChange={(e) =>
                  setQType(e.target.value as typeof qType)
                }
              >
                <option value="text">text</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="dropdown">dropdown</option>
              </select>
            </div>
          </FieldBox>
          {qType === 'dropdown' ? (
            <FieldBox width={300}>
              <div className="plc-label-input">
                <label>Options (comma separated)</label>
                <input value={qOpts} onChange={(e) => setQOpts(e.target.value)} />
              </div>
            </FieldBox>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Create and Send Forms"
        subtitle="Create a form, map reusable questions, then send a push notification."
      >
        <div className="plc-form-grid">
          <FieldBox width={260}>
            <div className="plc-label-input">
              <label>Form title</label>
              <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
            </div>
          </FieldBox>
          <FieldBox width={180}>
            <div className="plc-label-input">
              <label>Form type</label>
              <select
                value={fType}
                onChange={(e) =>
                  setFType(e.target.value as typeof fType)
                }
              >
                <option value="consent">consent</option>
                <option value="tracker">tracker</option>
                <option value="custom">custom</option>
              </select>
            </div>
          </FieldBox>
          <FieldBox width={240}>
            <div className="plc-label-input">
              <label>Linked company</label>
              <select
                value={fCompanyId ?? ''}
                onChange={(e) =>
                  setFCompanyId(
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
              >
                <option value="">Global</option>
                {data.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </FieldBox>
        </div>
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button
            type="button"
            className="plc-btn plc-btn-primary"
            style={{ width: 'auto', margin: 0 }}
            disabled={busy}
            onClick={() => void createForm()}
          >
            Create form
          </button>
        </div>

        <div className="plc-form-grid" style={{ marginTop: 24 }}>
          <FieldBox width={260}>
            <div className="plc-label-input">
              <label>Form to map</label>
              <select
                value={mapFormId ?? ''}
                onChange={(e) =>
                  setMapFormId(
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
              >
                <option value="">Select a form</option>
                {data.forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </div>
          </FieldBox>
        </div>

        <div className="plc-form-grid" style={{ marginTop: 18 }}>
          {data.questions.map((q) => (
            <div key={q.id} className="plc-admin-q">
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={mapped[q.id] ?? false}
                  disabled={busy}
                  onChange={(e) =>
                    setMapped((m) => ({ ...m, [q.id]: e.target.checked }))
                  }
                />
                <span>
                  <strong>{q.questionText}</strong>
                  <span style={{ display: 'block', fontSize: '0.8rem' }}>
                    {q.fieldType}
                  </span>
                </span>
              </label>
              <label
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  marginTop: 8,
                  opacity: mapped[q.id] ? 1 : 0.45,
                }}
              >
                <input
                  type="checkbox"
                  disabled={busy || !mapped[q.id]}
                  checked={required.has(q.id)}
                  onChange={(e) => {
                    setRequired((prev) => {
                      const n = new Set(prev)
                      if (e.target.checked) n.add(q.id)
                      else n.delete(q.id)
                      return n
                    })
                  }}
                />
                Required
              </label>
            </div>
          ))}
        </div>
        <div className="plc-form-grid" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="plc-btn plc-btn-primary"
            style={{ width: 'auto', margin: 0 }}
            disabled={busy}
            onClick={() => void saveMapping()}
          >
            Save mapping
          </button>
          <button
            type="button"
            className="plc-btn-outline"
            disabled={busy}
            onClick={() => void sendForm()}
          >
            Send notification
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Students"
        subtitle="Verify profiles to lock student edits."
      >
        <div className="plc-form-grid">
          {data.students.map((s) => (
            <div key={s.id} className="plc-student-card">
              <div style={{ fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: '0.9rem', marginTop: 4 }}>
                {s.collegeEmailId}
              </div>
              <button
                type="button"
                className="plc-btn-tonal"
                style={{ marginTop: 10 }}
                disabled={s.verified || busy}
                onClick={() => void verifyStudent(s.id)}
              >
                {s.verified ? 'Verified' : 'Verify'}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Exports and Responses"
        subtitle="Use the backend export endpoint and inspect responses per form."
      >
        <h4 style={{ margin: '0 0 12px' }}>Companies</h4>
        <div className="plc-form-grid">
          {data.companies.map((c) => (
            <button
              key={c.id}
              type="button"
              className="plc-btn-outline"
              disabled={busy}
              onClick={() => {
                setExportFields(new Set(EXPORT_FIELDS.map((f) => f.key)))
                setExportCompanyId(c.id)
              }}
            >
              ⬇ {c.name}
            </button>
          ))}
        </div>
        <h4 style={{ margin: '24px 0 12px' }}>Forms</h4>
        <div className="plc-form-grid">
          {data.forms.map((f) => (
            <button
              key={f.id}
              type="button"
              className="plc-btn-outline"
              onClick={() => void openResponses(f.id, f.title)}
            >
              👁 {f.title}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
