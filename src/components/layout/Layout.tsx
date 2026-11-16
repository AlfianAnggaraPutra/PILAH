import { useEffect, useState, type ReactNode } from 'react'
import { LogoMark, Slogan, Wordmark } from '@/components/brand/Brand'
import { Icon, type IconName } from '@/components/ui/Icon'
import { NAV } from '@/lib/brand'
import { DATASET, INSTITUTION } from '@/lib/content'
import { Link, NavLink, useLocation } from '@/lib/router'
import { cn } from '@/lib/utils'

/** Halaman yang punya hero gelap: header transparan dengan teks terang sampai halaman digulir. */
const DARK_TOP = new Set(['/', '/tentang'])

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

function TopBar() {
  const { pathname } = useLocation()
  const scrolled = useScrolled()
  const dark = DARK_TOP.has(pathname) && !scrolled
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow,color] duration-300',
        dark
          ? 'bg-transparent text-white'
          : 'bg-kertas/85 text-teks shadow-[0_1px_0_rgb(11_43_38/0.08)] backdrop-blur-lg',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 md:h-[4.5rem]">
        <Link to="/" className="group flex items-center gap-3 rounded-xl" aria-label="PILAH, ke beranda">
          <LogoMark className="h-8 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105" />
          <Wordmark className="text-[1.3rem]" />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Utama">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={(active) =>
                cn(
                  'relative rounded-full px-4 py-2 text-[0.95rem] font-medium transition-colors',
                  dark
                    ? active
                      ? 'text-white'
                      : 'text-white/70 hover:text-white'
                    : active
                      ? 'text-teks'
                      : 'text-redup hover:text-teks',
                )
              }
            >
              {(active) => (
                <>
                  {n.label}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-x-4 -bottom-0.5 h-[2px] origin-left rounded-full bg-emas transition-transform duration-300',
                      active ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
          <Link
            to="/klasifikasi"
            className={cn(
              'kilau ml-3 inline-flex h-10 items-center gap-2 rounded-full px-5 font-display text-sm font-semibold transition-[transform,background-color] hover:-translate-y-0.5',
              dark ? 'bg-emas text-rimba-900 hover:bg-emas-terang' : 'bg-rimba-900 text-white hover:bg-rimba-800',
            )}
          >
            <Icon name="scan" size={17} />
            Pindai sampah
          </Link>
        </nav>
      </div>
    </header>
  )
}

/** Navigasi bawah ala aplikasi, hanya di layar kecil. Tombol Pindai di tengah dibuat menonjol. */
function BottomNav() {
  const icons: Record<(typeof NAV)[number]['icon'], IconName> = {
    home: 'home',
    scan: 'scan',
    info: 'info',
  }
  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-garis/80 bg-kertas/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-3 items-center">
        {NAV.map((n) => (
          <li key={n.to} className="flex justify-center">
            <NavLink
              to={n.to}
              end={n.to === '/'}
              className={(active) =>
                cn(
                  'flex flex-col items-center gap-0.5 text-[0.7rem] font-semibold transition-colors',
                  n.icon === 'scan' ? '-mt-7' : 'px-4 py-1',
                  active ? 'text-rimba-900' : 'text-redup',
                )
              }
            >
              {(active) =>
                n.icon === 'scan' ? (
                  <>
                    <span
                      className={cn(
                        'grid size-14 place-items-center rounded-full shadow-angkat ring-4 ring-kertas transition-transform active:scale-95',
                        active ? 'bg-emas text-rimba-900' : 'bg-rimba-900 text-white',
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
                        'grid h-7 w-12 place-items-center rounded-full transition-colors',
                        active && 'bg-mint',
                      )}
                    >
                      <Icon name={icons[n.icon]} size={20} strokeWidth={active ? 2.3 : 1.9} />
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

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-rimba-950 pb-24 text-mint/75 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-14 pb-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 rounded-xl text-white">
            <LogoMark className="h-10" />
            <Wordmark className="text-2xl" />
          </Link>
          <p className="mt-3 text-sm">
            <Slogan />
          </p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            Klasifikasi sampah organik dan anorganik dengan CNN yang berjalan langsung di
            perangkatmu. Fotomu tidak pernah diunggah.
          </p>
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold text-white">Jelajahi</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              ['/', 'Beranda'],
              ['/klasifikasi', 'Pindai sampah'],
              ['/#panduan', 'Panduan memilah'],
              ['/tentang#cara-kerja', 'Cara kerja CNN'],
              ['/tentang#tim', 'Tim pengembang'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="transition-colors hover:text-emas">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold text-white">Penelitian</h2>
          <p className="mt-4 text-sm leading-relaxed">
            {INSTITUTION.program}, {INSTITUTION.department}
            <br />
            {INSTITUTION.faculty}
            <br />
            {INSTITUTION.university}, {INSTITUTION.year}
          </p>
          <a
            href={DATASET.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm transition-colors hover:text-emas"
          >
            Dataset: {DATASET.name}
            <Icon name="external" size={14} />
          </a>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-white/10 px-5 py-6 text-xs text-mint/50 sm:flex-row sm:justify-between sm:px-6">
        <span>© {INSTITUTION.year} PILAH</span>
        <span>Ikon sampah 3D: Microsoft Fluent Emoji (MIT)</span>
      </div>
    </footer>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#konten"
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-full bg-emas px-4 py-2 font-semibold text-rimba-900 focus:translate-y-0"
      >
        Langsung ke konten
      </a>
      <TopBar />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
