import { useEffect, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = {
  num: number
  title: string
  body: string
  tip: string
  img: string
  imgAlt: string
  /** cyan edge-glow for steps 1–2, lime for 3–4 */
  accent: 'before' | 'after'
  /** optional inline layout trio rendered under the body copy */
  layouts?: { src: string; label: string }[]
}

const STEPS: Step[] = [
  {
    num: 1,
    title: 'Drop your Before & After',
    body: 'Drag a video or photo into each slot. Any mix works — clip vs clip, photo vs photo, or one of each. The still side holds for as long as you set.',
    tip: 'TIP — press U to open the file picker without touching the mouse.',
    img: '/guide-step-1.png',
    imgAlt: 'Two dashed dropzones side by side labeled Before and After, with files dragging in',
    accent: 'before',
  },
  {
    num: 2,
    title: 'Write your captions',
    body: "Add a header title and a footer detail line. Size, weight, color and position are yours — and they're burned straight into the exported video, not overlaid on a webpage.",
    tip: 'TIP — click a caption right on the canvas to edit it.',
    img: '/guide-step-2.png',
    imgAlt: 'Canvas preview showing a header caption bar and a footer detail line',
    accent: 'before',
  },
  {
    num: 3,
    title: 'Brand it with your logo',
    body: "Drop a transparent PNG or SVG, pick one of nine anchor points, and tune size, opacity and padding. Drag it directly on the canvas if you'd rather eyeball it.",
    tip: 'TIP — keep opacity at 85–95% so the logo reads on busy footage.',
    img: '/guide-step-3.png',
    imgAlt: 'A logo being placed in a canvas corner over a nine-point position grid',
    accent: 'after',
  },
  {
    num: 4,
    title: 'Pick a split and export',
    body: 'Side-by-side, stacked, or a draggable slider wipe. Choose MP4 for compatibility or WebM for speed, up to 1080p60. Watch the render live, then download.',
    tip: 'TIP — the PNG snapshot button grabs a still of the current frame for thumbnails.',
    img: '/guide-step-4.png',
    imgAlt: 'Export dialog with a progress bar, timecode, and MP4 and WebM format chips',
    accent: 'after',
    layouts: [
      { src: '/layout-sidebyside.png', label: 'SIDE BY SIDE' },
      { src: '/layout-stacked.png', label: 'STACKED' },
      { src: '/layout-slider.png', label: 'SLIDER' },
    ],
  },
]

/** Giant mono step number that counts up from 00 when scrolled into view. */
function StepNumber({ num }: { num: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-25% 0px' })
  const value = useMotionValue(0)
  const display = useTransform(value, (v) => String(Math.round(v)).padStart(2, '0'))

  useEffect(() => {
    if (!inView) return
    const controls = animate(value, num, { duration: 0.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [inView, num, value])

  return (
    <span ref={ref} aria-label={`Step ${num}`}>
      <motion.span className="font-mono text-6xl font-bold leading-none text-ink-3/40 md:text-[72px]">
        {display}
      </motion.span>
    </span>
  )
}

function StepRow({ step, index }: { step: Step; index: number }) {
  const imageLeft = index % 2 === 0
  const glow =
    step.accent === 'before'
      ? 'hover:shadow-[0_0_32px_rgba(76,201,240,.22)] hover:border-before/50'
      : 'hover:shadow-[0_0_32px_rgba(184,240,74,.22)] hover:border-after/50'

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[55fr_45fr] lg:gap-14">
      {/* Visual — slides in from its side */}
      <motion.div
        initial={{ opacity: 0, x: imageLeft ? -60 : 60 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-25% 0px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn(imageLeft ? 'lg:order-1' : 'lg:order-2')}
      >
        <div
          className={cn(
            'group overflow-hidden rounded-xl border border-line bg-surface-1 transition-all duration-300',
            glow,
          )}
        >
          <img
            src={step.img}
            alt={step.imgAlt}
            width={720}
            height={450}
            loading="lazy"
            className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </motion.div>

      {/* Text block — children stagger up */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-25% 0px' }}
        transition={{ staggerChildren: 0.1 }}
        className={cn(imageLeft ? 'lg:order-2' : 'lg:order-1')}
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 24 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
          }}
        >
          <StepNumber num={step.num} />
        </motion.div>
        <motion.h3
          variants={{
            hidden: { opacity: 0, y: 24 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
          }}
          className="mt-3 font-display text-[1.375rem] font-semibold leading-[1.25] tracking-[-0.01em] text-ink"
        >
          {step.title}
        </motion.h3>
        <motion.p
          variants={{
            hidden: { opacity: 0, y: 24 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
          }}
          className="mt-3 text-base leading-relaxed text-ink-2"
        >
          {step.body}
        </motion.p>

        {step.layouts && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
            }}
            className="mt-5 grid grid-cols-3 gap-3"
          >
            {step.layouts.map((layout) => (
              <figure key={layout.src} className="overflow-hidden rounded-lg border border-line bg-surface-1">
                <img
                  src={layout.src}
                  alt={`${layout.label.toLowerCase()} split layout`}
                  width={800}
                  height={500}
                  loading="lazy"
                  className="h-auto w-full"
                />
                <figcaption className="border-t border-line px-2 py-1.5 text-center font-mono text-[10px] tracking-[0.02em] text-ink-3">
                  {layout.label}
                </figcaption>
              </figure>
            ))}
          </motion.div>
        )}

        {/* Pro tip callout */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 24 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
          }}
          className="mt-6 flex items-start gap-2.5 rounded-lg border-l-2 border-after bg-surface-1 px-4 py-3"
        >
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-after" aria-hidden="true" />
          <p className="font-mono text-xs leading-relaxed tracking-[0.02em] text-ink-2">{step.tip}</p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function GuideSteps() {
  return (
    <section className="py-16">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-20 px-6 md:gap-28">
        {STEPS.map((step, i) => (
          <StepRow key={step.num} step={step} index={i} />
        ))}
      </div>
    </section>
  )
}
