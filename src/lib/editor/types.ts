/**
 * SplitFrame Editor — shared types, defaults and pure helpers.
 */

export type MediaKind = 'video' | 'image'
export type Side = 'before' | 'after'
export type SplitMode = 'side' | 'stacked' | 'slider'
export type AspectId = '16:9' | '1:1' | '9:16' | '4:5'
export type FitMode = 'cover' | 'contain' | 'fill'
export type CaptionSize = 'S' | 'M' | 'L'
export type CaptionPosition = 'bar' | 'floating'
export type ResolutionId = '720p' | '1080p' | 'source'
export type DurationMode = 'longest' | 'shortest' | 'custom'
export type ExportFormat = 'mp4' | 'webm'
export type EditorStatus = 'ready' | 'rendering' | 'error'

export interface SlotMedia {
  kind: MediaKind
  file: File
  url: string
  fileName: string
  width: number
  height: number
  /** Seconds — real duration for videos, 0 for images. */
  duration: number
  fps?: number
  el: HTMLVideoElement | HTMLImageElement
  /** dataURL thumbnail for the slot card. */
  thumbnail: string
}

/** Free-form on-canvas position, in % of canvas width/height (0..100). */
export interface PointPct {
  x: number
  y: number
}

/** Source-media crop, as fractions (0..1) of the source width/height. */
export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Per-slot "Adjust frame" — zoom & pan window into the (cropped) source.
 * zoom 1 + pan 0/0 = unchanged behavior. zoom > 1 zooms in (window shrinks
 * inside the crop rect); zoom < 1 zooms out (window grows beyond the crop
 * rect, letterboxed per the slot's fit rules). panX/panY are -1..1 fractions
 * of the available window overflow.
 */
export interface FrameAdjust {
  zoom: number
  panX: number
  panY: number
}

export interface SlotState {
  media: SlotMedia | null
  /** Decode / read error message, if any. */
  error: string | null
  /** Hold duration (seconds) when the slot holds a still image. */
  imageDuration: number
  /** Source crop (fractions of source media); null = full frame. */
  crop: CropRect | null
  /** Zoom & pan window, applied AFTER the crop. */
  adjust: FrameAdjust
  loading: boolean
}

export interface CaptionStyleState {
  size: CaptionSize
  bold: boolean
  color: string
  position: CaptionPosition
}

export interface HeaderCaptionState {
  show: boolean
  text: string
  style: CaptionStyleState
  /**
   * Free-form position of the text-block center, % of canvas. null = default
   * (header pinned to the top bar, footer to the bottom bar).
   */
  pos: PointPct | null
  /** Font size as % of canvas height (WYSIWYG). null = derived from style.size. */
  sizePct: number | null
}

export interface FooterCaptionState extends HeaderCaptionState {
  detail: string
  /** Detail-line font size as % of canvas height. null = default (2.2%). */
  detailSizePct: number | null
}

export interface LogoState {
  img: HTMLImageElement | null
  url: string | null
  name: string | null
  /** 0..8 row-major: 0=TL 1=TC 2=TR 3=ML 4=C 5=MR 6=BL 7=BC 8=BR */
  grid: number
  /**
   * Free-form top-left position, % of canvas. null = derive from grid +
   * offsets (the 9-point presets). Set by dragging on the Stage.
   */
  pos: PointPct | null
  /** fine offsets in px @ 1080px-tall canvas baseline, -50..50 */
  offsetX: number
  offsetY: number
  /** percent of canvas width, 4..30 */
  sizePct: number
  /** 0.1..1 */
  opacity: number
  /** edge inset px @ baseline, 8..64 */
  padding: number
  /** false = preview only (not burned into export) */
  burnIn: boolean
}

export type BannerMode = 'template' | 'upload'
export type BannerPlacement = 'top' | 'bottom'
/** How a template banner image (emblem/photo) fits its slot. */
export type BannerImageFit = 'contain' | 'cover'

/** A user-uploadable image slot inside the template banner. */
export interface BannerImageSlot {
  img: HTMLImageElement | null
  url: string | null
  name: string | null
}

export interface BannerTemplateState {
  /** Urdu headline on the green bar (RTL). */
  headline: string
  /** Latin tag chip label, e.g. "CM PUNJAB". */
  tagTitle: string
  /** Tag name under the chip, e.g. "[NAME]". */
  tagName: string
  /** Urdu caption on the cream strip (RTL). */
  caption: string
  emblem: BannerImageSlot
  photo: BannerImageSlot
}

export interface BannerUploadState {
  img: HTMLImageElement | null
  url: string | null
  name: string | null
  /** width as % of canvas width, 20..100 */
  widthPct: number
  /** 0.1..1 */
  opacity: number
}

export interface BannerState {
  enabled: boolean
  mode: BannerMode
  placement: BannerPlacement
  /** template mode: banner height as % of canvas height, 10..30 */
  heightPct: number
  /**
   * Free-form position override, % of canvas. Template mode uses `pos.y`
   * (top edge); upload mode uses `pos.x`/`pos.y` (top-left). null = derive
   * from `placement`. Set by dragging on the Stage.
   */
  pos: PointPct | null
  /** template mode: emblem fit — 'contain' shows the whole image, 'cover' fills + crops */
  emblemFit: BannerImageFit
  /** template mode: photo fit — 'contain' letterboxes, 'cover' fills + crops */
  photoFit: BannerImageFit
  template: BannerTemplateState
  upload: BannerUploadState
}

export interface LayoutState {
  mode: SplitMode
  aspect: AspectId
  /** divider percent 5..95 */
  divider: number
  /** gutter px @ baseline, 0..16 */
  gap: number
  gapColor: string
  badges: boolean
  beforeLabel: string
  afterLabel: string
  /** Free-form badge top-left positions, % of canvas. null = default corners. */
  badgeBeforePos: PointPct | null
  badgeAfterPos: PointPct | null
  /** Badge font size as % of canvas height. null = default (~1.6%). */
  badgeBeforeSizePct: number | null
  badgeAfterSizePct: number | null
  fitBefore: FitMode
  fitAfter: FitMode
  kenBurns: boolean
  /** 0..1 multiplier on the 1→1.08 zoom */
  kenBurnsIntensity: number
}

export interface ExportSettings {
  format: ExportFormat
  resolution: ResolutionId
  fps: 24 | 30 | 60
  durationMode: DurationMode
  customDuration: number
  includeAudio: boolean
}

export interface AudioTrackState {
  file: File | null
  url: string | null
  name: string | null
  /** decoded/probed duration in seconds, 0 when unknown */
  duration: number
  /** 0..1 */
  volume: number
  /** loop the track when it's shorter than the export duration */
  loop: boolean
  /** keep the original video audio (L/R pan mix) alongside the music */
  keepOriginal: boolean
}

export interface TransportState {
  playing: boolean
  /** timeline seconds */
  time: number
  speed: number
  loop: boolean
  muted: boolean
  guides: boolean
}

/* ------------------------------- defaults ------------------------------- */

export const DEFAULT_CAPTION_STYLE: CaptionStyleState = {
  size: 'M',
  bold: true,
  color: '#F2F4F8',
  position: 'bar',
}

export const DEFAULT_HEADER: HeaderCaptionState = {
  show: true,
  text: '',
  style: { ...DEFAULT_CAPTION_STYLE },
  pos: null,
  sizePct: null,
}

export const DEFAULT_FOOTER: FooterCaptionState = {
  show: true,
  text: '',
  detail: '',
  style: { ...DEFAULT_CAPTION_STYLE, size: 'S', bold: false },
  pos: null,
  sizePct: null,
  detailSizePct: null,
}

export const DEFAULT_LOGO: LogoState = {
  img: null,
  url: null,
  name: null,
  grid: 8,
  pos: null,
  offsetX: 0,
  offsetY: 0,
  sizePct: 12,
  opacity: 0.9,
  padding: 24,
  burnIn: true,
}

export const DEFAULT_BANNER: BannerState = {
  enabled: false,
  mode: 'template',
  placement: 'bottom',
  heightPct: 16,
  pos: null,
  emblemFit: 'contain',
  photoFit: 'contain',
  template: {
    headline: 'وزیراعلیٰ پنجاب [نام] کی ہدایت پر',
    tagTitle: 'CM PUNJAB',
    tagName: '[NAME]',
    caption: 'یہاں اپنی خبر کا متن لکھیں — یہ حصہ مکمل طور پر قابلِ ترمیم ہے۔',
    emblem: { img: null, url: null, name: null },
    photo: { img: null, url: null, name: null },
  },
  upload: {
    img: null,
    url: null,
    name: null,
    widthPct: 80,
    opacity: 1,
  },
}

export const DEFAULT_LAYOUT: LayoutState = {
  mode: 'side',
  aspect: '16:9',
  divider: 50,
  gap: 4,
  gapColor: '#0A0B0E',
  badges: true,
  beforeLabel: 'BEFORE',
  afterLabel: 'AFTER',
  badgeBeforePos: null,
  badgeAfterPos: null,
  badgeBeforeSizePct: null,
  badgeAfterSizePct: null,
  fitBefore: 'cover',
  fitAfter: 'cover',
  kenBurns: false,
  kenBurnsIntensity: 0.5,
}

export const DEFAULT_EXPORT: ExportSettings = {
  format: 'mp4',
  resolution: '1080p',
  fps: 30,
  durationMode: 'longest',
  customDuration: 10,
  includeAudio: true,
}

export const DEFAULT_TRANSPORT: TransportState = {
  playing: false,
  time: 0,
  speed: 1,
  loop: true,
  muted: true,
  guides: false,
}

export const DEFAULT_AUDIO: AudioTrackState = {
  file: null,
  url: null,
  name: null,
  duration: 0,
  volume: 0.8,
  loop: true,
  keepOriginal: true,
}

export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 5

export const DEFAULT_ADJUST: FrameAdjust = { zoom: 1, panX: 0, panY: 0 }

export const EMPTY_SLOT: SlotState = {
  media: null,
  error: null,
  imageDuration: 3,
  crop: null,
  adjust: DEFAULT_ADJUST,
  loading: false,
}

/* ------------------------------- helpers -------------------------------- */

/** Caption font size as % of canvas height, per S/M/L preset. */
export const CAPTION_SIZE_PCT: Record<CaptionSize, number> = { S: 3, M: 4.5, L: 6 }
export const DEFAULT_DETAIL_SIZE_PCT = 2.2
export const DEFAULT_BADGE_SIZE_PCT = 1.6

/** Effective caption font size (% of canvas height). */
export function captionFontPct(c: HeaderCaptionState): number {
  return c.sizePct ?? CAPTION_SIZE_PCT[c.style.size]
}
/** Effective footer detail font size (% of canvas height). */
export function detailFontPct(c: FooterCaptionState): number {
  return c.detailSizePct ?? DEFAULT_DETAIL_SIZE_PCT
}
/** Effective badge font size (% of canvas height). */
export function badgeFontPct(layout: LayoutState, side: Side): number {
  const v = side === 'before' ? layout.badgeBeforeSizePct : layout.badgeAfterSizePct
  return v ?? DEFAULT_BADGE_SIZE_PCT
}

/** True when the crop covers (essentially) the whole source. */
export function isFullCrop(c: CropRect | null | undefined): boolean {
  if (!c) return true
  return c.x <= 0.001 && c.y <= 0.001 && c.w >= 0.999 && c.h >= 0.999
}

/** True when the frame adjustment is the identity (zoom 1, no pan). */
export function isDefaultAdjust(a: FrameAdjust | null | undefined): boolean {
  if (!a) return true
  return Math.abs(a.zoom - 1) < 0.001 && Math.abs(a.panX) < 0.001 && Math.abs(a.panY) < 0.001
}

/** Clamp a frame adjustment to its valid ranges. */
export function clampAdjust(a: FrameAdjust): FrameAdjust {
  return {
    zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, a.zoom)),
    panX: Math.min(1, Math.max(-1, a.panX)),
    panY: Math.min(1, Math.max(-1, a.panY)),
  }
}

/**
 * Effective source window (fractions of the source media) after composing
 * crop + zoom/pan. The window may extend beyond the crop rect (zoom < 1) and
 * even beyond the source bounds — callers clip when drawing. Invariants:
 * zoom ≥ 1 → window stays inside the crop rect (source always covers the
 * frame); zoom < 1 → window always contains the crop rect.
 */
export function adjustSourceRect(crop: CropRect | null, adjust: FrameAdjust | null | undefined): CropRect {
  const c = crop ?? { x: 0, y: 0, w: 1, h: 1 }
  const a = clampAdjust(adjust ?? DEFAULT_ADJUST)
  const w = c.w / a.zoom
  const h = c.h / a.zoom
  // half the overflow: > 0 when zoomed in, < 0 when zoomed out
  const overX = (c.w - w) / 2
  const overY = (c.h - h) / 2
  return {
    x: c.x + c.w / 2 - w / 2 + a.panX * overX,
    y: c.y + c.h / 2 - h / 2 + a.panY * overY,
    w,
    h,
  }
}

/** Clamp a crop rect to sane bounds (min 5% of source). */
export function clampCrop(c: CropRect): CropRect {
  const w = Math.min(1, Math.max(0.05, c.w))
  const h = Math.min(1, Math.max(0.05, c.h))
  return {
    x: Math.min(1 - w, Math.max(0, c.x)),
    y: Math.min(1 - h, Math.max(0, c.y)),
    w,
    h,
  }
}

export const ASPECTS: Record<AspectId, { w: number; h: number; label: string }> = {
  '16:9': { w: 16, h: 9, label: '16:9' },
  '1:1': { w: 1, h: 1, label: '1:1' },
  '9:16': { w: 9, h: 16, label: '9:16' },
  '4:5': { w: 4, h: 5, label: '4:5' },
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)

/**
 * Output pixel dimensions for an aspect + resolution setting.
 * 720p / 1080p refer to the SHORT edge; `source` caps the long edge at 1920.
 */
export function outputDims(
  aspect: AspectId,
  resolution: ResolutionId,
  sourceLongEdge = 1920,
): { w: number; h: number } {
  const { w: aw, h: ah } = ASPECTS[aspect]
  if (resolution === 'source') {
    const long = Math.min(1920, Math.max(2, even(sourceLongEdge)))
    if (aw >= ah) return { w: even(long), h: even((long * ah) / aw) }
    return { w: even((long * aw) / ah), h: even(long) }
  }
  const short = resolution === '720p' ? 720 : 1080
  if (aw >= ah) return { w: even((short * aw) / ah), h: even(short) }
  return { w: even(short), h: even((short * ah) / aw) }
}

/** Preview (live canvas) pixel dimensions — capped at 1280 long edge. */
export function previewDims(aspect: AspectId): { w: number; h: number } {
  return outputDims(aspect, 'source', 1280)
}

/** Effective source duration of a slot (video length, or still hold time). */
export function slotDuration(slot: SlotState): number {
  if (!slot.media) return 0
  return slot.media.kind === 'video' ? slot.media.duration : slot.imageDuration
}

/** Timeline duration per the export duration rules. */
export function timelineDuration(
  before: SlotState,
  after: SlotState,
  settings: ExportSettings,
): number {
  const db = slotDuration(before)
  const da = slotDuration(after)
  if (!before.media && !after.media) return 0
  if (!before.media) return da
  if (!after.media) return db
  switch (settings.durationMode) {
    case 'shortest':
      return Math.min(db, da)
    case 'custom':
      return Math.min(60, Math.max(1, settings.customDuration))
    case 'longest':
    default:
      return Math.max(db, da)
  }
}

/**
 * Where a video side should be at timeline time `t`, honoring the
 * "shorter video loops or freezes on last frame" rule.
 */
export function videoTimeAt(t: number, videoDur: number, loop: boolean): number {
  if (videoDur <= 0) return 0
  if (loop && t > videoDur) return t % videoDur
  return Math.min(t, Math.max(0, videoDur - 0.04))
}

/** 0..1 Ken Burns progress for a still at timeline time t. */
export function stillProgressAt(t: number, holdDur: number): number {
  if (holdDur <= 0) return 0
  return Math.min(1, Math.max(0, t / holdDur))
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const rest = s - m * 60
  return `${String(m).padStart(2, '0')}:${rest.toFixed(1).padStart(4, '0')}`
}

export function fmtTimecode(sec: number): string {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const ss = Math.floor(s - m * 60)
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export function slugify(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'untitled-comparison'
}

/** Rough output-size estimate in MB (heuristic per editor.md §4.4). */
export function estimateSizeMB(
  settings: ExportSettings,
  timelineDur: number,
  speed: number,
): number {
  const resFactor = settings.resolution === '720p' ? 0.55 : settings.resolution === '1080p' ? 1 : 1.6
  const fpsFactor = settings.fps / 30
  const fmtFactor = settings.format === 'webm' ? 0.7 : 1
  const mbps = 8 * resFactor * fpsFactor * fmtFactor
  const dur = timelineDur / Math.max(0.25, speed)
  return Math.max(0.5, Math.round(((mbps * dur) / 8) * 10) / 10)
}

export function classifyFile(file: File): MediaKind | null {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('image/')) return 'image'
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (['mp4', 'webm', 'mov', 'm4v', 'ogv', 'mkv'].includes(ext)) return 'video'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg'].includes(ext)) return 'image'
  return null
}

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ['mp3', 'wav', 'm4a', 'ogg', 'oga', 'aac', 'flac', 'opus'].includes(ext)
}

export const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const
