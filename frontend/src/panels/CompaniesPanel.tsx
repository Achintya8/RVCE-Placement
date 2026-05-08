import { useCallback, useEffect, useState } from 'react'
import type { Company } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  ErrorState,
  InfoPill,
  SectionCard,
  ToggleRow,
} from '../placement/components'
import { formatDate } from '../placement/format'

export function CompaniesPanel() {
  const { repo } = useAuth()
  const { showToast } = useToast()
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<Set<number>>(() => new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      setCompanies(await repo.getCompanies())
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setCompanies(null)
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => {
    void load()
  }, [load])

  const updateCompany = async (
    company: Company,
    patch: { consent?: boolean; tracker?: boolean },
  ) => {
    setBusy((b) => new Set(b).add(company.id))
    try {
      await repo.saveApplication(company.id, patch)
      setCompanies(await repo.getCompanies())
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy((b) => {
        const n = new Set(b)
        n.delete(company.id)
        return n
      })
    }
  }

  if (loading) {
    return (
      <div className="plc-empty">
        <div className="plc-splash-spinner" />
      </div>
    )
  }

  if (err || !companies) {
    return (
      <ErrorState message={err ?? 'Failed to load companies.'} onRetry={load} />
    )
  }

  return (
    <div>
      {companies.map((c) => {
        const isBusy = busy.has(c.id)
        return (
          <SectionCard
            key={c.id}
            title={c.name}
            subtitle={`Package ${c.package || 'TBD'} | Stipend ${c.stipend || 'TBD'}`}
          >
            <div className="plc-form-grid" style={{ marginBottom: 18 }}>
              <InfoPill label="Min CGPA" value={c.minCgpa.toFixed(1)} />
              <InfoPill label="Test" value={formatDate(c.testDate)} />
              <InfoPill label="Interview" value={formatDate(c.interviewDate)} />
            </div>
            <div className="plc-form-grid">
              <ToggleRow
                title="Consent"
                value={c.consent ?? false}
                disabled={isBusy}
                onChange={(v) => void updateCompany(c, { consent: v })}
              />
              <ToggleRow
                title="Mail tracker"
                value={c.tracker ?? false}
                disabled={isBusy}
                onChange={(v) => void updateCompany(c, { tracker: v })}
              />
            </div>
          </SectionCard>
        )
      })}
    </div>
  )
}
