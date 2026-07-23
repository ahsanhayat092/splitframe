/**
 * Export tab (editor.md §4.4): format, resolution, fps, duration rules,
 * audio, size estimate, render + snapshot buttons.
 */
import { Camera, Clapperboard } from 'lucide-react'
import type { DurationMode, ExportSettings } from '@/lib/editor/types'
import { estimateSizeMB } from '@/lib/editor/types'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Label, PanelCard, Segmented } from '../controls'
import { cn } from '@/lib/utils'

export default function ExportTab({
  settings,
  onPatch,
  timelineDur,
  speed,
  canRender,
  anyVideo,
  onRender,
  onSnapshot,
}: {
  settings: ExportSettings
  onPatch: (patch: Partial<ExportSettings>) => void
  timelineDur: number
  speed: number
  canRender: boolean
  anyVideo: boolean
  onRender: () => void
  onSnapshot: () => void
}) {
  const est = estimateSizeMB(settings, timelineDur, speed)
  return (
    <div className="space-y-3 p-4">
      <PanelCard>
        <Label className="mb-2">Format</Label>
        <Segmented
          options={[
            { value: 'mp4' as const, label: 'MP4 (FFmpeg)' },
            { value: 'webm' as const, label: 'WebM (fast)' },
          ]}
          value={settings.format}
          onChange={(v) => onPatch({ format: v })}
        />
        <p className="mt-2 font-mono text-[11px] text-ink-3">
          MP4: best compatibility · WebM: renders ~2× faster
        </p>
      </PanelCard>

      <PanelCard className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Resolution</Label>
          <Select
            value={settings.resolution}
            onValueChange={(v) => onPatch({ resolution: v as ExportSettings['resolution'] })}
          >
            <SelectTrigger className="h-8 w-32 border-line bg-surface-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-line bg-surface-3">
              <SelectItem value="720p" className="text-xs">720p</SelectItem>
              <SelectItem value="1080p" className="text-xs">1080p</SelectItem>
              <SelectItem value="source" className="text-xs">Source max</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label>FPS</Label>
          <Segmented
            size="sm"
            options={[
              { value: 24, label: '24' },
              { value: 30, label: '30' },
              { value: 60, label: '60' },
            ]}
            value={settings.fps}
            onChange={(v) => onPatch({ fps: v as ExportSettings['fps'] })}
            className="w-36"
          />
        </div>
      </PanelCard>

      <PanelCard>
        <div className="mb-2 flex items-center justify-between">
          <Label>Duration</Label>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help font-mono text-[10px] text-ink-3">rules</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] border-line bg-surface-3 text-xs text-ink-2">
                Images hold; videos loop (loop toggle from transport) or freeze on the
                last frame when outlived.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <RadioGroup
          value={settings.durationMode}
          onValueChange={(v) => onPatch({ durationMode: v as DurationMode })}
          className="space-y-2"
        >
          {(
            [
              ['longest', 'Longest side'],
              ['shortest', 'Shortest side'],
              ['custom', 'Custom'],
            ] as [DurationMode, string][]
          ).map(([v, label]) => (
            <div key={v} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RadioGroupItem value={v} id={`dur-${v}`} />
                <label htmlFor={`dur-${v}`} className="cursor-pointer text-sm text-ink-2">
                  {label}
                </label>
              </div>
              {v === 'custom' && settings.durationMode === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.customDuration}
                    onChange={(e) =>
                      onPatch({
                        customDuration: Math.min(60, Math.max(1, Number(e.target.value) || 1)),
                      })
                    }
                    className="w-16 rounded-md border border-line bg-surface-1 px-2 py-1 text-right font-mono text-xs text-ink outline-none"
                    aria-label="Custom duration seconds"
                  />
                  <span className="font-mono text-[11px] text-ink-3">sec</span>
                </div>
              )}
            </div>
          ))}
        </RadioGroup>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-3">
          Images hold; videos loop or freeze on last frame when outlived.
        </p>
      </PanelCard>

      <PanelCard>
        <div className="flex items-center justify-between">
          <Label className={cn(!anyVideo && 'opacity-50')}>Include video audio</Label>
          <Switch
            checked={settings.includeAudio && anyVideo}
            disabled={!anyVideo}
            onCheckedChange={(v) => onPatch({ includeAudio: v })}
            aria-label="Include video audio"
          />
        </div>
        {!anyVideo && (
          <p className="mt-1.5 font-mono text-[11px] text-ink-3">No audio tracks</p>
        )}
      </PanelCard>

      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[11px] text-ink-3">Estimated size</span>
        <span className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] text-ink-2">
          ≈ {est} MB
        </span>
      </div>

      <button
        type="button"
        onClick={onRender}
        disabled={!canRender}
        className={cn(
          'flex h-12 w-full items-center justify-center gap-2 rounded-full bg-after font-display text-lg font-semibold tracking-tight text-after-ink transition-all duration-150 active:scale-[0.98]',
          canRender
            ? 'hover:shadow-[0_0_24px_rgba(184,240,74,0.35)]'
            : 'cursor-not-allowed opacity-50',
        )}
      >
        <Clapperboard className="h-5 w-5" />
        Render video
      </button>
      <button
        type="button"
        onClick={onSnapshot}
        disabled={!canRender}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Camera className="h-4 w-4" />
        Export snapshot PNG
      </button>
    </div>
  )
}
