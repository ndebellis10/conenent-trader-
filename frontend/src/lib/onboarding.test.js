import { describe, it, expect, beforeEach } from 'vitest'
import { buildSteps, progressOf, isDismissed, dismiss } from './onboarding'
import { historyKey } from '../components/app/AlanChat'

/* The checklist derives every step from real data. A step that reports "done"
   when the trader hasn't done it is worse than no checklist at all. */

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  }
})

const stepFor = (id, ctx) => buildSteps({ email: 'a@x.com', ...ctx }).find(s => s.id === id)

describe('buildSteps', () => {
  it('starts with nothing done for a brand new account', () => {
    const steps = buildSteps({ email: 'new@x.com' })
    expect(steps.every(s => !s.done)).toBe(true)
  })

  it('never throws when the stores are still empty', () => {
    expect(() => buildSteps({})).not.toThrow()
    expect(buildSteps({}).length).toBeGreaterThan(0)
  })

  it('completes the name step only for a real name', () => {
    expect(stepFor('name', { settings: { name: 'Nicholas' } }).done).toBe(true)
    expect(stepFor('name', { settings: { name: '' } }).done).toBe(false)
    expect(stepFor('name', { settings: { name: '   ' } }).done).toBe(false)
    // "Trader" is the placeholder default, not a name they chose
    expect(stepFor('name', { settings: { name: 'Trader' } }).done).toBe(false)
  })

  it('completes the lesson step once any lesson is watched', () => {
    expect(stepFor('lesson', { courseProgress: { completed: 1 } }).done).toBe(true)
    expect(stepFor('lesson', { courseProgress: { completed: 0 } }).done).toBe(false)
    expect(stepFor('lesson', { courseProgress: null }).done).toBe(false)
  })

  it('completes the trade step on the first trade', () => {
    expect(stepFor('trade', { trades: [{ symbol: 'NQ' }] }).done).toBe(true)
    expect(stepFor('trade', { trades: [] }).done).toBe(false)
  })

  it('completes the goal and strategy steps on the first entry', () => {
    expect(stepFor('goal', { goals: [{ text: 'Journal daily' }] }).done).toBe(true)
    expect(stepFor('goal', { goals: [] }).done).toBe(false)
    expect(stepFor('strategy', { playbook: [{ name: 'Covenant Model' }] }).done).toBe(true)
    expect(stepFor('strategy', { playbook: [] }).done).toBe(false)
  })

  it('completes the chat step only after the trader speaks, not Alan', () => {
    // Alan's opening message alone must not count — they haven't asked anything
    localStorage.setItem(historyKey('a@x.com', false), JSON.stringify([
      { role: 'assistant', content: 'Peace be with you.' },
    ]))
    expect(stepFor('chat', {}).done).toBe(false)

    localStorage.setItem(historyKey('a@x.com', false), JSON.stringify([
      { role: 'assistant', content: 'Peace be with you.' },
      { role: 'user', content: 'What should I work on?' },
    ]))
    expect(stepFor('chat', {}).done).toBe(true)
  })

  it('survives a corrupted chat history', () => {
    localStorage.setItem(historyKey('a@x.com', false), '{not json')
    expect(stepFor('chat', {}).done).toBe(false)
  })
})

describe('progressOf', () => {
  it('counts finished steps', () => {
    const p = progressOf([{ done: true }, { done: false }, { done: true }])
    expect(p).toEqual({ done: 2, total: 3, complete: false })
  })

  it('reports complete only when every step is done', () => {
    expect(progressOf([{ done: true }, { done: true }]).complete).toBe(true)
    expect(progressOf([{ done: true }, { done: false }]).complete).toBe(false)
  })
})

describe('dismissal', () => {
  it('is off until dismissed, and scoped per account', () => {
    expect(isDismissed('a@x.com')).toBe(false)
    dismiss('a@x.com')
    expect(isDismissed('a@x.com')).toBe(true)
    expect(isDismissed('b@x.com')).toBe(false)
  })
})
