/**
 * Trader profile — the background Alan can't infer from trades alone.
 *
 * Deliberately asked *after* signup rather than on the signup form: every
 * extra field on a signup form costs completed signups, and none of this is
 * needed to create an account. It is needed to coach well.
 */

export const PROFILE_FIELDS = [
  {
    key: 'yearsTrading', label: 'How long have you been trading?', type: 'choice',
    options: ['Less than a year', '1–2 years', '3–5 years', '5+ years'],
  },
  {
    key: 'accountType', label: 'What are you trading?', type: 'choice',
    options: ['Personal account', 'Prop firm', 'Both'],
  },
  {
    key: 'propFirm', label: 'Which prop firm?', type: 'text',
    placeholder: 'e.g. Alpha Futures, Apex', optional: true,
    // Only relevant to people on a funded account
    showIf: p => p.accountType === 'Prop firm' || p.accountType === 'Both',
  },
  {
    key: 'accountSize', label: 'Account size', type: 'choice',
    options: ['Under $5k', '$5k–25k', '$25k–50k', '$50k–100k', '$100k+'],
  },
  {
    key: 'markets', label: 'What do you trade?', type: 'text',
    placeholder: 'e.g. NQ, ES', optional: true,
  },
  {
    key: 'weakness', label: "What's your biggest weakness right now?", type: 'longtext',
    placeholder: 'Be honest — this is the one Alan will hold you to.',
  },
  {
    key: 'goal', label: 'What do you want to achieve in the next 90 days?', type: 'longtext',
    placeholder: 'e.g. Pass my evaluation, stop revenge trading, journal every day',
  },
]

/** Fields that apply given the answers so far. */
export function visibleFields(profile = {}) {
  return PROFILE_FIELDS.filter(f => !f.showIf || f.showIf(profile))
}

/** Required (non-optional) visible fields that are still blank. */
export function missingFields(profile = {}) {
  return visibleFields(profile).filter(f => !f.optional && !String(profile[f.key] || '').trim())
}

export function isProfileComplete(profile) {
  if (!profile) return false
  return missingFields(profile).length === 0
}

/** How far through the profile they are, for a progress hint. */
export function profileProgress(profile = {}) {
  const fields = visibleFields(profile).filter(f => !f.optional)
  const done = fields.filter(f => String(profile[f.key] || '').trim()).length
  return { done, total: fields.length }
}

/**
 * Plain-text block for Alan's context. Returns '' when nothing is filled in,
 * so we never send an empty heading.
 */
export function profileForPrompt(profile) {
  if (!profile) return ''
  const lines = visibleFields(profile)
    .map(f => {
      const v = String(profile[f.key] || '').trim()
      return v ? `${f.label} ${v}` : null
    })
    .filter(Boolean)
  return lines.length ? lines.join('\n') : ''
}
