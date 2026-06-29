import { useState, useEffect } from 'react'
import {
  loadTrashedProjects,
  restoreProject,
  deleteProjectPermanently,
} from '../utils/projects'
import ConfirmDialog from './ConfirmDialog'
import styles from './TrashView.module.css'

export default function TrashView({ onClose }) {
  const [trashed, setTrashed] = useState(loadTrashedProjects)
  const [confirmDelete, setConfirmDelete] = useState(null) // project to permanently delete

  useEffect(() => {
    setTrashed(loadTrashedProjects())
  }, [])

  function handleRestore(id) {
    restoreProject(id)
    setTrashed(loadTrashedProjects())
  }

  function handlePermanentDelete(project) {
    setConfirmDelete(project)
  }

  function confirmPermanentDelete() {
    deleteProjectPermanently(confirmDelete.id)
    setConfirmDelete(null)
    setTrashed(loadTrashedProjects())
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Trash</h2>
        <button className="btn-secondary" onClick={onClose}>
          ← Back
        </button>
      </div>

      {trashed.length === 0 ? (
        <p className={styles.emptyState}>
          <em>The trash is empty.</em>
        </p>
      ) : (
        <ul className={styles.list} role="list">
          {trashed.map(project => (
            <li key={project.id} className={styles.item}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{project.name}</span>
                <span className={styles.itemDate}>
                  Deleted {formatDate(project.trashedAt)}
                </span>
              </div>
              <div className={styles.itemActions}>
                <button
                  className="btn-secondary"
                  onClick={() => handleRestore(project.id)}
                >
                  Restore
                </button>
                <button
                  className={styles.deletePermBtn}
                  onClick={() => handlePermanentDelete(project)}
                >
                  Delete Permanently
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Permanently delete "${confirmDelete.name}"?`}
          message="This cannot be undone. All project data will be removed."
          confirmLabel="Delete Permanently"
          danger
          onConfirm={confirmPermanentDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
