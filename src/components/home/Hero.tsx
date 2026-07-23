import { useCallback, useRef } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { ArrowRight, ChevronsLeftRight } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

/** Map scroll progress 0->1 to divider position: 15% -> 85% -> back to 50%. */
const progressToPos = (p: number) =>
  p < 0.5 ? 15 + (p / 0.5) * 70 : 85 - ((p - 0.5) / 0.5) * 35

function WordMask({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <span className={`hero-word inline-block ${className ?? ''}`}>{children}</span>
    </span>
  )
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const afterRef = useRef<HTMLImageElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const setDivider = useCallback((pct: number) => {
    const clamped = Math.min(97, Math.max(3, pct))
    if (afterRef.current) {
      afterRef.current.style.clipPath = `inset(0 0 0 ${clamped}%)`
    }
    if (dividerRef.current) {
      dividerRef.current.style.left = `${clamped}%`
    }
  }, [])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Load-in timeline
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
        tl.from('.hero-eyebrow', { opacity: 0, duration: 0.2 })
          .from('.hero-word', { yPercent: 100, duration: 0.7, stagger: 0.09 }, 0.05)
          .from('.hero-underline', { scaleX: 0, duration: 0.6, ease: 'power3.out' }, 0.75)
          .from('.hero-rise', { opacity: 0, y: 24, duration: 0.6, stagger: 0.12 }, 0.35)
          .from('.hero-demo', { opacity: 0, scale: 0.94, duration: 0.8 }, 0.5)

        // Pinned scroll storytelling: divider wipe + headline split
        const scrollTl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: '+=180%',
            scrub: 0.5,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              if (!draggingRef.current) setDivider(progressToPos(self.progress))
            },
          },
        })
        scrollTl
          .to('.hero-word-before', { x: -24, ease: 'none' }, 0)
          .to('.hero-word-after', { x: 24, ease: 'none' }, 0)
          .to('.hero-subhead', { opacity: 0.2, ease: 'none' }, 0)
      })
    },
    { scope: sectionRef },
  )

  // Fully functional pointer drag on the comparison divider
  const moveToClientX = (clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    setDivider(((clientX - rect.left) / rect.width) * 100)
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    moveToClientX(e.clientX)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    moveToClientX(e.clientX)
  }
  const endDrag = () => {
    draggingRef.current = false
  }

  const scrollToWorkflow = () => {
    document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      ref={sectionRef}
      className="relative -mt-16 flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-surface-0 px-6 py-24"
    >
      {/* Ambient dual-glow drift (static fallback baked into the gradient) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="animate-ambient-drift absolute -inset-[15%]"
          style={{
            background:
              'radial-gradient(55% 55% at 14% 18%, rgba(76,201,240,.14), transparent 70%), radial-gradient(55% 55% at 86% 84%, rgba(184,240,74,.12), transparent 70%)',
          }}
        />
      </div>

      <div className="relative flex w-full max-w-[1200px] flex-col items-center text-center">
        {/* Eyebrow chip */}
        <div className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 font-mono text-xs tracking-wider text-ink-2">
          <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-after" />
          100% CLIENT-SIDE · NO UPLOAD · NO LOGIN
        </div>

        {/* Headline */}
        <h1 className="mt-6 font-display text-[2.75rem] font-bold leading-[1.02] tracking-[-0.03em] md:text-[4.5rem]">
          <WordMask className="hero-word-before text-ink">Before.</WordMask>{' '}
          <WordMask className="hero-word-after text-after">
            <span className="relative inline-block">
              After.
              <span
                className="hero-underline absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full md:-bottom-2"
                style={{ background: 'linear-gradient(90deg, #4CC9F0, #B8F04A)' }}
              />
            </span>
          </WordMask>{' '}
          <WordMask className="text-ink">One video.</WordMask>
        </h1>

        {/* Subhead */}
        <p className="hero-rise hero-subhead mt-6 max-w-[560px] text-base leading-relaxed text-ink-2">
          Drop in any mix of clips and photos, add captions and your logo, pick a
          split — SplitFrame renders a share-ready comparison video right in your
          browser.
        </p>

        {/* CTA row */}
        <div className="hero-rise mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/editor"
            className="group flex items-center gap-2 rounded-full bg-after px-7 py-3 text-sm font-semibold text-after-ink transition-all duration-150 hover:-translate-y-[2px] hover:shadow-glow-after active:scale-[0.97]"
          >
            Open the Editor
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
          <button
            type="button"
            onClick={scrollToWorkflow}
            className="rounded-full border border-line-strong px-7 py-3 text-sm font-semibold text-ink transition-all duration-150 hover:-translate-y-[2px] hover:bg-surface-2 active:scale-[0.97]"
          >
            See how it works
          </button>
        </div>

        {/* Interactive before/after slider demo */}
        <div className="hero-demo mt-10 w-full max-w-[820px]">
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="group/slider relative aspect-[16/10] w-full cursor-grab touch-none select-none overflow-hidden rounded-xl border border-line bg-surface-1 active:cursor-grabbing"
            role="slider"
            aria-label="Before and after comparison slider"
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const current = parseFloat(dividerRef.current?.style.left ?? '50')
                setDivider(current + (e.key === 'ArrowRight' ? 3 : -3))
              }
            }}
          >
            <img
              src="/hero-before.jpg"
              alt="Raw, ungraded footage of a skateboarder at dusk"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            <img
              ref={afterRef}
              src="/hero-after.jpg"
              alt="Color-graded version of the same footage"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={{ clipPath: 'inset(0 0 0 50%)' }}
            />

            {/* Divider line + handle */}
            <div
              ref={dividerRef}
              className="pointer-events-none absolute bottom-0 top-0 flex w-10 -translate-x-1/2 items-center justify-center"
              style={{ left: '50%' }}
            >
              <div className="absolute bottom-0 top-0 w-[2px] bg-ink/80 transition-shadow duration-200 group-hover/slider:shadow-[-5px_0_14px_rgba(76,201,240,.45),5px_0_14px_rgba(184,240,74,.45)]" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface-0/90 shadow-glow-after-sm backdrop-blur transition-transform duration-200 group-hover/slider:scale-[1.15]">
                <ChevronsLeftRight className="h-5 w-5 text-ink" />
              </div>
            </div>

            {/* Badges + timecode */}
            <span className="pointer-events-none absolute left-4 top-4 rounded-full border border-before/60 bg-before-dim px-3 py-1 font-mono text-xs font-medium tracking-wider text-before backdrop-blur-sm">
              BEFORE
            </span>
            <span className="pointer-events-none absolute right-4 top-4 rounded-full border border-after/60 bg-after-dim px-3 py-1 font-mono text-xs font-medium tracking-wider text-after backdrop-blur-sm">
              AFTER
            </span>
            <span className="pointer-events-none absolute bottom-4 right-4 rounded-md bg-surface-0/70 px-2.5 py-1 font-mono text-xs text-ink-2 backdrop-blur">
              00:04 · 1080p
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
