/**
 * Center stage (editor.md §3): live compositor canvas, draggable divider,
 * draggable/resizable logo overlay, click-to-edit captions, transport bar.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronsLeftRight,
  ChevronsUpDown,
  Repeat,
  Maximize,
  Pause,
  Play,
  SkipBack,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type {
  FooterCaptionState,
  HeaderCaptionState,
  LayoutState,
  LogoState,
  SlotState,
  TransportState,
} from '@/lib/editor/types'
import { fmtTime, SPEEDS } from '@/lib/editor/types'
import { captionHitRects, logoRect } from '@/lib/editor/compositor'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/* ------------------------------ Transport ------------------------------- */

function IconBtn({
  label,
  title,
  onClick,
  active,
  children,
}: {
  label: string
  title?: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-surface-3 text-after' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function Transport({
  transport,
  timelineDur,
  onTogglePlay,
  onScrub,
  onRestart,
  onToggleLoop,
  onSpeed,
  onToggleMute,
  onFullscreen,
}: {
  transport: TransportState
  timelineDur: number
  onTogglePlay: () => void
  onScrub: (t: number) => void
  onRestart: () => void
  onToggleLoop: () => void
  onSpeed: (s: number) => void
  onToggleMute: () => void
  onFullscreen: () => void
}) {
  return (
    <div className="flex h-12 items-center gap-1.5 rounded-b-xl border-t border-line bg-surface-1 px-3">
      <IconBtn label={transport.playing ? 'Pause' : 'Play'} onClick={onTogglePlay}>
        {transport.playing ? <Pause className="h-[18px] w-[18px]" /> : <Play className="h-[18px] w-[18px]" />}
      </IconBtn>
      <IconBtn label="Restart" onClick={onRestart}>
        <SkipBack className="h-4 w-4" />
      </IconBtn>
      <IconBtn label="Loop" onClick={onToggleLoop} active={transport.loop}>
        <Repeat className="h-4 w-4" />
      </IconBtn>

      <div className="mx-2 flex min-w-0 flex-1 items-center gap-3">
        <Slider
          min={0}
          max={Math.max(0.01, timelineDur)}
          step={0.01}
          value={[Math.min(transport.time, timelineDur)]}
          onValueChange={([v]) => onScrub(v)}
          aria-label="Scrub timeline"
          className="flex-1 [&_[data-slot=slider-range]]:bg-after [&_[data-slot=slider-thumb]]:border-after"
        />
        <span className="shrink-0 font-mono text-xs text-ink-2 tabular-nums">
          {fmtTime(transport.time)} <span className="text-ink-3">/ {fmtTime(timelineDur)}</span>
        </span>
      </div>

      <div className="hidden items-center rounded-lg bg-surface-2 p-0.5 md:flex" role="radiogroup" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={transport.speed === s}
            onClick={() => onSpeed(s)}
            className={cn(
              'rounded-md px-1.5 py-1 font-mono text-[11px] transition-colors',
              transport.speed === s ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            {s}×
          </button>
        ))}
      </div>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <IconBtn label={transport.muted ? 'Unmute' : 'Mute'} onClick={onToggleMute}>
                {transport.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </IconBtn>
            </span>
          </TooltipTrigger>
          <TooltipContent className="border-line bg-surface-3 font-mono text-xs text-ink-2">
            Export mix: before → L, after → R
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <IconBtn label="Fullscreen" onClick={onFullscreen}>
        <Maximize className="h-4 w-4" />
      </IconBtn>
    </div>
  )
}

/* -------------------------------- Stage --------------------------------- */

export default function Stage({
  canvasRef,
  dims,
  before,
  after,
  layout,
  logo,
  header,
  footer,
  transport,
  timelineDur,
  onDivider,
  onLogoPatch,
  onCaptionClick,
  onTogglePlay,
  onScrub,
  onRestart,
  onToggleLoop,
  onSpeed,
  onToggleMute,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  dims: { w: number; h: number }
  before: SlotState
  after: SlotState
  layout: LayoutState
  logo: LogoState
  header: HeaderCaptionState
  footer: FooterCaptionState
  transport: TransportState
  timelineDur: number
  onDivider: (pct: number) => void
  onLogoPatch: (patch: Partial<LogoState>) => void
  onCaptionClick: (which: 'header' | 'footer') => void
  onTogglePlay: () => void
  onScrub: (t: number) => void
  onRestart: () => void
  onToggleLoop: () => void
  onSpeed: (s: number) => void
  onToggleMute: () => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState({ w: 0, h: 0 })
  const [dividerDrag, setDividerDrag] = useState(false)
  const [logoDrag, setLogoDrag] = useState(false)

  // Fit canvas into the available stage area (preserving output aspect)
  useEffect(() => {
    const el = frameRef.current?.parentElement
    if (!el) return
    const ro = new ResizeObserver(() => {
      const pad = 48
      const availW = Math.max(120, el.clientWidth - pad)
      const availH = Math.max(120, el.clientHeight - pad - 48)
      const scale = Math.min(availW / dims.w, availH / dims.h)
      setDisplay({ w: Math.floor(dims.w * scale), h: Math.floor(dims.h * scale) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [dims.w, dims.h])

  const sx = display.w > 0 ? display.w / dims.w : 1
  const horizontal = layout.mode !== 'stacked'

  const pctFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const rect = frameRef.current?.getBoundingClientRect()
      if (!rect) return layout.divider
      const raw = horizontal
        ? ((clientX - rect.left) / rect.width) * 100
        : ((clientY - rect.top) / rect.height) * 100
      return Math.min(95, Math.max(5, raw))
    },
    [horizontal, layout.divider],
  )

  const onDividerPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDividerDrag(true)
    onDivider(pctFromEvent(e.clientX, e.clientY))
  }
  const onDividerPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dividerDrag) return
    onDivider(pctFromEvent(e.clientX, e.clientY))
  }

  // ---- logo drag / resize ----
  const logoDragState = useRef<{
    mode: 'move' | 'resize'
    startX: number
    startY: number
    ox: number
    oy: number
    size: number
  } | null>(null)

  const onLogoDown = (e: ReactPointerEvent<HTMLDivElement>, mode: 'move' | 'resize') => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    logoDragState.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      ox: logo.offsetX,
      oy: logo.offsetY,
      size: logo.sizePct,
    }
    setLogoDrag(true)
  }
  const onLogoMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = logoDragState.current
    if (!st) return
    const baseline = dims.h / 1080
    const dxCanvas = (e.clientX - st.startX) / sx
    const dyCanvas = (e.clientY - st.startY) / sx
    if (st.mode === 'move') {
      onLogoPatch({
        offsetX: Math.min(50, Math.max(-50, Math.round(st.ox + dxCanvas / baseline))),
        offsetY: Math.min(50, Math.max(-50, Math.round(st.oy + dyCanvas / baseline))),
      })
    } else {
      const next = st.size + (dxCanvas / dims.w) * 100
      onLogoPatch({ sizePct: Math.min(30, Math.max(4, Math.round(next * 10) / 10)) })
    }
  }
  const onLogoUp = () => {
    logoDragState.current = null
    setLogoDrag(false)
  }

  const onFullscreen = () => {
    const el = frameRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.().catch(() => undefined)
  }

  const bothEmpty = !before.media && !after.media
  const lRect = logo.img ? logoRect(logo, dims.w, dims.h) : null
  const capRects = captionHitRects(header, footer, dims.w, dims.h)

  return (
    <div className="checkerboard-faint flex min-h-0 flex-1 flex-col items-center justify-center p-6">
      {/* canvas frame */}
      <div
        ref={frameRef}
        className={cn(
          'relative select-none overflow-hidden rounded-xl border border-line bg-surface-0 transition-shadow duration-300',
          transport.playing && 'shadow-[0_0_24px_rgba(184,240,74,0.22)]',
        )}
        style={{
          width: display.w || undefined,
          height: display.h || undefined,
          aspectRatio: `${dims.w} / ${dims.h}`,
          maxWidth: '100%',
        }}
      >
        <canvas
          ref={canvasRef}
          width={dims.w}
          height={dims.h}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* empty state */}
        <AnimatePresence>
          {bothEmpty && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-0/70"
            >
              <img src="/empty-state.svg" alt="" className="w-[120px] opacity-90" />
              <p className="text-sm text-ink-2">Drop media on the left to start</p>
              <p className="font-mono text-xs text-ink-3">or press U to upload</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* caption click-to-edit zones */}
        {!bothEmpty && capRects.header && (
          <button
            type="button"
            aria-label="Edit header caption"
            onClick={() => onCaptionClick('header')}
            className="absolute left-0 z-10 w-full cursor-text bg-transparent"
            style={{
              top: capRects.header.y * sx,
              height: capRects.header.h * sx,
            }}
          />
        )}
        {!bothEmpty && capRects.footer && (
          <button
            type="button"
            aria-label="Edit footer caption"
            onClick={() => onCaptionClick('footer')}
            className="absolute left-0 z-10 w-full cursor-text bg-transparent"
            style={{
              top: capRects.footer.y * sx,
              height: capRects.footer.h * sx,
            }}
          />
        )}

        {/* logo interactive overlay */}
        {!bothEmpty && lRect && (
          <div
            role="presentation"
            onPointerDown={(e) => onLogoDown(e, 'move')}
            onPointerMove={onLogoMove}
            onPointerUp={onLogoUp}
            className={cn(
              'absolute z-20 touch-none rounded-sm',
              logoDrag ? 'cursor-grabbing' : 'cursor-grab',
            )}
            style={{
              left: lRect.x * sx,
              top: lRect.y * sx,
              width: lRect.w * sx,
              height: lRect.h * sx,
              outline: logoDrag ? '1.5px dashed rgba(184,240,74,0.7)' : 'none',
            }}
          >
            {/* resize handle */}
            <div
              role="presentation"
              onPointerDown={(e) => onLogoDown(e, 'resize')}
              onPointerMove={onLogoMove}
              onPointerUp={onLogoUp}
              className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize touch-none rounded-full border border-after bg-surface-3"
              aria-label="Resize logo"
            />
          </div>
        )}

        {/* snap grid while dragging the logo */}
        {logoDrag && (
          <div className="pointer-events-none absolute inset-0 z-10">
            {[1, 2].map((i) => (
              <div
                key={`v${i}`}
                className="absolute top-0 h-full w-px bg-after/30"
                style={{ left: `${(i * 100) / 3}%` }}
              />
            ))}
            {[1, 2].map((i) => (
              <div
                key={`h${i}`}
                className="absolute left-0 h-px w-full bg-after/30"
                style={{ top: `${(i * 100) / 3}%` }}
              />
            ))}
            <div className="absolute inset-[5%] rounded border border-dashed border-ink/20" />
          </div>
        )}

        {/* divider handle */}
        {!bothEmpty && (
          <div
            role="slider"
            aria-label="Divider position"
            aria-valuenow={Math.round(layout.divider)}
            aria-valuemin={5}
            aria-valuemax={95}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
                onDivider(Math.max(5, layout.divider - 1))
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
                onDivider(Math.min(95, layout.divider + 1))
            }}
            onPointerDown={onDividerPointerDown}
            onPointerMove={onDividerPointerMove}
            onPointerUp={() => setDividerDrag(false)}
            className={cn(
              'absolute z-30 flex touch-none items-center justify-center',
              dividerDrag ? 'cursor-grabbing' : 'cursor-grab',
            )}
            style={
              horizontal
                ? {
                    left: `${layout.divider}%`,
                    top: 0,
                    bottom: 0,
                    width: 44,
                    marginLeft: -22,
                  }
                : {
                    top: `${layout.divider}%`,
                    left: 0,
                    right: 0,
                    height: 44,
                    marginTop: -22,
                  }
            }
          >
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border bg-surface-3 transition-shadow duration-200',
                dividerDrag && 'shadow-[0_0_16px_rgba(184,240,74,0.45)]',
              )}
              style={{
                borderImage: 'linear-gradient(135deg, #4CC9F0, #B8F04A) 1',
                borderWidth: 2,
              }}
            >
              {horizontal ? (
                <ChevronsLeftRight className="h-4 w-4 text-ink" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 text-ink" />
              )}
            </div>
            {dividerDrag && (
              <span
                className={cn(
                  'absolute rounded border border-line bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-ink',
                  horizontal ? '-bottom-7' : 'left-full ml-2',
                )}
              >
                {Math.round(layout.divider)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* transport */}
      <div style={{ width: display.w || undefined, maxWidth: '100%' }} className="mt-0">
        <Transport
          transport={transport}
          timelineDur={timelineDur}
          onTogglePlay={onTogglePlay}
          onScrub={onScrub}
          onRestart={onRestart}
          onToggleLoop={onToggleLoop}
          onSpeed={onSpeed}
          onToggleMute={onToggleMute}
          onFullscreen={onFullscreen}
        />
      </div>
    </div>
  )
}
