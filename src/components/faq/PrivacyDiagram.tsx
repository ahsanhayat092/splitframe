import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { AppWindow, CloudOff, Download, FolderOpen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Node = {
  icon: LucideIcon
  label: string
  caption: string
  center?: boolean
}

const NODES: Node[] = [
  { icon: FolderOpen, label: 'Your files', caption: 'video · photo · logo' },
  { icon: AppWindow, label: 'Your browser tab', caption: 'canvas + wasm encode', center: true },
  { icon: Download, label: 'Download', caption: 'mp4 / webm · 1080p60' },
]

/** Dashed connector that draws itself in. */
function Connector({ inView, delay }: { inView: boolean; delay: number }) {
  return (
    <div className="flex min-w-8 flex-1 items-center" aria-hidden="true">
      <svg className="h-px w-full overflow-visible" preserveAspectRatio="none">
        <motion.line
          x1="0"
          y1="0.5"
          x2="100%"
          y2="0.5"
          stroke="#333848"
          strokeWidth="1"
          strokeDasharray="5 5"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 0.8, delay, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  )
}

export default function PrivacyDiagram() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-25% 0px' })

  return (
    <section className="bg-surface-1 py-16">
      <div className="relative mx-auto w-full max-w-[900px] px-6">
        <div ref={ref} className="relative flex items-stretch gap-2 pt-20 sm:gap-4">
          {/* Crossed-out cloud floating above the middle connection */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0, x: [0, 2, -2, 1, -1, 0] } : {}}
            transition={{
              opacity: { duration: 0.3, delay: 1.15 },
              y: { duration: 0.3, delay: 1.15 },
              x: { duration: 0.3, delay: 1.3 },
            }}
            className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center gap-1.5"
            aria-hidden="true"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-warn/50 bg-warn/10">
              <CloudOff className="h-5 w-5 text-warn" />
            </span>
            <span className="whitespace-nowrap font-mono text-[11px] tracking-[0.02em] text-warn">
              no server, no upload
            </span>
          </motion.div>

          {NODES.map((node, i) => {
            const Icon = node.icon
            return (
              <div key={node.label} className="contents">
                {i > 0 && <Connector inView={inView} delay={0.35 + i * 0.15} />}
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={inView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: 'spring', stiffness: 320, damping: 22, delay: i * 0.15 }}
                  className={cn(
                    'flex flex-col items-center gap-3 rounded-xl border bg-surface-2 px-3 py-6 text-center sm:px-5 sm:py-8',
                    node.center ? 'flex-[1.3] border-after/60 ring-1 ring-after/40' : 'flex-1 border-line',
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center rounded-full border',
                      node.center
                        ? 'h-14 w-14 border-after/50 bg-after-dim'
                        : 'h-11 w-11 border-line-strong bg-surface-3',
                    )}
                  >
                    <Icon className={cn(node.center ? 'h-6 w-6 text-after' : 'h-5 w-5 text-ink-2')} />
                  </span>
                  <div>
                    <p className={cn('font-display font-semibold tracking-tight', node.center ? 'text-base text-ink' : 'text-sm text-ink')}>
                      {node.label}
                    </p>
                    <p className="mt-1 font-mono text-[11px] tracking-[0.02em] text-ink-3">{node.caption}</p>
                  </div>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
