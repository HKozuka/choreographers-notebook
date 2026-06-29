import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import NotesTab from '../features/notes/NotesTab'
import VideoLogTab from '../features/videolog/VideoLogTab'
import MusicTab from '../features/music/MusicTab'
import TimelineTab from '../features/timeline/TimelineTab'
import styles from './ProjectPage.module.css'

const STORAGE_KEY = 'choreographer_projects'

function getProjectName(id) {
  try {
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    return projects.find(p => p.id === id)?.name || 'Untitled Project'
  } catch {
    return 'Untitled Project'
  }
}

const TABS = [
  { key: 'notes',     label: 'Notes' },
  { key: 'video',     label: 'Video Log' },
  { key: 'music',     label: 'Music References' },
  { key: 'timeline',  label: 'Visualization' },
]

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const projectName = getProjectName(id)
  const [activeTab, setActiveTab] = useState('notes')

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
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>{projectName}</h1>
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
    </div>
  )
}
