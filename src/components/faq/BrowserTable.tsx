import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Cell = { label: string; tone: 'lime' | 'amber' }
type BrowserRow = { name: string; cells: [Cell, Cell, Cell] }

const FULL: Cell = { label: 'FULL', tone: 'lime' }
const ROWS: BrowserRow[] = [
  { name: 'Chrome', cells: [FULL, FULL, FULL] },
  { name: 'Edge', cells: [FULL, FULL, FULL] },
  { name: 'Firefox', cells: [FULL, FULL, FULL] },
  { name: 'Safari', cells: [FULL, FULL, { label: '17+', tone: 'amber' }] },
]

const COLUMNS = ['Preview', 'WebM export', 'MP4 export']

function CellChip({ cell }: { cell: Cell }) {
  return (
    <motion.span
      variants={{
        hidden: { opacity: 0, scale: 0.8 },
        show: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.3, delay: 0.2, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-full border px-3 py-1 font-mono text-xs font-semibold tracking-[0.02em]',
        cell.tone === 'lime'
          ? 'border-after/40 bg-after-dim text-after'
          : 'border-amber-300/40 bg-amber-300/10 text-amber-300',
      )}
    >
      {cell.label}
    </motion.span>
  )
}

export default function BrowserTable() {
  return (
    <section className="bg-surface-1 py-24">
      <div className="mx-auto w-full max-w-[860px] px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-4xl"
        >
          Works where you work.
        </motion.h2>

        <div className="mt-12 overflow-hidden rounded-xl border border-line bg-surface-2">
          {/* Header row */}
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] border-b border-line bg-surface-3/50">
            <span className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 sm:px-5">
              Browser
            </span>
            {COLUMNS.map((col) => (
              <span
                key={col}
                className="px-2 py-3 text-center font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3"
              >
                {col}
              </span>
            ))}
          </div>

          <motion.ul
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-20% 0px' }}
            transition={{ staggerChildren: 0.08 }}
          >
            {ROWS.map((row, i) => (
              <motion.li
                key={row.name}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
                }}
                className={cn(
                  'grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center',
                  i < ROWS.length - 1 && 'border-b border-line/60',
                )}
              >
                <span className="px-4 py-4 font-mono text-xs font-semibold tracking-[0.02em] text-ink sm:px-5">
                  {row.name}
                </span>
                {row.cells.map((cell, j) => (
                  <span key={j} className="flex justify-center px-2 py-4">
                    <CellChip cell={cell} />
                  </span>
                ))}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 text-center text-sm leading-relaxed text-ink-3"
        >
          Mobile browsers: preview and WebM export work on recent Android Chrome; iOS Safari
          supports preview, MP4 export on iOS 17+.
        </motion.p>
      </div>
    </section>
  )
}
