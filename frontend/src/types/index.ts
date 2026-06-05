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
  profilePictureUrl?: string | null
  unlockRequested?: boolean
  placed?: boolean
  gender?: string | null
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
  minOverallCgpa?: number | null
  package: string
  stipend: string
  testDate?: string | null
  interviewDate?: string | null
  deadline?: string | null
  consent?: boolean | null
  tracker?: boolean | null
  status?: string
  consentBlocked?: boolean
  trackerBlocked?: boolean
  defaultConsent?: boolean
}

export type PlacementFormSummary = {
  id: number
  title: string
  type: string
  companyId?: number | null
  companyName?: string | null
  questionCount?: number | null
  responseCount?: number | null
  acceptingResponses?: boolean
}

export type FormQuestion = {
  id: number
  questionText: string
  fieldType: string
  options: string[]
  folderLink?: string | null
  isRequired: boolean
  answer?: string | null
}

export type PlacementFormDetail = {
  summary: PlacementFormSummary
  questions: FormQuestion[]
}

export type StudentSummary = AppUser;

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
  attachmentUrl?: string | null
  attachmentName?: string | null
  createdAt: string
  mentionedUsers: ChatUser[]
  parentId?: number | null
  parentMessage?: {
    id: number
    senderName: string
    messageText: string
  } | null
}

export type ChatMessagesResponse = {
  messages: ChatMessage[]
  total: number
}
