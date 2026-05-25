import { create } from 'zustand'
import { useAuthStore, repo } from './useAuthStore'
import type { AppUser } from '@/types'

interface ProfileState {
  profile: AppUser | null
  draft: Partial<AppUser>
  loading: boolean
  saving: boolean
  error: string | null

  // Actions
  fetchProfile: () => Promise<void>
  setDraftField: (field: keyof AppUser, value: AppUser[keyof AppUser]) => void
  saveProfile: () => Promise<void>
  uploadResume: (file: File) => Promise<void>
  uploadProfilePicture: (file: File) => Promise<void>
  requestUnlock: () => Promise<void>
  resetDraft: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  draft: {},
  loading: false,
  saving: false,
  error: null,

  fetchProfile: async () => {
    // Only show loader if we don't have a profile yet
    if (!get().profile) set({ loading: true })
    set({ error: null })
    
    try {
      const profile = await repo.getProfile()
      
      // Update official profile
      set({ profile, loading: false })
      
      // Check for locally saved draft first
      const userId = useAuthStore.getState().session?.user?.id
      const savedDraftStr = userId ? localStorage.getItem(`profile-draft-${userId}`) : null
      if (savedDraftStr) {
        try {
          const savedDraft = JSON.parse(savedDraftStr)
          set({ draft: savedDraft })
          return
        } catch (e) {
          // Ignore parse errors and fallback
        }
      }
      
      // If no local draft, initialize with official data
      set({ draft: { ...profile } })
    } catch (e) {
      set({ 
        error: e instanceof Error ? e.message : String(e), 
        loading: false 
      })
    }
  },

  setDraftField: (field, value) => {
    set((state) => {
      const newDraft = { ...state.draft, [field]: value }
      const userId = useAuthStore.getState().session?.user?.id
      if (userId) {
        localStorage.setItem(`profile-draft-${userId}`, JSON.stringify(newDraft))
      }
      return { draft: newDraft }
    })
  },

  resetDraft: () => {
    const { profile } = get()
    if (profile) {
      const userId = useAuthStore.getState().session?.user?.id
      if (userId) {
        localStorage.removeItem(`profile-draft-${userId}`)
      }
      set({ draft: { ...profile } })
    }
  },

  saveProfile: async () => {
    const { draft, profile } = get()
    if (!profile) return

    set({ saving: true })
    try {
      // Convert numeric fields from draft
      const payload: Record<string, unknown> = {
        ...draft,
        ugCgpa: Number(draft.ugCgpa) || profile.ugCgpa,
        tenthMarks: Number(draft.tenthMarks) || profile.tenthMarks,
        twelfthMarks: Number(draft.twelfthMarks) || profile.twelfthMarks,
        firstSemSgpa: Number(draft.firstSemSgpa) || profile.firstSemSgpa,
      }

      const updated = await repo.updateProfile(payload)
      useAuthStore.getState().setSessionUser(updated)
      
      const userId = useAuthStore.getState().session?.user?.id
      if (userId) {
        localStorage.removeItem(`profile-draft-${userId}`)
      }

      set({ profile: updated, draft: { ...updated }, saving: false })
    } catch (e) {
      set({ saving: false })
      throw e
    }
  },

  uploadResume: async (file) => {
    set({ saving: true })
    try {
      const updated = await repo.uploadResume(file)
      useAuthStore.getState().setSessionUser(updated)
      
      const userId = useAuthStore.getState().session?.user?.id
      if (userId) {
        localStorage.removeItem(`profile-draft-${userId}`)
      }

      set({ profile: updated, draft: { ...updated }, saving: false })
    } catch (e) {
      set({ saving: false })
      throw e
    }
  },

  uploadProfilePicture: async (file) => {
    set({ saving: true })
    try {
      const updated = await repo.uploadProfilePicture(file)
      useAuthStore.getState().setSessionUser(updated)
      
      const userId = useAuthStore.getState().session?.user?.id
      if (userId) {
        localStorage.removeItem(`profile-draft-${userId}`)
      }

      set({ profile: updated, draft: { ...updated }, saving: false })
    } catch (e) {
      set({ saving: false })
      throw e
    }
  },

  requestUnlock: async () => {
    set({ saving: true })
    try {
      const updated = await repo.requestProfileUnlock()
      
      const userId = useAuthStore.getState().session?.user?.id
      if (userId) {
        localStorage.removeItem(`profile-draft-${userId}`)
      }

      set({ profile: updated, draft: { ...updated }, saving: false })
    } catch (e) {
      set({ saving: false })
      throw e
    }
  }
}))
