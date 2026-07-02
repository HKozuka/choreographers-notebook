import { useState, useEffect, useRef, useCallback } from 'react'
import { loadHandle, saveHandle } from '../../utils/folderAccess'
import styles from './TimelineTab.module.css'

// ── Constants ──────────────────────────────────────────────────────────────

const PIXELS_PER_SECOND = 40   // how many px = 1 second on the timeline
const LANE_KEYS = ['video', 'audio', 'notes']
const LANE_LABELS = { video: 'Video', audio: 'Audio', notes: 'Notes' }
const MEDIA_LANES = ['video', 'audio']
const DEFAULT_NOTE_DURATION = 5  // seconds, when clicking without dragging
const MIN_DURATION = 0.5         // minimum clip duration in seconds
const TIMELINE_STORAGE_PREFIX = 'project_timeline_'
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi'])
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.aac', '.flac', '.m4a', '.webm', '.ogg'])

function getExt(name) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function laneFolderKey(lane, projectId) {
  return lane === 'video' ? `video_folder_handle_${projectId}` : `music_folder_handle_${projectId}`
}

/** Verify (and if needed request) read permission on a directory handle. */
async function verifyPermission(handle, mode = 'read') {
  const opts = { mode }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  if ((await handle.requestPermission(opts)) === 'granted') return true
  return false
}

/** Resolve a media file's duration by loading its metadata off-DOM. */
function getMediaDuration(url, lane) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(lane === 'video' ? 'video' : 'audio')
    el.preload = 'metadata'
    el.onloadedmetadata = () => resolve(el.duration || MIN_DURATION)
    el.onerror = () => reject(new Error('Could not read media duration'))
    el.src = url
  })
}

// ── Storage helpers ─────────────────────────────────────────────────────────

function storageKey(projectId) {
  return `${TIMELINE_STORAGE_PREFIX}${projectId}`
}

function loadTimeline(projectId) {
  try {
    const raw = localStorage.getItem(storageKey(projectId))
    if (!raw) return { clips: [] }
    return JSON.parse(raw)
  } catch {
    return { clips: [] }
  }
}

function saveTimeline(projectId, data) {
  localStorage.setItem(storageKey(projectId), JSON.stringify(data))
}

// ── Utility ─────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function formatTime(secs) {
  const s = Math.max(0, secs)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/** Returns the total duration of the timeline (end of last clip, minimum 30s) */
function totalDuration(clips) {
  return Math.max(30, ...clips.map(c => c.startTime + c.duration))
}

/** Check if placing a clip at [start, start+dur] in `lane` collides with existing clips (excluding `excludeId`). */
function hasCollision(clips, lane, start, dur, excludeId = null) {
  return clips.some(c => {
    if (c.lane !== lane) return false
    if (c.id === excludeId) return false
    const end = start + dur
    const cEnd = c.startTime + c.duration
    return start < cEnd && end > c.startTime
  })
}

/** Start time right after the last clip in a lane, or 0 if the lane is empty. */
function nextGapStart(clips, lane) {
  const laneClips = clips.filter(c => c.lane === lane)
  if (!laneClips.length) return 0
  return Math.max(...laneClips.map(c => c.startTime + c.duration))
}

/** Clamp a clip's start time so it doesn't collide and stays >= 0. */
function clampedStart(clips, lane, desiredStart, duration, excludeId) {
  let start = Math.max(0, desiredStart)
  // Simple: if collides, try snapping to neighbours
  if (!hasCollision(clips, lane, start, duration, excludeId)) return start
  // Walk away from collision by snapping
  const laneClips = clips
    .filter(c => c.lane === lane && c.id !== excludeId)
    .sort((a, b) => a.startTime - b.startTime)
  // Try finding a gap
  let cursor = 0
  for (const c of laneClips) {
    if (c.startTime - cursor >= duration) {
      if (cursor >= desiredStart - duration) return cursor
    }
    cursor = Math.max(cursor, c.startTime + c.duration)
  }
  return cursor
}

// ── Main component ──────────────────────────────────────────────────────────

export default function TimelineTab({ projectId }) {
  const [clips, setClips] = useState(() => loadTimeline(projectId).clips)
  const [playhead, setPlayhead] = useState(0)       // seconds
  const [isPlaying, setIsPlaying] = useState(false)
  const [notePopup, setNotePopup] = useState(null)  // { clipId, x, y }
  const [dragging, setDragging] = useState(null)    // { type: 'clip'|'edge', clipId, edge?, offsetSec }
  const [drawing, setDrawing] = useState(null)      // { lane, startSec } — new note clip being drawn
  const [mediaPicker, setMediaPicker] = useState(null) // { lane, desiredStart, status, files, error }
  const [statusMsg, setStatusMsg] = useState('')
  const [isSupported] = useState(() => typeof window.showDirectoryPicker === 'function')

  const animFrameRef = useRef(null)
  const lastTimeRef = useRef(null)
  const videoRefs = useRef({})        // clipId → <video> element
  const audioRefs = useRef({})        // clipId → <audio> element
  const containerRef = useRef(null)
  const noteInputRef = useRef(null)
  const suppressLaneClickRef = useRef(false)

  const duration = totalDuration(clips)

  // ── Persist on every clips change
  // Blob URLs don't survive a reload, so media clips are saved without
  // fileUrl and reconnected to their source file by the relink effect below.
  useEffect(() => {
    const toSave = clips.map(c =>
      MEDIA_LANES.includes(c.lane) ? { ...c, fileUrl: undefined } : c
    )
    saveTimeline(projectId, { clips: toSave })
  }, [projectId, clips])

  // ── On mount: reconnect persisted media clips to their source file
  useEffect(() => {
    if (!isSupported) return
    let cancelled = false

    async function relink() {
      for (const lane of MEDIA_LANES) {
        const laneClips = clips.filter(c => c.lane === lane && c.name && !c.fileUrl)
        if (!laneClips.length) continue
        const handle = await loadHandle(laneFolderKey(lane, projectId))
        if (!handle) continue
        const ok = await verifyPermission(handle)
        if (!ok) continue
        const byName = new Map()
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') byName.set(entry.name, entry)
        }
        for (const clip of laneClips) {
          const entry = byName.get(clip.name)
          if (!entry) continue
          try {
            const file = await entry.getFile()
            const url = URL.createObjectURL(file)
            if (cancelled) { URL.revokeObjectURL(url); return }
            setClips(prev => prev.map(c => c.id === clip.id ? { ...c, fileUrl: url } : c))
          } catch { /* leave unlinked; user can re-add if the file moved */ }
        }
      }
    }
    relink()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Focus note input when popup opens
  useEffect(() => {
    if (notePopup && noteInputRef.current) noteInputRef.current.focus()
  }, [notePopup])

  // ── Playback loop
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current)
      lastTimeRef.current = null
      return
    }
    function tick(ts) {
      if (lastTimeRef.current == null) lastTimeRef.current = ts
      const delta = (ts - lastTimeRef.current) / 1000
      lastTimeRef.current = ts

      setPlayhead(prev => {
        const next = prev + delta
        if (next >= duration) {
          setIsPlaying(false)
          return 0
        }
        return next
      })
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isPlaying, duration])

  // ── Sync media elements to playhead during playback
  useEffect(() => {
    if (!isPlaying) return
    clips.forEach(clip => {
      if (clip.lane === 'video' && videoRefs.current[clip.id]) {
        const el = videoRefs.current[clip.id]
        const relTime = playhead - clip.startTime
        if (relTime >= 0 && relTime < clip.duration) {
          if (el.paused) el.play().catch(() => {})
        } else {
          if (!el.paused) el.pause()
        }
      }
      if (clip.lane === 'audio' && audioRefs.current[clip.id]) {
        const el = audioRefs.current[clip.id]
        const relTime = playhead - clip.startTime
        if (relTime >= 0 && relTime < clip.duration) {
          if (el.paused) el.play().catch(() => {})
        } else {
          if (!el.paused) el.pause()
        }
      }
    })
  }, [isPlaying, playhead, clips])

  // ── Stop all media on pause/stop
  function stopAllMedia() {
    Object.values(videoRefs.current).forEach(el => el?.pause())
    Object.values(audioRefs.current).forEach(el => el?.pause())
  }

  // ── Transport controls
  function handlePlayPause() {
    if (isPlaying) {
      setIsPlaying(false)
      stopAllMedia()
    } else {
      setIsPlaying(true)
    }
  }

  function handleReturnToStart() {
    setIsPlaying(false)
    stopAllMedia()
    setPlayhead(0)
    // Seek all media to their appropriate positions
    clips.forEach(clip => {
      if (clip.lane === 'video' && videoRefs.current[clip.id]) {
        videoRefs.current[clip.id].currentTime = 0
      }
      if (clip.lane === 'audio' && audioRefs.current[clip.id]) {
        audioRefs.current[clip.id].currentTime = 0
      }
    })
  }

  // ── Ruler click/drag to scrub
  function handleRulerPointerDown(e) {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const sec = Math.max(0, (e.clientX - rect.left) / PIXELS_PER_SECOND)
    setPlayhead(sec)
    if (isPlaying) {
      stopAllMedia()
      setIsPlaying(false)
    }

    function onMove(me) {
      const s = Math.max(0, (me.clientX - rect.left) / PIXELS_PER_SECOND)
      setPlayhead(s)
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Drag clip body (reposition)
  const handleClipPointerDown = useCallback((e, clip) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    suppressLaneClickRef.current = true
    const rect = e.currentTarget.closest('[data-lane]').getBoundingClientRect()
    const clickSec = (e.clientX - rect.left) / PIXELS_PER_SECOND
    const offsetSec = clickSec - clip.startTime

    setDragging({ type: 'clip', clipId: clip.id, lane: clip.lane, offsetSec })

    function onMove(me) {
      const newStart = Math.max(0, (me.clientX - rect.left) / PIXELS_PER_SECOND - offsetSec)
      setClips(prev => prev.map(c => {
        if (c.id !== clip.id) return c
        const snapped = hasCollision(prev, c.lane, newStart, c.duration, c.id)
          ? clampedStart(prev, c.lane, newStart, c.duration, c.id)
          : newStart
        return { ...c, startTime: snapped }
      }))
    }
    function onUp() {
      setDragging(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  // ── Drag clip edge (resize)
  const handleEdgePointerDown = useCallback((e, clip, edge) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    suppressLaneClickRef.current = true
    const rect = e.currentTarget.closest('[data-lane]').getBoundingClientRect()

    setDragging({ type: 'edge', clipId: clip.id, edge })

    function onMove(me) {
      const curSec = Math.max(0, (me.clientX - rect.left) / PIXELS_PER_SECOND)
      setClips(prev => prev.map(c => {
        if (c.id !== clip.id) return c
        if (edge === 'left') {
          const newStart = Math.min(curSec, c.startTime + c.duration - MIN_DURATION)
          const newDur = c.startTime + c.duration - newStart
          if (hasCollision(prev, c.lane, newStart, newDur, c.id)) return c
          return { ...c, startTime: Math.max(0, newStart), duration: Math.max(MIN_DURATION, newDur) }
        } else {
          const newDur = Math.max(MIN_DURATION, curSec - c.startTime)
          if (hasCollision(prev, c.lane, c.startTime, newDur, c.id)) return c
          return { ...c, duration: newDur }
        }
      }))
    }
    function onUp() {
      setDragging(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  // ── Draw new note clip on the notes lane
  function handleNoteLanePointerDown(e) {
    if (e.button !== 0) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const startSec = Math.max(0, (e.clientX - rect.left) / PIXELS_PER_SECOND)
    setDrawing({ lane: 'notes', startSec, currentSec: startSec + DEFAULT_NOTE_DURATION })

    function onMove(me) {
      const cur = Math.max(startSec + MIN_DURATION, (me.clientX - rect.left) / PIXELS_PER_SECOND)
      setDrawing(d => d ? { ...d, currentSec: cur } : null)
    }
    function onUp() {
      setDrawing(d => {
        if (!d) return null
        const dur = Math.max(DEFAULT_NOTE_DURATION, d.currentSec - d.startSec)
        if (!hasCollision(clips, 'notes', d.startSec, dur, null)) {
          const newClip = {
            id: generateId(),
            lane: 'notes',
            startTime: d.startSec,
            duration: dur,
            text: '',
          }
          setClips(prev => [...prev, newClip])
        }
        return null
      })
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Delete a clip
  function deleteClip(clipId) {
    setClips(prev => {
      const clip = prev.find(c => c.id === clipId)
      if (clip?.fileUrl) URL.revokeObjectURL(clip.fileUrl)
      return prev.filter(c => c.id !== clipId)
    })
    if (notePopup?.clipId === clipId) setNotePopup(null)
  }

  // ── Toggle mute on a video/audio clip
  function toggleMute(clipId) {
    setClips(prev => prev.map(c => c.id === clipId ? { ...c, muted: !c.muted } : c))
  }

  // ── Open the media picker for a lane, prompting for folder access if needed
  async function openMediaPicker(lane, desiredStart = null) {
    if (!isSupported) {
      setStatusMsg('Adding video/audio clips requires Chrome or Edge on desktop.')
      return
    }
    setMediaPicker({ lane, desiredStart, status: 'loading', files: [] })
    const key = laneFolderKey(lane, projectId)
    let handle = await loadHandle(key)
    if (handle && !(await verifyPermission(handle))) handle = null
    if (!handle) {
      try {
        handle = await window.showDirectoryPicker({ mode: 'read' })
        await saveHandle(key, handle)
      } catch (err) {
        setMediaPicker(null)
        if (err.name !== 'AbortError') setStatusMsg('Could not open folder. Please try again.')
        return
      }
    }
    try {
      const exts = lane === 'video' ? VIDEO_EXTS : AUDIO_EXTS
      const found = []
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && exts.has(getExt(entry.name))) found.push(entry)
      }
      found.sort((a, b) => a.name.localeCompare(b.name))
      setMediaPicker({ lane, desiredStart, status: 'ready', files: found })
    } catch {
      setMediaPicker({ lane, desiredStart, status: 'error', files: [], error: 'Could not read folder contents.' })
    }
  }

  // ── User picked a file from the media picker — add it as a clip
  async function handleSelectMediaFile(entry) {
    const { lane, desiredStart } = mediaPicker
    setMediaPicker(m => ({ ...m, status: 'loading' }))
    try {
      const file = await entry.getFile()
      const url = URL.createObjectURL(file)
      const dur = await getMediaDuration(url, lane)
      setClips(prev => {
        const start = clampedStart(prev, lane, desiredStart ?? nextGapStart(prev, lane), dur, null)
        return [...prev, { id: generateId(), lane, startTime: start, duration: dur, name: entry.name, fileUrl: url, muted: false }]
      })
      setMediaPicker(null)
    } catch (err) {
      setMediaPicker(m => ({ ...m, status: 'error', error: err.message || 'Could not load that file.' }))
    }
  }

  // ── Click on empty video/audio lane background opens the media picker
  function handleMediaLaneClick(e, lane) {
    if (suppressLaneClickRef.current) { suppressLaneClickRef.current = false; return }
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const startSec = Math.max(0, (e.clientX - rect.left) / PIXELS_PER_SECOND)
    openMediaPicker(lane, startSec)
  }

  // ── Open note popup
  function openNotePopup(e, clip) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setNotePopup({ clipId: clip.id, x: rect.left, y: rect.bottom + 4 })
  }

  function saveNoteText(text) {
    setClips(prev => prev.map(c =>
      c.id === notePopup?.clipId ? { ...c, text } : c
    ))
    setNotePopup(null)
  }

  // ── Active note caption during playback
  const activeNote = isPlaying
    ? clips.find(c => c.lane === 'notes' && playhead >= c.startTime && playhead < c.startTime + c.duration)
    : null

  // ── Active video clip for preview
  const activeVideoClip = clips.find(
    c => c.lane === 'video' && playhead >= c.startTime && playhead < c.startTime + c.duration
  )

  const timelineWidth = duration * PIXELS_PER_SECOND
  const playheadPx = playhead * PIXELS_PER_SECOND

  // ── Ruler ticks
  const rulerTicks = []
  for (let s = 0; s <= duration; s += 5) {
    rulerTicks.push(s)
  }

  return (
    <div className={styles.container}>
      {/* Transport controls */}
      <div className={styles.transport}>
        <button
          className={`${styles.transportBtn} ${styles.transportBtnPrimary}`}
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          className={styles.transportBtn}
          onClick={handleReturnToStart}
          aria-label="Return to start"
        >
          ⏮
        </button>
        <span className={styles.timecode}>{formatTime(playhead)}</span>
        <div className={styles.transportSpacer} />
        <span className={styles.hint}>
          Click a lane or the + button to add a clip · Drag clips to reposition · Drag edges to resize
        </span>
      </div>

      {/* Status message */}
      {statusMsg && <p className={styles.statusMsg}>{statusMsg}</p>}

      {/* Video preview (only visible when video clips are loaded) */}
      {clips.some(c => c.lane === 'video' && c.fileUrl) && (
        <div className={styles.previewSection}>
          {clips.filter(c => c.lane === 'video' && c.fileUrl).map(clip => (
            <video
              key={clip.id}
              ref={el => { if (el) videoRefs.current[clip.id] = el; else delete videoRefs.current[clip.id] }}
              src={clip.fileUrl}
              className={`${styles.previewVideo} ${activeVideoClip?.id === clip.id ? styles.previewVideoActive : ''}`}
              muted={!!clip.muted}
              playsInline
            />
          ))}
          {/* Note caption overlay */}
          {activeNote?.text && (
            <div className={styles.noteCaption}>{activeNote.text}</div>
          )}
        </div>
      )}

      {/* Hidden audio elements */}
      {clips.filter(c => c.lane === 'audio' && c.fileUrl).map(clip => (
        <audio
          key={clip.id}
          ref={el => { if (el) audioRefs.current[clip.id] = el; else delete audioRefs.current[clip.id] }}
          src={clip.fileUrl}
          muted={!!clip.muted}
          style={{ display: 'none' }}
        />
      ))}

      {/* Timeline scroll container */}
      <div className={styles.timelineScroll} ref={containerRef}>
        <div className={styles.timelineInner} style={{ width: timelineWidth + 80 + 48 }}>
          {/* Lane labels column */}
          <div className={styles.labelCol}>
            <div className={styles.rulerLabel} />
            {LANE_KEYS.map(lane => (
              <div key={lane} className={styles.laneLabel}>{LANE_LABELS[lane]}</div>
            ))}
          </div>

          {/* Track area */}
          <div className={styles.trackArea}>
            {/* Ruler */}
            <div
              className={styles.ruler}
              style={{ width: timelineWidth }}
              onPointerDown={handleRulerPointerDown}
            >
              {rulerTicks.map(s => (
                <div
                  key={s}
                  className={styles.rulerTick}
                  style={{ left: s * PIXELS_PER_SECOND }}
                >
                  <span className={styles.rulerTickLabel}>{formatTime(s)}</span>
                </div>
              ))}
              {/* Playhead on ruler */}
              <div className={styles.playheadRuler} style={{ left: playheadPx }} />
            </div>

            {/* Lanes */}
            {LANE_KEYS.map(lane => (
              <div
                key={lane}
                className={`${styles.lane} ${lane === 'notes' ? styles.laneNotes : ''}`}
                style={{ width: timelineWidth }}
                data-lane={lane}
                onPointerDown={lane === 'notes' ? handleNoteLanePointerDown : undefined}
                onClick={MEDIA_LANES.includes(lane) ? (e => handleMediaLaneClick(e, lane)) : undefined}
              >
                {/* Drawing ghost for new note clip */}
                {drawing && drawing.lane === lane && (
                  <div
                    className={`${styles.clip} ${styles.clipNote} ${styles.clipGhost}`}
                    style={{
                      left: drawing.startSec * PIXELS_PER_SECOND,
                      width: (drawing.currentSec - drawing.startSec) * PIXELS_PER_SECOND,
                    }}
                  />
                )}

                {/* Existing clips */}
                {clips.filter(c => c.lane === lane).map(clip => (
                  <ClipBlock
                    key={clip.id}
                    clip={clip}
                    onPointerDown={handleClipPointerDown}
                    onEdgePointerDown={handleEdgePointerDown}
                    onDelete={deleteClip}
                    onNoteClick={openNotePopup}
                    onToggleMute={toggleMute}
                    isDragging={dragging?.clipId === clip.id}
                  />
                ))}

                {/* Playhead line in lane */}
                <div className={styles.playheadLane} style={{ left: playheadPx }} />
              </div>
            ))}
          </div>

          {/* Sticky "+" column for adding video/audio clips */}
          <div className={styles.rightCol}>
            <div className={styles.rulerLabel} />
            {LANE_KEYS.map(lane => (
              <div key={lane} className={styles.laneRightCell}>
                {MEDIA_LANES.includes(lane) && (
                  <button
                    className={styles.addClipBtn}
                    onClick={() => openMediaPicker(lane)}
                    aria-label={`Add ${LANE_LABELS[lane]} clip`}
                    title={`Add ${LANE_LABELS[lane]} clip`}
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Media picker popup */}
      {mediaPicker && (
        <MediaPickerPopup
          picker={mediaPicker}
          onSelect={handleSelectMediaFile}
          onClose={() => setMediaPicker(null)}
        />
      )}

      {/* Note popup */}
      {notePopup && (
        <NotePopup
          clip={clips.find(c => c.id === notePopup.clipId)}
          anchorX={notePopup.x}
          anchorY={notePopup.y}
          onSave={saveNoteText}
          onClose={() => setNotePopup(null)}
          inputRef={noteInputRef}
        />
      )}
    </div>
  )
}

// ── ClipBlock ───────────────────────────────────────────────────────────────

function ClipBlock({ clip, onPointerDown, onEdgePointerDown, onDelete, onNoteClick, onToggleMute, isDragging }) {
  const isNote = clip.lane === 'notes'
  const left = clip.startTime * PIXELS_PER_SECOND
  const width = Math.max(4, clip.duration * PIXELS_PER_SECOND)

  return (
    <div
      className={`${styles.clip} ${isNote ? styles.clipNote : styles.clipMedia} ${isDragging ? styles.clipDragging : ''}`}
      style={{ left, width }}
      onPointerDown={e => !isNote ? onPointerDown(e, clip) : onPointerDown(e, clip)}
      title={isNote ? (clip.text || 'Untitled note') : clip.name}
    >
      {/* Left resize handle */}
      <div
        className={styles.resizeHandle}
        onPointerDown={e => onEdgePointerDown(e, clip, 'left')}
      />

      {/* Clip label */}
      <div
        className={styles.clipLabel}
        onClick={isNote ? (e => onNoteClick(e, clip)) : undefined}
        style={isNote ? { cursor: 'pointer' } : {}}
      >
        {isNote
          ? (clip.text ? clip.text.slice(0, 30) + (clip.text.length > 30 ? '…' : '') : 'Untitled note')
          : (clip.name || clip.lane)
        }
      </div>

      {/* Right resize handle */}
      <div
        className={`${styles.resizeHandle} ${styles.resizeHandleRight}`}
        onPointerDown={e => onEdgePointerDown(e, clip, 'right')}
      />

      {/* Mute toggle (video/audio clips only) */}
      {!isNote && (
        <button
          className={styles.clipMuteBtn}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onToggleMute(clip.id) }}
          aria-label={clip.muted ? 'Unmute clip' : 'Mute clip'}
          title={clip.muted ? 'Unmute' : 'Mute'}
        >
          {clip.muted ? '🔇' : '🔊'}
        </button>
      )}

      {/* Delete button */}
      <button
        className={styles.clipDeleteBtn}
        onClick={e => { e.stopPropagation(); onDelete(clip.id) }}
        aria-label="Delete clip"
        title="Remove clip"
      >
        ✕
      </button>
    </div>
  )
}

// ── NotePopup ───────────────────────────────────────────────────────────────

function NotePopup({ clip, anchorX, anchorY, onSave, onClose, inputRef }) {
  const [text, setText] = useState(clip?.text || '')

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className={styles.notePopupOverlay}
      onClick={e => { if (e.target === e.currentTarget) onSave(text) }}
    >
      <div
        className={styles.notePopup}
        style={{ top: Math.min(anchorY, window.innerHeight - 200), left: Math.min(anchorX, window.innerWidth - 300) }}
      >
        <textarea
          ref={inputRef}
          className={styles.notePopupInput}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note for this time range…"
          rows={4}
        />
        <div className={styles.notePopupFooter}>
          <button className="btn-primary" onClick={() => onSave(text)}>Save</button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── MediaPickerPopup ────────────────────────────────────────────────────────

function MediaPickerPopup({ picker, onSelect, onClose }) {
  const { lane, status, files, error } = picker
  const label = LANE_LABELS[lane]

  return (
    <div className={styles.notePopupOverlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.mediaPickerModal}>
        <div className={styles.mediaPickerHeader}>
          <span>Add {label} clip</span>
          <button className={styles.closePlayer} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {status === 'loading' && <p className={styles.hint}>Loading…</p>}
        {status === 'error' && <p className={styles.statusMsg}>{error}</p>}

        {status === 'ready' && files.length === 0 && (
          <p className={styles.hint}>No {label.toLowerCase()} files found in that folder.</p>
        )}

        {status === 'ready' && files.length > 0 && (
          <ul className={styles.mediaPickerList} role="list">
            {files.map(entry => (
              <li key={entry.name}>
                <button className={styles.mediaPickerItem} onClick={() => onSelect(entry)}>
                  {entry.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
