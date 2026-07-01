import { useState, useEffect, useRef } from 'react'
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

const IMAGE_STORE_KEY = 'choreographer_project_images'

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

function loadImages() {
  try {
    return JSON.parse(localStorage.getItem(IMAGE_STORE_KEY)) || {}
  } catch {
    return {}
  }
}

function saveImage(projectId, base64) {
  const images = loadImages()
  images[projectId] = base64
  localStorage.setItem(IMAGE_STORE_KEY, JSON.stringify(images))
}

function removeImage(projectId) {
  const images = loadImages()
  delete images[projectId]
  localStorage.setItem(IMAGE_STORE_KEY, JSON.stringify(images))
}

export default function HomePage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState(loadActiveProjects)
  const [images, setImages] = useState(loadImages)
  const [newName, setNewName] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [confirmTrash, setConfirmTrash] = useState(null)

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
    removeImage(confirmTrash.id)
    trashProject(confirmTrash.id)
    setConfirmTrash(null)
    setImages(loadImages())
    refreshProjects()
  }

  function handleImageUpload(e, projectId) {
    e.stopPropagation()
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      saveImage(projectId, ev.target.result)
      setImages(loadImages())
    }
    reader.readAsDataURL(file)
  }

  if (showTrash) {
    return (
      <TrashView onClose={() => { setShowTrash(false); refreshProjects() }} />
    )
  }

  return (
    <div className={styles.layout}>
      {/* Hero */}
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

      {/* Projects section */}
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
            <ul className={styles.cardGrid}>
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  image={images[project.id] || null}
                  onOpen={() => navigate(`/project/${project.id}`)}
                  onDelete={e => handleDeleteClick(e, project)}
                  onImageUpload={e => handleImageUpload(e, project.id)}
                />
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

function ProjectCard({ project, image, onOpen, onDelete, onImageUpload }) {
  const fileInputRef = useRef(null)
  const monogram = project.name.charAt(0).toUpperCase()

  function handleUploadClick(e) {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  return (
    <li className={styles.card}>
      {/* Image area */}
      <div
        className={styles.cardImage}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onOpen()}
        aria-label={`Open ${project.name}`}
      >
        {image ? (
          <img src={image} alt={project.name} className={styles.cardImg} />
        ) : (
          <div className={styles.cardPlaceholder}>
            <span className={styles.cardMonogram}>{monogram}</span>
          </div>
        )}

        {/* Delete button — top-right overlay */}
        <button
          className={styles.cardDeleteBtn}
          onClick={onDelete}
          aria-label={`Delete ${project.name}`}
          title="Move to trash"
        >
          <span className={styles.deleteX}>✕</span>
        </button>

        {/* Upload affordance — bottom-right overlay */}
        <button
          className={styles.cardUploadBtn}
          onClick={handleUploadClick}
          aria-label="Upload cover image"
          title="Upload cover image"
        >
          &#8679;
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={onImageUpload}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* Name label */}
      <div className={styles.cardName}>{project.name}</div>
    </li>
  )
}
