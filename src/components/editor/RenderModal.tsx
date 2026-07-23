/**
 * Render modal (editor.md §5): live progress, done card with auto-download,
 * error state with adaptive fix. Cannot be dismissed while rendering.
 */
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, Download, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fmtTime } from '@/lib/editor/types'

export type RenderPhase = 'idle' | 'rendering' | 'done' | 'error'

export interface RenderResult {
  blobUrl: string
  filename: string
  sizeLabel: string
  duration: number
  width: number
  height: number
  ext: string
}

export default function RenderModal({
  open,
  phase,
  pct,
  phaseLabel,
  result,
  error,
  previewRef,
  onCancel,
  onClose,
  onRenderAgain,
  onDownload,
}: {
  open: boolean
  phase: RenderPhase
  pct: number
  phaseLabel: string
  result: RenderResult | null
  error: string | null
  previewRef: RefObject<HTMLCanvasElement | null>
  onCancel: () => void
  onClose: () => void
  onRenderAgain: () => void
  onDownload: () => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)

  useEffect(() => {
    if (phase !== 'rendering') return
    startRef.current = performance.now()
    setElapsed(0)
    const id = setInterval(() => setElapsed((performance.now() - startRef.current) / 1000), 200)
    return () => clearInterval(id)
  }, [phase])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && phase !== 'rendering') onClose()
      }}
    >
      <DialogContent
        className="max-w-md border-line bg-surface-1"
        showCloseButton={phase !== 'rendering'}
        onPointerDownOutside={(e) => {
          if (phase === 'rendering') e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (phase === 'rendering') e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-semibold tracking-tight text-ink">
            {phase === 'done' ? 'Render complete' : phase === 'error' ? 'Render failed' : 'Rendering video'}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-ink-3">
            {phase === 'done'
              ? 'Your file is downloading.'
              : phase === 'error'
                ? 'Something went wrong.'
                : 'Everything happens locally in your browser.'}
          </DialogDescription>
        </DialogHeader>

        {phase === 'rendering' && (
          <div className="space-y-4">
            {/* live mini preview of the actual render */}
            <div className="checkerboard-faint flex h-24 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-0">
              <canvas ref={previewRef} className="h-full w-full object-contain" />
            </div>
            <div className="flex items-end justify-between">
              <span className="font-mono text-4xl font-bold tabular-nums text-ink">
                {Math.round(pct * 100)}
                <span className="text-lg text-ink-3">%</span>
              </span>
              <span className="font-mono text-xs text-ink-3 tabular-nums">{fmtTime(elapsed)}</span>
            </div>
            {/* striped progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(pct * 100)}%`,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #B8F04A 0 8px, #9CD33A 8px 16px)',
                }}
                animate={{ backgroundPosition: ['0px 0px', '22px 0px'] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <p className="font-mono text-xs text-ink-2">{phaseLabel}</p>
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        )}

        {phase === 'done' && result && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.15, 1] }}
                transition={{ duration: 0.45, times: [0, 0.7, 1], ease: 'easeOut' }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-after"
              >
                <Check className="h-7 w-7 text-after-ink" strokeWidth={3} />
              </motion.div>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-3 font-mono text-xs">
              <p className="truncate text-ink">{result.filename}</p>
              <p className="mt-1 text-ink-3">
                {result.sizeLabel} · {fmtTime(result.duration)} · {result.width}×{result.height} ·{' '}
                {result.ext.toUpperCase()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDownload}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-after text-sm font-semibold text-after-ink transition-all duration-150 hover:shadow-[0_0_20px_rgba(184,240,74,0.35)] active:scale-[0.97]"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                onClick={onRenderAgain}
                className="flex h-10 items-center justify-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                <RotateCcw className="h-4 w-4" />
                Render again
              </button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-warn/40 bg-warn/5 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
              <p className="text-sm leading-relaxed text-ink-2">
                {error ?? 'The render failed unexpectedly.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onRenderAgain}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-after text-sm font-semibold text-after-ink transition-all duration-150 active:scale-[0.97]"
              >
                <RotateCcw className="h-4 w-4" />
                Try again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 items-center justify-center rounded-full border border-line-strong px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
