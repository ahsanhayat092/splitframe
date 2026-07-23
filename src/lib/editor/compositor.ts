/**
 * The SplitFrame compositor — ONE render path used by the live preview canvas
 * AND the export pipeline (WYSIWYG, editor.md §3 / §5).
 *
 * Every layout-px value in state (gap, logo padding/offsets) is authored
 * against a 1080px-tall baseline and scaled by H/1080 here.
 */
import type {
  BannerState,
  CropRect,
  FitMode,
  FooterCaptionState,
  FrameAdjust,
  HeaderCaptionState,
  LayoutState,
  LogoState,
  Side,
  SlotMedia,
  SlotState,
} from './types'
import {
  adjustSourceRect,
  badgeFontPct,
  captionFontPct,
  detailFontPct,
  isDefaultAdjust,
  stillProgressAt,
} from './types'
import { BANNER_COLORS, BANNER_FONT_FAMILY } from './banner'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface FrameSource {
  before: SlotState
  after: SlotState
  layout: LayoutState
  header: HeaderCaptionState
  footer: FooterCaptionState
  logo: LogoState
  banner: BannerState
  /** side currently being cropped on the Stage — rendered uncropped (preview only) */
  cropEditing?: Side | null
  /** side currently in adjust-frame mode — Ken Burns paused for it (preview only) */
  adjustEditing?: Side | null
}

export interface DrawOptions {
  /** draw 5% safe-area guides (never on export) */
  guides?: boolean
  /** true when rendering for the exported file */
  forExport?: boolean
}

const INK = '#F2F4F8'
const INK_DETAIL = '#D8DCE6'
const BEFORE = '#4CC9F0'
const AFTER = '#B8F04A'
const BG = '#0A0B0E'

/** Shared text-measure context (fonts match drawCaptionBar / drawBadge). */
let measureCtx: CanvasRenderingContext2D | null = null
function mctx(): CanvasRenderingContext2D | null {
  if (!measureCtx) {
    if (typeof document === 'undefined') return null
    measureCtx = document.createElement('canvas').getContext('2d')
  }
  return measureCtx
}

/* ------------------------------ geometry ------------------------------- */

/** Pane rects for the two sides, given layout + divider. */
export function paneRects(layout: LayoutState, W: number, H: number): { before: Rect; after: Rect } {
  const s = H / 1080
  const gap = layout.gap * s
  const d = layout.divider / 100
  if (layout.mode === 'side') {
    const splitX = W * d
    return {
      before: { x: 0, y: 0, w: Math.max(0, splitX - gap / 2), h: H },
      after: { x: splitX + gap / 2, y: 0, w: Math.max(0, W - splitX - gap / 2), h: H },
    }
  }
  if (layout.mode === 'stacked') {
    const splitY = H * d
    return {
      before: { x: 0, y: 0, w: W, h: Math.max(0, splitY - gap / 2) },
      after: { x: 0, y: splitY + gap / 2, w: W, h: Math.max(0, H - splitY - gap / 2) },
    }
  }
  // slider: both panes are the full canvas; clipping happens at draw time
  return {
    before: { x: 0, y: 0, w: W, h: H },
    after: { x: 0, y: 0, w: W, h: H },
  }
}

/** On-canvas logo rect — shared by the compositor and the interactive overlay. */
export function logoRect(logo: LogoState, W: number, H: number): Rect | null {
  const img = logo.img
  if (!img || !img.naturalWidth) return null
  const s = H / 1080
  const w = (W * logo.sizePct) / 100
  const h = (w * img.naturalHeight) / img.naturalWidth
  const pad = logo.padding * s
  let x: number
  let y: number
  if (logo.pos) {
    // free-form placement (drag on Stage) — % of canvas
    x = (logo.pos.x / 100) * W
    y = (logo.pos.y / 100) * H
  } else {
    const col = logo.grid % 3
    const row = Math.floor(logo.grid / 3)
    x = col === 0 ? pad : col === 1 ? (W - w) / 2 : W - w - pad
    y = row === 0 ? pad : row === 1 ? (H - h) / 2 : H - h - pad
    x += logo.offsetX * s
    y += logo.offsetY * s
  }
  x = Math.min(Math.max(x, 0), Math.max(0, W - w))
  y = Math.min(Math.max(y, 0), Math.max(0, H - h))
  return { x, y, w, h }
}

/** Measured text-block metrics for a caption (header or footer). */
function captionBlock(
  caption: HeaderCaptionState | FooterCaptionState,
  H: number,
  isFooter: boolean,
): { text: string; detail: string; fs: number; detailFs: number; contentH: number; width: number } | null {
  if (!caption.show) return null
  const text = caption.text.trim()
  const detail = isFooter ? (caption as FooterCaptionState).detail.trim() : ''
  if (!text && !detail) return null
  const fs = Math.max(8, (H * captionFontPct(caption)) / 100)
  const detailFs = Math.max(7, (H * (isFooter ? detailFontPct(caption as FooterCaptionState) : 2.2)) / 100)
  const lines = (text ? 1 : 0) + (detail ? 1 : 0)
  const contentH = (text ? fs * 1.3 : 0) + (detail ? detailFs * 1.4 : 0) + (lines > 1 ? fs * 0.25 : 0)
  let width = 0
  const c = mctx()
  if (c) {
    if (text) {
      c.font = `${caption.style.bold ? 700 : 500} ${fs}px "Space Grotesk", sans-serif`
      width = Math.max(width, c.measureText(text).width)
    }
    if (detail) {
      c.font = `500 ${detailFs}px "JetBrains Mono", monospace`
      width = Math.max(width, c.measureText(detail).width)
    }
  }
  if (!width) width = Math.max(fs * 6, H * 0.2) // measurement unavailable fallback
  return { text, detail, fs, detailFs, contentH, width }
}

/**
 * On-canvas rect of a caption's text block. When the caption has a free-form
 * `pos`, the block is centered there; otherwise it sits centered inside its
 * default top/bottom bar. Shared by the compositor and the Stage overlays.
 */
export function captionBlockRect(
  caption: HeaderCaptionState | FooterCaptionState,
  W: number,
  H: number,
  isFooter: boolean,
): Rect | null {
  const b = captionBlock(caption, H, isFooter)
  if (!b) return null
  const w = Math.min(b.width, W * 0.96)
  const h = b.contentH
  let cx: number
  let cy: number
  if (caption.pos) {
    cx = (caption.pos.x / 100) * W
    cy = (caption.pos.y / 100) * H
  } else {
    const padY = b.fs * 0.65
    const barH = h + padY * 2
    cx = W / 2
    cy = isFooter ? H - barH / 2 : barH / 2
  }
  const x = Math.min(Math.max(cx - w / 2, 0), Math.max(0, W - w))
  const y = Math.min(Math.max(cy - h / 2, 0), Math.max(0, H - h))
  return { x, y, w, h }
}

/** Click/drag targets for captions on the live canvas. */
export function captionHitRects(
  header: HeaderCaptionState,
  footer: FooterCaptionState,
  W: number,
  H: number,
): { header: Rect | null; footer: Rect | null } {
  const rectFor = (
    caption: HeaderCaptionState | FooterCaptionState,
    isFooter: boolean,
  ): Rect | null => {
    if (!caption.show) return null
    if (caption.pos) {
      const r = captionBlockRect(caption, W, H, isFooter)
      if (!r) return null
      // generous touch target around the text block
      const pad = Math.max(12, H * 0.02)
      return {
        x: Math.max(0, r.x - pad),
        y: Math.max(0, r.y - pad),
        w: Math.min(W, r.w + pad * 2),
        h: Math.min(H, r.h + pad * 2),
      }
    }
    // default bar zone (full width strip)
    const b = captionBlock(caption, H, isFooter)
    const fs = Math.max(8, (H * captionFontPct(caption)) / 100)
    const barH = b ? b.contentH + fs * 0.65 * 2 : fs * 2.2
    const h = Math.max(H * 0.09, barH)
    return { x: 0, y: isFooter ? H - h : 0, w: W, h }
  }
  return { header: rectFor(header, false), footer: rectFor(footer, true) }
}

/* ------------------------------ pieces --------------------------------- */

function mediaDims(media: SlotMedia): { sw: number; sh: number } {
  if (media.kind === 'video') {
    const v = media.el as HTMLVideoElement
    return { sw: v.videoWidth || media.width, sh: v.videoHeight || media.height }
  }
  const img = media.el as HTMLImageElement
  return { sw: img.naturalWidth || media.width, sh: img.naturalHeight || media.height }
}

/**
 * Effective source window in source px after composing crop + zoom/pan.
 * May extend beyond the source bounds when zoomed out — clip before drawing.
 * Shared by the compositor and the Stage adjust-frame overlay.
 */
export function mediaWindowRect(
  media: SlotMedia,
  crop?: CropRect | null,
  adjust?: FrameAdjust | null,
): Rect {
  const { sw, sh } = mediaDims(media)
  const adj = adjustSourceRect(crop ?? null, adjust ?? null)
  return { x: adj.x * sw, y: adj.y * sh, w: adj.w * sw, h: adj.h * sh }
}

/**
 * Where the media is actually drawn inside `rect` for a given fit/zoom,
 * in canvas px. Shared by the compositor and the Stage crop overlay.
 */
export function mediaDrawRect(
  media: SlotMedia,
  rect: Rect,
  fit: FitMode,
  zoom: number,
  crop?: CropRect | null,
  adjust?: FrameAdjust | null,
): Rect {
  let { sw, sh } = mediaDims(media)
  if (crop) {
    sw *= crop.w
    sh *= crop.h
  }
  if (adjust && !isDefaultAdjust(adjust)) {
    // fit against the zoom window's virtual dims (window = crop / zoom)
    const z = Math.min(5, Math.max(0.5, adjust.zoom))
    sw /= z
    sh /= z
  }
  if (!sw || !sh || rect.w <= 0 || rect.h <= 0) return { x: rect.x, y: rect.y, w: 0, h: 0 }
  if (fit === 'cover' || fit === 'contain') {
    const scale =
      (fit === 'cover'
        ? Math.max(rect.w / sw, rect.h / sh)
        : Math.min(rect.w / sw, rect.h / sh)) * zoom
    const dw = sw * scale
    const dh = sh * scale
    return { x: rect.x + (rect.w - dw) / 2, y: rect.y + (rect.h - dh) / 2, w: dw, h: dh }
  }
  // fill: stretch
  const dw = rect.w * zoom
  const dh = rect.h * zoom
  return { x: rect.x + (rect.w - dw) / 2, y: rect.y + (rect.h - dh) / 2, w: dw, h: dh }
}

function drawMediaInto(
  ctx: CanvasRenderingContext2D,
  media: SlotMedia,
  rect: Rect,
  fit: FitMode,
  zoom: number,
  crop?: CropRect | null,
  adjust?: FrameAdjust | null,
) {
  const { sw, sh } = mediaDims(media)
  if (!sw || !sh || rect.w <= 0 || rect.h <= 0) return
  const d = mediaDrawRect(media, rect, fit, zoom, crop, adjust)
  if (d.w <= 0 || d.h <= 0) return
  // effective source window (crop + zoom/pan composed), source px
  const win = mediaWindowRect(media, crop, adjust)
  if (win.w <= 0 || win.h <= 0) return
  // clip the window to the source bounds (zoom < 1 may overshoot) and map
  // the surviving sub-rect through the window → destination transform
  const ix0 = Math.min(sw, Math.max(0, win.x))
  const iy0 = Math.min(sh, Math.max(0, win.y))
  const ix1 = Math.min(sw, Math.max(0, win.x + win.w))
  const iy1 = Math.min(sh, Math.max(0, win.y + win.h))
  if (ix1 <= ix0 || iy1 <= iy0) return
  const kx = d.w / win.w
  const ky = d.h / win.h
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()
  try {
    ctx.drawImage(
      media.el,
      ix0,
      iy0,
      ix1 - ix0,
      iy1 - iy0,
      d.x + (ix0 - win.x) * kx,
      d.y + (iy0 - win.y) * ky,
      (ix1 - ix0) * kx,
      (iy1 - iy0) * ky,
    )
  } catch {
    /* element not ready yet */
  }
  ctx.restore()
}

function drawEmptyPane(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  label: string,
  accent: string,
  H: number,
) {
  if (rect.w <= 0 || rect.h <= 0) return
  const s = H / 1080
  const inset = 10 * s
  ctx.save()
  ctx.strokeStyle = accent
  ctx.globalAlpha = 0.55
  ctx.lineWidth = Math.max(1.5, 2 * s)
  ctx.setLineDash([10 * s, 8 * s])
  const r = 12 * s
  roundRectPath(ctx, rect.x + inset, rect.y + inset, rect.w - inset * 2, rect.h - inset * 2, r)
  ctx.stroke()
  ctx.setLineDash([])
  // plus
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  const arm = 14 * s
  ctx.beginPath()
  ctx.moveTo(cx - arm, cy)
  ctx.lineTo(cx + arm, cy)
  ctx.moveTo(cx, cy - arm)
  ctx.lineTo(cx, cy + arm)
  ctx.stroke()
  // label
  ctx.globalAlpha = 0.8
  ctx.fillStyle = accent
  ctx.font = `500 ${Math.max(10, 15 * s)}px "JetBrains Mono", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(label, cx, cy + arm + 8 * s)
  ctx.restore()
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Badge label text per side (matches drawFrame). */
export function badgeText(layout: LayoutState, side: Side): string {
  const raw = side === 'before' ? layout.beforeLabel : layout.afterLabel
  return (raw || (side === 'before' ? 'BEFORE' : 'AFTER')).toUpperCase().slice(0, 12)
}

/** Badge box size (canvas px) for a given label + size setting. */
function badgeDims(text: string, H: number, sizePct: number): { w: number; h: number; fs: number } {
  const s = H / 1080
  const fs = Math.max(9, (H * sizePct) / 100)
  let tw = fs * text.length * 0.62
  const c = mctx()
  if (c) {
    c.font = `700 ${fs}px "JetBrains Mono", monospace`
    tw = c.measureText(text).width
  }
  const padX = 12 * s
  const padY = 6 * s
  return { w: tw + padX * 2, h: fs + padY * 2, fs }
}

/**
 * On-canvas badge rects — default corners, or free-form positions when the
 * user dragged a badge. Shared by the compositor and the Stage overlays.
 */
export function badgeRects(
  layout: LayoutState,
  W: number,
  H: number,
): { before: Rect | null; after: Rect | null } {
  if (!layout.badges) return { before: null, after: null }
  const s = H / 1080
  const pad = 20 * s
  const panes = paneRects(layout, W, H)
  const rectFor = (side: Side): Rect => {
    const pos = side === 'before' ? layout.badgeBeforePos : layout.badgeAfterPos
    const d = badgeDims(badgeText(layout, side), H, badgeFontPct(layout, side))
    let x: number
    let y: number
    if (pos) {
      x = (pos.x / 100) * W
      y = (pos.y / 100) * H
    } else if (side === 'before') {
      x = panes.before.x + pad
      y = panes.before.y + pad
    } else if (layout.mode === 'slider') {
      x = W - pad - d.w
      y = pad
    } else {
      x = panes.after.x + pad
      y = panes.after.y + pad
    }
    x = Math.min(Math.max(x, 0), Math.max(0, W - d.w))
    y = Math.min(Math.max(y, 0), Math.max(0, H - d.h))
    return { x, y, w: d.w, h: d.h }
  }
  return { before: rectFor('before'), after: rectFor('after') }
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  rect: Rect,
  accent: string,
  dim: string,
  H: number,
  sizePct: number,
) {
  const s = H / 1080
  const { fs } = badgeDims(text, H, sizePct)
  const padX = 12 * s
  ctx.save()
  ctx.font = `700 ${fs}px "JetBrains Mono", monospace`
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, rect.h / 2)
  ctx.fillStyle = dim
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = Math.max(1, 1.5 * s)
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, rect.x + padX, rect.y + rect.h / 2 + fs * 0.05)
  ctx.restore()
}

function drawCaptionBar(
  ctx: CanvasRenderingContext2D,
  caption: HeaderCaptionState | FooterCaptionState,
  W: number,
  H: number,
  isFooter: boolean,
) {
  const b = captionBlock(caption, H, isFooter)
  if (!b) return
  const { text, detail, fs, detailFs } = b

  if (caption.pos) {
    // free-form placement — floating text block centered at pos
    const r = captionBlockRect(caption, W, H, isFooter)
    if (!r) return
    const cx = r.x + r.w / 2
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // soft shadow keeps text readable without a scrim
    ctx.shadowColor = 'rgba(0,0,0,0.65)'
    ctx.shadowBlur = Math.max(4, fs * 0.22)
    let cy = r.y
    if (text) {
      ctx.font = `${caption.style.bold ? 700 : 500} ${fs}px "Space Grotesk", sans-serif`
      ctx.fillStyle = caption.style.color
      cy += (fs * 1.3) / 2
      ctx.fillText(text, cx, cy)
      cy += (fs * 1.3) / 2 + (detail ? fs * 0.25 : 0)
    }
    if (detail) {
      ctx.font = `500 ${detailFs}px "JetBrains Mono", monospace`
      ctx.fillStyle = INK_DETAIL
      cy += (detailFs * 1.4) / 2
      ctx.fillText(detail, cx, cy)
    }
    ctx.restore()
    return
  }

  const padY = fs * 0.65
  const barH = b.contentH + padY * 2
  const y0 = isFooter ? H - barH : 0

  if (caption.style.position === 'bar') {
    const grad = isFooter
      ? ctx.createLinearGradient(0, H, 0, y0)
      : ctx.createLinearGradient(0, y0, 0, y0 + barH)
    grad.addColorStop(0, 'rgba(0,0,0,0.55)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.save()
    ctx.fillStyle = grad
    ctx.fillRect(0, y0, W, barH)
    ctx.restore()
  }

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let cy = y0 + padY
  if (text) {
    ctx.font = `${caption.style.bold ? 700 : 500} ${fs}px "Space Grotesk", sans-serif`
    ctx.fillStyle = caption.style.color
    cy += (fs * 1.3) / 2
    ctx.fillText(text, W / 2, cy)
    cy += (fs * 1.3) / 2 + (detail ? fs * 0.25 : 0)
  }
  if (detail) {
    ctx.font = `500 ${detailFs}px "JetBrains Mono", monospace`
    ctx.fillStyle = INK_DETAIL
    cy += (detailFs * 1.4) / 2
    ctx.fillText(detail, W / 2, cy)
  }
  ctx.restore()
}

/* ------------------------------ banner ---------------------------------- */

/**
 * On-canvas rect of the emblem banner. Template mode: full-width strip of
 * `heightPct`% height (pos.y overrides the top edge). Upload mode: image at
 * `widthPct`% of canvas width (pos overrides top-left). Shared by the
 * compositor and the Stage drag overlay.
 */
export function bannerRect(banner: BannerState, W: number, H: number): Rect | null {
  if (!banner.enabled) return null
  if (banner.mode === 'upload') {
    const img = banner.upload.img
    if (!img || !img.naturalWidth) return null
    const w = (W * banner.upload.widthPct) / 100
    const h = (w * img.naturalHeight) / img.naturalWidth
    const pad = H * 0.02
    let x = (W - w) / 2
    let y = banner.placement === 'top' ? pad : H - h - pad
    if (banner.pos) {
      x = (banner.pos.x / 100) * W
      y = (banner.pos.y / 100) * H
    }
    x = Math.min(Math.max(x, 0), Math.max(0, W - w))
    y = Math.min(Math.max(y, 0), Math.max(0, H - h))
    return { x, y, w, h }
  }
  const h = (H * banner.heightPct) / 100
  let y = banner.placement === 'top' ? 0 : H - h
  if (banner.pos) y = (banner.pos.y / 100) * H
  y = Math.min(Math.max(y, 0), Math.max(0, H - h))
  return { x: 0, y, w: W, h }
}

/** Cover-fit draw of an image into a rect (caller clips first). */
function drawCoverFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const sw = img.naturalWidth || 0
  const sh = img.naturalHeight || 0
  if (!sw || !sh || w <= 0 || h <= 0) return
  const scale = Math.max(w / sw, h / sh)
  const dw = sw * scale
  const dh = sh * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

/** Neutral shield glyph for the empty emblem slot. */
function drawShieldGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - r * 0.5)
  ctx.quadraticCurveTo(cx + r * 0.42, cy - r * 0.42, cx + r * 0.42, cy - r * 0.05)
  ctx.quadraticCurveTo(cx + r * 0.42, cy + r * 0.3, cx, cy + r * 0.52)
  ctx.quadraticCurveTo(cx - r * 0.42, cy + r * 0.3, cx - r * 0.42, cy - r * 0.05)
  ctx.quadraticCurveTo(cx - r * 0.42, cy - r * 0.42, cx, cy - r * 0.5)
  ctx.closePath()
}

/** Wrap text to at most maxLines, ellipsizing leftovers (per current font). */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  let truncated = false
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (!line || ctx.measureText(t).width <= maxW) {
      line = t
      continue
    }
    lines.push(line)
    line = w
    if (lines.length === maxLines) {
      truncated = true
      break
    }
  }
  if (!truncated && line) lines.push(line)
  if (truncated && lines.length) {
    let last = lines[lines.length - 1]
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) {
      last = last.slice(0, -1)
    }
    lines[lines.length - 1] = `${last}…`
  }
  return lines
}

function drawTemplateBanner(
  ctx: CanvasRenderingContext2D,
  banner: BannerState,
  r: Rect,
  W: number,
) {
  const t = banner.template
  const headerH = r.h * 0.62
  const stripH = r.h - headerH
  const hy = r.y
  const sy = r.y + headerH
  const padX = Math.max(8, W * 0.022)

  ctx.save()

  // green header bar (dark → mid, top → bottom)
  const g = ctx.createLinearGradient(0, hy, 0, hy + headerH)
  g.addColorStop(0, BANNER_COLORS.greenDark)
  g.addColorStop(1, BANNER_COLORS.greenMid)
  ctx.fillStyle = g
  ctx.fillRect(r.x, hy, r.w, headerH)

  // cream caption strip
  ctx.fillStyle = BANNER_COLORS.cream
  ctx.fillRect(r.x, sy, r.w, stripH)
  // gold hairline separating the two bands
  ctx.fillStyle = BANNER_COLORS.gold
  ctx.globalAlpha = 0.85
  ctx.fillRect(r.x, sy - Math.max(1, r.h * 0.008), r.w, Math.max(1, r.h * 0.008))
  ctx.globalAlpha = 1

  /* ---- emblem (right side — first in RTL reading order) ---- */
  const emblemD = headerH * 0.74
  const emblemR = emblemD / 2
  const emblemCx = r.x + r.w - padX - emblemR
  const emblemCy = hy + headerH / 2
  ctx.beginPath()
  ctx.arc(emblemCx, emblemCy, emblemR, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  const emblem = t.emblem.img
  if (emblem && emblem.naturalWidth) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(emblemCx, emblemCy, emblemR * 0.94, 0, Math.PI * 2)
    ctx.clip()
    try {
      drawCoverFit(ctx, emblem, emblemCx - emblemR, emblemCy - emblemR, emblemD, emblemD)
    } catch {
      /* not decoded yet */
    }
    ctx.restore()
  } else {
    ctx.save()
    ctx.strokeStyle = BANNER_COLORS.greenMid
    ctx.fillStyle = 'rgba(20,90,50,0.08)'
    ctx.lineWidth = Math.max(1, emblemD * 0.03)
    drawShieldGlyph(ctx, emblemCx, emblemCy, emblemR * 0.62)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
  // gold ring (dashed when it's still a placeholder, like the template)
  ctx.beginPath()
  ctx.arc(emblemCx, emblemCy, emblemR, 0, Math.PI * 2)
  ctx.strokeStyle = BANNER_COLORS.gold
  ctx.lineWidth = Math.max(1, emblemD * 0.035)
  if (!emblem || !emblem.naturalWidth) ctx.setLineDash([emblemD * 0.09, emblemD * 0.06])
  ctx.stroke()
  ctx.setLineDash([])

  /* ---- photo box (left side) ---- */
  const photoW = headerH * 1.4
  const photoH = headerH * 0.8
  const photoX = r.x + padX
  const photoY = hy + (headerH - photoH) / 2
  const photo = t.photo.img
  const photoReady = photo && photo.naturalWidth
  if (photoReady) {
    ctx.save()
    roundRectPath(ctx, photoX, photoY, photoW, photoH, photoH * 0.08)
    ctx.clip()
    try {
      drawCoverFit(ctx, photo, photoX, photoY, photoW, photoH)
    } catch {
      /* not decoded yet */
    }
    ctx.restore()
  } else {
    ctx.save()
    ctx.fillStyle = 'rgba(247,243,232,0.10)'
    roundRectPath(ctx, photoX, photoY, photoW, photoH, photoH * 0.08)
    ctx.fill()
    ctx.restore()
  }
  ctx.save()
  roundRectPath(ctx, photoX, photoY, photoW, photoH, photoH * 0.08)
  ctx.strokeStyle = BANNER_COLORS.gold
  ctx.lineWidth = Math.max(1, photoH * 0.03)
  if (!photoReady) ctx.setLineDash([photoH * 0.1, photoH * 0.07])
  ctx.stroke()
  ctx.restore()
  if (!photoReady) {
    ctx.save()
    ctx.fillStyle = 'rgba(212,175,55,0.85)'
    ctx.font = `500 ${Math.max(7, photoH * 0.16)}px "JetBrains Mono", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('PHOTO', photoX + photoW / 2, photoY + photoH / 2)
    ctx.restore()
  }

  /* ---- headline (gold, RTL, centered between emblem and photo) ---- */
  const headline = t.headline.trim()
  if (headline) {
    const textL = photoX + photoW + padX * 0.7
    const textR = emblemCx - emblemR - padX * 0.7
    const avail = Math.max(0, textR - textL)
    let fs = headerH * 0.34
    ctx.font = `400 ${fs}px ${BANNER_FONT_FAMILY}`
    const tw = ctx.measureText(headline).width
    if (tw > avail && tw > 0) fs = Math.max(headerH * 0.16, fs * (avail / tw))
    ctx.font = `400 ${fs}px ${BANNER_FONT_FAMILY}`
    ctx.direction = 'rtl'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = BANNER_COLORS.gold
    ctx.fillText(headline, (textL + textR) / 2, emblemCy)
  }

  /* ---- tag box on the cream strip (right side) ---- */
  const tagTitle = t.tagTitle.trim()
  const tagName = t.tagName.trim()
  const chipFs = Math.max(7, stripH * 0.17)
  const nameFs = Math.max(8, stripH * 0.22)
  let chipW = 0
  let nameW = 0
  if (tagTitle) {
    ctx.font = `700 ${chipFs}px "Space Grotesk", sans-serif`
    chipW = ctx.measureText(tagTitle).width + chipFs * 1.6
  }
  if (tagName) {
    ctx.font = `700 ${nameFs}px "Space Grotesk", sans-serif`
    nameW = ctx.measureText(tagName).width + nameFs * 0.6
  }
  const tagW = Math.max(chipW, nameW, stripH * 0.5)
  const chipH = tagTitle ? chipFs * 1.8 : 0
  const nameH = tagName ? nameFs * 1.3 : 0
  const tagGapY = tagTitle && tagName ? stripH * 0.06 : 0
  const tagTotal = chipH + tagGapY + nameH
  const tagCx = r.x + r.w - padX - tagW / 2
  let ty = sy + (stripH - tagTotal) / 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.direction = 'ltr'
  if (tagTitle) {
    roundRectPath(ctx, tagCx - chipW / 2, ty, chipW, chipH, chipH * 0.22)
    ctx.fillStyle = BANNER_COLORS.greenDark
    ctx.fill()
    ctx.fillStyle = BANNER_COLORS.gold
    ctx.font = `700 ${chipFs}px "Space Grotesk", sans-serif`
    ctx.fillText(tagTitle, tagCx, ty + chipH / 2 + chipFs * 0.04)
    ty += chipH + tagGapY
  }
  if (tagName) {
    ctx.fillStyle = BANNER_COLORS.greenDark
    ctx.font = `800 ${nameFs}px "Space Grotesk", sans-serif`
    ctx.fillText(tagName, tagCx, ty + nameH / 2)
  }

  /* ---- Urdu caption (RTL, right-aligned beside the tag, wraps to 2 lines) ---- */
  const caption = t.caption.trim()
  if (caption) {
    const capFs = Math.max(9, stripH * 0.3)
    ctx.font = `400 ${capFs}px ${BANNER_FONT_FAMILY}`
    const capR = tagCx - tagW / 2 - padX * 0.9
    const capL = r.x + padX
    const capW = Math.max(0, capR - capL)
    if (capW > capFs) {
      const lines = wrapTextLines(ctx, caption, capW, 2)
      const lh = capFs * 1.9
      ctx.direction = 'rtl'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#111111'
      let ly = sy + stripH / 2 - (lines.length * lh) / 2 + lh / 2
      for (const line of lines) {
        ctx.fillText(line, capR, ly)
        ly += lh
      }
    }
  }

  ctx.restore()
}

function drawBanner(ctx: CanvasRenderingContext2D, banner: BannerState, W: number, H: number) {
  const r = bannerRect(banner, W, H)
  if (!r || r.w <= 0 || r.h <= 0) return
  if (banner.mode === 'upload') {
    const img = banner.upload.img
    if (!img || !img.naturalWidth) return
    ctx.save()
    ctx.globalAlpha = Math.min(1, Math.max(0.1, banner.upload.opacity))
    try {
      ctx.drawImage(img, r.x, r.y, r.w, r.h)
    } catch {
      /* not decoded yet */
    }
    ctx.restore()
    return
  }
  drawTemplateBanner(ctx, banner, r, W)
}

/* ------------------------------ main ----------------------------------- */

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  src: FrameSource,
  t: number,
  opts: DrawOptions = {},
) {
  const s = H / 1080
  const { layout } = src

  // base / gutter color
  ctx.fillStyle = layout.mode === 'slider' ? BG : layout.gapColor
  ctx.fillRect(0, 0, W, H)

  const panes = paneRects(layout, W, H)
  const beforeMedia = src.before.media
  const afterMedia = src.after.media

  const zoomFor = (media: SlotMedia | null, holdDur: number, side: Side) => {
    if (src.cropEditing === side || src.adjustEditing === side) return 1
    if (!media || media.kind !== 'image' || !layout.kenBurns) return 1
    // a manual zoom/pan frame takes precedence over Ken Burns for that slot
    const slot = side === 'before' ? src.before : src.after
    if (!isDefaultAdjust(slot.adjust)) return 1
    return 1 + 0.08 * layout.kenBurnsIntensity * stillProgressAt(t, holdDur)
  }

  const cropFor = (side: Side, slot: SlotState): CropRect | null =>
    src.cropEditing === side ? null : slot.crop
  // crop mode previews the FULL source — the frame window is suspended too
  const adjustFor = (side: Side, slot: SlotState): FrameAdjust | null =>
    src.cropEditing === side ? null : slot.adjust
  // crop mode shows the FULL source fitted inside the pane (contain)
  const fitFor = (side: Side): FitMode =>
    src.cropEditing === side
      ? 'contain'
      : side === 'before'
        ? layout.fitBefore
        : layout.fitAfter

  if (layout.mode === 'slider') {
    const splitX = W * (layout.divider / 100)
    // before covers the whole canvas, clipped to the left of the wipe
    if (beforeMedia) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, splitX, H)
      ctx.clip()
      drawMediaInto(ctx, beforeMedia, panes.before, fitFor('before'), zoomFor(beforeMedia, src.before.imageDuration, 'before'), cropFor('before', src.before), adjustFor('before', src.before))
      ctx.restore()
    } else {
      drawEmptyPane(ctx, { x: 0, y: 0, w: splitX, h: H }, src.layout.beforeLabel, BEFORE, H)
    }
    if (afterMedia) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(splitX, 0, W - splitX, H)
      ctx.clip()
      drawMediaInto(ctx, afterMedia, panes.after, fitFor('after'), zoomFor(afterMedia, src.after.imageDuration, 'after'), cropFor('after', src.after), adjustFor('after', src.after))
      ctx.restore()
    } else {
      drawEmptyPane(ctx, { x: splitX, y: 0, w: W - splitX, h: H }, src.layout.afterLabel, AFTER, H)
    }
  } else {
    if (beforeMedia) {
      drawMediaInto(ctx, beforeMedia, panes.before, fitFor('before'), zoomFor(beforeMedia, src.before.imageDuration, 'before'), cropFor('before', src.before), adjustFor('before', src.before))
    } else {
      drawEmptyPane(ctx, panes.before, src.layout.beforeLabel, BEFORE, H)
    }
    if (afterMedia) {
      drawMediaInto(ctx, afterMedia, panes.after, fitFor('after'), zoomFor(afterMedia, src.after.imageDuration, 'after'), cropFor('after', src.after), adjustFor('after', src.after))
    } else {
      drawEmptyPane(ctx, panes.after, src.layout.afterLabel, AFTER, H)
    }
  }

  // divider wipe line (handle itself is an HTML overlay in preview; the line is burned in)
  const lineW = Math.max(1.5, 2 * s)
  const d = layout.divider / 100
  ctx.save()
  let grad: CanvasGradient
  if (layout.mode === 'stacked') {
    grad = ctx.createLinearGradient(0, 0, W, 0)
    grad.addColorStop(0, BEFORE)
    grad.addColorStop(1, AFTER)
    ctx.fillStyle = grad
    ctx.fillRect(0, H * d - lineW / 2, W, lineW)
  } else {
    grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, BEFORE)
    grad.addColorStop(1, AFTER)
    ctx.fillStyle = grad
    ctx.fillRect(W * d - lineW / 2, 0, lineW, H)
  }
  ctx.restore()

  // Before / After badges (burned in when enabled)
  if (layout.badges) {
    const br = badgeRects(layout, W, H)
    if (br.before) {
      drawBadge(ctx, badgeText(layout, 'before'), br.before, BEFORE, 'rgba(76,201,240,0.14)', H, badgeFontPct(layout, 'before'))
    }
    if (br.after) {
      drawBadge(ctx, badgeText(layout, 'after'), br.after, AFTER, 'rgba(184,240,74,0.14)', H, badgeFontPct(layout, 'after'))
    }
  }

  // captions
  drawCaptionBar(ctx, src.header, W, H, false)
  drawCaptionBar(ctx, src.footer, W, H, true)

  // logo overlay — drawn unless export + preview-only
  if (src.logo.img && (!opts.forExport || src.logo.burnIn)) {
    const r = logoRect(src.logo, W, H)
    if (r) {
      ctx.save()
      ctx.globalAlpha = src.logo.opacity
      try {
        ctx.drawImage(src.logo.img, r.x, r.y, r.w, r.h)
      } catch {
        /* not decoded yet */
      }
      ctx.restore()
    }
  }

  // emblem banner overlay (template recreation or uploaded image) — burned in
  if (src.banner?.enabled) {
    drawBanner(ctx, src.banner, W, H)
  }

  // safe-area guides — preview only
  if (opts.guides && !opts.forExport) {
    const mx = W * 0.05
    const my = H * 0.05
    ctx.save()
    ctx.strokeStyle = 'rgba(242,244,248,0.45)'
    ctx.lineWidth = Math.max(1, 1.5 * s)
    ctx.setLineDash([8 * s, 6 * s])
    ctx.strokeRect(mx, my, W - mx * 2, H - my * 2)
    ctx.setLineDash([])
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.moveTo(W / 2, my)
    ctx.lineTo(W / 2, H - my)
    ctx.moveTo(mx, H / 2)
    ctx.lineTo(W - mx, H / 2)
    ctx.stroke()
    ctx.restore()
  }
}

export const COMPOSITOR_INK = INK
