import { useCallback, useEffect, useState } from 'react'
import type { PlacementFormDetail, PlacementFormSummary } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  EmptyState,
  ErrorState,
  InfoPill,
  SectionCard,
} from '../placement/components'
import { DynamicFormModal } from './DynamicFormModal'

export function FormsPanel() {
  const { repo } = useAuth()
  const { showToast } = useToast()
  const [forms, setForms] = useState<PlacementFormSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [detail, setDetail] = useState<PlacementFormDetail | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      setForms(await repo.getAssignedForms())
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setForms(null)
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => {
    void load()
  }, [load])

  const openForm = async (summary: PlacementFormSummary) => {
    try {
      const d = await repo.getForm(summary.id)
      setDetail(d)
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

  if (err || !forms) {
    return <ErrorState message={err ?? 'Failed to load forms.'} onRetry={load} />
  }

  if (forms.length === 0) {
    return (
      <EmptyState
        title="No forms yet"
        subtitle="SPC-created forms will appear here as soon as they are shared."
      />
    )
  }

  return (
    <div>
      {detail ? (
        <DynamicFormModal
          detail={detail}
          onClose={() => setDetail(null)}
          onSubmitted={load}
        />
      ) : null}
      {forms.map((f) => (
        <SectionCard
          key={f.id}
          title={f.title}
          subtitle={`${f.type.toUpperCase()} | ${f.companyName ?? 'Global'}`}
          action={
            <button
              type="button"
              className="plc-btn plc-btn-primary"
              style={{ width: 'auto', margin: 0 }}
              onClick={() => void openForm(f)}
            >
              {(f.responseCount ?? 0) > 0 ? 'Edit' : 'Fill'}
            </button>
          }
        >
          <div className="plc-form-grid">
            <InfoPill label="Questions" value={`${f.questionCount ?? 0}`} />
            <InfoPill label="Responses" value={`${f.responseCount ?? 0}`} />
          </div>
        </SectionCard>
      ))}
    </div>
  )
}
