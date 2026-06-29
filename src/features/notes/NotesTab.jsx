import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './NotesTab.module.css'

export default function NotesTab({ projectId }) {
  const [mode, setMode] = useState('type') // 'type' | 'draw'
  const [text, setText] = useState('')
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef(null)

  const textKey = `project_notes_text_${projectId}`
  const drawKey = `project_notes_drawing_${projectId}`

  // ── Load persisted text on mount
  useEffect(() => {
    const saved = localStorage.getItem(textKey)
    if (saved) setText(saved)
  }, [textKey])

  // ── Persist text on change
  useEffect(() => {
    localStorage.setItem(textKey, text)
  }, [text, textKey])

  // ── Restore drawing when switching to draw mode
  useEffect(() => {
    if (mode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const saved = localStorage.getItem(drawKey)
    if (saved) {
      const img = new Image()
      img.onload = () => {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
      img.src = saved
    }
  }, [mode, drawKey])

  // ── Resize canvas to match its display size
  useEffect(() => {
    if (mode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = canvas.getBoundingClientRect()
    if (canvas.width !== width || canvas.height !== height) {
      // Preserve existing drawing across resize
      const saved = localStorage.getItem(drawKey)
      canvas.width = width
      canvas.height = height
      if (saved) {
        const img = new Image()
        img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0)
        img.src = saved
      }
    }
  }, [mode, drawKey])

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    }
  }

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    canvas.setPointerCapture(e.pointerId)
    isDrawing.current = true
    lastPoint.current = getPos(e, canvas)
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!isDrawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const current = getPos(e, canvas)
    const prev = lastPoint.current

    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(current.x, current.y)
    ctx.strokeStyle = 'var(--color-text-primary, #1C1C1A)'
    ctx.lineWidth = Math.max(1, current.pressure * 4)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    lastPoint.current = current
  }, [])

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    lastPoint.current = null
    // Persist drawing
    const canvas = canvasRef.current
    if (canvas) {
      localStorage.setItem(drawKey, canvas.toDataURL())
    }
  }, [drawKey])

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    localStorage.removeItem(drawKey)
  }

  function execFormat(cmd) {
    document.execCommand(cmd, false, null)
  }

  return (
    <div className={styles.container}>
      {/* Mode toggle */}
      <div className={styles.toolbar}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.toggleBtn} ${mode === 'type' ? styles.toggleActive : ''}`}
            onClick={() => setMode('type')}
          >
            Type
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === 'draw' ? styles.toggleActive : ''}`}
            onClick={() => setMode('draw')}
          >
            Draw
          </button>
        </div>

        {/* Formatting toolbar — visible in type mode */}
        {mode === 'type' && (
          <div className={styles.formatBar}>
            <button className={styles.fmtBtn} onClick={() => execFormat('bold')} title="Bold"><strong>B</strong></button>
            <button className={styles.fmtBtn} onClick={() => execFormat('italic')} title="Italic"><em>I</em></button>
            <button className={styles.fmtBtn} onClick={() => execFormat('underline')} title="Underline"><u>U</u></button>
          </div>
        )}

        {/* Clear button — visible in draw mode */}
        {mode === 'draw' && (
          <button className="btn-secondary" onClick={handleClear}>
            Clear drawing
          </button>
        )}
      </div>

      {/* Type mode */}
      {mode === 'type' && (
        <div
          className={styles.editor}
          contentEditable
          suppressContentEditableWarning
          onInput={e => setText(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: text }}
        />
      )}

      {/* Draw mode */}
      {mode === 'draw' && (
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      )}
    </div>
  )
}
