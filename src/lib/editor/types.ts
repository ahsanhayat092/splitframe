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

export interface SlotState {
  media: SlotMedia | null
  /** Decode / read error message, if any. */
  error: string | null
  /** Hold duration (seconds) when the slot holds a still image. */
  imageDuration: number
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
}

export interface FooterCaptionState extends HeaderCaptionState {
  detail: string
}

export interface LogoState {
  img: HTMLImageElement | null
  url: string | null
  name: string | null
  /** 0..8 row-major: 0=TL 1=TC 2=TR 3=ML 4=C 5=MR 6=BL 7=BC 8=BR */
  grid: number
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
}

export const DEFAULT_FOOTER: FooterCaptionState = {
  show: true,
  text: '',
  detail: '',
  style: { ...DEFAULT_CAPTION_STYLE, size: 'S', bold: false },
}

export const DEFAULT_LOGO: LogoState = {
  img: null,
  url: null,
  name: null,
  grid: 8,
  offsetX: 0,
  offsetY: 0,
  sizePct: 12,
  opacity: 0.9,
  padding: 24,
  burnIn: true,
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

export const EMPTY_SLOT: SlotState = {
  media: null,
  error: null,
  imageDuration: 3,
  loading: false,
}

/* ------------------------------- helpers -------------------------------- */

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

export const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const
