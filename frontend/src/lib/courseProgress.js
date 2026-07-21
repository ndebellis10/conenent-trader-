/**
 * Course progress, summarised for Alan.
 *
 * The course page owns the real state; this reads the same per-account
 * localStorage cache so Alan can reference lessons from anywhere in the app
 * (the AI home page, the dashboard) without mounting the course.
 */
import { COURSE_MODULES } from './courseOutline'
import { courseApi } from './api'

export const courseProgressKey = email =>
  `ct-course-progress__${String(email || 'guest').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`

/** Read the completed-lesson ids for an account. */
export function readCompleted(email) {
  try { return new Set(JSON.parse(localStorage.getItem(courseProgressKey(email)) || '[]')) }
  catch { return new Set() }
}

/** Lesson ids in the Start Here module (the onboarding videos). */
export function startHereLessonIds() {
  return (COURSE_MODULES.find(m => m.slug === 'start-here')?.lessons || []).map(l => l.id)
}

/**
 * Mark the Start Here lessons complete in the course. Called when the
 * onboarding video gate finishes, so the same videos show up already
 * checked in Course Material instead of asking the trader to re-watch them.
 * Merges into existing progress (the server POST replaces the whole list).
 */
export async function markStartHereWatched(email) {
  const done = readCompleted(email)
  let changed = false
  for (const id of startHereLessonIds()) {
    if (!done.has(id)) { done.add(id); changed = true }
  }
  if (!changed) return
  const merged = [...done]
  try { localStorage.setItem(courseProgressKey(email), JSON.stringify(merged)) } catch { /* private mode */ }
  try { await courseApi.saveProgress(merged) } catch { /* offline — the local cache still shows the ticks */ }
}

/**
 * Build the { completed, total, modules, recent } shape the chat endpoint
 * expects. Returns null when nothing has been watched yet, so we don't send
 * an empty block on every message.
 */
export function summarizeCourseProgress(email, doneSet) {
  const done = doneSet || readCompleted(email)
  if (!done.size) return null

  let completed = 0
  let total = 0
  const modules = []
  const recent = []

  for (const mod of COURSE_MODULES) {
    const lessons = mod.lessons || []
    const hit = lessons.filter(l => done.has(l.id))
    total += lessons.length
    completed += hit.length
    if (hit.length) {
      modules.push({ title: mod.title, completed: hit.length, total: lessons.length })
      // Later lessons in a section are the more recent ones in practice
      recent.push(...hit.slice(-2).map(l => l.title))
    }
  }

  return { completed, total, modules, recent: recent.slice(-5) }
}
