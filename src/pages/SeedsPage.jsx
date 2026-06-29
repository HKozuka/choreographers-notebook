import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateText } from '../services/watsonx'
import {
  STORY_MODE_PROMPT,
  ABSTRACT_MODE_PROMPT,
  VOCABULARY_EXPANDER_PROMPT,
} from '../data/systemPrompts'
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

export default function SeedsPage() {
  const navigate = useNavigate()
  const [activeMode, setActiveMode] = useState('story')
  const [userInput, setUserInput] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentMode = MODES.find(m => m.key === activeMode)

  async function handleSubmit(e) {
    e.preventDefault()
    const input = userInput.trim()
    if (!input) return

    setLoading(true)
    setError('')
    setResponse('')

    try {
      const result = await generateText(currentMode.prompt, input)
      setResponse(result)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <nav className={styles.nav}>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          ← Notebook
        </button>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Seeds of Movement</h1>
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
