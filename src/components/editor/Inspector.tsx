/**
 * Right rail inspector (editor.md §4): Captions / Logo / Layout / Export.
 * Desktop renders the 4-segment tab bar; mobile renders accordions.
 */
import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import type {
  ExportSettings,
  FooterCaptionState,
  HeaderCaptionState,
  LayoutState,
  LogoState,
} from '@/lib/editor/types'
import CaptionsTab from './tabs/CaptionsTab'
import LogoTab from './tabs/LogoTab'
import LayoutTab from './tabs/LayoutTab'
import ExportTab from './tabs/ExportTab'
import { cn } from '@/lib/utils'

export type InspectorTabId = 'captions' | 'logo' | 'layout' | 'export'

export interface InspectorProps {
  tab: InspectorTabId
  onTab: (t: InspectorTabId) => void
  /** increments to flash the captions tab (canvas click-to-edit) */
  flashCaptions: number
  header: HeaderCaptionState
  footer: FooterCaptionState
  onHeaderPatch: (p: Partial<HeaderCaptionState>) => void
  onFooterPatch: (p: Partial<FooterCaptionState>) => void
  logo: LogoState
  onLogoPatch: (p: Partial<LogoState>) => void
  onLogoFile: (f: File) => void
  onLogoRemove: () => void
  layout: LayoutState
  onLayoutPatch: (p: Partial<LayoutState>) => void
  exportSettings: ExportSettings
  onExportPatch: (p: Partial<ExportSettings>) => void
  timelineDur: number
  speed: number
  canRender: boolean
  anyVideo: boolean
  onRender: () => void
  onSnapshot: () => void
}

const TABS: { id: InspectorTabId; label: string }[] = [
  { id: 'captions', label: 'Captions' },
  { id: 'logo', label: 'Logo' },
  { id: 'layout', label: 'Layout' },
  { id: 'export', label: 'Export' },
]

export default function Inspector(props: InspectorProps) {
  const { tab, onTab, flashCaptions } = props
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (!flashCaptions) return
    setFlash(true)
    const id = setTimeout(() => setFlash(false), 400)
    return () => clearTimeout(id)
  }, [flashCaptions])

  const captionsPanel = (
    <CaptionsTab
      header={props.header}
      footer={props.footer}
      onHeaderPatch={props.onHeaderPatch}
      onFooterPatch={props.onFooterPatch}
    />
  )
  const logoPanel = (
    <LogoTab
      logo={props.logo}
      onPatch={props.onLogoPatch}
      onFile={props.onLogoFile}
      onRemove={props.onLogoRemove}
    />
  )
  const layoutPanel = <LayoutTab layout={props.layout} onPatch={props.onLayoutPatch} />
  const exportPanel = (
    <ExportTab
      settings={props.exportSettings}
      onPatch={props.onExportPatch}
      timelineDur={props.timelineDur}
      speed={props.speed}
      canRender={props.canRender}
      anyVideo={props.anyVideo}
      onRender={props.onRender}
      onSnapshot={props.onSnapshot}
    />
  )

  return (
    <>
      {/* desktop tabs */}
      <div className="hidden h-full min-h-0 flex-col lg:flex">
        <Tabs
          value={tab}
          onValueChange={(v) => onTab(v as InspectorTabId)}
          className="flex h-full min-h-0 flex-col"
        >
          <TabsList className="grid h-11 w-full shrink-0 grid-cols-4 rounded-none border-b border-line bg-surface-1 p-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className={cn(
                  'relative rounded-md text-xs font-semibold data-[state=active]:bg-surface-3 data-[state=active]:text-ink',
                  t.id === 'captions' && flash && 'text-after',
                )}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TabsContent value="captions" className="m-0">{captionsPanel}</TabsContent>
            <TabsContent value="logo" className="m-0">{logoPanel}</TabsContent>
            <TabsContent value="layout" className="m-0">{layoutPanel}</TabsContent>
            <TabsContent value="export" className="m-0">{exportPanel}</TabsContent>
          </div>
        </Tabs>
      </div>

      {/* mobile accordions */}
      <div className="lg:hidden">
        <Accordion type="multiple" defaultValue={['captions']} className="w-full">
          <AccordionItem value="captions" className="border-line">
            <AccordionTrigger
              className={cn(
                'px-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink-2',
                flash && 'text-after',
              )}
            >
              Captions
            </AccordionTrigger>
            <AccordionContent className="p-0">{captionsPanel}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="logo" className="border-line">
            <AccordionTrigger className="px-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink-2">
              Logo
            </AccordionTrigger>
            <AccordionContent className="p-0">{logoPanel}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="layout" className="border-line">
            <AccordionTrigger className="px-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink-2">
              Layout
            </AccordionTrigger>
            <AccordionContent className="p-0">{layoutPanel}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="export" className="border-line">
            <AccordionTrigger className="px-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink-2">
              Export
            </AccordionTrigger>
            <AccordionContent className="p-0">{exportPanel}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  )
}
