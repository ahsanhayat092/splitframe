/**
 * Captions tab (editor.md §4.1): header + footer caption groups — text, style,
 * per-element font size and free-form position reset — plus the unlimited
 * free-floating text boxes (add / edit / font / size / color / drag-on-canvas).
 */
import type { FooterCaptionState, HeaderCaptionState, TextBox, TextBoxFont } from '@/lib/editor/types'
import {
  CAPTION_SIZE_PCT,
  TEXT_BOX_FONT_STACK,
  TEXT_BOX_MAX_SIZE_PCT,
  TEXT_BOX_MIN_SIZE_PCT,
  captionFontPct,
  detailFontPct,
} from '@/lib/editor/types'
import { AlignCenter, AlignLeft, AlignRight, ChevronDown, Plus, Trash2, Type } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
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

/* ------------------------------ text boxes ------------------------------ */

const TEXT_BOX_SWATCHES = ['#F2F4F8', '#4CC9F0', '#B8F04A', '#FFD166', '#FF6B6B', '#0A0B0E']

const FONT_OPTIONS: { value: TextBoxFont; label: string; title: string }[] = [
  { value: 'space-grotesk', label: 'Grotesk', title: 'Space Grotesk' },
  { value: 'inter', label: 'Inter', title: 'Inter' },
  { value: 'jetbrains-mono', label: 'Mono', title: 'JetBrains Mono' },
  { value: 'nastaliq', label: 'اردو', title: 'Noto Nastaliq Urdu' },
  { value: 'serif', label: 'Serif', title: 'System serif' },
]

/** One text box list item — collapsed row, expands to full controls when selected. */
function TextBoxCard({
  box,
  index,
  selected,
  onPatch,
  onRemove,
  onSelect,
}: {
  box: TextBox
  index: number
  selected: boolean
  onPatch: (patch: Partial<TextBox>) => void
  onRemove: () => void
  onSelect: () => void
}) {
  const preview = box.text.split('\n')[0].trim() || 'Empty text'
  return (
    <PanelCard
      className={cn(
        'p-0 transition-colors',
        selected && 'ring-1 ring-after/60',
      )}
    >
      {/* header row — click to select / expand */}
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <Type className={cn('h-3.5 w-3.5 shrink-0', selected ? 'text-after' : 'text-ink-3')} />
        <span
          className="min-w-0 flex-1 truncate text-sm text-ink"
          style={{ fontFamily: TEXT_BOX_FONT_STACK[box.fontFamily] }}
        >
          {preview}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-ink-3">#{index + 1}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform', selected && 'rotate-180')}
        />
      </button>

      {selected && (
        <div className="space-y-3 border-t border-line px-3 pb-3 pt-3">
          <div>
            <textarea
              value={box.text}
              dir="auto"
              rows={2}
              maxLength={300}
              onChange={(e) => onPatch({ text: e.target.value })}
              placeholder="Type your text… (Urdu/RTL supported)"
              className="w-full resize-y rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-line-strong"
              style={{ fontFamily: TEXT_BOX_FONT_STACK[box.fontFamily] }}
            />
            <div className="mt-1 text-right font-mono text-[10px] text-ink-3">
              {box.text.length}/300
            </div>
          </div>

          <div>
            <Label className="mb-1.5">Font</Label>
            <Segmented
              size="sm"
              options={FONT_OPTIONS}
              value={box.fontFamily}
              onChange={(v) => onPatch({ fontFamily: v })}
              className="w-full"
            />
          </div>

          <SliderRow
            label="Size"
            value={Math.round(box.sizePct * 10) / 10}
            min={TEXT_BOX_MIN_SIZE_PCT}
            max={TEXT_BOX_MAX_SIZE_PCT}
            step={0.1}
            onChange={(v) => onPatch({ sizePct: v })}
            format={(v) => `${v}% of height`}
          />

          <div className="flex items-center justify-between gap-2">
            <Label>Color</Label>
            <ColorSwatches
              value={box.color}
              swatches={TEXT_BOX_SWATCHES}
              onChange={(v) => onPatch({ color: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label>Weight</Label>
            <Segmented
              size="sm"
              options={[
                { value: 'regular' as const, label: 'Regular' },
                { value: 'bold' as const, label: 'Bold' },
              ]}
              value={box.bold ? ('bold' as const) : ('regular' as const)}
              onChange={(v) => onPatch({ bold: v === 'bold' })}
              className="w-36"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label>Align</Label>
            <Segmented
              size="sm"
              options={[
                { value: 'left' as const, label: <AlignLeft className="h-3.5 w-3.5" />, title: 'Left' },
                { value: 'center' as const, label: <AlignCenter className="h-3.5 w-3.5" />, title: 'Center' },
                { value: 'right' as const, label: <AlignRight className="h-3.5 w-3.5" />, title: 'Right' },
              ]}
              value={box.align}
              onChange={(v) => onPatch({ align: v })}
              className="w-36"
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
            {box.x !== 50 || box.y !== 50 ? (
              <button
                type="button"
                onClick={() => onPatch({ x: 50, y: 50 })}
                className="rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
              >
                Reset position
              </button>
            ) : (
              <span className="font-mono text-[10px] text-ink-3">drag on canvas</span>
            )}
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1 rounded-full border border-warn/40 px-2.5 py-1 text-[11px] font-semibold text-warn transition-colors hover:bg-warn/10"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
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
  textBoxes,
  selectedTextBoxId,
  onTextBoxAdd,
  onTextBoxPatch,
  onTextBoxRemove,
  onTextBoxSelect,
  focusSignal,
}: {
  header: HeaderCaptionState
  footer: FooterCaptionState
  onHeaderPatch: (patch: Partial<HeaderCaptionState>) => void
  onFooterPatch: (patch: Partial<FooterCaptionState>) => void
  textBoxes: TextBox[]
  selectedTextBoxId: string | null
  onTextBoxAdd: () => void
  onTextBoxPatch: (id: string, patch: Partial<TextBox>) => void
  onTextBoxRemove: (id: string) => void
  onTextBoxSelect: (id: string | null) => void
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

      {/* ------------------------- free text boxes ------------------------- */}
      <div className="space-y-3 border-t border-line pt-4">
        <div className="flex items-center justify-between px-1">
          <Label>Text boxes</Label>
          {textBoxes.length > 0 && (
            <span className="font-mono text-[10px] text-ink-3">{textBoxes.length}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onTextBoxAdd}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-after text-sm font-semibold text-after-ink transition-all duration-150 hover:shadow-[0_0_14px_rgba(184,240,74,0.35)] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Text Box
        </button>
        {textBoxes.length === 0 ? (
          <p className="px-1 font-mono text-[11px] text-ink-3">
            Add any number of free text boxes — drag them anywhere on the video.
          </p>
        ) : (
          textBoxes.map((box, i) => (
            <TextBoxCard
              key={box.id}
              box={box}
              index={i}
              selected={selectedTextBoxId === box.id}
              onPatch={(p) => onTextBoxPatch(box.id, p)}
              onRemove={() => onTextBoxRemove(box.id)}
              onSelect={() => onTextBoxSelect(selectedTextBoxId === box.id ? null : box.id)}
            />
          ))
        )}
      </div>

      <p className="px-1 font-mono text-[11px] text-ink-3">
        Captions and text boxes are burned into the exported video.
      </p>
    </div>
  )
}
