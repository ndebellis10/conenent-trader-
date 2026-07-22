import { useRef, useEffect } from 'react'
import { NB_THEME as T } from '../../../lib/notebookStore'

/* Rich-text body (contenteditable). Reports html up on input. The editorRef is
   forwarded via `bind` so the toolbar's execCommand acts on this element. */
export default function Editor({ html, onChange, fontSize, bind }) {
  const ref = useRef(null)

  // Load the note's html when the note changes (not on every keystroke, or the
  // caret would jump). We compare against the live DOM to avoid clobbering.
  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== (html || '')) el.innerHTML = html || ''
  }, [html])

  useEffect(() => { if (bind) bind(ref.current) }, [bind])

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={e => onChange(e.currentTarget.innerHTML)}
      data-placeholder='Write something, or press "/" for commands'
      style={{
        flex: 1, minHeight: 300, outline: 'none', color: T.text,
        fontSize: `${fontSize}px`, lineHeight: 1.7, fontFamily: 'Inter, Arial, sans-serif',
        padding: '4px 2px', overflowY: 'auto',
      }}
    />
  )
}
