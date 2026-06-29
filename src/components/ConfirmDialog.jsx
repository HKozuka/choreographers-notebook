import styles from './ConfirmDialog.module.css'

/**
 * ConfirmDialog
 * Props:
 *   title         — heading text
 *   message       — body message
 *   confirmLabel  — label for the confirm button (default: "Confirm")
 *   onConfirm()   — called when user confirms
 *   onCancel()    — called when user cancels or dismisses
 *   danger        — if true, confirm button uses muted red style
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  danger = false,
}) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className={styles.panel}>
        <h2 className={styles.title} id="confirm-title">{title}</h2>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.actions}>
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={danger ? styles.dangerBtn : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
