import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from 'react'
import { Layout } from '@/components/layout/Layout'
import { SplashScreen } from '@/components/splash/SplashScreen'
import { SPLASH_KEY } from '@/lib/brand'
import { loadModel } from '@/lib/ml/model'
import { RouterProvider, ScrollManager, useLocation } from '@/lib/router'
import Home from '@/pages/Home'
import Classify from '@/pages/Classify'

const Result = lazy(() => import('@/pages/Result'))
const About = lazy(() => import('@/pages/About'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const ROUTES: Record<string, { el: ComponentType; title: string }> = {
  '/': { el: Home, title: 'PILAH · Pilih Langkah Bijak untuk Sampah' },
  '/klasifikasi': { el: Classify, title: 'Pindai sampah · PILAH' },
  '/hasil': { el: Result, title: 'Hasil pindaian · PILAH' },
  '/tentang': { el: About, title: 'Tentang PILAH' },
}

function Pages() {
  const { pathname } = useLocation()
  const route = ROUTES[pathname]
  const Page = route?.el ?? NotFound
  useEffect(() => {
    document.title = route?.title ?? 'Halaman tidak ditemukan · PILAH'
  }, [route])
  return (
    // key = pathname: setiap pindah halaman, kontennya masuk dengan animasi halus.
    <div key={pathname} className="halaman-masuk">
      <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
        <Page />
      </Suspense>
    </div>
  )
}

const seen = () => {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === '1'
  } catch {
    return true
  }
}

export default function App() {
  const [splash, setSplash] = useState(() => !seen())
  // Halaman baru dirender saat splash mulai memudar, supaya animasi masuk beranda terlihat utuh.
  const [showPage, setShowPage] = useState(() => !splash)
  // Model mulai dimuat sejak awal, berbarengan dengan splash.
  const modelReady = useMemo(() => loadModel().catch(() => undefined), [])

  useEffect(() => {
    document.documentElement.style.overflow = splash ? 'hidden' : ''
  }, [splash])

  const finish = () => {
    try {
      sessionStorage.setItem(SPLASH_KEY, '1')
    } catch {
      /* mode privat: abaikan */
    }
    setShowPage(true)
    setSplash(false)
  }

  return (
    <RouterProvider>
      <ScrollManager />
      {showPage && (
        <div aria-hidden={splash || undefined} inert={splash || undefined}>
          <Layout>
            <Pages />
          </Layout>
        </div>
      )}
      {splash && (
        <SplashScreen
          onExitStart={() => setShowPage(true)}
          onDone={finish}
          modelReady={modelReady}
        />
      )}
    </RouterProvider>
  )
}
