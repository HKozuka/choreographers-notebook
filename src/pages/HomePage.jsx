import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  loadActiveProjects,
  saveProjects,
  loadProjects,
  trashProject,
} from '../utils/projects'
import ConfirmDialog from '../components/ConfirmDialog'
import TrashView from '../components/TrashView'
import styles from './HomePage.module.css'

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

export default function HomePage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState(loadActiveProjects)
  const [newName, setNewName] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [confirmTrash, setConfirmTrash] = useState(null) // project to trash

  // Refresh active list from localStorage
  function refreshProjects() {
    setProjects(loadActiveProjects())
  }

  function handleCreate(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const allProjects = loadProjects()
    const project = { id: generateId(), name, trashedAt: null }
    saveProjects([...allProjects, project])
    setNewName('')
    refreshProjects()
  }

  function handleDeleteClick(e, project) {
    e.stopPropagation()
    setConfirmTrash(project)
  }

  function handleTrashConfirm() {
    trashProject(confirmTrash.id)
    setConfirmTrash(null)
    refreshProjects()
  }

  if (showTrash) {
    return (
      <TrashView onClose={() => { setShowTrash(false); refreshProjects() }} />
    )
  }

  return (
    <div className={styles.layout}>
      {/* Hero — full viewport, vertically and horizontally centred */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>Choreographer's Notebook</h1>
          <p className={styles.appSubtitle}>A creative workspace for movement and ideas.</p>
          <button
            className={`btn-primary ${styles.seedsBtn}`}
            onClick={() => navigate('/seeds')}
          >
            Seeds of Movement
          </button>
          <p className={styles.seedsHint}>AI-assisted movement ideation</p>
        </div>
        <a href="#projects" className={styles.scrollHint} aria-label="Scroll to projects">
          ↓
        </a>
      </section>

      {/* Projects section — scrolls into view below the hero */}
      <section className={styles.projectsSection} id="projects">
        <div className={styles.projectsInner}>
          <h2 className={styles.sectionHeading}>Projects</h2>

          <form className={styles.createForm} onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="New project name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className={styles.input}
            />
            <button type="submit" className="btn-primary">
              New Project
            </button>
          </form>

          {projects.length === 0 ? (
            <p className={styles.emptyState}>
              <em>No projects yet — create one above</em>
            </p>
          ) : (
            <ul className={styles.projectList}>
              {projects.map(project => (
                <li key={project.id} className={styles.projectItem}>
                  <button
                    className={styles.projectBtn}
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    {project.name}
                  </button>
                  <button
                    className={styles.trashBtn}
                    onClick={e => handleDeleteClick(e, project)}
                    aria-label={`Delete ${project.name}`}
                    title="Move to trash"
                  >
                    ␡
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.trashLink}>
            <button
              className={styles.trashLinkBtn}
              onClick={() => setShowTrash(true)}
            >
              Trash
            </button>
          </div>
        </div>
      </section>

      {/* Confirm move to trash */}
      {confirmTrash && (
        <ConfirmDialog
          title={`Delete "${confirmTrash.name}"?`}
          message="It will be moved to the trash. You can restore it from the Trash view."
          confirmLabel="Move to Trash"
          onConfirm={handleTrashConfirm}
          onCancel={() => setConfirmTrash(null)}
        />
      )}
    </div>
  )
}
