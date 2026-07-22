import { useState } from 'react'
import {
  Maximize2, Mic, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Strikethrough, Underline, Link2, RemoveFormatting,
  Baseline, Highlighter, Plus, Minus, ChevronDown,
} from 'lucide-react'
import { NB_THEME as T } from '../../../lib/notebookStore'

const FONTS = ['Arial', 'Inter', 'Georgia', 'Times New Roman', 'Courier New']

/* Rich-text toolbar. `cmd(name, value)` runs a document.execCommand on the
   editor selection (see Editor). Purely presentational otherwise. */
export default function EditorToolbar({ cmd, fontSize, onFontSize, onFullscreen, onMic, listening }) {
  const [font, setFont] = useState('Arial')
  const [align, setAlign] = useState(false)

  const btn = (title, onClick, active) => ({
    title, onClick,
    style: {
      background: active ? 'rgba(59,130,246,0.18)' : 'transparent', border: 'none',
      borderRadius: 7, cursor: 'pointer', width: 30, height: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? T.accent : T.textDim,
    },
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
      background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '5px 8px', marginBottom: 12,
    }}>
      <button {...btn('Fullscreen', onFullscreen)}><Maximize2 size={15} /></button>
      <button {...btn(listening ? 'Stop dictation' : 'Dictate', onMic, listening)}><Mic size={15} /></button>

      <Divider />

      {/* Alignment dropdown */}
      <div style={{ position: 'relative' }}>
        <button {...btn('Align', () => setAlign(a => !a))}><AlignLeft size={15} /></button>
        {align && (
          <div style={pop}>
            {[['Left', 'justifyLeft', AlignLeft], ['Center', 'justifyCenter', AlignCenter], ['Right', 'justifyRight', AlignRight]].map(([lbl, c, I]) => (
              <button key={c} onClick={() => { cmd(c); setAlign(false) }} style={popItem}><I size={14} color={T.textDim} /> {lbl}</button>
            ))}
          </div>
        )}
      </div>

      {/* Font family */}
      <select value={font} onChange={e => { setFont(e.target.value); cmd('fontName', e.target.value) }}
        style={{ background: T.panel, color: T.text, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: '0.78rem', padding: '4px 6px', outline: 'none', cursor: 'pointer' }}>
        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      {/* Font-size stepper */}
      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.border}`, borderRadius: 7 }}>
        <button {...btn('Smaller', () => onFontSize(Math.max(10, fontSize - 1)))} style={{ ...btn('', () => {}).style, width: 24 }}><Minus size={12} /></button>
        <span style={{ color: T.text, fontSize: '0.78rem', minWidth: 20, textAlign: 'center' }}>{fontSize}</span>
        <button {...btn('Larger', () => onFontSize(Math.min(40, fontSize + 1)))} style={{ ...btn('', () => {}).style, width: 24 }}><Plus size={12} /></button>
      </div>

      <Divider />

      <button {...btn('Bold', () => cmd('bold'))}><Bold size={15} /></button>
      <button {...btn('Italic', () => cmd('italic'))}><Italic size={15} /></button>
      <button {...btn('Strikethrough', () => cmd('strikeThrough'))}><Strikethrough size={15} /></button>
      <button {...btn('Underline', () => cmd('underline'))}><Underline size={15} /></button>
      <button {...btn('Link', () => { const u = prompt('Link URL'); if (u) cmd('createLink', u) })}><Link2 size={15} /></button>
      <button {...btn('Clear formatting', () => cmd('removeFormat'))}><RemoveFormatting size={15} /></button>

      <Divider />

      {/* Text color */}
      <label {...{ title: 'Text color' }} style={{ ...btn('', () => {}).style, position: 'relative' }}>
        <Baseline size={15} />
        <input type="color" onChange={e => cmd('foreColor', e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
      </label>
      {/* Highlight */}
      <label {...{ title: 'Highlight' }} style={{ ...btn('', () => {}).style, position: 'relative' }}>
        <Highlighter size={15} />
        <input type="color" onChange={e => cmd('hiliteColor', e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
      </label>

      <Divider />

      {/* Insert menu */}
      <button {...btn('Insert', () => cmd('insertUnorderedList'))}><Plus size={15} /></button>
    </div>
  )
}

function Divider() {
  return <span style={{ width: 1, height: 20, background: T.border, margin: '0 4px' }} />
}
const pop = { position: 'absolute', top: '110%', left: 0, zIndex: 10, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 9, padding: 5, minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }
const popItem = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: T.text, fontSize: '0.8rem', padding: '6px 8px', borderRadius: 6, textAlign: 'left' }
