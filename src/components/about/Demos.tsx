/**
 * Peraga interaktif memakai angka contoh dari makalah dan PPT Bab III,
 * supaya pengunjung bisa mengikuti hitungan yang sama seperti di sidang.
 */
import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useInView } from '@/lib/motion'
import { cn, fmt } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Konvolusi (PPT slide 8)                                             */
/* ------------------------------------------------------------------ */

const I3 = [
  [0.62, 0.4, 0.15],
  [0.55, 0.8, 0.3],
  [0.2, 0.45, 0.9],
]
const K3 = [
  [1, 0, -1],
  [0, 1, 0],
  [-1, 0, 1],
]
const BIAS = 0.1
const PAD = Array.from({ length: 5 }, (_, r) =>
  Array.from({ length: 5 }, (_, c) => (r > 0 && r < 4 && c > 0 && c < 4 ? I3[r - 1][c - 1] : 0)),
)
const CONV = Array.from({ length: 3 }, (_, i) =>
  Array.from({ length: 3 }, (_, j) => {
    let s = BIAS
    for (let u = 0; u < 3; u++) for (let v = 0; v < 3; v++) s += PAD[i + u][j + v] * K3[u][v]
    return s
  }),
)

const cell =
  'grid aspect-square place-items-center rounded-md text-[11px] font-semibold angka sm:text-xs'

export function ConvDemo() {
  const [pos, setPos] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ref, inView] = useInView<HTMLDivElement>({ once: false })
  const i = Math.floor(pos / 3)
  const j = pos % 3

  useEffect(() => {
    if (!playing || !inView) return
    const t = setInterval(() => setPos((p) => (p + 1) % 9), 1400)
    return () => clearInterval(t)
  }, [playing, inView])

  const terms = useMemo(() => {
    const out: string[] = []
    for (let u = 0; u < 3; u++)
      for (let v = 0; v < 3; v++) {
        const a = PAD[i + u][j + v]
        const k = K3[u][v]
        if (a !== 0 && k !== 0) out.push(`(${fmt(a, 2)})(${k})`)
      }
    return out
  }, [i, j])

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-x-10 gap-y-6">
      <div>
        <p className="text-redup mb-2 text-xs font-semibold">Citra setelah zero padding (5 × 5)</p>
        <div className="grid w-56 grid-cols-5 gap-1 sm:w-64">
          {PAD.flat().map((v, idx) => {
            const r = Math.floor(idx / 5)
            const c = idx % 5
            const inWin = r >= i && r < i + 3 && c >= j && c < j + 3
            return (
              <span
                key={idx}
                className={cn(
                  cell,
                  'transition-colors duration-300',
                  inWin
                    ? 'bg-emas text-rimba-950'
                    : v === 0
                      ? 'text-redup bg-white/5'
                      : 'bg-daun/15 text-mint-teks',
                )}
              >
                {fmt(v, 2)}
              </span>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-4 lg:flex-col">
        <div>
          <p className="text-redup mb-2 text-xs font-semibold">Kernel K</p>
          <div className="grid w-28 grid-cols-3 gap-1">
            {K3.flat().map((k, idx) => (
              <span
                key={idx}
                className={cn(cell, 'bg-emas/15 text-emas-terang ring-emas/25 ring-1')}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
        <p className="text-redup text-sm">
          bias b<sub>c</sub> = 0,1
        </p>
      </div>
      <div>
        <p className="text-redup mb-2 text-xs font-semibold">Feature map C (3 × 3)</p>
        <div className="grid w-40 grid-cols-3 gap-1">
          {CONV.flat().map((v, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPos(idx)
                setPlaying(false)
              }}
              aria-label={`Posisi ${Math.floor(idx / 3) + 1},${(idx % 3) + 1}`}
              className={cn(
                cell,
                'transition-[background-color,transform] duration-300 hover:scale-105',
                idx === pos
                  ? 'bg-emas text-rimba-950 scale-105 ring-2 ring-white'
                  : idx < pos
                    ? 'bg-daun/80 text-rimba-950'
                    : 'text-redup bg-white/6',
              )}
            >
              {idx <= pos ? fmt(v, 2) : '?'}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full">
        <p
          className="angka rounded-2xl bg-white/5 p-4 text-sm leading-relaxed ring-1 ring-white/10"
          aria-live="polite"
        >
          C
          <sub>
            {i + 1},{j + 1}
          </sub>{' '}
          = 0,1{terms.length ? ` + ${terms.join(' + ')}` : ''} ={' '}
          <strong>{fmt(CONV[i][j], 2)}</strong>
          {pos === 0 && <span className="text-redup"> (sama dengan hitung manual di PPT)</span>}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="bg-emas text-rimba-950 hover:bg-emas-terang inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors"
          >
            <Icon name={playing ? 'pause' : 'play'} size={15} />{' '}
            {playing ? 'Jeda' : 'Putar otomatis'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false)
              setPos((p) => (p + 1) % 9)
            }}
            className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ring-white/15 transition-colors hover:bg-white/6"
          >
            Geser kernel <Icon name="arrowRight" size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ReLU + max pooling (PPT slide 8)                                    */
/* ------------------------------------------------------------------ */

const R4 = [
  [1.52, 0, 0.21, 0.35],
  [0, 0.48, 0.9, 0],
  [0.12, 0, 0, 0.33],
  [0.64, 0.27, 0.05, 0],
]
const WIN_COLORS = ['bg-daun', 'bg-emas', 'bg-[#78c8e6]', 'bg-[#f2a6b3]']
const WIN_SOFT = ['bg-daun/25', 'bg-emas/30', 'bg-[#78c8e6]/30', 'bg-[#f2a6b3]/35']

export function PoolDemo() {
  const [win, setWin] = useState<number | null>(null)
  const P = [0, 1, 2, 3].map((w) => {
    const r0 = Math.floor(w / 2) * 2
    const c0 = (w % 2) * 2
    let best = { v: -1, r: 0, c: 0 }
    for (let r = r0; r < r0 + 2; r++)
      for (let c = c0; c < c0 + 2; c++) if (R4[r][c] > best.v) best = { v: R4[r][c], r, c }
    return best
  })
  return (
    <div className="flex flex-wrap items-center gap-6 sm:gap-10">
      <div>
        <p className="text-redup mb-2 text-xs font-semibold">R setelah ReLU (4 × 4)</p>
        <div className="grid w-52 grid-cols-4 gap-1">
          {R4.flat().map((v, idx) => {
            const r = Math.floor(idx / 4)
            const c = idx % 4
            const w = Math.floor(r / 2) * 2 + Math.floor(c / 2)
            const isMax = P[w].r === r && P[w].c === c
            return (
              <span
                key={idx}
                onPointerEnter={() => setWin(w)}
                onPointerLeave={() => setWin(null)}
                className={cn(
                  cell,
                  'cursor-default transition-all duration-200',
                  win === null || win === w ? WIN_SOFT[w] : 'text-redup/50 bg-white/3',
                  isMax &&
                    (win === w
                      ? `${WIN_COLORS[w]} text-rimba-950 ring-2 ring-white`
                      : 'ring-2 ring-white/40'),
                )}
              >
                {fmt(v, 2)}
              </span>
            )
          })}
        </div>
      </div>
      <Icon name="arrowRight" size={22} className="text-redup" />
      <div>
        <p className="text-redup mb-2 text-xs font-semibold">P (2 × 2)</p>
        <div className="grid w-28 grid-cols-2 gap-1">
          {P.map((p, w) => (
            <button
              key={w}
              type="button"
              onPointerEnter={() => setWin(w)}
              onPointerLeave={() => setWin(null)}
              onFocus={() => setWin(w)}
              onBlur={() => setWin(null)}
              className={cn(
                cell,
                'text-sm transition-transform duration-200',
                WIN_COLORS[w],
                'text-rimba-950',
                win === w && 'scale-110',
              )}
            >
              {fmt(p.v, 2)}
            </button>
          ))}
        </div>
      </div>
      <p className="text-redup max-w-xs text-sm leading-relaxed">
        Arahkan kursor ke salah satu warna. Setiap jendela 2 × 2 hanya meneruskan nilai terbesarnya,
        dan posisinya dicatat untuk propagasi balik.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sigmoid dan BCE                                                     */
/* ------------------------------------------------------------------ */

export function SigmoidDemo() {
  const [yin, setYin] = useState(2)
  const y = 1 / (1 + Math.exp(-yin))
  const W = 320
  const H = 150
  const X = (v: number) => ((v + 6) / 12) * W
  const Y = (v: number) => H - 12 - v * (H - 24)
  const path = Array.from({ length: 61 }, (_, i) => {
    const v = -6 + (12 * i) / 60
    return `${i ? 'L' : 'M'}${X(v).toFixed(1)},${Y(1 / (1 + Math.exp(-v))).toFixed(1)}`
  }).join(' ')
  const ano = y >= 0.5
  const L1 = -Math.log(Math.max(1e-7, y))
  const L0 = -Math.log(Math.max(1e-7, 1 - y))
  return (
    <div className="space-y-5">
      <div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Sigmoid dari ${fmt(yin, 1)} adalah ${fmt(y, 4)}`}
        >
          <rect x="0" y="0" width={W / 2} height={H} fill="#3fbf77" opacity=".08" />
          <rect x={W / 2} y="0" width={W / 2} height={H} fill="#ffc247" opacity=".08" />
          <line
            x1="0"
            x2={W}
            y1={Y(0.5)}
            y2={Y(0.5)}
            stroke="#ecf6f0"
            strokeOpacity=".3"
            strokeDasharray="4 4"
          />
          <path d={path} fill="none" stroke="#ecf6f0" strokeWidth="2.5" />
          <circle
            cx={X(yin)}
            cy={Y(y)}
            r="7"
            fill={ano ? '#ffc247' : '#3fbf77'}
            stroke="#0b2b26"
            strokeWidth="2"
            style={{ transition: 'cx .15s, cy .15s' }}
          />
          <text x="8" y="16" fontSize="11" fill="#8cebb3" fontWeight="600">
            organik
          </text>
          <text x={W - 8} y="16" fontSize="11" fill="#ffe08f" fontWeight="600" textAnchor="end">
            anorganik
          </text>
        </svg>
        <label className="mt-3 block text-sm font-semibold" htmlFor="slider-yin">
          Geser nilai y_in: <span className="angka">{fmt(yin, 1)}</span>
        </label>
        <input
          id="slider-yin"
          type="range"
          min={-6}
          max={6}
          step={0.1}
          value={yin}
          onChange={(e) => setYin(+e.target.value)}
          className="accent-emas mt-2 w-full"
        />
      </div>
      <div className="grid gap-4 text-[0.95rem] sm:grid-cols-[0.8fr_1.2fr] sm:items-start">
        <div className="space-y-2">
          <p className="angka">
            y = σ({fmt(yin, 1)}) = <strong className="text-lg">{fmt(y, 4)}</strong>
          </p>
          <p>
            Kelas:{' '}
            <strong className={ano ? 'text-emas-terang' : 'text-daun-terang'}>
              {ano ? 'anorganik (t̂ = 1)' : 'organik (t̂ = 0)'}
            </strong>
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 text-sm ring-1 ring-white/10">
          <p className="font-semibold">Error BCE untuk tebakan ini</p>
          <p className="angka mt-2">
            jika target t = 1: L = −ln y = <strong>{fmt(L1, 4)}</strong>
          </p>
          <p className="angka">
            jika target t = 0: L = −ln(1 − y) = <strong>{fmt(L0, 4)}</strong>
          </p>
          <p className="text-redup mt-2 text-xs">
            Makin jauh y dari target, makin besar error yang harus diperbaiki backpropagation.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Kurva error pelatihan dari meta.json                                */
/* ------------------------------------------------------------------ */

export function LossChart({ loss, epsilon }: { loss: number[]; epsilon: number }) {
  const W = 520
  const H = 200
  const pad = 30
  const max = Math.max(...loss, epsilon) * 1.08
  const X = (i: number) => pad + (i / Math.max(1, loss.length - 1)) * (W - pad - 10)
  const Y = (v: number) => H - pad + 6 - (v / max) * (H - pad - 4)
  const d = loss.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Rata-rata error turun dari ${fmt(loss[0], 3)} ke ${fmt(loss[loss.length - 1], 3)}`}
    >
      <line
        x1={pad}
        x2={W - 10}
        y1={Y(epsilon)}
        y2={Y(epsilon)}
        stroke="#ff6b6b"
        strokeDasharray="4 4"
        strokeOpacity=".7"
      />
      <text x={W - 10} y={Y(epsilon) - 5} fontSize="11" textAnchor="end" fill="#ff6b6b">
        ε = {fmt(epsilon, 2)}
      </text>
      <path
        d={`${d} L${X(loss.length - 1)},${H - pad + 6} L${X(0)},${H - pad + 6} Z`}
        fill="#3fbf77"
        opacity=".15"
      />
      <path d={d} fill="none" stroke="#8cebb3" strokeWidth="2.5" strokeLinejoin="round" />
      <line
        x1={pad}
        x2={W - 10}
        y1={H - pad + 6}
        y2={H - pad + 6}
        stroke="#ecf6f0"
        strokeOpacity=".2"
      />
      <text x={pad} y={H - 6} fontSize="11" fill="#9cb9ae">
        epoch 1
      </text>
      <text x={W - 10} y={H - 6} fontSize="11" textAnchor="end" fill="#9cb9ae">
        epoch {loss.length}
      </text>
      <text x="4" y={Y(loss[0]) + 4} fontSize="11" fill="#9cb9ae">
        {fmt(loss[0], 2)}
      </text>
    </svg>
  )
}
