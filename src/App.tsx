import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Editor from '@/pages/Editor'
import Guide from '@/pages/Guide'
import Faq from '@/pages/Faq'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="editor" element={<Editor />} />
        <Route path="guide" element={<Guide />} />
        <Route path="faq" element={<Faq />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
