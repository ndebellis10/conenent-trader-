import { useMemo, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, Check, ChevronRight, Maximize2, Trophy, Lock } from 'lucide-react'
import { COURSE_MODULES, TOTAL_LESSONS } from '../../lib/courseOutline'

/* Course Material — lesson rail on the left, player on the right.
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

/* Accepts a direct file (mp4/webm) or a YouTube/Vimeo link, so the video host
   can change later without touching the player. */
function embedUrl(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

function Ring({ pct, size = 44, stroke = 4, color = BLUE, label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#282828" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: size > 70 ? '1.2rem' : '0.72rem', fontWeight: 800, color: '#F2F2F2', lineHeight: 1 }}>
          {Math.round(pct)}%
        </span>
        {label && <span style={{ color: '#5E5E5E', fontSize: '0.55rem', marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  )
}

export default function CourseMaterial() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [done, setDone] = useState(loadDone)
  const [openModules, setOpenModules] = useState(() => new Set(COURSE_MODULES.map(m => m.slug)))
  const stageRef = useRef(null)

  const view = searchParams.get('tab') === 'progress' ? 'progress' : 'modules'
  const firstLesson = COURSE_MODULES[0]?.lessons[0]?.id
  const lessonId = searchParams.get('lesson') || firstLesson

  useEffect(() => { saveDone(done) }, [done])

  const toggle = (id) => setDone(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleModule = (slug) => setOpenModules(prev => {
    const next = new Set(prev)
    next.has(slug) ? next.delete(slug) : next.add(slug)
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

  /* Flattened so Next can cross module boundaries */
  const flat = useMemo(
    () => COURSE_MODULES.flatMap(m => m.lessons.map(l => ({ ...l, module: m }))),
    []
  )
  const idx     = flat.findIndex(l => l.id === lessonId)
  const current = idx >= 0 ? flat[idx] : null
  const next    = idx >= 0 ? flat[idx + 1] || null : null

  const openLesson = (id) => {
    const p = new URLSearchParams(searchParams)
    p.set('lesson', id)
    p.delete('tab')
    setSearchParams(p)
  }

  const goFullscreen = () => {
    const el = stageRef.current
    if (!el) return
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
    req?.call(el)
  }

  const card = { background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 16 }

  if (!COURSE_MODULES.length) return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={{ ...card, padding: '54px 32px', textAlign: 'center', background: 'radial-gradient(90% 130% at 50% 0%, rgba(59,130,246,0.1), transparent 62%), linear-gradient(180deg,#212121,#161616)', borderColor: '#2C2C2C' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 18px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Play size={22} color={BLUE} fill={BLUE} />
        </div>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#F5F5F5', fontSize: '1.5rem', margin: '0 0 10px' }}>Coming soon</h1>
        <p style={{ color: '#7E7E7E', fontSize: '0.88rem', margin: 0 }}>Modules and lessons will appear here once the course is set up.</p>
      </div>
    </div>
  )

  /* ── Progress view ── */
  if (view === 'progress') return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...card, padding: '26px 28px', display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
        <Ring pct={stats.pct} size={96} stroke={8} label="complete" />
        <div>
          <div style={{ color: '#F5F5F5', fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>
            {stats.completed} of {TOTAL_LESSONS} lessons
          </div>
          <div style={{ color: '#7A7A7A', fontSize: '0.86rem', marginTop: 4 }}>
            {TOTAL_LESSONS - stats.completed} still to watch across {COURSE_MODULES.length} module{COURSE_MODULES.length !== 1 ? 's' : ''}.
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

  /* ── Player + rail ── */
  const src    = current?.video
  const embed  = src ? embedUrl(src) : null
  const isDone = current ? done.has(current.id) : false

  return (
    <div className="course">
      <style>{`
        .course { display: grid; grid-template-columns: 400px minmax(0, 1fr); gap: 18px; align-items: start; }
        .course-stage { background: #000; border: 1px solid #2A2A2A; border-radius: 16px; overflow: hidden; }
        .course-stage video, .course-stage iframe { display: block; width: 100%; aspect-ratio: 16 / 9; border: none; background: #000; }
        /* In fullscreen the wrapper becomes the viewport — fill it */
        .course-stage:fullscreen { border-radius: 0; border: none; display: flex; align-items: center; justify-content: center; }
        .course-stage:fullscreen video, .course-stage:fullscreen iframe { height: 100%; width: 100%; aspect-ratio: auto; object-fit: contain; }
        .course-stage-col { max-width: 860px; }
        .course-rail { background: #1C1C1C; border: 1px solid #2A2A2A; border-radius: 16px; overflow: hidden; position: sticky; top: 16px; max-height: calc(100vh - 32px); display: flex; flex-direction: column; }
        .course-rail-scroll { overflow-y: auto; padding: 8px; }
        .course-lesson { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: none; border: none; cursor: pointer; text-align: left; border-radius: 9px; transition: background .15s; }
        .course-lesson:hover { background: rgba(255,255,255,0.035); }
        .course-lesson.on { background: rgba(59,130,246,0.12); }
        @media (max-width: 1100px) {
          .course { grid-template-columns: 1fr; }
          .course-stage-col { max-width: none; }
          .course-rail { position: static; max-height: none; }
        }
      `}</style>

      {/* Rail */}
      <aside className="course-rail">
        <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #262626', display: 'flex', alignItems: 'center', gap: 13 }}>
          <Ring pct={stats.pct} size={44} stroke={4} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#F2F2F2', fontSize: '0.86rem', fontWeight: 700 }}>Course Material</div>
            <div style={{ color: '#6E6E6E', fontSize: '0.75rem', marginTop: 1 }}>
              {stats.completed} of {TOTAL_LESSONS} lessons done
            </div>
          </div>
        </div>

        <div className="course-rail-scroll">
          {stats.perModule.map((m, mi, arr) => {
            const open = openModules.has(m.slug)
            // Category heading whenever the group changes (e.g. "Foundations")
            const heading = m.group && m.group !== arr[mi - 1]?.group ? m.group : null
            return (
              <div key={m.slug} style={{ marginBottom: 4 }}>
                {heading && (
                  <div style={{ color: '#5A5A5A', fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '14px 10px 5px' }}>
                    {heading}
                  </div>
                )}
                <button onClick={() => toggleModule(m.slug)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 9 }}>
                  <ChevronRight size={14} color="#5A5A5A" style={{ flexShrink: 0, transition: 'transform .18s', transform: open ? 'rotate(90deg)' : 'none' }} />
                  <span style={{ flex: 1, minWidth: 0, color: '#E4E4E4', fontSize: '0.84rem', fontWeight: 700 }}>{m.title}</span>
                  <span style={{ color: '#5E5E5E', fontSize: '0.72rem', flexShrink: 0 }}>{m.completed}/{m.lessons.length}</span>
                </button>

                {open && m.lessons.map((l, i) => {
                  const on = l.id === lessonId
                  const ld = done.has(l.id)
                  return (
                    <div key={l.id} className={`course-lesson${on ? ' on' : ''}`}
                      onClick={() => openLesson(l.id)} role="button" tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter') openLesson(l.id) }}>
                      {/* Status only — completion is marked from the lesson itself */}
                      <span aria-hidden
                        style={{ width: 19, height: 19, borderRadius: '50%', flexShrink: 0, border: `1px solid ${ld ? GREEN : '#3A3A3A'}`, background: ld ? 'rgba(76,175,125,0.18)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ld ? <Check size={11} color={GREEN} /> : <span style={{ color: '#555', fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</span>}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, color: on ? BLUE : ld ? '#7E7E7E' : '#BFBFBF', fontSize: '0.82rem', fontWeight: on ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.title}
                      </span>
                      {on && <Play size={11} color={BLUE} fill={BLUE} style={{ flexShrink: 0 }} />}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </aside>

      {/* Stage */}
      <div className="course-stage-col" style={{ minWidth: 0 }}>
        <div className="course-stage" ref={stageRef}>
          {!src ? (
            <div style={{ aspectRatio: '16 / 9', background: 'linear-gradient(160deg,#242424,#141414)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(59,130,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={22} color={BLUE} fill={BLUE} />
              </div>
              <span style={{ color: '#5E5E5E', fontSize: '0.82rem' }}>No video for this lesson yet</span>
            </div>
          ) : embed ? (
            <iframe key={current.id} src={embed} title={current.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen />
          ) : (
            <video key={current.id} src={src} controls preload="metadata" playsInline />
          )}
        </div>

        {/* Lesson meta */}
        <div style={{ ...card, padding: '18px 22px', marginTop: 14 }}>
          <div style={{ color: '#6A6A6A', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
            {current?.module.title} · Lesson {idx + 1} of {flat.length}
          </div>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#F5F5F5', fontSize: '1.25rem', margin: '0 0 16px' }}>
            {current?.title}
          </h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => toggle(current.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${isDone ? GREEN : '#333'}`, background: isDone ? 'rgba(76,175,125,0.14)' : 'transparent', color: isDone ? GREEN : '#A8A8A8', fontWeight: 700, fontSize: '0.85rem' }}>
              <Check size={15} /> {isDone ? 'Completed' : 'Mark complete'}
            </button>
            <button onClick={goFullscreen}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, cursor: 'pointer', border: '1px solid #333', background: 'transparent', color: '#A8A8A8', fontWeight: 700, fontSize: '0.85rem' }}>
              <Maximize2 size={15} /> Fullscreen
            </button>
            {next && (
              <button onClick={() => openLesson(next.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: BLUE, color: '#0B1220', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                Next lesson <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Quiz — unlocks once every lesson in the module is complete */}
        {(() => {
          const mod = current?.module
          if (!mod?.quiz) return null
          const ms = stats.perModule.find(m => m.slug === mod.slug)
          const unlocked = ms && ms.completed === mod.lessons.length
          return (
            <div style={{
              ...card, marginTop: 14, padding: '18px 22px',
              borderColor: unlocked ? 'rgba(76,175,125,0.4)' : '#2A2A2A',
              background: unlocked
                ? 'radial-gradient(90% 130% at 8% 0%, rgba(76,175,125,0.12), transparent 60%), #1C1C1C'
                : '#1C1C1C',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: unlocked ? 'rgba(76,175,125,0.15)' : '#232323', border: `1px solid ${unlocked ? 'rgba(76,175,125,0.35)' : '#2E2E2E'}` }}>
                {unlocked ? <Trophy size={18} color={GREEN} /> : <Lock size={16} color="#555" />}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ color: unlocked ? '#F2F2F2' : '#8A8A8A', fontSize: '0.9rem', fontWeight: 700 }}>{mod.quiz.label}</div>
                <div style={{ color: '#6E6E6E', fontSize: '0.78rem', marginTop: 2 }}>
                  {unlocked
                    ? mod.quiz.blurb
                    : `Unlocks when all ${mod.lessons.length} lessons are complete — ${ms?.completed ?? 0} done.`}
                </div>
              </div>
              {unlocked && (
                <a href={mod.quiz.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, background: GREEN, color: '#0B1A12', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', flexShrink: 0 }}>
                  <Trophy size={15} /> Take the quiz
                </a>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
