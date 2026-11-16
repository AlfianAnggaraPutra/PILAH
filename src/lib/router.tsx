/**
 * Router kecil berbasis History API. Aplikasi ini hanya punya beberapa halaman,
 * jadi cukup ini saja, tanpa pustaka tambahan.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
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
}

interface RouterValue {
  location: Loc
  navigate: (to: string, opts?: { replace?: boolean }) => void
}

const RouterCtx = createContext<RouterValue | null>(null)

let keySeq = 0
const read = (): Loc => ({
  pathname: normalize(window.location.pathname),
  hash: window.location.hash,
  search: window.location.search,
  key: ++keySeq,
})

/** "/tentang/" → "/tentang". */
export function normalize(p: string) {
  const s = p.replace(/\/+$/, '')
  return s === '' ? '/' : s
}

/** Alamat lama dari versi sebelumnya dialihkan agar tautan yang sudah dibagikan tetap jalan. */
const REDIRECTS: Record<string, string> = {
  '/cara-kerja': '/tentang#cara-kerja',
  '/panduan': '/#panduan',
  '/beranda': '/',
  '/pindai': '/klasifikasi',
  '/scan': '/klasifikasi',
  '/about': '/tentang',
  '/tentang-kami': '/tentang',
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Loc>(() => {
    const target = REDIRECTS[normalize(window.location.pathname)]
    if (target) window.history.replaceState(null, '', target)
    return read()
  })

  const navigate = useCallback((to: string, opts: { replace?: boolean } = {}) => {
    const url = new URL(to, window.location.href)
    const redirected = REDIRECTS[normalize(url.pathname)]
    const finalUrl = redirected ? new URL(redirected, window.location.href) : url
    const same =
      finalUrl.pathname === window.location.pathname &&
      finalUrl.search === window.location.search &&
      finalUrl.hash === window.location.hash
    if (opts.replace || same) window.history.replaceState(null, '', finalUrl)
    else window.history.pushState(null, '', finalUrl)
    setLocation(read())
  }, [])

  useEffect(() => {
    const onPop = () => setLocation(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const value = useMemo(() => ({ location, navigate }), [location, navigate])
  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>
}

function useRouter() {
  const ctx = useContext(RouterCtx)
  if (!ctx) throw new Error('useRouter harus dipakai di dalam <RouterProvider>')
  return ctx
}

export const useLocation = () => useRouter().location
export const useNavigate = () => useRouter().navigate

/** Gulir ke atas saat berpindah halaman, atau ke anchor bila alamat punya #hash. */
export function ScrollManager() {
  const { pathname, hash, key } = useLocation()
  useLayoutEffect(() => {
    if (hash) {
      // Tunggu halaman tujuan selesai dirender (termasuk komponen lazy) sebelum mencari anchor.
      let tries = 0
      const find = () => {
        const el = document.getElementById(decodeURIComponent(hash.slice(1)))
        // Lompat langsung (tanpa animasi gulir) karena halaman baru saja berganti.
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
        else if (tries++ < 20) setTimeout(find, 50)
      }
      find()
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash, key])
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
  className,
  children,
  ...rest
}: Omit<LinkProps, 'className' | 'children'> & {
  end?: boolean
  className?: (active: boolean) => string
  children: ReactNode | ((active: boolean) => ReactNode)
}) {
  const { pathname } = useLocation()
  const active = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
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
