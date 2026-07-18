import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      currentUser: null, // { email, name }
      setUser: (user) => set({ currentUser: user }),
      clearUser: () => set({ currentUser: null }),
    }),
    { name: 'covenant-trader-auth', storage: createJSONStorage(() => localStorage) }
  )
)
