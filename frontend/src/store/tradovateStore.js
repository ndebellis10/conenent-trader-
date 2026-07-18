import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useTradovateStore = create(
  persist(
    (set, get) => ({
      username: '',
      cid: '',
      environment: 'live',
      accessToken: null,
      tokenExpiry: null,
      connected: false,
      lastSync: null,
      syncError: null,
      syncing: false,
      autoSync: true,
      importedIds: [],

      setCredentials: (username, cid, environment) => set({ username, cid, environment }),

      setToken: (accessToken, tokenExpiry) => set({
        accessToken,
        tokenExpiry,
        connected: true,
        syncError: null,
      }),

      disconnect: () => set({
        accessToken: null,
        tokenExpiry: null,
        connected: false,
        syncError: null,
      }),

      checkTokenExpiry: () => {
        const { accessToken, tokenExpiry } = get()
        if (accessToken && tokenExpiry && new Date(tokenExpiry) <= new Date()) {
          set({ accessToken: null, tokenExpiry: null, connected: false })
        }
      },

      setLastSync: (ts) => set({ lastSync: ts }),
      setSyncError: (err) => set({ syncError: err }),
      setSyncing: (v) => set({ syncing: v }),
      setAutoSync: (v) => set({ autoSync: v }),
      addImportedIds: (ids) => set(s => ({
        importedIds: [...new Set([...s.importedIds, ...ids])],
      })),
    }),
    {
      name: 'covenant-trader-tradovate',
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({
        username: s.username,
        cid: s.cid,
        environment: s.environment,
        autoSync: s.autoSync,
        importedIds: s.importedIds,
        lastSync: s.lastSync,
        accessToken: s.accessToken,
        tokenExpiry: s.tokenExpiry,
        connected: s.connected,
      }),
    }
  )
)
