import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LogoMark, Slogan, Wordmark } from '@/components/brand/Brand'
import { Icon, type IconName } from '@/components/ui/Icon'
import { NAV } from '@/lib/brand'
import { DATASET, INSTITUTION, PROJECT_LABEL } from '@/lib/content'
import { Link, NavLink, useLocation } from '@/lib/router'
import { cn } from '@/lib/utils'

/** Halaman dengan hero foto gelap: header transparan sampai halaman digulir. */
const TRANSPARENT_TOP = new Set(['/', '/tentang'])
/** Halaman kerja (pindai & hasil) cukup memakai footer ringkas berisi hak cipta. */
const MINIMAL_FOOTER = new Set(['/klasifikasi', '/hasil'])

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [threshold])
  return scrolled
}

/** Bagian beranda yang sedang terlihat (#berita / #faq), untuk menandai menu aktif. */
function useHomeSection(pathname: string) {
  const [section, setSection] = useState<string | null>(null)
  const onHome = pathname === '/'
  useEffect(() => {
    if (!onHome) return
    const ids = ['berita', 'faq']
    const on = () => {
      let current: string | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) current = id
        if (el && el.getBoundingClientRect().bottom < window.innerHeight * 0.3) current = null
      }
      setSection(current)
    }
    const first = requestAnimationFrame(on)
    window.addEventListener('scroll', on, { passive: true })
    const t = setInterval(on, 600) // berjaga bila konten di atasnya berubah tinggi
    return () => {
      cancelAnimationFrame(first)
      window.removeEventListener('scroll', on)
      clearInterval(t)
    }
  }, [onHome])
  return onHome ? section : null
}

/** Garis progres gulir di batas bawah header (pengganti bilah gulir browser). */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (ref.current) ref.current.style.transform = `scaleX(${p})`
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    const ro = new ResizeObserver(on)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-white/6">
      <div
        ref={ref}
        data-testid="scroll-progress"
        className="from-daun via-daun-terang to-emas relative h-full origin-left bg-linear-to-r will-change-transform"
        style={{ transform: 'scaleX(0)' }}
      >
        <span className="bg-emas absolute top-1/2 right-0 size-1.5 translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_12px_3px_rgb(255_194_71/0.7)]" />
      </div>
    </div>
  )
}

function TopBar() {
  const { pathname } = useLocation()
  const scrolled = useScrolled()
  const section = useHomeSection(pathname)
  const clear = TRANSPARENT_TOP.has(pathname) && !scrolled
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,backdrop-filter,box-shadow] duration-500',
        clear
          ? 'bg-transparent'
          : 'bg-latar/75 shadow-[0_10px_40px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 md:h-18">
        <Link
          to="/"
          className="group flex items-center gap-3 rounded-xl"
          aria-label="PILAH, ke beranda"
        >
          <LogoMark className="ease-pegas h-8 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
          <Wordmark className="text-[1.3rem] text-white" />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Utama">
          {NAV.map((n) => {
            const forced =
              n.section !== null
                ? pathname === '/' && section === n.section
                : n.to === '/'
                  ? pathname === '/' && section === null
                  : undefined
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                active={forced}
                className={(active) =>
                  cn(
                    'group relative rounded-full px-4 py-2 text-[0.95rem] font-medium transition-colors duration-300',
                    active ? 'text-white' : 'text-redup hover:text-white',
                  )
                }
              >
                {(active) => (
                  <>
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-0 -z-10 rounded-full bg-white/[0.07] transition-[opacity,transform] duration-300',
                        active
                          ? 'scale-100 opacity-100'
                          : 'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-60',
                      )}
                    />
                    {n.label}
                  </>
                )}
              </NavLink>
            )
          })}
          <Link
            to="/klasifikasi"
            className="kilau bg-emas font-display text-rimba-950 hover:bg-emas-terang ml-3 inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-[0_10px_30px_-10px_rgb(255_194_71/0.7)] transition-[transform,background-color] duration-300 hover:-translate-y-0.5"
          >
            <Icon name="scan" size={17} />
            Pindai sampah
          </Link>
        </nav>
      </div>
      <ScrollProgress />
    </header>
  )
}

/** Navigasi bawah ala aplikasi, hanya di layar kecil. Tombol Pindai di tengah dibuat menonjol. */
function BottomNav() {
  const { pathname } = useLocation()
  const section = useHomeSection(pathname)
  const items: { to: string; label: string; icon: IconName; active: boolean; scan?: boolean }[] = [
    { to: '/', label: 'Beranda', icon: 'home', active: pathname === '/' && section === null },
    {
      to: '/#berita',
      label: 'Berita',
      icon: 'news',
      active: pathname === '/' && section === 'berita',
    },
    {
      to: '/klasifikasi',
      label: 'Pindai',
      icon: 'scan',
      active: pathname === '/klasifikasi' || pathname === '/hasil',
      scan: true,
    },
    { to: '/#faq', label: 'FAQ', icon: 'help', active: pathname === '/' && section === 'faq' },
    { to: '/tentang', label: 'Tentang', icon: 'info', active: pathname === '/tentang' },
  ]
  return (
    <nav
      aria-label="Navigasi bawah"
      className="bg-latar/90 fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
        {items.map((n) => (
          <li key={n.to} className="flex justify-center">
            <NavLink
              to={n.to}
              active={n.active}
              className={(active) =>
                cn(
                  'flex flex-col items-center gap-0.5 text-[0.68rem] font-semibold transition-colors',
                  n.scan ? '-mt-7' : 'px-2 py-1',
                  active ? 'text-white' : 'text-redup',
                )
              }
            >
              {(active) =>
                n.scan ? (
                  <>
                    <span
                      className={cn(
                        'shadow-angkat ring-latar grid size-14 place-items-center rounded-full ring-4 transition-transform active:scale-95',
                        active ? 'bg-emas-terang text-rimba-950' : 'bg-emas text-rimba-950',
                      )}
                    >
                      <Icon name="scan" size={24} />
                    </span>
                    {n.label}
                  </>
                ) : (
                  <>
                    <span
                      className={cn(
                        'grid h-7 w-11 place-items-center rounded-full transition-colors duration-300',
                        active && 'text-daun-terang bg-white/10',
                      )}
                    >
                      <Icon name={n.icon} size={19} strokeWidth={active ? 2.3 : 1.9} />
                    </span>
                    {n.label}
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Copyright() {
  return (
    <p className="text-redup text-center text-xs leading-relaxed sm:text-left">
      © {INSTITUTION.year} PILAH. {PROJECT_LABEL}, {INSTITUTION.university}.
    </p>
  )
}

function Footer({ minimal }: { minimal: boolean }) {
  if (minimal) {
    return (
      <footer className="bg-latar border-t border-white/6 pb-24 md:pb-0">
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6">
          <Copyright />
        </div>
      </footer>
    )
  }
  return (
    <footer className="bg-rimba-950 relative overflow-hidden border-t border-white/6 pb-24 md:pb-0">
      <div aria-hidden className="pola-kisi absolute inset-0 opacity-60" />
      <div
        aria-hidden
        className="bg-daun/10 pointer-events-none absolute -top-40 left-1/2 h-80 w-200 -translate-x-1/2 rounded-full blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pt-16 pb-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" className="group inline-flex items-center gap-3 rounded-xl text-white">
            <LogoMark className="h-10 transition-transform duration-500 group-hover:-rotate-6" />
            <Wordmark className="text-2xl" />
          </Link>
          <p className="text-mint-teks mt-3 text-sm font-medium">
            <Slogan />
          </p>
          <p className="text-redup mt-5 max-w-sm text-sm leading-relaxed">
            Kenali jenis sampahmu dari satu foto, lalu buang ke tong yang tepat. Gratis, tanpa akun,
            dan fotomu tetap di perangkatmu.
          </p>
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold text-white">Jelajahi</h2>
          <ul className="text-redup mt-4 space-y-2.5 text-sm">
            {[
              ['/klasifikasi', 'Pindai sampah'],
              ['/#panduan', 'Panduan memilah'],
              ['/#berita', 'Berita'],
              ['/#faq', 'FAQ'],
              ['/tentang', 'Tentang PILAH'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link
                  to={to}
                  className="group hover:text-emas inline-flex items-center gap-1.5 transition-colors"
                >
                  <span className="bg-emas h-px w-0 transition-[width] duration-300 group-hover:w-3" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold text-white">Penelitian</h2>
          <p className="text-redup mt-4 text-sm leading-relaxed">
            {PROJECT_LABEL}
            <br />
            {INSTITUTION.program}, {INSTITUTION.faculty}
            <br />
            {INSTITUTION.university}, {INSTITUTION.year}
          </p>
          <a
            href={DATASET.url}
            target="_blank"
            rel="noreferrer"
            className="text-redup hover:text-emas mt-4 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            Dataset: {DATASET.name}
            <Icon name="external" size={14} />
          </a>
        </div>
      </div>
      <div className="relative mx-auto max-w-6xl border-t border-white/[0.07] px-5 py-6 sm:px-6">
        <Copyright />
      </div>
    </footer>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#konten"
        className="bg-emas text-rimba-900 fixed top-3 left-3 z-60 -translate-y-24 rounded-full px-4 py-2 font-semibold opacity-0 transition-[transform,opacity] focus:translate-y-0 focus:opacity-100"
      >
        Langsung ke konten
      </a>
      <TopBar />
      <main id="konten" className="flex-1 overflow-x-clip">
        {children}
      </main>
      <Footer minimal={MINIMAL_FOOTER.has(pathname)} />
      <BottomNav />
    </div>
  )
}
