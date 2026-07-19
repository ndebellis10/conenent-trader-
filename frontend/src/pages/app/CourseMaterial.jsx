import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, Check, ChevronRight } from 'lucide-react'
import { COURSE_MODULES, TOTAL_LESSONS } from '../../lib/courseOutline'

/* Course Material — module list, lesson player and progress.
   Sections render in the app sidebar (see COURSE_NAV in AppLayout). */

const BLUE  = '#3B82F6'
const GREEN = '#4CAF7D'
const PROGRESS_KEY = 'ct-course-progress'

function loadDone() {
  try { return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]')) }
  catch { return new Set() }
}
function saveDone(set) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify([...set])) } catch { /* private mode */ }
}

/* Progress ring — the one Whoop-ish flourish, kept to a single element */
function Ring({ pct, size = 58, stroke = 5, color = BLUE, label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#282828" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: size > 80 ? '1.35rem' : '0.8rem', fontWeight: 800, color: '#F2F2F2', lineHeight: 1 }}>
          {Math.round(pct)}%
        </span>
        {label && <span style={{ color: '#5E5E5E', fontSize: '0.58rem', marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  )
}

export default function CourseMaterial() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [done, setDone] = useState(loadDone)
  const [openModule, setOpenModule] = useState(COURSE_MODULES[0]?.slug)

  const lessonId = searchParams.get('lesson')
  const view     = searchParams.get('tab') === 'progress' ? 'progress' : 'modules'

  useEffect(() => { saveDone(done) }, [done])

  const toggle = (id) => setDone(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const stats = useMemo(() => {
    const perModule = COURSE_MODULES.map(m => {
      const c = m.lessons.filter(l => done.has(l.id)).length
      return { ...m, completed: c, pct: m.lessons.length ? (c / m.lessons.length) * 100 : 0 }
    })
    const completed = perModule.reduce((n, m) => n + m.completed, 0)
    return { perModule, completed, pct: TOTAL_LESSONS ? (completed / TOTAL_LESSONS) * 100 : 0 }
  }, [done])

  const current = useMemo(() => {
    if (!lessonId) return null
    for (const m of COURSE_MODULES) {
      const i = m.lessons.findIndex(l => l.id === lessonId)
      if (i >= 0) return { module: m, lesson: m.lessons[i], index: i, next: m.lessons[i + 1] || null }
    }
    return null
  }, [lessonId])

  const openLesson = (id) => setSearchParams({ lesson: id })
  const backToModules = () => setSearchParams({})

  const card = { background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 16 }

  // No modules defined yet — show the shell rather than inventing structure
  if (!COURSE_MODULES.length) return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{
        ...card, padding: '54px 32px', textAlign: 'center',
        background: 'radial-gradient(90% 130% at 50% 0%, rgba(59,130,246,0.1), transparent 62%), linear-gradient(180deg,#212121,#161616)',
        borderColor: '#2C2C2C',
      }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Play size={22} color={BLUE} fill={BLUE} />
        </div>
        <div style={{ color: '#6A6A6A', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
          Course Material
        </div>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#F5F5F5', fontSize: 'clamp(1.3rem, 2.6vw, 1.7rem)', margin: '0 0 10px' }}>
          Coming soon
        </h1>
        <p style={{ color: '#7E7E7E', fontSize: '0.88rem', margin: '0 auto', maxWidth: 420, lineHeight: 1.65 }}>
          Modules and lessons will appear here once the course is set up.
        </p>
      </div>
    </div>
  )

  /* ── Lesson player ── */
  if (current) {
    const isDone = done.has(current.lesson.id)
    return (
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <button onClick={backToModules}
          style={{ background: 'none', border: 'none', color: '#7A7A7A', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 14 }}>
          ← All modules
        </button>

        <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
          {/* Video slot — swapped for the real embed once videos are supplied */}
          <div style={{
            aspectRatio: '16 / 9', background: 'linear-gradient(160deg,#242424,#141414)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            borderBottom: '1px solid #2A2A2A',
          }}>
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(59,130,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={24} color={BLUE} fill={BLUE} />
            </div>
            <span style={{ color: '#5E5E5E', fontSize: '0.82rem' }}>Video goes here</span>
          </div>

          <div style={{ padding: '20px 24px' }}>
            <div style={{ color: '#6A6A6A', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
              {current.module.title} · Lesson {current.index + 1} of {current.module.lessons.length}
            </div>
            <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#F5F5F5', fontSize: '1.35rem', margin: '0 0 16px' }}>
              {current.lesson.title}
            </h1>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => toggle(current.lesson.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${isDone ? GREEN : '#333'}`,
                  background: isDone ? 'rgba(76,175,125,0.14)' : 'transparent',
                  color: isDone ? GREEN : '#A8A8A8', fontWeight: 700, fontSize: '0.85rem',
                }}>
                <Check size={15} /> {isDone ? 'Completed' : 'Mark complete'}
              </button>
              {current.next && (
                <button onClick={() => openLesson(current.next.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: BLUE, color: '#0B1220', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  Next lesson <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rest of the module */}
        <div style={{ ...card, padding: '18px 20px' }}>
          <div style={{ color: '#F0F0F0', fontSize: '0.86rem', fontWeight: 700, marginBottom: 12 }}>{current.module.title}</div>
          {current.module.lessons.map((l, i) => {
            const on = l.id === current.lesson.id
            return (
              <button key={l.id} onClick={() => openLesson(l.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px',
                  background: on ? 'rgba(59,130,246,0.1)' : 'none', border: 'none',
                  borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                }}>
                <span style={{ width: 20, color: done.has(l.id) ? GREEN : '#4A4A4A', display: 'flex', flexShrink: 0 }}>
                  {done.has(l.id) ? <Check size={14} /> : <span style={{ fontSize: '0.74rem', fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</span>}
                </span>
                <span style={{ flex: 1, minWidth: 0, color: on ? BLUE : '#B8B8B8', fontSize: '0.83rem', fontWeight: on ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  /* ── Progress view ── */
  if (view === 'progress') {
    return (
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, padding: '26px 28px', display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
          <Ring pct={stats.pct} size={104} stroke={8} label="complete" />
          <div>
            <div style={{ color: '#F5F5F5', fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>
              {stats.completed} of {TOTAL_LESSONS} lessons
            </div>
            <div style={{ color: '#7A7A7A', fontSize: '0.86rem', marginTop: 4 }}>
              {TOTAL_LESSONS - stats.completed} still to watch across {COURSE_MODULES.length} modules.
            </div>
          </div>
        </div>

        <div style={{ ...card, padding: '20px 22px' }}>
          <div style={{ color: '#F0F0F0', fontSize: '0.88rem', fontWeight: 700, marginBottom: 16 }}>By module</div>
          {stats.perModule.map((m, i, arr) => (
            <div key={m.slug} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid #262626' : 'none' }}>
              <span style={{ flex: 1, minWidth: 0, color: '#DCDCDC', fontSize: '0.85rem', fontWeight: 600 }}>{m.title}</span>
              <span style={{ color: '#6A6A6A', fontSize: '0.76rem', width: 92, flexShrink: 0 }}>{m.completed}/{m.lessons.length} lessons</span>
              <div style={{ width: 150, height: 6, background: '#262626', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ width: `${m.pct}%`, height: '100%', background: m.pct === 100 ? GREEN : BLUE, borderRadius: 3, transition: 'width .4s' }} />
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: m.pct === 100 ? GREEN : '#9A9A9A', fontSize: '0.78rem', fontWeight: 700, width: 38, textAlign: 'right', flexShrink: 0 }}>
                {Math.round(m.pct)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ── Modules view ── */
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Hero */}
      <div style={{
        ...card, padding: '26px 28px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        background: 'radial-gradient(90% 130% at 12% 0%, rgba(59,130,246,0.14), transparent 60%), linear-gradient(180deg,#212121,#161616)',
        borderColor: '#2C2C2C',
      }}>
        <Ring pct={stats.pct} size={92} stroke={7} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ color: '#6A6A6A', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
            Course Material
          </div>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#F5F5F5', fontSize: 'clamp(1.3rem, 2.6vw, 1.75rem)', margin: '0 0 6px' }}>
            The Covenant Curriculum
          </h1>
          <p style={{ color: '#8A8A8A', fontSize: '0.87rem', margin: 0, lineHeight: 1.6 }}>
            {TOTAL_LESSONS} lessons across {COURSE_MODULES.length} modules — {stats.completed} completed.
          </p>
        </div>
      </div>

      {/* Modules */}
      {stats.perModule.map(m => {
        const open = openModule === m.slug
        return (
          <div key={m.slug} style={{ ...card, overflow: 'hidden' }}>
            <button onClick={() => setOpenModule(open ? null : m.slug)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <Ring pct={m.pct} size={46} stroke={4} color={m.pct === 100 ? GREEN : BLUE} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#F2F2F2', fontSize: '0.97rem', fontWeight: 700 }}>{m.title}</div>
                <div style={{ color: '#7E7E7E', fontSize: '0.81rem', marginTop: 3, lineHeight: 1.5 }}>{m.blurb}</div>
              </div>
              <span style={{ color: '#6A6A6A', fontSize: '0.78rem', flexShrink: 0 }}>
                {m.completed}/{m.lessons.length}
              </span>
              <ChevronRight size={16} color="#5A5A5A" style={{ flexShrink: 0, transition: 'transform .18s', transform: open ? 'rotate(90deg)' : 'none' }} />
            </button>

            {open && (
              <div style={{ borderTop: '1px solid #262626', padding: '8px 12px 12px' }}>
                {m.lessons.map((l, i) => {
                  const isDone = done.has(l.id)
                  return (
                    <div key={l.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 9 }}>
                      <button onClick={() => toggle(l.id)} title={isDone ? 'Mark not done' : 'Mark complete'}
                        style={{
                          width: 21, height: 21, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                          border: `1px solid ${isDone ? GREEN : '#3A3A3A'}`,
                          background: isDone ? 'rgba(76,175,125,0.18)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}>
                        {isDone ? <Check size={12} color={GREEN} /> : <span style={{ color: '#555', fontSize: '0.66rem', fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</span>}
                      </button>
                      <button onClick={() => openLesson(l.id)}
                        style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span style={{ color: isDone ? '#7E7E7E' : '#C8C8C8', fontSize: '0.84rem', textDecoration: isDone ? 'line-through' : 'none' }}>
                          {l.title}
                        </span>
                      </button>
                      <Play size={13} color="#4A4A4A" style={{ flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
