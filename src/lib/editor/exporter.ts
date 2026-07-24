/**
 * Export pipeline (editor.md §5).
 *
 * WebM fast path: realtime playback composited into a render canvas,
 * canvas.captureStream(fps) + MediaRecorder. Audio from video slots is mixed
 * through an AudioContext (before panned left, after panned right).
 *
 * MP4 path: offline frame-stepped render — seek videos frame by frame, grab
 * JPEG frames into FFmpeg.wasm FS, encode libx264/yuv420p, optionally mixing
 * the source audio (pan L/R + atempo when speed ≠ 1).
 */
import { drawFrame } from './compositor'
import type { FrameSource } from './compositor'
import { ensureBannerFonts } from './banner'
import { destroyFFmpeg, getFFmpeg } from './ffmpeg'
import type { ExportSettings, SlotMedia } from './types'
import { outputDims, videoTimeAt } from './types'

export class ExportCancelled extends Error {
  constructor() {
    super('Export cancelled')
    this.name = 'ExportCancelled'
  }
}

export interface ExportMusic {
  file: File
  /** 0..1 */
  volume: number
  /** loop the track when shorter than the export duration */
  loop: boolean
  /** keep the original video audio (L/R pan mix) alongside the music */
  keepOriginal: boolean
}

export interface ExportJob {
  source: FrameSource
  settings: ExportSettings
  /** timeline seconds (per duration rules) */
  timelineDur: number
  speed: number
  loop: boolean
  /** optional background music track mixed into the export */
  music?: ExportMusic | null
  onProgress: (pct: number, phase: string) => void
  isCancelled: () => boolean
  /** called after each composited frame — used for the modal's live mini preview */
  onFrame?: (canvas: HTMLCanvasElement) => void
}

export interface ExportOutput {
  blob: Blob
  ext: 'mp4' | 'webm'
  width: number
  height: number
  duration: number
}

/* ------------------------------ helpers --------------------------------- */

function videoOf(slot: { media: SlotMedia | null }): HTMLVideoElement | null {
  return slot.media && slot.media.kind === 'video' ? (slot.media.el as HTMLVideoElement) : null
}

function seekVideo(v: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(v.currentTime - time) < 0.005 && v.readyState >= 2) {
      resolve()
      return
    }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      v.removeEventListener('seeked', finish)
      resolve()
    }
    v.addEventListener('seeked', finish)
    setTimeout(finish, 1500) // don't hang forever on a bad seek
    try {
      v.currentTime = time
    } catch {
      finish()
    }
  })
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Frame capture failed'))),
      type,
      quality,
    )
  })
}

function pickWebmMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c
    } catch {
      /* continue */
    }
  }
  return null
}

export const webmSupported = () => pickWebmMime() !== null

/** Decompose a speed factor into legal atempo factors (0.5..2 each). */
function atempoChain(speed: number): string[] {
  const parts: string[] = []
  let s = speed
  while (s < 0.5) {
    parts.push('atempo=0.5')
    s /= 0.5
  }
  while (s > 2) {
    parts.push('atempo=2.0')
    s /= 2
  }
  parts.push(`atempo=${s.toFixed(4)}`)
  return parts
}

function extOf(name: string): string {
  const e = name.split('.').pop()?.toLowerCase() ?? ''
  return /^[a-z0-9]{2,5}$/.test(e) ? e : 'mp4'
}

/* ------------------------------ WebM path ------------------------------- */

export async function exportWebM(job: ExportJob): Promise<ExportOutput> {
  const mime = pickWebmMime()
  if (!mime) throw new Error("This browser can't record WebM — try Chrome, Edge or Firefox.")

  const { settings, timelineDur, speed, loop, source } = job
  const dims = outputDims(
    source.layout.aspect,
    settings.resolution,
    Math.max(source.before.media?.width ?? 0, source.after.media?.width ?? 0, source.before.media?.height ?? 0, source.after.media?.height ?? 0, 1920),
  )
  const canvas = document.createElement('canvas')
  canvas.width = dims.w
  canvas.height = dims.h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable.')

  const vids = [videoOf(source.before), videoOf(source.after)].filter(
    (v): v is HTMLVideoElement => !!v,
  )
  const music = job.music ?? null
  const videoAudio = settings.includeAudio && vids.length > 0 && (!music || music.keepOriginal)
  const wantAudio = videoAudio || !!music

  // --- audio mix graph (before L / after R, + music bus) ---
  let audioCtx: AudioContext | null = null
  let audioDest: MediaStreamAudioDestinationNode | null = null
  let musicNode: AudioBufferSourceNode | null = null
  if (wantAudio) {
    audioCtx = new AudioContext()
    audioDest = audioCtx.createMediaStreamDestination()
    if (videoAudio) {
      vids.forEach((v, i) => {
        const srcNode = audioCtx!.createMediaElementSource(v)
        const pan = audioCtx!.createStereoPanner()
        pan.pan.value = vids.length === 1 ? 0 : i === 0 ? -1 : 1
        srcNode.connect(pan)
        pan.connect(audioDest!)
      })
    }
    if (music) {
      try {
        const buf = await audioCtx.decodeAudioData(await music.file.arrayBuffer())
        musicNode = audioCtx.createBufferSource()
        musicNode.buffer = buf
        musicNode.loop = music.loop
        const gain = audioCtx.createGain()
        gain.gain.value = Math.min(1, Math.max(0, music.volume))
        musicNode.connect(gain)
        gain.connect(audioDest)
      } catch {
        musicNode = null // undecodable track — continue with video audio only
      }
    }
  }

  const stream = canvas.captureStream(settings.fps)
  if (audioDest) {
    for (const track of audioDest.stream.getAudioTracks()) stream.addTrack(track)
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: dims.w * dims.h >= 1920 * 1080 ? 12_000_000 : 8_000_000,
    audioBitsPerSecond: 128_000,
  })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const cleanup = () => {
    if (musicNode) {
      try {
        musicNode.stop()
      } catch {
        /* noop */
      }
      musicNode.disconnect()
    }
    vids.forEach((v) => {
      try {
        v.pause()
        v.muted = true
        v.playbackRate = 1
      } catch {
        /* noop */
      }
    })
    if (audioCtx) {
      audioCtx.close().catch(() => undefined)
    }
  }

  // position videos at timeline start
  for (const v of vids) {
    const dur = v.duration || 0
    await seekVideo(v, videoTimeAt(0, dur, loop))
  }

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    recorder.onerror = () => reject(new Error('Recorder failed'))
  })

  job.onProgress(0, 'Compositing frames…')
  recorder.start(250)

  try {
    if (musicNode) {
      try {
        musicNode.start()
      } catch {
        /* noop */
      }
    }
    vids.forEach((v) => {
      // when music replaces the original audio, keep the videos silent
      v.muted = music ? !videoAudio : false
      v.playbackRate = speed
      void v.play().catch(() => undefined)
    })

    let t = 0
    let last = performance.now()
    await new Promise<void>((resolve, reject) => {
      const tick = (now: number) => {
        if (job.isCancelled()) {
          reject(new ExportCancelled())
          return
        }
        const dt = Math.min(0.25, (now - last) / 1000)
        last = now
        t += dt * speed
        // drift-correct videos toward the timeline clock
        for (const v of vids) {
          const dur = v.duration || 0
          const expected = videoTimeAt(t, dur, loop)
          if (t > dur && !loop) {
            if (!v.paused) v.pause()
          } else if (Math.abs(v.currentTime - expected) > 0.15) {
            try {
              v.currentTime = expected
            } catch {
              /* noop */
            }
          }
        }
        drawFrame(ctx, dims.w, dims.h, source, t, { forExport: true })
        job.onFrame?.(canvas)
        job.onProgress(Math.min(0.99, t / timelineDur), 'Compositing frames…')
        if (t >= timelineDur) {
          resolve()
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  } finally {
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        /* noop */
      }
    }
    cleanup()
  }

  const blob = await stopped
  if (job.isCancelled()) throw new ExportCancelled()
  job.onProgress(1, 'Finalizing…')
  return { blob, ext: 'webm', width: dims.w, height: dims.h, duration: timelineDur / speed }
}

/* ------------------------------ MP4 path -------------------------------- */

export async function exportMP4(job: ExportJob): Promise<ExportOutput> {
  const { settings, timelineDur, speed, loop, source } = job
  const dims = outputDims(
    source.layout.aspect,
    settings.resolution,
    Math.max(source.before.media?.width ?? 0, source.after.media?.width ?? 0, source.before.media?.height ?? 0, source.after.media?.height ?? 0, 1920),
  )
  const outDur = timelineDur / speed
  const totalFrames = Math.max(1, Math.round(outDur * settings.fps))

  job.onProgress(0, 'Loading FFmpeg…')
  let ff
  try {
    ff = await getFFmpeg()
  } catch {
    throw new Error("Couldn't load the MP4 encoder (network blocked?) — try WebM instead.")
  }
  if (job.isCancelled()) throw new ExportCancelled()

  const canvas = document.createElement('canvas')
  canvas.width = dims.w
  canvas.height = dims.h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable.')

  const vids = [videoOf(source.before), videoOf(source.after)].filter(
    (v): v is HTMLVideoElement => !!v,
  )
  const vidMedia = [source.before.media, source.after.media].filter(
    (m): m is SlotMedia => !!m && m.kind === 'video',
  )
  const music = job.music ?? null
  const videoAudio = settings.includeAudio && vidMedia.length > 0 && (!music || music.keepOriginal)
  const wantAudio = videoAudio || !!music

  // --- frame stepping ---
  for (let i = 0; i < totalFrames; i++) {
    if (job.isCancelled()) {
      destroyFFmpeg()
      throw new ExportCancelled()
    }
    const t = (i / settings.fps) * speed
    for (const v of vids) {
      await seekVideo(v, videoTimeAt(t, v.duration || 0, loop))
    }
    drawFrame(ctx, dims.w, dims.h, source, t, { forExport: true })
    job.onFrame?.(canvas)
    const jpg = await canvasBlob(canvas, 'image/jpeg', 0.92)
    await ff.writeFile(`f_${String(i).padStart(5, '0')}.jpg`, new Uint8Array(await jpg.arrayBuffer()))
    job.onProgress(
      (i / totalFrames) * 0.65,
      `Compositing frames… ${i + 1}/${totalFrames}`,
    )
  }

  // --- audio inputs ---
  const audioNames: string[] = []
  if (videoAudio) {
    for (let i = 0; i < vidMedia.length; i++) {
      const name = `src${i}.${extOf(vidMedia[i].fileName)}`
      await ff.writeFile(name, new Uint8Array(await vidMedia[i].file.arrayBuffer()))
      audioNames.push(name)
    }
  }
  let musicName: string | null = null
  if (music) {
    musicName = `music.${extOf(music.file.name)}`
    await ff.writeFile(musicName, new Uint8Array(await music.file.arrayBuffer()))
  }

  type AudioMode = 'full' | 'music' | 'none'
  const buildArgs = (mode: AudioMode): string[] => {
    const useVideo = mode === 'full' && videoAudio && audioNames.length > 0
    const useMusic = (mode === 'full' || mode === 'music') && !!musicName
    const args = ['-framerate', String(settings.fps), '-i', 'f_%05d.jpg']
    if (useVideo) for (const n of audioNames) args.push('-i', n)
    if (useMusic) args.push('-i', musicName!)
    const musicIdx = (useVideo ? audioNames.length : 0) + 1

    const maps: string[] = []
    const parts: string[] = []
    const tempo = Math.abs(speed - 1) > 0.001 ? atempoChain(speed) : null
    let videoLabel: string | null = null
    if (useVideo) {
      if (audioNames.length === 1) {
        if (tempo) {
          parts.push(`[1:a]${tempo.join(',')}[av]`)
          videoLabel = 'av'
        } else if (useMusic) {
          parts.push('[1:a]anull[av]')
          videoLabel = 'av'
        }
      } else {
        const t = tempo ? `,${tempo.join(',')}` : ''
        parts.push(`[1:a]pan=stereo|c0=c0|c1=0${t}[a1]`)
        parts.push(`[2:a]pan=stereo|c0=0|c1=c0${t}[a2]`)
        parts.push('[a1][a2]amix=inputs=2:duration=first[av]')
        videoLabel = 'av'
      }
    }
    let musicLabel: string | null = null
    if (useMusic && music) {
      const vol = Math.min(1, Math.max(0, music.volume)).toFixed(3)
      const loopF = music.loop ? ',aloop=loop=-1:size=2e9' : ''
      parts.push(
        `[${musicIdx}:a]volume=${vol}${loopF},apad,atrim=0:${outDur.toFixed(3)},asetpts=PTS-STARTPTS[mu]`,
      )
      musicLabel = 'mu'
    }
    let outLabel: string | null = null
    if (videoLabel && musicLabel) {
      // music is padded/trimmed to the output duration, so it anchors the mix
      parts.push(`[${musicLabel}][${videoLabel}]amix=inputs=2:duration=first:normalize=0[aout]`)
      outLabel = 'aout'
    } else if (videoLabel) {
      outLabel = videoLabel
    } else if (musicLabel) {
      outLabel = musicLabel
    }

    if (parts.length) args.push('-filter_complex', parts.join(';'))
    if (outLabel) {
      maps.push('-map', '0:v', '-map', `[${outLabel}]`)
    } else if (useVideo) {
      // single video source, no tempo/music processing needed
      maps.push('-map', '0:v', '-map', '1:a?')
    } else {
      args.push('-an')
    }
    return [
      ...args,
      ...maps,
      '-t',
      outDur.toFixed(3),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-r',
      String(settings.fps),
      '-movflags',
      '+faststart',
      'out.mp4',
    ]
  }

  const totalMicros = outDur * 1_000_000
  const onProgress = ({ time }: { progress: number; time: number }) => {
    const ratio = Math.min(1, Math.max(0, time / totalMicros))
    job.onProgress(0.65 + ratio * 0.34, 'Encoding H.264…')
  }
  ff.on('progress', onProgress)

  let ok = false
  let lastErr: unknown = null
  const attempts: AudioMode[] = []
  if (wantAudio) attempts.push('full')
  if (wantAudio && videoAudio && musicName) attempts.push('music') // sources may lack audio streams
  attempts.push('none')
  for (const mode of attempts) {
    try {
      const code = await ff.exec(buildArgs(mode))
      if (code === 0) {
        ok = true
        break
      }
    } catch (e) {
      lastErr = e
    }
    // retry with a degraded audio graph (e.g. sources had no audio streams)
    try {
      await ff.deleteFile('out.mp4')
    } catch {
      /* noop */
    }
  }
  ff.off('progress', onProgress)

  if (job.isCancelled()) {
    destroyFFmpeg()
    throw new ExportCancelled()
  }
  if (!ok) {
    // eslint-disable-next-line no-console
    console.error('ffmpeg failed', lastErr)
    throw new Error("This browser can't encode MP4 — try WebM instead.")
  }

  job.onProgress(0.99, 'Muxing…')
  const data = await ff.readFile('out.mp4')
  // cleanup FS (best-effort)
  try {
    await ff.deleteFile('out.mp4')
    for (const n of audioNames) await ff.deleteFile(n)
    if (musicName) await ff.deleteFile(musicName)
    for (let i = 0; i < totalFrames; i++) await ff.deleteFile(`f_${String(i).padStart(5, '0')}.jpg`)
  } catch {
    /* noop */
  }

  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const blob = new Blob([bytes.slice()], { type: 'video/mp4' })
  job.onProgress(1, 'Done')
  return { blob, ext: 'mp4', width: dims.w, height: dims.h, duration: outDur }
}

export async function exportVideo(job: ExportJob): Promise<ExportOutput> {
  // the Nastaliq webfont must be registered before the first frame — needed
  // by the template banner AND by any text box using the Nastaliq font
  const needsNastaliq =
    (job.source.banner?.enabled && job.source.banner.mode === 'template') ||
    !!job.source.textBoxes?.some((b) => b.fontFamily === 'nastaliq')
  if (needsNastaliq) {
    job.onProgress(0, 'Loading Urdu font…')
    await ensureBannerFonts()
  }
  return job.settings.format === 'mp4' ? exportMP4(job) : exportWebM(job)
}
