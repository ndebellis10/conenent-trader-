import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, X } from 'lucide-react'
import { buildSteps, progressOf, isDismissed, dismiss } from '../../lib/onboarding'

const BLUE = '#3B82F6'

/* First-run checklist shown above the Ask Alan hub. Disappears for good once
   every step is done, or when the trader dismisses it. */
export default function OnboardingChecklist({ email, settings, trades, goals, playbook, courseProgress, onAsk }) {
  const navigate = useNavigate()
  const [hidden, setHidden] = useState(() => isDismissed(email))

  const steps = useMemo(
    () => buildSteps({ email, settings, trades, goals, playbook, courseProgress }),
    [email, settings, trades, goals, playbook, courseProgress],
  )
  const { done, total, complete } = progressOf(steps)

  // Once they've finished it, never show it again
  if (complete && !isDismissed(email)) dismiss(email)
  if (hidden || complete) return null

  const close = () => { dismiss(email); setHidden(true) }

  const go = (where) => {
    if (where === 'chat') return onAsk?.('')
    navigate({
      settings: '/app/settings', course: '/app/course', log: '/app/log',
      goals: '/app/goals', playbook: '/app/playbook',
    }[where] || '/app')
  }

  return (
    <div className="onb">
      <style>{`
        .onb {
          border: 1px solid #2C2C2C; border-radius: 18px; margin-bottom: 22px;
          background: linear-gradient(180deg, #1F1F1F 0%, #191919 100%);
          padding: 22px 24px;
        }
        .onb-head { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
        .onb-title { color: #F2F2F2; font-weight: 700; font-size: 1.02rem; }
        .onb-count { color: ${BLUE}; font-size: 0.8rem; font-weight: 700; }
        .onb-close {
          margin-left: auto; background: none; border: none; color: #5E5E5E;
          cursor: pointer; padding: 5px; border-radius: 7px; display: flex; transition: all .15s;
        }
        .onb-close:hover { color: #E8E8E8; background: rgba(255,255,255,0.06); }

        .onb-bar { height: 5px; border-radius: 3px; background: #2A2A2A; overflow: hidden; margin: 12px 0 16px; }
        .onb-fill { height: 100%; background: ${BLUE}; border-radius: 3px; transition: width .35s ease; }

        .onb-list { display: flex; flex-direction: column; gap: 2px; }
        .onb-step {
          display: flex; align-items: center; gap: 13px; width: 100%;
          padding: 11px 12px; border-radius: 11px; border: none; cursor: pointer;
          background: none; text-align: left; transition: background .15s;
        }
        .onb-step:hover:not(.is-done) { background: rgba(255,255,255,0.04); }
        .onb-step.is-done { cursor: default; opacity: 0.5; }

        .onb-dot {
          flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid #3A3A3A; color: #6E6E6E; font-size: 0.7rem; font-weight: 700;
        }
        .onb-step.is-done .onb-dot { background: ${BLUE}; border-color: ${BLUE}; color: #fff; }

        .onb-text { min-width: 0; }
        .onb-step-title { color: #E4E4E4; font-size: 0.87rem; font-weight: 600; }
        .onb-step.is-done .onb-step-title { text-decoration: line-through; }
        .onb-step-desc { color: #6E6E6E; font-size: 0.76rem; margin-top: 1px; }
        .onb-arrow { margin-left: auto; color: #4A4A4A; flex-shrink: 0; }
        .onb-step:hover:not(.is-done) .onb-arrow { color: ${BLUE}; }

        @media (max-width: 640px) {
          .onb { padding: 18px 16px; }
          .onb-step-desc { display: none; }
        }
      `}</style>

      <div className="onb-head">
        <div className="onb-title">Get started</div>
        <div className="onb-count">{done} of {total}</div>
        <button className="onb-close" onClick={close} aria-label="Dismiss checklist">
          <X size={16} />
        </button>
      </div>

      <div className="onb-bar">
        <div className="onb-fill" style={{ width: `${(done / total) * 100}%` }} />
      </div>

      <div className="onb-list">
        {steps.map((s, i) => (
          <button
            key={s.id}
            className={`onb-step${s.done ? ' is-done' : ''}`}
            onClick={() => !s.done && go(s.go)}
            disabled={s.done}
          >
            <span className="onb-dot">{s.done ? <Check size={13} /> : i + 1}</span>
            <span className="onb-text">
              <span className="onb-step-title">{s.title}</span>
              <div className="onb-step-desc">{s.desc}</div>
            </span>
            {!s.done && <ArrowRight className="onb-arrow" size={15} />}
          </button>
        ))}
      </div>
    </div>
  )
}
