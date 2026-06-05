import type {
  AppUser,
  Session,
  Company,
  PlacementFormSummary,
  FormQuestion,
  PlacementFormDetail,
  StudentSummary,
  FormResponseRecord,
  ChatUser,
  ChatMessage,
  ChatMessagesResponse
} from '../types'

export type {
  AppUser,
  Session,
  Company,
  PlacementFormSummary,
  FormQuestion,
  PlacementFormDetail,
  StudentSummary,
  FormResponseRecord,
  ChatUser,
  ChatMessage,
  ChatMessagesResponse
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
    profilePictureUrl: json.profilePictureUrl as string | null | undefined,
    unlockRequested: Boolean(json.unlockRequested),
    placed: Boolean(json.placed),
    gender: json.gender as string | null | undefined,
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
    minOverallCgpa: json.minOverallCgpa != null ? num(json.minOverallCgpa) : null,
    package: String(json.package ?? ''),
    stipend: String(json.stipend ?? ''),
    testDate: json.testDate as string | null | undefined,
    interviewDate: json.interviewDate as string | null | undefined,
    deadline: json.deadline as string | null | undefined,
    consent: json.consent as boolean | null | undefined,
    tracker: json.tracker as boolean | null | undefined,
    status: json.status as string | undefined,
    consentBlocked: Boolean(json.consentBlocked),
    trackerBlocked: Boolean(json.trackerBlocked),
    defaultConsent: Boolean(json.defaultConsent),
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
    acceptingResponses: json.acceptingResponses !== undefined ? Boolean(json.acceptingResponses) : true,
  }
}

export function parseFormQuestion(json: Record<string, unknown>): FormQuestion {
  return {
    id: num(json.id),
    questionText: String(json.questionText ?? ''),
    fieldType: String(json.fieldType ?? 'text'),
    options: Array.isArray(json.options) ? json.options.map(String) : [],
    folderLink: json.folderLink as string | null | undefined,
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
  return parseAppUser(json);
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
  const parentRaw = json.parentMessage as Record<string, unknown> | null | undefined
  return {
    id: num(json.id),
    sender: parseChatUser((json.sender as Record<string, unknown>) ?? {}),
    messageText: String(json.messageText ?? ''),
    attachmentUrl: json.attachmentUrl as string | null | undefined,
    attachmentName: json.attachmentName as string | null | undefined,
    createdAt: String(json.createdAt ?? ''),
    mentionedUsers: (mentionedRaw ?? []).map((item) =>
      parseChatUser(item as Record<string, unknown>),
    ),
    parentId: json.parentId != null ? Number(json.parentId) : undefined,
    parentMessage: parentRaw ? {
      id: num(parentRaw.id),
      senderName: String(parentRaw.senderName ?? ''),
      messageText: String(parentRaw.messageText ?? ''),
    } : null,
  }
}
