import { motion } from 'framer-motion'
import { Film, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'lime' | 'amber'

type FormatRow = {
  name: string
  note?: string
  status: string
  tone: Status
}

const VIDEO_ROWS: FormatRow[] = [
  { name: 'MP4', note: 'H.264', status: 'best support', tone: 'lime' },
  { name: 'WebM', note: 'VP8/VP9', status: 'great', tone: 'lime' },
  { name: 'MOV', status: 'browser-dependent', tone: 'amber' },
]

const IMAGE_ROWS: FormatRow[] = [
  { name: 'PNG', status: 'with transparency', tone: 'lime' },
  { name: 'JPG', status: 'great', tone: 'lime' },
  { name: 'GIF', status: 'first frame as still', tone: 'amber' },
  { name: 'WebP', status: 'great', tone: 'lime' },
]

function StatusChip({ status, tone }: { status: string; tone: Status }) {
  return (
    <motion.span
      variants={{
        hidden: { opacity: 0, scale: 0.8 },
        show: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.35, delay: 0.25, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium tracking-[0.02em]',
        tone === 'lime'
          ? 'border-after/40 bg-after-dim text-after'
          : 'border-amber-300/40 bg-amber-300/10 text-amber-300',
      )}
    >
      {status}
    </motion.span>
  )
}

function FormatCard({ title, icon, rows }: { title: string; icon: 'video' | 'image'; rows: FormatRow[] }) {
  const Icon = icon === 'video' ? Film : ImageIcon
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <Icon className={cn('h-4 w-4', icon === 'video' ? 'text-before' : 'text-after')} aria-hidden="true" />
        <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ink">
          {title}
        </h3>
      </div>
      <motion.ul
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-20% 0px' }}
        transition={{ staggerChildren: 0.06 }}
      >
        {rows.map((row, i) => (
          <motion.li
            key={row.name}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
            }}
            className={cn(
              'flex items-center justify-between gap-4 px-5 py-3.5',
              i < rows.length - 1 && 'border-b border-line/60',
            )}
          >
            <span className="font-mono text-xs font-medium tracking-[0.02em] text-ink">
              {row.name}
              {row.note && <span className="ml-2 text-ink-3">({row.note})</span>}
            </span>
            <StatusChip status={row.status} tone={row.tone} />
          </motion.li>
        ))}
        {icon === 'video' && (
          <motion.li
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
            }}
            className="flex items-center justify-between gap-4 border-t border-line/60 bg-surface-1/60 px-5 py-3"
          >
            <span className="font-mono text-[11px] tracking-[0.02em] text-ink-3">max length</span>
            <span className="font-mono text-[11px] tracking-[0.02em] text-ink-2">any — export capped at 60s</span>
          </motion.li>
        )}
      </motion.ul>
    </div>
  )
}

export default function FormatMatrix() {
  return (
    <section className="bg-surface-1 py-24">
      <div className="mx-auto w-full max-w-[900px] px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink md:text-4xl"
        >
          What can you drop in?
        </motion.h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <FormatCard title="Video" icon="video" rows={VIDEO_ROWS} />
          <FormatCard title="Image" icon="image" rows={IMAGE_ROWS} />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 text-center text-sm leading-relaxed text-ink-3"
        >
          Limits depend on your browser's decoders — SplitFrame validates files the moment you drop
          them and tells you immediately if something won't play.
        </motion.p>
      </div>
    </section>
  )
}
