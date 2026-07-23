/**
 * Audio tab: background music track for the exported video — file picker,
 * volume, loop toggle, keep-original-audio toggle, remove.
 */
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Music, Trash2, UploadCloud } from 'lucide-react'
import type { AudioTrackState } from '@/lib/editor/types'
import { fmtTimecode } from '@/lib/editor/types'
import { truncateMiddle } from '@/lib/editor/media'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Label, PanelCard, SliderRow } from '../controls'
import { cn } from '@/lib/utils'

export default function AudioTab({
  audio,
  anyVideo,
  onPatch,
  onFile,
  onRemove,
}: {
  audio: AudioTrackState
  /** true when either slot holds a video (original audio exists) */
  anyVideo: boolean
  onPatch: (patch: Partial<AudioTrackState>) => void
  onFile: (file: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  return (
    <div className="space-y-3 p-4">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />

      <PanelCard>
        <Label className="mb-2">Music track</Label>
        {audio.url ? (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-after/40 bg-after-dim">
              <Music className="h-4 w-4 text-after" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs text-ink-2" title={audio.name ?? ''}>
                {truncateMiddle(audio.name ?? 'audio')}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                {audio.duration > 0 ? fmtTimecode(audio.duration) : 'duration unknown'}
              </p>
              <button
                type="button"
                onClick={onRemove}
                className="mt-1.5 flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-warn"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload music track"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-[1.5px] border-dashed transition-all duration-150',
              dragOver
                ? 'border-after bg-after/[0.06] shadow-[0_0_8px_rgba(184,240,74,0.4)]'
                : 'border-line-strong hover:border-ink-3',
            )}
          >
            <UploadCloud className="h-4 w-4 text-ink-3" />
            <span className="font-mono text-[11px] text-ink-2">Drop an audio file</span>
            <span className="font-mono text-[10px] text-ink-3">MP3 · WAV · M4A · OGG</span>
          </div>
        )}
      </PanelCard>

      <PanelCard className={cn('space-y-4', !audio.url && 'pointer-events-none opacity-40')}>
        <SliderRow
          label="Music volume"
          value={Math.round(audio.volume * 100)}
          min={0}
          max={100}
          onChange={(v) => onPatch({ volume: v / 100 })}
          format={(v) => `${v}%`}
        />
        <div className="flex items-center justify-between">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                  Loop music
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] border-line bg-surface-3 text-xs text-ink-2">
                Repeat the track when it's shorter than the exported video.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Switch
            checked={audio.loop}
            onCheckedChange={(v) => onPatch({ loop: v })}
            aria-label="Loop music track"
          />
        </div>
        <div className={cn('flex items-center justify-between', !anyVideo && 'opacity-50')}>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                  Keep original audio
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] border-line bg-surface-3 text-xs text-ink-2">
                Mix the videos' own audio (before → L, after → R) under the music.
                Turn off to export music only.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Switch
            checked={audio.keepOriginal && anyVideo}
            disabled={!anyVideo}
            onCheckedChange={(v) => onPatch({ keepOriginal: v })}
            aria-label="Keep original video audio"
          />
        </div>
      </PanelCard>

      <p className="px-1 font-mono text-[11px] leading-relaxed text-ink-3">
        Music is mixed into the exported video (MP4 + WebM) and previews with the
        transport. It plays at normal speed regardless of playback speed.
      </p>
    </div>
  )
}
