/**
 * Per-user localStorage helpers.
 *
 * Each user's data is stored under a key that includes their email address so
 * different accounts on the same browser never share or overwrite each other's data.
 *
 * IMPORTANT: We always use setState WITHOUT the replace flag so Zustand merges
 * our data into the existing store — this preserves all action functions
 * (addTrade, deleteTrade, etc.) which would be wiped if we did a full replace.
 */
import { useTradeStore } from '../store/tradeStore'
import { useGoalStore }  from '../store/goalStore'

/* ── Key helpers ─────────────────────────────────────────────── */
function safeEmail(email = '') {
  return email.toLowerCase().replace(/[^a-z0-9._-]/g, '_') || 'guest'
}

export function tradeKey(email) { return `ft-trades__${safeEmail(email)}` }
export function goalKey(email)  { return `ft-goals__${safeEmail(email)}`  }

/* ── Default data shapes (data only, no actions) ──────────────── */
const defaultTradeData = {
  trades: [],
  journalEntries: [],
  playbook: [],
  settings: { name: 'Trader', email: '', startingBalance: 10000, currency: 'USD', riskPerTrade: 1, customConfluences: [], customSetupTypes: [] },
}
const defaultGoalData = { goals: [], completions: {} }

/* ── Auto-save subscriptions ───────────────────────────────────── */
// Tracks the currently active user email. Only write when a user is logged in.
let _currentEmail = null

export function setActiveEmail(email) {
  _currentEmail = email || null
}

useTradeStore.subscribe((state) => {
  if (!_currentEmail) return  // never write when no user is active
  const toSave = {
    trades:         state.trades,
    journalEntries: state.journalEntries,
    playbook:       state.playbook,
    settings:       state.settings,
  }
  try { localStorage.setItem(tradeKey(_currentEmail), JSON.stringify(toSave)) } catch {}
})

useGoalStore.subscribe((state) => {
  if (!_currentEmail) return
  const toSave = {
    goals:       state.goals,
    completions: state.completions,
  }
  try { localStorage.setItem(goalKey(_currentEmail), JSON.stringify(toSave)) } catch {}
})

/* ── Load (call after login) ───────────────────────────────────── */
export function loadUserStores(email) {
  // Trades / journal / playbook / settings
  try {
    const raw  = localStorage.getItem(tradeKey(email))
    const data = raw ? JSON.parse(raw) : null
    // Merge only — never replace — so action functions stay intact
    useTradeStore.setState(data ?? defaultTradeData)
  } catch {
    useTradeStore.setState(defaultTradeData)
  }

  // Goals
  try {
    const raw  = localStorage.getItem(goalKey(email))
    const data = raw ? JSON.parse(raw) : null
    useGoalStore.setState(data ?? defaultGoalData)
  } catch {
    useGoalStore.setState(defaultGoalData)
  }
}

/* ── 5-second interval flush ────────────────────────────────────── */
setInterval(() => {
  if (!_currentEmail) return
  try {
    const ts = useTradeStore.getState()
    localStorage.setItem(tradeKey(_currentEmail), JSON.stringify({
      trades: ts.trades, journalEntries: ts.journalEntries,
      playbook: ts.playbook, settings: ts.settings,
    }))
  } catch {}
  try {
    const gs = useGoalStore.getState()
    localStorage.setItem(goalKey(_currentEmail), JSON.stringify({
      goals: gs.goals, completions: gs.completions,
    }))
  } catch {}
}, 5000)

/* ── Clear (call after logout) ─────────────────────────────────── */
export function clearUserStores() {
  // Merge so action functions are preserved even after logout
  useTradeStore.setState(defaultTradeData)
  useGoalStore.setState(defaultGoalData)
}
