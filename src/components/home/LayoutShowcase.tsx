import { motion } from 'framer-motion'

const LAYOUTS = [
  {
    img: '/layout-sidebyside.png',
    title: 'Side by side',
    copy: 'Classic vertical split. Best for landscape footage.',
    tag: '16:9 · 1:1 · 9:16',
    alt: 'Canvas split vertically into cyan Before and lime After panes',
  },
  {
    img: '/layout-stacked.png',
    title: 'Stacked',
    copy: 'Horizontal split for tall mobile clips and reels.',
    tag: '9:16 · 4:5',
    alt: 'Canvas split horizontally into cyan Before top and lime After bottom',
  },
  {
    img: '/layout-slider.png',
    title: 'Interactive slider',
    copy: 'One canvas, draggable wipe. Preview exactly what viewers compare.',
    tag: 'any aspect',
    alt: 'Single canvas with a diagonal draggable comparison wipe',
  },
]

export default function LayoutShowcase() {
  return (
    <section className="border-y border-line bg-surface-1 py-16 md:py-24">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-22% 0px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-after">Layouts</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] text-ink md:text-[3.25rem]">
            Three ways to split it.
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-22% 0px' }}
          transition={{ staggerChildren: 0.12 }}
          className="mt-12 grid gap-6 md:grid-cols-3"
        >
          {LAYOUTS.map((layout) => (
            <motion.article
              key={layout.title}
              variants={{
                hidden: { opacity: 0, y: 48, rotate: 1.5 },
                show: { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="group overflow-hidden rounded-xl border border-line bg-surface-2 transition-colors duration-200 hover:border-line-strong"
            >
              <div className="overflow-hidden">
                <img
                  src={layout.img}
                  alt={layout.alt}
                  loading="lazy"
                  className="aspect-[8/5] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                />
              </div>
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-[1.375rem] font-semibold leading-[1.25] tracking-[-0.01em] text-ink">
                    {layout.title}
                  </h3>
                  <span className="shrink-0 font-mono text-xs text-ink-3">{layout.tag}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{layout.copy}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 text-center font-mono text-xs tracking-wide text-ink-3"
        >
          <span className="cursor-default underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-ink-2 hover:decoration-after">
            All layouts export identically — what you preview is what you download.
          </span>
        </motion.p>
      </div>
    </section>
  )
}
