import { useEffect, useRef, useState } from 'react'
import { BinLayer, lidStyle, squish } from '@/components/brand/Bin'
import { BIN_RATIO } from '@/components/brand/binArt'
import type { WasteKind } from '@/lib/items'
import { EASE_OUT, play, prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

const BW = 200
const BH = BW / BIN_RATIO
const MOUTH = (72 + 45) * (BW / 220)

/**
 * Foto pengguna "dijatuhkan" ke tong sesuai hasil, lalu tutupnya menutup (gema dari splash).
 * Bila model belum yakin, foto melayang di antara dua tong dengan tutup sama-sama terbuka.
 */
export function SortReveal({
  kind,
  src,
  uncertain,
}: {
  kind: WasteKind
  src: string | null
  uncertain: boolean
}) {
  const reduced = prefersReducedMotion()
  const [closed, setClosed] = useState(reduced && !uncertain)
  const photoRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced || uncertain) return
    let dead = false
    ;(async () => {
      await play(
        photoRef.current,
        [
          { transform: 'translate(-50%, -150px) rotate(-8deg) scale(1)', opacity: 0 },
          { transform: 'translate(-50%, -110px) rotate(-4deg) scale(1)', opacity: 1, offset: 0.25 },
          { transform: 'translate(-50%, -100px) rotate(4deg) scale(1)', opacity: 1, offset: 0.55, easing: 'ease-in' },
          { transform: `translate(-50%, ${MOUTH - 40}px) rotate(18deg) scale(0.55)`, opacity: 1, offset: 0.85 },
          { transform: `translate(-50%, ${MOUTH + 10}px) rotate(24deg) scale(0.4)`, opacity: 0 },
        ],
        { duration: 1500, delay: 250, easing: EASE_OUT },
      )
      if (dead) return
      squish(frontRef.current)
      setClosed(true)
    })()
    return () => {
      dead = true
    }
  }, [reduced, uncertain])

  if (uncertain) {
    const w = 128
    const h = w / BIN_RATIO
    return (
      <div className="relative mx-auto" style={{ width: w * 2 + 16, height: h + 120 }}>
        {(['organik', 'anorganik'] as const).map((k, i) => (
          <div key={k}>
            <BinLayer kind={k} layer="back" lid className="z-10" style={{ left: i * (w + 16), top: 120, width: w, height: h, ...lidStyle(k, true) }} />
            <BinLayer kind={k} layer="front" lid={false} className="z-30" style={{ left: i * (w + 16), top: 120, width: w, height: h, ...lidStyle(k, true) }} />
          </div>
        ))}
        {src && (
          <div className="absolute top-0 left-1/2 z-20 -translate-x-1/2">
            <img
              src={src}
              alt=""
              className="size-24 rounded-2xl object-cover shadow-angkat ring-4 ring-white motion-safe:animate-melayang"
            />
            <span className="absolute -top-3 -right-3 grid size-9 place-items-center rounded-full bg-white font-display text-lg font-bold text-rimba-900 shadow-lembut">
              ?
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative mx-auto" style={{ width: BW, height: BH + 150 }}>
      <BinLayer
        kind={kind}
        layer="back"
        lid={!closed}
        className="z-10"
        style={{ left: 0, top: 150, width: BW, height: BH, ...lidStyle(kind, !closed) }}
      />
      {src && !closed && (
        <div
          ref={photoRef}
          className={cn('absolute left-1/2 z-20', reduced && 'hidden')}
          style={{ top: 150, transform: 'translate(-50%, -150px)', opacity: 0 }}
        >
          <img src={src} alt="" className="size-24 rounded-2xl object-cover ring-4 ring-white" />
        </div>
      )}
      <BinLayer
        ref={frontRef}
        kind={kind}
        layer="front"
        lid={closed}
        className="z-30"
        style={{ left: 0, top: 150, width: BW, height: BH, ...lidStyle(kind, !closed) }}
      />
    </div>
  )
}
