import { describe, it, expect, beforeEach } from 'vitest'
import { courseProgressKey, readCompleted, summarizeCourseProgress } from './courseProgress'
import { COURSE_MODULES } from './courseOutline'

/* Course progress is cached per account in localStorage. A bug here quietly
   erases lessons someone already watched, so the account scoping matters. */

// Minimal localStorage stand-in — these tests run outside a browser
beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  }
})

const firstLessons = n => COURSE_MODULES.flatMap(m => m.lessons || []).slice(0, n)

describe('courseProgressKey', () => {
  it('scopes progress to the account so two users never collide', () => {
    expect(courseProgressKey('a@x.com')).not.toBe(courseProgressKey('b@x.com'))
  })

  it('ignores case and punctuation differences in the same address', () => {
    expect(courseProgressKey('Nick@X.com')).toBe(courseProgressKey('nick@x.com'))
  })

  it('has a guest key for signed-out use', () => {
    expect(courseProgressKey(null)).toBe(courseProgressKey(undefined))
    expect(courseProgressKey(null)).toContain('guest')
  })
})

describe('readCompleted', () => {
  it('returns an empty set for an account with no history', () => {
    expect(readCompleted('new@x.com').size).toBe(0)
  })

  it('reads back what was stored', () => {
    localStorage.setItem(courseProgressKey('a@x.com'), JSON.stringify(['l1', 'l2']))
    const done = readCompleted('a@x.com')
    expect(done.size).toBe(2)
    expect(done.has('l1')).toBe(true)
  })

  it('does not leak one account\'s progress into another', () => {
    localStorage.setItem(courseProgressKey('a@x.com'), JSON.stringify(['l1']))
    expect(readCompleted('b@x.com').size).toBe(0)
  })

  it('recovers from corrupted storage instead of crashing the page', () => {
    localStorage.setItem(courseProgressKey('a@x.com'), '{not json')
    expect(readCompleted('a@x.com').size).toBe(0)
  })
})

describe('summarizeCourseProgress', () => {
  it('sends nothing when no lesson has been watched', () => {
    expect(summarizeCourseProgress('a@x.com', new Set())).toBeNull()
  })

  it('counts completed lessons against the real course outline', () => {
    const watched = firstLessons(3).map(l => l.id)
    const summary = summarizeCourseProgress('a@x.com', new Set(watched))
    expect(summary.completed).toBe(3)
    expect(summary.total).toBeGreaterThan(3)
  })

  it('only lists sections the trader has actually started', () => {
    const summary = summarizeCourseProgress('a@x.com', new Set(firstLessons(1).map(l => l.id)))
    expect(summary.modules).toHaveLength(1)
    expect(summary.modules[0].completed).toBe(1)
  })

  it('never reports more completed than a section contains', () => {
    const all = COURSE_MODULES.flatMap(m => m.lessons || []).map(l => l.id)
    const summary = summarizeCourseProgress('a@x.com', new Set(all))
    expect(summary.completed).toBe(summary.total)
    summary.modules.forEach(m => expect(m.completed).toBeLessThanOrEqual(m.total))
  })

  it('caps the recent list so the prompt stays small', () => {
    const all = COURSE_MODULES.flatMap(m => m.lessons || []).map(l => l.id)
    expect(summarizeCourseProgress('a@x.com', new Set(all)).recent.length).toBeLessThanOrEqual(5)
  })

  it('ignores ids that are not in the course', () => {
    const summary = summarizeCourseProgress('a@x.com', new Set(['deleted-lesson', 'nope']))
    expect(summary.completed).toBe(0)
  })

  it('falls back to stored progress when no set is passed', () => {
    const watched = firstLessons(2).map(l => l.id)
    localStorage.setItem(courseProgressKey('a@x.com'), JSON.stringify(watched))
    expect(summarizeCourseProgress('a@x.com').completed).toBe(2)
  })
})
