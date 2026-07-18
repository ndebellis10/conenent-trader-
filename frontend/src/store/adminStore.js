import { create } from 'zustand'

const SK_KEY = 'ft-admin-sk'

export const useAdminStore = create((set) => ({
  viewingUser: null,
  // Restore session key from sessionStorage on page load so admin stays logged in after refresh
  sessionKey: sessionStorage.getItem(SK_KEY) || null,

  setViewingUser:   (user) => set({ viewingUser: user }),
  clearViewingUser: ()     => set({ viewingUser: null }),

  setSessionKey: (key) => {
    if (key) sessionStorage.setItem(SK_KEY, key)
    else     sessionStorage.removeItem(SK_KEY)
    set({ sessionKey: key })
  },
}))
