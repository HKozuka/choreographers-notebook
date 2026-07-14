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
      {/* Background atmosphere — decorative, inert */}
      <div className={styles.bgGlow} aria-hidden="true" />
      <svg
        className={styles.bgLines}
        aria-hidden="true"
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <path d="M120,800 C170,620 110,540 240,430 C350,340 300,220 380,60" />
        <path d="M680,800 C630,610 700,520 560,420 C460,340 500,200 420,40" />
        <path d="M240,430 C200,470 140,470 90,520" />
        <path d="M560,420 C605,455 660,455 715,500" />
      </svg>

      <div className={styles.inner}>
        <p className={`${styles.tagline} ${styles.enterTagline}`}>
          Where inspiration becomes movement
        </p>

        <button
          className={`btn-primary ${styles.seedsBtn} ${styles.enterButton}`}
          onClick={() => navigate('/seeds')}
        >
          <svg
            className={styles.seedIcon}
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path d="M2 12C2 6 6 2 12 2C12 8 8 12 2 12Z" fill="currentColor" fillOpacity="0.92" />
            <path d="M3 11C3.5 7.5 7.5 3.5 11 3" stroke="#2D4A3E" strokeWidth="0.6" strokeLinecap="round" opacity="0.5" />
          </svg>
          Seeds of Movement
        </button>
        <p className={`${styles.seedsHint} ${styles.enterHint}`}>AI-assisted movement ideation</p>
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
