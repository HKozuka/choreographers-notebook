import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

const MELT_DURATION = 150

export default function LandingPage() {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  function enter() {
    if (leaving) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      navigate('/home')
      return
    }

    setLeaving(true)
    setTimeout(() => navigate('/home'), MELT_DURATION)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      enter()
    }
  }

  return (
    <div
      className={`${styles.landing} ${leaving ? styles.leaving : ''}`}
      onClick={enter}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Enter Choreographer's Notebook"
    >
      <h1 className={styles.tagline}>Where inspiration becomes movement</h1>
      <span className={styles.enterHint}>Tap anywhere to enter</span>
    </div>
  )
}
