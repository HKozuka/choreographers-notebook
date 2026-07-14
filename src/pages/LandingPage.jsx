import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './LandingPage.module.css'

const MELT_DURATION = 150
const TAGLINE = 'Where inspiration becomes movement'
const CHAR_START_DELAY = 1.3
const CHAR_STEP = 0.022

export default function LandingPage() {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const linePathRefs = useRef([])

  // Draw the root/branch line-art in from scratch, matching each path's
  // actual length so the reveal reads as an even, continuous line rather
  // than a fixed-length dash that reveals unevenly across paths.
  useEffect(() => {
    linePathRefs.current.forEach(path => {
      if (!path) return
      const length = path.getTotalLength()
      path.style.strokeDasharray = `${length}`
      path.style.strokeDashoffset = `${length}`
    })
  }, [])

  function enter() {
    if (leaving) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      navigate('/home')
      return
    }

    if (typeof document.startViewTransition === 'function') {
      navigate('/home', { viewTransition: true })
      return
    }

    // Fallback for browsers without the View Transitions API.
    setLeaving(true)
    setTimeout(() => navigate('/home'), MELT_DURATION)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      enter()
    }
  }

  let charIndex = 0
  const words = TAGLINE.split(' ')

  return (
    <div
      className={`${styles.landing} ${leaving ? styles.leaving : ''}`}
      onClick={enter}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Enter Choreographer's Notebook"
    >
      <div className={styles.vignette} aria-hidden="true" />

      <svg
        className={styles.bgLines}
        aria-hidden="true"
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {[
          'M120,800 C170,620 110,540 240,430 C350,340 300,220 380,60',
          'M680,800 C630,610 700,520 560,420 C460,340 500,200 420,40',
          'M240,430 C200,470 140,470 90,520',
          'M560,420 C605,455 660,455 715,500',
        ].map((d, i) => (
          <path
            key={d}
            ref={el => { linePathRefs.current[i] = el }}
            d={d}
            className={styles.linePath}
            style={{ animationDelay: `${0.2 + i * 0.3}s` }}
          />
        ))}
        <circle className={styles.seedPod} cx="380" cy="60" r="3" style={{ animationDelay: '2.4s, 3s' }} />
        <circle className={styles.seedPod} cx="420" cy="40" r="3" style={{ animationDelay: '2.7s, 3.3s' }} />
      </svg>

      <h1 className={styles.tagline}>
        {words.map((word, wi) => (
          <span key={`sp-${wi}`}>
            {wi > 0 && ' '}
            <span className={styles.wordNoBreak}>
              {[...word].map((ch, ci) => {
                const delay = CHAR_START_DELAY + charIndex * CHAR_STEP
                charIndex += 1
                return (
                  <span
                    key={ci}
                    className={styles.char}
                    style={{ animationDelay: `${delay}s` }}
                  >
                    {ch}
                  </span>
                )
              })}
            </span>
          </span>
        ))}
      </h1>

      <span className={styles.enterHint} aria-hidden="true">⌄</span>
    </div>
  )
}
