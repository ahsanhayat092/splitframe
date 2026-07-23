import { useRef } from 'react'
import { Link } from 'react-router'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function FaqCta() {
  const ref = useRef<HTMLElement>(null)
  // Scroll-scrubbed glow: fades in as the band travels through the viewport
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  })
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [0, 1])
  const ctaY = useTransform(scrollYProgress, [0, 1], [32, 0])
  const ctaOpacity = useTransform(scrollYProgress, [0, 0.6], [0, 1])

  return (
    <section ref={ref} className="relative overflow-hidden py-24 md:py-32">
      {/* Dual-glow ambient background, scrubbed by scroll progress */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ opacity: glowOpacity }} aria-hidden="true">
        <div
          className="animate-ambient-drift absolute -inset-[15%]"
          style={{
            background:
              'radial-gradient(55% 55% at 86% 18%, rgba(76,201,240,.14), transparent 70%), radial-gradient(55% 55% at 14% 84%, rgba(184,240,74,.12), transparent 70%)',
          }}
        />
      </motion.div>

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-4xl"
        >
          Still curious? Just try it — nothing leaves your machine.
        </motion.h2>

        <motion.div style={{ y: ctaY, opacity: ctaOpacity }} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/editor"
            className="group inline-flex items-center gap-2.5 rounded-full bg-after px-10 py-5 text-base font-semibold text-after-ink transition-all duration-150 hover:-translate-y-[2px] hover:shadow-glow-after active:scale-[0.97]"
          >
            Open the Editor
            <ArrowRight className="h-5 w-5 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
          <Link
            to="/guide"
            className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-transparent px-8 py-5 text-base font-semibold text-ink transition-all duration-150 hover:-translate-y-[2px] hover:border-ink-3 hover:bg-surface-2 active:scale-[0.97]"
          >
            Read the guide
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
