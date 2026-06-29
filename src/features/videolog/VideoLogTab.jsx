import { useState, useEffect, useCallback } from 'react'
import CameraModal from '../../components/CameraModal'
import { saveHandle, loadHandle } from '../../utils/folderAccess'
import styles from './VideoLogTab.module.css'

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi'])

function getExt(name) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

/**
 * Verify (and if needed request) readwrite permission on a directory handle.
 * Returns true if permission is granted, false otherwise.
 */
async function verifyPermission(handle) {
  const opts = { mode: 'readwrite' }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  if ((await handle.requestPermission(opts)) === 'granted') return true
  return false
}

export default function VideoLogTab({ projectId }) {
  const handleKey = `video_folder_handle_${projectId}`

  const [isSupported] = useState(() => typeof window.showDirectoryPicker === 'function')
  const [dirHandle, setDirHandle] = useState(null)
  const [files, setFiles] = useState([])          // [{ name, handle }]
  const [activeFile, setActiveFile] = useState(null) // { name, url }
  const [showCamera, setShowCamera] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  // ── On mount: try to restore a persisted handle
  useEffect(() => {
    if (!isSupported) return
    loadHandle(handleKey).then(async (saved) => {
      if (!saved) return
      const ok = await verifyPermission(saved)
      if (ok) {
        setDirHandle(saved)
      } else {
        setStatusMsg('Folder permission expired — please re-grant access.')
      }
    }).catch(() => {/* silently ignore IDB errors */})
  }, [handleKey, isSupported])

  // ── Enumerate video files whenever dirHandle changes
  useEffect(() => {
    if (!dirHandle) return
    enumerateFiles(dirHandle)
  }, [dirHandle])

  async function enumerateFiles(handle) {
    const found = []
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && VIDEO_EXTS.has(getExt(entry.name))) {
        found.push({ name: entry.name, handle: entry })
      }
    }
    found.sort((a, b) => a.name.localeCompare(b.name))
    setFiles(found)
  }

  async function handleGrantAccess() {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      await saveHandle(handleKey, handle)
      setDirHandle(handle)
      setStatusMsg('')
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatusMsg('Could not open folder. Please try again.')
      }
    }
  }

  async function handleFileClick(fileEntry) {
    try {
      if (activeFile) URL.revokeObjectURL(activeFile.url)
      const file = await fileEntry.handle.getFile()
      const url = URL.createObjectURL(file)
      setActiveFile({ name: fileEntry.name, url })
    } catch {
      setStatusMsg('Could not open file for playback.')
    }
  }

  // Called by CameraModal with (blob, suggestedFilename)
  const handleCameraSave = useCallback(async (blob, filename) => {
    if (!dirHandle) return
    console.log('[VideoLogTab] Writing blob to folder, size:', blob.size, 'filename:', filename)
    try {
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      console.log('[VideoLogTab] File written successfully:', filename)
      // Refresh list
      await enumerateFiles(dirHandle)
      setStatusMsg(`Saved "${filename}" to folder.`)
    } catch (err) {
      console.error('[VideoLogTab] Folder write failed:', err)
      setStatusMsg('Could not save recording to folder.')
    }
  }, [dirHandle])

  function handleChangeFolder() {
    if (activeFile) {
      URL.revokeObjectURL(activeFile.url)
      setActiveFile(null)
    }
    setFiles([])
    setDirHandle(null)
    handleGrantAccess()
  }

  return (
    <div className={styles.container}>
      {/* Browser limitation banner */}
      {!isSupported && (
        <div className={styles.browserWarning}>
          <strong>Folder access is not available in this browser.</strong>{' '}
          Video Log requires Chrome or Edge on desktop.
          Folder picking and direct file saving are not supported in Firefox or Safari.
        </div>
      )}

      {/* Status message */}
      {statusMsg && (
        <p className={styles.statusMsg}>{statusMsg}</p>
      )}

      {isSupported && (
        <>
          {/* No folder granted yet */}
          {!dirHandle && (
            <div className={styles.grantSection}>
              <p className={styles.hint}>
                Grant this project access to a local folder to list, play, and save video clips.
              </p>
              <button className="btn-primary" onClick={handleGrantAccess}>
                Grant folder access
              </button>
            </div>
          )}

          {/* Folder granted */}
          {dirHandle && (
            <>
              {/* Header row */}
              <div className={styles.folderRow}>
                <span className={styles.folderName}>
                  📁 <strong>{dirHandle.name}</strong>
                </span>
                <div className={styles.folderActions}>
                  <button className="btn-secondary" onClick={() => enumerateFiles(dirHandle)}>
                    Refresh
                  </button>
                  <button className="btn-secondary" onClick={handleChangeFolder}>
                    Change folder
                  </button>
                  <button className="btn-primary" onClick={() => setShowCamera(true)}>
                    Record new clip
                  </button>
                </div>
              </div>

              {/* Video player */}
              {activeFile && (
                <div className={styles.playerSection}>
                  <div className={styles.playerHeader}>
                    <span className={styles.nowPlaying}>{activeFile.name}</span>
                    <button
                      className={styles.closePlayer}
                      onClick={() => {
                        URL.revokeObjectURL(activeFile.url)
                        setActiveFile(null)
                      }}
                      aria-label="Close player"
                    >
                      ✕
                    </button>
                  </div>
                  <video
                    key={activeFile.url}
                    src={activeFile.url}
                    controls
                    className={styles.videoPlayer}
                    playsInline
                  />
                </div>
              )}

              {/* File list */}
              {files.length === 0 ? (
                <p className={styles.emptyState}>
                  No video files found in this folder. Record a new clip or add files manually.
                </p>
              ) : (
                <ul className={styles.fileList} role="list">
                  {files.map(f => (
                    <li key={f.name} className={styles.fileItem}>
                      <button
                        className={`${styles.fileBtn} ${activeFile?.name === f.name ? styles.fileBtnActive : ''}`}
                        onClick={() => handleFileClick(f)}
                      >
                        <span className={styles.fileIcon}>▶</span>
                        <span className={styles.fileName}>{f.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}

      {/* Camera modal */}
      {showCamera && (
        <CameraModal
          onClose={() => setShowCamera(false)}
          onSave={handleCameraSave}
        />
      )}
    </div>
  )
}
