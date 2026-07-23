import { motion } from 'framer-motion'
import { Type, Stamp, Play, Gauge, MonitorPlay, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const FEATURES: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: Type,
    title: 'Header & footer captions',
    copy: 'Title on top, details below — font size, weight, color and position, rendered into the video.',
  },
  {
    icon: Stamp,
    title: 'Logo overlay',
    copy: 'Drop your PNG/SVG logo, pick a corner, tune size and opacity.',
  },
  {
    icon: Play,
    title: 'Synced preview',
    copy: 'Both sides lock to one playhead. Scrub once, judge both.',
  },
  {
    icon: Gauge,
    title: 'Speed control',
    copy: '0.25× to 2× playback, baked into the export.',
  },
  {
    icon: MonitorPlay,
    title: 'Resolution control',
    copy: '720p, 1080p or source. Square, wide, or vertical.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    copy: 'Files never leave your device. Rendering is local — Canvas + MediaRecorder, with FFmpeg.wasm for MP4.',
  },
]

export default function FeatureGrid() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-6 lg:grid-cols-12">
        {/* Sticky headline block */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-22% 0px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-4"
        >
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-after">Toolbox</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] text-ink md:text-[3.25rem]">
              Everything burned in. Nothing uploaded.
            </h2>
          </div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ staggerChildren: 0.08 }}
          className="grid gap-5 sm:grid-cols-2 lg:col-span-8"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={{
                hidden: { opacity: 0, y: 32 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="group rounded-xl border border-line bg-surface-1 p-6 transition-colors duration-200 hover:border-line-strong"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2 transition-shadow duration-200 group-hover:shadow-glow-after-sm"
              >
                <feature.icon className="h-5 w-5 text-after" />
              </motion.div>
              <h3 className="mt-4 font-display text-[1.375rem] font-semibold leading-[1.25] tracking-[-0.01em] text-ink">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{feature.copy}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
