import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const WORDS: { text: string; accent?: boolean }[] = [
  { text: 'Your' },
  { text: 'next' },
  { text: 'before/after' },
  { text: 'is' },
  { text: 'one' },
  { text: 'drag' },
  { text: 'away.', accent: true },
]

export default function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-surface-0 py-24 md:py-32">
      {/* Mirrored dual-glow ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="animate-ambient-drift absolute -inset-[15%]"
          style={{
            background:
              'radial-gradient(55% 55% at 86% 18%, rgba(76,201,240,.14), transparent 70%), radial-gradient(55% 55% at 14% 84%, rgba(184,240,74,.12), transparent 70%)',
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 text-center">
        <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] md:text-[3.25rem]">
          {WORDS.map((word, i) => (
            <motion.span
              key={word.text}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-22% 0px' }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className={`inline-block ${word.accent ? 'text-after' : 'text-ink'}`}
            >
              {word.text}
              {i < WORDS.length - 1 ? ' ' : ''}
            </motion.span>
          ))}
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-22% 0px' }}
          transition={{ duration: 0.55, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10"
        >
          <Link
            to="/editor"
            className="animate-glow-pulse group inline-flex items-center gap-2.5 rounded-full bg-after px-10 py-5 text-base font-semibold text-after-ink transition-transform duration-150 hover:-translate-y-[2px] active:scale-[0.97]"
          >
            Launch SplitFrame — it's free
            <ArrowRight className="h-5 w-5 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
          <p className="mt-5 font-mono text-xs tracking-wider text-ink-3">
            no account · no watermark · no upload
          </p>
        </motion.div>
      </div>
    </section>
  )
}
