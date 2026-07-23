import { motion } from 'framer-motion'
import { FileWarning, RotateCcw, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Card = {
  icon: LucideIcon
  title: string
  body: string
}

const CARDS: Card[] = [
  {
    icon: FileWarning,
    title: '"This codec isn\'t supported"',
    body: "Some MOV/HEVC files won't decode in-browser. Re-export as H.264 MP4 or drop the file into any converter first.",
  },
  {
    icon: Timer,
    title: 'Slow renders',
    body: 'Close other tabs, drop to 720p, or switch to WebM. Renders use every core your browser allows.',
  },
  {
    icon: RotateCcw,
    title: 'Out-of-sync playback',
    body: 'Hit restart (SkipBack) once — both sides always lock to the same playhead from 0.',
  },
]

export default function Troubleshooting() {
  return (
    <section className="py-24">
      <div className="mx-auto w-full max-w-[1000px] px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-4xl"
        >
          If something feels off.
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ staggerChildren: 0.1 }}
          className="mt-12 grid gap-6 md:grid-cols-3"
        >
          {CARDS.map((card) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.title}
                variants={{
                  hidden: { opacity: 0, y: 40 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
                }}
                whileHover={{ y: -6 }}
                className="group rounded-xl border border-line bg-surface-1 p-6 transition-colors duration-200 hover:border-line-strong"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-line-strong bg-surface-2 transition-shadow duration-200 group-hover:shadow-glow-after-sm">
                  <Icon className="h-5 w-5 text-after" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-[1.375rem] font-semibold leading-[1.25] tracking-[-0.01em] text-ink">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{card.body}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
