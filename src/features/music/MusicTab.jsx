import { useState, useEffect, useCallback, useRef } from 'react'
import { saveHandle, loadHandle } from '../../utils/folderAccess'
import styles from './MusicTab.module.css'

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.aac', '.flac', '.m4a', '.webm', '.ogg'])

function getExt(name) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

async function verifyPermission(handle, mode = 'read') {
  const opts = { mode }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  if ((await handle.requestPermission(opts)) === 'granted') return true
  return false
}

export default function MusicTab({ projectId }) {
  const handleKey = `music_folder_handle_${projectId}`

  const [isSupported] = useState(() => typeof window.showDirectoryPicker === 'function')
  const [dirHandle, setDirHandle] = useState(null)
  const [files, setFiles] = useState([])           // [{ name, handle }]
  const [activeFile, setActiveFile] = useState(null) // { name, url }
  const [statusMsg, setStatusMsg] = useState('')

  // ── Audio recorder state
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordedUrl, setRecordedUrl] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  // ── On mount: restore persisted handle
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
    }).catch(() => {})
  }, [handleKey, isSupported])

  // ── Enumerate audio files whenever dirHandle changes
  useEffect(() => {
    if (!dirHandle) return
    enumerateFiles(dirHandle)
  }, [dirHandle])

  // ── Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeFile?.url) URL.revokeObjectURL(activeFile.url)
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
      stopStream()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function enumerateFiles(handle) {
    const found = []
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && AUDIO_EXTS.has(getExt(entry.name))) {
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
    // Re-verify permission inside the user-gesture context of the click.
    // requestPermission() called outside a user gesture (e.g. in a .then() on
    // mount) silently returns 'prompt', so getFile() throws NotAllowedError.
    if (dirHandle) {
      const ok = await verifyPermission(dirHandle)
      if (!ok) {
        setStatusMsg('Folder permission required — please click "Grant folder access" again.')
        setDirHandle(null)
        return
      }
    }
    try {
      if (activeFile?.url) URL.revokeObjectURL(activeFile.url)
      const file = await fileEntry.handle.getFile()
      const url = URL.createObjectURL(file)
      setActiveFile({ name: fileEntry.name, url })
    } catch (err) {
      console.error('[MusicTab] getFile() failed:', err.name, err.message)
      setStatusMsg(`Could not open "${fileEntry.name}" — ${err.message || 'permission error'}.`)
    }
  }

  function handleChangeFolder() {
    if (activeFile?.url) URL.revokeObjectURL(activeFile.url)
    setActiveFile(null)
    setFiles([])
    setDirHandle(null)
    handleGrantAccess()
  }

  // ── Audio recording ──────────────────────────────────────
  function stopStream() {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusMsg('Audio recording is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setRecordedBlob(blob)
        setRecordedUrl(url)
        stopStream()
      }

      recorder.start(100)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setElapsed(0)
      setRecordedBlob(null)
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
      setRecordedUrl('')
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatusMsg('Microphone access was denied. Allow it in browser settings and try again.')
      } else {
        setStatusMsg('Could not start recording.')
      }
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const handleSaveRecording = useCallback(async () => {
    if (!recordedBlob || !dirHandle) return
    const ok = await verifyPermission(dirHandle, 'readwrite')
    if (!ok) {
      setStatusMsg('Write permission required to save — please click "Grant folder access" again.')
      return
    }
    const filename = `audio-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`
    try {
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(recordedBlob)
      await writable.close()
      await enumerateFiles(dirHandle)
      setStatusMsg(`Saved "${filename}" to folder.`)
      setRecordedBlob(null)
      URL.revokeObjectURL(recordedUrl)
      setRecordedUrl('')
    } catch {
      setStatusMsg('Could not save recording to folder.')
    }
  }, [recordedBlob, dirHandle, recordedUrl])

  function discardRecording() {
    URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl('')
  }

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  return (
    <div className={styles.container}>
      {/* Browser limitation banner */}
      {!isSupported && (
        <div className={styles.browserWarning}>
          <strong>Folder access is not available in this browser.</strong>{' '}
          Music References requires Chrome or Edge on desktop.
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
                Grant this project access to a local folder to list, play, and save audio references.
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
                  {!isRecording && (
                    <button className="btn-primary" onClick={startRecording}>
                      Record audio
                    </button>
                  )}
                  {isRecording && (
                    <button className={`btn-primary ${styles.recordingBtn}`} onClick={stopRecording}>
                      <span className={styles.recDot} />
                      Stop — {formatTime(elapsed)}
                    </button>
                  )}
                </div>
              </div>

              {/* Recorded clip — review before saving */}
              {recordedBlob && (
                <div className={styles.reviewSection}>
                  <p className={styles.reviewLabel}>Review recording</p>
                  <audio
                    key={recordedUrl}
                    src={recordedUrl}
                    controls
                    className={styles.audioReview}
                  />
                  <div className={styles.reviewActions}>
                    <button className="btn-primary" onClick={handleSaveRecording}>
                      Save to folder
                    </button>
                    <button className="btn-secondary" onClick={discardRecording}>
                      Discard
                    </button>
                  </div>
                </div>
              )}

              {/* Active player */}
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
                  <audio
                    key={activeFile.url}
                    src={activeFile.url}
                    controls
                    className={styles.audioPlayer}
                  />
                </div>
              )}

              {/* File list */}
              {files.length === 0 ? (
                <p className={styles.emptyState}>
                  No audio files found in this folder. Record a clip or add files manually.
                </p>
              ) : (
                <ul className={styles.fileList} role="list">
                  {files.map(f => (
                    <li key={f.name} className={styles.fileItem}>
                      <button
                        className={`${styles.fileBtn} ${activeFile?.name === f.name ? styles.fileBtnActive : ''}`}
                        onClick={() => handleFileClick(f)}
                      >
                        <span className={styles.fileIcon}>♪</span>
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
    </div>
  )
}
