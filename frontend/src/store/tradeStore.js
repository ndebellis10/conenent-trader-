import { create } from 'zustand'
import { track, EVENTS } from '../lib/analytics'
import { syncLeaderboard } from '../lib/leaderboardApi'
import {
  isSecureMode,
  serverCreateTrade,
  serverUpdateTrade,
  serverDeleteTrade,
  getCurrentUserEmail,
  getCurrentUserDisplayName,
  setCurrentUser,
} from '../lib/syncManager'

function syncAfterChange(trades, settingsName) {
  const email = getCurrentUserEmail()
  if (!email) return
  // Real first + last name wins, then the display name stored at login, then email prefix
  const authDisplayName = getCurrentUserDisplayName()
  const name = (settingsName && settingsName !== 'Trader')
    ? settingsName
    : (authDisplayName || email.split('@')[0])
  syncLeaderboard(name, email, trades).catch(() => {})
}

const VERSES = [
  { text: "The plans of the diligent lead to profit as surely as haste leads to poverty.", ref: "Proverbs 21:5" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "Suppose one of you wants to build a tower. Won't you first sit down and estimate the cost?", ref: "Luke 14:28" },
  { text: "Plans fail for lack of counsel, but with many advisers they succeed.", ref: "Proverbs 11:14" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged.", ref: "Joshua 1:9" },
  { text: "Dishonest money dwindles away, but whoever gathers money little by little makes it grow.", ref: "Proverbs 13:11" },
  { text: "The reward of humility and the fear of the LORD are riches, honor and life.", ref: "Proverbs 22:4" },
  { text: "Do not be anxious about anything, but in everything by prayer and petition, present your requests to God.", ref: "Philippians 4:6" },
  { text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.", ref: "2 Timothy 1:7" },
  { text: "Commit to the LORD whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
  { text: "All hard work brings a profit, but mere talk leads only to poverty.", ref: "Proverbs 14:23" },
  { text: "A good man leaves an inheritance to his children's children.", ref: "Proverbs 13:22" },
]

export const useTradeStore = create((set) => ({
  trades: [],
  journalEntries: [],
  playbook: [],
  settings: {
    name: 'Trader',
    email: '',
    startingBalance: 10000,
    currency: 'USD',
    riskPerTrade: 1,
    customConfluences: [],
    customSetupTypes:  [],
  },

  addTrade: (trade) => {
    const tempId   = Date.now().toString()
    const newTrade = { ...trade, id: tempId, createdAt: new Date().toISOString() }
    set((s) => {
      const newTrades = [newTrade, ...s.trades]
      syncAfterChange(newTrades, s.settings?.fullName || s.settings?.name)
      track(s.trades.length === 0 ? EVENTS.FIRST_TRADE : EVENTS.TRADE_LOGGED)
      return { trades: newTrades }
    })
    // Background sync to server in secure mode — swap temp id with server UUID on success
    if (isSecureMode()) {
      serverCreateTrade(newTrade).then(serverTrade => {
        if (!serverTrade) return
        set(s => ({
          trades: s.trades.map(t => t.id === tempId ? { ...serverTrade } : t),
        }))
      })
    }
  },
  deleteTrade: (id) => {
    set((s) => {
      const newTrades = s.trades.filter(t => t.id !== id)
      syncAfterChange(newTrades, s.settings?.fullName || s.settings?.name)
      return { trades: newTrades }
    })
    serverDeleteTrade(id)
  },
  updateTrade: (id, data) => {
    set((s) => {
      const newTrades = s.trades.map(t => t.id === id ? { ...t, ...data } : t)
      syncAfterChange(newTrades, s.settings?.fullName || s.settings?.name)
      return { trades: newTrades }
    })
    serverUpdateTrade(id, data)
  },

  addJournalEntry: (entry) => set((s) => ({
    journalEntries: [{ ...entry, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...s.journalEntries]
  })),

  addPlaybookStrategy: (strategy) => set((s) => ({
    playbook: [{ ...strategy, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...s.playbook]
  })),
  deletePlaybookStrategy: (id) => set((s) => ({ playbook: s.playbook.filter(p => p.id !== id) })),

  updateSettings: (data) => set((s) => {
    const newSettings = { ...s.settings, ...data }
    if (data.name) {
      // Update the stored display name so leaderboard uses the new name immediately
      setCurrentUser(getCurrentUserEmail(), data.name)
      syncAfterChange(s.trades, data.fullName || data.name)
    }
    return { settings: newSettings }
  }),

  getVerse: () => VERSES[Math.floor(Math.random() * VERSES.length)],
  getAllVerses: () => VERSES,

  reset: () => set({
    trades: [],
    journalEntries: [],
    playbook: [],
    settings: { name: 'Trader', email: '', startingBalance: 10000, currency: 'USD', riskPerTrade: 1, customConfluences: [], customSetupTypes: [] },
  }),
}))
