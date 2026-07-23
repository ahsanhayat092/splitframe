/**
 * SplitFrame Editor — the complete before/after comparison studio (editor.md).
 * Dual upload slots, live compositor canvas, captions, logo overlay, layout
 * controls, synced transport, and client-side MP4/WebM export.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, TriangleAlert } from 'lucide-react'
import type {
  AudioTrackState,
  BannerState,
  CropRect,
  EditorStatus,
  ExportSettings,
  FooterCaptionState,
  HeaderCaptionState,
  LayoutState,
  LogoState,
  Side,
  SlotState,
  TransportState,
} from '@/lib/editor/types'
import {
  DEFAULT_AUDIO,
  DEFAULT_BANNER,
  DEFAULT_EXPORT,
  DEFAULT_FOOTER,
  DEFAULT_HEADER,
  DEFAULT_LAYOUT,
  DEFAULT_LOGO,
  DEFAULT_TRANSPORT,
  EMPTY_SLOT,
  classifyFile,
  isAudioFile,
  previewDims,
  slugify,
  timelineDuration,
  videoTimeAt,
} from '@/lib/editor/types'
import { ensureBannerFonts } from '@/lib/editor/banner'
import { disposeSlotMedia, loadSlotMedia } from '@/lib/editor/media'
import { drawFrame } from '@/lib/editor/compositor'
import type { FrameSource } from '@/lib/editor/compositor'
import { ExportCancelled, exportVideo, webmSupported } from '@/lib/editor/exporter'
import TopBar from '@/components/editor/TopBar'
import MediaPanel from '@/components/editor/MediaPanel'
import Stage from '@/components/editor/Stage'
import Inspector from '@/components/editor/Inspector'
import type { InspectorTabId } from '@/components/editor/Inspector'
import RenderModal from '@/components/editor/RenderModal'
import type { RenderPhase, RenderResult } from '@/components/editor/RenderModal'
import Coachmarks, { coachmarksSeen } from '@/components/editor/Coachmarks'
import Toasts from '@/components/editor/Toasts'
import type { ToastItem } from '@/components/editor/Toasts'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface RenderState {
  open: boolean
  phase: RenderPhase
  pct: number
  phaseLabel: string
  result: RenderResult | null
  error: string | null
}

const IDLE_RENDER: RenderState = {
  open: false,
  phase: 'idle',
  pct: 0,
  phaseLabel: '',
  result: null,
  error: null,
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Where the music track should be at output-time `t` (seconds). */
function musicTimeAt(t: number, dur: number, loop: boolean): number {
  if (dur <= 0) return 0
  if (loop) return t % dur
  return Math.min(t, Math.max(0, dur - 0.05))
}

export default function Editor() {
  /* ------------------------------- state -------------------------------- */
  const [before, setBefore] = useState<SlotState>(EMPTY_SLOT)
  const [after, setAfter] = useState<SlotState>(EMPTY_SLOT)
  const [header, setHeader] = useState<HeaderCaptionState>(DEFAULT_HEADER)
  const [footer, setFooter] = useState<FooterCaptionState>(DEFAULT_FOOTER)
  const [logo, setLogo] = useState<LogoState>(DEFAULT_LOGO)
  const [banner, setBanner] = useState<BannerState>(DEFAULT_BANNER)
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT)
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT)
  const [audio, setAudio] = useState<AudioTrackState>(DEFAULT_AUDIO)
  const [cropMode, setCropMode] = useState<Side | null>(null)
  const [transport, setTransport] = useState<TransportState>(DEFAULT_TRANSPORT)
  const [projectName, setProjectName] = useState('untitled-comparison')
  const [status, setStatus] = useState<EditorStatus>('ready')
  const [tab, setTab] = useState<InspectorTabId>('captions')
  const [flashCaptions, setFlashCaptions] = useState(0)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [showCoach, setShowCoach] = useState(() => !coachmarksSeen())
  const [render, setRender] = useState<RenderState>(IDLE_RENDER)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  /* -------------------------------- refs -------------------------------- */
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderPreviewRef = useRef<HTMLCanvasElement | null>(null)
  const videoPoolRef = useRef<HTMLDivElement | null>(null)
  const musicPreviewRef = useRef<HTMLAudioElement | null>(null)
  const timeRef = useRef(0)
  const cancelRef = useRef(false)
  const toastId = useRef(0)
  const browseFns = useRef<Partial<Record<Side, () => void>>>({})

  const timelineDur = timelineDuration(before, after, exportSettings)
  const canExport = !!(before.media && after.media)
  const anyVideo = before.media?.kind === 'video' || after.media?.kind === 'video'
  const dims = previewDims(layout.aspect)

  // latest-state mirror for the rAF loop & imperative handlers
  const stateRef = useRef({ before, after, header, footer, logo, banner, layout, exportSettings, audio, cropMode, transport })
  useEffect(() => {
    stateRef.current = { before, after, header, footer, logo, banner, layout, exportSettings, audio, cropMode, transport }
  })
  const timelineDurRef = useRef(timelineDur)
  useEffect(() => {
    timelineDurRef.current = timelineDur
  }, [timelineDur])

  const frameSource = (s = stateRef.current): FrameSource => ({
    before: s.before,
    after: s.after,
    layout: s.layout,
    header: s.header,
    footer: s.footer,
    logo: s.logo,
    banner: s.banner,
    cropEditing: s.cropMode,
  })

  /* ------------------------------- toasts ------------------------------- */
  const pushToast = useCallback((message: string, kind: ToastItem['kind'] = 'error') => {
    const id = ++toastId.current
    setToasts((ts) => [...ts, { id, message, kind }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4000)
  }, [])

  /* ---------------------------- slot actions ---------------------------- */
  const setSlot = (side: Side, patch: Partial<SlotState>) => {
    if (side === 'before') setBefore((s) => ({ ...s, ...patch }))
    else setAfter((s) => ({ ...s, ...patch }))
  }

  const loadFile = useCallback(
    async (side: Side, file: File) => {
      const kind = classifyFile(file)
      if (!kind) {
        const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : 'that file'
        pushToast(`Can't read ${ext} — try MP4, WebM, PNG or JPG.`)
        return
      }
      setSlot(side, { loading: true, error: null })
      try {
        const media = await loadSlotMedia(file, kind)
        const prev = stateRef.current[side]
        disposeSlotMedia(prev.media)
        setSlot(side, { media, loading: false, error: null, crop: null })
        setCropMode((m) => (m === side ? null : m))
        timeRef.current = 0
        setTransport((t) => ({ ...t, time: 0, playing: false }))
      } catch (e) {
        setSlot(side, {
          loading: false,
          error: e instanceof Error ? e.message : 'This file could not be read.',
        })
      }
    },
    [pushToast],
  )

  const removeSlot = useCallback((side: Side) => {
    const prev = stateRef.current[side]
    disposeSlotMedia(prev.media)
    setSlot(side, { ...EMPTY_SLOT, imageDuration: prev.imageDuration })
    setCropMode((m) => (m === side ? null : m))
    timeRef.current = 0
    setTransport((t) => ({ ...t, time: 0, playing: false }))
  }, [])

  const swapSides = useCallback(() => {
    const { before: b, after: a } = stateRef.current
    setBefore(a)
    setAfter(b)
    setCropMode(null)
  }, [])

  /* ---------------------------- crop actions ---------------------------- */
  const onCropMode = useCallback((side: Side | null) => {
    if (side) setTransport((t) => ({ ...t, playing: false }))
    setCropMode(side)
  }, [])

  const onCrop = useCallback((side: Side, crop: CropRect | null) => {
    setSlot(side, { crop })
  }, [])

  /* ---------------------------- audio actions --------------------------- */
  const onAudioFile = useCallback(
    (file: File) => {
      if (!isAudioFile(file)) {
        pushToast('Audio must be MP3, WAV, M4A or OGG.')
        return
      }
      const url = URL.createObjectURL(file)
      // probe duration with a throwaway element
      const probe = document.createElement('audio')
      probe.preload = 'metadata'
      probe.onloadedmetadata = () => {
        const duration = Number.isFinite(probe.duration) ? probe.duration : 0
        const prev = stateRef.current.audio
        if (prev.url) URL.revokeObjectURL(prev.url)
        setAudio((a) => ({ ...a, file, url, name: file.name, duration }))
        probe.removeAttribute('src')
      }
      probe.onerror = () => {
        URL.revokeObjectURL(url)
        pushToast("Couldn't decode that audio file.")
      }
      probe.src = url
    },
    [pushToast],
  )

  const onAudioRemove = useCallback(() => {
    const prev = stateRef.current.audio
    if (prev.url) URL.revokeObjectURL(prev.url)
    setAudio((a) => ({ ...DEFAULT_AUDIO, volume: a.volume, loop: a.loop, keepOriginal: a.keepOriginal }))
  }, [])

  const onAudioPatch = useCallback(
    (p: Partial<AudioTrackState>) => setAudio((a) => ({ ...a, ...p })),
    [],
  )

  const onImageDuration = useCallback((side: Side, sec: number) => {
    setSlot(side, { imageDuration: sec })
  }, [])

  const registerBrowse = useCallback((side: Side, fn: () => void) => {
    browseFns.current[side] = fn
  }, [])

  /* ---------------------------- logo actions ---------------------------- */
  const onLogoFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        pushToast('Logo must be an image — PNG or SVG recommended.')
        return
      }
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const prev = stateRef.current.logo
        if (prev.url) URL.revokeObjectURL(prev.url)
        setLogo((l) => ({ ...l, img, url, name: file.name }))
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        pushToast("Couldn't decode that logo image.")
      }
      img.src = url
    },
    [pushToast],
  )

  const onLogoRemove = useCallback(() => {
    const prev = stateRef.current.logo
    if (prev.url) URL.revokeObjectURL(prev.url)
    setLogo((l) => ({ ...DEFAULT_LOGO, burnIn: l.burnIn }))
  }, [])

  /* --------------------------- banner actions --------------------------- */
  const onBannerPatch = useCallback(
    (p: Partial<BannerState>) => setBanner((b) => ({ ...b, ...p })),
    [],
  )

  const onBannerImage = useCallback(
    (slot: 'emblem' | 'photo' | 'upload', file: File) => {
      if (!file.type.startsWith('image/')) {
        pushToast('Banner images must be PNG, JPG, WebP or SVG.')
        return
      }
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const prev = stateRef.current.banner
        const prevSlot = slot === 'upload' ? prev.upload : prev.template[slot]
        if (prevSlot.url) URL.revokeObjectURL(prevSlot.url)
        setBanner((b) => {
          if (slot === 'upload') {
            return { ...b, upload: { ...b.upload, img, url, name: file.name } }
          }
          return {
            ...b,
            template: { ...b.template, [slot]: { img, url, name: file.name } },
          }
        })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        pushToast("Couldn't decode that image.")
      }
      img.src = url
    },
    [pushToast],
  )

  const onBannerImageRemove = useCallback((slot: 'emblem' | 'photo' | 'upload') => {
    const prev = stateRef.current.banner
    const prevSlot = slot === 'upload' ? prev.upload : prev.template[slot]
    if (prevSlot.url) URL.revokeObjectURL(prevSlot.url)
    setBanner((b) => {
      const empty = { img: null, url: null, name: null }
      if (slot === 'upload') return { ...b, upload: { ...b.upload, ...empty } }
      return { ...b, template: { ...b.template, [slot]: empty } }
    })
  }, [])

  // load the Nastaliq webfont as soon as the template banner is enabled, so
  // the preview swaps to the correct shaping as soon as it arrives
  useEffect(() => {
    if (banner.enabled && banner.mode === 'template') void ensureBannerFonts()
  }, [banner.enabled, banner.mode])

  /* --------------------------- video pool (DOM) -------------------------- */
  useEffect(() => {
    const pool = videoPoolRef.current
    if (!pool) return
    while (pool.firstChild) pool.removeChild(pool.firstChild)
    for (const slot of [before, after]) {
      if (slot.media?.kind === 'video') pool.appendChild(slot.media.el)
    }
  }, [before, after])

  // per-video property sync (mute / rate / loop)
  useEffect(() => {
    for (const slot of [before, after]) {
      if (slot.media?.kind === 'video') {
        const v = slot.media.el as HTMLVideoElement
        v.muted = transport.muted
        v.playbackRate = transport.speed
        v.loop = transport.loop
      }
    }
  }, [before, after, transport.muted, transport.speed, transport.loop])

  // music preview element lifecycle + property sync
  useEffect(() => {
    const el = musicPreviewRef.current
    if (!el) return
    if (audio.url) {
      if (el.src !== audio.url) el.src = audio.url
    } else {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
  }, [audio.url])

  useEffect(() => {
    const el = musicPreviewRef.current
    if (!el) return
    el.volume = Math.min(1, Math.max(0, audio.volume))
    el.loop = audio.loop
    el.muted = transport.muted
  }, [audio.volume, audio.loop, transport.muted])

  // play / pause side effects
  useEffect(() => {
    const s = stateRef.current
    for (const slot of [s.before, s.after]) {
      if (slot.media?.kind === 'video') {
        const v = slot.media.el as HTMLVideoElement
        if (transport.playing) {
          try {
            v.currentTime = videoTimeAt(timeRef.current, v.duration || 0, s.transport.loop)
          } catch {
            /* noop */
          }
          void v.play().catch(() => undefined)
        } else {
          v.pause()
        }
      }
    }
    const musicEl = musicPreviewRef.current
    if (musicEl && s.audio.url) {
      if (transport.playing) {
        try {
          musicEl.currentTime = musicTimeAt(
            timeRef.current / s.transport.speed,
            s.audio.duration,
            s.audio.loop,
          )
        } catch {
          /* noop */
        }
        void musicEl.play().catch(() => undefined)
      } else {
        musicEl.pause()
      }
    }
  }, [transport.playing])

  /* ------------------------- render + clock loop ------------------------- */
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let lastPush = 0
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const s = stateRef.current
      if (s.transport.playing) {
        const dur = timelineDurRef.current
        timeRef.current += dt * s.transport.speed
        if (dur <= 0) {
          timeRef.current = 0
        } else if (timeRef.current >= dur) {
          if (s.transport.loop) {
            timeRef.current = 0
          } else {
            timeRef.current = dur
            setTransport((t) => ({ ...t, playing: false }))
          }
        }
        // drift-correct video elements toward the master clock
        for (const slot of [s.before, s.after]) {
          if (slot.media?.kind === 'video') {
            const v = slot.media.el as HTMLVideoElement
            const expected = videoTimeAt(timeRef.current, v.duration || 0, s.transport.loop)
            if (v.readyState >= 1 && Math.abs(v.currentTime - expected) > 0.15) {
              try {
                v.currentTime = expected
              } catch {
                /* noop */
              }
            }
          }
        }
        // drift-correct the music preview (plays at 1× like in the export)
        const musicEl = musicPreviewRef.current
        if (musicEl && s.audio.url && s.audio.duration > 0) {
          const outT = timeRef.current / s.transport.speed
          if (!s.audio.loop && outT >= s.audio.duration) {
            if (!musicEl.paused) musicEl.pause()
          } else {
            const expected = musicTimeAt(outT, s.audio.duration, s.audio.loop)
            if (Math.abs(musicEl.currentTime - expected) > 0.3) {
              try {
                musicEl.currentTime = expected
              } catch {
                /* noop */
              }
            }
          }
        }
      }
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          drawFrame(ctx, canvas.width, canvas.height, frameSource(s), timeRef.current, {
            guides: s.transport.guides,
          })
        }
      }
      if (now - lastPush > 100) {
        lastPush = now
        setTransport((t) =>
          Math.abs(t.time - timeRef.current) > 0.001 ? { ...t, time: timeRef.current } : t,
        )
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // unmount cleanup — revoke everything
  useEffect(
    () => () => {
      const s = stateRef.current
      disposeSlotMedia(s.before.media)
      disposeSlotMedia(s.after.media)
      if (s.logo.url) URL.revokeObjectURL(s.logo.url)
      if (s.audio.url) URL.revokeObjectURL(s.audio.url)
      for (const slot of [s.banner.template.emblem, s.banner.template.photo, s.banner.upload]) {
        if (slot.url) URL.revokeObjectURL(slot.url)
      }
    },
    [],
  )

  /* ---------------------------- transport API ---------------------------- */
  const togglePlay = useCallback(() => {
    const dur = timelineDurRef.current
    if (dur <= 0) return
    if (!stateRef.current.transport.playing && timeRef.current >= dur - 0.001) {
      timeRef.current = 0
      setTransport((t) => ({ ...t, time: 0 }))
    }
    setTransport((t) => ({ ...t, playing: !t.playing }))
  }, [])

  const scrub = useCallback((time: number) => {
    const t = Math.min(Math.max(0, time), timelineDurRef.current || time)
    timeRef.current = t
    setTransport((tr) => ({ ...tr, time: t }))
    const s = stateRef.current
    for (const slot of [s.before, s.after]) {
      if (slot.media?.kind === 'video') {
        const v = slot.media.el as HTMLVideoElement
        try {
          v.currentTime = videoTimeAt(t, v.duration || 0, s.transport.loop)
        } catch {
          /* noop */
        }
      }
    }
    const musicEl = musicPreviewRef.current
    if (musicEl && s.audio.url) {
      try {
        musicEl.currentTime = musicTimeAt(t / s.transport.speed, s.audio.duration, s.audio.loop)
      } catch {
        /* noop */
      }
    }
  }, [])

  const patchTransport = useCallback(
    (patch: Partial<TransportState>) => setTransport((t) => ({ ...t, ...patch })),
    [],
  )

  /* ---------------------------- keyboard ----------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      const s = stateRef.current
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          scrub(timeRef.current - 1 / 30)
          break
        case 'ArrowRight':
          e.preventDefault()
          scrub(timeRef.current + 1 / 30)
          break
        case 'u':
        case 'U': {
          const side: Side = !s.before.media ? 'before' : !s.after.media ? 'after' : 'before'
          browseFns.current[side]?.()
          break
        }
        case 'g':
        case 'G':
          patchTransport({ guides: !s.transport.guides })
          break
        case 'e':
        case 'E':
          if (s.before.media && s.after.media) openRenderRef.current()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, scrub, patchTransport])

  /* --------------------------- caption focus ----------------------------- */
  const onCaptionClick = useCallback(() => {
    setTab('captions')
    setFlashCaptions((n) => n + 1)
  }, [])

  /* ------------------------------ snapshot ------------------------------ */
  const onSnapshot = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((b) => {
      if (!b) return
      const url = URL.createObjectURL(b)
      triggerDownload(url, `splitframe-${slugify(projectName)}.png`)
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      pushToast('Snapshot saved as PNG.', 'info')
    }, 'image/png')
  }, [projectName, pushToast])

  /* ------------------------------- export -------------------------------- */
  const openRender = useCallback(() => {
    const s = stateRef.current
    if (!s.before.media || !s.after.media) return
    cancelRef.current = false
    setCropMode(null)
    setTransport((t) => ({ ...t, playing: false }))
    setStatus('rendering')
    setRender({ ...IDLE_RENDER, open: true, phase: 'rendering', phaseLabel: 'Preparing…' })

    const settings = s.exportSettings
    const dur = timelineDuration(s.before, s.after, settings)
    const filename = `splitframe-${slugify(projectName)}.${settings.format}`

    exportVideo({
      source: { ...frameSource(s), cropEditing: null },
      settings,
      timelineDur: dur,
      speed: s.transport.speed,
      loop: s.transport.loop,
      music: s.audio.file
        ? {
            file: s.audio.file,
            volume: s.audio.volume,
            loop: s.audio.loop,
            keepOriginal: s.audio.keepOriginal,
          }
        : null,
      onProgress: (pct, phaseLabel) =>
        setRender((r) => (r.phase === 'rendering' ? { ...r, pct, phaseLabel } : r)),
      isCancelled: () => cancelRef.current,
      onFrame: (cv) => {
        const pv = renderPreviewRef.current
        if (!pv) return
        if (pv.width !== cv.width || pv.height !== cv.height) {
          pv.width = cv.width
          pv.height = cv.height
        }
        pv.getContext('2d')?.drawImage(cv, 0, 0)
      },
    })
      .then((out) => {
        const url = URL.createObjectURL(out.blob)
        const result: RenderResult = {
          blobUrl: url,
          filename,
          sizeLabel: `${(out.blob.size / 1048576).toFixed(1)} MB`,
          duration: out.duration,
          width: out.width,
          height: out.height,
          ext: out.ext,
        }
        setRender((r) => ({ ...r, phase: 'done', pct: 1, result }))
        setStatus('ready')
        triggerDownload(url, filename)
      })
      .catch((err: unknown) => {
        if (err instanceof ExportCancelled) {
          setRender(IDLE_RENDER)
          setStatus('ready')
          return
        }
        const message =
          err instanceof Error ? err.message : 'The render failed unexpectedly.'
        setRender((r) => ({ ...r, phase: 'error', error: message }))
        setStatus('error')
      })
      .finally(() => {
        // restore preview mute state
        const cur = stateRef.current
        for (const slot of [cur.before, cur.after]) {
          if (slot.media?.kind === 'video') {
            ;(slot.media.el as HTMLVideoElement).muted = cur.transport.muted
          }
        }
      })
  }, [projectName])

  const openRenderRef = useRef(openRender)
  useEffect(() => {
    openRenderRef.current = openRender
  }, [openRender])

  const onRenderCancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  const onRenderClose = useCallback(() => {
    setRender((r) => {
      if (r.result) URL.revokeObjectURL(r.result.blobUrl)
      return IDLE_RENDER
    })
  }, [])

  const onRenderDownload = useCallback(() => {
    if (render.result) triggerDownload(render.result.blobUrl, render.result.filename)
  }, [render.result])

  const onRenderAgain = useCallback(() => {
    const wasMp4Error = render.phase === 'error' && /webm/i.test(render.error ?? '')
    setRender((r) => {
      if (r.result) URL.revokeObjectURL(r.result.blobUrl)
      return IDLE_RENDER
    })
    if (wasMp4Error) {
      setExportSettings((s) => ({ ...s, format: 'webm' }))
      pushToast('Switched to WebM export.', 'info')
    }
    // let the format patch land before re-rendering
    setTimeout(() => openRenderRef.current(), 50)
  }, [render.phase, render.error, pushToast])

  /* -------------------------------- view --------------------------------- */
  const inspector = (
    <Inspector
      tab={tab}
      onTab={setTab}
      flashCaptions={flashCaptions}
      header={header}
      footer={footer}
      onHeaderPatch={(p) => setHeader((h) => ({ ...h, ...p }))}
      onFooterPatch={(p) => setFooter((f) => ({ ...f, ...p }))}
      logo={logo}
      onLogoPatch={(p) => setLogo((l) => ({ ...l, ...p }))}
      onLogoFile={onLogoFile}
      onLogoRemove={onLogoRemove}
      layout={layout}
      onLayoutPatch={(p) => setLayout((l) => ({ ...l, ...p }))}
      exportSettings={exportSettings}
      onExportPatch={(p) => setExportSettings((s) => ({ ...s, ...p }))}
      audio={audio}
      onAudioPatch={onAudioPatch}
      onAudioFile={onAudioFile}
      onAudioRemove={onAudioRemove}
      banner={banner}
      onBannerPatch={onBannerPatch}
      onBannerImage={onBannerImage}
      onBannerImageRemove={onBannerImageRemove}
      before={before}
      after={after}
      onCropMode={onCropMode}
      onCrop={onCrop}
      timelineDur={timelineDur}
      speed={transport.speed}
      canRender={canExport}
      anyVideo={!!anyVideo}
      onRender={() => openRenderRef.current()}
      onSnapshot={onSnapshot}
    />
  )

  const stage = (
    <Stage
      canvasRef={canvasRef}
      dims={dims}
      before={before}
      after={after}
      layout={layout}
      logo={logo}
      banner={banner}
      header={header}
      footer={footer}
      transport={transport}
      timelineDur={timelineDur}
      cropMode={cropMode}
      onCropMode={onCropMode}
      onCrop={onCrop}
      onDivider={(pct) => setLayout((l) => ({ ...l, divider: pct }))}
      onLogoPatch={(p) => setLogo((l) => ({ ...l, ...p }))}
      onBannerPatch={onBannerPatch}
      onHeaderPatch={(p) => setHeader((h) => ({ ...h, ...p }))}
      onFooterPatch={(p) => setFooter((f) => ({ ...f, ...p }))}
      onLayoutPatch={(p) => setLayout((l) => ({ ...l, ...p }))}
      onCaptionClick={onCaptionClick}
      onTogglePlay={togglePlay}
      onScrub={scrub}
      onRestart={() => scrub(0)}
      onToggleLoop={() => patchTransport({ loop: !transport.loop })}
      onSpeed={(speed) => patchTransport({ speed })}
      onToggleMute={() => patchTransport({ muted: !transport.muted })}
    />
  )

  return (
    <div className="flex flex-col bg-surface-0 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
      <TopBar
        projectName={projectName}
        onProjectName={setProjectName}
        status={status}
        canExport={canExport}
        onExport={() => openRenderRef.current()}
      />

      {/* limited-browser banner */}
      {!webmSupported() && !bannerDismissed && (
        <div className="flex items-center justify-between gap-3 border-b border-[#FFB454]/30 bg-[#FFB454]/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 shrink-0 text-[#FFB454]" />
            <p className="text-xs text-ink-2">
              Limited browser — preview works, export needs Chrome/Edge/Firefox.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="font-mono text-xs text-ink-3 hover:text-ink"
          >
            dismiss
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[260px_1fr_300px] xl:grid-cols-[300px_1fr_320px]">
        {/* left rail (desktop) */}
        <aside className="hidden min-h-0 overflow-y-auto border-r border-line bg-surface-1 lg:block">
          <MediaPanel
            before={before}
            after={after}
            onFile={loadFile}
            onRemove={removeSlot}
            onSwap={swapSides}
            onImageDuration={onImageDuration}
            onCrop={onCropMode}
            registerBrowse={registerBrowse}
          />
        </aside>

        {/* center stage */}
        <section className="sticky top-16 z-20 flex h-[400px] min-h-0 flex-col bg-surface-0 sm:h-[480px] lg:static lg:z-auto lg:h-auto">
          {stage}
        </section>

        {/* right rail (desktop) */}
        <aside className="hidden min-h-0 border-l border-line bg-surface-1 lg:block">
          {inspector}
        </aside>
      </div>

      {/* mobile panels */}
      <div className="border-t border-line bg-surface-1 lg:hidden">
        <Accordion type="multiple" defaultValue={['media', 'captions']} className="w-full">
          <AccordionItem value="media" className="border-line">
            <AccordionTrigger className="px-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink-2">
              Media
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <MediaPanel
                before={before}
                after={after}
                onFile={loadFile}
                onRemove={removeSlot}
                onSwap={swapSides}
                onImageDuration={onImageDuration}
                onCrop={onCropMode}
                registerBrowse={registerBrowse}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        {inspector}
      </div>

      {/* mobile fixed export bar */}
      <div className="h-16 lg:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-1/95 p-3 backdrop-blur lg:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          onClick={() => openRenderRef.current()}
          disabled={!canExport}
          className={
            'flex h-11 w-full items-center justify-center gap-2 rounded-full bg-after text-sm font-semibold text-after-ink transition-all duration-150 active:scale-[0.98] ' +
            (canExport ? '' : 'cursor-not-allowed opacity-50')
          }
        >
          <Download className="h-4 w-4" />
          Export video
        </button>
      </div>

      {/* hidden video pool (keeps video elements in-DOM for reliable decoding) */}
      <div ref={videoPoolRef} className="hidden" aria-hidden="true" />
      {/* hidden music preview element (synced to the transport) */}
      <audio ref={musicPreviewRef} className="hidden" aria-hidden="true" />

      <RenderModal
        open={render.open}
        phase={render.phase}
        pct={render.pct}
        phaseLabel={render.phaseLabel}
        result={render.result}
        error={render.error}
        previewRef={renderPreviewRef}
        onCancel={onRenderCancel}
        onClose={onRenderClose}
        onRenderAgain={onRenderAgain}
        onDownload={onRenderDownload}
      />

      <Toasts toasts={toasts} />
      {showCoach && <Coachmarks onDone={() => setShowCoach(false)} />}
    </div>
  )
}
