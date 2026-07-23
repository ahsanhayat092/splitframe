/**
 * Layout tab (editor.md §4.3): split mode, aspect, divider, gap, badges,
 * per-side fit, Ken Burns for stills.
 */
import { motion } from 'framer-motion'
import { Crop as CropIcon } from 'lucide-react'
import type { AspectId, CropRect, FitMode, LayoutState, Side, SlotState, SplitMode } from '@/lib/editor/types'
import { ASPECTS, badgeFontPct, isFullCrop } from '@/lib/editor/types'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ColorSwatches, Label, PanelCard, Segmented, SliderRow } from '../controls'
import { cn } from '@/lib/utils'

function ModeDiagram({ mode }: { mode: SplitMode }) {
  return (
    <div className="relative h-12 w-full overflow-hidden rounded-md border border-line bg-surface-0">
      {mode === 'side' && (
        <>
          <div className="absolute inset-y-0 left-0 w-1/2 bg-before/15" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-after/15" />
          <div className="absolute inset-y-1 left-1/2 w-px bg-ink/50" />
        </>
      )}
      {mode === 'stacked' && (
        <>
          <div className="absolute inset-x-0 top-0 h-1/2 bg-before/15" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-after/15" />
          <div className="absolute inset-x-1 top-1/2 h-px bg-ink/50" />
        </>
      )}
      {mode === 'slider' && (
        <>
          <div className="absolute inset-0 bg-before/15" />
          <div className="absolute inset-y-0 right-0 w-3/5 bg-after/15" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }} />
          <div className="absolute bottom-1 left-[38%] top-1 w-px rotate-6 bg-ink/60" />
          <div className="absolute left-[36%] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-after bg-surface-3" />
        </>
      )}
    </div>
  )
}

const MODES: { value: SplitMode; label: string }[] = [
  { value: 'side', label: 'Side by side' },
  { value: 'stacked', label: 'Stacked' },
  { value: 'slider', label: 'Slider wipe' },
]

const FITS: FitMode[] = ['cover', 'contain', 'fill']

function FitSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: FitMode
  onChange: (v: FitMode) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as FitMode)}>
        <SelectTrigger className="h-8 w-28 border-line bg-surface-1 text-xs capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-line bg-surface-3">
          {FITS.map((f) => (
            <SelectItem key={f} value={f} className="text-xs capitalize">
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function LayoutTab({
  layout,
  onPatch,
  before,
  after,
  onCropMode,
  onCrop,
}: {
  layout: LayoutState
  onPatch: (patch: Partial<LayoutState>) => void
  before?: SlotState
  after?: SlotState
  onCropMode?: (side: Side | null) => void
  onCrop?: (side: Side, crop: CropRect | null) => void
}) {
  const gapless = layout.mode === 'slider'
  return (
    <div className="space-y-3 p-4">
      <PanelCard>
        <Label className="mb-2">Split mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => {
            const active = layout.mode === m.value
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => onPatch({ mode: m.value })}
                className={cn(
                  'rounded-lg border p-1.5 text-left transition-colors duration-150',
                  active ? 'border-after/60 bg-surface-3' : 'border-line hover:border-line-strong',
                )}
              >
                <motion.div
                  key={m.value}
                  initial={false}
                  animate={active ? { rotate: [0, modeRotation(m.value)] } : { rotate: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ModeDiagram mode={m.value} />
                </motion.div>
                <span className="mt-1.5 block text-center text-[11px] font-medium text-ink-2">
                  {m.label}
                </span>
              </button>
            )
          })}
        </div>
      </PanelCard>

      <PanelCard>
        <Label className="mb-2">Aspect ratio</Label>
        <Segmented
          options={(Object.keys(ASPECTS) as AspectId[]).map((a) => ({ value: a, label: ASPECTS[a].label }))}
          value={layout.aspect}
          onChange={(v) => onPatch({ aspect: v })}
        />
      </PanelCard>

      <PanelCard className="space-y-4">
        <SliderRow
          label="Divider position"
          value={Math.round(layout.divider)}
          min={5}
          max={95}
          onChange={(v) => onPatch({ divider: v })}
          format={(v) => `${v}%`}
          accent="split"
        />
        <div className={cn(gapless && 'pointer-events-none opacity-40')}>
          <SliderRow
            label="Gap"
            value={layout.gap}
            min={0}
            max={16}
            onChange={(v) => onPatch({ gap: v })}
            format={(v) => `${v}px`}
          />
          <div className="mt-3 flex items-center justify-between">
            <Label>Gutter color</Label>
            <input
              type="color"
              value={layout.gapColor}
              onChange={(e) => onPatch({ gapColor: e.target.value })}
              className="h-6 w-10 cursor-pointer rounded border border-line-strong bg-transparent"
              aria-label="Gutter color"
            />
          </div>
        </div>
      </PanelCard>

      <PanelCard>
        <div className="mb-3 flex items-center justify-between">
          <Label>Before/After badges</Label>
          <Switch
            checked={layout.badges}
            onCheckedChange={(v) => onPatch({ badges: v })}
            aria-label="Toggle badges"
          />
        </div>
        {layout.badges && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={layout.beforeLabel}
                maxLength={12}
                onChange={(e) => onPatch({ beforeLabel: e.target.value.toUpperCase() })}
                aria-label="Before label"
                className="w-1/2 rounded-md border border-before/40 bg-before-dim px-2.5 py-1.5 font-mono text-xs text-before outline-none"
              />
              <input
                value={layout.afterLabel}
                maxLength={12}
                onChange={(e) => onPatch({ afterLabel: e.target.value.toUpperCase() })}
                aria-label="After label"
                className="w-1/2 rounded-md border border-after/40 bg-after-dim px-2.5 py-1.5 font-mono text-xs text-after outline-none"
              />
            </div>
            <SliderRow
              label="Before badge size"
              value={Math.round(badgeFontPct(layout, 'before') * 10) / 10}
              min={0.8}
              max={4}
              step={0.1}
              onChange={(v) => onPatch({ badgeBeforeSizePct: v })}
              format={(v) => `${v}% of height`}
            />
            <SliderRow
              label="After badge size"
              value={Math.round(badgeFontPct(layout, 'after') * 10) / 10}
              min={0.8}
              max={4}
              step={0.1}
              onChange={(v) => onPatch({ badgeAfterSizePct: v })}
              format={(v) => `${v}% of height`}
            />
            <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
              <Label>Placement</Label>
              {layout.badgeBeforePos || layout.badgeAfterPos ? (
                <button
                  type="button"
                  onClick={() => onPatch({ badgeBeforePos: null, badgeAfterPos: null })}
                  className="rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  Reset positions
                </button>
              ) : (
                <span className="font-mono text-[10px] text-ink-3">drag on canvas</span>
              )}
            </div>
          </div>
        )}
      </PanelCard>

      {before && after && onCropMode && (
        <PanelCard>
          <Label className="mb-2">Crop</Label>
          <div className="space-y-2">
            {(
              [
                ['before', before, 'Before'] as const,
                ['after', after, 'After'] as const,
              ]
            ).map(([side, slot, label]) => {
              const cropped = !isFullCrop(slot.crop)
              return (
                <div key={side} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm text-ink-2">
                    {label}
                    {cropped && (
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium',
                          side === 'before'
                            ? 'border-before/60 bg-before-dim text-before'
                            : 'border-after/60 bg-after-dim text-after',
                        )}
                      >
                        Cropped
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {cropped && onCrop && (
                      <button
                        type="button"
                        onClick={() => onCrop(side, null)}
                        className="rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!slot.media}
                      onClick={() => onCropMode(side)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-3',
                        !slot.media && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <CropIcon className="h-3.5 w-3.5" />
                      {cropped ? 'Re-crop' : 'Crop'}
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-3">
            Crop is per side and carries into the export.
          </p>
        </PanelCard>
      )}

      <PanelCard className="space-y-3">
        <FitSelect label="Fit · before" value={layout.fitBefore} onChange={(v) => onPatch({ fitBefore: v })} />
        <FitSelect label="Fit · after" value={layout.fitAfter} onChange={(v) => onPatch({ fitAfter: v })} />
      </PanelCard>

      <PanelCard>
        <div className="mb-3 flex items-center justify-between">
          <Label>Ken Burns for stills</Label>
          <Switch
            checked={layout.kenBurns}
            onCheckedChange={(v) => onPatch({ kenBurns: v })}
            aria-label="Toggle Ken Burns"
          />
        </div>
        {layout.kenBurns && (
          <SliderRow
            label="Intensity"
            value={Math.round(layout.kenBurnsIntensity * 100)}
            min={10}
            max={100}
            onChange={(v) => onPatch({ kenBurnsIntensity: v / 100 })}
            format={(v) => `${v}%`}
          />
        )}
      </PanelCard>

      {/* gutter swatch presets */}
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[11px] text-ink-3">Gutter presets</span>
        <ColorSwatches value={layout.gapColor} onChange={(v) => onPatch({ gapColor: v })} />
      </div>
    </div>
  )
}

function modeRotation(mode: SplitMode): number {
  return mode === 'stacked' ? 90 : 0
}
