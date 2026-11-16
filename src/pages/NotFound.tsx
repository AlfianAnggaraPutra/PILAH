import { useRef, useState, type PointerEvent } from 'react'
import { BinLayer, lidStyle, squish } from '@/components/brand/Bin'
import { BIN_RATIO } from '@/components/brand/binArt'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ITEMS } from '@/lib/items'
import { EASE_OUT, play, prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Kind = 'organik' | 'anorganik'
type Status = 'idle' | 'wrong' | 'done'

const COPY: Record<Status, { title: string; body: string }> = {
  idle: {
    title: 'Halaman ini tersesat',
    body: 'Alamat yang kamu buka tidak ada di PILAH. Sambil kembali, bantu koran ini pulang: seret ke tong yang tepat, atau ketuk tongnya.',
  },
  wrong: {
    title: 'Belum tepat',
    body: 'Koran termasuk anorganik karena bisa didaur ulang. Coba tong kuning.',
  },
  done: {
    title: 'Tepat, korannya sudah pulang',
    body: 'Sekarang giliranmu kembali. Halaman yang kamu cari tidak tersedia, tapi semua fitur PILAH masih bisa dipakai.',
  },
}

const BW = 150
const BH = BW / BIN_RATIO
const STAGE_W = BW * 2 + 24
const ITEM = 76
const MOUTH_Y = 150 + (72 + 45) * (BW / 220)

export default function NotFound() {
  const [status, setStatus] = useState<Status>('idle')
  const [open, setOpen] = useState<Kind | null>(null)
  const itemRef = useRef<HTMLButtonElement>(null)
  const binRefs = useRef<Record<Kind, HTMLDivElement | null>>({ organik: null, anorganik: null })
  const drag = useRef<{ sx: number; sy: number; dx: number; dy: number } | null>(null)
  const busy = useRef(false)

  const binX = (k: Kind) => (k === 'organik' ? 0 : BW + 24)
  const hit = (x: number, y: number): Kind | null => {
    for (const k of ['organik', 'anorganik'] as Kind[]) {
      const r = binRefs.current[k]?.getBoundingClientRect()
      if (r && x > r.left - 10 && x < r.right + 10 && y > r.top - 30 && y < r.bottom) return k
    }
    return null
  }

  async function send(kind: Kind, from = { dx: 0, dy: 0 }) {
    if (busy.current || status === 'done') return
    busy.current = true
    setOpen(kind)
    const el = itemRef.current!
    const reduced = prefersReducedMotion()
    const tx = binX(kind) + BW / 2 - STAGE_W / 2
    const ty = MOUTH_Y - ITEM / 2 - 20
    el.style.zIndex = '20'
    await play(
      el,
      [
        { transform: `translate(${from.dx}px, ${from.dy}px) rotate(-8deg)` },
        { transform: `translate(${tx}px, ${ty - 90}px) rotate(30deg)`, offset: 0.5 },
        { transform: `translate(${tx}px, ${ty + 50}px) rotate(80deg) scale(0.4)`, opacity: 0 },
      ],
      { duration: reduced ? 1 : 700, easing: 'ease-in' },
    )
    squish(binRefs.current[kind])
    if (kind === 'anorganik') {
      setStatus('done')
      setOpen(null)
    } else {
      setStatus('wrong')
      el.getAnimations().forEach((a) => a.cancel())
      await play(
        el,
        [
          { transform: `translate(${tx}px, ${ty}px) rotate(80deg) scale(0.4)`, opacity: 0 },
          { transform: `translate(${tx / 2}px, -60px) rotate(-20deg)`, opacity: 1, offset: 0.5 },
          { transform: 'rotate(-8deg)', opacity: 1 },
        ],
        { duration: reduced ? 1 : 650, easing: EASE_OUT, fill: 'none' },
      )
      el.style.zIndex = ''
      setOpen(null)
    }
    busy.current = false
  }

  function down(e: PointerEvent<HTMLButtonElement>) {
    if (busy.current || status === 'done') return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { sx: e.clientX, sy: e.clientY, dx: 0, dy: 0 }
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d) return
    d.dx = e.clientX - d.sx
    d.dy = e.clientY - d.sy
    e.currentTarget.style.zIndex = '40'
    e.currentTarget.style.transform = `translate(${d.dx}px, ${d.dy}px) rotate(-8deg) scale(1.1)`
    setOpen(hit(e.clientX, e.clientY))
  }
  function up(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current
    drag.current = null
    if (!d) return
    const el = e.currentTarget
    el.style.transform = 'rotate(-8deg)'
    const target = hit(e.clientX, e.clientY)
    if (Math.hypot(d.dx, d.dy) < 6) return
    if (target) send(target, d)
    else {
      el.style.zIndex = ''
      setOpen(null)
      play(
        el,
        [
          { transform: `translate(${d.dx}px, ${d.dy}px) rotate(-8deg)` },
          { transform: 'rotate(-8deg)' },
        ],
        {
          duration: 380,
          easing: EASE_OUT,
          fill: 'none',
        },
      )
    }
  }

  const copy = COPY[status]

  return (
    <section className="relative mx-auto flex min-h-[88vh] max-w-3xl flex-col items-center overflow-hidden px-5 pt-24 pb-16 text-center sm:pt-28">
      <span
        aria-hidden
        className="font-display pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 text-[min(44vw,14rem)] leading-none font-bold text-white/[0.04] select-none"
      >
        404
      </span>

      <div className="relative z-10 mt-6">
        <div
          className="masuk-skala relative mx-auto touch-none"
          style={{ width: STAGE_W, height: 150 + BH }}
          data-testid="404-stage"
        >
          {(['organik', 'anorganik'] as Kind[]).map((k) => (
            <BinLayer
              key={`b-${k}`}
              kind={k}
              layer="back"
              lid={open === k}
              className="z-10"
              style={{ left: binX(k), top: 150, width: BW, height: BH, ...lidStyle(k, open === k) }}
            />
          ))}
          {status !== 'done' && (
            <button
              ref={itemRef}
              type="button"
              aria-label="Koran 404, seret ke tong yang tepat"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              className="absolute top-6 left-1/2 z-20 -ml-[38px] cursor-grab touch-none active:cursor-grabbing"
              style={{ width: ITEM, height: ITEM, transform: 'rotate(-8deg)' }}
            >
              <img
                src={ITEMS.newspaper.src}
                alt=""
                draggable={false}
                className="motion-safe:animate-melayang pointer-events-none size-full drop-shadow-[0_10px_12px_rgba(11,43,38,0.25)]"
              />
              <span className="bg-emas font-display text-rimba-950 pointer-events-none absolute -right-3 -bottom-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold">
                404
              </span>
            </button>
          )}
          {(['organik', 'anorganik'] as Kind[]).map((k) => (
            <BinLayer
              key={`f-${k}`}
              ref={(el) => {
                binRefs.current[k] = el
              }}
              kind={k}
              layer="front"
              lid={open !== k}
              className={cn('z-30', status === 'wrong' && k === 'organik' && 'animate-goyang')}
              style={{ left: binX(k), top: 150, width: BW, height: BH, ...lidStyle(k, open === k) }}
            />
          ))}
          {(['organik', 'anorganik'] as Kind[]).map((k) => (
            <button
              key={`t-${k}`}
              type="button"
              onClick={() => send(k)}
              disabled={status === 'done'}
              aria-label={`Masukkan koran ke tong ${k}`}
              className="absolute z-30 rounded-3xl"
              style={{ left: binX(k), top: 180, width: BW, height: BH - 30 }}
            />
          ))}
        </div>

        <div key={status} className="halaman-masuk mt-8" aria-live="polite">
          <h1
            className={cn(
              'text-3xl font-bold sm:text-4xl',
              status === 'wrong' && 'text-emas-terang',
            )}
          >
            {copy.title}
          </h1>
          <p className="text-redup mx-auto mt-3 max-w-md text-lg">{copy.body}</p>
        </div>
        <div
          className="masuk mt-8 flex flex-wrap justify-center gap-3"
          style={{ animationDelay: '300ms' }}
        >
          <ButtonLink to="/" size="lg" variant={status === 'done' ? 'primary' : 'secondary'}>
            <Icon name="home" size={18} /> Kembali ke beranda
          </ButtonLink>
          <ButtonLink to="/klasifikasi" size="lg" variant="secondary">
            <Icon name="scan" size={18} /> Pindai sampah
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
