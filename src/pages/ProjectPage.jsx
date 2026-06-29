import { useState, useRef, useEffect } from 'react'
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

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [projectName, setProjectName] = useState(() => getProjectName(id))
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [activeTab, setActiveTab] = useState('notes')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const inputRef = useRef(null)

  // Focus the input when editing starts
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
    navigate('/')
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

  return (
    <div className="page">
      <nav className={styles.nav}>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          ← Notebook
        </button>
        <button
          className={styles.deleteBtn}
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete project
        </button>
      </nav>

      <header className={styles.header}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className={styles.titleInput}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            aria-label="Rename project"
          />
        ) : (
          <h1
            className={styles.title}
            onClick={startEditing}
            title="Click to rename"
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && startEditing()}
          >
            {projectName}
            <span className={styles.editHint} aria-hidden="true">✎</span>
          </h1>
        )}
      </header>

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
