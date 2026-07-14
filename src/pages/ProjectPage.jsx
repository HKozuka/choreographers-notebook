import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import NotesTab from '../features/notes/NotesTab'
import VideoLogTab from '../features/videolog/VideoLogTab'
import MusicTab from '../features/music/MusicTab'
import TimelineTab from '../features/timeline/TimelineTab'
import { getProjectName, renameProject, trashProject } from '../utils/projects'
import ConfirmDialog from '../components/ConfirmDialog'
import styles from './ProjectPage.module.css'

const TABS = [
  { key: 'notes',     label: 'Notes' },
  { key: 'video',     label: 'Video Log' },
  { key: 'music',     label: 'Music References' },
  { key: 'timeline',  label: 'Visualization' },
]

const IMAGE_STORE_KEY = 'choreographer_project_images'
const POS_STORE_KEY   = 'choreographer_project_image_positions'

function loadCoverImage(projectId) {
  try {
    const store = JSON.parse(localStorage.getItem(IMAGE_STORE_KEY)) || {}
    return store[projectId] || null
  } catch {
    return null
  }
}

/** Load saved position { x: '%', y: '%' } for a project, defaulting to 50/50. */
function loadImagePosition(projectId) {
  try {
    const store = JSON.parse(localStorage.getItem(POS_STORE_KEY)) || {}
    return store[projectId] || { x: 50, y: 50 }
  } catch {
    return { x: 50, y: 50 }
  }
}

function saveImagePosition(projectId, pos) {
  try {
    const store = JSON.parse(localStorage.getItem(POS_STORE_KEY)) || {}
    store[projectId] = pos
    localStorage.setItem(POS_STORE_KEY, JSON.stringify(store))
  } catch { /* ignore */ }
}

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [projectName, setProjectName] = useState(() => getProjectName(id))
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [activeTab, setActiveTab] = useState('notes')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [coverImage] = useState(() => loadCoverImage(id))

  // Image position state
  const [savedPos, setSavedPos] = useState(() => loadImagePosition(id))
  const [adjustMode, setAdjustMode] = useState(false)
  const [draftPos, setDraftPos] = useState(null)   // { x, y } percentages while adjusting
  // Drag state
  const dragRef = useRef(null)  // { startX, startY, startPosX, startPosY }
  const bannerRef = useRef(null)
  const imgRef = useRef(null)

  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  function startEditing() {
    setEditValue(projectName)
    setIsEditing(true)
  }

  function commitRename() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== projectName) {
      renameProject(id, trimmed)
      setProjectName(trimmed)
    }
    setIsEditing(false)
  }

  function cancelRename() {
    setIsEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') cancelRename()
  }

  function handleDeleteConfirm() {
    trashProject(id)
    navigate('/projects')
  }

  // ── Enter adjust mode when clicking the banner image (not the title)
  function handleBannerClick(e) {
    // Don't trigger if clicking the title area or in adjust mode already
    if (isEditing || adjustMode) return
    if (!coverImage) return
    // Don't trigger if clicking the title overlay
    if (e.target.closest('[data-banner-title]')) return
    setDraftPos({ ...savedPos })
    setAdjustMode(true)
  }

  // ── Drag to reposition image inside banner
  const handleImgPointerDown = useCallback((e) => {
    if (!adjustMode) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: draftPos?.x ?? savedPos.x,
      startPosY: draftPos?.y ?? savedPos.y,
    }

    function onMove(me) {
      if (!dragRef.current) return
      const banner = bannerRef.current
      const img = imgRef.current
      if (!banner || !img) return

      const bw = banner.offsetWidth
      const bh = banner.offsetHeight
      const iw = img.naturalWidth  || bw
      const ih = img.naturalHeight || bh

      // How much the image can move beyond the frame (in pixels)
      const renderScale = Math.max(bw / iw, bh / ih)
      const renderedW = iw * renderScale
      const renderedH = ih * renderScale

      const maxDx = (renderedW - bw) / 2
      const maxDy = (renderedH - bh) / 2

      const dx = me.clientX - dragRef.current.startX
      const dy = me.clientY - dragRef.current.startY

      // Convert pixel drag delta to percentage shift
      const dxPct = maxDx > 0 ? (dx / (maxDx * 2)) * 100 : 0
      const dyPct = maxDy > 0 ? (dy / (maxDy * 2)) * 100 : 0

      const newX = Math.max(0, Math.min(100, dragRef.current.startPosX - dxPct))
      const newY = Math.max(0, Math.min(100, dragRef.current.startPosY - dyPct))

      setDraftPos({ x: newX, y: newY })
    }

    function onUp() {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [adjustMode, draftPos, savedPos])

  function handleAdjustSave() {
    if (draftPos) {
      saveImagePosition(id, draftPos)
      setSavedPos(draftPos)
    }
    setAdjustMode(false)
    setDraftPos(null)
  }

  function handleAdjustCancel() {
    setAdjustMode(false)
    setDraftPos(null)
  }

  function renderTab() {
    switch (activeTab) {
      case 'notes':    return <NotesTab projectId={id} />
      case 'video':    return <VideoLogTab projectId={id} />
      case 'music':    return <MusicTab projectId={id} />
      case 'timeline': return <TimelineTab projectId={id} />
      default:         return null
    }
  }

  const monogram = projectName.charAt(0).toUpperCase()
  const activePos = adjustMode ? draftPos : savedPos
  const objectPosition = `${activePos?.x ?? 50}% ${activePos?.y ?? 50}%`

  return (
    <div className="page">
      <nav className={styles.nav}>
        <button className="btn-secondary" onClick={() => navigate('/home')}>
          ← Notebook
        </button>
        <button
          className={styles.deleteBtn}
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete project
        </button>
      </nav>

      {/* Cover banner */}
      <div
        ref={bannerRef}
        className={`${styles.banner} ${adjustMode ? styles.bannerAdjust : ''}`}
        onClick={handleBannerClick}
      >
        {coverImage ? (
          <img
            ref={imgRef}
            src={coverImage}
            alt={projectName}
            className={styles.bannerImg}
            style={{ objectPosition }}
            onPointerDown={adjustMode ? handleImgPointerDown : undefined}
            draggable={false}
          />
        ) : (
          <div className={styles.bannerPlaceholder}>
            <span className={styles.bannerMonogram}>{monogram}</span>
          </div>
        )}

        {/* Dark gradient scrim at the bottom for text legibility */}
        {!adjustMode && <div className={styles.bannerScrim} />}

        {/* Adjust mode overlay — dims area outside frame (same frame = no overlay needed, but show dimmed hint) */}
        {adjustMode && (
          <div className={styles.adjustOverlay}>
            <span className={styles.adjustHint}>Drag to reposition</span>
          </div>
        )}

        {/* Title overlay — clickable to rename (not shown in adjust mode) */}
        {!adjustMode && (
          <div className={styles.bannerTitle} data-banner-title>
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                className={styles.bannerTitleInput}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                aria-label="Rename project"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <h1
                className={styles.bannerTitleText}
                onClick={e => { e.stopPropagation(); startEditing() }}
                title="Click to rename"
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && startEditing()}
              >
                {projectName}
                <span className={styles.editHint} aria-hidden="true">✎</span>
              </h1>
            )}
          </div>
        )}

        {/* Adjust mode controls */}
        {adjustMode && (
          <div className={styles.adjustControls}>
            <button className="btn-primary" onClick={e => { e.stopPropagation(); handleAdjustSave() }}>
              Save position
            </button>
            <button className="btn-secondary" onClick={e => { e.stopPropagation(); handleAdjustCancel() }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Click-to-adjust hint (only when image is present and not in adjust mode) */}
      {coverImage && !adjustMode && (
        <p className={styles.adjustTip}>
          Click the banner to adjust image position
        </p>
      )}

      {/* Tab bar */}
      <div className={styles.tabBar} role="tablist" aria-label="Project sections">
        {TABS.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent} role="tabpanel">
        {renderTab()}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={`Delete "${projectName}"?`}
          message="It will be moved to the trash. You can restore it from the Trash view on the home screen."
          confirmLabel="Move to Trash"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
