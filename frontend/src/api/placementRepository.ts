import type { ApiClient } from './client'
import type {
  AppUser,
  ChatMessage,
  ChatMessagesResponse,
  ChatUser,
  Company,
  FormQuestion,
  FormResponseRecord,
  PlacementFormDetail,
  PlacementFormSummary,
  Session,
  StudentSummary,
} from '@/types'
import {
  parseAppUser,
  parseChatMessage,
  parseChatUser,
  parseCompany,
  parseFormDetail,
  parseFormResponseRecord,
  parseFormSummary,
  parseSession,
  parseStudent,
} from './types'

export class PlacementRepository {
  private readonly client: ApiClient

  constructor(client: ApiClient) {
    this.client = client
  }

  async getNotificationPublicKey(): Promise<{
    configured: boolean
    publicKey: string
  }> {
    const json = await this.client.getJson('/notifications/public-key')
    return {
      configured: Boolean(json.configured),
      publicKey: String(json.publicKey ?? ''),
    }
  }

  async registerPushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
    await this.client.postJson('/notifications/subscriptions', { subscription })
  }

  async sendTestNotification(): Promise<void> {
    await this.client.postJson('/notifications/test', {})
  }

  async googleLogin(idToken: string): Promise<Session> {
    const json = await this.client.postJson('/auth/google', { idToken })
    return parseSession(json)
  }

  async restoreSession(): Promise<Session> {
    const json = await this.client.getJson('/auth/me')
    return parseSession(json)
  }

  async getProfile(): Promise<AppUser> {
    const json = await this.client.getJson('/users/me')
    return parseAppUser(json)
  }

  async updateProfile(data: Record<string, unknown>): Promise<AppUser> {
    const json = await this.client.putJson('/users/me', data)
    return parseAppUser(json)
  }

  async requestProfileUnlock(): Promise<AppUser> {
    const json = await this.client.postJson('/users/me/unlock-request', {})
    return parseAppUser(json)
  }

  async uploadResume(file: File): Promise<AppUser> {
    const form = new FormData()
    form.append('resume', file)
    const json = await this.client.postFormData('/users/me/resume', form)
    return parseAppUser(json)
  }

  async uploadProfilePicture(file: File): Promise<AppUser> {
    const form = new FormData()
    form.append('profilePicture', file)
    const json = await this.client.postFormData('/users/me/profile-picture', form)
    return parseAppUser(json)
  }

  async getCompanies(): Promise<Company[]> {
    const list = await this.client.getList('/companies')
    return list.map((item) => parseCompany(item as Record<string, unknown>))
  }

  async saveApplication(
    companyId: number,
    payload: { consent?: boolean; tracker?: boolean },
  ): Promise<void> {
    const body: Record<string, unknown> = {}
    if (payload.consent !== undefined) body.consent = payload.consent
    if (payload.tracker !== undefined) body.tracker = payload.tracker
    await this.client.putJson(`/applications/company/${companyId}`, body)
  }

  async getAssignedForms(): Promise<PlacementFormSummary[]> {
    const list = await this.client.getList('/forms/assigned/me')
    return list.map((item) => parseFormSummary(item as Record<string, unknown>))
  }

  async getProfileDataForms(): Promise<PlacementFormDetail[]> {
    const list = await this.client.getList('/forms/profile-data')
    return list.map((item) => parseFormDetail(item as Record<string, unknown>))
  }

  async getAllForms(): Promise<PlacementFormSummary[]> {
    const list = await this.client.getList('/forms')
    return list.map((item) => parseFormSummary(item as Record<string, unknown>))
  }

  async getForm(formId: number): Promise<PlacementFormDetail> {
    const json = await this.client.getJson(`/forms/${formId}`)
    return parseFormDetail(json)
  }

  async submitFormResponses(
    formId: number,
    answers: Record<number, string | number | boolean>,
  ): Promise<void> {
    await this.client.postJson(`/responses/forms/${formId}`, {
      answers: Object.entries(answers).map(([questionId, answer]) => ({
        questionId: Number(questionId),
        answer,
      })),
    })
  }

  async uploadResponseFile(file: File, folderLink?: string | null): Promise<{ fileUrl: string; fileName: string }> {
    const formData = new FormData()
    formData.append('file', file)
    if (folderLink) {
      formData.append('folderLink', folderLink)
    }
    const json = await this.client.postFormData('/responses/upload', formData)
    return {
      fileUrl: String(json.fileUrl ?? ''),
      fileName: String(json.fileName ?? ''),
    }
  }

  async getQuestions(): Promise<FormQuestion[]> {
    const list = await this.client.getList('/questions')
    return list.map((item) => {
      const q = item as Record<string, unknown>
      return {
        id: Number(q.id) || 0,
        questionText: String(q.questionText ?? ''),
        fieldType: String(q.fieldType ?? 'text'),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        folderLink: q.folderLink as string | null | undefined,
        isRequired: Boolean(q.isRequired),
        answer: q.answer as string | null | undefined,
      }
    })
  }

  async createQuestion(payload: {
    questionText: string
    fieldType: string
    options?: string[]
    folderLink?: string | null
  }): Promise<any> {
    return await this.client.postJson('/questions', {
      questionText: payload.questionText,
      fieldType: payload.fieldType,
      ...(payload.options?.length ? { options: payload.options } : {}),
      ...(payload.folderLink ? { folderLink: payload.folderLink } : {}),
    })
  }

  async createForm(payload: {
    title: string
    type: string
    companyId?: number | null
  }): Promise<any> {
    return await this.client.postJson('/forms', {
      title: payload.title,
      type: payload.type,
      companyId: payload.companyId ?? undefined,
    })
  }

  async mapQuestionsToForm(
    formId: number,
    questions: { questionId: number; isRequired: boolean }[],
  ): Promise<void> {
    await this.client.postJson(`/forms/${formId}/questions`, { questions })
  }

  async sendForm(formId: number): Promise<void> {
    await this.client.postJson(`/forms/${formId}/send`, {})
  }

  async deleteForm(formId: number): Promise<void> {
    await this.client.delete(`/forms/${formId}`)
  }

  async toggleFormResponses(formId: number, acceptingResponses: boolean): Promise<PlacementFormSummary> {
    const json = await this.client.putJson(`/forms/${formId}/toggle-responses`, { acceptingResponses })
    return parseFormSummary(json)
  }

  async getPendingStudents(formId: number): Promise<StudentSummary[]> {
    const list = await this.client.getList(`/forms/${formId}/pending`)
    return list.map((item) => parseStudent(item as Record<string, unknown>))
  }

  async createCompany(payload: {
    name: string
    minCgpa: number
    minOverallCgpa?: number | null
    package: string
    stipend: string
    testDate?: string | null
    interviewDate?: string | null
    deadline?: string | null
    defaultConsent?: boolean
  }): Promise<void> {
    await this.client.postJson('/companies', payload)
  }

  async updateCompany(
    companyId: number,
    payload: {
      name: string
      minCgpa: number
      minOverallCgpa?: number | null
      package: string
      stipend: string
      testDate?: string | null
      interviewDate?: string | null
      deadline?: string | null
      defaultConsent?: boolean
    },
  ): Promise<Company> {
    const json = await this.client.putJson(`/companies/${companyId}`, payload)
    return parseCompany(json as Record<string, unknown>)
  }

  async deleteCompany(companyId: number): Promise<void> {
    await this.client.delete(`/companies/${companyId}`)
  }

  async updateCompanyStatus(companyId: number, status: string): Promise<Company> {
    const json = await this.client.putJson(`/companies/${companyId}/status`, { status })
    return parseCompany(json as Record<string, unknown>)
  }

  async updateCompanyBlocks(
    companyId: number,
    consentBlocked: boolean,
    trackerBlocked: boolean,
  ): Promise<Company> {
    const json = await this.client.putJson(`/companies/${companyId}/blocks`, {
      consentBlocked,
      trackerBlocked,
    })
    return parseCompany(json as Record<string, unknown>)
  }

  async getStudents(): Promise<StudentSummary[]> {
    const list = await this.client.getList('/users/students')
    return list.map((item) => parseStudent(item as Record<string, unknown>))
  }

  async getStudentProfileData(studentId: number): Promise<PlacementFormDetail[]> {
    const list = await this.client.getList(`/users/students/${studentId}/profile-data`)
    return list.map((item) => parseFormDetail(item as Record<string, unknown>))
  }

  async verifyStudent(studentId: number): Promise<void> {
    await this.client.postJson(`/users/students/${studentId}/verify`, {})
  }

  async rejectStudent(studentId: number, reason: string, rejectedFields?: string[]): Promise<void> {
    await this.client.postJson(`/users/students/${studentId}/reject`, { reason, rejectedFields })
  }

  async approveProfileUnlock(studentId: number): Promise<void> {
    await this.client.postJson(`/users/students/${studentId}/unlock`, {})
  }

  async getFormResponses(formId: number): Promise<FormResponseRecord[]> {
    const list = await this.client.getList(`/responses/forms/${formId}`)
    return list.map((item) =>
      parseFormResponseRecord(item as Record<string, unknown>),
    )
  }

  async exportFormResponses(formId: number): Promise<Uint8Array> {
    return this.client.getBytes(`/responses/forms/${formId}/export`)
  }

  async exportCompany(
    companyId: number,
    fields?: string[],
  ): Promise<Uint8Array> {
    const q =
      fields?.length ? `?fields=${encodeURIComponent(fields.join(','))}` : ''
    return this.client.getBytes(`/companies/${companyId}/export${q}`)
  }

  async sendMessage(messageText: string, file?: File, parentId?: number): Promise<ChatMessage> {
    let json: Record<string, unknown>
    if (file) {
      const form = new FormData()
      form.append('messageText', messageText)
      form.append('attachment', file)
      if (parentId !== undefined) {
        form.append('parentId', String(parentId))
      }
      json = await this.client.postFormData('/messages', form)
    } else {
      json = await this.client.postJson('/messages', { messageText, parentId })
    }
    return parseChatMessage(json)
  }

  async deleteMessage(messageId: number): Promise<void> {
    await this.client.delete(`/messages/${messageId}`)
  }

  async getMessages(limit = 50, offset = 0): Promise<ChatMessagesResponse> {
    const json = await this.client.getJson(
      `/messages?limit=${limit}&offset=${offset}`,
    )
    const messagesRaw = json.messages as unknown[] | undefined
    const messages = (messagesRaw ?? []).map((item) =>
      parseChatMessage(item as Record<string, unknown>),
    )
    return {
      messages,
      total: Number(json.total) || 0,
    }
  }

  async getAllUsersForMention(): Promise<ChatUser[]> {
    const json = await this.client.getJson('/messages/users/all')
    const usersRaw = json.users as unknown[] | undefined
    return (usersRaw ?? []).map((item) =>
      parseChatUser(item as Record<string, unknown>),
    )
  }

  async updateStudentPlacedStatus(studentId: number, placed: boolean): Promise<void> {
    await this.client.postJson(`/users/students/${studentId}/placed`, { placed })
  }
}
