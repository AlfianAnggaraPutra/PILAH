/*
 * Splash PILAH (±5 detik, bisa dilewati dengan ketukan atau tombol keyboard).
 *  1. Sampah organik dan anorganik berjatuhan lalu berhenti MENGELILINGI tengah layar (tengah kosong).
 *  2. Dua tong muncul di tengah dengan tutup masih terbuka.
 *  3. Sampah satu per satu melompat masuk ke tong yang sesuai jenisnya; tong "penyet" tiap menerima.
 *  4. Dua tutup menutup bergantian dengan efek pegas.
 *  5. Logo bergeser ke kiri (di HP: ke atas), nama PILAH jatuh huruf demi huruf, slogan muncul
 *     dan potongan "Pil" + "ah" disorot emas.
 * Semua animasi memakai Web Animations API; hanya transform dan opacity yang dianimasikan.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BinLayer, lidStyle, squish } from '@/components/brand/Bin'
import { BIN_RATIO } from '@/components/brand/binArt'
import { BRAND } from '@/lib/brand'
import { ITEMS } from '@/lib/items'
import { EASE_IN, EASE_OUT, play, prefersReducedMotion, spring } from '@/lib/motion'
import { sleep } from '@/lib/utils'

const BIN_W = 165
const BIN_H = BIN_W / BIN_RATIO
const GAP = 118.5 // posisi kiri tong anorganik
const LOGO_W = GAP + BIN_W
const MOUTH_Y = 88
const MOUTH = { organik: BIN_W / 2, anorganik: GAP + BIN_W / 2 } as const
const ITEM = 72

// Urutan = urutan masuk tong (selang-seling organik/anorganik). rest = titik henti relatif kotak logo.
const STAGE = [
  { id: 'banana', rest: [-78, 40], rot: -18 },
  { id: 'cup', rest: [338, 28], rot: 14 },
  { id: 'apple', rest: [348, 150], rot: -8 },
  { id: 'can', rest: [-62, 154], rot: 10 },
  { id: 'leaf', rest: [232, -88], rot: 22 },
  { id: 'box', rest: [60, -76], rot: -10 },
] as const

const ENV_W = 540
const ENV_H = 360

function useStageScale() {
  const calc = () => {
    if (typeof window === 'undefined') return 0.7
    const wide = window.innerWidth >= 900
    const availW = wide ? window.innerWidth - 120 - 440 : window.innerWidth - 24
    const availH = wide ? window.innerHeight * 0.78 : window.innerHeight * 0.5
    return Math.max(0.42, Math.min(1.35, availW / ENV_W, availH / ENV_H))
  }
  const [scale, setScale] = useState(calc)
  useEffect(() => {
    const on = () => setScale(calc())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return scale
}

function Lockup({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [a, mid, b] = BRAND.sloganParts
  useEffect(() => {
    const root = ref.current
    if (!root || reduced) return
    const s = spring(420, 17)
    root.querySelectorAll<HTMLElement>('[data-letter]').forEach((el, i) => {
      el.animate(
        [
          { transform: 'translateY(-52px)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: s.duration, easing: s.easing, delay: 260 + i * 70, fill: 'both' },
      )
    })
    root.querySelector('[data-slogan]')?.animate(
      [
        { transform: 'translateY(10px)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 450, delay: 760, easing: EASE_OUT, fill: 'both' },
    )
    root.querySelectorAll('[data-mark]').forEach((el, i) =>
      el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: 420,
        delay: 1100 + i * 220,
        easing: EASE_OUT,
        fill: 'both',
      }),
    )
  }, [reduced])

  const Mark = ({ children }: { children: string }) => (
    <span className="relative inline-block px-[3px] text-rimba-900">
      <span
        data-mark
        aria-hidden
        className="absolute inset-x-0 inset-y-[6%] -z-10 origin-left rounded-[5px] bg-emas"
      />
      {children}
    </span>
  )

  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center min-[900px]:items-start min-[900px]:text-left"
    >
      <h1
        aria-label={BRAND.name}
        className="flex font-display text-[3.6rem] leading-none font-bold tracking-[0.16em] text-white min-[900px]:text-[5.4rem]"
      >
        {BRAND.name.split('').map((ch, i) => (
          <span key={i} data-letter aria-hidden className="inline-block">
            {ch}
          </span>
        ))}
      </h1>
      <p
        data-slogan
        className="relative isolate mt-4 text-[1.02rem] font-medium text-mint/85 min-[900px]:mt-5 min-[900px]:text-xl"
      >
        <Mark>{a}</Mark>
        {mid}
        <Mark>{b}</Mark>
      </p>
    </div>
  )
}

export function SplashScreen({
  onDone,
  modelReady,
}: {
  onDone: () => void
  modelReady: Promise<unknown>
}) {
  const reduced = prefersReducedMotion()
  const scale = useStageScale()
  const rootRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const flipFrom = useRef<DOMRect | null>(null)
  const frontRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [lockup, setLockup] = useState(reduced)
  const [closed, setClosed] = useState(reduced)
  const leaving = useRef(false)
  const scaleRef = useRef(scale)
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    scaleRef.current = scale
    onDoneRef.current = onDone
  })

  const finish = useCallback(async () => {
    if (leaving.current) return
    leaving.current = true
    await play(
      rootRef.current,
      [
        { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
        { opacity: 0, transform: 'scale(1.04)', filter: 'blur(6px)' },
      ],
      { duration: reduced ? 200 : 450, easing: 'ease-in-out' },
    )
    onDoneRef.current()
  }, [reduced])

  // Geser logo dengan teknik FLIP saat nama + slogan muncul.
  useLayoutEffect(() => {
    if (!lockup || reduced || !flipFrom.current || !logoRef.current) return
    const to = logoRef.current.getBoundingClientRect()
    const dx = flipFrom.current.left - to.left
    const dy = flipFrom.current.top - to.top
    const s = spring(180, 22)
    logoRef.current.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
      { duration: s.duration, easing: s.easing },
    )
  }, [lockup, reduced])

  useEffect(() => {
    let dead = false
    const root = rootRef.current
    const q = (sel: string) => root?.querySelector<HTMLElement>(sel) ?? null
    const qa = (sel: string) => Array.from(root?.querySelectorAll<HTMLElement>(sel) ?? [])

    async function run() {
      if (reduced) {
        await play(q('[data-stage]'), [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })
        await sleep(1600)
        await Promise.race([modelReady.catch(() => undefined), sleep(2000)])
        if (!dead) finish()
        return
      }

      // 1) Sampah jatuh dari luar layar ke titik hentinya.
      const top = boxRef.current?.getBoundingClientRect().top ?? 0
      const s0 = scaleRef.current
      STAGE.forEach((it, i) => {
        const startY = -((top + (it.rest[1] - ITEM / 2) * s0) / s0) - 120
        q(`[data-item="${it.id}"]`)?.animate(
          [
            { transform: `translate(0px, ${startY}px) rotate(${it.rot - 60}deg)`, opacity: 0, easing: EASE_IN },
            { transform: `translate(0px, 0px) rotate(${it.rot}deg)`, opacity: 1, offset: 0.6, easing: EASE_OUT },
            { transform: `translate(0px, -16px) rotate(${it.rot + 4}deg)`, opacity: 1, offset: 0.82, easing: EASE_IN },
            { transform: `translate(0px, 0px) rotate(${it.rot}deg)`, opacity: 1 },
          ],
          { duration: 760, delay: i * 120, fill: 'both' },
        )
      })
      await sleep(STAGE.length * 120 + 520)
      if (dead) return

      // 2) Tong muncul di tengah yang tadi dikosongkan.
      const pop = spring(230, 18)
      qa('[data-bin]').forEach((el) =>
        el.animate(
          [
            { opacity: 0, transform: 'translateY(30px) scale(0.86)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: pop.duration, easing: pop.easing, fill: 'both' },
        ),
      )
      await sleep(560)
      if (dead) return

      // 3) Pilah: naik dulu di atas bibir tong, menyeberang, lalu jatuh ke mulut tong yang benar.
      const STEP = 170
      const FLIGHT = 900
      STAGE.forEach((it, i) => {
        const kind = ITEMS[it.id].kind
        const [rx, ry] = it.rest
        const dx = MOUTH[kind] - rx
        const apex = Math.min(6, ry - 26) - ry
        const r = it.rot
        const tf = (x: number, y: number, rot: number, sc: number) =>
          `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${sc})`
        q(`[data-item="${it.id}"]`)?.animate(
          [
            { transform: tf(0, 0, r, 1), opacity: 1, easing: 'ease-out' },
            { transform: tf(dx * 0.18, apex, r + 40, 1.08), opacity: 1, offset: 0.26, easing: 'ease-in-out' },
            { transform: tf(dx, apex, r + 90, 1.04), opacity: 1, offset: 0.6, easing: 'ease-in' },
            { transform: tf(dx, MOUTH_Y - 12 - ry, r + 130, 0.72), opacity: 1, offset: 0.82, easing: 'ease-in' },
            { transform: tf(dx, MOUTH_Y + 62 - ry, r + 170, 0.34), opacity: 0 },
          ],
          { duration: FLIGHT, delay: i * STEP, fill: 'forwards' },
        )
        setTimeout(() => !dead && squish(frontRefs.current[kind]), i * STEP + FLIGHT * 0.8)
      })
      await sleep((STAGE.length - 1) * STEP + FLIGHT + 80)
      if (dead) return

      // 4) Tutup menutup (transisi CSS pegas), logo "bump" kecil.
      setClosed(true)
      play(
        logoRef.current?.firstElementChild,
        [{ transform: 'scale(1)' }, { transform: 'scale(0.97)' }, { transform: 'scale(1.025)' }, { transform: 'scale(1)' }],
        { duration: 520, delay: 260, fill: 'none' },
      )
      await sleep(520)
      if (dead) return

      // 5) Logo bergeser, nama dan slogan masuk.
      flipFrom.current = logoRef.current?.getBoundingClientRect() ?? null
      setLockup(true)
      await sleep(1800)
      if (dead) return
      await Promise.race([modelReady.catch(() => undefined), sleep(2500)])
      if (!dead) finish()
    }

    run()
    return () => {
      dead = true
    }
    // Koreografi dijalankan sekali saat splash muncul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['Escape', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        finish()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish])

  const bins = (['organik', 'anorganik'] as const).map((kind) => ({
    kind,
    left: kind === 'organik' ? 0 : GAP,
    style: lidStyle(kind, !closed),
  }))

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${BRAND.name}: ${BRAND.slogan}`}
      data-testid="splash"
      onClick={finish}
      className="pola-titik fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-rimba-900"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_42%_at_50%_58%,rgb(63_191_119/0.22),transparent_70%),radial-gradient(40%_35%_at_88%_6%,rgb(255_194_71/0.16),transparent_70%),radial-gradient(60%_50%_at_0%_100%,rgb(6_26_22/0.9),transparent)]"
      />
      <div
        data-stage
        className="relative flex flex-col items-center gap-6 min-[900px]:flex-row min-[900px]:gap-14"
      >
        <div ref={logoRef}>
          <div
            ref={boxRef}
            className="relative"
            style={{ width: LOGO_W * scale, height: BIN_H * scale }}
          >
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{ width: LOGO_W, height: BIN_H, transform: `scale(${scale})` }}
            >
              {bins.map((b) => (
                <BinLayer
                  key={`b-${b.kind}`}
                  data-bin
                  kind={b.kind}
                  layer="back"
                  lid={!closed}
                  className="top-0 z-10 origin-bottom"
                  style={{
                    left: b.left,
                    width: BIN_W,
                    height: BIN_H,
                    opacity: reduced ? 1 : 0,
                    ...b.style,
                  }}
                />
              ))}
              {!reduced &&
                STAGE.map((it) => (
                  <img
                    key={it.id}
                    data-item={it.id}
                    src={ITEMS[it.id].src}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute z-20 opacity-0 drop-shadow-[0_10px_14px_rgba(0,0,0,0.35)] select-none"
                    style={{
                      left: it.rest[0] - ITEM / 2,
                      top: it.rest[1] - ITEM / 2,
                      width: ITEM,
                      height: ITEM,
                    }}
                  />
                ))}
              {bins.map((b) => (
                <BinLayer
                  key={`f-${b.kind}`}
                  ref={(el) => {
                    frontRefs.current[b.kind] = el
                  }}
                  data-bin
                  kind={b.kind}
                  layer="front"
                  lid={closed}
                  className="top-0 z-30 origin-bottom"
                  style={{
                    left: b.left,
                    width: BIN_W,
                    height: BIN_H,
                    opacity: reduced ? 1 : 0,
                    ...b.style,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {lockup && <Lockup reduced={reduced} />}
      </div>

      <span className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-xs font-medium tracking-wide text-mint/55">
        Ketuk layar untuk melewati
      </span>
    </div>
  )
}
