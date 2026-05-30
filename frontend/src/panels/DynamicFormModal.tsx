import { useMemo, useState } from 'react'
import type { PlacementFormDetail } from '@/types'
import { useFormStore } from '../store/useFormStore'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from '@/components/ui/scroll-area'

export function DynamicFormModal({
  detail,
  onClose,
  onSubmitted,
}: {
  detail: PlacementFormDetail
  onClose: () => void
  onSubmitted: () => void
}) {
  const submitResponse = useFormStore((state) => state.submitResponse)
  const uploadFile = useFormStore((state) => state.uploadFile)
  const [saving, setSaving] = useState(false)

  const initial = useMemo(() => {
    const cached = localStorage.getItem(`form_draft_${detail.summary.id}`)
    if (cached) {
      try {
        return JSON.parse(cached) as Record<number, string>
      } catch {
        // ignore
      }
    }
    const m: Record<number, string> = {}
    for (const q of detail.questions) {
      m[q.id] = q.answer ?? ''
    }
    return m
  }, [detail])

  const [values, setValues] = useState<Record<number, string>>(initial)

  const setVal = (id: number, v: string) => {
    setValues((prev) => {
      const next = { ...prev, [id]: v }
      localStorage.setItem(`form_draft_${detail.summary.id}`, JSON.stringify(next))
      return next
    })
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
      toast.error('Please fill all required fields.')
      return
    }

    setSaving(true)
    try {
      await submitResponse(detail.summary.id, answers)
      toast.success('Responses submitted successfully.')
      localStorage.removeItem(`form_draft_${detail.summary.id}`)
      onSubmitted()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass-panel text-slate-900 dark:text-white sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <DialogTitle className="text-2xl text-slate-900 dark:text-white">{detail.summary.title}</DialogTitle>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 text-[10px] uppercase font-bold">
              {detail.summary.type}
            </Badge>
          </div>
          <DialogDescription className="text-muted-foreground">
            {detail.summary.companyName ?? 'Global Placement Form'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6 pb-6">
            {detail.summary.acceptingResponses === false && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <div>
                  <p className="font-bold text-sm">Not Accepting Responses</p>
                  <p className="text-xs opacity-90">The host has closed this form. You can view your answers but cannot submit new edits.</p>
                </div>
              </div>
            )}

            {detail.questions.map((q) => (
              <div key={q.id} className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-1 text-slate-900 dark:text-white">
                  {q.questionText}
                  {q.isRequired && <span className="text-red-400">*</span>}
                </Label>
                
                {q.fieldType === 'text' || q.fieldType === 'number' ? (
                  <Input
                    type={q.fieldType === 'number' ? 'number' : 'text'}
                    value={values[q.id] ?? ''}
                    onChange={(e) => setVal(q.id, e.target.value)}
                    placeholder={`Enter ${q.questionText.toLowerCase()}...`}
                    disabled={detail.summary.acceptingResponses === false}
                    className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-primary/50"
                  />
                ) : q.fieldType === 'boolean' ? (
                  <Select
                    value={values[q.id]}
                    disabled={detail.summary.acceptingResponses === false}
                    onValueChange={(v) => setVal(q.id, v)}
                  >
                    <SelectTrigger className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : q.fieldType === 'file' ? (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <Input
                        type="file"
                        disabled={detail.summary.acceptingResponses === false}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const toastId = toast.loading(`Uploading "${file.name}"...`)
                          try {
                            const res = await uploadFile(file, q.folderLink)
                            setVal(q.id, res.fileUrl)
                            toast.success(`Uploaded "${file.name}" successfully!`, { id: toastId })
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : String(err), { id: toastId })
                          }
                        }}
                        className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-primary/50 cursor-pointer flex-1"
                      />
                      {q.folderLink && (
                        <a 
                          href={q.folderLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all whitespace-nowrap"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                          Open Folder Link
                        </a>
                      )}
                    </div>
                    {values[q.id] && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium truncate flex items-center gap-1.5 bg-green-50 dark:bg-green-950/20 p-2.5 rounded-lg border border-green-100 dark:border-green-900/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Uploaded successfully! Link: <a href={values[q.id]} target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-green-700">{values[q.id]}</a>
                      </p>
                    )}
                  </div>
                ) : (
                  <Select
                    value={values[q.id]}
                    disabled={detail.summary.acceptingResponses === false}
                    onValueChange={(v) => setVal(q.id, v)}
                  >
                    <SelectTrigger className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                      <SelectValue placeholder="Choose one..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                      {q.options.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5">
            Cancel
          </Button>
          <Button 
            onClick={() => void submit()} 
            disabled={saving || detail.summary.acceptingResponses === false} 
            className="shadow-lg shadow-primary/20"
          >
            {detail.summary.acceptingResponses === false ? 'Form Closed' : (saving ? 'Submitting...' : 'Submit Responses')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
