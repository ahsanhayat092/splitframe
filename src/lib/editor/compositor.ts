/**
 * The SplitFrame compositor — ONE render path used by the live preview canvas
 * AND the export pipeline (WYSIWYG, editor.md §3 / §5).
 *
 * Every layout-px value in state (gap, logo padding/offsets) is authored
 * against a 1080px-tall baseline and scaled by H/1080 here.
 */
import type {
  FitMode,
  FooterCaptionState,
  HeaderCaptionState,
  LayoutState,
  LogoState,
  SlotMedia,
  SlotState,
} from './types'
import { stillProgressAt } from './types'

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

const CAPTION_PCT: Record<'S' | 'M' | 'L', number> = { S: 0.03, M: 0.045, L: 0.06 }

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
  const col = logo.grid % 3
  const row = Math.floor(logo.grid / 3)
  let x = col === 0 ? pad : col === 1 ? (W - w) / 2 : W - w - pad
  let y = row === 0 ? pad : row === 1 ? (H - h) / 2 : H - h - pad
  x += logo.offsetX * s
  y += logo.offsetY * s
  x = Math.min(Math.max(x, 0), Math.max(0, W - w))
  y = Math.min(Math.max(y, 0), Math.max(0, H - h))
  return { x, y, w, h }
}

/** Click targets for caption bars on the live canvas. */
export function captionHitRects(
  header: HeaderCaptionState,
  footer: FooterCaptionState,
  W: number,
  H: number,
): { header: Rect | null; footer: Rect | null } {
  const headerRect = header.show
    ? { x: 0, y: 0, w: W, h: Math.max(H * 0.09, H * CAPTION_PCT[header.style.size] * 2.2) }
    : null
  const footerH = Math.max(H * 0.1, H * CAPTION_PCT[footer.style.size] * 2.2 + (footer.detail ? H * 0.032 : 0))
  const footerRect = footer.show ? { x: 0, y: H - footerH, w: W, h: footerH } : null
  return { header: headerRect, footer: footerRect }
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

function drawMediaInto(
  ctx: CanvasRenderingContext2D,
  media: SlotMedia,
  rect: Rect,
  fit: FitMode,
  zoom: number,
) {
  const { sw, sh } = mediaDims(media)
  if (!sw || !sh || rect.w <= 0 || rect.h <= 0) return
  let dw = rect.w
  let dh = rect.h
  let dx = rect.x
  let dy = rect.y
  if (fit === 'cover' || fit === 'contain') {
    const scale =
      (fit === 'cover'
        ? Math.max(rect.w / sw, rect.h / sh)
        : Math.min(rect.w / sw, rect.h / sh)) * zoom
    dw = sw * scale
    dh = sh * scale
    dx = rect.x + (rect.w - dw) / 2
    dy = rect.y + (rect.h - dh) / 2
  } else {
    // fill: stretch
    dw = rect.w * zoom
    dh = rect.h * zoom
    dx = rect.x + (rect.w - dw) / 2
    dy = rect.y + (rect.h - dh) / 2
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()
  try {
    ctx.drawImage(media.el, dx, dy, dw, dh)
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

function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  accent: string,
  dim: string,
  H: number,
) {
  const s = H / 1080
  const fs = Math.max(9, 17 * s)
  ctx.save()
  ctx.font = `700 ${fs}px "JetBrains Mono", monospace`
  const tw = ctx.measureText(text).width
  const padX = 12 * s
  const padY = 6 * s
  const w = tw + padX * 2
  const h = fs + padY * 2
  roundRectPath(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = dim
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = Math.max(1, 1.5 * s)
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + padX, y + h / 2 + fs * 0.05)
  ctx.restore()
}

function drawCaptionBar(
  ctx: CanvasRenderingContext2D,
  caption: HeaderCaptionState | FooterCaptionState,
  W: number,
  H: number,
  isFooter: boolean,
) {
  if (!caption.show) return
  const text = caption.text.trim()
  const detail = isFooter ? (caption as FooterCaptionState).detail.trim() : ''
  if (!text && !detail) return
  const fs = Math.max(8, H * CAPTION_PCT[caption.style.size])
  const detailFs = Math.max(7, H * 0.022)
  const lines = (text ? 1 : 0) + (detail ? 1 : 0)
  const contentH = (text ? fs * 1.3 : 0) + (detail ? detailFs * 1.4 : 0) + (lines > 1 ? fs * 0.25 : 0)
  const padY = fs * 0.65
  const barH = contentH + padY * 2
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

  const zoomFor = (media: SlotMedia | null, holdDur: number) => {
    if (!media || media.kind !== 'image' || !layout.kenBurns) return 1
    return 1 + 0.08 * layout.kenBurnsIntensity * stillProgressAt(t, holdDur)
  }

  if (layout.mode === 'slider') {
    const splitX = W * (layout.divider / 100)
    // before covers the whole canvas, clipped to the left of the wipe
    if (beforeMedia) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, splitX, H)
      ctx.clip()
      drawMediaInto(ctx, beforeMedia, panes.before, layout.fitBefore, zoomFor(beforeMedia, src.before.imageDuration))
      ctx.restore()
    } else {
      drawEmptyPane(ctx, { x: 0, y: 0, w: splitX, h: H }, src.layout.beforeLabel, BEFORE, H)
    }
    if (afterMedia) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(splitX, 0, W - splitX, H)
      ctx.clip()
      drawMediaInto(ctx, afterMedia, panes.after, layout.fitAfter, zoomFor(afterMedia, src.after.imageDuration))
      ctx.restore()
    } else {
      drawEmptyPane(ctx, { x: splitX, y: 0, w: W - splitX, h: H }, src.layout.afterLabel, AFTER, H)
    }
  } else {
    if (beforeMedia) {
      drawMediaInto(ctx, beforeMedia, panes.before, layout.fitBefore, zoomFor(beforeMedia, src.before.imageDuration))
    } else {
      drawEmptyPane(ctx, panes.before, src.layout.beforeLabel, BEFORE, H)
    }
    if (afterMedia) {
      drawMediaInto(ctx, afterMedia, panes.after, layout.fitAfter, zoomFor(afterMedia, src.after.imageDuration))
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
    const pad = 20 * s
    const beforeLabel = (layout.beforeLabel || 'BEFORE').toUpperCase().slice(0, 12)
    const afterLabel = (layout.afterLabel || 'AFTER').toUpperCase().slice(0, 12)
    drawBadge(ctx, beforeLabel, panes.before.x + pad, panes.before.y + pad, BEFORE, 'rgba(76,201,240,0.14)', H)
    if (layout.mode === 'slider') {
      // after badge pinned top-right of the canvas
      const fs = Math.max(9, 17 * s)
      ctx.save()
      ctx.font = `700 ${fs}px "JetBrains Mono", monospace`
      const tw = ctx.measureText(afterLabel).width
      ctx.restore()
      const bw = tw + 24 * s
      drawBadge(ctx, afterLabel, W - pad - bw, pad, AFTER, 'rgba(184,240,74,0.14)', H)
    } else {
      drawBadge(ctx, afterLabel, panes.after.x + pad, panes.after.y + pad, AFTER, 'rgba(184,240,74,0.14)', H)
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
