/**
 * src/utils/projects.js
 * Shared helpers for reading and writing the choreographer_projects localStorage store.
 * Schema: [{ id: string, name: string, trashedAt: string|null }]
 */

const STORAGE_KEY = 'choreographer_projects'
const IMAGE_STORE_KEY = 'choreographer_project_images'

export function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function loadActiveProjects() {
  return loadProjects().filter(p => !p.trashedAt)
}

export function loadTrashedProjects() {
  return loadProjects().filter(p => !!p.trashedAt)
}

export function renameProject(id, newName) {
  const projects = loadProjects()
  const updated = projects.map(p => p.id === id ? { ...p, name: newName } : p)
  saveProjects(updated)
}

export function trashProject(id) {
  const projects = loadProjects()
  const updated = projects.map(p =>
    p.id === id ? { ...p, trashedAt: new Date().toISOString() } : p
  )
  saveProjects(updated)
}

export function restoreProject(id) {
  const projects = loadProjects()
  const updated = projects.map(p =>
    p.id === id ? { ...p, trashedAt: null } : p
  )
  saveProjects(updated)
}

export function deleteProjectPermanently(id) {
  const projects = loadProjects()
  saveProjects(projects.filter(p => p.id !== id))
}

export function getProjectName(id) {
  return loadProjects().find(p => p.id === id)?.name || 'Untitled Project'
}

/** Map of projectId -> cover image data URL, keyed as uploaded via ProjectsPage. */
export function loadProjectImages() {
  try {
    return JSON.parse(localStorage.getItem(IMAGE_STORE_KEY)) || {}
  } catch {
    return {}
  }
}
