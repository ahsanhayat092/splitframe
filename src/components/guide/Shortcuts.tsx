import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Shortcut = {
  keys: string[]
  description: string
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['Space'], description: 'Play / pause' },
  { keys: ['←', '→'], description: 'Step one frame' },
  { keys: ['U'], description: 'Upload media' },
  { keys: ['G'], description: 'Toggle safe-area guides' },
  { keys: ['E'], description: 'Open export' },
  { keys: ['?'], description: 'Shortcut help' },
]

/** Mechanical-key kbd chip — depresses 2px on hover like a keypress. */
function Kbd({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-line-strong border-b-2 bg-surface-3 px-2',
        'font-mono text-xs font-medium tracking-[0.02em] text-ink',
        'transition-transform duration-[120ms] hover:translate-y-[2px] hover:border-b',
        wide && 'px-3',
      )}
    >
      {label}
    </kbd>
  )
}

export default function Shortcuts() {
  return (
    <section className="py-24">
      <div className="mx-auto w-full max-w-[720px] px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-4xl"
        >
          Editor shortcuts.
        </motion.h2>

        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ staggerChildren: 0.05 }}
          className="mt-12 overflow-hidden rounded-xl border border-line bg-surface-1"
        >
          {SHORTCUTS.map((shortcut, i) => (
            <motion.li
              key={shortcut.description}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
              }}
              className={cn(
                'flex items-center justify-between gap-6 px-5 py-4',
                i < SHORTCUTS.length - 1 && 'border-b border-line/60',
              )}
            >
              <span className="flex items-center gap-2">
                {shortcut.keys.map((key) => (
                  <Kbd key={key} label={key} wide={key.length > 1} />
                ))}
              </span>
              <span className="text-right text-sm text-ink-2">{shortcut.description}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
