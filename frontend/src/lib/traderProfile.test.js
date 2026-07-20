import { describe, it, expect } from 'vitest'
import {
  visibleFields, missingFields, isProfileComplete, profileProgress, profileForPrompt,
} from './traderProfile'

/* The profile feeds Alan's coaching, so "complete" has to mean complete —
   and optional fields must never block someone from finishing. */

const full = {
  yearsTrading: '1–2 years',
  accountType: 'Personal account',
  accountSize: '$5k–25k',
  weakness: 'I move my stop',
  goal: 'Pass my evaluation',
}

describe('visibleFields', () => {
  it('hides the prop firm question for a personal account', () => {
    const keys = visibleFields({ accountType: 'Personal account' }).map(f => f.key)
    expect(keys).not.toContain('propFirm')
  })

  it('shows it for prop firm and for both', () => {
    expect(visibleFields({ accountType: 'Prop firm' }).map(f => f.key)).toContain('propFirm')
    expect(visibleFields({ accountType: 'Both' }).map(f => f.key)).toContain('propFirm')
  })

  it('does not throw on an empty profile', () => {
    expect(() => visibleFields()).not.toThrow()
    expect(visibleFields({}).length).toBeGreaterThan(0)
  })
})

describe('isProfileComplete', () => {
  it('is false for nothing and for partial answers', () => {
    expect(isProfileComplete(null)).toBe(false)
    expect(isProfileComplete({})).toBe(false)
    expect(isProfileComplete({ yearsTrading: '5+ years' })).toBe(false)
  })

  it('is true once every required field is answered', () => {
    expect(isProfileComplete(full)).toBe(true)
  })

  it('does not require the optional fields', () => {
    // markets and propFirm are optional — absent, it's still complete
    expect(isProfileComplete({ ...full, markets: '', propFirm: '' })).toBe(true)
  })

  it('treats whitespace as unanswered', () => {
    expect(isProfileComplete({ ...full, weakness: '   ' })).toBe(false)
  })

  it('requires the prop firm answer set only when relevant', () => {
    const prop = { ...full, accountType: 'Prop firm' }
    // propFirm is optional, so switching account type must not block completion
    expect(isProfileComplete(prop)).toBe(true)
  })
})

describe('missingFields / profileProgress', () => {
  it('names what is still blank', () => {
    const missing = missingFields({ yearsTrading: '5+ years' }).map(f => f.key)
    expect(missing).toContain('weakness')
    expect(missing).not.toContain('yearsTrading')
  })

  it('counts answered required fields', () => {
    expect(profileProgress(full)).toEqual({ done: 5, total: 5 })
    expect(profileProgress({}).done).toBe(0)
  })
})

describe('profileForPrompt', () => {
  it('returns nothing when there is nothing to say', () => {
    expect(profileForPrompt(null)).toBe('')
    expect(profileForPrompt({})).toBe('')
  })

  it('includes answered fields with their question', () => {
    const text = profileForPrompt(full)
    expect(text).toContain('I move my stop')
    expect(text).toContain('Pass my evaluation')
  })

  it('leaves out blanks rather than printing empty lines', () => {
    expect(profileForPrompt({ weakness: 'Sizing' }).split('\n')).toHaveLength(1)
  })
})
