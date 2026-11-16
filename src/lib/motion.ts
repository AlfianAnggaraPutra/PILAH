import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/* ------------------------------------------------------------------ */
/* Preferensi gerak                                                    */
/* ------------------------------------------------------------------ */

const RM_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeRM(cb: () => void) {
  const mq = window.matchMedia(RM_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(RM_QUERY).matches
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeRM, prefersReducedMotion, () => false)
}

/* ------------------------------------------------------------------ */
/* Easing pegas                                                        */
/* ------------------------------------------------------------------ */

const springCache = new Map<string, { easing: string; duration: number }>()

const supportsLinear =
  typeof CSS !== 'undefined' && CSS.supports?.('animation-timing-function', 'linear(0, 1)')

/**
 * Membuat easing pegas teredam sebagai fungsi CSS `linear()`.
 * Hasilnya dipakai oleh Web Animations API maupun transisi CSS, tanpa pustaka animasi.
 */
export function spring(stiffness = 260, damping = 16, mass = 1) {
  const key = `${stiffness}/${damping}/${mass}`
  const hit = springCache.get(key)
  if (hit) return hit
  const dt = 1 / 120
  let x = 0
  let v = 0
  const pts: number[] = []
  let settled = 0
  for (let i = 0; i < 600; i++) {
    const a = (-stiffness * (x - 1) - damping * v) / mass
    v += a * dt
    x += v * dt
    pts.push(x)
    if (Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) {
      if (++settled > 6) break
    } else settled = 0
  }
  pts[pts.length - 1] = 1
  const step = Math.max(1, Math.floor(pts.length / 48))
  const sampled = pts.filter((_, i) => i % step === 0)
  if (sampled[sampled.length - 1] !== 1) sampled.push(1)
  const easing = supportsLinear
    ? `linear(0, ${sampled.map((p) => +p.toFixed(4)).join(', ')})`
    : 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  const res = { easing, duration: Math.round(pts.length * dt * 1000) }
  springCache.set(key, res)
  return res
}

export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const EASE_IN = 'cubic-bezier(0.55, 0, 1, 0.45)'

/** Jalankan animasi WAAPI dan tunggu selesai. Aman bila elemen sudah hilang. */
export function play(
  el: Element | null | undefined,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions,
): Promise<void> {
  if (!el) return Promise.resolve()
  const anim = el.animate(keyframes, { fill: 'both', ...options })
  return anim.finished.then(
    () => undefined,
    () => undefined,
  )
}

/* ------------------------------------------------------------------ */
/* Muncul saat discroll                                                */
/* ------------------------------------------------------------------ */

/** Pasang data-tampak="1" saat elemen masuk layar. Dipakai bersama kelas .muncul. */
export function useInView<T extends Element>(options: { once?: boolean; margin?: string } = {}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  const { once = true, margin = '0px 0px -12% 0px' } = options
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) io.disconnect()
        } else if (!once) setInView(false)
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once, margin])
  return [ref, inView] as const
}

/** Angka yang naik dari 0 ke nilai tujuan dengan easing keluar. */
export function useCountUp(target: number, { duration = 1100, start = true, delay = 0 } = {}) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    let raf = 0
    let t0 = 0
    const timer = setTimeout(() => {
      const tick = (t: number) => {
        if (!t0) t0 = t
        const p = Math.min(1, (t - t0) / duration)
        const eased = 1 - Math.pow(1 - p, 4)
        setValue(target * eased)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [target, duration, start, delay])
  return value
}

/* ------------------------------------------------------------------ */
/* Sorot kursor                                                        */
/* ------------------------------------------------------------------ */

/**
 * Pasang pada onPointerMove elemen berkelas .sorot: cahaya lembut mengikuti kursor.
 * Ditulis langsung ke style (tanpa re-render).
 */
export function trackSpotlight(e: {
  currentTarget: HTMLElement
  clientX: number
  clientY: number
}) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}
