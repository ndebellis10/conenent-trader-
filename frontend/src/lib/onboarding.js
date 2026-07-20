/**
 * First-run checklist.
 *
 * Every step is derived from data the trader has actually created — there are
 * no checkboxes to tick. That means the list can never claim you've done
 * something you haven't, and it fills itself in as you use the app normally.
 */
import { historyKey } from '../components/app/AlanChat'
import { isProfileComplete } from './traderProfile'

const dismissKey = email =>
  `ct-onboarding-done__${String(email || 'guest').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`

export function isDismissed(email) {
  try { return localStorage.getItem(dismissKey(email)) === '1' }
  catch { return false }
}

export function dismiss(email) {
  try { localStorage.setItem(dismissKey(email), '1') } catch { /* private mode */ }
}

/** Have they ever sent Alan a message? Reuses the chat's own saved thread. */
function hasChatted(email) {
  try {
    const raw = JSON.parse(localStorage.getItem(historyKey(email, false)) || 'null')
    return Array.isArray(raw) && raw.some(m => m.role === 'user')
  } catch { return false }
}

/**
 * Build the checklist. `go` keys are resolved to navigation by the component
 * so this module stays free of router imports and is easy to test.
 */
export function buildSteps({ email, settings, trades, goals, playbook, courseProgress }) {
  return [
    {
      id: 'name',
      title: 'Add your name',
      desc: 'So the leaderboard shows you, not your email.',
      go: 'settings',
      done: Boolean(settings?.name && String(settings.name).trim() && settings.name !== 'Trader'),
    },
    {
      id: 'profile',
      title: 'Tell Alan about your trading',
      desc: 'Your experience and goals, so his coaching starts informed.',
      go: 'profile',
      done: isProfileComplete(settings?.traderProfile),
    },
    {
      id: 'lesson',
      title: 'Watch your first lesson',
      desc: 'Start Here walks you through the basics.',
      go: 'course',
      done: Boolean(courseProgress?.completed),
    },
    {
      id: 'trade',
      title: 'Log your first trade',
      desc: 'Alan needs trades before he can coach you.',
      go: 'log',
      done: (trades?.length || 0) > 0,
    },
    {
      id: 'chat',
      title: 'Ask Alan a question',
      desc: 'He has read your journal and the whole course.',
      go: 'chat',
      done: hasChatted(email),
    },
    {
      id: 'goal',
      title: 'Set a daily goal',
      desc: 'The habit matters more than any single trade.',
      go: 'goals',
      done: (goals?.length || 0) > 0,
    },
    {
      id: 'strategy',
      title: 'Add a strategy',
      desc: 'Write down the setup you actually trade.',
      go: 'playbook',
      done: (playbook?.length || 0) > 0,
    },
  ]
}

/** { done, total, complete } for the progress bar. */
export function progressOf(steps) {
  const done = steps.filter(s => s.done).length
  return { done, total: steps.length, complete: done === steps.length }
}
