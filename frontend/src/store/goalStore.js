import { create } from 'zustand'
import {
  isSecureMode,
  serverCreateGoal,
  serverUpdateGoal,
  serverDeleteGoal,
  serverToggleGoalCompletion,
} from '../lib/syncManager'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export const useGoalStore = create((set) => ({
  goals: [],
  completions: {}, // { 'YYYY-MM-DD': [goalId, ...] }

  addGoal: (text) => {
    const tempId  = uid()
    const newGoal = { id: tempId, text, createdAt: new Date().toISOString() }
    set(state => ({ goals: [...state.goals, newGoal] }))
    // Background sync — swap temp id with server UUID on success
    if (isSecureMode()) {
      serverCreateGoal(text).then(serverGoal => {
        if (!serverGoal) return
        set(s => ({
          goals: s.goals.map(g => g.id === tempId ? { ...g, id: serverGoal.id } : g),
          // Update any completions that referenced the temp id
          completions: Object.fromEntries(
            Object.entries(s.completions).map(([d, ids]) => [
              d, ids.map(i => i === tempId ? serverGoal.id : i),
            ])
          ),
        }))
      })
    }
  },

  deleteGoal: (id) => {
    set(state => ({
      goals: state.goals.filter(g => g.id !== id),
      completions: Object.fromEntries(
        Object.entries(state.completions).map(([d, ids]) => [d, ids.filter(i => i !== id)])
      ),
    }))
    serverDeleteGoal(id)
  },

  editGoal: (id, text) => {
    set(state => ({ goals: state.goals.map(g => g.id === id ? { ...g, text } : g) }))
    serverUpdateGoal(id, { text })
  },

  reorderGoals: (goals) => set({ goals }),

  toggleCompletion: (goalId, date) => {
    set(state => {
      const existing = state.completions[date] || []
      const done = existing.includes(goalId)
      return {
        completions: {
          ...state.completions,
          [date]: done ? existing.filter(i => i !== goalId) : [...existing, goalId],
        },
      }
    })
    serverToggleGoalCompletion(goalId, date)
  },

  reset: () => set({ goals: [], completions: {} }),
}))
