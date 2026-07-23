/**
 * Left rail — Media panel (editor.md §2): BEFORE/AFTER slot cards with
 * dropzones, filled-state meta, swap-sides button and mismatch hint.
 */
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeftRight,
  FolderOpen,
  Minus,
  Plus,
  RefreshCw,
  Split,
  Trash2,
} from 'lucide-react'
import type { Side, SlotState } from '@/lib/editor/types'
import { fmtTimecode } from '@/lib/editor/types'
import { truncateMiddle } from '@/lib/editor/media'
import { cn } from '@/lib/utils'

function SlotBadge({ side }: { side: Side }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.02em]',
        side === 'before'
          ? 'border-before/60 bg-before-dim text-before'
          : 'border-after/60 bg-after-dim text-after',
      )}
    >
      {side === 'before' ? 'BEFORE' : 'AFTER'}
    </span>
  )
}

function metaLine(slot: SlotState): string {
  const m = slot.media
  if (!m) return ''
  if (m.kind === 'video') {
    return `${m.width}×${m.height} · ${fmtTimecode(m.duration)}`
  }
  const ext = (m.fileName.split('.').pop() || 'IMG').toUpperCase()
  return `${ext} · ${m.width}×${m.height}`
}

function ImageDurationStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const nudge = (dir: 1 | -1) =>
    onChange(Math.min(15, Math.max(0.5, Math.round((value + dir * 0.5) * 2) / 2)))
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] text-ink-3">hold</span>
      <button
        type="button"
        onClick={() => nudge(-1)}
        aria-label="shorter hold"
        className="flex h-5 w-5 items-center justify-center rounded bg-surface-1 text-ink-2 hover:bg-surface-3 hover:text-ink"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-8 text-center font-mono text-[11px] text-ink-2 tabular-nums">
        {value.toFixed(1)}s
      </span>
      <button
        type="button"
        onClick={() => nudge(1)}
        aria-label="longer hold"
        className="flex h-5 w-5 items-center justify-center rounded bg-surface-1 text-ink-2 hover:bg-surface-3 hover:text-ink"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

function SlotCard({
  side,
  slot,
  onFile,
  onRemove,
  onImageDuration,
  registerBrowse,
  flipping,
}: {
  side: Side
  slot: SlotState
  onFile: (side: Side, file: File) => void
  onRemove: (side: Side) => void
  onImageDuration: (side: Side, sec: number) => void
  registerBrowse: (side: Side, fn: () => void) => void
  flipping: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const accent = side === 'before'

  const browse = () => inputRef.current?.click()
  registerBrowse(side, browse)

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(side, file)
  }

  return (
    <div className="rounded-lg border border-line bg-surface-1 p-3">
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(side, f)
          e.target.value = ''
        }}
      />
      <AnimatePresence mode="wait" initial={false}>
        {slot.error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2 rounded-md border border-warn/60 bg-warn/5 p-3"
          >
            <div className="flex items-center gap-2 text-warn">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p className="text-sm leading-snug">{slot.error}</p>
            </div>
            <button
              type="button"
              onClick={browse}
              className="flex items-center justify-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Replace file
            </button>
          </motion.div>
        ) : slot.media ? (
          <motion.div
            key={`filled-${slot.media.url.slice(-12)}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ rotateY: flipping ? 90 : 0 }}
              transition={{ duration: 0.15, ease: 'easeIn' }}
              className="relative"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <motion.div
                initial={{ scale: 0.92 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={cn(
                  'relative aspect-[16/10] overflow-hidden rounded-md bg-surface-0 ring-1',
                  accent ? 'ring-before/40' : 'ring-after/40',
                )}
              >
                {slot.media.thumbnail ? (
                  <img
                    src={slot.media.thumbnail}
                    alt={slot.media.fileName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="checkerboard-faint h-full w-full" />
                )}
                <div className="absolute left-2 top-2">
                  <SlotBadge side={side} />
                </div>
                {slot.media.kind === 'video' && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-ink">
                    {fmtTimecode(slot.media.duration)}
                  </span>
                )}
              </motion.div>
            </motion.div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-[11px] text-ink-2" title={slot.media.fileName}>
                {truncateMiddle(slot.media.fileName)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={browse}
                  aria-label="Replace"
                  title="Replace"
                  className="flex h-6 w-6 items-center justify-center rounded text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(side)}
                  aria-label="Remove"
                  title="Remove"
                  className="flex h-6 w-6 items-center justify-center rounded text-ink-3 transition-colors hover:bg-surface-2 hover:text-warn"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-ink-3">{metaLine(slot)}</span>
              {slot.media.kind === 'image' && (
                <ImageDurationStepper
                  value={slot.imageDuration}
                  onChange={(v) => onImageDuration(side, v)}
                />
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label={`Upload ${side} media`}
              onClick={browse}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') browse()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                'flex h-[140px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] border-dashed bg-surface-1 px-3 text-center transition-all duration-150',
                dragOver
                  ? accent
                    ? 'border-before bg-before/[0.06] shadow-[0_0_8px_rgba(76,201,240,0.4)]'
                    : 'border-after bg-after/[0.06] shadow-[0_0_8px_rgba(184,240,74,0.4)]'
                  : 'border-line-strong hover:border-ink-3',
              )}
            >
              <div className="flex w-full items-center justify-between">
                <SlotBadge side={side} />
                <img src="/empty-state.svg" alt="" className="h-10 w-16 opacity-70" />
              </div>
              {slot.loading ? (
                <p className="font-mono text-xs text-ink-2">Reading file…</p>
              ) : (
                <>
                  <p className="text-sm text-ink-2">Drop a video or image</p>
                  <p className="font-mono text-[10px] leading-relaxed text-ink-3">
                    MP4 · WEBM · MOV · PNG · JPG · GIF — max 500MB
                  </p>
                  <span className="mt-1 flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-surface-2">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Browse files
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function MediaPanel({
  before,
  after,
  onFile,
  onRemove,
  onSwap,
  onImageDuration,
  registerBrowse,
}: {
  before: SlotState
  after: SlotState
  onFile: (side: Side, file: File) => void
  onRemove: (side: Side) => void
  onSwap: () => void
  onImageDuration: (side: Side, sec: number) => void
  registerBrowse: (side: Side, fn: () => void) => void
}) {
  const [flipping, setFlipping] = useState(false)
  const mixed =
    before.media && after.media && before.media.kind !== after.media.kind

  const handleSwap = () => {
    if (flipping) return
    setFlipping(true)
    setTimeout(() => {
      onSwap()
      setFlipping(false)
    }, 150)
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
          Media
        </span>
        <h2 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-ink">
          Sources
        </h2>
      </div>

      <SlotCard
        side="before"
        slot={before}
        onFile={onFile}
        onRemove={onRemove}
        onImageDuration={onImageDuration}
        registerBrowse={registerBrowse}
        flipping={flipping}
      />
      <SlotCard
        side="after"
        slot={after}
        onFile={onFile}
        onRemove={onRemove}
        onImageDuration={onImageDuration}
        registerBrowse={registerBrowse}
        flipping={flipping}
      />

      <button
        type="button"
        onClick={handleSwap}
        disabled={!before.media && !after.media}
        className="flex items-center justify-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition-all duration-150 hover:-translate-y-[1px] hover:bg-surface-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowLeftRight className="h-4 w-4" />
        Swap sides
      </button>

      {mixed && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-lg border border-line bg-surface-2 p-3"
        >
          <Split className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
          <p className="text-sm leading-snug text-ink-2">
            Still side will hold for the video's length — or set your own in Export.
          </p>
        </motion.div>
      )}
    </div>
  )
}
