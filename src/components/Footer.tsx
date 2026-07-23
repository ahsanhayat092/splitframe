import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Link } from 'react-router'

const COLUMNS: { title: string; items: { label: string; to?: string }[] }[] = [
  {
    title: 'Product',
    items: [
      { label: 'Editor', to: '/editor' },
      { label: 'Guide', to: '/guide' },
      { label: 'FAQ', to: '/faq' },
    ],
  },
  {
    title: 'Formats',
    items: [
      { label: 'MP4 · WebM export' },
      { label: 'PNG · JPG input' },
      { label: 'GIF in, video out' },
    ],
  },
  {
    title: 'Tech',
    items: [
      { label: 'Canvas 2D' },
      { label: 'MediaRecorder' },
      { label: 'FFmpeg.wasm' },
    ],
  },
]

/** Decorative split divider that follows the pointer (desktop only). */
function InteractiveDivider() {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, pct)))
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setPos(50)}
      className="relative mt-10 hidden h-6 w-full md:block"
      aria-hidden="true"
    >
      {/* base hairline */}
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
      {/* cyan glow, left of divider */}
      <div
        className="absolute top-1/2 h-px -translate-y-1/2 bg-before/60 transition-[width] duration-75"
        style={{ left: 0, width: `${pos}%`, boxShadow: '0 0 8px rgba(76,201,240,.5)' }}
      />
      {/* lime glow, right of divider */}
      <div
        className="absolute top-1/2 h-px -translate-y-1/2 bg-after/60 transition-[width] duration-75"
        style={{ right: 0, width: `${100 - pos}%`, boxShadow: '0 0 8px rgba(184,240,74,.5)' }}
      />
      {/* handle */}
      <div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink transition-[left] duration-75"
        style={{ left: `${pos}%`, boxShadow: '0 0 10px rgba(242,244,248,.6)' }}
      />
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="checkerboard-faint border-t border-line bg-surface-0">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2" aria-label="SplitFrame home">
              <img src="/logo.svg" alt="" width={22} height={22} />
              <span className="font-display text-lg font-bold tracking-tight">
                <span className="text-ink">Split</span>
                <span className="text-after">Frame</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-2">
              Rendered in your browser. Nothing ever leaves your device.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    {item.to ? (
                      <Link to={item.to} className="text-sm text-ink-2 transition-colors hover:text-ink">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-ink-2">{item.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <InteractiveDivider />

        <div className="mt-6 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <p className="font-mono text-xs tracking-wide text-ink-3">
            © 2025 SplitFrame — runs 100% locally
          </p>
          <p className="font-mono text-xs tracking-wide text-ink-3">
            no upload · no login · no watermark
          </p>
        </div>
      </div>
    </footer>
  )
}
