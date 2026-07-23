/**
 * Toast stack (editor.md §6): top-center, red left border, 4s auto-dismiss.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info } from 'lucide-react'

export interface ToastItem {
  id: number
  message: string
  kind: 'error' | 'info'
}

export default function Toasts({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-[70] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={
              'pointer-events-auto flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface-3 px-4 py-3 ' +
              (t.kind === 'error' ? 'border-l-2 border-l-warn' : 'border-l-2 border-l-after')
            }
            role="alert"
          >
            {t.kind === 'error' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-warn" />
            ) : (
              <Info className="h-4 w-4 shrink-0 text-after" />
            )}
            <p className="text-sm text-ink">{t.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
