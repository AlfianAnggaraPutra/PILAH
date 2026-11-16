/*
 * Splash PILAH. Tampil sekali per sesi dan diputar sampai selesai (tanpa tombol lewati).
 *  1. Sampah organik dan anorganik berjatuhan lalu berhenti MENGELILINGI tengah layar (tengah kosong).
 *  2. Dua tong muncul di tengah dengan tutup masih terbuka.
 *  3. Sampah satu per satu melompat masuk ke tong yang sesuai jenisnya; tong "penyet" tiap menerima.
 *  4. Dua tutup menutup dengan efek pegas.
 *  5. Logo bergeser ke kiri (di HP: ke atas) sementara nama PILAH dan slogan muncul di sampingnya.
 *  6. Logo + nama ditahan sekitar 3 detik, lalu pindah ke beranda.
 *
 * Agar pergeseran logo mulus, tata letak akhir (logo + teks) sudah dirender sejak awal.
 * Teks disembunyikan, logo digeser ke tengah memakai transform. Saat lockup, transform itu
 * dianimasikan kembali ke 0. Tidak ada perubahan layout di tengah animasi, jadi tidak ada lompatan.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
/** Lama logo + nama ditahan sebelum pindah ke beranda. */
const HOLD_MS = 3000
/** Kurva gerak utama: mulai dan berhenti lembut. */
const EASE_INOUT = 'cubic-bezier(0.65, 0, 0.35, 1)'

function useStageScale() {
  const calc = () => {
    if (typeof window === 'undefined') return 0.7
    const wide = window.innerWidth >= 900
    const availW = wide ? window.innerWidth - 120 - 460 : window.innerWidth - 24
    const availH = wide ? window.innerHeight * 0.78 : window.innerHeight * 0.48
    return Math.max(0.42, Math.min(1.3, availW / ENV_W, availH / ENV_H))
  }
  const [scale, setScale] = useState(calc)
  useEffect(() => {
    const on = () => setScale(calc())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return scale
}

export function SplashScreen({
  onDone,
  onExitStart,
  modelReady,
}: {
  onDone: () => void
  /** Dipanggil saat splash mulai memudar (halaman di belakangnya boleh mulai dirender). */
  onExitStart?: () => void
  modelReady: Promise<unknown>
}) {
  const reduced = prefersReducedMotion()
  const scale = useStageScale()
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const frontRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [closed, setClosed] = useState(reduced)
  const shifted = useRef(reduced)
  const offset = useRef({ x: 0, y: 0 })
  const onDoneRef = useRef(onDone)
  const onExitRef = useRef(onExitStart)
  const scaleRef = useRef(scale)
  useEffect(() => {
    onDoneRef.current = onDone
    onExitRef.current = onExitStart
    scaleRef.current = scale
  })

  /** Hitung jarak dari posisi akhir logo ke tengah panggung, lalu pasang sebagai transform awal. */
  useLayoutEffect(() => {
    const stage = stageRef.current
    const logo = logoRef.current
    if (!stage || !logo || shifted.current) return
    logo.style.transform = 'none'
    const s = stage.getBoundingClientRect()
    const l = logo.getBoundingClientRect()
    offset.current = {
      x: s.left + s.width / 2 - (l.left + l.width / 2),
      y: s.top + s.height / 2 - (l.top + l.height / 2),
    }
    logo.style.transform = `translate(${offset.current.x}px, ${offset.current.y}px)`
  }, [scale])

  useEffect(() => {
    let dead = false
    const root = rootRef.current
    const q = (sel: string) => root?.querySelector<HTMLElement>(sel) ?? null
    const qa = (sel: string) => Array.from(root?.querySelectorAll<HTMLElement>(sel) ?? [])

    async function finish() {
      onExitRef.current?.()
      await play(
        rootRef.current,
        [
          { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' },
          { opacity: 0, transform: 'scale(1.03)', filter: 'blur(8px)' },
        ],
        { duration: reduced ? 250 : 650, easing: 'ease-in-out' },
      )
      onDoneRef.current()
    }

    async function revealText() {
      const text = textRef.current
      if (!text) return
      text.style.visibility = 'visible'
      const letters = Array.from(text.querySelectorAll<HTMLElement>('[data-letter]'))
      letters.forEach((el, i) =>
        el.animate(
          [
            { opacity: 0, transform: 'translateY(0.35em)', filter: 'blur(10px)' },
            { opacity: 1, transform: 'none', filter: 'blur(0px)' },
          ],
          { duration: 900, delay: 120 + i * 85, easing: EASE_OUT, fill: 'both' },
        ),
      )
      text
        .querySelector('[data-rule]')
        ?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
          duration: 900,
          delay: 520,
          easing: EASE_INOUT,
          fill: 'both',
        })
      await play(
        text.querySelector('[data-slogan]'),
        [
          { opacity: 0, transform: 'translateY(12px)', filter: 'blur(6px)' },
          { opacity: 1, transform: 'none', filter: 'blur(0px)' },
        ],
        { duration: 900, delay: 700, easing: EASE_OUT },
      )
    }

    async function run() {
      if (reduced) {
        await play(q('[data-stage]'), [{ opacity: 0 }, { opacity: 1 }], { duration: 400 })
        await sleep(HOLD_MS)
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
            {
              transform: `translate(0px, ${startY}px) rotate(${it.rot - 60}deg)`,
              opacity: 0,
              easing: EASE_IN,
            },
            {
              transform: `translate(0px, 0px) rotate(${it.rot}deg)`,
              opacity: 1,
              offset: 0.6,
              easing: EASE_OUT,
            },
            {
              transform: `translate(0px, -16px) rotate(${it.rot + 4}deg)`,
              opacity: 1,
              offset: 0.82,
              easing: EASE_IN,
            },
            { transform: `translate(0px, 0px) rotate(${it.rot}deg)`, opacity: 1 },
          ],
          { duration: 760, delay: i * 120, fill: 'both' },
        )
      })
      await sleep(STAGE.length * 120 + 560)
      if (dead) return

      // 2) Tong muncul di tengah yang tadi dikosongkan.
      const pop = spring(230, 20)
      qa('[data-bin]').forEach((el) =>
        el.animate(
          [
            { opacity: 0, transform: 'translateY(30px) scale(0.86)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: pop.duration, easing: pop.easing, fill: 'both' },
        ),
      )
      await sleep(600)
      if (dead) return

      // 3) Pilah: naik dulu di atas bibir tong, menyeberang, lalu jatuh ke mulut tong yang benar.
      const STEP = 180
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
            {
              transform: tf(dx * 0.18, apex, r + 40, 1.08),
              opacity: 1,
              offset: 0.26,
              easing: 'ease-in-out',
            },
            { transform: tf(dx, apex, r + 90, 1.04), opacity: 1, offset: 0.6, easing: 'ease-in' },
            {
              transform: tf(dx, MOUTH_Y - 12 - ry, r + 130, 0.72),
              opacity: 1,
              offset: 0.82,
              easing: 'ease-in',
            },
            { transform: tf(dx, MOUTH_Y + 62 - ry, r + 170, 0.34), opacity: 0 },
          ],
          { duration: FLIGHT, delay: i * STEP, fill: 'forwards' },
        )
        setTimeout(() => !dead && squish(frontRefs.current[kind]), i * STEP + FLIGHT * 0.8)
      })
      await sleep((STAGE.length - 1) * STEP + FLIGHT + 120)
      if (dead) return

      // 4) Tutup menutup (transisi CSS pegas).
      setClosed(true)
      await sleep(750)
      if (dead) return

      // 5) Logo bergeser dari tengah ke posisi akhirnya, teks muncul bersamaan.
      const logo = logoRef.current
      const { x, y } = offset.current
      shifted.current = true
      const shift = logo?.animate(
        [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0px, 0px)' }],
        { duration: 1100, easing: EASE_INOUT, fill: 'forwards' },
      )
      if (logo) logo.style.transform = ''
      await sleep(260)
      await revealText()
      await shift?.finished.catch(() => undefined)
      if (dead) return

      // 6) Tahan ±3 detik agar nama dan slogan sempat dinikmati.
      await sleep(HOLD_MS)
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
      className="bg-latar fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
    >
      <div aria-hidden className="pola-titik absolute inset-0 opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_45%_at_50%_55%,rgb(63_191_119/0.2),transparent_70%),radial-gradient(40%_35%_at_88%_6%,rgb(255_194_71/0.12),transparent_70%),radial-gradient(60%_50%_at_0%_100%,rgb(3_14_11/0.9),transparent)]"
      />
      <div
        ref={stageRef}
        data-stage
        className="relative flex flex-col items-center gap-7 min-[900px]:flex-row min-[900px]:gap-14"
      >
        <div ref={logoRef} className="relative z-10 will-change-transform">
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
                    className="pointer-events-none absolute z-20 opacity-0 drop-shadow-[0_10px_14px_rgba(0,0,0,0.4)] select-none"
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

        {/* Nama + slogan. Sudah ada di layout sejak awal, hanya disembunyikan. */}
        <div
          ref={textRef}
          className="flex flex-col items-center text-center min-[900px]:items-start min-[900px]:text-left"
          style={{ visibility: reduced ? 'visible' : 'hidden' }}
        >
          <h1
            aria-label={BRAND.name}
            className="font-display flex text-[3.4rem] leading-none font-bold tracking-[0.18em] text-white min-[900px]:text-[5.2rem]"
          >
            {BRAND.name.split('').map((ch, i) => (
              <span key={i} data-letter aria-hidden className="inline-block">
                {ch}
              </span>
            ))}
          </h1>
          <span
            data-rule
            aria-hidden
            className="from-daun to-emas mt-4 block h-[3px] w-24 origin-left rounded-full bg-gradient-to-r min-[900px]:mt-5"
          />
          <p
            data-slogan
            className="text-mint-teks mt-4 text-base font-medium tracking-wide min-[900px]:text-xl"
          >
            {BRAND.slogan}
          </p>
        </div>
      </div>
    </div>
  )
}
