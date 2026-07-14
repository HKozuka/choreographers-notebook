import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './HomePage.module.css'

const WHEEL_THRESHOLD = 40
const SWIPE_THRESHOLD = 60

export default function HomePage() {
  const navigate = useNavigate()
  const touchStartY = useRef(null)

  useEffect(() => {
    function goToProjects() {
      navigate('/projects')
    }

    function handleWheel(e) {
      if (e.deltaY > WHEEL_THRESHOLD) goToProjects()
    }

    function handleTouchStart(e) {
      touchStartY.current = e.touches[0]?.clientY ?? null
    }

    function handleTouchEnd(e) {
      if (touchStartY.current == null) return
      const endY = e.changedTouches[0]?.clientY ?? touchStartY.current
      const swipedUp = touchStartY.current - endY
      if (swipedUp > SWIPE_THRESHOLD) goToProjects()
      touchStartY.current = null
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [navigate])

  return (
    <div className={styles.home}>
      <button className={styles.projectsToggle} onClick={() => navigate('/projects')}>
        Projects
      </button>

      <div className={styles.inner}>
        <p className={styles.tagline}>Where inspiration becomes movement</p>

        <button
          className={`btn-primary ${styles.seedsBtn}`}
          onClick={() => navigate('/seeds')}
        >
          Seeds of Movement
        </button>
        <p className={styles.seedsHint}>AI-assisted movement ideation</p>
      </div>

      <button
        className={styles.scrollHint}
        onClick={() => navigate('/projects')}
        aria-label="Go to projects"
      >
        ↓
      </button>
    </div>
  )
}
