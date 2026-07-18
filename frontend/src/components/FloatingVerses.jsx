import { useEffect, useMemo, useRef } from 'react'
import { VERSES } from '../lib/verses'

/* Scripture drifting across the background, bouncing off the edges like the
   old DVD screensaver. Positions live in a ref and are written straight to
   each node's transform, so the animation never re-renders React.
   Purely decorative: aria-hidden and pointer-events: none. */

const COUNT = 7
const MIN_SPEED = 14  // px per second
const MAX_SPEED = 34

const rand = (min, max) => min + Math.random() * (max - min)
const sign = () => (Math.random() < 0.5 ? -1 : 1)

export default function FloatingVerses({ count = COUNT, opacity = 0.13 }) {
  const hostRef  = useRef(null)
  const nodeRefs = useRef([])
  const stateRef = useRef([])

  // A fixed spread across the list — pure, so render stays idempotent.
  // Stride 7 is coprime with 20, so the picks never repeat a verse.
  const picked = useMemo(() => {
    const out = []
    for (let i = 0; i < Math.min(count, VERSES.length); i++) {
      out.push(VERSES[(i * 7) % VERSES.length])
    }
    return out
  }, [count])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Honour reduced-motion: lay the verses out, but never animate them
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const nodes = nodeRefs.current.filter(Boolean)
    if (!nodes.length) return

    const seed = () => {
      const W = host.clientWidth
      const H = host.clientHeight
      stateRef.current = nodes.map(node => {
        const w = node.offsetWidth
        const h = node.offsetHeight
        const speed = rand(MIN_SPEED, MAX_SPEED)
        const angle = rand(0.4, 1.2) // keep it diagonal, like the DVD logo
        return {
          x: rand(0, Math.max(1, W - w)),
          y: rand(0, Math.max(1, H - h)),
          vx: Math.cos(angle) * speed * sign(),
          vy: Math.sin(angle) * speed * sign(),
          w, h,
        }
      })
      // Paint initial positions
      stateRef.current.forEach((s, i) => {
        nodes[i].style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`
      })
    }

    seed()
    if (reduce) return

    let raf = 0
    let last = performance.now()

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05) // clamp after tab-switch stalls
      last = now
      const W = host.clientWidth
      const H = host.clientHeight

      stateRef.current.forEach((s, i) => {
        s.x += s.vx * dt
        s.y += s.vy * dt

        const maxX = Math.max(0, W - s.w)
        const maxY = Math.max(0, H - s.h)

        if (s.x <= 0)    { s.x = 0;    s.vx = Math.abs(s.vx) }
        if (s.x >= maxX) { s.x = maxX; s.vx = -Math.abs(s.vx) }
        if (s.y <= 0)    { s.y = 0;    s.vy = Math.abs(s.vy) }
        if (s.y >= maxY) { s.y = maxY; s.vy = -Math.abs(s.vy) }

        nodes[i].style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`
      })

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    // Re-seed on resize so nothing ends up stranded off-screen
    const onResize = () => seed()
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [picked])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}
    >
      {picked.map((v, i) => (
        <div
          key={v.ref}
          ref={el => { nodeRefs.current[i] = el }}
          style={{
            position: 'absolute', top: 0, left: 0,
            maxWidth: 'min(320px, 60vw)',
            opacity,
            willChange: 'transform',
            userSelect: 'none',
          }}
        >
          <p style={{
            color: '#3B82F6', fontSize: '0.82rem', fontStyle: 'italic',
            fontFamily: 'Poppins, sans-serif', lineHeight: 1.6, margin: 0,
          }}>
            "{v.text}"
          </p>
          <span style={{ color: '#D4B85A', fontSize: '0.74rem', fontWeight: 700 }}>— {v.ref}</span>
        </div>
      ))}
    </div>
  )
}
