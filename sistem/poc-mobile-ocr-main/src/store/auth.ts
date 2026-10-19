import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OperatorProfile {
  code: string
  name: string
  entity_pengirim: string
  entity_penerima: string
}

interface AuthState {
  token: string | null
  operator: OperatorProfile | null
  setSession: (token: string, operator: OperatorProfile) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      operator: null,
      setSession: (token, operator) => set({ token, operator }),
      logout: () => set({ token: null, operator: null }),
    }),
    {
      name: 'analisa-auth',
    },
  ),
)
