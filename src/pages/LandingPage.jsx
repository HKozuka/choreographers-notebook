import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  const navigate = useNavigate()

  function enter() {
    navigate('/home')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      enter()
    }
  }

  return (
    <div
      className={styles.landing}
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
