import { useEffect, useState } from 'react'
import type { PlacementFormDetail, PlacementFormSummary } from '../api/types'
import { useFormStore } from '../store/useFormStore'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DynamicFormModal } from './DynamicFormModal'
import { ClipboardList, MessageSquareText, FileQuestion, CheckCircle2, AlertCircle, Globe, Building } from 'lucide-react'
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

  return (
    <div className="space-y-6 pb-20 lg:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {detail ? (
        <DynamicFormModal
          detail={detail}
          onClose={() => setDetail(null)}
          onSubmitted={fetchForms}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6">
        {forms.map((f) => (
          <Card key={f.id} className="glass-panel hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2 text-slate-900 dark:text-white">
                    {f.title}
                    {(f.responseCount ?? 0) > 0 && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {f.companyName ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Building className="w-3 h-3" /> {f.companyName}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-primary">
                        <Globe className="w-3 h-3" /> Global Form
                      </span>
                    )}
                    <span className="text-slate-400 dark:text-white/20">•</span>
                    <span className="uppercase font-bold tracking-widest text-[10px] bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500 dark:text-white/60">
                      {f.type}
                    </span>
                  </CardDescription>
                </div>
                <Button
                  onClick={() => void openForm(f)}
                  variant={(f.responseCount ?? 0) > 0 ? "outline" : "default"}
                  className={cn(
                    "gap-2 w-full sm:w-auto",
                    (f.responseCount ?? 0) === 0 && "bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20",
                    (f.responseCount ?? 0) > 0 && "border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5"
                  )}
                >
                  {(f.responseCount ?? 0) > 0 ? (
                    <>Update Response</>
                  ) : (
                    <>Fill Form</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 border-t border-slate-200 dark:border-white/5 pt-4 mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileQuestion className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold text-slate-900 dark:text-white">{f.questionCount ?? 0}</span>
                  <span className="text-muted-foreground">Questions</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquareText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold text-slate-900 dark:text-white">{f.responseCount ?? 0}</span>
                  <span className="text-muted-foreground">Responses</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
