/**
 * Editor top bar (editor.md §1.1): back link, project name, status chip, Export.
 */
import { Link } from 'react-router'
import { ChevronLeft, CircleHelp, Download, Pencil } from 'lucide-react'
import type { EditorStatus } from '@/lib/editor/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause'],
  ['← / →', 'Step one frame'],
  ['U', 'Upload media'],
  ['G', 'Toggle safe-area guides'],
  ['E', 'Export'],
  ['?', 'This panel'],
]

function StatusChip({ status }: { status: EditorStatus }) {
  return (
    <span
      className={cn(
        'hidden items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs tracking-wide sm:flex',
        status === 'ready' && 'border-line text-after',
        status === 'rendering' && 'border-line text-[#FFB454]',
        status === 'error' && 'border-line text-warn',
      )}
    >
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          status === 'ready' && 'bg-after',
          status === 'rendering' && 'animate-pulse bg-[#FFB454]',
          status === 'error' && 'bg-warn',
        )}
      />
      {status === 'ready' ? 'READY' : status === 'rendering' ? 'RENDERING' : 'ERROR'}
    </span>
  )
}

export default function TopBar({
  projectName,
  onProjectName,
  status,
  canExport,
  onExport,
}: {
  projectName: string
  onProjectName: (v: string) => void
  status: EditorStatus
  canExport: boolean
  onExport: () => void
}) {
  return (
    <div className="flex h-14 items-center justify-between gap-3 border-b border-line bg-surface-1 px-3 sm:px-4">
      {/* left: back + wordmark */}
      <Link
        to="/"
        className="group flex shrink-0 items-center gap-1.5 text-ink-2 transition-colors hover:text-ink"
        aria-label="Back to home"
      >
        <ChevronLeft className="h-4 w-4" />
        <img src="/logo.svg" alt="" width={18} height={18} />
        <span className="hidden font-display text-[15px] font-semibold tracking-tight sm:inline">
          <span className="text-ink">Split</span>
          <span className="text-after">Frame</span>
        </span>
      </Link>

      {/* center: project name */}
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <div className="group flex min-w-0 items-center gap-1.5 rounded-md border border-transparent px-2 py-1 transition-colors focus-within:border-line-strong hover:border-line">
          <input
            value={projectName}
            onChange={(e) => onProjectName(e.target.value)}
            spellCheck={false}
            aria-label="Project name"
            className="w-40 min-w-0 bg-transparent text-center font-mono text-xs tracking-wide text-ink-2 outline-none placeholder:text-ink-3 sm:w-56"
            placeholder="untitled-comparison"
          />
          <Pencil className="h-3 w-3 shrink-0 text-ink-3 transition-colors group-focus-within:text-ink-2" />
        </div>
      </div>

      {/* right */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <StatusChip status={status} />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Keyboard shortcuts"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 border-line bg-surface-3 p-3" align="end">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">
              Shortcuts
            </p>
            <ul className="space-y-1.5">
              {SHORTCUTS.map(([k, label]) => (
                <li key={k} className="flex items-center justify-between gap-3">
                  <kbd className="rounded border border-line-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
                    {k}
                  </kbd>
                  <span className="text-xs text-ink-2">{label}</span>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <button
                  type="button"
                  onClick={onExport}
                  disabled={!canExport}
                  className={cn(
                    'flex h-9 items-center gap-1.5 rounded-full bg-after px-4 text-sm font-semibold text-after-ink transition-all duration-150 active:scale-[0.97]',
                    canExport
                      ? 'hover:shadow-[0_0_20px_rgba(184,240,74,0.35)]'
                      : 'cursor-not-allowed opacity-50',
                  )}
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </span>
            </TooltipTrigger>
            {!canExport && (
              <TooltipContent className="border-line bg-surface-3 font-mono text-xs text-ink-2">
                Add media to both sides
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
