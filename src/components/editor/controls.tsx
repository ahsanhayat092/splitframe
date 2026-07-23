/**
 * Small themed control primitives shared across the inspector panels.
 */
import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'block text-xs font-semibold uppercase tracking-[0.08em] text-ink-3',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PanelCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-lg bg-surface-2 p-4', className)}>{children}</div>
}

/** Segmented control (bg-1 well, active bg-3 + lime underline). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: { value: T; label: ReactNode; title?: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className={cn('flex rounded-lg bg-surface-1 p-1', className)} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex-1 rounded-md font-medium transition-colors duration-150',
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-[3px] h-[2px] rounded-full bg-after" />
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Labeled slider with mono readout and ± steppers (touch-friendly per spec §7). */
export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  accent = 'after',
}: {
  label: ReactNode
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
  accent?: 'after' | 'split'
}) {
  const display = format ? format(value) : String(value)
  const nudge = (dir: 1 | -1) => {
    const next = Math.min(max, Math.max(min, Math.round((value + dir * step) * 100) / 100))
    onChange(next)
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-xs text-ink-2 tabular-nums">{display}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="decrease"
          onClick={() => nudge(-1)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-1 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <Minus className="h-3 w-3" />
        </button>
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className={cn(
            'flex-1 [&_[data-slot=slider-range]]:bg-after [&_[data-slot=slider-thumb]]:border-after',
            accent === 'split' &&
              '[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-before [&_[data-slot=slider-range]]:to-after',
          )}
        />
        <button
          type="button"
          aria-label="increase"
          onClick={() => nudge(1)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-1 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

const SWATCHES = ['#F2F4F8', '#B8F04A', '#4CC9F0', '#FFD166']

export function ColorSwatches({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`color ${c}`}
          onClick={() => onChange(c)}
          className={cn(
            'h-6 w-6 rounded-full border transition-transform duration-100 active:scale-95',
            value.toLowerCase() === c.toLowerCase()
              ? 'border-ink ring-2 ring-after ring-offset-2 ring-offset-surface-2'
              : 'border-line-strong hover:border-ink-3',
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <label
        className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-line-strong transition-colors hover:border-ink-3"
        title="Custom color"
        style={{
          background: SWATCHES.some((s) => s.toLowerCase() === value.toLowerCase())
            ? undefined
            : value,
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        {!SWATCHES.some((s) => s.toLowerCase() === value.toLowerCase()) ? null : (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink-3">
            +
          </span>
        )}
      </label>
    </div>
  )
}
