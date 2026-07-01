import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateText } from '../services/watsonx'
import {
  STORY_MODE_PROMPT,
  ABSTRACT_MODE_PROMPT,
  VOCABULARY_EXPANDER_PROMPT,
} from '../data/systemPrompts'
import { loadActiveProjects } from '../utils/projects'
import CameraModal from '../components/CameraModal'
import styles from './SeedsPage.module.css'

const MODES = [
  {
    key: 'story',
    label: 'Story Mode',
    description: 'Narrative scores, event scores, and poetic directives for improvisation.',
    prompt: STORY_MODE_PROMPT,
  },
  {
    key: 'abstract',
    label: 'Abstract Mode',
    description: 'Precise kinesthetic cues and constraints grounded in LMA, Forsythe, and Viewpoints.',
    prompt: ABSTRACT_MODE_PROMPT,
  },
  {
    key: 'vocabulary',
    label: 'Movement Vocabulary Expander',
    description: 'Targeted exercises to move beyond habitual patterns, drawn from somatic theory.',
    prompt: VOCABULARY_EXPANDER_PROMPT,
  },
]

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

export default function SeedsPage() {
  const navigate = useNavigate()
  const [activeMode, setActiveMode] = useState('story')
  const [userInput, setUserInput] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)

  // Project context state
  const [contextOpen, setContextOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(null)

  const projects = useMemo(() => loadActiveProjects(), [])

  const currentMode = MODES.find(m => m.key === activeMode)
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null

  // Check if selected project has any text notes
  const selectedNotesText = selectedProject ? getProjectNotesText(selectedProject.id) : ''
  const hasNoNotes = selectedProject && !selectedNotesText

  function handleProjectToggle(projectId) {
    setSelectedProjectId(prev => (prev === projectId ? null : projectId))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const input = userInput.trim()
    if (!input) return

    setLoading(true)
    setError('')
    setResponse('')

    try {
      const contextBlock = selectedProject ? buildContextBlock(selectedProject) : null
      const result = await generateText(currentMode.prompt, input, contextBlock)
      setResponse(result)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      {cameraOpen && (
        <CameraModal
          onClose={() => setCameraOpen(false)}
          onSave={() => setCameraOpen(false)}
        />
      )}

      <nav className={styles.nav}>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          ← Notebook
        </button>
      </nav>

      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Seeds of Movement</h1>
          <button
            className="btn-secondary"
            onClick={() => setCameraOpen(true)}
            aria-label="Record a movement clip"
            title="Record a clip"
          >
            ⏺ Record
          </button>
        </div>
        <p className={styles.subtitle}>
          An AI ideation workspace for movement scores, cues, and vocabulary expansion.
        </p>
      </header>

      {/* Mode selector */}
      <div className={styles.modeSelector} role="tablist" aria-label="Select a mode">
        {MODES.map(mode => (
          <button
            key={mode.key}
            role="tab"
            aria-selected={activeMode === mode.key}
            className={`${styles.modeTab} ${activeMode === mode.key ? styles.modeTabActive : ''}`}
            onClick={() => {
              setActiveMode(mode.key)
              setResponse('')
              setError('')
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <p className={styles.modeDescription}>{currentMode.description}</p>

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

      {/* Error */}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={styles.loading} aria-live="polite">
          <span className={styles.loadingDot} />
          <span className={styles.loadingDot} />
          <span className={styles.loadingDot} />
        </div>
      )}

      {/* Response */}
      {response && !loading && (
        <div className={styles.response}>
          <div className={styles.responseLabel}>Response</div>
          <div className={styles.responseText}>{response}</div>
        </div>
      )}
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
