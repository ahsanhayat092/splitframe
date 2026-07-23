import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

type QA = { q: string; a: string }

const ITEMS: QA[] = [
  {
    q: 'Do my videos get uploaded anywhere?',
    a: "No. There's no backend. Files are read into browser memory with the File API, composited on a <canvas>, and encoded locally. You can disconnect from the internet after the page loads and everything still works.",
  },
  {
    q: 'What export formats do I get?',
    a: 'MP4 (H.264 via FFmpeg.wasm) for maximum compatibility, or WebM (VP9 via MediaRecorder) which renders roughly 2× faster. Both up to 1080p, 24/30/60fps.',
  },
  {
    q: 'Can Before be a photo and After a video?',
    a: "Yes — any combination works. Set how long a still image holds (0.5–15s) or let it match the video's length. Add subtle Ken Burns motion to stills so the static side doesn't feel frozen.",
  },
  {
    q: 'Why does MP4 rendering take longer?',
    a: 'FFmpeg.wasm encodes in WebAssembly inside your tab — real encoding, no shortcut. A 10-second 1080p clip typically takes 30–90 seconds depending on your device. WebM skips the transcode and is nearly real-time.',
  },
  {
    q: 'Is there a watermark? Do I need an account?',
    a: 'No watermark, no account, no usage limits. Your logo is the only branding on the output.',
  },
  {
    q: 'What happens if the videos are different lengths?',
    a: 'You choose: match the longest side (short video loops or freezes on its last frame), match the shortest, or set a custom duration up to 60 seconds.',
  },
  {
    q: 'Does audio carry over?',
    a: "Yes, when a side has audio. Before's track pans left, After's pans right so both stay distinguishable. Toggle audio off in the Export tab.",
  },
  {
    q: 'Which browsers are supported?',
    a: 'Chrome, Edge and Firefox (latest) support everything. Safari previews fine; MP4 export needs Safari 17+.',
  },
  {
    q: 'Is my project saved?',
    a: 'Settings (captions, layout, logo position) persist in localStorage between visits. Media files are never persisted — re-drop them each session, by design.',
  },
]

export default function FaqAccordion() {
  const [open, setOpen] = useState<string>('')

  return (
    <section className="py-24">
      <div className="mx-auto w-full max-w-[760px] px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ staggerChildren: 0.05 }}
        >
          <Accordion
            type="single"
            collapsible
            value={open}
            onValueChange={setOpen}
            className="border-t border-line"
          >
            {ITEMS.map((item, i) => {
              const value = `item-${i}`
              const isOpen = open === value
              return (
                <motion.div
                  key={value}
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                  }}
                >
                  <AccordionItem value={value} className="border-line">
                    <AccordionTrigger className="py-5 hover:no-underline [&>svg]:hidden">
                      <span className="font-display text-[1.05rem] font-semibold leading-[1.25] tracking-[-0.01em] text-ink md:text-[1.375rem]">
                        {item.q}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2"
                        aria-hidden="true"
                      >
                        <Plus className="h-4 w-4 text-after" />
                      </motion.span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 text-base leading-relaxed text-ink-2">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              )
            })}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
