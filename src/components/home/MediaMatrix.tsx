import { motion } from 'framer-motion'
import { Film, Image as ImageIcon, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Combo = {
  label: string
  hint: string
  icons: [LucideIcon, LucideIcon]
  borderHover: string
  popular?: boolean
}

const COMBOS: Combo[] = [
  {
    label: 'VIDEO + VIDEO',
    hint: 'clip vs clip',
    icons: [Film, Film],
    borderHover: 'hover:bg-[linear-gradient(120deg,#4CC9F0,#B8F04A)]',
  },
  {
    label: 'IMAGE + IMAGE',
    hint: 'photo vs photo',
    icons: [ImageIcon, ImageIcon],
    borderHover: 'hover:bg-line-strong',
  },
  {
    label: 'IMAGE + VIDEO',
    hint: 'still → motion',
    icons: [ImageIcon, Film],
    borderHover: 'hover:bg-after',
    popular: true,
  },
  {
    label: 'VIDEO + IMAGE',
    hint: 'motion → still',
    icons: [Film, ImageIcon],
    borderHover: 'hover:bg-line-strong',
  },
]

export default function MediaMatrix() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-6 lg:grid-cols-2">
        {/* Left: headline + copy */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-22% 0px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] text-ink md:text-[3.25rem]">
            Video, photo, or one of each.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-2">
            Before can be a photo and After a video — or the reverse. SplitFrame
            syncs them on one timeline and loops the shorter side.
          </p>
        </motion.div>

        {/* Right: 2x2 combo matrix */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-22% 0px' }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          {COMBOS.map((combo) => {
            const IconA = combo.icons[0]
            const IconB = combo.icons[1]
            return (
            <motion.div
              key={combo.label}
              variants={{
                hidden: { opacity: 0, y: 40 },
                show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -6 }}
              className={cn(
                'group rounded-xl bg-line p-px transition-colors duration-200',
                combo.borderHover,
              )}
            >
              <div className="relative flex h-full flex-col items-center justify-center gap-4 rounded-xl bg-surface-1 p-6">
                {combo.popular && (
                  <span className="absolute right-3 top-3 rounded-full bg-after px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-after-ink">
                    POPULAR
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <IconA className="h-7 w-7 text-before transition-transform duration-200 group-hover:-rotate-6" />
                  <Plus className="h-4 w-4 text-ink-3" />
                  <IconB className="h-7 w-7 text-after transition-transform duration-200 group-hover:rotate-6" />
                </div>
                <div className="text-center">
                  <p className="font-mono text-xs font-medium tracking-wider text-ink">{combo.label}</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-3">{combo.hint}</p>
                </div>
              </div>
            </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
