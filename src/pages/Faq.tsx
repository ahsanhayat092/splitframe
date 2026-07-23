import FaqHeader from '@/components/faq/FaqHeader'
import PrivacyDiagram from '@/components/faq/PrivacyDiagram'
import FaqAccordion from '@/components/faq/FaqAccordion'
import BrowserTable from '@/components/faq/BrowserTable'
import Troubleshooting from '@/components/faq/Troubleshooting'
import FaqCta from '@/components/faq/FaqCta'

/**
 * FAQ — privacy & tech page (faq.md).
 * Privacy explainer diagram, accordion, browser support table,
 * troubleshooting cards, CTA band.
 */
export default function Faq() {
  return (
    <>
      <FaqHeader />
      <PrivacyDiagram />
      <FaqAccordion />
      <BrowserTable />
      <Troubleshooting />
      <FaqCta />
    </>
  )
}
