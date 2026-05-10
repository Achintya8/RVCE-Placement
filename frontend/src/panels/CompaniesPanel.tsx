import { useCallback, useEffect, useState } from 'react'
import type { Company } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Building2, Calendar, IndianRupee, Star, Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatDate } from '../lib/format'

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (err || !companies) {
    return (
      <Card className="glass-panel border-destructive/20 text-center p-12 max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2 text-white">Failed to load companies</h3>
        <p className="text-text-muted mb-6">{err ?? 'An unknown error occurred.'}</p>
        <Button onClick={load}>Retry</Button>
      </Card>
    )
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
        <Building2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white">No companies yet</h3>
        <p className="text-text-muted">Stay tuned for upcoming placement drives.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {companies.map((c) => {
        const isBusy = busy.has(c.id)
        return (
          <Card key={c.id} className="glass-panel border-white/10 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl text-white">{c.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-text-muted">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    Min CGPA: {c.minCgpa.toFixed(1)}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20">
                  Drive Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <IndianRupee className="w-3 h-3 text-primary" /> Package
                  </div>
                  <p className="text-sm font-bold text-white">{c.package || 'TBD'}</p>
                </div>
                <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <IndianRupee className="w-3 h-3 text-primary" /> Stipend
                  </div>
                  <p className="text-sm font-bold text-white">{c.stipend || 'TBD'}</p>
                </div>
                <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <Calendar className="w-3 h-3 text-primary" /> Test Date
                  </div>
                  <p className="text-sm font-bold text-white">{formatDate(c.testDate ?? null)}</p>
                </div>
                <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <Calendar className="w-3 h-3 text-primary" /> Interview
                  </div>
                  <p className="text-sm font-bold text-white">{formatDate(c.interviewDate ?? null)}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`consent-${c.id}`} className="text-sm font-semibold text-white">Consent Provided</Label>
                    <p className="text-xs text-text-muted">Willing to sit for this drive?</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.consent && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    <Switch
                      id={`consent-${c.id}`}
                      checked={c.consent ?? false}
                      onCheckedChange={(v) => void updateCompany(c, { consent: v })}
                      disabled={isBusy}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`tracker-${c.id}`} className="text-sm font-semibold text-white">Mail Tracker</Label>
                    <p className="text-xs text-text-muted">Received email from company?</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.tracker && <Mail className="w-4 h-4 text-primary" />}
                    <Switch
                      id={`tracker-${c.id}`}
                      checked={c.tracker ?? false}
                      onCheckedChange={(v) => void updateCompany(c, { tracker: v })}
                      disabled={isBusy}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}