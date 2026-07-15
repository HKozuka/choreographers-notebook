import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateText } from '../services/watsonx'
import { MODES } from '../data/seedsModes'
import { loadActiveProjects } from '../utils/projects'
import CameraModal from '../components/CameraModal'
import styles from './SeedsPage.module.css'

const NOTES_KEY_PREFIX = 'project_notes_'

/** Read all text pages from a project's notes, stripping HTML tags. */
function getProjectNotesText(projectId) {
  try {
    const raw = localStorage.getItem(`${NOTES_KEY_PREFIX}${projectId}`)
    if (!raw) return ''
    const data = JSON.parse(raw)
    if (!Array.isArray(data?.pages)) return ''
    return data.pages
      .map(p => (p.text || '').replace(/<[^>]+>/g, '').trim())
      .filter(Boolean)
      .join('\n\n')
  } catch {
    return ''
  }
}

/** Build the context block string injected ahead of the user prompt. */
function buildContextBlock(project) {
  const notes = getProjectNotesText(project.id)
  return `[Project Context: "${project.name}"]\nNotes:\n${notes || '(no text notes)'}`
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function SeedsPage() {
  const navigate = useNavigate()
  const [activeMode, setActiveMode] = useState('story')
  const [userInput, setUserInput] = useState('')
  // Chat log kept per mode, so switching tabs doesn't lose a conversation.
  const [messagesByMode, setMessagesByMode] = useState({ story: [], abstract: [], vocabulary: [] })
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const chatLogRef = useRef(null)
  const chatSectionRef = useRef(null)

  // Project context state
  const [contextOpen, setContextOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(null)

  // Onboarding callout pointing at the Record button. Reappears on every
  // load/refresh by design — dismissal only holds for the current page view.
  const [showRecordHint, setShowRecordHint] = useState(true)
  const recordHintRef = useRef(null)

  function dismissRecordHint() {
    setShowRecordHint(false)
  }

  // Dismiss on any click outside the callout
  useEffect(() => {
    if (!showRecordHint) return
    function handleClickOutside(e) {
      if (recordHintRef.current && !recordHintRef.current.contains(e.target)) {
        dismissRecordHint()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showRecordHint])

  const projects = useMemo(() => loadActiveProjects(), [])

  const currentMode = MODES.find(m => m.key === activeMode)
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null
  const messages = messagesByMode[activeMode]

  // Check if selected project has any text notes
  const selectedNotesText = selectedProject ? getProjectNotesText(selectedProject.id) : ''
  const hasNoNotes = selectedProject && !selectedNotesText

  function handleProjectToggle(projectId) {
    setSelectedProjectId(prev => (prev === projectId ? null : projectId))
  }

  function appendMessage(mode, message) {
    setMessagesByMode(prev => ({ ...prev, [mode]: [...prev[mode], message] }))
  }

  // Auto-scroll to the newest message whenever the active log grows
  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  /** Shared by the free-form textarea submit and the per-mode example chips. */
  async function runPrompt(modeKey, input) {
    if (loading) return
    const mode = MODES.find(m => m.key === modeKey)
    setActiveMode(modeKey)
    appendMessage(modeKey, { id: generateId(), role: 'user', text: input })
    setLoading(true)

    try {
      const contextBlock = selectedProject ? buildContextBlock(selectedProject) : null
      const result = await generateText(mode.prompt, input, contextBlock)
      appendMessage(modeKey, { id: generateId(), role: 'assistant', text: result })
    } catch (err) {
      appendMessage(modeKey, { id: generateId(), role: 'assistant', text: err.message || 'Something went wrong. Please try again.', isError: true })
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const input = userInput.trim()
    if (!input) return
    setUserInput('')
    runPrompt(activeMode, input)
  }

  function handleExampleClick(modeKey, example) {
    runPrompt(modeKey, example)
    chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={`page ${styles.pageWide}`}>
      {cameraOpen && (
        <CameraModal
          onClose={() => setCameraOpen(false)}
          onSave={() => setCameraOpen(false)}
        />
      )}

      <nav className={styles.nav}>
        <button className="btn-secondary" onClick={() => navigate('/home')}>
          ← Notebook
        </button>
      </nav>

      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Seeds of Movement</h1>
          <div className={styles.recordBtnWrap}>
            <button
              className="btn-secondary"
              onClick={() => setCameraOpen(true)}
              aria-label="Record a movement clip"
              title="Record a clip"
            >
              ⏺ Record
            </button>

            {showRecordHint && (
              <div className={styles.recordHint} ref={recordHintRef} role="note">
                <svg
                  className={styles.recordHintArrow}
                  width="20"
                  height="40"
                  viewBox="0 0 20 40"
                  aria-hidden="true"
                >
                  <path
                    d="M10 38 L10 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 12 L10 3 L16 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <button
                  className={styles.recordHintClose}
                  onClick={dismissRecordHint}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
                <p className={styles.recordHintText}>
                  Feeling something? Record it here to save the movement to your project.
                </p>
              </div>
            )}
          </div>
        </div>
        <p className={styles.subtitle}>
          An AI ideation workspace for movement scores, cues, and vocabulary expansion.
        </p>
      </header>

      {/* Mode cards — explain each mode and let users try it before committing */}
      <div className={styles.modeGrid}>
        {MODES.map(mode => (
          <div
            key={mode.key}
            className={`${styles.modeCard} ${activeMode === mode.key ? styles.modeCardActive : ''}`}
          >
            <div className={styles.modeCardHeader}>
              <span className={styles.modeCardName}>{mode.label}</span>
              {activeMode === mode.key && (
                <span className={styles.modeCardActiveBadge}>Active</span>
              )}
            </div>
            <p className={styles.modeCardBlurb}>{mode.blurb}</p>
            <p className={styles.modeCardTheory}>{mode.theory}</p>

            <span className={styles.examplesLabel}>Try an example</span>
            <div className={styles.chips}>
              {mode.examples.map(example => (
                <button
                  key={example}
                  className={styles.chip}
                  onClick={() => handleExampleClick(mode.key, example)}
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>

            <button
              className={styles.useModeBtn}
              onClick={() => setActiveMode(mode.key)}
            >
              Use this mode ↓
            </button>
          </div>
        ))}
      </div>

      <div ref={chatSectionRef}>
        {/* Project context selector */}
        <div className={styles.contextSection}>
          <button
            className={styles.contextToggleBtn}
            onClick={() => setContextOpen(o => !o)}
            aria-expanded={contextOpen}
          >
            <span className={styles.contextToggleIcon}>{contextOpen ? '▾' : '▸'}</span>
            Add Project Context
            {selectedProject && (
              <span className={styles.contextActivePill}>{selectedProject.name}</span>
            )}
          </button>

          {contextOpen && (
            <div className={styles.contextPanel}>
              {projects.length === 0 ? (
                <p className={styles.contextEmpty}>No projects yet.</p>
              ) : (
                <ul className={styles.contextList}>
                  {projects.map(project => {
                    const isSelected = selectedProjectId === project.id
                    const notesText = getProjectNotesText(project.id)
                    const empty = !notesText
                    return (
                      <li key={project.id} className={styles.contextItem}>
                        <label className={styles.contextLabel}>
                          <input
                            type="radio"
                            name="project-context"
                            className={styles.contextRadio}
                            checked={isSelected}
                            onChange={() => handleProjectToggle(project.id)}
                          />
                          <span className={styles.contextProjectName}>{project.name}</span>
                          {isSelected && empty && (
                            <span className={styles.contextNoNotes}>No text notes in this project</span>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
              {selectedProjectId && (
                <button
                  className={styles.contextClearBtn}
                  onClick={() => setSelectedProjectId(null)}
                >
                  Clear context
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active context label near the input */}
        {selectedProject && (
          <div className={styles.contextActiveLabel}>
            {hasNoNotes
              ? <>Context: <strong>{selectedProject.name}</strong> — <em>no text notes to use as context</em></>
              : <>Context active: <strong>{selectedProject.name}</strong></>
            }
          </div>
        )}

        {/* Chat log */}
        <div className={styles.chatLog} ref={chatLogRef}>
          {messages.length === 0 && !loading && (
            <p className={styles.chatEmpty}>Your conversation in {currentMode.label} will appear here.</p>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`${styles.chatMessage} ${msg.role === 'user' ? styles.chatMessageUser : styles.chatMessageAssistant} ${msg.isError ? styles.chatMessageError : ''}`}
            >
              <div className={styles.chatMessageLabel}>
                {msg.role === 'user' ? 'You' : msg.isError ? 'Error' : currentMode.label}
              </div>
              <div className={styles.chatMessageText}>{msg.text}</div>
            </div>
          ))}
          {loading && (
            <div className={styles.loading} aria-live="polite">
              <span className={styles.loadingDot} />
              <span className={styles.loadingDot} />
              <span className={styles.loadingDot} />
            </div>
          )}
        </div>

        {/* Prompt form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <textarea
            className={styles.textarea}
            rows={4}
            placeholder={getPlaceholder(activeMode)}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            disabled={loading}
          />
          <div className={styles.formFooter}>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !userInput.trim()}
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getPlaceholder(mode) {
  switch (mode) {
    case 'story':
      return 'e.g. "Give me a narrative score I will improvise to" or "Write an event score for a solo about transition"'
    case 'abstract':
      return 'e.g. "Give me abstract movement cues using diagonal pathways and sudden time" or "Generate a phrase structure built around weight and collapse"'
    case 'vocabulary':
      return 'e.g. "I always default to fluid, continuous movement. Help me find interruption and stillness."'
    default:
      return 'Enter your prompt…'
  }
}
