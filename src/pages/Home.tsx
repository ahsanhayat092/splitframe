import Hero from '@/components/home/Hero'
import MediaMatrix from '@/components/home/MediaMatrix'
import LayoutShowcase from '@/components/home/LayoutShowcase'
import FeatureGrid from '@/components/home/FeatureGrid'
import DemoGallery from '@/components/home/DemoGallery'
import WorkflowStrip from '@/components/home/WorkflowStrip'
import FinalCta from '@/components/home/FinalCta'

export default function Home() {
  return (
    <>
      <Hero />
      <MediaMatrix />
      <LayoutShowcase />
      <FeatureGrid />
      <DemoGallery />
      <WorkflowStrip />
      <FinalCta />
    </>
  )
}
