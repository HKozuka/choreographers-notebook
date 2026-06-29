import { useRef, useState, useEffect } from 'react'
import styles from './CameraModal.module.css'

/**
 * CameraModal
 * Props:
 *   onClose()            — called when user dismisses without saving
 *   onSave(blob, name)   — called with the recorded Blob and a suggested filename
 */
export default function CameraModal({ onClose, onSave }) {
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  const [phase, setPhase] = useState('preview') // 'preview' | 'recording' | 'review' | 'unsupported' | 'denied'
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordedUrl, setRecordedUrl] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  // Check browser support
  const isSupported =
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'

  useEffect(() => {
    if (!isSupported) {
      setPhase('unsupported')
      return
    }
    startPreview()
    return () => stopAll()
  }, [])

  async function startPreview() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setPhase('preview')
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPhase('denied')
      } else {
        setPhase('unsupported')
      }
    }
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setRecordedBlob(blob)
      setRecordedUrl(url)
      setPhase('review')
    }
    recorder.start(100)
    mediaRecorderRef.current = recorder
    setPhase('recording')
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    // Keep stream alive for potential re-record
  }

  function stopAll() {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
  }

  async function handleSave() {
    if (!recordedBlob) return
    const filename = `clip-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`

    // Try File System Access API (Chrome/Edge)
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'WebM Video', accept: { 'video/webm': ['.webm'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(recordedBlob)
        await writable.close()
        if (onSave) onSave(recordedBlob, filename)
        handleClose()
        return
      } catch (err) {
        if (err.name === 'AbortError') return // user cancelled picker
        // Fall through to download fallback
      }
    }

    // Fallback: trigger browser download
    const a = document.createElement('a')
    a.href = recordedUrl
    a.download = filename
    a.click()
    if (onSave) onSave(recordedBlob, filename)
    handleClose()
  }

  function handleReRecord() {
    URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl('')
    setElapsed(0)
    startPreview()
  }

  function handleClose() {
    stopAll()
    onClose()
  }

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Record a clip">
      <div className={styles.panel}>
        <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">✕</button>

        <h2 className={styles.heading}>Record a Clip</h2>

        {/* Unsupported */}
        {(phase === 'unsupported') && (
          <p className={styles.notice}>
            Camera recording is not supported in this browser. Please use Chrome or Edge.
          </p>
        )}

        {/* Permission denied */}
        {phase === 'denied' && (
          <p className={styles.notice}>
            Camera access was denied. Please allow camera and microphone access in your browser settings and try again.
          </p>
        )}

        {/* Preview / Recording */}
        {(phase === 'preview' || phase === 'recording') && (
          <>
            <video
              ref={videoRef}
              className={styles.video}
              muted
              playsInline
            />
            {phase === 'recording' && (
              <div className={styles.timer} aria-live="polite">
                <span className={styles.recDot} />
                {formatTime(elapsed)}
              </div>
            )}
            <div className={styles.controls}>
              {phase === 'preview' && (
                <button className="btn-primary" onClick={startRecording}>
                  Start Recording
                </button>
              )}
              {phase === 'recording' && (
                <button className="btn-primary" onClick={stopRecording}>
                  Stop Recording
                </button>
              )}
            </div>
          </>
        )}

        {/* Review */}
        {phase === 'review' && (
          <>
            <video
              src={recordedUrl}
              className={styles.video}
              controls
              playsInline
            />
            <div className={styles.controls}>
              <button className="btn-primary" onClick={handleSave}>
                Save Clip
              </button>
              <button className="btn-secondary" onClick={handleReRecord}>
                Re-record
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
