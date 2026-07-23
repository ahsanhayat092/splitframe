/**
 * Logo tab (editor.md §4.2): logo upload, 9-point position grid, size /
 * opacity / padding, preview-only vs burned-in.
 */
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Trash2, UploadCloud } from 'lucide-react'
import type { LogoState } from '@/lib/editor/types'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Label, PanelCard, SliderRow } from '../controls'
import { cn } from '@/lib/utils'

function PositionGrid({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid w-24 grid-cols-3 gap-1 rounded-lg bg-surface-1 p-1.5">
      {Array.from({ length: 9 }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`position ${i + 1}`}
          onClick={() => onChange(i)}
          className={cn(
            'aspect-square rounded transition-colors duration-100',
            value === i ? 'bg-after' : 'bg-surface-3 hover:bg-line-strong',
          )}
        />
      ))}
    </div>
  )
}

export default function LogoTab({
  logo,
  onPatch,
  onFile,
  onRemove,
}: {
  logo: LogoState
  onPatch: (patch: Partial<LogoState>) => void
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
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />

      <PanelCard>
        <Label className="mb-2">Logo</Label>
        {logo.url ? (
          <div className="flex items-center gap-3">
            <div className="checkerboard-faint flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line">
              <img src={logo.url} alt={logo.name ?? 'logo'} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs text-ink-2">{logo.name}</p>
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
            aria-label="Upload logo"
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
            <span className="font-mono text-[11px] text-ink-2">Drop logo</span>
            <span className="font-mono text-[10px] text-ink-3">PNG · SVG · transparent recommended</span>
          </div>
        )}
      </PanelCard>

      <PanelCard className={cn(!logo.url && 'pointer-events-none opacity-40')}>
        <div className="mb-3 flex items-center justify-between">
          <Label>Position</Label>
          <PositionGrid value={logo.grid} onChange={(v) => onPatch({ grid: v, offsetX: 0, offsetY: 0 })} />
        </div>
        <div className="space-y-4">
          <SliderRow
            label="Offset X"
            value={logo.offsetX}
            min={-50}
            max={50}
            onChange={(v) => onPatch({ offsetX: v })}
            format={(v) => `${v > 0 ? '+' : ''}${v}px`}
          />
          <SliderRow
            label="Offset Y"
            value={logo.offsetY}
            min={-50}
            max={50}
            onChange={(v) => onPatch({ offsetY: v })}
            format={(v) => `${v > 0 ? '+' : ''}${v}px`}
          />
          <SliderRow
            label="Size"
            value={logo.sizePct}
            min={4}
            max={30}
            step={0.5}
            onChange={(v) => onPatch({ sizePct: v })}
            format={(v) => `${v}%`}
          />
          <SliderRow
            label="Opacity"
            value={Math.round(logo.opacity * 100)}
            min={10}
            max={100}
            onChange={(v) => onPatch({ opacity: v / 100 })}
            format={(v) => `${v}%`}
          />
          <SliderRow
            label="Padding"
            value={logo.padding}
            min={8}
            max={64}
            onChange={(v) => onPatch({ padding: v })}
            format={(v) => `${v}px`}
          />
          <div className="flex items-center justify-between">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
                    Burn into export
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] border-line bg-surface-3 text-xs text-ink-2">
                  Preview-only keeps your export clean while you compose.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Switch
              checked={logo.burnIn}
              onCheckedChange={(v) => onPatch({ burnIn: v })}
              aria-label="Burn logo into export"
            />
          </div>
        </div>
      </PanelCard>
    </div>
  )
}
