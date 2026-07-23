import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/guide', label: 'Guide' },
  { to: '/faq', label: 'FAQ' },
]

function LogoMark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 512 512"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M256 96 L160 96 A64 64 0 0 0 96 160 L96 352 A64 64 0 0 0 160 416 L256 416 Z"
        fill="none"
        stroke="#4CC9F0"
        strokeWidth="32"
        strokeLinejoin="round"
      />
      <path
        d="M256 96 L352 96 A64 64 0 0 1 416 160 L416 352 A64 64 0 0 1 352 416 L256 416 Z"
        fill="#B8F04A"
        className="transition-transform duration-200 group-hover:translate-x-[2px]"
      />
    </svg>
  )
}

export default function Navbar() {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer on route change
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-line bg-surface-0/80 backdrop-blur-md">
      <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2" aria-label="SplitFrame home">
          <LogoMark />
          <span className="font-display text-lg font-bold tracking-tight">
            <span className="text-ink">Split</span>
            <span className="text-after">Frame</span>
          </span>
        </Link>

        {/* Center links (desktop) */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((link) => {
            const active = location.pathname === link.to
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={cn(
                  'relative py-1 text-sm transition-colors',
                  active ? 'text-ink' : 'text-ink-2 hover:text-ink',
                )}
              >
                {link.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-0 -bottom-[2px] h-[2px] bg-after"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="hidden items-center gap-4 md:flex">
          <span className="rounded-full border border-line px-3 py-1 font-mono text-xs tracking-wide text-ink-3">
            v1.0 · client-side
          </span>
          <Link
            to="/editor"
            className="group flex items-center gap-1.5 rounded-full bg-after px-5 py-2 text-sm font-semibold text-after-ink transition-all duration-150 hover:-translate-y-[2px] hover:shadow-glow-after active:scale-[0.97]"
          >
            Open Editor
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile full-screen drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-surface-0/[0.98] md:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-6">
              <span className="font-display text-lg font-bold tracking-tight">
                <span className="text-ink">Split</span>
                <span className="text-after">Frame</span>
              </span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col justify-center gap-2 px-8" aria-label="Mobile">
              {[...LINKS, { to: '/editor', label: 'Editor' }].map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.3 }}
                >
                  <NavLink
                    to={link.to}
                    className={cn(
                      'block py-3 font-display text-4xl font-semibold tracking-tight transition-colors',
                      location.pathname === link.to ? 'text-after' : 'text-ink hover:text-after',
                    )}
                  >
                    {link.label}
                  </NavLink>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * 4, duration: 0.3 }}
                className="mt-6"
              >
                <span className="font-mono text-xs tracking-wide text-ink-3">
                  v1.0 · client-side · nothing leaves your device
                </span>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
