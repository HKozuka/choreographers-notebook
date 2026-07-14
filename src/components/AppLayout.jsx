import { useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { loadActiveProjects, loadProjectImages } from '../utils/projects'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeTimer = useRef(null)
  // Snapshot of menuOpen taken at touchstart, before touch devices fire a
  // synthetic mouseenter (which would otherwise flip menuOpen to true right
  // before the click handler runs, making the "first tap" check always see
  // it as already open).
  const wasOpenAtTouchStart = useRef(null)

  function openMenu() {
    clearTimeout(closeTimer.current)
    setMenuOpen(true)
  }

  function scheduleClose() {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMenuOpen(false), 150)
  }

  function handleProjectsTouchStart() {
    wasOpenAtTouchStart.current = menuOpen
  }

  function handleProjectsClick(e) {
    const isTouch = window.matchMedia('(hover: none)').matches
    const alreadyOpen = wasOpenAtTouchStart.current ?? menuOpen
    wasOpenAtTouchStart.current = null

    // On touch devices the first tap should reveal the menu instead of
    // immediately navigating, since there's no hover state to preview it.
    if (isTouch && !alreadyOpen) {
      e.preventDefault()
      setMenuOpen(true)
      return
    }
    setMenuOpen(false)
    navigate('/projects')
  }

  const projects = menuOpen ? loadActiveProjects() : []
  const images = menuOpen ? loadProjectImages() : {}

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button
          className={styles.brand}
          onClick={() => navigate('/home')}
        >
          Choreographer's Notebook
        </button>

        <nav className={styles.tabs} aria-label="Primary">
          <div
            className={styles.projectsTabWrap}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            <NavLink
              to="/projects"
              className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
              onTouchStart={handleProjectsTouchStart}
              onClick={handleProjectsClick}
              onFocus={openMenu}
              onBlur={scheduleClose}
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              Projects
            </NavLink>

            {menuOpen && (
              <div
                className={styles.projectsMenu}
                onMouseEnter={openMenu}
                onMouseLeave={scheduleClose}
              >
                {projects.length === 0 ? (
                  <p className={styles.projectsMenuEmpty}>No projects yet</p>
                ) : (
                  <ul className={styles.projectsMenuList}>
                    {projects.map(project => {
                      const image = images[project.id] || null
                      const monogram = project.name.charAt(0).toUpperCase()
                      return (
                        <li key={project.id}>
                          <button
                            className={styles.projectsMenuItem}
                            onClick={() => {
                              setMenuOpen(false)
                              navigate(`/project/${project.id}`)
                            }}
                          >
                            <span className={styles.projectsMenuThumb}>
                              {image ? (
                                <img src={image} alt="" className={styles.projectsMenuThumbImg} />
                              ) : (
                                <span className={styles.projectsMenuThumbMonogram}>{monogram}</span>
                              )}
                            </span>
                            <span className={styles.projectsMenuName}>{project.name}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          <NavLink
            to="/seeds"
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
          >
            Seeds of Movement
          </NavLink>
        </nav>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
