/**
 * Router kecil berbasis History API. Aplikasi ini hanya punya beberapa halaman,
 * jadi cukup ini saja, tanpa pustaka tambahan.
 *
 * Fitur: tautan, alamat lama dialihkan, gulir ke anchor (#berita, #faq), dan "penahan"
 * (blocker) untuk meminta konfirmasi sebelum meninggalkan halaman yang punya data belum disimpan.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'

export interface Loc {
  pathname: string
  hash: string
  search: string
  key: number
  /** true bila perpindahan terjadi di halaman yang sama (cukup digulir halus). */
  samePage?: boolean
}

/** Mengembalikan true untuk MENAHAN perpindahan ke `to`. */
export type Blocker = (to: string) => boolean

interface NavigateOptions {
  replace?: boolean
  /** Abaikan penahan (dipakai setelah pengguna setuju, atau saat pindah ke halaman hasil). */
  force?: boolean
}

interface RouterValue {
  location: Loc
  navigate: (to: string, opts?: NavigateOptions) => void
  setBlocker: (b: Blocker | null) => void
}

const RouterCtx = createContext<RouterValue | null>(null)

let keySeq = 0
const read = (samePage = false): Loc => ({
  pathname: normalize(window.location.pathname),
  hash: window.location.hash,
  search: window.location.search,
  key: ++keySeq,
  samePage,
})

/** "/tentang/" → "/tentang". */
export function normalize(p: string) {
  const s = p.replace(/\/+$/, '')
  return s === '' ? '/' : s
}

/** Alamat lama dialihkan agar tautan yang sudah dibagikan tetap jalan. */
const REDIRECTS: Record<string, string> = {
  '/cara-kerja': '/tentang#cara-kerja',
  '/panduan': '/#panduan',
  '/berita': '/#berita',
  '/faq': '/#faq',
  '/beranda': '/',
  '/pindai': '/klasifikasi',
  '/scan': '/klasifikasi',
  '/about': '/tentang',
  '/tentang-kami': '/tentang',
}

const currentUrl = () => window.location.pathname + window.location.search + window.location.hash

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Loc>(() => {
    const target = REDIRECTS[normalize(window.location.pathname)]
    if (target) window.history.replaceState(null, '', target)
    return read()
  })
  const blockerRef = useRef<Blocker | null>(null)
  const lastUrl = useRef(currentUrl())

  const navigate = useCallback((to: string, opts: NavigateOptions = {}) => {
    const url = new URL(to, window.location.href)
    const redirected = REDIRECTS[normalize(url.pathname)]
    const finalUrl = redirected ? new URL(redirected, window.location.href) : url
    const target = finalUrl.pathname + finalUrl.search + finalUrl.hash
    const samePage = normalize(finalUrl.pathname) === normalize(window.location.pathname)
    if (!opts.force && !samePage && blockerRef.current?.(target)) return
    const same = target === currentUrl()
    if (opts.replace || same) window.history.replaceState(null, '', finalUrl)
    else window.history.pushState(null, '', finalUrl)
    lastUrl.current = currentUrl()
    setLocation(read(samePage))
  }, [])

  const setBlocker = useCallback((b: Blocker | null) => {
    blockerRef.current = b
  }, [])

  useEffect(() => {
    const onPop = () => {
      const target = currentUrl()
      if (blockerRef.current && blockerRef.current(target)) {
        // Batalkan tombol back: kembalikan alamat semula, keputusan diserahkan ke modal.
        window.history.pushState(null, '', lastUrl.current)
        return
      }
      lastUrl.current = target
      setLocation(read())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const value = useMemo(
    () => ({ location, navigate, setBlocker }),
    [location, navigate, setBlocker],
  )
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>
}

function useRouter() {
  const ctx = useContext(RouterCtx)
  if (!ctx) throw new Error('useRouter harus dipakai di dalam <RouterProvider>')
  return ctx
}

export const useLocation = () => useRouter().location
export const useNavigate = () => useRouter().navigate

/**
 * Pasang penahan selama `blocker` tidak null. Penahan dilepas otomatis saat komponen dilepas.
 */
export function useBlocker(blocker: Blocker | null) {
  const { setBlocker } = useRouter()
  // useLayoutEffect: penahan sudah terpasang sebelum layar digambar, jadi klik secepat apa pun tetap tertahan.
  useLayoutEffect(() => {
    setBlocker(blocker)
    return () => setBlocker(null)
  }, [blocker, setBlocker])
}

/** Gulir ke atas saat berpindah halaman, atau ke anchor bila alamat punya #hash. */
export function ScrollManager() {
  const { pathname, hash, key, samePage } = useLocation()
  useLayoutEffect(() => {
    if (hash) {
      // Tunggu halaman tujuan selesai dirender (termasuk komponen lazy) sebelum mencari anchor.
      let tries = 0
      const find = () => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)))
        if (el) el.scrollIntoView({ behavior: samePage ? 'smooth' : 'instant', block: 'start' })
        else if (tries++ < 20) setTimeout(find, 50)
      }
      find()
    } else {
      window.scrollTo({ top: 0, behavior: samePage ? 'smooth' : 'instant' })
    }
  }, [pathname, hash, key, samePage])
  return null
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string
  replace?: boolean
}

function isModified(e: MouseEvent) {
  return e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0
}

export function Link({ to, replace, onClick, target, ...rest }: LinkProps) {
  const navigate = useNavigate()
  return (
    <a
      href={to}
      target={target}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || isModified(e) || (target && target !== '_self')) return
        e.preventDefault()
        navigate(to, { replace })
      }}
      {...rest}
    />
  )
}

export function NavLink({
  to,
  end,
  active: activeOverride,
  className,
  children,
  ...rest
}: Omit<LinkProps, 'className' | 'children'> & {
  end?: boolean
  /** Paksa status aktif (mis. hasil scroll-spy untuk #berita / #faq). */
  active?: boolean
  className?: (active: boolean) => string
  children: ReactNode | ((active: boolean) => ReactNode)
}) {
  const { pathname } = useLocation()
  const path = to.split('#')[0] || '/'
  const routeActive = end ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)
  const active = activeOverride ?? routeActive
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={className?.(active)}
      {...rest}
    >
      {typeof children === 'function' ? children(active) : children}
    </Link>
  )
}
