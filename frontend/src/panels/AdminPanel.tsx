import { useCallback, useEffect, useState } from 'react'
import type {
  Company,
  FormQuestion,
  FormResponseRecord,
  PlacementFormSummary,
  StudentSummary,
} from '@/types'
import { repo } from '../store/useAuthStore'
import { resolveBackendUrl } from '../config'
import { toast } from 'sonner'
import { downloadBlob, formatDate } from '../lib/format'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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
  ChevronRight,
  Search
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

const FIELD_LABELS: Record<string, string> = {
  name: 'Full Name',
  usn: 'USN',
  collegeEmailId: 'College Email ID',
  personalEmailId: 'Personal Email ID',
  phoneNumber: 'Phone Number',
  aadhar: 'Aadhar Number',
  gender: 'Gender',
  ugCgpa: 'UG CGPA',
  firstSemSgpa: '1st Sem SGPA',
  tenthMarks: '10th Aggregate (%)',
  twelfthMarks: '12th Aggregate (%)',
  linkedIn: 'LinkedIn URL',
  gitHub: 'GitHub URL',
  resumeUrl: 'Resume',
  profilePictureUrl: 'Profile Picture'
};

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
  const [cOverallCgpa, setCOverallCgpa] = useState('')
  const [cUgCgpa, setCUgCgpa] = useState('')
  const [cDefaultConsent, setCDefaultConsent] = useState(false)

  // Company Edit Form State
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [eName, setEName] = useState('')
  const [eCgpa, setECgpa] = useState('')
  const [eOverallCgpa, setEOverallCgpa] = useState('')
  const [eUgCgpa, setEUgCgpa] = useState('')
  const [ePkg, setEPkg] = useState('')
  const [eStip, setEStip] = useState('')
  const [eTest, setETest] = useState('')
  const [eInt, setEInt] = useState('')
  const [eDefaultConsent, setEDefaultConsent] = useState(false)

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
  const [fFormType, setFFormType] = useState<'general' | 'company' | 'profile'>('general')
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
  const [selectedRejectedFields, setSelectedRejectedFields] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentActions, setSelectedStudentActions] = useState<StudentSummary | null>(null)
  const [reviewStudentProfileData, setReviewStudentProfileData] = useState<any[]>([])

  const closeReview = () => {
    setReviewStudent(null)
    setRejectReason('')
    setSelectedRejectedFields([])
  }

  const getFieldStatus = (fieldName: string) => {
    if (!reviewStudent) return { isRejected: false, isEdited: false }

    const isRejected = Array.isArray(reviewStudent.rejectedFields) && reviewStudent.rejectedFields.includes(fieldName)

    let isEdited = false
    if (reviewStudent.lastVerifiedProfile && !reviewStudent.verified) {
      const lastVal = reviewStudent.lastVerifiedProfile[fieldName]
      const currentVal = (reviewStudent as any)[fieldName]
      
      const normalizeForCompare = (val: any) => {
        if (val === null || val === undefined) return ''
        return String(val).trim()
      }
      
      if (normalizeForCompare(lastVal) !== normalizeForCompare(currentVal)) {
        isEdited = true
      }
    }

    return { isRejected, isEdited }
  }

  const renderProfileField = (label: string, fieldName: string, value: any, isCustomContent = false) => {
    const { isRejected, isEdited } = getFieldStatus(fieldName)
    return (
      <div className={cn(
        "p-2.5 rounded-xl border transition-all duration-200",
        isRejected 
          ? "bg-red-500/5 border-red-500/20 shadow-sm shadow-red-500/5" 
          : isEdited 
            ? "bg-amber-500/5 border-amber-500/20 shadow-sm shadow-amber-500/5"
            : "border-transparent"
      )}>
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-xs">{label}</Label>
          <div className="flex gap-1.5">
            {isRejected && <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/15 border-red-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase">Incorrect</Badge>}
            {isEdited && <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border-amber-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase">Edited</Badge>}
          </div>
        </div>
        {isCustomContent ? (
          <div className="mt-1">{value}</div>
        ) : (
          <p className={cn(
            "font-bold text-sm sm:text-base mt-0.5 break-all sm:break-words",
            isRejected ? "text-red-500" : isEdited ? "text-amber-500" : "text-slate-900 dark:text-white"
          )}>
            {value || '—'}
          </p>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (reviewStudent) {
      repo.getStudentProfileData(reviewStudent.id)
        .then(setReviewStudentProfileData)
        .catch((e) => console.error('Failed to load student profile responses:', e))
    } else {
      setReviewStudentProfileData([])
    }
  }, [reviewStudent])

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
        minCgpa: cCgpa ? Number.parseFloat(cCgpa) : null,
        minOverallCgpa: cOverallCgpa ? Number.parseFloat(cOverallCgpa) : null,
        minUgCgpa: cUgCgpa ? Number.parseFloat(cUgCgpa) : null,
        package: cPkg.trim(),
        stipend: cStip.trim(),
        testDate: cTest.trim() || null,
        interviewDate: cInt.trim() || null,
        deadline: null,
        defaultConsent: cDefaultConsent,
      })
      setCName(''); setCCgpa(''); setCOverallCgpa(''); setCUgCgpa(''); setCPkg(''); setCStip(''); setCTest(''); setCInt(''); setCDefaultConsent(false)
    }, 'Company created.')

  const startEditCompany = (company: Company) => {
    setEditingCompany(company)
    setEName(company.name)
    setECgpa(company.minCgpa != null ? String(company.minCgpa) : '')
    setEOverallCgpa(company.minOverallCgpa != null ? String(company.minOverallCgpa) : '')
    setEUgCgpa(company.minUgCgpa != null ? String(company.minUgCgpa) : '')
    setEPkg(company.package || '')
    setEStip(company.stipend || '')
    setETest(company.testDate || '')
    setEInt(company.interviewDate || '')
    setEDefaultConsent(company.defaultConsent ?? false)
  }

  const saveEditedCompany = () => {
    if (!editingCompany || !eName.trim()) return
    void run(async () => {
      await repo.updateCompany(editingCompany.id, {
        name: eName.trim(),
        minCgpa: eCgpa ? Number.parseFloat(eCgpa) : null,
        minOverallCgpa: eOverallCgpa ? Number.parseFloat(eOverallCgpa) : null,
        minUgCgpa: eUgCgpa ? Number.parseFloat(eUgCgpa) : null,
        package: ePkg.trim(),
        stipend: eStip.trim(),
        testDate: eTest.trim() || null,
        interviewDate: eInt.trim() || null,
        deadline: null,
        defaultConsent: eDefaultConsent,
      })
      setEditingCompany(null)
    }, 'Company updated successfully.')
  }

  const handleDeleteCompany = (companyId: number) => {
    if (!confirm('Are you sure you want to delete this company? All forms and student applications associated with this company will be deleted. This action cannot be undone.')) return
    void run(async () => {
      await repo.deleteCompany(companyId)
    }, 'Company deleted successfully.')
  }

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
        type: fFormType === 'profile' ? 'profile_data' : 'custom',
        companyId: fFormType === 'company' ? Number(fCompanyId) : null,
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
      await repo.rejectStudent(reviewStudent.id, rejectReason.trim(), selectedRejectedFields)
      toast.success('Student profile rejected. They have been notified.')
      setReviewStudent(null)
      setRejectReason('')
      setSelectedRejectedFields([])
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

  const handleTogglePlaced = (studentId: number, placed: boolean) =>
    run(async () => {
      await repo.updateStudentPlacedStatus(studentId, placed)
    }, `Student placement status updated to ${placed ? 'Placed' : 'Not Placed'}.`)

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

  const filteredStudents = (data?.students || [])
    .filter(s => {
      const query = studentSearch.toLowerCase().trim()
      if (!query) return true
      const nameMatch = s.name?.toLowerCase().includes(query)
      const usnMatch = s.usn?.toLowerCase().includes(query)
      return nameMatch || usnMatch
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))

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
        assignedCount = data.students.filter(s => {
          const currentCgpa = s.firstSemSgpa || s.ugCgpa;
          if (company.minCgpa && currentCgpa < company.minCgpa) return false;
          if (company.minOverallCgpa) {
            if (s.ugCgpa < company.minOverallCgpa) return false;
            if (s.firstSemSgpa && s.firstSemSgpa < company.minOverallCgpa) return false;
            if (s.tenthMarks && s.tenthMarks < company.minOverallCgpa * 10) return false;
            if (s.twelfthMarks && s.twelfthMarks < company.minOverallCgpa * 10) return false;
          }
          if (company.minUgCgpa && s.ugCgpa < company.minUgCgpa) return false;
          return true;
        }).length;
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="ios-segmented-list mb-8">
          <TabsTrigger value="overview" className="ios-segmented-trigger">Overview</TabsTrigger>
          <TabsTrigger value="companies" className="ios-segmented-trigger">Companies</TabsTrigger>
          <TabsTrigger value="forms" className="ios-segmented-trigger">Forms</TabsTrigger>
          <TabsTrigger value="students" className="ios-segmented-trigger">Students</TabsTrigger>
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
                        <TableCell className="text-muted-foreground text-xs">
                          {c.minCgpa != null && <div>Current: {c.minCgpa.toFixed(1)}</div>}
                          {c.minOverallCgpa != null && <div>Overall: {c.minOverallCgpa.toFixed(1)}</div>}
                          {c.minUgCgpa != null && <div>UG: {c.minUgCgpa.toFixed(1)}</div>}
                          {c.minCgpa == null && c.minOverallCgpa == null && c.minUgCgpa == null && <div>All Eligible</div>}
                        </TableCell>
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
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-text-main">Company Name</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" placeholder="e.g. Google" value={cName} onChange={e => setCName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-text-main">Min CGPA (Current)</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" type="number" step="0.1" placeholder="e.g. 7.5" value={cCgpa} onChange={e => setCCgpa(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-text-main">Min Overall CGPA</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" type="number" step="0.1" placeholder="e.g. 6.5" value={cOverallCgpa} onChange={e => setCOverallCgpa(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-text-main">Min UG CGPA</Label>
                  <Input className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" type="number" step="0.1" placeholder="e.g. 6.0" value={cUgCgpa} onChange={e => setCUgCgpa(e.target.value)} />
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
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <Switch
                  id="cDefaultConsent"
                  checked={cDefaultConsent}
                  onCheckedChange={setCDefaultConsent}
                />
                <div>
                  <Label htmlFor="cDefaultConsent" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Default Consent: ON</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cDefaultConsent
                      ? 'All eligible students will be auto-consented. They can opt out individually.'
                      : 'Students must explicitly provide consent to participate in this drive.'}
                  </p>
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
                      <TableHead className="text-text-main font-bold">Status</TableHead>
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
                              className="font-bold text-primary cursor-pointer hover:underline select-none"
                              onClick={() => toggleExpandCompany(c.id)}
                            >
                              <div className="flex items-center gap-1.5">
                                <span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </span>
                                {c.name}
                              </div>
                            </TableCell>
                            <TableCell>
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
                            <TableRow className="border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:bg-transparent">
                              <TableCell colSpan={5} className="p-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in slide-in-from-top-2 duration-200">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Package</span>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.package || 'TBD'}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stipend</span>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.stipend || 'TBD'}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Academic Requirements</span>
                                      <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                                        {[
                                          c.minCgpa != null ? `Current: ${c.minCgpa.toFixed(1)}` : null,
                                          c.minOverallCgpa != null ? `Overall: ${c.minOverallCgpa.toFixed(1)}` : null,
                                          c.minUgCgpa != null ? `UG: ${c.minUgCgpa.toFixed(1)}` : null,
                                        ].filter(Boolean).join(' | ') || 'All Eligible'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 pt-4 md:pt-0 md:pl-6">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => startEditCompany(c)}
                                      className="hover:bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white border-slate-200 dark:border-white/10"
                                    >
                                      Edit Drive
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      onClick={() => handleDeleteCompany(c.id)}
                                      className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/20"
                                    >
                                      <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                                    </Button>
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
                        setFFormType(v as 'general' | 'company' | 'profile');
                        if (v !== 'company') setFCompanyId('');
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                        <SelectItem value="general">General (All Students)</SelectItem>
                        <SelectItem value="company">Company Specific</SelectItem>
                        <SelectItem value="profile">Profile Collection Fields</SelectItem>
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
                          <Badge variant="secondary" className="text-[10px] border-primary/20 bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {f.type === 'profile_data' ? 'profile fields' : f.type}
                          </Badge>
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
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Student Verification</CardTitle>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="Search name or USN..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-9 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-white/10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No students found matching your search.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 dark:border-white/10 hover:bg-transparent">
                        <TableHead className="p-2 sm:p-4 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">USN</TableHead>
                        <TableHead className="p-2 sm:p-4 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">Student</TableHead>
                        <TableHead className="w-[40px] p-2 sm:p-4 text-right font-bold text-slate-500 dark:text-slate-400"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((s) => (
                        <TableRow
                          key={s.id}
                          onClick={() => setSelectedStudentActions(s)}
                          className={cn(
                            "cursor-pointer border-slate-200 dark:border-white/10 select-none transition-colors",
                            selectedStudentActions?.id === s.id
                              ? "bg-slate-200/60 dark:bg-white/15 hover:bg-slate-200/70 dark:hover:bg-white/20"
                              : s.unlockRequested
                                ? "bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-950/30 dark:hover:bg-amber-950/45"
                                : s.verified
                                  ? "bg-green-500/10 hover:bg-green-500/15 dark:bg-green-950/30 dark:hover:bg-green-950/45"
                                  : s.rejected
                                    ? "bg-red-500/10 hover:bg-red-500/15 dark:bg-red-950/30 dark:hover:bg-red-950/45"
                                    : "hover:bg-slate-100/50 dark:hover:bg-white/5"
                          )}
                        >
                          <TableCell className="p-2 sm:p-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {s.usn || "N/A"}
                          </TableCell>
                          <TableCell className="p-2 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 overflow-hidden">
                                {s.profilePictureUrl ? (
                                  <img
                                    src={resolveBackendUrl(s.profilePictureUrl)}
                                    alt={s.name}
                                    className="h-full w-full object-cover animate-in fade-in duration-300"
                                  />
                                ) : (
                                  s.name.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                  {s.name}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="p-2 sm:p-4 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-400 inline-block" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
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
            <DialogHeader className="p-6 pb-2 pr-14">
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
            <DialogHeader className="p-6 pb-2 pr-14">
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
      {selectedStudentActions && (
        <Dialog open={true} onOpenChange={() => setSelectedStudentActions(null)}>
          <DialogContent className="glass-panel text-slate-900 dark:text-white max-w-sm p-6 rounded-2xl">
            <DialogHeader className="text-center pb-4 border-b border-slate-100 dark:border-white/10">
              <DialogTitle className="text-lg font-bold truncate">
                {selectedStudentActions.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                {selectedStudentActions.usn || "No USN"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Verification & Status</span>
                <div className="flex flex-wrap gap-2">
                  {selectedStudentActions.verified ? (
                    <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/15 border-green-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Verified</Badge>
                  ) : selectedStudentActions.rejected ? (
                    <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/15 border-red-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Rejected</Badge>
                  ) : (
                    <Badge className="bg-slate-500/10 text-slate-500 dark:text-slate-400 hover:bg-slate-500/15 border-slate-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Unverified</Badge>
                  )}
                  {selectedStudentActions.unlockRequested && (
                    <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border-amber-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Unlock Requested</Badge>
                  )}
                  {selectedStudentActions.placed && (
                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Placed</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Available Actions</span>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      const s = selectedStudentActions
                      setSelectedStudentActions(null)
                      setReviewStudent(s)
                    }}
                    variant="outline"
                    className="w-full justify-start text-xs font-semibold h-10 rounded-xl gap-2 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    <Eye className="w-4 h-4 text-slate-400" />
                    {selectedStudentActions.verified ? "View Profile" : "Review Profile"}
                  </Button>

                  {selectedStudentActions.unlockRequested && (
                    <Button
                      onClick={() => {
                        const s = selectedStudentActions
                        setSelectedStudentActions(null)
                        void approveUnlock(s.id)
                      }}
                      variant="outline"
                      className="w-full justify-start text-xs font-semibold h-10 rounded-xl gap-2 border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10"
                    >
                      <Unlock className="w-4 h-4 text-amber-500" />
                      Approve Unlock Request
                    </Button>
                  )}

                  <Button
                    onClick={() => {
                      const s = selectedStudentActions
                      setSelectedStudentActions(null)
                      void handleTogglePlaced(s.id, !s.placed)
                    }}
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-xs font-semibold h-10 rounded-xl gap-2",
                      selectedStudentActions.placed 
                        ? "border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10" 
                        : "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedStudentActions.placed ? "Mark as Unplaced" : "Mark as Placed"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {reviewStudent && (
        <Dialog open={true} onOpenChange={closeReview}>
          <DialogContent className="glass-panel text-slate-900 dark:text-white w-[92vw] sm:w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2 pr-14">
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">Profile Review: {reviewStudent.name}</DialogTitle>
              <DialogDescription className="text-muted-foreground">Review the student's details before verifying.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 pt-2">
              {reviewStudent.rejectionReason && (
                <div className="mb-6 p-4 rounded-xl border border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400">
                  <div className="flex gap-2 items-center font-bold mb-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Previous Rejection Details</span>
                  </div>
                  <p className="text-sm">Reason: {reviewStudent.rejectionReason}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {renderProfileField('Full Name', 'name', reviewStudent.name)}
                  {renderProfileField('USN', 'usn', reviewStudent.usn)}
                  {renderProfileField('College Email', 'collegeEmailId', reviewStudent.collegeEmailId)}
                  {renderProfileField('Personal Email', 'personalEmailId', reviewStudent.personalEmailId)}
                  {renderProfileField('Phone', 'phoneNumber', reviewStudent.phoneNumber)}
                  {renderProfileField('Aadhar', 'aadhar', reviewStudent.aadhar)}
                  {renderProfileField('Gender', 'gender', reviewStudent.gender)}
                </div>
                <div className="space-y-4">
                  {renderProfileField('UG CGPA', 'ugCgpa', reviewStudent.ugCgpa)}
                  {renderProfileField('1st Sem SGPA', 'firstSemSgpa', reviewStudent.firstSemSgpa)}
                  {renderProfileField('10th Marks', 'tenthMarks', reviewStudent.tenthMarks)}
                  {renderProfileField('12th Marks', 'twelfthMarks', reviewStudent.twelfthMarks)}
                  {renderProfileField('Links', 'links', (
                    <div className="flex gap-4">
                      {reviewStudent.linkedIn ? (
                        <div className={getFieldStatus('linkedIn').isRejected ? 'text-red-500 border border-red-500/20 px-2 py-0.5 rounded bg-red-500/5' : getFieldStatus('linkedIn').isEdited ? 'text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded bg-amber-500/5' : ''}>
                          <a href={reviewStudent.linkedIn} target="_blank" rel="noreferrer" className="text-primary hover:underline">LinkedIn</a>
                        </div>
                      ) : <span className="text-muted-foreground">No LinkedIn</span>}
                      {reviewStudent.gitHub ? (
                        <div className={getFieldStatus('gitHub').isRejected ? 'text-red-500 border border-red-500/20 px-2 py-0.5 rounded bg-red-500/5' : getFieldStatus('gitHub').isEdited ? 'text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded bg-amber-500/5' : ''}>
                          <a href={reviewStudent.gitHub} target="_blank" rel="noreferrer" className="text-primary hover:underline">GitHub</a>
                        </div>
                      ) : <span className="text-muted-foreground">No GitHub</span>}
                      {reviewStudent.resumeUrl ? (
                        <div className={getFieldStatus('resumeUrl').isRejected ? 'text-red-500 border border-red-500/20 px-2 py-0.5 rounded bg-red-500/5' : getFieldStatus('resumeUrl').isEdited ? 'text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded bg-amber-500/5' : ''}>
                           <a href={resolveBackendUrl(reviewStudent.resumeUrl)} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">View Resume</a>
                        </div>
                      ) : <span className="text-muted-foreground">No Resume</span>}
                    </div>
                  ), true)}
                   <div>
                    <Label className="text-muted-foreground">Verification Status</Label>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {reviewStudent.verified ? <span className="text-green-500">Verified</span> : reviewStudent.rejected ? <span className="text-red-500">Rejected</span> : <span className="text-amber-500">Unverified</span>}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Placement Status</Label>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {reviewStudent.placed ? <span className="text-green-500">Placed (Consent Frozen)</span> : <span className="text-muted-foreground">Not Placed</span>}
                    </p>
                  </div>
                  {reviewStudentProfileData.flatMap((form) =>
                    form.questions.map((q: any) => (
                      <div key={q.id}>
                        <Label className="text-muted-foreground">{form.summary.title}</Label>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {q.fieldType === 'file' && q.answer ? (
                            <a href={q.answer} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold truncate block">
                              View Uploaded File
                            </a>
                          ) : (
                            q.answer || '—'
                          )}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {!reviewStudent.verified && (
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 space-y-4">
                  <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <Label className="text-text-main text-sm font-bold block mb-1">Select Incorrect Fields (Optional)</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                      {Object.entries(FIELD_LABELS).map(([key, label]) => {
                        const isChecked = selectedRejectedFields.includes(key);
                        return (
                          <label key={key} className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setSelectedRejectedFields(prev => 
                                  checked 
                                    ? [...prev, key] 
                                    : prev.filter(f => f !== key)
                                );
                              }}
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-text-main text-sm font-bold">Rejection Reason (Required if rejecting)</Label>
                    <Input 
                      placeholder="Enter reason for rejection (e.g., Incorrect Aadhar format)" 
                      value={rejectReason} 
                      onChange={e => setRejectReason(e.target.value)}
                      className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
              <Button onClick={closeReview} className="w-full sm:w-auto text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-white/10" variant="ghost">Close</Button>
              {!reviewStudent.verified && (
                <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                  <Button variant="destructive" onClick={handleRejectStudent} disabled={rejecting || !rejectReason.trim()} className="w-full sm:w-auto">Reject Profile</Button>
                  <Button onClick={handleVerifyStudent} disabled={rejecting} className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20">
                    <CheckCircle2 className="w-4 h-4" /> Approve & Lock
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {editingCompany && (
        <Dialog open={true} onOpenChange={() => setEditingCompany(null)}>
          <DialogContent className="glass-panel text-slate-900 dark:text-white w-[92vw] sm:w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2 pr-14">
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">Edit Recruitment Drive</DialogTitle>
              <DialogDescription className="text-muted-foreground">Modify company parameters and academic eligibility constraints.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Company Name</Label>
                  <Input 
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11" 
                    placeholder="e.g. Google" 
                    value={eName} 
                    onChange={e => setEName(e.target.value)} 
                  />
                </div>

                {/* Package */}
                <div className="space-y-2">
                  <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Package (LPA)</Label>
                  <Input 
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11" 
                    placeholder="e.g. 12 LPA or TBD" 
                    value={ePkg} 
                    onChange={e => setEPkg(e.target.value)} 
                  />
                </div>

                {/* Stipend */}
                <div className="space-y-2">
                  <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Stipend (PM)</Label>
                  <Input 
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11" 
                    placeholder="e.g. 50k PM or TBD" 
                    value={eStip} 
                    onChange={e => setEStip(e.target.value)} 
                  />
                </div>

                {/* Min CGPA (Current) */}
                <div className="space-y-2">
                  <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Min CGPA (Current)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11" 
                    placeholder="e.g. 7.5" 
                    value={eCgpa} 
                    onChange={e => setECgpa(e.target.value)} 
                  />
                </div>

                {/* Min Overall CGPA */}
                <div className="space-y-2">
                  <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Min Overall CGPA (10th/12th/UG/PG)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11" 
                    placeholder="e.g. 6.5 (Optional)" 
                    value={eOverallCgpa} 
                    onChange={e => setEOverallCgpa(e.target.value)} 
                  />
                </div>

                {/* Min UG CGPA */}
                <div className="space-y-2">
                  <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Min UG CGPA</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11" 
                    placeholder="e.g. 6.0 (Optional)" 
                    value={eUgCgpa} 
                    onChange={e => setEUgCgpa(e.target.value)} 
                  />
                </div>

                {/* Test Date */}
                <div className="space-y-2">
                  <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Online Test Date</Label>
                  <Input 
                    type="date"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11" 
                    value={eTest ? eTest.substring(0, 10) : ''} 
                    onChange={e => setETest(e.target.value)} 
                  />
                </div>

                {/* Interview Date */}
                <div className="space-y-2">
                  <Label className="text-slate-800 dark:text-slate-200 font-semibold text-sm">Interview Date</Label>
                  <Input 
                    type="date"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white h-11" 
                    value={eInt ? eInt.substring(0, 10) : ''} 
                    onChange={e => setEInt(e.target.value)} 
                  />
                </div>
              </div>

              {/* Default Consent */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <Switch
                  id="eDefaultConsent"
                  checked={eDefaultConsent}
                  onCheckedChange={setEDefaultConsent}
                />
                <div>
                  <Label htmlFor="eDefaultConsent" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">Default Consent: ON</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {eDefaultConsent
                      ? 'All eligible students will be auto-consented. They can opt out individually.'
                      : 'Students must explicitly provide consent to participate in this drive.'}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-slate-100 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
              <Button variant="ghost" onClick={() => setEditingCompany(null)} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5">Cancel</Button>
              <Button onClick={saveEditedCompany} className="gap-2 shadow-lg shadow-primary/20" disabled={busy}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
