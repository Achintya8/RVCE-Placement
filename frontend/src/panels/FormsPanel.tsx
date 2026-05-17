import { useEffect, useState } from 'react'
import type { PlacementFormDetail, PlacementFormSummary } from '../api/types'
import { useFormStore } from '../store/useFormStore'
import { toast } from 'sonner'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DynamicFormModal } from './DynamicFormModal'
import { ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormsPanelSkeleton } from '@/components/modern/Skeleton'

export function FormsPanel() {
  const { forms, loading, error: err, fetchForms, getFormDetails } = useFormStore()
  const [detail, setDetail] = useState<PlacementFormDetail | null>(null)

  useEffect(() => {
    void fetchForms()
  }, [fetchForms])

  const openForm = async (summary: PlacementFormSummary) => {
    try {
      const d = await getFormDetails(summary.id)
      setDetail(d)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <FormsPanelSkeleton />
      </div>
    )
  }

  if (err || !forms) {
    return (
      <Card className="glass-panel border-destructive/20 text-center p-12 max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Failed to load forms</h3>
        <p className="text-muted-foreground mb-6">{err ?? 'An unknown error occurred.'}</p>
        <Button onClick={fetchForms}>Retry</Button>
      </Card>
    )
  }

  if (forms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <div className="p-6 rounded-full bg-slate-100 dark:bg-white/5">
          <ClipboardList className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">All caught up!</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            No pending forms assigned to you at the moment. SPC-created forms will appear here.
          </p>
        </div>
      </div>
    )
  }

  const openForms = forms.filter(
    (f) => f.acceptingResponses !== false && (f.responseCount ?? 0) === 0
  )
  const pastOrClosedForms = forms.filter(
    (f) => f.acceptingResponses === false || (f.responseCount ?? 0) > 0
  )

  const renderFormCard = (f: PlacementFormSummary) => {
    const isClosed = f.acceptingResponses === false
    const hasSubmitted = (f.responseCount ?? 0) > 0

    return (
      <Card
        key={f.id}
        className={cn(
          "glass-panel hover:shadow-2xl transition-all duration-300 border",
          isClosed
            ? "border-red-500/10 hover:shadow-red-500/2 bg-slate-900/40"
            : "hover:shadow-primary/5 border-slate-200 dark:border-white/10"
        )}
      >
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl flex flex-wrap items-center gap-2 text-slate-900 dark:text-white">
                {f.title}
                {hasSubmitted && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                {isClosed && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-red-500/20 bg-red-500/10 text-red-400 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 block"></span>
                    Form was closed
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm font-medium mt-1">
                {f.companyName ? (
                  <span className="text-slate-700 dark:text-slate-300 font-bold">
                    {f.companyName}
                  </span>
                ) : (
                  <span className="text-primary font-bold">
                    General
                  </span>
                )}
              </CardDescription>
            </div>

            <Button
              onClick={() => void openForm(f)}
              disabled={isClosed && !hasSubmitted}
              variant={hasSubmitted || isClosed ? "outline" : "default"}
              className={cn(
                "gap-2 w-full sm:w-auto font-bold transition-all",
                !hasSubmitted &&
                  !isClosed &&
                  "bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20",
                hasSubmitted &&
                  !isClosed &&
                  "border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5",
                isClosed &&
                  hasSubmitted &&
                  "border-red-500/20 hover:border-red-500/40 text-red-400 hover:bg-red-500/10",
                isClosed &&
                  !hasSubmitted &&
                  "border-slate-200 dark:border-white/5 text-slate-400 dark:text-white/20"
              )}
            >
              {isClosed ? (
                hasSubmitted ? (
                  <>View Response</>
                ) : (
                  <>Form Closed</>
                )
              ) : hasSubmitted ? (
                <>Update Response</>
              ) : (
                <>Fill Form</>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {detail ? (
        <DynamicFormModal
          detail={detail}
          onClose={() => setDetail(null)}
          onSubmitted={fetchForms}
        />
      ) : null}

      {/* 1. Open Forms Section */}
      {openForms.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-white/5">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Open Placement Forms
            </h2>
            <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold">
              {openForms.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {openForms.map(renderFormCard)}
          </div>
        </div>
      )}

      {/* 2. Submitted & Closed Forms Section */}
      {pastOrClosedForms.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-white/5">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Submitted & Closed Forms
            </h2>
            <span className="text-xs bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
              {pastOrClosedForms.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {pastOrClosedForms.map(renderFormCard)}
          </div>
        </div>
      )}
    </div>
  )
}
