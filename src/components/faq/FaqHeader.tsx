import { motion } from 'framer-motion'

const HEADLINE = 'Private by architecture, not by promise.'.split(' ')

/** Masked word-level slide-up reveal for the page headline. */
function WordReveal({ words }: { words: string[] }) {
  return (
    <>
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
    </>
  )
}

/** Lucide "Lock" geometry, drawn in with a stroke-dashoffset (pathLength) animation. */
function DrawnLock() {
  return (
    <motion.svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B8F04A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block shrink-0"
      aria-hidden="true"
    >
      <motion.rect
        x="3"
        y="11"
        width="18"
        height="11"
        rx="2"
        ry="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.5, ease: 'easeInOut' }}
      />
      <motion.path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.75, ease: 'easeInOut' }}
      />
    </motion.svg>
  )
}

export default function FaqHeader() {
  return (
    <section className="pb-16 pt-32">
      <div className="mx-auto flex w-full max-w-[720px] flex-col items-center px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-1 px-3.5 py-1.5 font-mono text-xs font-medium tracking-[0.02em] text-ink-2">
          <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-after" aria-hidden="true" />
          FAQ
        </span>

        <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] text-ink md:text-[3.25rem]">
          <WordReveal words={HEADLINE} />
          <span className="ml-3 inline-block align-middle">
            <DrawnLock />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 max-w-xl text-base leading-relaxed text-ink-2"
        >
          SplitFrame has no server to send your footage to. Here's everything people ask.
        </motion.p>
      </div>
    </section>
  )
}
