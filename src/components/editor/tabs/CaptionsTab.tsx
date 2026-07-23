/**
 * Captions tab (editor.md §4.1): header + footer caption groups — text, style,
 * per-element font size and free-form position reset.
 */
import type { FooterCaptionState, HeaderCaptionState } from '@/lib/editor/types'
import { CAPTION_SIZE_PCT, captionFontPct, detailFontPct } from '@/lib/editor/types'
import { Switch } from '@/components/ui/switch'
import { ColorSwatches, Label, PanelCard, Segmented, SliderRow } from '../controls'

function CaptionGroup({
  title,
  caption,
  maxLen,
  placeholder,
  detail,
  onPatch,
}: {
  title: string
  caption: HeaderCaptionState | FooterCaptionState
  maxLen: number
  placeholder: string
  detail?: { placeholder: string }
  onPatch: (patch: Partial<FooterCaptionState>) => void
}) {
  const isFooter = 'detail' in caption
  return (
    <PanelCard>
      <div className="mb-3 flex items-center justify-between">
        <Label>{title}</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-3">{caption.show ? 'On' : 'Off'}</span>
          <Switch
            checked={caption.show}
            onCheckedChange={(v) => onPatch({ show: v })}
            aria-label={`Show ${title.toLowerCase()}`}
          />
        </div>
      </div>

      {caption.show && (
        <div className="space-y-3">
          <div>
            <input
              value={caption.text}
              maxLength={maxLen}
              onChange={(e) => onPatch({ text: e.target.value })}
              placeholder={placeholder}
              className="w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-line-strong"
            />
            <div className="mt-1 text-right font-mono text-[10px] text-ink-3">
              {caption.text.length}/{maxLen}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label>Size</Label>
            <Segmented
              size="sm"
              options={[
                { value: 'S' as const, label: 'S' },
                { value: 'M' as const, label: 'M' },
                { value: 'L' as const, label: 'L' },
              ]}
              value={caption.style.size}
              onChange={(v) =>
                onPatch({
                  style: { ...caption.style, size: v },
                  sizePct: CAPTION_SIZE_PCT[v],
                })
              }
              className="w-28"
            />
          </div>

          <SliderRow
            label="Font size"
            value={Math.round(captionFontPct(caption) * 10) / 10}
            min={2}
            max={10}
            step={0.1}
            onChange={(v) => onPatch({ sizePct: v })}
            format={(v) => `${v}% of height`}
          />

          <div className="flex items-center justify-between gap-2">
            <Label>Weight</Label>
            <Segmented
              size="sm"
              options={[
                { value: 'regular' as const, label: 'Regular' },
                { value: 'bold' as const, label: 'Bold' },
              ]}
              value={caption.style.bold ? ('bold' as const) : ('regular' as const)}
              onChange={(v) => onPatch({ style: { ...caption.style, bold: v === 'bold' } })}
              className="w-36"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label>Color</Label>
            <ColorSwatches
              value={caption.style.color}
              onChange={(v) => onPatch({ style: { ...caption.style, color: v } })}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label>Position</Label>
            <Segmented
              size="sm"
              options={[
                { value: 'bar' as const, label: isFooter ? 'Bottom bar' : 'Top bar' },
                { value: 'floating' as const, label: 'Floating' },
              ]}
              value={caption.style.position}
              onChange={(v) => onPatch({ style: { ...caption.style, position: v } })}
              className="w-40"
            />
          </div>

          {isFooter && detail && (
            <div>
              <Label className="mb-1.5">Detail line</Label>
              <input
                value={(caption as FooterCaptionState).detail}
                maxLength={80}
                onChange={(e) => onPatch({ detail: e.target.value })}
                placeholder={detail.placeholder}
                className="w-full rounded-md border border-line bg-surface-1 px-3 py-2 font-mono text-xs text-ink-2 outline-none transition-colors placeholder:text-ink-3 focus:border-line-strong"
              />
              <div className="mt-3">
                <SliderRow
                  label="Detail size"
                  value={Math.round(detailFontPct(caption as FooterCaptionState) * 10) / 10}
                  min={1.2}
                  max={5}
                  step={0.1}
                  onChange={(v) => onPatch({ detailSizePct: v })}
                  format={(v) => `${v}% of height`}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
            <Label>Placement</Label>
            {caption.pos ? (
              <button
                type="button"
                onClick={() => onPatch({ pos: null })}
                className="rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
              >
                Reset position
              </button>
            ) : (
              <span className="font-mono text-[10px] text-ink-3">drag on canvas</span>
            )}
          </div>
        </div>
      )}
    </PanelCard>
  )
}

export default function CaptionsTab({
  header,
  footer,
  onHeaderPatch,
  onFooterPatch,
  focusSignal,
}: {
  header: HeaderCaptionState
  footer: FooterCaptionState
  onHeaderPatch: (patch: Partial<HeaderCaptionState>) => void
  onFooterPatch: (patch: Partial<FooterCaptionState>) => void
  /** increments when a canvas caption was clicked — used to flash the tab */
  focusSignal?: number
}) {
  void focusSignal
  return (
    <div className="space-y-3 p-4">
      <CaptionGroup
        title="Header caption"
        caption={header}
        maxLen={80}
        placeholder="e.g. Summer glow-up"
        onPatch={onHeaderPatch}
      />
      <CaptionGroup
        title="Footer caption / details"
        caption={footer}
        maxLen={120}
        placeholder="e.g. Shot on 35mm → graded in SplitFrame"
        detail={{ placeholder: 'optional detail line' }}
        onPatch={onFooterPatch}
      />
      <p className="px-1 font-mono text-[11px] text-ink-3">
        Captions are burned into the exported video.
      </p>
    </div>
  )
}
