import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router'
import { motion } from 'framer-motion'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

gsap.registerPlugin(ScrollTrigger)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Shared shell: fixed navbar (h-16) + page content + footer.
 * The content slot owns the h-16 top offset (pt-16) so every page starts
 * below the fixed nav — full-bleed heroes opt out inside the page (-mt-16).
 * Lenis smooth scroll is enabled on marketing pages only; the editor route
 * keeps native scrolling for precision (design.md §4).
 */
export default function Layout() {
  const location = useLocation()
  const outlet = useOutlet()
  const isEditor = location.pathname.startsWith('/editor')

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  // Lenis smooth scrolling — marketing pages only
  useEffect(() => {
    if (isEditor || prefersReducedMotion()) return
    const lenis = new Lenis({ lerp: 0.1 })
    lenis.on('scroll', ScrollTrigger.update)
    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [isEditor])

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-0">
      <Navbar />
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 pt-16"
      >
        {outlet}
      </motion.main>
      {!isEditor && <Footer />}
    </div>
  )
}
