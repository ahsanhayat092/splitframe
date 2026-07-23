/**
 * Center stage (editor.md §3): live compositor canvas, draggable divider,
 * draggable/resizable logo overlay, draggable caption & badge overlays,
 * per-slot crop mode, click-to-edit captions, transport bar.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronsLeftRight,
  ChevronsUpDown,
  Repeat,
  Maximize,
  Pause,
  Play,
  SkipBack,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import type {
  BannerState,
  CropRect,
  FooterCaptionState,
  FrameAdjust,
  HeaderCaptionState,
  LayoutState,
  LogoState,
  Side,
  SlotState,
  TransportState,
} from '@/lib/editor/types'
import {
  clampAdjust,
  clampCrop,
  DEFAULT_ADJUST,
  fmtTime,
  isDefaultAdjust,
  isFullCrop,
  SPEEDS,
  ZOOM_MAX,
  ZOOM_MIN,
} from '@/lib/editor/types'
import {
  badgeRects,
  bannerRect,
  captionBlockRect,
  captionHitRects,
  logoRect,
  mediaDrawRect,
  mediaWindowRect,
  paneRects,
} from '@/lib/editor/compositor'
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

/* ------------------------------ drag utils ------------------------------ */

interface CaptionDrag {
  which: 'header' | 'footer'
  pointerId: number
  startClientX: number
  startClientY: number
  /** block center (canvas px) at drag start */
  cx: number
  cy: number
  moved: boolean
}

interface BadgeDrag {
  side: Side
  pointerId: number
  startClientX: number
  startClientY: number
  /** badge top-left (canvas px) at drag start */
  rx: number
  ry: number
  w: number
  h: number
}

type CropHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se'

interface CropDrag {
  handle: CropHandle
  pointerId: number
  startClientX: number
  startClientY: number
  startCrop: CropRect
}

/** Geometry snapshot for an adjust-frame pan drag (all in canvas px). */
interface PanDrag {
  pointerId: number
  startClientX: number
  startClientY: number
  startPanX: number
  startPanY: number
  /** dest px per source px (window → pane transform) */
  kx: number
  ky: number
  /** half the window overflow in source px (0 at zoom 1, < 0 zoomed out) */
  overX: number
  overY: number
}

const clampNum = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Snap a value to nearby targets (canvas px). */
function snapTo(v: number, targets: number[], range: number): number {
  for (const t of targets) {
    if (Math.abs(v - t) <= range) return t
  }
  return v
}

/* -------------------------------- Stage --------------------------------- */

export default function Stage({
  canvasRef,
  dims,
  before,
  after,
  layout,
  logo,
  banner,
  header,
  footer,
  transport,
  timelineDur,
  cropMode,
  onCropMode,
  onCrop,
  adjustMode,
  onAdjustMode,
  onAdjust,
  onDivider,
  onLogoPatch,
  onBannerPatch,
  onHeaderPatch,
  onFooterPatch,
  onLayoutPatch,
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
  banner: BannerState
  header: HeaderCaptionState
  footer: FooterCaptionState
  transport: TransportState
  timelineDur: number
  cropMode: Side | null
  onCropMode: (side: Side | null) => void
  onCrop: (side: Side, crop: CropRect | null) => void
  adjustMode: Side | null
  onAdjustMode: (side: Side | null) => void
  onAdjust: (side: Side, adjust: FrameAdjust) => void
  onDivider: (pct: number) => void
  onLogoPatch: (patch: Partial<LogoState>) => void
  onBannerPatch: (patch: Partial<BannerState>) => void
  onHeaderPatch: (patch: Partial<HeaderCaptionState>) => void
  onFooterPatch: (patch: Partial<FooterCaptionState>) => void
  onLayoutPatch: (patch: Partial<LayoutState>) => void
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
  const [captionDrag, setCaptionDrag] = useState<'header' | 'footer' | null>(null)
  const [badgeDrag, setBadgeDrag] = useState<Side | null>(null)
  const [bannerDrag, setBannerDrag] = useState(false)
  const [cropDraft, setCropDraft] = useState<CropRect>({ x: 0, y: 0, w: 1, h: 1 })

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

  // ---- caption drag (header / footer text blocks) ----
  const captionDragState = useRef<CaptionDrag | null>(null)

  const onCaptionDown = (e: ReactPointerEvent<HTMLDivElement>, which: 'header' | 'footer') => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const caption = which === 'header' ? header : footer
    const block = captionBlockRect(caption, dims.w, dims.h, which === 'footer')
    captionDragState.current = {
      which,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      cx: block ? block.x + block.w / 2 : dims.w / 2,
      cy: block ? block.y + block.h / 2 : which === 'header' ? dims.h * 0.06 : dims.h * 0.94,
      moved: false,
    }
    setCaptionDrag(which)
  }
  const onCaptionDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = captionDragState.current
    if (!st || st.pointerId !== e.pointerId) return
    const dxCanvas = (e.clientX - st.startClientX) / sx
    const dyCanvas = (e.clientY - st.startClientY) / sx
    if (!st.moved && Math.hypot(dxCanvas, dyCanvas) < 4) return
    st.moved = true
    const patch = {
      pos: {
        x: Math.round(clampNum(((st.cx + dxCanvas) / dims.w) * 100, 1, 99) * 10) / 10,
        y: Math.round(clampNum(((st.cy + dyCanvas) / dims.h) * 100, 1, 99) * 10) / 10,
      },
    }
    if (st.which === 'header') onHeaderPatch(patch)
    else onFooterPatch(patch)
  }
  const onCaptionDragUp = () => {
    const st = captionDragState.current
    captionDragState.current = null
    setCaptionDrag(null)
    if (st && !st.moved) onCaptionClick(st.which)
  }

  // ---- badge drag ----
  const badgeDragState = useRef<BadgeDrag | null>(null)

  const onBadgeDown = (e: ReactPointerEvent<HTMLDivElement>, side: Side) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const br = badgeRects(layout, dims.w, dims.h)[side]
    if (!br) return
    badgeDragState.current = {
      side,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      rx: br.x,
      ry: br.y,
      w: br.w,
      h: br.h,
    }
    setBadgeDrag(side)
  }
  const onBadgeMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = badgeDragState.current
    if (!st || st.pointerId !== e.pointerId) return
    const dxCanvas = (e.clientX - st.startClientX) / sx
    const dyCanvas = (e.clientY - st.startClientY) / sx
    const nx = clampNum(st.rx + dxCanvas, 0, Math.max(0, dims.w - st.w))
    const ny = clampNum(st.ry + dyCanvas, 0, Math.max(0, dims.h - st.h))
    const pos = {
      x: Math.round((nx / dims.w) * 1000) / 10,
      y: Math.round((ny / dims.h) * 1000) / 10,
    }
    onLayoutPatch(st.side === 'before' ? { badgeBeforePos: pos } : { badgeAfterPos: pos })
  }
  const onBadgeUp = () => {
    badgeDragState.current = null
    setBadgeDrag(null)
  }

  // ---- logo drag / resize ----
  const logoDragState = useRef<{
    mode: 'move' | 'resize'
    startX: number
    startY: number
    /** logo top-left (canvas px) at drag start */
    rx: number
    ry: number
    rw: number
    rh: number
    size: number
  } | null>(null)

  const onLogoDown = (e: ReactPointerEvent<HTMLDivElement>, mode: 'move' | 'resize') => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const r = logoRect(logo, dims.w, dims.h)
    logoDragState.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      rx: r?.x ?? 0,
      ry: r?.y ?? 0,
      rw: r?.w ?? 0,
      rh: r?.h ?? 0,
      size: logo.sizePct,
    }
    setLogoDrag(true)
  }
  const onLogoMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = logoDragState.current
    if (!st) return
    const dxCanvas = (e.clientX - st.startX) / sx
    const dyCanvas = (e.clientY - st.startY) / sx
    if (st.mode === 'move') {
      const maxX = Math.max(0, dims.w - st.rw)
      const maxY = Math.max(0, dims.h - st.rh)
      const range = Math.max(6, dims.h * 0.008)
      // light snap to edges + center
      let nx = clampNum(st.rx + dxCanvas, 0, maxX)
      let ny = clampNum(st.ry + dyCanvas, 0, maxY)
      nx = snapTo(nx, [0, maxX / 2, maxX], range)
      ny = snapTo(ny, [0, maxY / 2, maxY], range)
      onLogoPatch({
        pos: {
          x: Math.round((nx / dims.w) * 1000) / 10,
          y: Math.round((ny / dims.h) * 1000) / 10,
        },
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

  // ---- banner drag (vertical for template, free-form for upload) ----
  const bannerDragState = useRef<{
    pointerId: number
    startClientX: number
    startClientY: number
    /** banner top-left (canvas px) at drag start */
    rx: number
    ry: number
    rw: number
    rh: number
  } | null>(null)

  const onBannerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const r = bannerRect(banner, dims.w, dims.h)
    if (!r) return
    bannerDragState.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      rx: r.x,
      ry: r.y,
      rw: r.w,
      rh: r.h,
    }
    setBannerDrag(true)
  }
  const onBannerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = bannerDragState.current
    if (!st || st.pointerId !== e.pointerId) return
    const dxCanvas = (e.clientX - st.startClientX) / sx
    const dyCanvas = (e.clientY - st.startClientY) / sx
    const maxY = Math.max(0, dims.h - st.rh)
    const ny = clampNum(st.ry + dyCanvas, 0, maxY)
    if (banner.mode === 'template') {
      // full-width strip — vertical drag only
      onBannerPatch({ pos: { x: 50, y: Math.round((ny / dims.h) * 1000) / 10 } })
    } else {
      const maxX = Math.max(0, dims.w - st.rw)
      const nx = clampNum(st.rx + dxCanvas, 0, maxX)
      onBannerPatch({
        pos: {
          x: Math.round((nx / dims.w) * 1000) / 10,
          y: Math.round((ny / dims.h) * 1000) / 10,
        },
      })
    }
  }
  const onBannerUp = () => {
    bannerDragState.current = null
    setBannerDrag(false)
  }

  // ---- crop mode ----
  const cropDragState = useRef<CropDrag | null>(null)
  const cropSlot = cropMode === 'before' ? before : cropMode === 'after' ? after : null
  const cropMedia = cropSlot?.media ?? null

  // seed the draft rect when crop mode opens / target media changes
  useEffect(() => {
    if (!cropMode) return
    const slot = cropMode === 'before' ? before : after
    setCropDraft(slot.crop ? { ...slot.crop } : { x: 0, y: 0, w: 1, h: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropMode])

  // Escape cancels crop mode
  useEffect(() => {
    if (!cropMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCropMode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cropMode, onCropMode])

  const cropPane = cropMode && cropMedia ? paneRects(layout, dims.w, dims.h)[cropMode] : null
  // crop mode renders the FULL source with contain fit (see compositor fitFor)
  const cropDisplay =
    cropMode && cropMedia && cropPane
      ? mediaDrawRect(cropMedia, cropPane, 'contain', 1, null)
      : null

  const cropFractionFromEvent = (clientX: number, clientY: number): { fx: number; fy: number } | null => {
    const frame = frameRef.current?.getBoundingClientRect()
    if (!frame || !cropDisplay || cropDisplay.w <= 0 || cropDisplay.h <= 0) return null
    const canvasX = ((clientX - frame.left) / frame.width) * dims.w
    const canvasY = ((clientY - frame.top) / frame.height) * dims.h
    return {
      fx: clampNum((canvasX - cropDisplay.x) / cropDisplay.w, 0, 1),
      fy: clampNum((canvasY - cropDisplay.y) / cropDisplay.h, 0, 1),
    }
  }

  const onCropDown = (e: ReactPointerEvent<HTMLDivElement>, handle: CropHandle) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    cropDragState.current = {
      handle,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCrop: { ...cropDraft },
    }
  }
  const onCropMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = cropDragState.current
    if (!st || st.pointerId !== e.pointerId || !cropDisplay) return
    const c = st.startCrop
    if (st.handle === 'move') {
      const dfx = (e.clientX - st.startClientX) / sx / cropDisplay.w
      const dfy = (e.clientY - st.startClientY) / sx / cropDisplay.h
      setCropDraft(
        clampCrop({
          ...c,
          x: clampNum(c.x + dfx, 0, 1 - c.w),
          y: clampNum(c.y + dfy, 0, 1 - c.h),
        }),
      )
      return
    }
    const pt = cropFractionFromEvent(e.clientX, e.clientY)
    if (!pt) return
    const next = { ...c }
    if (st.handle === 'nw' || st.handle === 'sw') {
      const right = c.x + c.w
      next.x = clampNum(pt.fx, 0, right - 0.05)
      next.w = right - next.x
    } else {
      next.w = clampNum(pt.fx, c.x + 0.05, 1) - c.x
    }
    if (st.handle === 'nw' || st.handle === 'ne') {
      const bottom = c.y + c.h
      next.y = clampNum(pt.fy, 0, bottom - 0.05)
      next.h = bottom - next.y
    } else {
      next.h = clampNum(pt.fy, c.y + 0.05, 1) - c.y
    }
    setCropDraft(clampCrop(next))
  }
  const onCropUp = () => {
    cropDragState.current = null
  }

  const applyCrop = () => {
    if (!cropMode) return
    const c = clampCrop(cropDraft)
    onCrop(cropMode, isFullCrop(c) ? null : c)
    onCropMode(null)
  }

  // ---- adjust-frame mode (zoom & pan per slot) ----
  const panDragState = useRef<PanDrag | null>(null)
  const adjustPaneRef = useRef<HTMLDivElement | null>(null)
  const [panDrag, setPanDrag] = useState(false)
  const adjustSlot = adjustMode === 'before' ? before : adjustMode === 'after' ? after : null
  const adjustMedia = adjustSlot?.media ?? null
  const adjustPane = adjustMode && adjustMedia ? paneRects(layout, dims.w, dims.h)[adjustMode] : null
  // latest-adjust mirror so rapid wheel events accumulate within one frame
  const adjustLiveRef = useRef<FrameAdjust | null>(null)
  useEffect(() => {
    adjustLiveRef.current = adjustSlot?.adjust ?? null
  })

  // Escape exits adjust-frame mode (edits are live, like caption drags)
  useEffect(() => {
    if (!adjustMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onAdjustMode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adjustMode, onAdjustMode])

  /**
   * Current window geometry for the slot being adjusted:
   *  - cropPx: crop rect in source px (the pan domain)
   *  - win:    effective source window (crop + zoom/pan), source px
   *  - dest:   where the window lands in the pane, canvas px
   */
  const adjustGeom = useMemo(
    () =>
      adjustMode && adjustSlot && adjustMedia && adjustPane
        ? {
            cropPx: mediaWindowRect(adjustMedia, adjustSlot.crop, null),
            win: mediaWindowRect(adjustMedia, adjustSlot.crop, adjustSlot.adjust),
            dest: mediaDrawRect(
              adjustMedia,
              adjustPane,
              adjustMode === 'before' ? layout.fitBefore : layout.fitAfter,
              1,
              adjustSlot.crop,
              adjustSlot.adjust,
            ),
          }
        : null,
    [adjustMode, adjustSlot, adjustMedia, adjustPane, layout.fitBefore, layout.fitAfter],
  )

  const patchAdjust = (patch: Partial<FrameAdjust>) => {
    if (!adjustMode || !adjustSlot) return
    onAdjust(adjustMode, clampAdjust({ ...adjustSlot.adjust, ...patch }))
  }

  /** Re-derive pan so that source point (spx, spy) sits at dest fraction (fx, fy) at zoom z. */
  const panForAnchor = (
    z: number,
    spx: number,
    spy: number,
    fx: number,
    fy: number,
    cropPx: { x: number; y: number; w: number; h: number },
  ): FrameAdjust => {
    const nw = cropPx.w / z
    const nh = cropPx.h / z
    const baseX = cropPx.x + cropPx.w / 2 - nw / 2
    const baseY = cropPx.y + cropPx.h / 2 - nh / 2
    const overX = (cropPx.w - nw) / 2
    const overY = (cropPx.h - nh) / 2
    const nx0 = clampNum(spx - fx * nw, baseX - Math.abs(overX), baseX + Math.abs(overX))
    const ny0 = clampNum(spy - fy * nh, baseY - Math.abs(overY), baseY + Math.abs(overY))
    return clampAdjust({
      zoom: z,
      panX: Math.abs(overX) > 1e-6 ? (nx0 - baseX) / overX : 0,
      panY: Math.abs(overY) > 1e-6 ? (ny0 - baseY) / overY : 0,
    })
  }

  /** Wheel / pinch zoom centered on the pointer (native, non-passive). */
  useEffect(() => {
    const el = adjustPaneRef.current
    if (!el || !adjustMode) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const s = adjustSlot
      const g = adjustGeom
      const frame = frameRef.current
      if (!s || !g || !frame || g.dest.w <= 0 || g.dest.h <= 0) return
      const cur = adjustLiveRef.current ?? s.adjust
      const rect = frame.getBoundingClientRect()
      const canvasX = ((e.clientX - rect.left) / rect.width) * dims.w
      const canvasY = ((e.clientY - rect.top) / rect.height) * dims.h
      const z = clampNum(cur.zoom * Math.exp(-e.deltaY * 0.0016), ZOOM_MIN, ZOOM_MAX)
      const fx = clampNum((canvasX - g.dest.x) / g.dest.w, 0, 1)
      const fy = clampNum((canvasY - g.dest.y) / g.dest.h, 0, 1)
      const next = panForAnchor(z, g.win.x + fx * g.win.w, g.win.y + fy * g.win.h, fx, fy, g.cropPx)
      adjustLiveRef.current = next
      onAdjust(adjustMode, next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [adjustMode, adjustSlot, adjustGeom, dims.w, dims.h, onAdjust])

  const onAdjustPaneDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!adjustMode || !adjustSlot || !adjustGeom || adjustGeom.dest.w <= 0) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const { win, dest, cropPx } = adjustGeom
    panDragState.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: adjustSlot.adjust.panX,
      startPanY: adjustSlot.adjust.panY,
      kx: dest.w / win.w,
      ky: dest.h / win.h,
      overX: (cropPx.w - win.w) / 2,
      overY: (cropPx.h - win.h) / 2,
    }
    setPanDrag(true)
  }
  const onAdjustPaneMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = panDragState.current
    if (!st || st.pointerId !== e.pointerId || !adjustMode) return
    // grab-the-image: dragging right pulls the window left, and vice versa
    const dWinX = -((e.clientX - st.startClientX) / sx) / st.kx
    const dWinY = -((e.clientY - st.startClientY) / sx) / st.ky
    patchAdjust({
      panX: Math.abs(st.overX) > 1e-6 ? st.startPanX + dWinX / st.overX : 0,
      panY: Math.abs(st.overY) > 1e-6 ? st.startPanY + dWinY / st.overY : 0,
    })
  }
  const onAdjustPaneUp = () => {
    panDragState.current = null
    setPanDrag(false)
  }

  const onFullscreen = () => {
    const el = frameRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.().catch(() => undefined)
  }

  const bothEmpty = !before.media && !after.media
  const lRect = logo.img ? logoRect(logo, dims.w, dims.h) : null
  const bRect = banner.enabled ? bannerRect(banner, dims.w, dims.h) : null
  const capRects = captionHitRects(header, footer, dims.w, dims.h)
  const badges = badgeRects(layout, dims.w, dims.h)
  const overlaysEnabled = !bothEmpty && !cropMode && !adjustMode

  // crop overlay geometry (screen px)
  const cropScreen =
    cropDisplay && cropDraft
      ? {
          x: (cropDisplay.x + cropDraft.x * cropDisplay.w) * sx,
          y: (cropDisplay.y + cropDraft.y * cropDisplay.h) * sx,
          w: cropDraft.w * cropDisplay.w * sx,
          h: cropDraft.h * cropDisplay.h * sx,
        }
      : null
  const cropDisplayScreen = cropDisplay
    ? { x: cropDisplay.x * sx, y: cropDisplay.y * sx, w: cropDisplay.w * sx, h: cropDisplay.h * sx }
    : null

  return (
    <div className="checkerboard-faint flex min-h-0 flex-1 flex-col items-center justify-center p-6">
      {/* canvas frame */}
      <div
        ref={frameRef}
        className={cn(
          'relative select-none overflow-hidden rounded-xl border border-line bg-surface-0 transition-shadow duration-300',
          transport.playing && 'shadow-[0_0_24px_rgba(184,240,74,0.22)]',
          cropMode && (cropMode === 'before' ? 'border-before/60' : 'border-after/60'),
          adjustMode && (adjustMode === 'before' ? 'border-before/60' : 'border-after/60'),
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

        {/* caption drag / click-to-edit zones */}
        {overlaysEnabled && capRects.header && (
          <div
            role="button"
            tabIndex={-1}
            aria-label="Move or edit header caption"
            onPointerDown={(e) => onCaptionDown(e, 'header')}
            onPointerMove={onCaptionDragMove}
            onPointerUp={onCaptionDragUp}
            className={cn(
              'absolute z-10 touch-none rounded-md border border-transparent transition-colors',
              captionDrag === 'header' ? 'cursor-grabbing' : 'cursor-grab',
              header.pos ? 'hover:border-dashed hover:border-ink/30' : 'hover:bg-after/[0.04]',
              captionDrag === 'header' && 'border-dashed border-after/50',
            )}
            style={{
              left: capRects.header.x * sx,
              top: capRects.header.y * sx,
              width: capRects.header.w * sx,
              height: capRects.header.h * sx,
            }}
          />
        )}
        {overlaysEnabled && capRects.footer && (
          <div
            role="button"
            tabIndex={-1}
            aria-label="Move or edit footer caption"
            onPointerDown={(e) => onCaptionDown(e, 'footer')}
            onPointerMove={onCaptionDragMove}
            onPointerUp={onCaptionDragUp}
            className={cn(
              'absolute z-10 touch-none rounded-md border border-transparent transition-colors',
              captionDrag === 'footer' ? 'cursor-grabbing' : 'cursor-grab',
              footer.pos ? 'hover:border-dashed hover:border-ink/30' : 'hover:bg-after/[0.04]',
              captionDrag === 'footer' && 'border-dashed border-after/50',
            )}
            style={{
              left: capRects.footer.x * sx,
              top: capRects.footer.y * sx,
              width: capRects.footer.w * sx,
              height: capRects.footer.h * sx,
            }}
          />
        )}

        {/* badge drag overlays */}
        {overlaysEnabled && badges.before && (
          <div
            role="presentation"
            aria-label="Move Before badge"
            onPointerDown={(e) => onBadgeDown(e, 'before')}
            onPointerMove={onBadgeMove}
            onPointerUp={onBadgeUp}
            className={cn(
              'absolute z-[15] touch-none rounded-full border border-transparent transition-colors',
              badgeDrag === 'before' ? 'cursor-grabbing' : 'cursor-grab',
              'hover:border-before/50',
              badgeDrag === 'before' && 'border-dashed border-before/70',
            )}
            style={{
              left: badges.before.x * sx - 4,
              top: badges.before.y * sx - 4,
              width: badges.before.w * sx + 8,
              height: badges.before.h * sx + 8,
            }}
          />
        )}
        {overlaysEnabled && badges.after && (
          <div
            role="presentation"
            aria-label="Move After badge"
            onPointerDown={(e) => onBadgeDown(e, 'after')}
            onPointerMove={onBadgeMove}
            onPointerUp={onBadgeUp}
            className={cn(
              'absolute z-[15] touch-none rounded-full border border-transparent transition-colors',
              badgeDrag === 'after' ? 'cursor-grabbing' : 'cursor-grab',
              'hover:border-after/50',
              badgeDrag === 'after' && 'border-dashed border-after/70',
            )}
            style={{
              left: badges.after.x * sx - 4,
              top: badges.after.y * sx - 4,
              width: badges.after.w * sx + 8,
              height: badges.after.h * sx + 8,
            }}
          />
        )}

        {/* logo interactive overlay */}
        {overlaysEnabled && lRect && (
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

        {/* banner drag overlay */}
        {overlaysEnabled && bRect && (
          <div
            role="presentation"
            aria-label="Move emblem banner"
            onPointerDown={onBannerDown}
            onPointerMove={onBannerMove}
            onPointerUp={onBannerUp}
            className={cn(
              'absolute z-[18] touch-none rounded-md border border-transparent transition-colors',
              bannerDrag ? 'cursor-grabbing' : 'cursor-grab',
              'hover:border-dashed hover:border-ink/30',
              bannerDrag && 'border-dashed border-after/60',
            )}
            style={{
              left: bRect.x * sx,
              top: bRect.y * sx,
              width: bRect.w * sx,
              height: bRect.h * sx,
            }}
          />
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
            <div className="absolute inset-y-0 left-1/2 w-px bg-after/40" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-after/40" />
            <div className="absolute inset-[5%] rounded border border-dashed border-ink/20" />
          </div>
        )}

        {/* divider handle */}
        {overlaysEnabled && (
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

        {/* ------------------------- crop mode ------------------------- */}
        {cropMode && cropMedia && cropDisplayScreen && cropScreen && (
          <div className="absolute inset-0 z-40">
            {/* dim outside the media display rect */}
            <div
              className="pointer-events-none absolute bg-surface-0/70"
              style={{
                left: cropDisplayScreen.x,
                top: cropDisplayScreen.y,
                width: cropDisplayScreen.w,
                height: cropDisplayScreen.h,
              }}
            />
            {/* crop rectangle */}
            <div
              role="presentation"
              aria-label="Crop region — drag to move"
              onPointerDown={(e) => onCropDown(e, 'move')}
              onPointerMove={onCropMove}
              onPointerUp={onCropUp}
              className={cn(
                'absolute cursor-move touch-none border-2 bg-transparent',
                cropMode === 'before' ? 'border-before' : 'border-after',
              )}
              style={{
                left: cropScreen.x,
                top: cropScreen.y,
                width: cropScreen.w,
                height: cropScreen.h,
                boxShadow: '0 0 0 9999px rgba(10,11,14,0.55)',
              }}
            >
              {/* corner handles */}
              {(
                [
                  ['nw', '-left-3 -top-3', 'cursor-nwse-resize'],
                  ['ne', '-right-3 -top-3', 'cursor-nesw-resize'],
                  ['sw', '-left-3 -bottom-3', 'cursor-nesw-resize'],
                  ['se', '-right-3 -bottom-3', 'cursor-nwse-resize'],
                ] as [CropHandle, string, string][]
              ).map(([handle, pos, cursor]) => (
                <div
                  key={handle}
                  role="presentation"
                  aria-label={`Resize crop ${handle}`}
                  onPointerDown={(e) => onCropDown(e, handle)}
                  onPointerMove={onCropMove}
                  onPointerUp={onCropUp}
                  className={cn(
                    'absolute h-6 w-6 touch-none rounded-full border-2 bg-surface-3',
                    pos,
                    cursor,
                    cropMode === 'before' ? 'border-before' : 'border-after',
                  )}
                />
              ))}
              {/* rule-of-thirds lines */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-y-0 left-1/3 w-px bg-ink/20" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-ink/20" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-ink/20" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-ink/20" />
              </div>
            </div>

            {/* crop action bar */}
            <div className="absolute inset-x-0 bottom-3 z-50 flex items-center justify-center gap-2 px-4">
              <div className="flex items-center gap-2 rounded-full border border-line bg-surface-1/95 px-3 py-2 shadow-lg backdrop-blur">
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium',
                    cropMode === 'before'
                      ? 'border-before/60 bg-before-dim text-before'
                      : 'border-after/60 bg-after-dim text-after',
                  )}
                >
                  CROP {cropMode === 'before' ? 'BEFORE' : 'AFTER'}
                </span>
                {!isFullCrop(cropSlot?.crop ?? null) && (
                  <button
                    type="button"
                    onClick={() => setCropDraft({ x: 0, y: 0, w: 1, h: 1 })}
                    className="rounded-full border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    Full frame
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onCropMode(null)}
                  className="flex items-center gap-1 rounded-full border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyCrop}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97]',
                    cropMode === 'before'
                      ? 'bg-before text-surface-0 hover:shadow-[0_0_12px_rgba(76,201,240,0.4)]'
                      : 'bg-after text-after-ink hover:shadow-[0_0_12px_rgba(184,240,74,0.4)]',
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --------------------- adjust-frame mode --------------------- */}
        {adjustMode && adjustSlot && adjustMedia && adjustPane && adjustGeom && adjustPane.w > 0 && adjustPane.h > 0 && (
          <div className="pointer-events-none absolute inset-0 z-40">
            {/* pane hit area — drag to pan, wheel/pinch to zoom */}
            <div
              ref={adjustPaneRef}
              role="presentation"
              aria-label="Adjust frame — drag to pan, scroll to zoom"
              onPointerDown={onAdjustPaneDown}
              onPointerMove={onAdjustPaneMove}
              onPointerUp={onAdjustPaneUp}
              onPointerCancel={onAdjustPaneUp}
              className={cn(
                'pointer-events-auto absolute touch-none border-2',
                panDrag ? 'cursor-grabbing' : 'cursor-grab',
                adjustMode === 'before' ? 'border-before' : 'border-after',
              )}
              style={{
                left: adjustPane.x * sx,
                top: adjustPane.y * sx,
                width: adjustPane.w * sx,
                height: adjustPane.h * sx,
                boxShadow: '0 0 0 9999px rgba(10,11,14,0.55)',
              }}
            >
              {/* pan hint */}
              <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-surface-1/90 px-2 py-0.5 font-mono text-[10px] text-ink-2">
                drag to pan · scroll to zoom
              </span>
            </div>

            {/* adjust-frame action bar */}
            <div className="pointer-events-auto absolute inset-x-0 bottom-3 z-50 flex items-center justify-center gap-2 px-4">
              <div className="flex items-center gap-2 rounded-full border border-line bg-surface-1/95 px-3 py-2 shadow-lg backdrop-blur">
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium',
                    adjustMode === 'before'
                      ? 'border-before/60 bg-before-dim text-before'
                      : 'border-after/60 bg-after-dim text-after',
                  )}
                >
                  FRAME {adjustMode === 'before' ? 'BEFORE' : 'AFTER'}
                </span>
                <Slider
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={0.05}
                  value={[adjustSlot.adjust.zoom]}
                  onValueChange={([v]) => patchAdjust({ zoom: v })}
                  aria-label="Frame zoom"
                  className="w-28 sm:w-36 [&_[data-slot=slider-range]]:bg-after [&_[data-slot=slider-thumb]]:border-after"
                />
                <span className="w-10 shrink-0 text-center font-mono text-[11px] text-ink-2 tabular-nums">
                  {adjustSlot.adjust.zoom.toFixed(1)}×
                </span>
                {!isDefaultAdjust(adjustSlot.adjust) && (
                  <button
                    type="button"
                    onClick={() => onAdjust(adjustMode, { ...DEFAULT_ADJUST })}
                    className="rounded-full border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onAdjustMode(null)}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97]',
                    adjustMode === 'before'
                      ? 'bg-before text-surface-0 hover:shadow-[0_0_12px_rgba(76,201,240,0.4)]'
                      : 'bg-after text-after-ink hover:shadow-[0_0_12px_rgba(184,240,74,0.4)]',
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                  Done
                </button>
              </div>
            </div>
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
