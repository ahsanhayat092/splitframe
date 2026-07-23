import GuideHeader from '@/components/guide/GuideHeader'
import GuideSteps from '@/components/guide/GuideSteps'
import FormatMatrix from '@/components/guide/FormatMatrix'
import Shortcuts from '@/components/guide/Shortcuts'
import GuideCta from '@/components/guide/GuideCta'

/**
 * Guide — "How it works" tutorial page (guide.md).
 * 4-step workflow, supported format matrix, keyboard shortcuts, CTA band.
 */
export default function Guide() {
  return (
    <>
      <GuideHeader />
      <GuideSteps />
      <FormatMatrix />
      <Shortcuts />
      <GuideCta />
    </>
  )
}
