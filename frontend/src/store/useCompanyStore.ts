import { create } from 'zustand'
import { useAuthStore } from './useAuthStore'
import type { Company } from '@/types'

interface CompanyState {
  companies: Company[] | null
  loading: boolean
  error: string | null
  busyIds: Set<number>

  // Actions
  fetchCompanies: () => Promise<void>
  updateApplication: (
    company: Company,
    patch: { consent?: boolean; tracker?: boolean }
  ) => Promise<void>
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: null,
  loading: false,
  error: null,
  busyIds: new Set(),

  fetchCompanies: async () => {
    // Only show loading if we don't have data yet
    if (!get().companies) set({ loading: true })
    set({ error: null })
    
    try {
      const repo = useAuthStore.getState().repo
      const companies = await repo.getCompanies()
      set({ companies, loading: false })
    } catch (e) {
      set({ 
        error: e instanceof Error ? e.message : String(e), 
        loading: false 
      })
    }
  },

  updateApplication: async (company, patch) => {
    const { busyIds } = get()
    set({ busyIds: new Set(busyIds).add(company.id) })
    
    try {
      const repo = useAuthStore.getState().repo
      await repo.saveApplication(company.id, patch)

      // Update local state immediately for a snappy UI
      const currentCompanies = get().companies
      if (currentCompanies) {
        set({
          companies: currentCompanies.map((c) =>
            c.id === company.id ? { ...c, ...patch } : c
          ),
        })
      }
    } finally {
      set((state) => {
        const nextBusy = new Set(state.busyIds)
        nextBusy.delete(company.id)
        return { busyIds: nextBusy }
      })
    }
  },
}))
