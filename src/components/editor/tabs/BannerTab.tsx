/**
 * Banner tab: emblem banner overlay. Two modes —
 *   Template: canvas recreation of the Urdu government-style banner
 *     (green header bar + cream caption strip) with editable text and
 *     emblem/photo uploads.
 *   Upload: a finished banner/emblem image (PNG w/ transparency) composited
 *     over the video.
 */
import { useRef } from 'react'
import { ImageIcon, Trash2, UploadCloud } from 'lucide-react'
import type { BannerImageFit, BannerImageSlot, BannerState } from '@/lib/editor/types'
import { BANNER_FONT_FAMILY } from '@/lib/editor/banner'
import { truncateMiddle } from '@/lib/editor/media'
import { Switch } from '@/components/ui/switch'
import { Label, PanelCard, Segmented, SliderRow } from '../controls'
import { cn } from '@/lib/utils'

export type BannerImageSlotId = 'emblem' | 'photo' | 'upload'

/** Compact image picker row: thumbnail + name + remove, or a dashed upload box. */
function ImageSlotRow({
  title,
  hint,
  slot,
  circle,
  fit,
  onFitChange,
  onFile,
  onRemove,
}: {
  title: string
  hint: string
  slot: BannerImageSlot
  /** circular thumbnail (emblem) */
  circle?: boolean
  /** per-image fit mode; when set (and an image is loaded) a Fit/Fill toggle shows */
  fit?: BannerImageFit
  onFitChange?: (v: BannerImageFit) => void
  onFile: (f: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <PanelCard>
      <Label className="mb-2">{title}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      {slot.url ? (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'checkerboard-faint flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-line',
              circle ? 'rounded-full' : 'rounded-md',
            )}
          >
            <img src={slot.url} alt={slot.name ?? title} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-ink-2">{truncateMiddle(slot.name ?? 'image')}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
              >
                Change
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-warn"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Upload ${title.toLowerCase()}`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-[1.5px] border-dashed border-line-strong transition-all duration-150 hover:border-ink-3"
        >
          <UploadCloud className="h-4 w-4 text-ink-3" />
          <span className="font-mono text-[11px] text-ink-2">Upload {title.toLowerCase()}</span>
          <span className="font-mono text-[10px] text-ink-3">{hint}</span>
        </div>
      )}
      {fit !== undefined && onFitChange && slot.url && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
          <Label>Image fit</Label>
          <Segmented
            size="sm"
            options={[
              { value: 'contain' as const, label: 'Fit', title: 'Whole image visible, letterboxed' },
              { value: 'cover' as const, label: 'Fill', title: 'Fill the slot, cropping overflow' },
            ]}
            value={fit}
            onChange={onFitChange}
            className="w-36"
          />
        </div>
      )}
    </PanelCard>
  )
}

const URDU_INPUT_STYLE = { fontFamily: BANNER_FONT_FAMILY } as const

export default function BannerTab({
  banner,
  onPatch,
  onImage,
  onImageRemove,
}: {
  banner: BannerState
  onPatch: (patch: Partial<BannerState>) => void
  onImage: (slot: BannerImageSlotId, file: File) => void
  onImageRemove: (slot: BannerImageSlotId) => void
}) {
  const t = banner.template
  const patchTemplate = (p: Partial<BannerState['template']>) =>
    onPatch({ template: { ...banner.template, ...p } })
  const patchUpload = (p: Partial<BannerState['upload']>) =>
    onPatch({ upload: { ...banner.upload, ...p } })

  return (
    <div className="space-y-3 p-4">
      <PanelCard>
        <div className="flex items-center justify-between">
          <Label>Emblem banner</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3">{banner.enabled ? 'On' : 'Off'}</span>
            <Switch
              checked={banner.enabled}
              onCheckedChange={(v) => onPatch({ enabled: v })}
              aria-label="Enable emblem banner"
            />
          </div>
        </div>
      </PanelCard>

      {banner.enabled && (
        <>
          <Segmented
            options={[
              { value: 'template' as const, label: 'Template' },
              { value: 'upload' as const, label: 'Upload image' },
            ]}
            value={banner.mode}
            onChange={(v) => onPatch({ mode: v })}
          />

          <PanelCard className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label>Placement</Label>
              <Segmented
                size="sm"
                options={[
                  { value: 'top' as const, label: 'Top' },
                  { value: 'bottom' as const, label: 'Bottom' },
                ]}
                value={banner.placement}
                onChange={(v) => onPatch({ placement: v })}
                className="w-36"
              />
            </div>
            {banner.mode === 'template' && (
              <SliderRow
                label="Height"
                value={Math.round(banner.heightPct * 10) / 10}
                min={10}
                max={30}
                step={0.5}
                onChange={(v) => onPatch({ heightPct: v })}
                format={(v) => `${v}% of height`}
              />
            )}
            <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
              <Label>Position</Label>
              {banner.pos ? (
                <button
                  type="button"
                  onClick={() => onPatch({ pos: null })}
                  className="rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  Reset position
                </button>
              ) : (
                <span className="font-mono text-[10px] text-ink-3">
                  {banner.mode === 'template' ? 'drag the banner up/down on canvas' : 'drag the banner on canvas'}
                </span>
              )}
            </div>
          </PanelCard>

          {banner.mode === 'template' ? (
            <>
              <PanelCard className="space-y-3">
                <div>
                  <Label className="mb-1.5">Headline (Urdu)</Label>
                  <textarea
                    dir="rtl"
                    lang="ur"
                    rows={2}
                    value={t.headline}
                    maxLength={140}
                    onChange={(e) => patchTemplate({ headline: e.target.value })}
                    placeholder="وزیراعلیٰ پنجاب [نام] کی ہدایت پر"
                    className="w-full resize-none rounded-md border border-line bg-surface-1 px-3 py-2 text-base leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-line-strong"
                    style={URDU_INPUT_STYLE}
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Caption (Urdu)</Label>
                  <textarea
                    dir="rtl"
                    lang="ur"
                    rows={3}
                    value={t.caption}
                    maxLength={220}
                    onChange={(e) => patchTemplate({ caption: e.target.value })}
                    placeholder="یہاں اپنی خبر کا متن لکھیں"
                    className="w-full resize-none rounded-md border border-line bg-surface-1 px-3 py-2 text-base leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-line-strong"
                    style={URDU_INPUT_STYLE}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1.5">Tag title</Label>
                    <input
                      dir="auto"
                      value={t.tagTitle}
                      maxLength={24}
                      onChange={(e) => patchTemplate({ tagTitle: e.target.value })}
                      placeholder="CM PUNJAB"
                      className="w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-line-strong"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5">Tag name</Label>
                    <input
                      dir="auto"
                      value={t.tagName}
                      maxLength={32}
                      onChange={(e) => patchTemplate({ tagName: e.target.value })}
                      placeholder="[NAME]"
                      className="w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-line-strong"
                    />
                  </div>
                </div>
                <p className="font-mono text-[10px] leading-relaxed text-ink-3">
                  Urdu fields render right-to-left in Noto Nastaliq Urdu, loaded at
                  runtime (serif fallback when offline).
                </p>
              </PanelCard>

              <ImageSlotRow
                title="Emblem"
                hint="any aspect — the whole logo stays visible"
                slot={t.emblem}
                circle
                fit={banner.emblemFit}
                onFitChange={(v) => onPatch({ emblemFit: v })}
                onFile={(f) => onImage('emblem', f)}
                onRemove={() => onImageRemove('emblem')}
              />
              <ImageSlotRow
                title="Photo"
                hint="optional — dashed box when empty"
                slot={t.photo}
                fit={banner.photoFit}
                onFitChange={(v) => onPatch({ photoFit: v })}
                onFile={(f) => onImage('photo', f)}
                onRemove={() => onImageRemove('photo')}
              />
            </>
          ) : (
            <>
              <ImageSlotRow
                title="Banner image"
                hint="PNG with transparency recommended"
                slot={banner.upload}
                onFile={(f) => onImage('upload', f)}
                onRemove={() => onImageRemove('upload')}
              />
              <PanelCard
                className={cn('space-y-4', !banner.upload.url && 'pointer-events-none opacity-40')}
              >
                <SliderRow
                  label="Width"
                  value={Math.round(banner.upload.widthPct * 10) / 10}
                  min={20}
                  max={100}
                  step={1}
                  onChange={(v) => patchUpload({ widthPct: v })}
                  format={(v) => `${v}% of width`}
                />
                <SliderRow
                  label="Opacity"
                  value={Math.round(banner.upload.opacity * 100)}
                  min={10}
                  max={100}
                  onChange={(v) => patchUpload({ opacity: v / 100 })}
                  format={(v) => `${v}%`}
                />
              </PanelCard>
            </>
          )}

          <p className="flex items-start gap-1.5 px-1 font-mono text-[11px] leading-relaxed text-ink-3">
            <ImageIcon className="mt-0.5 h-3 w-3 shrink-0" />
            The banner is burned into both MP4 and WebM exports, exactly as
            previewed.
          </p>
        </>
      )}
    </div>
  )
}
