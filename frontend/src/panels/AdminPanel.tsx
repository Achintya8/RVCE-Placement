import { useCallback, useEffect, useState } from 'react'
import type {
  Company,
  FormQuestion,
  FormResponseRecord,
  PlacementFormSummary,
  StudentSummary,
} from '@/types'
import { repo } from '../store/useAuthStore'
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
import { Switch } from "@/components/ui/switch"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Eye,
  Building2,
  FileQuestion,
  FileText,
  Users,
  Unlock,
  Trash2,
  Clock,
  ChevronDown,
  ChevronRight
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
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Expanded companies in Manage Drives table
  const [expandedCompanyIds, setExpandedCompanyIds] = useState<Set<number>>(new Set())

  const toggleExpandCompany = (id: number) => {
    setExpandedCompanyIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Company Form
  const [cName, setCName] = useState('')
  const [cCgpa, setCCgpa] = useState('')
  const [cPkg, setCPkg] = useState('')
  const [cStip, setCStip] = useState('')
  const [cTest, setCTest] = useState('')
  const [cInt, setCInt] = useState('')
  const [cDeadline, setCDeadline] = useState('')

  // Google Forms Style Form Builder State
  interface BuilderQuestion {
    id: string
    questionText: string
    fieldType: 'text' | 'number' | 'boolean' | 'dropdown' | 'file'
    options: string
    folderLink?: string
    isRequired: boolean
  }

  const [fTitle, setFTitle] = useState('')
  const [fFormType, setFFormType] = useState<'general' | 'company'>('general')
  const [fCompanyId, setFCompanyId] = useState<string>('')
  const [formQuestions, setFormQuestions] = useState<BuilderQuestion[]>([
    { id: 'q-1', questionText: '', fieldType: 'text', options: '', folderLink: '', isRequired: false }
  ])

  // Export
  const [exportCompanyId, setExportCompanyId] = useState<number | null>(null)
  const [exportFields, setExportFields] = useState<Set<string>>(() => new Set(EXPORT_FIELDS.map((f) => f.key)))
  const [companyExportFormQuestions, setCompanyExportFormQuestions] = useState<FormQuestion[]>([])
  const [loadingExportQuestions, setLoadingExportQuestions] = useState(false)

  useEffect(() => {
    if (exportCompanyId == null) {
      setCompanyExportFormQuestions([])
      return
    }

    // Initialize base export fields
    setExportFields(new Set(EXPORT_FIELDS.map(f => f.key)))

    const companyForm = data?.forms.find(f => f.companyId === exportCompanyId)
    if (!companyForm) {
      setCompanyExportFormQuestions([])
      return
    }

    setLoadingExportQuestions(true)
    repo.getForm(companyForm.id)
      .then(detail => {
        setCompanyExportFormQuestions(detail.questions)
        // Add all form questions to the export fields set by default
        setExportFields(prev => {
          const next = new Set(prev)
          detail.questions.forEach(q => next.add(`question_${q.id}`))
          return next
        })
      })
      .catch(err => {
        console.error('Failed to load export form questions:', err)
        toast.error('Failed to load form questions.')
      })
      .finally(() => {
        setLoadingExportQuestions(false)
      })
  }, [exportCompanyId, data?.forms])

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

  // Verification Modal
  const [reviewStudent, setReviewStudent] = useState<StudentSummary | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

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
  }, [])

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

  const addBuilderQuestion = () => {
    setFormQuestions(prev => [
      ...prev,
      {
        id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        questionText: '',
        fieldType: 'text',
        options: '',
        folderLink: '',
        isRequired: false
      }
    ])
  }

  const removeBuilderQuestion = (id: string) => {
    if (formQuestions.length <= 1) {
      toast.error('A form must have at least one question.')
      return
    }
    setFormQuestions(prev => prev.filter(q => q.id !== id))
  }

  const updateBuilderQuestion = (id: string, updates: Partial<BuilderQuestion>) => {
    setFormQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, ...updates } : q))
    )
  }

  const createGoogleForm = () => {
    if (!fTitle.trim()) {
      return toast.error('Form Title is required.')
    }
    if (fFormType === 'company' && !fCompanyId) {
      return toast.error('Please select a linked company.')
    }
    if (formQuestions.length === 0) {
      return toast.error('Please add at least one question.')
    }

    // Question Validation
    for (let i = 0; i < formQuestions.length; i++) {
      const q = formQuestions[i]
      if (!q.questionText.trim()) {
        return toast.error(`Question #${i + 1} label is empty.`)
      }
      if (q.fieldType === 'dropdown' && !q.options.trim()) {
        return toast.error(`Question #${i + 1} (Dropdown) needs at least one option.`)
      }
      if (q.fieldType === 'file' && !q.folderLink?.trim()) {
        return toast.error(`Question #${i + 1} (File Upload) requires a Google Drive folder link.`)
      }
    }

    return run(async () => {
      // 1. Create the Form
      const createdForm = await repo.createForm({
        title: fTitle.trim(),
        type: 'custom', // Default type is 'custom' for general forms
        companyId: fFormType === 'general' ? null : Number(fCompanyId),
      })

      const formId = (createdForm as any)?.id
      if (!formId) {
        throw new Error('Failed to retrieve form ID from the created form.')
      }

      // 2. Create Questions and map them
      const mappedQuestionsPayload: { questionId: number; isRequired: boolean }[] = []

      // Create sequentially to ensure order of questions matches insertion
      for (const q of formQuestions) {
        const parsedOptions = q.fieldType === 'dropdown'
          ? q.options.split(',').map(s => s.trim()).filter(Boolean)
          : undefined

        const createdQuestion = await repo.createQuestion({
          questionText: q.questionText.trim(),
          fieldType: q.fieldType,
          options: parsedOptions,
          folderLink: q.fieldType === 'file' ? q.folderLink?.trim() || null : null,
        })

        const qId = (createdQuestion as any)?.id
        if (qId) {
          mappedQuestionsPayload.push({
            questionId: qId,
            isRequired: q.isRequired
          })
        }
      }

      // 3. Map questions to form
      await repo.mapQuestionsToForm(formId, mappedQuestionsPayload)

      // 4. Send/assign form to students
      await repo.sendForm(formId)

      // Reset state
      setFTitle('')
      setFFormType('general')
      setFCompanyId('')
      setFormQuestions([
        { id: 'q-1', questionText: '', fieldType: 'text', options: '', folderLink: '', isRequired: false }
      ])
    }, 'Form created and published to students successfully!')
  }

  const handleRejectStudent = async () => {
    if (!reviewStudent || !rejectReason.trim()) return
    setRejecting(true)
    try {
      await repo.rejectStudent(reviewStudent.id, rejectReason.trim())
      toast.success('Student profile rejected. They have been notified.')
      setReviewStudent(null)
      setRejectReason('')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRejecting(false)
    }
  }

  const handleVerifyStudent = async () => {
    if (!reviewStudent) return
    setRejecting(true)
    try {
      await repo.verifyStudent(reviewStudent.id)
      toast.success('Student verified and locked.')
      setReviewStudent(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRejecting(false)
    }
  }

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

  const handleToggleResponses = (formId: number, checked: boolean) => {
    void run(async () => {
      await repo.toggleFormResponses(formId, checked)
    }, checked ? 'Form is now accepting student responses.' : 'Form is now closed to new responses.')
  }

  const toggleCompanyStatus = (companyId: number, currentStatus: string | undefined) =>
    run(async () => {
      const newStatus = currentStatus === 'completed' ? 'ongoing' : 'completed'
      await repo.updateCompanyStatus(companyId, newStatus)
    }, 'Company status updated.')

  const toggleCompanyBlock = (companyId: number, type: 'consent' | 'tracker', currentVal: boolean) =>
    run(async () => {
      if (!data) return
      const company = data.companies.find((c) => c.id === companyId)
      if (!company) return
      const consentBlocked = type === 'consent' ? !currentVal : (company.consentBlocked ?? false)
      const trackerBlocked = type === 'tracker' ? !currentVal : (company.trackerBlocked ?? false)
      await repo.updateCompanyBlocks(companyId, consentBlocked, trackerBlocked)
    }, `Company ${type === 'consent' ? 'consent' : 'tracker'} block updated.`)

  const doExportCompany = () => {
    if (exportCompanyId == null) return
    const id = exportCompanyId
    const fields = [...exportFields]
    const company = data?.companies.find((c) => c.id === id)
    const companyName = company ? company.name.replace(/[^a-zA-Z0-9]/g, '_') : `company-${id}`

    void run(async () => {
      const bytes = await repo.exportCompany(id, fields)
      downloadBlob(new Blob([bytesToArrayBuffer(bytes)]), `${companyName}.xlsx`)
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

  // 1. Open Forms Count
  const openFormsCount = data.forms.filter(f => {
    if (!f.companyId) return true; // General forms are always open
    const company = data.companies.find(c => c.id === f.companyId);
    if (!company) return true;
    if (company.status === 'completed') return false;
    if (company.deadline && new Date(company.deadline) < new Date()) return false;
    return true;
  }).length;



  // 3. Sum of all pending submissions across all active/open forms
  let totalPendingSubmissions = 0;
  data.forms.forEach(f => {
    let isOpen = true;
    if (f.companyId) {
      const company = data.companies.find(c => c.id === f.companyId);
      if (company) {
        if (company.status === 'completed') isOpen = false;
        if (company.deadline && new Date(company.deadline) < new Date()) isOpen = false;
      }
    }
    if (!isOpen) return;

    let assignedCount: number;
    if (!f.companyId) {
      assignedCount = data.students.length;
    } else {
      const company = data.companies.find(c => c.id === f.companyId);
      if (company) {
        assignedCount = data.students.filter(s => s.ugCgpa >= company.minCgpa).length;
      } else {
        assignedCount = data.students.length;
      }
    }

    const submittedCount = f.responseCount || 0;
    const pendingForForm = Math.max(0, assignedCount - submittedCount);
    totalPendingSubmissions += pendingForForm;
  });

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <FileText className="w-4 h-4" /> Open Forms
                </CardTitle>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{openFormsCount}</div>
              </CardHeader>
            </Card>
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Pending Submissions
                </CardTitle>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{totalPendingSubmissions}</div>
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
                      <TableHead className="text-text-main font-bold hidden md:table-cell">Package</TableHead>
                      <TableHead className="text-text-main font-bold hidden md:table-cell">Stipend</TableHead>
                      <TableHead className="text-text-main font-bold hidden md:table-cell">Min CGPA</TableHead>
                      <TableHead className="text-text-main font-bold hidden md:table-cell">Status</TableHead>
                      <TableHead className="text-text-main font-bold">Block Consent</TableHead>
                      <TableHead className="text-text-main font-bold">Block Tracker</TableHead>
                      <TableHead className="text-right text-text-main font-bold">Export</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.companies.map(c => {
                      const isExpanded = expandedCompanyIds.has(c.id)
                      return (
                        <>
                          <TableRow key={c.id} className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:bg-white/5">
                            <TableCell 
                              className="font-bold text-primary cursor-pointer hover:underline select-none md:cursor-default md:hover:no-underline"
                              onClick={() => toggleExpandCompany(c.id)}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="md:hidden">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </span>
                                {c.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground hidden md:table-cell">{c.package || 'TBD'}</TableCell>
                            <TableCell className="text-muted-foreground hidden md:table-cell">{c.stipend || 'TBD'}</TableCell>
                            <TableCell className="text-muted-foreground hidden md:table-cell">{c.minCgpa}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant={c.status === 'completed' ? 'outline' : 'default'} className={cn("cursor-pointer", c.status === 'completed' ? "text-amber-400 border-amber-400/20 bg-amber-400/10" : "bg-green-500/20 text-green-400 hover:bg-green-500/30")} onClick={() => void toggleCompanyStatus(c.id, c.status)}>
                                {c.status === 'completed' ? 'Completed' : 'Ongoing'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={c.consentBlocked ?? false}
                                onCheckedChange={() => void toggleCompanyBlock(c.id, 'consent', c.consentBlocked ?? false)}
                                disabled={busy}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={c.trackerBlocked ?? false}
                                onCheckedChange={() => void toggleCompanyBlock(c.id, 'tracker', c.trackerBlocked ?? false)}
                                disabled={busy}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setExportCompanyId(c.id)} className="hover:bg-slate-200 dark:bg-white/10">
                                <Download className="w-4 h-4 text-primary" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:bg-transparent md:hidden">
                              <TableCell colSpan={4} className="p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Package</span>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.package || 'TBD'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stipend</span>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.stipend || 'TBD'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Min CGPA</span>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.minCgpa}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
                                    <div>
                                      <Badge 
                                        variant={c.status === 'completed' ? 'outline' : 'default'} 
                                        className={cn("cursor-pointer mt-0.5", c.status === 'completed' ? "text-amber-400 border-amber-400/20 bg-amber-400/10" : "bg-green-500/20 text-green-400 hover:bg-green-500/30")} 
                                        onClick={() => void toggleCompanyStatus(c.id, c.status)}
                                      >
                                        {c.status === 'completed' ? 'Completed' : 'Ongoing'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-10">
          <Card className="glass-panel border-slate-200 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6 bg-slate-50/50 dark:bg-white/5">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                  <FileText className="w-6 h-6 text-primary" /> Create Custom Form
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                  Design a new form, add custom questions, and assign it to students in a single flow.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              {/* Form Metadata Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-200/60 dark:border-white/5">
                <div className="space-y-2">
                  <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Form Title</Label>
                  <Input 
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11" 
                    placeholder="e.g. Pre-Placement Survey" 
                    value={fTitle} 
                    onChange={e => setFTitle(e.target.value)} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Type</Label>
                    <Select
                      value={fFormType}
                      onValueChange={(v) => {
                        setFFormType(v as 'general' | 'company');
                        if (v === 'general') setFCompanyId('');
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                        <SelectItem value="general">General (All Students)</SelectItem>
                        <SelectItem value="company">Company Specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {fFormType === 'company' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                      <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Company</Label>
                      <Select value={fCompanyId} onValueChange={setFCompanyId}>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11">
                          <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                          {data?.companies.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Questions Builder List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    Questions ({formQuestions.length})
                  </h3>
                </div>

                <div className="space-y-6">
                  {formQuestions.map((q, idx) => (
                    <div 
                      key={q.id} 
                      className="group relative p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 border-l-4 border-l-primary shadow-md hover:shadow-lg transition-all duration-300 space-y-5"
                    >
                      {/* Question Index Badge */}
                      <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary dark:bg-primary/20 text-xs font-bold">
                        <FileQuestion className="w-3.5 h-3.5" /> Question {idx + 1}
                      </span>
                      
                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeBuilderQuestion(q.id)}
                        disabled={formQuestions.length <= 1}
                        className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full border border-transparent hover:border-red-100 dark:hover:border-red-950/20 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        title="Remove question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-6 px-4">
                        {/* Question Text */}
                        <div className="md:col-span-8 space-y-2">
                          <Label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Question Label</Label>
                          <Input 
                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11"
                            placeholder="e.g. In which city are you currently located?" 
                            value={q.questionText} 
                            onChange={e => updateBuilderQuestion(q.id, { questionText: e.target.value })}
                          />
                        </div>

                        {/* Field Type Selector */}
                        <div className="md:col-span-4 space-y-2">
                          <Label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Field Type</Label>
                          <Select
                            value={q.fieldType}
                            onValueChange={(v) => updateBuilderQuestion(q.id, { fieldType: v as any })}
                          >
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                              <SelectItem value="text">Plain Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="boolean">Yes / No</SelectItem>
                              <SelectItem value="dropdown">Dropdown Options</SelectItem>
                              <SelectItem value="file">File Upload</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Dropdown Options List */}
                      {q.fieldType === 'dropdown' && (
                        <div className="px-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                          <Label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Options (comma separated)</Label>
                          <Input 
                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11"
                            placeholder="e.g. Bangalore, Pune, Hyderabad" 
                            value={q.options} 
                            onChange={e => updateBuilderQuestion(q.id, { options: e.target.value })}
                          />
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">Provide comma-separated values to define the items in the dropdown menu.</p>
                        </div>
                      )}

                      {/* File Upload Folder Link Input */}
                      {q.fieldType === 'file' && (
                        <div className="px-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                          <Label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Google Drive Folder Link</Label>
                          <Input 
                            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11"
                            placeholder="e.g. https://drive.google.com/drive/folders/..." 
                            value={q.folderLink || ''} 
                            onChange={e => updateBuilderQuestion(q.id, { folderLink: e.target.value })}
                          />
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">Provide the Google Drive folder link where student uploads will be stored.</p>
                        </div>
                      )}

                      {/* Required Toggle */}
                      <div className="px-4 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-white/5 max-w-fit transition-colors">
                        <Checkbox 
                          id={`req-${q.id}`}
                          className="border-slate-300 dark:border-white/20 data-[state=checked]:bg-primary size-4"
                          checked={q.isRequired}
                          onCheckedChange={v => updateBuilderQuestion(q.id, { isRequired: !!v })}
                        />
                        <Label htmlFor={`req-${q.id}`} className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none">
                          Required field (Student must answer this field to submit)
                        </Label>
                      </div>
                    </div>
                  ))}

                  {/* Add New Question Button Card */}
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={addBuilderQuestion}
                    className="w-full py-7 border-dashed border-2 border-slate-200 dark:border-white/10 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all rounded-2xl flex items-center justify-center gap-2 font-bold text-sm bg-transparent shadow-none"
                  >
                    <Plus className="w-5 h-5 text-primary" /> Add New Question
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-slate-200 dark:border-white/10 p-6 bg-slate-50/50 dark:bg-white/5 rounded-b-2xl">
              <Button 
                onClick={createGoogleForm} 
                disabled={busy || !fTitle.trim()} 
                className="w-full sm:w-auto px-8 py-6 rounded-xl font-bold bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 transform active:scale-98"
              >
                Create & Publish Form
              </Button>
            </CardFooter>
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
                  <div key={f.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 transition-colors">
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                          {f.title}
                          {f.acceptingResponses === false && (
                            <Badge variant="outline" className="text-[10px] border-red-500/20 bg-red-500/10 text-red-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Closed
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{f.responseCount || 0} responses</p>
                      </div>
                      
                      {/* Accepting Responses Switch */}
                      <div className="flex items-center gap-2.5 sm:ml-auto border border-slate-200 dark:border-white/10 p-2 rounded-xl bg-slate-50/50 dark:bg-white/5 px-3 max-w-fit shadow-inner">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {f.acceptingResponses !== false ? "Accepting responses" : "Closed"}
                        </span>
                        <Switch 
                          checked={f.acceptingResponses !== false} 
                          onCheckedChange={(checked) => handleToggleResponses(f.id, checked)}
                          disabled={busy}
                        />
                      </div>
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
                          className={cn("w-full", s.verified ? "text-green-500 bg-green-400/10 hover:bg-green-400/20 dark:text-green-300" : "shadow-lg shadow-primary/20")}
                          disabled={busy}
                          onClick={() => setReviewStudent(s)}
                        >
                          {s.verified ? <><CheckCircle2 className="w-4 h-4 mr-2" /> View Verified Profile</> : "Review Profile"}
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

            {loadingExportQuestions ? (
              <div className="py-4 text-center text-sm text-muted-foreground animate-pulse border-t border-slate-200 dark:border-white/10 my-2 pt-3">
                Loading form questions...
              </div>
            ) : companyExportFormQuestions.length > 0 ? (
              <div className="border-t border-slate-200 dark:border-white/10 my-2 pt-3">
                <h4 className="text-sm font-semibold text-text-main mb-2">Company Form Responses</h4>
                <div className="grid grid-cols-1 gap-3 py-1 max-h-48 overflow-y-auto pr-1">
                  {companyExportFormQuestions.map(q => (
                    <div key={q.id} className="flex items-start space-x-2">
                      <Checkbox 
                        id={`question-${q.id}`} 
                        className="border-slate-200 dark:border-white/20 mt-1"
                        checked={exportFields.has(`question_${q.id}`)}
                        onCheckedChange={v => setExportFields(prev => {
                          const n = new Set(prev);
                          if(v) n.add(`question_${q.id}`); else n.delete(`question_${q.id}`);
                          return n;
                        })}
                      />
                      <Label htmlFor={`question-${q.id}`} className="text-sm cursor-pointer text-text-main leading-snug">
                        {q.questionText} <span className="text-[10px] text-muted-foreground">({q.fieldType})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setExportCompanyId(null)} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5">Cancel</Button>
              <Button onClick={doExportCompany} className="gap-2 shadow-lg shadow-primary/20">
                <Download className="w-4 h-4" /> Start Export
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {responsesModal && (
        <Dialog open={true} onOpenChange={() => setResponsesModal(null)}>
          <DialogContent className="glass-panel text-slate-900 dark:text-white w-[92vw] sm:w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">{responsesModal.title}</DialogTitle>
              <DialogDescription className="text-muted-foreground">Viewing raw student submissions for this form.</DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-6 pt-2">
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
                            <TableCell key={a.id} className="text-muted-foreground whitespace-nowrap">
                              {a.answer ? (
                                a.answer.startsWith('http') ? (
                                  <a 
                                    href={a.answer} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                    View File
                                  </a>
                                ) : (
                                  a.answer
                                )
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter className="p-6 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
              <Button variant="ghost" onClick={() => setResponsesModal(null)} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5">Close</Button>
              {responsesModal.rows.length > 0 && (
                <Button onClick={() => void exportFormExcel(responsesModal.formId)} className="gap-2 shadow-lg shadow-primary/20">
                  <Download className="w-4 h-4" /> Download Excel
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {pendingModal && (
        <Dialog open={true} onOpenChange={() => setPendingModal(null)}>
          <DialogContent className="glass-panel text-slate-900 dark:text-white w-[92vw] sm:w-full max-w-2xl max-h-[80vh] sm:max-h-[80vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">Pending Submissions</DialogTitle>
              <DialogDescription className="text-muted-foreground">Students who have not yet submitted "{pendingModal.title}".</DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-6 pt-2">
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
            </div>
            <DialogFooter className="p-6 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
              <Button onClick={() => setPendingModal(null)} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5" variant="ghost">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {reviewStudent && (
        <Dialog open={true} onOpenChange={() => setReviewStudent(null)}>
          <DialogContent className="glass-panel text-slate-900 dark:text-white w-[92vw] sm:w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">Profile Review: {reviewStudent.name}</DialogTitle>
              <DialogDescription className="text-muted-foreground">Review the student's details before verifying.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><Label className="text-muted-foreground">Full Name</Label><p className="font-bold text-slate-900 dark:text-white">{reviewStudent.name}</p></div>
                  <div><Label className="text-muted-foreground">USN</Label><p className="font-bold text-slate-900 dark:text-white">{reviewStudent.usn || '—'}</p></div>
                  <div><Label className="text-muted-foreground">College Email</Label><p className="text-slate-900 dark:text-white">{reviewStudent.collegeEmailId || '—'}</p></div>
                  <div><Label className="text-muted-foreground">Personal Email</Label><p className="text-slate-900 dark:text-white">{reviewStudent.personalEmailId || '—'}</p></div>
                  <div><Label className="text-muted-foreground">Phone</Label><p className="text-slate-900 dark:text-white">{reviewStudent.phoneNumber || '—'}</p></div>
                  <div><Label className="text-muted-foreground">Aadhar</Label><p className="text-slate-900 dark:text-white">{reviewStudent.aadhar || '—'}</p></div>
                </div>
                <div className="space-y-4">
                  <div><Label className="text-muted-foreground">UG CGPA</Label><p className="font-bold text-slate-900 dark:text-white">{reviewStudent.ugCgpa || '—'}</p></div>
                  <div><Label className="text-muted-foreground">1st Sem SGPA</Label><p className="text-slate-900 dark:text-white">{reviewStudent.firstSemSgpa || '—'}</p></div>
                  <div><Label className="text-muted-foreground">10th Marks</Label><p className="text-slate-900 dark:text-white">{reviewStudent.tenthMarks || '—'}</p></div>
                  <div><Label className="text-muted-foreground">12th Marks</Label><p className="text-slate-900 dark:text-white">{reviewStudent.twelfthMarks || '—'}</p></div>
                  <div>
                    <Label className="text-muted-foreground">Links</Label>
                    <div className="flex gap-4 mt-1">
                      {reviewStudent.linkedIn ? <a href={reviewStudent.linkedIn} target="_blank" rel="noreferrer" className="text-primary hover:underline">LinkedIn</a> : <span className="text-muted-foreground">No LinkedIn</span>}
                      {reviewStudent.gitHub ? <a href={reviewStudent.gitHub} target="_blank" rel="noreferrer" className="text-primary hover:underline">GitHub</a> : <span className="text-muted-foreground">No GitHub</span>}
                      {reviewStudent.resumeUrl ? <a href={reviewStudent.resumeUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">View Resume</a> : <span className="text-muted-foreground">No Resume</span>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {reviewStudent.verified ? <span className="text-green-500">Verified</span> : <span className="text-amber-500">Unverified</span>}
                    </p>
                  </div>
                </div>
              </div>

            </div>
            <DialogFooter className="p-6 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex flex-col gap-4">
              {!reviewStudent.verified && (
                <div className="w-full space-y-2">
                  <Label className="text-text-main text-sm font-bold">Rejection Reason (Required if rejecting)</Label>
                  <Input 
                    placeholder="Enter reason for rejection (e.g., Incorrect Aadhar format)" 
                    value={rejectReason} 
                    onChange={e => setRejectReason(e.target.value)}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row w-full sm:justify-between items-stretch sm:items-center gap-2 sm:gap-4">
                <Button onClick={() => setReviewStudent(null)} className="order-3 sm:order-1 text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-white/10 w-full sm:w-auto" variant="ghost">Close</Button>
                {!reviewStudent.verified && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
                    <Button onClick={handleVerifyStudent} disabled={rejecting} className="w-full gap-2 order-1 shadow-lg shadow-primary/20 sm:w-auto sm:order-2">
                      <CheckCircle2 className="w-4 h-4" /> Approve & Lock
                    </Button>
                    <Button variant="destructive" onClick={handleRejectStudent} disabled={rejecting || !rejectReason.trim()} className="w-full sm:w-auto order-2 sm:order-1">Reject Profile</Button>
                  </div>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
