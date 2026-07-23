/**
 * Lazy FFmpeg.wasm loader. The single-threaded @ffmpeg/core build is used so
 * MP4 export works WITHOUT cross-origin isolation / SharedArrayBuffer.
 * Core files are pulled from the unpkg CDN as blobs (toBlobURL) so no COOP/COEP
 * headers are required. Loaded only when an MP4 export is requested.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

let instance: FFmpeg | null = null
let loading: Promise<FFmpeg> | null = null

export function getFFmpeg(onLog?: (message: string) => void): Promise<FFmpeg> {
  if (instance) {
    if (onLog) instance.on('log', ({ message }) => onLog(message))
    return Promise.resolve(instance)
  }
  if (loading) return loading
  loading = (async () => {
    const ff = new FFmpeg()
    if (onLog) ff.on('log', ({ message }) => onLog(message))
    const coreURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript')
    const wasmURL = await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm')
    await ff.load({ coreURL, wasmURL })
    instance = ff
    return ff
  })().catch((e) => {
    loading = null
    instance = null
    throw e
  })
  return loading
}

/** Terminate the worker (used on cancel / fatal error). Next call re-loads. */
export function destroyFFmpeg() {
  try {
    instance?.terminate()
  } catch {
    /* noop */
  }
  instance = null
  loading = null
}

export const sabAvailable = typeof SharedArrayBuffer !== 'undefined'
