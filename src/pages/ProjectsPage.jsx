import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  loadActiveProjects,
  saveProjects,
  loadProjects,
  loadProjectImages,
  reorderActiveProjects,
  trashProject,
} from '../utils/projects'
import ConfirmDialog from '../components/ConfirmDialog'
import TrashView from '../components/TrashView'
import styles from './ProjectsPage.module.css'

const IMAGE_STORE_KEY = 'choreographer_project_images'

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

function saveImage(projectId, base64) {
  const images = loadProjectImages()
  images[projectId] = base64
  localStorage.setItem(IMAGE_STORE_KEY, JSON.stringify(images))
}

function removeImage(projectId) {
  const images = loadProjectImages()
  delete images[projectId]
  localStorage.setItem(IMAGE_STORE_KEY, JSON.stringify(images))
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState(loadActiveProjects)
  const [images, setImages] = useState(loadProjectImages)
  const [newName, setNewName] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [confirmTrash, setConfirmTrash] = useState(null)

  // Drag-to-reorder state
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  function refreshProjects() {
    setProjects(loadActiveProjects())
  }

  function handleDragStart(e, projectId) {
    setDraggedId(projectId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', projectId)
  }

  function handleDragOver(e, projectId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (projectId !== draggedId) {
      setDragOverId(projectId)
    }
  }

  function handleDrop(e, targetId) {
    e.preventDefault()
    if (draggedId && draggedId !== targetId) {
      const order = projects.map(p => p.id)
      const fromIndex = order.indexOf(draggedId)
      const toIndex = order.indexOf(targetId)
      order.splice(fromIndex, 1)
      order.splice(toIndex, 0, draggedId)
      reorderActiveProjects(order)
      refreshProjects()
    }
    setDraggedId(null)
    setDragOverId(null)
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDragOverId(null)
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
    setImages(loadProjectImages())
    refreshProjects()
  }

  function handleImageUpload(e, projectId) {
    e.stopPropagation()
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      saveImage(projectId, ev.target.result)
      setImages(loadProjectImages())
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
      <section className={styles.projectsSection}>
        <div className={styles.projectsInner}>
          <h1 className={styles.sectionHeading}>Projects</h1>

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
                  isDragging={draggedId === project.id}
                  isDragOver={dragOverId === project.id}
                  onDragStart={e => handleDragStart(e, project.id)}
                  onDragOver={e => handleDragOver(e, project.id)}
                  onDragLeave={() => setDragOverId(prev => (prev === project.id ? null : prev))}
                  onDrop={e => handleDrop(e, project.id)}
                  onDragEnd={handleDragEnd}
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

function ProjectCard({
  project,
  image,
  onOpen,
  onDelete,
  onImageUpload,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) {
  const fileInputRef = useRef(null)
  const monogram = project.name.charAt(0).toUpperCase()

  function handleUploadClick(e) {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  return (
    <li
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''} ${isDragOver ? styles.cardDragOver : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
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
