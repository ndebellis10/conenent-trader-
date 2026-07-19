import { useEffect } from 'react'
import { X } from 'lucide-react'
import AlanMascot from '../AlanMascot'
import AlanChat from './AlanChat'

/* Right-side chat panel. Stays mounted while closed (translated off-screen)
   so the conversation survives opening and closing. */
export default function ChatDrawer({ open, onClose, title = 'Ask Alan', subtitle = 'Reads your journal', ...chatProps }) {
  // Escape closes the panel
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <style>{`
        .alandrawer-scrim {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          opacity: 0; pointer-events: none; transition: opacity .25s ease; z-index: 300;
        }
        .alandrawer-scrim.open { opacity: 1; pointer-events: auto; }

        .alandrawer {
          position: fixed; top: 0; right: 0; bottom: 0; z-index: 301;
          width: min(460px, 100vw);
          background: #1B1B1B; border-left: 1px solid #2C2C2C;
          box-shadow: -18px 0 40px rgba(0,0,0,0.45);
          display: flex; flex-direction: column;
          transform: translateX(100%); transition: transform .28s cubic-bezier(.4,0,.2,1);
        }
        .alandrawer.open { transform: translateX(0); }

        .alandrawer-head {
          display: flex; align-items: center; gap: 11px;
          padding: 14px 16px; border-bottom: 1px solid #2A2A2A; flex-shrink: 0;
        }
        .alandrawer-title { color: #F2F2F2; font-weight: 700; font-size: 0.92rem; }
        .alandrawer-sub   { color: #6A6A6A; font-size: 0.74rem; margin-top: 1px; }
        .alandrawer-close {
          margin-left: auto; background: none; border: none; color: #6A6A6A;
          cursor: pointer; padding: 6px; border-radius: 8px; display: flex; transition: all .15s;
        }
        .alandrawer-close:hover { color: #E8E8E8; background: rgba(255,255,255,0.06); }

        /* The chat fills the drawer instead of its own fixed height */
        .alandrawer .alanchat { height: 100%; min-height: 0; }
        .alandrawer .alanchat-col { max-width: 100%; }
        .alandrawer .alanchat-inputwrap { max-width: 100%; }
        .alandrawer .alanchat-hint { max-width: 100%; }

        @media (prefers-reduced-motion: reduce) {
          .alandrawer, .alandrawer-scrim { transition: none; }
        }
      `}</style>

      <div className={`alandrawer-scrim${open ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside
        className={`alandrawer${open ? ' open' : ''}`}
        role="dialog"
        aria-label="Ask Alan"
        aria-hidden={!open}
      >
        <div className="alandrawer-head">
          <AlanMascot size={34} />
          <div>
            <div className="alandrawer-title">{title}</div>
            {subtitle && <div className="alandrawer-sub">{subtitle}</div>}
          </div>
          <button className="alandrawer-close" onClick={onClose} aria-label="Close chat">
            <X size={18} />
          </button>
        </div>

        <AlanChat {...chatProps} />
      </aside>
    </>
  )
}
