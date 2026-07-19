/* User-defined Log Trade questions.

   Traders can add their own Psychology and Execution questions from the
   Reports page. They render on the Log Trade form and get their own
   breakdown in the matching report tab.

   Stored on settings.customQuestions, answers on trade.customAnswers keyed
   by question id, so nothing collides with the built-in fields. */

export const QUESTION_CATEGORIES = ['psychology', 'execution']

/* Ready-made answer sets, so adding a question is one decision not three. */
export const OPTION_PRESETS = [
  { id: 'yesno',    label: 'Yes / No',                    options: ['Yes', 'No'] },
  { id: 'yesnop',   label: 'Yes / Partially / No',        options: ['Yes', 'Partially', 'No'] },
  { id: 'quality',  label: 'Excellent → Poor',            options: ['Excellent', 'Good', 'Fair', 'Poor'] },
  { id: 'lowhigh',  label: 'Low / Medium / High',         options: ['Low', 'Medium', 'High'] },
]

export function getCustomQuestions(settings, category) {
  const all = settings?.customQuestions
  if (!all || typeof all !== 'object') return []
  const list = all[category]
  return Array.isArray(list) ? list : []
}

export function allCustomQuestions(settings) {
  return QUESTION_CATEGORIES.flatMap(c =>
    getCustomQuestions(settings, c).map(q => ({ ...q, category: c }))
  )
}

function newId() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

/* Returns the updated customQuestions object — caller passes it to updateSettings. */
export function withQuestionAdded(settings, category, label, options) {
  const clean = String(label || '').trim()
  if (!clean) return null
  const current = settings?.customQuestions || {}
  const list = getCustomQuestions(settings, category)
  // Don't add the same question twice
  if (list.some(q => q.label.toLowerCase() === clean.toLowerCase())) return null
  return {
    ...current,
    [category]: [...list, { id: newId(), label: clean, options: options?.length ? options : ['Yes', 'No'] }],
  }
}

export function withQuestionRemoved(settings, category, id) {
  const current = settings?.customQuestions || {}
  return { ...current, [category]: getCustomQuestions(settings, category).filter(q => q.id !== id) }
}

/* Win rate / P&L per answer for one custom question. */
export function analyseQuestion(trades, question) {
  const buckets = question.options.map(opt => ({ option: opt, n: 0, wins: 0, pnl: 0 }))
  let answered = 0

  trades.forEach(t => {
    const val = t.customAnswers?.[question.id]
    if (!val) return
    const b = buckets.find(x => x.option === val)
    if (!b) return
    answered += 1
    b.n += 1
    b.pnl += parseFloat(t.netPnl) || 0
    if (t.result === 'Win') b.wins += 1
  })

  return {
    answered,
    buckets: buckets.map(b => ({
      ...b,
      winRate: b.n ? (b.wins / b.n) * 100 : 0,
      avgPnl:  b.n ? b.pnl / b.n : 0,
    })),
  }
}
