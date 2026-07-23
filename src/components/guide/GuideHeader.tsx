import { motion } from 'framer-motion'

const HEADLINE = 'From two files to one comparison — in four steps.'.split(' ')

/** Masked word-level slide-up reveal for the page headline. */
function WordReveal({ words, className }: { words: string[]; className?: string }) {
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block will-change-transform"
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

export default function GuideHeader() {
  return (
    <section className="pb-16 pt-32">
      <div className="mx-auto flex w-full max-w-[760px] flex-col items-center px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-1 px-3.5 py-1.5 font-mono text-xs font-medium tracking-[0.02em] text-ink-2">
          <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-after" aria-hidden="true" />
          GUIDE
        </span>

        <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] text-ink md:text-[3.25rem]">
          <WordReveal words={HEADLINE} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 max-w-xl text-base leading-relaxed text-ink-2"
        >
          Everything below happens inside your browser tab. Nothing is uploaded, ever.
        </motion.p>

        {/* Hairline divider drawing out from center */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 h-px w-full origin-center bg-line"
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
