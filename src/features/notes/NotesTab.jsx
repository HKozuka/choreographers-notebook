import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './NotesTab.module.css'

const AUTOSAVE_INTERVAL = 10000 // 10 seconds

function notesKey(projectId) {
  return `project_notes_${projectId}`
}

function migrateAndLoad(projectId) {
  // Migrate old flat keys to new multi-page format if present
  const oldTextKey = `project_notes_text_${projectId}`
  const oldDrawKey = `project_notes_drawing_${projectId}`
  const oldText = localStorage.getItem(oldTextKey)
  const oldDraw = localStorage.getItem(oldDrawKey)

  if (oldText !== null || oldDraw !== null) {
    const migrated = {
      activePage: 0,
      pages: [{ text: oldText || '', drawing: oldDraw || null }],
    }
    localStorage.setItem(notesKey(projectId), JSON.stringify(migrated))
    localStorage.removeItem(oldTextKey)
    localStorage.removeItem(oldDrawKey)
    return migrated
  }

  try {
    const saved = JSON.parse(localStorage.getItem(notesKey(projectId)))
    if (saved && Array.isArray(saved.pages) && saved.pages.length > 0) {
      return saved
    }
  } catch { /* fall through */ }

  return { activePage: 0, pages: [{ text: '', drawing: null }] }
}

export default function NotesTab({ projectId }) {
  const key = notesKey(projectId)

  // migrateAndLoad runs once — lazy initializer avoids repeated localStorage reads on re-render
  const [pages, setPages] = useState(() => {
    const d = migrateAndLoad(projectId)
    return d.pages
  })
  const [activePage, setActivePage] = useState(() => {
    // Read from the already-migrated key (migration ran above during pages init)
    try {
      const saved = JSON.parse(localStorage.getItem(notesKey(projectId)))
      return saved?.activePage ?? 0
    } catch { return 0 }
  })
  const [mode, setMode] = useState('type') // 'type' | 'draw'
  const [lastSaved, setLastSaved] = useState(null)
  const [savedAgo, setSavedAgo] = useState('')

  const canvasRef = useRef(null)
  const editorRef = useRef(null)       // ref to the contentEditable div
  const isDrawing = useRef(false)
  const lastPoint = useRef(null)
  // Keep a ref mirror of pages so autosave closure always has latest value
  const pagesRef = useRef(pages)
  const activePageRef = useRef(activePage)

  useEffect(() => { pagesRef.current = pages }, [pages])
  useEffect(() => { activePageRef.current = activePage }, [activePage])

  // ── Autosave every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      const snapshot = {
        activePage: activePageRef.current,
        pages: pagesRef.current,
      }
      localStorage.setItem(key, JSON.stringify(snapshot))
      setLastSaved(new Date())
    }, AUTOSAVE_INTERVAL)
    return () => clearInterval(interval)
  }, [key])

  // ── "Saved X ago" ticker — updates every 5s
  useEffect(() => {
    if (!lastSaved) return
    const tick = setInterval(() => {
      const secs = Math.round((Date.now() - lastSaved.getTime()) / 1000)
      if (secs < 60) setSavedAgo(`Saved ${secs}s ago`)
      else setSavedAgo(`Saved ${Math.floor(secs / 60)}m ago`)
    }, 5000)
    // Set immediately on first save
    setSavedAgo('Saved just now')
    return () => clearInterval(tick)
  }, [lastSaved])

  // ── Seed the contentEditable with the correct page content on page change or mode switch
  // This is the ONLY place innerHTML is set — never via dangerouslySetInnerHTML in the live render
  useEffect(() => {
    if (mode !== 'type') return
    const el = editorRef.current
    if (!el) return
    const html = pages[activePage]?.text || ''
    // Only update DOM if it actually differs — avoids cursor disruption on unrelated re-renders
    if (el.innerHTML !== html) {
      el.innerHTML = html
    }
  }, [activePage, mode]) // intentionally exclude `pages` — DOM is owned by the editor after mount

  // ── Restore drawing for the current page when entering draw mode or switching pages
  useEffect(() => {
    if (mode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return

    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = width || 700
    canvas.height = height || 480

    const drawing = pages[activePage]?.drawing
    if (drawing) {
      const img = new Image()
      img.onload = () => {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        canvas.getContext('2d').drawImage(img, 0, 0)
      }
      img.src = drawing
    } else {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [mode, activePage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save current canvas drawing back into pages state before leaving draw mode or switching pages
  function captureDrawing() {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.toDataURL()
  }

  function saveCurrentPageState(overrideText) {
    setPages(prev => {
      const updated = [...prev]
      updated[activePage] = {
        ...updated[activePage],
        drawing: mode === 'draw' ? captureDrawing() : updated[activePage].drawing,
        text: overrideText !== undefined ? overrideText : updated[activePage].text,
      }
      return updated
    })
  }

  // ── Text changes
  function handleTextInput(e) {
    const html = e.currentTarget.innerHTML
    setPages(prev => {
      const updated = [...prev]
      updated[activePage] = { ...updated[activePage], text: html }
      return updated
    })
  }

  // ── Page navigation
  function goToPage(newIndex) {
    // Capture drawing before switching
    if (mode === 'draw') {
      const drawing = captureDrawing()
      setPages(prev => {
        const updated = [...prev]
        updated[activePage] = { ...updated[activePage], drawing }
        return updated
      })
    }
    setActivePage(newIndex)
  }

  function addPage() {
    if (mode === 'draw') {
      const drawing = captureDrawing()
      setPages(prev => {
        const updated = [...prev]
        updated[activePage] = { ...updated[activePage], drawing }
        return [...updated, { text: '', drawing: null }]
      })
    } else {
      setPages(prev => [...prev, { text: '', drawing: null }])
    }
    setActivePage(pages.length) // new page index
  }

  // ── Drawing
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
    ctx.strokeStyle = '#1C1C1A'
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
    // Capture into pages state immediately so autosave picks it up
    const drawing = captureDrawing()
    setPages(prev => {
      const updated = [...prev]
      updated[activePageRef.current] = { ...updated[activePageRef.current], drawing }
      return updated
    })
  }, [])

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setPages(prev => {
      const updated = [...prev]
      updated[activePage] = { ...updated[activePage], drawing: null }
      return updated
    })
  }

  function execFormat(cmd) {
    document.execCommand(cmd, false, null)
  }

  // Mode switch — capture drawing before leaving draw mode
  function switchMode(newMode) {
    if (mode === 'draw' && newMode === 'type') {
      const drawing = captureDrawing()
      setPages(prev => {
        const updated = [...prev]
        updated[activePage] = { ...updated[activePage], drawing }
        return updated
      })
    }
    setMode(newMode)
  }

  const currentPage = pages[activePage] || { text: '', drawing: null }

  return (
    <div className={styles.container}>
      {/* Top toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.toggleBtn} ${mode === 'type' ? styles.toggleActive : ''}`}
            onClick={() => switchMode('type')}
          >
            Type
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === 'draw' ? styles.toggleActive : ''}`}
            onClick={() => switchMode('draw')}
          >
            Draw
          </button>
        </div>

        {mode === 'type' && (
          <div className={styles.formatBar}>
            <button className={styles.fmtBtn} onClick={() => execFormat('bold')} title="Bold"><strong>B</strong></button>
            <button className={styles.fmtBtn} onClick={() => execFormat('italic')} title="Italic"><em>I</em></button>
            <button className={styles.fmtBtn} onClick={() => execFormat('underline')} title="Underline"><u>U</u></button>
          </div>
        )}

        {mode === 'draw' && (
          <button className="btn-secondary" onClick={handleClear}>
            Clear drawing
          </button>
        )}
      </div>

      {/* Type mode */}
      {mode === 'type' && (
        <div
          key={`type-${activePage}`}
          ref={editorRef}
          className={styles.editor}
          contentEditable
          suppressContentEditableWarning
          onInput={handleTextInput}
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

      {/* Page navigation */}
      <div className={styles.pageNav}>
        <div className={styles.pageNavLeft}>
          <button
            className={styles.pageNavBtn}
            onClick={() => goToPage(activePage - 1)}
            disabled={activePage === 0}
            aria-label="Previous page"
          >
            ←
          </button>
          <span className={styles.pageIndicator}>
            Page {activePage + 1} of {pages.length}
          </span>
          <button
            className={styles.pageNavBtn}
            onClick={() => goToPage(activePage + 1)}
            disabled={activePage === pages.length - 1}
            aria-label="Next page"
          >
            →
          </button>
        </div>
        <button className={styles.addPageBtn} onClick={addPage}>
          + Add page
        </button>
      </div>

      {/* Saved indicator */}
      {savedAgo && (
        <span className={styles.savedLabel}>{savedAgo}</span>
      )}
    </div>
  )
}
