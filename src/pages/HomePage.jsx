import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './HomePage.module.css'

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

const STORAGE_KEY = 'choreographer_projects'

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export default function HomePage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState(loadProjects)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    saveProjects(projects)
  }, [projects])

  function handleCreate(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const project = { id: generateId(), name }
    setProjects(prev => [...prev, project])
    setNewName('')
  }

  return (
    <div className="page">
      <header className={styles.header}>
        <h1 className={styles.title}>Choreographer's Notebook</h1>
        <p className={styles.subtitle}>A creative workspace for movement and ideas.</p>
      </header>

      <section className={styles.seedsSection}>
        <button
          className={`btn-primary ${styles.seedsBtn}`}
          onClick={() => navigate('/seeds')}
        >
          Seeds of Movement
        </button>
        <p className={styles.seedsHint}>AI-assisted movement ideation</p>
      </section>

      <section className={styles.projectsSection}>
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
              <li key={project.id}>
                <button
                  className={styles.projectBtn}
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {project.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
