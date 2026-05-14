import { useCallback, useEffect, useState } from 'react'
import type {
  Company,
  FormQuestion,
  FormResponseRecord,
  PlacementFormSummary,
  StudentSummary,
} from '../api/types'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import { downloadBlob, formatDate } from '../lib/format'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Eye,
  Building2,
  FileQuestion,
  FileText,
  Users,
  Unlock,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminPanelSkeleton } from '@/components/modern/Skeleton'

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

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

type AdminData = {
  companies: Company[]
  questions: FormQuestion[]
  forms: PlacementFormSummary[]
  students: StudentSummary[]
}

export function AdminPanel() {
  const { repo } = useAuth()
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Company Form
  const [cName, setCName] = useState('')
  const [cCgpa, setCCgpa] = useState('')
  const [cPkg, setCPkg] = useState('')
  const [cStip, setCStip] = useState('')
  const [cTest, setCTest] = useState('')
  const [cInt, setCInt] = useState('')
  const [cDeadline, setCDeadline] = useState('')

  // Question Form
  const [qText, setQText] = useState('')
  const [qType, setQType] = useState<'text' | 'number' | 'boolean' | 'dropdown'>('text')
  const [qOpts, setQOpts] = useState('')

  // Form Creation
  const [fTitle, setFTitle] = useState('')
  const [fType, setFType] = useState<'consent' | 'tracker' | 'custom'>('custom')
  const [fCompanyId, setFCompanyId] = useState<string>('global')

  // Mapping Form
  const [mapFormId, setMapFormId] = useState<string>('')
  const [mapped, setMapped] = useState<Record<number, boolean>>({})
  const [required, setRequired] = useState<Set<number>>(() => new Set())

  // Export
  const [exportCompanyId, setExportCompanyId] = useState<number | null>(null)
  const [exportFields, setExportFields] = useState<Set<string>>(() => new Set(EXPORT_FIELDS.map((f) => f.key)))

  // Responses Modal
  const [responsesModal, setResponsesModal] = useState<{
    formId: number
    title: string
    rows: FormResponseRecord[]
  } | null>(null)

  // Pending Modal
  const [pendingModal, setPendingModal] = useState<{
    formId: number
    title: string
    students: StudentSummary[]
  } | null>(null)

  // Forms view toggle
  const [showAllForms, setShowAllForms] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const run = async (task: () => Promise<void>, ok?: string) => {
    setBusy(true)
    try {
      await task()
      await load()
      if (ok) toast.success(ok)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
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
        deadline: cDeadline.trim() || null,
      })
      setCName(''); setCCgpa(''); setCPkg(''); setCStip(''); setCTest(''); setCInt(''); setCDeadline('')
    }, 'Company created.')

  const createQuestion = () =>
    run(async () => {
      const options = qOpts.split(',').map(s => s.trim()).filter(Boolean)
      await repo.createQuestion({
        questionText: qText.trim(),
        fieldType: qType,
        options: qType === 'dropdown' ? options : undefined,
      })
      setQText(''); setQOpts('')
    }, 'Question created.')

  const createForm = () =>
    run(async () => {
      await repo.createForm({
        title: fTitle.trim(),
        type: fType,
        companyId: fCompanyId === 'global' ? null : Number(fCompanyId),
      })
      setFTitle('')
    }, 'Form created.')

  const saveMapping = () => {
    if (!mapFormId) return toast.error('Select a form.')
    const questions = Object.entries(mapped)
      .filter(([, on]) => on)
      .map(([id]) => ({
        questionId: Number(id),
        isRequired: required.has(Number(id)),
      }))
    return run(async () => {
      await repo.mapQuestionsToForm(Number(mapFormId), questions)
    }, 'Form questions mapped.')
  }

  const sendForm = () => {
    if (!mapFormId) return toast.error('Select a form.')
    return run(async () => {
      await repo.sendForm(Number(mapFormId))
    }, 'Notifications sent.')
  }

  const verifyStudent = (id: number) =>
    run(async () => {
      await repo.verifyStudent(id)
    }, 'Student verified.')

  const approveUnlock = (id: number) =>
    run(async () => {
      await repo.approveProfileUnlock(id)
    }, 'Unlock request approved. Profile is now unverified.')

  const deleteForm = (formId: number) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) return
    void run(async () => {
      await repo.deleteForm(formId)
    }, 'Form deleted.')
  }

  const toggleCompanyStatus = (companyId: number, currentStatus: string | undefined) =>
    run(async () => {
      const newStatus = currentStatus === 'completed' ? 'ongoing' : 'completed'
      await repo.updateCompanyStatus(companyId, newStatus)
    }, 'Company status updated.')

  const doExportCompany = () => {
    if (exportCompanyId == null) return
    const id = exportCompanyId
    const fields = [...exportFields]
    void run(async () => {
      const bytes = await repo.exportCompany(id, fields)
      downloadBlob(new Blob([bytesToArrayBuffer(bytes)]), `company-${id}.xlsx`)
    })
    setExportCompanyId(null)
  }

  const openResponses = async (formId: number, title: string) => {
    try {
      const rows = await repo.getFormResponses(formId)
      setResponsesModal({ formId, title, rows })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const openPending = async (formId: number, title: string) => {
    try {
      const students = await repo.getPendingStudents(formId)
      setPendingModal({ formId, title, students })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const exportFormExcel = async (formId: number) => {
    try {
      const bytes = await repo.exportFormResponses(formId)
      downloadBlob(new Blob([bytesToArrayBuffer(bytes)]), `form-${formId}-responses.xlsx`)
      toast.success('Download started.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  if (loading) {
    return <AdminPanelSkeleton />
  }

  if (err || !data) {
    return (
      <Card className="glass-panel text-center p-12 max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Admin Panel Error</h3>
        <p className="text-muted-foreground mb-6">{err}</p>
        <Button onClick={load}>Reload Dashboard</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">SPC Dashboard</h1>
        <p className="text-muted-foreground text-sm">Manage recruitment drives, student profiles, and placement forms.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="companies" className="rounded-lg">Companies</TabsTrigger>
          <TabsTrigger value="forms" className="rounded-lg">Forms</TabsTrigger>
          <TabsTrigger value="students" className="rounded-lg">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Active Drives
                </CardTitle>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{data.companies.length}</div>
              </CardHeader>
            </Card>
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4" /> Total Students
                </CardTitle>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{data.students.length}</div>
              </CardHeader>
            </Card>
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Forms Shared
                </CardTitle>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{data.forms.length}</div>
              </CardHeader>
            </Card>
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <FileQuestion className="w-4 h-4" /> Question Bank
                </CardTitle>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{data.questions.length}</div>
              </CardHeader>
            </Card>
          </div>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Recent Companies</CardTitle>
              <CardDescription className="text-muted-foreground">Latest placement opportunities added to the portal.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100 dark:bg-white/5">
                    <TableRow className="border-slate-200 dark:border-white/10 hover:bg-transparent">
                      <TableHead className="text-text-main font-bold">Company</TableHead>
                      <TableHead className="text-text-main font-bold">Min CGPA</TableHead>
                      <TableHead className="text-text-main font-bold">Package</TableHead>
                      <TableHead className="text-text-main font-bold">Test Date</TableHead>
                      <TableHead className="text-right text-text-main font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.companies.slice(0, 5).map(c => (
                      <TableRow key={c.id} className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:bg-white/5">
                        <TableCell className="font-bold text-slate-900 dark:text-white">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground">{c.minCgpa.toFixed(1)}</TableCell>
                        <TableCell className="text-muted-foreground">{c.package || 'TBD'}</TableCell>
                        <TableCell className="text-muted-foreground">{c.testDate ? formatDate(c.testDate) : 'TBD'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setExportCompanyId(c.id)} className="hover:bg-slate-200 dark:bg-white/10 text-primary">
                            <Download className="w-4 h-4 mr-1" /> Export
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> Create Drive
              </CardTitle>
              <CardDescription className="text-muted-foreground">Add a new company recruitment drive details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-text-main">Company Name</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="e.g. Google" value={cName} onChange={e => setCName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-text-main">Min CGPA</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" type="number" step="0.1" placeholder="e.g. 7.5" value={cCgpa} onChange={e => setCCgpa(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-text-main">Package</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="e.g. 25 LPA" value={cPkg} onChange={e => setCPkg(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-text-main">Stipend</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="e.g. 50k / month" value={cStip} onChange={e => setCStip(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-text-main">Test Date (YYYY-MM-DD)</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="2026-06-15" value={cTest} onChange={e => setCTest(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-text-main">Interview Date (YYYY-MM-DD)</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="2026-06-20" value={cInt} onChange={e => setCInt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-text-main">Deadline (YYYY-MM-DD HH:MM)</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="2026-06-14 23:59" value={cDeadline} onChange={e => setCDeadline(e.target.value)} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end p-6 border-t border-slate-200 dark:border-white/10">
              <Button onClick={createCompany} disabled={busy || !cName}>Add Company</Button>
            </CardFooter>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Manage Drives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100 dark:bg-white/5">
                    <TableRow className="border-slate-200 dark:border-white/10 hover:bg-transparent">
                      <TableHead className="text-text-main font-bold">Company</TableHead>
                      <TableHead className="text-text-main font-bold">Package</TableHead>
                      <TableHead className="text-text-main font-bold">Stipend</TableHead>
                      <TableHead className="text-text-main font-bold">Min CGPA</TableHead>
                      <TableHead className="text-text-main font-bold">Status</TableHead>
                      <TableHead className="text-right text-text-main font-bold">Export</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.companies.map(c => (
                      <TableRow key={c.id} className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:bg-white/5">
                        <TableCell className="font-bold text-primary">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground">{c.package || 'TBD'}</TableCell>
                        <TableCell className="text-muted-foreground">{c.stipend || 'TBD'}</TableCell>
                        <TableCell className="text-muted-foreground">{c.minCgpa}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'completed' ? 'outline' : 'default'} className={cn("cursor-pointer", c.status === 'completed' ? "text-amber-400 border-amber-400/20 bg-amber-400/10" : "bg-green-500/20 text-green-400 hover:bg-green-500/30")} onClick={() => void toggleCompanyStatus(c.id, c.status)}>
                            {c.status === 'completed' ? 'Completed' : 'Ongoing'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setExportCompanyId(c.id)} className="hover:bg-slate-200 dark:bg-white/10">
                            <Download className="w-4 h-4 text-primary" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" /> Add Question
                </CardTitle>
                <CardDescription className="text-muted-foreground">Create reusable fields for your forms.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-text-main">Question Label</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="e.g. Current Location" value={qText} onChange={e => setQText(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-text-main">Field Type</Label>
                  <Select
                    value={qType}
                    onValueChange={(v) => setQType(v as 'text' | 'number' | 'boolean' | 'dropdown')}
                  >
                    <SelectTrigger className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                      <SelectItem value="text">Plain Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Yes / No</SelectItem>
                      <SelectItem value="dropdown">Dropdown Options</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {qType === 'dropdown' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label className="text-text-main">Options (comma separated)</Label>
                    <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="Bangalore, Pune, Hyderabad" value={qOpts} onChange={e => setQOpts(e.target.value)} />
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-end border-t border-slate-200 dark:border-white/10 p-6">
                <Button onClick={createQuestion} disabled={busy || !qText}>Create Question</Button>
              </CardFooter>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" /> Create Form
                </CardTitle>
                <CardDescription className="text-muted-foreground">Group questions into a fillable form.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-text-main">Form Title</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="e.g. Pre-Placement Survey" value={fTitle} onChange={e => setFTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-text-main">Form Type</Label>
                    <Select
                      value={fType}
                      onValueChange={(v) => setFType(v as 'consent' | 'tracker' | 'custom')}
                    >
                      <SelectTrigger className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                        <SelectItem value="consent">Consent</SelectItem>
                        <SelectItem value="tracker">Tracker</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-text-main">Link to Drive</Label>
                    <Select value={fCompanyId} onValueChange={setFCompanyId}>
                      <SelectTrigger className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                        <SelectItem value="global">Global (All Students)</SelectItem>
                        {data.companies.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t border-slate-200 dark:border-white/10 p-6">
                <Button onClick={createForm} disabled={busy || !fTitle}>Create Form</Button>
              </CardFooter>
            </Card>
          </div>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Map Questions & Publish</CardTitle>
                <CardDescription className="text-muted-foreground">Select questions for a form and notify students.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={saveMapping} disabled={busy || !mapFormId} className="border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5">Save Mapping</Button>
                <Button onClick={sendForm} disabled={busy || !mapFormId} className="gap-2">
                  <Send className="w-4 h-4" /> Notify
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="max-w-md">
                <Label className="mb-2 block text-text-main">Active Form</Label>
                <Select value={mapFormId} onValueChange={setMapFormId}>
                  <SelectTrigger className="w-full font-bold bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Select a form to configure" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                    {data.forms.map(f => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.questions.map(q => (
                  <div key={q.id} className={cn(
                    "p-4 rounded-xl border transition-all",
                    mapped[q.id] ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" : "border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 opacity-60"
                  )}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <p className="font-bold leading-none text-slate-900 dark:text-white">{q.questionText}</p>
                        <p className="text-[10px] uppercase font-bold text-primary tracking-wider">{q.fieldType}</p>
                      </div>
                      <Checkbox 
                        className="border-slate-200 dark:border-white/20 data-[state=checked]:bg-primary"
                        checked={mapped[q.id] || false} 
                        onCheckedChange={v => setMapped(m => ({...m, [q.id]: !!v}))} 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id={`req-${q.id}`}
                        className="border-slate-200 dark:border-white/20 data-[state=checked]:bg-primary"
                        disabled={!mapped[q.id]}
                        checked={required.has(q.id)}
                        onCheckedChange={v => setRequired(prev => {
                          const n = new Set(prev);
                          if(v) n.add(q.id); else n.delete(q.id);
                          return n;
                        })}
                      />
                      <Label htmlFor={`req-${q.id}`} className={cn("text-xs", mapped[q.id] ? "text-text-main" : "text-muted-foreground")}>Required field</Label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>View Submissions & Pending</CardTitle>
                <CardDescription className="text-muted-foreground">Monitor student participation and download data.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setShowAllForms(!showAllForms)} className="border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5">
                {showAllForms ? 'Show Recent Only' : 'View All Forms'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(showAllForms ? data.forms : data.forms.slice(0, 10)).map(f => (
                  <div key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{f.responseCount || 0} responses</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => void openResponses(f.id, f.title)} className="border-slate-200 dark:border-white/20 text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-white/10 gap-2">
                        <Eye className="w-4 h-4" /> Responses
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void openPending(f.id, f.title)} className="border-slate-200 dark:border-white/20 text-amber-400 hover:bg-amber-400/10 gap-2">
                        <Users className="w-4 h-4" /> Pending
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void exportFormExcel(f.id)} className="border-slate-200 dark:border-white/20 text-primary hover:bg-primary/10 gap-2">
                        <Download className="w-4 h-4" /> Excel
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteForm(f.id)} className="text-red-400 hover:bg-red-400/10 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Student Verification</CardTitle>
              <CardDescription className="text-muted-foreground">Verify profiles to prevent further edits before sharing data with companies.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.students.map(s => (
                  <Card key={s.id} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-none">
                    <CardContent className="p-4 flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {s.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-slate-900 dark:text-white">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.collegeEmailId}</p>
                        </div>
                      </div>
                      {s.unlockRequested ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full text-amber-400 border-amber-400/20 bg-amber-400/10 hover:bg-amber-400/20 gap-2"
                          disabled={busy}
                          onClick={() => void approveUnlock(s.id)}
                        >
                          <Unlock className="w-4 h-4" /> Approve Unlock
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant={s.verified ? "ghost" : "default"}
                          className={cn("w-full", s.verified ? "text-green-400 bg-green-400/10 hover:bg-green-400/20" : "bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20")}
                          disabled={s.verified || busy}
                          onClick={() => void verifyStudent(s.id)}
                        >
                          {s.verified ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Verified</> : "Verify Profile"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {exportCompanyId != null && (
        <Dialog open={true} onOpenChange={() => setExportCompanyId(null)}>
          <DialogContent className="glass-panel text-slate-900 dark:text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Configure Export</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Select optional columns to include in the Excel sheet.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {EXPORT_FIELDS.map(f => (
                <div key={f.key} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`field-${f.key}`} 
                    className="border-slate-200 dark:border-white/20"
                    checked={exportFields.has(f.key)}
                    onCheckedChange={v => setExportFields(prev => {
                      const n = new Set(prev);
                      if(v) n.add(f.key); else n.delete(f.key);
                      return n;
                    })}
                  />
                  <Label htmlFor={`field-${f.key}`} className="text-sm cursor-pointer text-text-main">{f.label}</Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setExportCompanyId(null)} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5">Cancel</Button>
              <Button onClick={doExportCompany} className="gap-2 bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20">
                <Download className="w-4 h-4" /> Start Export
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {responsesModal && (
        <Dialog open={true} onOpenChange={() => setResponsesModal(null)}>
          <DialogContent className="glass-panel text-slate-900 dark:text-white max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">{responsesModal.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground">Viewing raw student submissions for this form.</DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 p-6 pt-2">
              {responsesModal.rows.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">No responses recorded yet.</div>
              ) : (
                <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100 dark:bg-white/5">
                      <TableRow className="border-slate-200 dark:border-white/10">
                        <TableHead className="font-bold whitespace-nowrap text-text-main">Name</TableHead>
                        <TableHead className="font-bold whitespace-nowrap text-text-main">USN</TableHead>
                        {responsesModal.rows[0].answers.map(a => (
                          <TableHead key={a.id} className="font-bold whitespace-nowrap text-text-main">{a.questionText}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responsesModal.rows.map((r, i) => (
                        <TableRow key={i} className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:bg-white/5">
                          <TableCell className="font-medium whitespace-nowrap text-slate-900 dark:text-white">{r.studentName}</TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">{r.usn}</TableCell>
                          {r.answers.map(a => (
                            <TableCell key={a.id} className="text-muted-foreground whitespace-nowrap">{a.answer ?? '—'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="p-6 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
              <Button variant="ghost" onClick={() => setResponsesModal(null)} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5">Close</Button>
              {responsesModal.rows.length > 0 && (
                <Button onClick={() => void exportFormExcel(responsesModal.formId)} className="gap-2 bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20">
                  <Download className="w-4 h-4" /> Download Excel
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {pendingModal && (
        <Dialog open={true} onOpenChange={() => setPendingModal(null)}>
          <DialogContent className="glass-panel text-slate-900 dark:text-white max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">Pending Submissions</DialogTitle>
              <DialogDescription className="text-muted-foreground">Students who have not yet submitted "{pendingModal.title}".</DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 p-6 pt-2">
              {pendingModal.students.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">All eligible students have submitted this form!</div>
              ) : (
                <div className="space-y-4">
                  {pendingModal.students.map(s => (
                    <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.usn || s.collegeEmailId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <DialogFooter className="p-6 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
              <Button onClick={() => setPendingModal(null)} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5" variant="ghost">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
