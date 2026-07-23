/**
 * One-time coachmarks (editor.md §6): ① drop zones ② divider ③ export.
 * Dismissal stored in localStorage.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const KEY = 'splitframe-coachmarks-v1'

const STEPS = [
  {
    title: 'Drop your media',
    body: 'Use the BEFORE and AFTER slots on the left — any mix of video and images works.',
  },
  {
    title: 'Drag the divider',
    body: 'The handle on the canvas re-frames the split. Everything you see is exactly what exports.',
  },
  {
    title: 'Export',
    body: 'Captions, logo and badges are burned in. Render MP4 or WebM — nothing leaves your device.',
  },
]

export function coachmarksSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

export default function Coachmarks({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)

  const finish = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* noop */
    }
    onDone()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 pb-10 sm:items-center"
        role="dialog"
        aria-label="Quick tour"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm rounded-2xl border border-line bg-surface-1 p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={
                    i === step
                      ? 'h-1.5 w-5 rounded-full bg-after transition-all'
                      : 'h-1.5 w-1.5 rounded-full bg-line-strong transition-all'
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={finish}
              aria-label="Dismiss tour"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
            {STEPS[step].title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{STEPS[step].body}</p>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={finish}
              className="text-xs font-semibold text-ink-3 transition-colors hover:text-ink"
            >
              Skip tour
            </button>
            <button
              type="button"
              onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}
              className="rounded-full bg-after px-4 py-1.5 text-sm font-semibold text-after-ink transition-all duration-150 active:scale-[0.97]"
            >
              {step < STEPS.length - 1 ? 'Next' : 'Start editing'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
