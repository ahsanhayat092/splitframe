/**
 * Media ingestion: File -> SlotMedia (video/image element + metadata + thumbnail).
 */
import type { MediaKind, SlotMedia } from './types'

const MAX_BYTES = 500 * 1024 * 1024 // 500MB per editor.md §2.1

export class MediaError extends Error {}

function makeVideoThumb(video: HTMLVideoElement): string {
  try {
    const c = document.createElement('canvas')
    const scale = Math.min(1, 480 / Math.max(video.videoWidth, 1))
    c.width = Math.max(2, Math.round(video.videoWidth * scale))
    c.height = Math.max(2, Math.round(video.videoHeight * scale))
    const ctx = c.getContext('2d')
    if (!ctx) return ''
    ctx.drawImage(video, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  } catch {
    return ''
  }
}

function makeImageThumb(img: HTMLImageElement): string {
  try {
    const c = document.createElement('canvas')
    const scale = Math.min(1, 480 / Math.max(img.naturalWidth, 1))
    c.width = Math.max(2, Math.round(img.naturalWidth * scale))
    c.height = Math.max(2, Math.round(img.naturalHeight * scale))
    const ctx = c.getContext('2d')
    if (!ctx) return ''
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  } catch {
    return ''
  }
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'auto'
    v.muted = true
    v.playsInline = true
    v.crossOrigin = 'anonymous'
    const onErr = () => {
      cleanup()
      reject(new MediaError("This codec isn't supported by your browser."))
    }
    const onMeta = () => {
      // Seek to a tiny offset so the first frame is decoded for thumbnails/export.
      const seek = () => {
        cleanup()
        resolve(v)
      }
      v.addEventListener('seeked', seek, { once: true })
      try {
        v.currentTime = Math.min(0.05, (v.duration || 1) / 10)
      } catch {
        cleanup()
        resolve(v)
      }
      // Safety: resolve anyway if no seeked within 3s
      setTimeout(() => {
        cleanup()
        resolve(v)
      }, 3000)
    }
    const cleanup = () => {
      v.removeEventListener('error', onErr)
      v.removeEventListener('loadedmetadata', onMeta)
    }
    v.addEventListener('error', onErr)
    v.addEventListener('loadedmetadata', onMeta)
    v.src = url
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new MediaError("This image can't be decoded by your browser."))
    img.src = url
  })
}

/** Probe a rough fps for a video using requestVideoFrameCallback when available. */
function probeFps(v: HTMLVideoElement): number | undefined {
  void v
  return undefined // browsers don't expose fps; meta line shows it only when known
}

export async function loadSlotMedia(file: File, kind: MediaKind): Promise<SlotMedia> {
  if (file.size > MAX_BYTES) {
    throw new MediaError('File exceeds the 500MB limit.')
  }
  const url = URL.createObjectURL(file)
  try {
    if (kind === 'video') {
      const v = await loadVideo(url)
      const media: SlotMedia = {
        kind,
        file,
        url,
        fileName: file.name,
        width: v.videoWidth,
        height: v.videoHeight,
        duration: Number.isFinite(v.duration) ? v.duration : 0,
        fps: probeFps(v),
        el: v,
        thumbnail: makeVideoThumb(v),
      }
      return media
    }
    const img = await loadImage(url)
    // Ensure decoded for canvas draw
    try {
      await img.decode()
    } catch {
      /* non-fatal */
    }
    return {
      kind,
      file,
      url,
      fileName: file.name,
      width: img.naturalWidth,
      height: img.naturalHeight,
      duration: 0,
      el: img,
      thumbnail: makeImageThumb(img),
    }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

export function disposeSlotMedia(media: SlotMedia | null) {
  if (!media) return
  if (media.kind === 'video') {
    const v = media.el as HTMLVideoElement
    try {
      v.pause()
      v.removeAttribute('src')
      v.load()
    } catch {
      /* noop */
    }
  }
  URL.revokeObjectURL(media.url)
}

export function truncateMiddle(name: string, max = 26): string {
  if (name.length <= max) return name
  const half = Math.floor((max - 1) / 2)
  return `${name.slice(0, half)}…${name.slice(-half)}`
}
