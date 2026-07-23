import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const STEPS = [
  { num: '01', title: 'Drop both sides', copy: 'video or image, any mix.' },
  { num: '02', title: 'Caption & brand', copy: 'header, footer, logo.' },
  { num: '03', title: 'Pick a split', copy: 'side-by-side, stacked, slider.' },
  { num: '04', title: 'Export the video', copy: 'MP4 or WebM, up to 1080p.' },
]

/** Progress thresholds at which each step activates. */
const THRESHOLDS = [0.1, 0.38, 0.66, 0.94]

export default function WorkflowStrip() {
  const sectionRef = useRef<HTMLElement>(null)
  const [activeCount, setActiveCount] = useState(0)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 78%', 'end 45%'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setActiveCount(THRESHOLDS.filter((t) => p >= t).length)
  })

  return (
    <section
      id="workflow"
      ref={sectionRef}
      className="border-y border-line bg-surface-1 py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-22% 0px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-after">Workflow</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] text-ink md:text-[3.25rem]">
            Four drags to done.
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative mt-16">
          {/* Hairline track + scroll-driven lime fill */}
          <div className="absolute left-0 right-0 top-5 hidden h-px bg-line md:block" aria-hidden="true">
            <motion.div
              className="h-full origin-left bg-after shadow-glow-after-sm"
              style={{ scaleX: scrollYProgress }}
            />
          </div>

          <div className="grid gap-10 md:grid-cols-4 md:gap-6">
            {STEPS.map((step, i) => {
              const active = i < activeCount
              return (
                <div key={step.num} className="relative">
                  <motion.span
                    animate={
                      active
                        ? { scale: [1, 1.2, 1], color: '#B8F04A' }
                        : { scale: 1, color: '#6B7280' }
                    }
                    transition={{ duration: 0.3 }}
                    className="relative z-10 inline-block bg-surface-1 pr-4 font-mono text-2xl font-bold tracking-tight"
                  >
                    {step.num}
                  </motion.span>
                  <h3 className="mt-3 font-display text-[1.375rem] font-semibold leading-[1.25] tracking-[-0.01em] text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{step.copy}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/guide"
            className="group inline-flex items-center gap-2 rounded-full border border-line-strong px-7 py-3 text-sm font-semibold text-ink transition-all duration-150 hover:-translate-y-[2px] hover:bg-surface-2 active:scale-[0.97]"
          >
            Read the full guide
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
