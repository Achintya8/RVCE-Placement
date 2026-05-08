export type AppUser = {
  id: number
  name: string
  collegeEmailId: string
  personalEmailId: string
  ugCgpa: number
  firstSemSgpa: number
  tenthMarks: number
  twelfthMarks: number
  verified: boolean
  phoneNumber?: string | null
  aadhar?: string | null
  linkedIn?: string | null
  gitHub?: string | null
  usn?: string | null
  resumeUrl?: string | null
}

export type Session = {
  token: string
  isSpc: boolean
  notificationTopic: string
  user: AppUser
}

export type Company = {
  id: number
  name: string
  minCgpa: number
  package: string
  stipend: string
  testDate?: string | null
  interviewDate?: string | null
  consent?: boolean | null
  tracker?: boolean | null
}

export type PlacementFormSummary = {
  id: number
  title: string
  type: string
  companyId?: number | null
  companyName?: string | null
  questionCount?: number | null
  responseCount?: number | null
}

export type FormQuestion = {
  id: number
  questionText: string
  fieldType: string
  options: string[]
  isRequired: boolean
  answer?: string | null
}

export type PlacementFormDetail = {
  summary: PlacementFormSummary
  questions: FormQuestion[]
}

export type StudentSummary = {
  id: number
  name: string
  collegeEmailId: string
  verified: boolean
  ugCgpa?: number | null
  resumeUrl?: string | null
}

export type FormResponseRecord = {
  studentName: string
  usn: string
  collegeEmailId: string
  answers: FormQuestion[]
}

export type ChatUser = {
  id: number
  name: string
  email?: string | null
}

export type ChatMessage = {
  id: number
  sender: ChatUser
  messageText: string
  createdAt: string
  mentionedUsers: ChatUser[]
}

export type ChatMessagesResponse = {
  messages: ChatMessage[]
  total: number
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : fallback
}

export function parseAppUser(json: Record<string, unknown>): AppUser {
  return {
    id: num(json.id),
    name: String(json.name ?? ''),
    collegeEmailId: String(json.collegeEmailId ?? ''),
    personalEmailId: String(json.personalEmailId ?? ''),
    ugCgpa: num(json.ugCgpa),
    firstSemSgpa: num(json.firstSemSgpa),
    tenthMarks: num(json.tenthMarks),
    twelfthMarks: num(json.twelfthMarks),
    verified: Boolean(json.verified),
    phoneNumber: json.phoneNumber as string | null | undefined,
    aadhar: json.aadhar != null ? String(json.aadhar) : null,
    linkedIn: json.linkedIn as string | null | undefined,
    gitHub: json.gitHub as string | null | undefined,
    usn: json.usn as string | null | undefined,
    resumeUrl: json.resumeUrl as string | null | undefined,
  }
}

export function parseSession(json: Record<string, unknown>): Session {
  return {
    token: String(json.token ?? ''),
    isSpc: Boolean(json.isSpc),
    notificationTopic: String(json.notificationTopic ?? ''),
    user: parseAppUser((json.user as Record<string, unknown>) ?? {}),
  }
}

export function parseCompany(json: Record<string, unknown>): Company {
  return {
    id: num(json.id),
    name: String(json.name ?? ''),
    minCgpa: num(json.minCgpa),
    package: String(json.package ?? ''),
    stipend: String(json.stipend ?? ''),
    testDate: json.testDate as string | null | undefined,
    interviewDate: json.interviewDate as string | null | undefined,
    consent: json.consent as boolean | null | undefined,
    tracker: json.tracker as boolean | null | undefined,
  }
}

export function parseFormSummary(json: Record<string, unknown>): PlacementFormSummary {
  return {
    id: num(json.id),
    title: String(json.title ?? ''),
    type: String(json.type ?? ''),
    companyId: json.companyId != null ? num(json.companyId) : null,
    companyName: json.companyName as string | null | undefined,
    questionCount:
      json.questionCount != null ? num(json.questionCount) : null,
    responseCount:
      json.responseCount != null ? num(json.responseCount) : null,
  }
}

export function parseFormQuestion(json: Record<string, unknown>): FormQuestion {
  return {
    id: num(json.id),
    questionText: String(json.questionText ?? ''),
    fieldType: String(json.fieldType ?? 'text'),
    options: Array.isArray(json.options) ? json.options.map(String) : [],
    isRequired: Boolean(json.isRequired),
    answer: json.answer as string | null | undefined,
  }
}

export function parseFormDetail(json: Record<string, unknown>): PlacementFormDetail {
  const summary = parseFormSummary(json)
  const questionsRaw = json.questions as unknown[] | undefined
  const questions = (questionsRaw ?? []).map((item) =>
    parseFormQuestion(item as Record<string, unknown>),
  )
  return { summary, questions }
}

export function parseStudent(json: Record<string, unknown>): StudentSummary {
  return {
    id: num(json.id),
    name: String(json.name ?? ''),
    collegeEmailId: String(json.collegeEmailId ?? ''),
    verified: Boolean(json.verified),
    ugCgpa: json.ugCgpa != null ? num(json.ugCgpa) : null,
    resumeUrl: json.resumeUrl as string | null | undefined,
  }
}

export function parseFormResponseRecord(
  json: Record<string, unknown>,
): FormResponseRecord {
  const answersRaw = json.answers as unknown[] | undefined
  return {
    studentName: String(json.studentName ?? ''),
    usn: String(json.usn ?? ''),
    collegeEmailId: String(json.collegeEmailId ?? ''),
    answers: (answersRaw ?? []).map((item) =>
      parseFormQuestion(item as Record<string, unknown>),
    ),
  }
}

export function parseChatUser(json: Record<string, unknown>): ChatUser {
  return {
    id: num(json.id),
    name: String(json.name ?? ''),
    email: json.email as string | null | undefined,
  }
}

export function parseChatMessage(json: Record<string, unknown>): ChatMessage {
  const mentionedRaw = json.mentionedUsers as unknown[] | undefined
  return {
    id: num(json.id),
    sender: parseChatUser((json.sender as Record<string, unknown>) ?? {}),
    messageText: String(json.messageText ?? ''),
    createdAt: String(json.createdAt ?? ''),
    mentionedUsers: (mentionedRaw ?? []).map((item) =>
      parseChatUser(item as Record<string, unknown>),
    ),
  }
}
