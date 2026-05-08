import { useMemo, useState } from 'react'
import type { PlacementFormDetail } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function DynamicFormModal({
  detail,
  onClose,
  onSubmitted,
}: {
  detail: PlacementFormDetail
  onClose: () => void
  onSubmitted: () => void
}) {
  const { repo } = useAuth()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const initial = useMemo(() => {
    const m: Record<number, string> = {}
    for (const q of detail.questions) {
      if (q.fieldType === 'text' || q.fieldType === 'number') {
        m[q.id] = q.answer ?? ''
      } else if (q.fieldType === 'boolean') {
        m[q.id] = q.answer ?? ''
      } else {
        m[q.id] = q.answer ?? ''
      }
    }
    return m
  }, [detail.questions])

  const [values, setValues] = useState<Record<number, string>>(initial)

  const setVal = (id: number, v: string) => {
    setValues((prev) => ({ ...prev, [id]: v }))
  }

  const submit = async () => {
    const answers: Record<number, string | number | boolean> = {}
    for (const q of detail.questions) {
      const raw = values[q.id] ?? ''
      if (q.fieldType === 'number') {
        const n = Number.parseFloat(raw)
        answers[q.id] = Number.isNaN(n) ? raw : n
      } else if (q.fieldType === 'boolean') {
        answers[q.id] = raw === 'true'
      } else {
        answers[q.id] = raw
      }
    }

    if (detail.questions.some((q) => q.isRequired && !(values[q.id] ?? '').trim())) {
      showToast('Please fill all required fields.')
      return
    }

    setSaving(true)
    try {
      await repo.submitFormResponses(detail.summary.id, answers)
      onSubmitted()
      onClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="plc-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="plc-modal-sheet"
        role="dialog"
        aria-labelledby="form-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="form-modal-title" style={{ margin: '0 0 6px' }}>
          {detail.summary.title}
        </h2>
        <p style={{ margin: '0 0 24px', opacity: 0.8 }}>
          {detail.summary.type.toUpperCase()} •{' '}
          {detail.summary.companyName ?? 'Global'}
        </p>

        {detail.questions.map((q) => (
          <div key={q.id} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>
              {q.questionText}
              {q.isRequired ? ' *' : ''}
            </div>
            {q.fieldType === 'text' || q.fieldType === 'number' ? (
              <input
                className="plc-input"
                style={{ marginTop: 0, background: '#fff' }}
                type={q.fieldType === 'number' ? 'number' : 'text'}
                value={values[q.id] ?? ''}
                onChange={(e) => setVal(q.id, e.target.value)}
              />
            ) : q.fieldType === 'boolean' ? (
              <select
                className="plc-input"
                style={{ marginTop: 0, background: '#fff' }}
                value={values[q.id] ?? ''}
                onChange={(e) => setVal(q.id, e.target.value)}
              >
                <option value="">Select…</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <select
                className="plc-input"
                style={{ marginTop: 0, background: '#fff' }}
                value={values[q.id] ?? ''}
                onChange={(e) => setVal(q.id, e.target.value)}
              >
                <option value="">Select…</option>
                {q.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        <div className="plc-modal-actions">
          <button type="button" className="plc-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="plc-btn plc-btn-primary"
            style={{ width: 'auto', margin: 0 }}
            disabled={saving}
            onClick={() => void submit()}
          >
            Submit responses
          </button>
        </div>
      </div>
    </div>
  )
}
