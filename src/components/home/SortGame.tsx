/**
 * Permainan kecil di hero: seret (atau ketuk lalu pilih tong) untuk memilah sampah.
 * Tujuannya memperkenalkan dua kelas PILAH sebelum pengguna memindai foto sungguhan.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { BinLayer, lidStyle, squish } from '@/components/brand/Bin'
import { BIN_RATIO } from '@/components/brand/binArt'
import { Icon } from '@/components/ui/Icon'
import { ITEMS, type WasteItem, type WasteKind } from '@/lib/items'
import { EASE_OUT, play, prefersReducedMotion } from '@/lib/motion'
import { Link } from '@/lib/router'
import { cn } from '@/lib/utils'

// Panggung logis 480 × 400, diskalakan mengikuti lebar wadah.
const W = 480
const H = 430
const BIN_W = 148
const BIN_H = BIN_W / BIN_RATIO
const LABEL_H = 44 // ruang nama tong di bawah tong
const BIN_TOP = H - BIN_H - LABEL_H
const BIN_X: Record<WasteKind, number> = { organik: W / 2 - BIN_W - 6, anorganik: W / 2 + 6 }
const MOUTH_Y = BIN_TOP + (72 + 45) * (BIN_W / 220)
const ITEM = 66
// Titik henti benda (x, y, rotasi). Baris teratas diberi jarak agar benda yang melayang
// tidak pernah menyentuh tepi atas panggung.
const SLOTS: Array<[number, number, number]> = [
  [62, 62, -12],
  [172, 46, 8],
  [292, 58, -6],
  [408, 72, 12],
  [46, 168, 6],
  [432, 172, -10],
]

function pickItems(): WasteItem[] {
  const all = Object.values(ITEMS)
  const org = all.filter((i) => i.kind === 'organik').sort(() => Math.random() - 0.5)
  const ano = all.filter((i) => i.kind === 'anorganik').sort(() => Math.random() - 0.5)
  return [...org.slice(0, 3), ...ano.slice(0, 3)].sort(() => Math.random() - 0.5)
}

const KIND_LABEL: Record<WasteKind, string> = { organik: 'organik', anorganik: 'anorganik' }

export function SortGame() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [items, setItems] = useState<WasteItem[]>(() => pickItems())
  const [done, setDone] = useState<Set<string>>(() => new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [hoverBin, setHoverBin] = useState<WasteKind | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [firstTry, setFirstTry] = useState(0)
  const [missed, setMissed] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const itemEls = useRef<Record<string, HTMLButtonElement | null>>({})
  const binEls = useRef<Record<WasteKind, HTMLDivElement | null>>({
    organik: null,
    anorganik: null,
  })
  const drag = useRef<{ id: string; sx: number; sy: number; moved: boolean } | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const finished = done.size === items.length

  const binAt = useCallback((x: number, y: number): WasteKind | null => {
    for (const kind of ['organik', 'anorganik'] as const) {
      const r = binEls.current[kind]?.getBoundingClientRect()
      if (r && x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 30 && y <= r.bottom) return kind
    }
    return null
  }, [])

  /** Animasikan benda ke mulut tong, lalu cek benar/salah. */
  const drop = useCallback(
    async (id: string, kind: WasteKind, fromX = 0, fromY = 0) => {
      const el = itemEls.current[id]
      const item = items.find((i) => i.id === id)
      const slot = SLOTS[items.findIndex((i) => i.id === id)]
      if (!el || !item || !slot) return
      setBusy(id)
      setSelected(null)
      setHoverBin(kind)
      const reduced = prefersReducedMotion()
      const tx = BIN_X[kind] + BIN_W / 2 - slot[0]
      const ty = MOUTH_Y - slot[1]
      el.style.zIndex = '20'
      await play(
        el,
        [
          { transform: `translate(${fromX}px, ${fromY}px) rotate(${slot[2]}deg) scale(1.08)` },
          {
            transform: `translate(${tx}px, ${Math.min(fromY, ty - 120)}px) rotate(${slot[2] + 60}deg) scale(1)`,
            offset: 0.45,
          },
          {
            transform: `translate(${tx}px, ${ty - 8}px) rotate(${slot[2] + 120}deg) scale(0.7)`,
            offset: 0.78,
          },
          {
            transform: `translate(${tx}px, ${ty + 50}px) rotate(${slot[2] + 150}deg) scale(0.4)`,
            opacity: 0,
          },
        ],
        { duration: reduced ? 1 : 620, easing: 'ease-in' },
      )
      squish(binEls.current[kind])
      const correct = item.kind === kind
      if (correct) {
        setDone((d) => new Set(d).add(id))
        if (!missed.has(id)) setFirstTry((n) => n + 1)
        setMessage({ text: `Tepat. ${item.label} masuk tong ${KIND_LABEL[kind]}.`, ok: true })
      } else {
        setMissed((m) => new Set(m).add(id))
        setMessage({
          text: `Belum tepat. ${item.label} termasuk sampah ${KIND_LABEL[item.kind]}, coba tong satunya.`,
          ok: false,
        })
        el.getAnimations().forEach((a) => a.cancel())
        // Dilempar kembali keluar dari tong, lalu pulang ke tempatnya.
        await play(
          el,
          [
            {
              transform: `translate(${tx}px, ${ty}px) rotate(${slot[2]}deg) scale(0.5)`,
              opacity: 0,
            },
            {
              transform: `translate(${tx * 0.6}px, ${ty - 150}px) rotate(${slot[2] - 25}deg) scale(1)`,
              opacity: 1,
              offset: 0.5,
            },
            { transform: `translate(0px, 0px) rotate(${slot[2]}deg) scale(1)`, opacity: 1 },
          ],
          { duration: reduced ? 1 : 650, easing: EASE_OUT, fill: 'none' },
        )
        el.animate(
          [
            { transform: `rotate(${slot[2]}deg) translateX(0)` },
            { transform: `rotate(${slot[2]}deg) translateX(-7px)` },
            { transform: `rotate(${slot[2]}deg) translateX(6px)` },
            { transform: `rotate(${slot[2]}deg) translateX(0)` },
          ],
          { duration: 320 },
        )
      }
      el.style.zIndex = ''
      setHoverBin(null)
      setBusy(null)
    },
    [items, missed],
  )

  function onPointerDown(e: PointerEvent<HTMLButtonElement>, id: string) {
    if (busy || done.has(id) || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id, sx: e.clientX, sy: e.clientY, moved: false }
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>, id: string) {
    const d = drag.current
    if (!d || d.id !== id) return
    const dx = (e.clientX - d.sx) / scale
    const dy = (e.clientY - d.sy) / scale
    if (!d.moved && Math.hypot(dx, dy) < 6) return
    d.moved = true
    const el = itemEls.current[id]!
    const slot = SLOTS[items.findIndex((i) => i.id === id)]
    el.style.zIndex = '40'
    el.style.transform = `translate(${dx}px, ${dy}px) rotate(${slot[2]}deg) scale(1.12)`
    setHoverBin(binAt(e.clientX, e.clientY))
  }

  function onPointerUp(e: PointerEvent<HTMLButtonElement>, id: string) {
    const d = drag.current
    drag.current = null
    if (!d || d.id !== id) return
    const el = itemEls.current[id]!
    if (!d.moved) {
      // Ketukan biasa: pilih benda, lalu pengguna memilih tong.
      setSelected((s) => (s === id ? null : id))
      setMessage({ text: 'Sekarang ketuk tong tujuannya.', ok: true })
      return
    }
    const dx = (e.clientX - d.sx) / scale
    const dy = (e.clientY - d.sy) / scale
    const slot = SLOTS[items.findIndex((i) => i.id === id)]
    const target = binAt(e.clientX, e.clientY)
    el.style.transform = `rotate(${slot[2]}deg)`
    if (target) {
      drop(id, target, dx, dy)
    } else {
      el.style.zIndex = ''
      setHoverBin(null)
      play(
        el,
        [
          { transform: `translate(${dx}px, ${dy}px) rotate(${slot[2]}deg) scale(1.12)` },
          { transform: `translate(0px, 0px) rotate(${slot[2]}deg) scale(1)` },
        ],
        { duration: 380, easing: EASE_OUT, fill: 'none' },
      )
    }
  }

  function reset() {
    Object.values(itemEls.current).forEach((el) => el?.getAnimations().forEach((a) => a.cancel()))
    setItems(pickItems())
    setDone(new Set())
    setMissed(new Set())
    setFirstTry(0)
    setSelected(null)
    setMessage(null)
  }

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const binOpen = (kind: WasteKind) => hoverBin === kind || (!!selected && !busy)

  return (
    <div className="relative">
      <div
        ref={wrapRef}
        className="relative mx-auto w-full max-w-[30rem] touch-none select-none"
        style={{ height: H * scale }}
        data-testid="sort-game"
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: W, height: H, transform: `scale(${scale})` }}
        >
          <div
            aria-hidden
            className="bg-daun/20 absolute inset-x-10 h-24 rounded-[50%] blur-3xl"
            style={{ top: BIN_TOP + BIN_H - 70 }}
          />
          {(['organik', 'anorganik'] as const).map((kind) => (
            <BinLayer
              key={`b-${kind}`}
              kind={kind}
              layer="back"
              lid={binOpen(kind)}
              className="z-10"
              style={{
                left: BIN_X[kind],
                top: BIN_TOP,
                width: BIN_W,
                height: BIN_H,
                ...lidStyle(kind, binOpen(kind)),
              }}
            />
          ))}
          {items.map((it, i) => {
            const [x, y, rot] = SLOTS[i]
            const isDone = done.has(it.id)
            return (
              <button
                key={it.id}
                ref={(el) => {
                  itemEls.current[it.id] = el
                }}
                type="button"
                data-item={it.id}
                disabled={isDone || (!!busy && busy !== it.id)}
                aria-pressed={selected === it.id}
                aria-label={`${it.label}${selected === it.id ? ', terpilih' : ''}`}
                onPointerDown={(e) => onPointerDown(e, it.id)}
                onPointerMove={(e) => onPointerMove(e, it.id)}
                onPointerUp={(e) => onPointerUp(e, it.id)}
                onPointerCancel={() => {
                  drag.current = null
                  const el = itemEls.current[it.id]
                  if (el) el.style.transform = `rotate(${rot}deg)`
                  setHoverBin(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelected((s) => (s === it.id ? null : it.id))
                  }
                }}
                className={cn(
                  'group absolute z-20 cursor-grab rounded-2xl outline-offset-4 active:cursor-grabbing',
                  isDone && 'invisible',
                )}
                style={{
                  left: x - ITEM / 2,
                  top: y - ITEM / 2,
                  width: ITEM,
                  height: ITEM,
                  transform: `rotate(${rot}deg)`,
                }}
              >
                <span
                  className={cn(
                    'block size-full transition-transform duration-300 ease-out group-hover:scale-110',
                    selected === it.id
                      ? 'scale-115 drop-shadow-[0_0_14px_rgb(255_194_71/0.9)]'
                      : 'motion-safe:animate-melayang',
                  )}
                  style={{ animationDelay: `${i * -0.8}s` }}
                >
                  <img
                    src={it.src}
                    alt=""
                    draggable={false}
                    className="pointer-events-none size-full drop-shadow-[0_10px_12px_rgba(0,0,0,0.35)]"
                  />
                </span>
              </button>
            )
          })}
          {(['organik', 'anorganik'] as const).map((kind) => (
            <BinLayer
              key={`f-${kind}`}
              ref={(el) => {
                binEls.current[kind] = el
              }}
              kind={kind}
              layer="front"
              lid={!binOpen(kind)}
              className="z-30"
              style={{
                left: BIN_X[kind],
                top: BIN_TOP,
                width: BIN_W,
                height: BIN_H,
                ...lidStyle(kind, binOpen(kind)),
              }}
            />
          ))}
          {/* Tombol tong untuk ketuk/keyboard; berada di atas gambar tong. */}
          {(['organik', 'anorganik'] as const).map((kind) => (
            <button
              key={`t-${kind}`}
              type="button"
              data-bin-target={kind}
              disabled={!selected || !!busy}
              onClick={() => selected && drop(selected, kind)}
              onPointerEnter={() => selected && setHoverBin(kind)}
              onPointerLeave={() => setHoverBin(null)}
              aria-label={`Masukkan ke tong ${KIND_LABEL[kind]}`}
              className="absolute z-30 rounded-3xl disabled:cursor-default"
              style={{ left: BIN_X[kind], top: BIN_TOP + 30, width: BIN_W, height: BIN_H - 30 }}
            />
          ))}
          {(['organik', 'anorganik'] as const).map((kind) => {
            const lit = binOpen(kind)
            return (
              <span
                key={`l-${kind}`}
                className="pointer-events-none absolute z-30 flex flex-col items-center"
                style={{ left: BIN_X[kind], top: BIN_TOP + BIN_H + 6, width: BIN_W }}
              >
                <span
                  className={cn(
                    'font-display text-[15px] font-semibold tracking-wide transition-[color,transform] duration-300',
                    kind === 'organik' ? 'text-daun-terang' : 'text-emas-terang',
                    lit && 'scale-110',
                  )}
                >
                  {kind === 'organik' ? 'Organik' : 'Anorganik'}
                </span>
                <span
                  className={cn(
                    'mt-1.5 h-[3px] rounded-full transition-[width,opacity] duration-300',
                    kind === 'organik' ? 'bg-daun' : 'bg-emas',
                    lit ? 'w-16 opacity-100' : 'w-8 opacity-60',
                  )}
                />
              </span>
            )
          })}
        </div>

        {finished && (
          <div className="bg-rimba-950/90 shadow-angkat halaman-masuk absolute inset-x-0 top-6 z-50 mx-auto flex max-w-sm flex-col items-center rounded-3xl px-6 py-5 text-center ring-1 ring-white/10 backdrop-blur-md">
            <p className="font-display text-lg font-semibold text-white">
              {firstTry === items.length
                ? 'Sempurna, semuanya tepat di percobaan pertama.'
                : `Beres! ${firstTry} dari ${items.length} tepat di percobaan pertama.`}
            </p>
            <p className="text-mint-teks/80 mt-1 text-sm">
              Sekarang coba dengan sampah di dekatmu.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                to="/klasifikasi"
                className="kilau bg-emas font-display text-rimba-900 hover:bg-emas-terang inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold"
              >
                <Icon name="scan" size={17} /> Pindai sampah
              </Link>
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/10"
              >
                <Icon name="refresh" size={16} /> Main lagi
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex min-h-12 items-center justify-between gap-3 px-1 text-sm">
        <p
          aria-live="polite"
          className={cn(
            'transition-colors',
            !message ? 'text-redup' : message.ok ? 'text-daun-terang' : 'text-emas-terang',
          )}
        >
          {message?.text ??
            'Seret sampah ke tong yang sesuai, atau ketuk sampah lalu ketuk tongnya.'}
        </p>
        <span
          data-testid="skor"
          className="font-display angka shrink-0 rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15"
        >
          {done.size}/{items.length}
        </span>
      </div>
    </div>
  )
}
