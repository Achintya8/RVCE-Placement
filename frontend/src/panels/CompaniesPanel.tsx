import { useEffect } from 'react'
import type { Company } from '@/types'
import { useCompanyStore } from '../store/useCompanyStore'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Building2, Calendar, IndianRupee, Star, Mail, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { formatDate } from '../lib/format'
import { CompanyListSkeleton } from '@/components/modern/Skeleton'

export function CompaniesPanel() {
  const { 
    companies, 
    loading, 
    error: err, 
    busyIds, 
    fetchCompanies, 
    updateApplication 
  } = useCompanyStore()

  useEffect(() => {
    void fetchCompanies()
  }, [fetchCompanies])

  const onUpdate = async (
    company: Company,
    patch: { consent?: boolean; tracker?: boolean },
  ) => {
    try {
      await updateApplication(company, patch)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md">
        <CompanyListSkeleton />
      </div>
    )
  }

  if (err || !companies) {
    return (
      <Card className="glass-panel border-destructive/20 text-center p-12 max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Failed to load companies</h3>
        <p className="text-muted-foreground mb-6">{err ?? 'An unknown error occurred.'}</p>
        <Button onClick={fetchCompanies}>Retry</Button>
      </Card>
    )
  }

  if (companies.length === 0) {
    return (
      <div className="ios-glass-panel rounded-[1.5rem] border-dashed py-20 text-center">
        <Building2 className="w-16 h-16 text-slate-400 dark:text-white/20 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">No companies yet</h3>
        <p className="text-muted-foreground">Stay tuned for upcoming placement drives.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {companies.map((c) => {
        const isBusy = busyIds.has(c.id)
        return (
          <Card key={c.id} className="glass-panel transition-all duration-300 hover:-translate-y-0.5">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl text-slate-900 dark:text-white">{c.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-muted-foreground">
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
                <div className="ios-glass-control space-y-1.5 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <IndianRupee className="w-3 h-3 text-primary" /> Package
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{c.package || 'TBD'}</p>
                </div>
                <div className="ios-glass-control space-y-1.5 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <IndianRupee className="w-3 h-3 text-primary" /> Stipend
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{c.stipend || 'TBD'}</p>
                </div>
                <div className="ios-glass-control space-y-1.5 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Calendar className="w-3 h-3 text-primary" /> Test Date
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(c.testDate ?? null)}</p>
                </div>
                <div className="ios-glass-control space-y-1.5 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Calendar className="w-3 h-3 text-primary" /> Interview
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(c.interviewDate ?? null)}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`consent-${c.id}`} className="text-sm font-semibold text-slate-900 dark:text-white">Consent Provided</Label>
                    <p className="text-xs text-muted-foreground">
                      {c.consentBlocked ? 'Consent submission is locked' : 'Willing to sit for this drive?'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.consentBlocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                    {c.consent && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    <Switch
                      id={`consent-${c.id}`}
                      checked={c.consent ?? false}
                      onCheckedChange={(v) => void onUpdate(c, { consent: v })}
                      disabled={c.consentBlocked || isBusy}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`tracker-${c.id}`} className="text-sm font-semibold text-slate-900 dark:text-white">Mail Tracker</Label>
                    <p className="text-xs text-muted-foreground">
                      {c.trackerBlocked ? 'Mail tracker is locked' : 'Received email from company?'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.trackerBlocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                    {c.tracker && <Mail className="w-4 h-4 text-primary" />}
                    <Switch
                      id={`tracker-${c.id}`}
                      checked={c.tracker ?? false}
                      onCheckedChange={(v) => void onUpdate(c, { tracker: v })}
                      disabled={c.trackerBlocked || isBusy}
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
