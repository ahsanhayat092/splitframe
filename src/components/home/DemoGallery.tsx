import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useScroll, useTransform } from 'framer-motion'
import { Play, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

type Demo = {
  img: string
  caption: string
  title: string
  blurb: string
}

const DEMOS: Demo[] = [
  {
    img: '/demo-thumb-1.jpg',
    caption: 'SNEAKER DROP — VIDEO + VIDEO · 0:08',
    title: 'Sneaker drop',
    blurb: 'Warehouse raw footage vs studio-graded product cut, split down the middle.',
  },
  {
    img: '/demo-thumb-2.jpg',
    caption: 'PHOTO RESTORE — IMAGE + IMAGE · 0:06',
    title: 'Photo restoration',
    blurb: 'Scratched sepia portrait vs restored full-color scan, wiped with a slider.',
  },
  {
    img: '/demo-thumb-3.jpg',
    caption: 'FITNESS TIMELAPSE — VIDEO + IMAGE · 0:10',
    title: 'Fitness timelapse',
    blurb: 'Week-one still vs vibrant progress clip — still before, motion after.',
  },
]

const CARD_W = 480
const GAP = 24

/** Animated comparison wipe replaying on a 4s loop (CSS keyframes). */
function WipeMock({ img, title }: { img: string; title: string }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-line bg-surface-2">
      <img src={img} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={img}
        alt=""
        aria-hidden="true"
        className="animate-demo-wipe-clip absolute inset-0 h-full w-full object-cover"
        style={{ filter: 'saturate(1.5) contrast(1.12) brightness(1.05)' }}
      />
      <div className="animate-demo-wipe absolute bottom-0 top-0 flex w-8 -translate-x-1/2 items-center justify-center">
        <div className="absolute bottom-0 top-0 w-[2px] bg-ink/90 shadow-[0_0_10px_rgba(242,244,248,.6)]" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-surface-0/90">
          <Play className="h-3.5 w-3.5 text-after" />
        </div>
      </div>
      <span className="absolute left-3 top-3 rounded-full border border-before/60 bg-before-dim px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-before">
        BEFORE
      </span>
      <span className="absolute right-3 top-3 rounded-full border border-after/60 bg-after-dim px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-after">
        AFTER
      </span>
    </div>
  )
}

export default function DemoGallery() {
  const sectionRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [minX, setMinX] = useState(0)
  const [selected, setSelected] = useState<Demo | null>(null)
  const x = useMotionValue(0)

  // Row parallax drift across the section on scroll
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  const parallaxX = useTransform(scrollYProgress, [0, 1], [0, -40])

  // Measure drag bounds
  useEffect(() => {
    const measure = () => {
      const vw = viewportRef.current?.clientWidth ?? 0
      const tw = trackRef.current?.scrollWidth ?? 0
      setMinX(Math.min(0, vw - tw))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Snap to the nearest card after a drag
  const snapToNearest = () => {
    const step = CARD_W + GAP
    const count = DEMOS.length
    const snaps = Array.from({ length: count }, (_, i) =>
      Math.max(minX, -i * step),
    )
    const current = Math.min(0, Math.max(minX, x.get()))
    const nearest = snaps.reduce((a, b) =>
      Math.abs(b - current) < Math.abs(a - current) ? b : a,
    )
    animate(x, nearest, { type: 'spring', stiffness: 300, damping: 34 })
  }

  return (
    <section ref={sectionRef} className="overflow-hidden py-16 md:py-24">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-22% 0px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-after">
            Made with SplitFrame
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] text-ink md:text-[3.25rem]">
            Drag through the proof.
          </h2>
        </motion.div>
      </div>

      {/* Draggable thumbnail row */}
      <motion.div style={{ x: parallaxX }} className="mt-12">
        <div ref={viewportRef} className="mx-auto w-full max-w-[1200px] overflow-visible px-6">
          <motion.div
            ref={trackRef}
            drag="x"
            style={{ x }}
            dragConstraints={{ left: minX, right: 0 }}
            dragElastic={0.08}
            onDragEnd={snapToNearest}
            className="flex w-max cursor-grab gap-6 active:cursor-grabbing"
          >
            {DEMOS.map((demo) => (
              <div key={demo.img} className="w-[480px] max-w-[85vw] shrink-0">
                <button
                  type="button"
                  onClick={() => setSelected(demo)}
                  className="group relative block w-full overflow-hidden rounded-xl border border-line bg-surface-1 text-left transition-colors duration-200 hover:border-line-strong"
                  style={{ perspective: '800px' }}
                >
                  <div className="relative transition-transform duration-300 ease-out group-hover:[transform:rotateY(4deg)]">
                    <img
                      src={demo.img}
                      alt={demo.title}
                      loading="lazy"
                      draggable={false}
                      className="aspect-[16/10] w-full object-cover"
                    />
                    {/* Play affordance */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-surface-0/80 opacity-0 backdrop-blur transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                        <Play className="h-6 w-6 fill-after text-after" />
                      </div>
                    </div>
                    {/* Badges pinned to the split line */}
                    <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1.5">
                      <span className="rounded-full border border-before/60 bg-before-dim px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider text-before backdrop-blur-sm">
                        BEFORE
                      </span>
                      <span className="rounded-full border border-after/60 bg-after-dim px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider text-after backdrop-blur-sm">
                        AFTER
                      </span>
                    </div>
                  </div>
                </button>
                <p className="mt-3 font-mono text-xs tracking-wide text-ink-3">{demo.caption}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Replay modal */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="border-line bg-surface-1 p-6 sm:max-w-[720px] [&>button]:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="font-display text-xl font-semibold tracking-tight text-ink">
                {selected?.title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-ink-2">
                {selected?.blurb}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {selected && (
            <div className="mt-5">
              <WipeMock img={selected.img} title={selected.title} />
              <p className="mt-3 font-mono text-xs tracking-wide text-ink-3">
                {selected.caption} · EXPORTED 1080p MP4 · RENDERED LOCALLY
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
