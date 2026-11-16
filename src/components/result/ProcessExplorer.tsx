/**
 * "Dari foto ke keputusan": menelusuri hasil antara umpan maju yang benar-benar dihitung untuk foto ini.
 * Setiap tab mewakili satu langkah algoritma CNN di Subbab 2.6 makalah.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { MapCanvas } from '@/components/ui/MapCanvas'
import type { Classification } from '@/lib/ml/classify'
import { loadModel } from '@/lib/ml/model'
import type { ModelWeights } from '@/lib/ml/types'
import { cn, fmt } from '@/lib/utils'

const STEPS = [
  { id: 'input', title: 'Input', sub: '64 × 64' },
  { id: 'conv', title: 'Konvolusi + ReLU', sub: '8 × 64 × 64' },
  { id: 'pool', title: 'Max pooling', sub: '8 × 32 × 32' },
  { id: 'flat', title: 'Flatten', sub: '8.192' },
  { id: 'hidden', title: 'Hidden layer', sub: '16' },
  { id: 'out', title: 'Output', sub: 'sigmoid' },
] as const
type StepId = (typeof STEPS)[number]['id']

function InputStep({ r }: { r: Classification }) {
  const { gray, size } = r.trace
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null)
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const j = Math.floor(((e.clientX - rect.left) / rect.width) * size)
    const i = Math.floor(((e.clientY - rect.top) / rect.height) * size)
    if (i >= 0 && j >= 0 && i < size && j < size) setHover({ i, j })
  }
  const v = hover ? gray[hover.i * size + hover.j] : null
  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
      <div
        className="relative w-56 cursor-crosshair overflow-hidden rounded-2xl ring-1 ring-white/10 sm:w-64"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        data-testid="input-map"
      >
        <MapCanvas
          data={gray}
          side={size}
          label="Matriks input 64 × 64"
          className="aspect-square w-full"
        />
        {hover && (
          <span
            aria-hidden
            className="ring-emas pointer-events-none absolute ring-2"
            style={{
              left: `${(hover.j / size) * 100}%`,
              top: `${(hover.i / size) * 100}%`,
              width: `${100 / size}%`,
              height: `${100 / size}%`,
            }}
          />
        )}
      </div>
      <div>
        <p className="text-redup leading-relaxed">
          Foto diperkecil menjadi 64 × 64 piksel, diubah ke grayscale dengan{' '}
          <span className="text-teks font-medium whitespace-nowrap">0,299R + 0,587G + 0,114B</span>,
          lalu setiap nilai dibagi 255. Inilah satu-satunya yang dilihat model: 4.096 angka antara 0
          dan 1.
        </p>
        <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm" aria-live="polite">
          {hover && v !== null ? (
            <p className="angka">
              Piksel baris {hover.i + 1}, kolom {hover.j + 1}: grayscale{' '}
              <strong>{Math.round(v * 255)}</strong> → I = {Math.round(v * 255)} / 255 ={' '}
              <strong>{fmt(v, 4)}</strong>
            </p>
          ) : (
            <p className="text-redup">
              Arahkan kursor atau jari ke gambar untuk melihat nilai tiap piksel.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function KernelGrid({ k }: { k: Float32Array }) {
  const max = Math.max(...Array.from(k, Math.abs), 1e-6)
  return (
    <div className="grid w-fit grid-cols-3 gap-1">
      {Array.from(k).map((w, i) => (
        <span
          key={i}
          className="angka grid size-14 place-items-center rounded-lg text-xs font-semibold"
          style={{
            background:
              w >= 0
                ? `rgb(255 194 71 / ${0.12 + (0.78 * w) / max})`
                : `rgb(120 200 230 / ${0.12 + (0.78 * -w) / max})`,
            color: Math.abs(w) / max > 0.45 ? '#03110d' : '#ecf6f0',
          }}
        >
          {fmt(w, 2)}
        </span>
      ))}
    </div>
  )
}

function MapsStep({
  r,
  pooled,
  weights,
}: {
  r: Classification
  pooled: boolean
  weights: ModelWeights | null
}) {
  const [sel, setSel] = useState(0)
  const maps = pooled ? r.trace.P : r.trace.R
  const side = pooled ? r.trace.size / 2 : r.trace.size
  const active = useMemo(() => {
    const m = maps[sel]
    let c = 0
    for (let i = 0; i < m.length; i++) if (m[i] > 0) c++
    return c / m.length
  }, [maps, sel])
  const k = weights?.K.subarray(sel * 9, sel * 9 + 9)
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {maps.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSel(i)}
              aria-pressed={sel === i}
              aria-label={`Kernel ${i + 1}`}
              className={cn(
                'group relative overflow-hidden rounded-xl ring-2 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5',
                sel === i ? 'ring-emas shadow-angkat' : 'ring-transparent hover:ring-white/10',
              )}
            >
              <MapCanvas
                data={m}
                side={side}
                mapStyle="heat"
                label={`Peta kernel ${i + 1}`}
                className="aspect-square w-full"
              />
              <span className="bg-rimba-950/70 absolute bottom-1 left-1 rounded-md px-1.5 text-[11px] font-semibold text-white">
                {i + 1}
              </span>
            </button>
          ))}
        </div>
        <p className="text-redup mt-3 text-xs">
          Warna terang = ciri yang terdeteksi kuat. Ketuk peta untuk melihat lebih dekat.
        </p>
      </div>
      <div>
        <div className="flex flex-wrap items-start gap-5">
          <MapCanvas
            data={maps[sel]}
            side={side}
            mapStyle="heat"
            label={`Peta kernel ${sel + 1} diperbesar`}
            className="aspect-square w-40 rounded-2xl ring-1 ring-white/10 sm:w-48"
          />
          {!pooled && k && (
            <div>
              <p className="mb-2 text-sm font-semibold">Kernel {sel + 1} hasil pelatihan</p>
              <KernelGrid k={k} />
              <p className="text-redup angka mt-2 text-xs">bias b = {fmt(weights!.bc[sel], 3)}</p>
            </div>
          )}
        </div>
        <p className="text-redup mt-5 leading-relaxed">
          {pooled
            ? `Setiap jendela 2 × 2 diwakili nilai terbesarnya, sehingga ukuran peta turun dari 64 × 64 menjadi ${side} × ${side} tanpa kehilangan ciri yang paling menonjol.`
            : 'Kernel 3 × 3 digeser ke seluruh citra yang sudah diberi zero padding. Di tiap posisi, sembilan piksel dikalikan dengan bobot kernel, dijumlahkan, lalu ditambah bias. ReLU kemudian mengubah semua nilai negatif menjadi 0.'}
        </p>
        <p className="angka mt-3 text-sm font-medium">
          {Math.round(active * 100)}% elemen peta ini bernilai positif.
        </p>
      </div>
    </div>
  )
}

function FlattenStep({ r }: { r: Classification }) {
  const { x } = r.trace
  // Tampilkan vektor 8.192 sebagai pita 128 × 64 agar polanya terlihat.
  const nz = useMemo(() => x.reduce((c, v) => c + (v > 0 ? 1 : 0), 0), [x])
  return (
    <div>
      <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
        <FlatStrip x={x} />
      </div>
      <div className="text-redup angka mt-2 flex justify-between text-xs">
        <span>x₁</span>
        <span>kernel 1 → kernel 8</span>
        <span>x₈₁₉₂</span>
      </div>
      <p className="text-redup mt-5 max-w-3xl leading-relaxed">
        Delapan peta 32 × 32 disusun berurutan, baris demi baris, menjadi satu vektor berisi 8.192
        angka. Dari semuanya,{' '}
        <strong className="text-teks angka">{nz.toLocaleString('id-ID')}</strong> bernilai lebih
        dari nol dan ikut menentukan hasil.
      </p>
      <p className="text-redup angka mt-3 text-sm">
        x₁ … x₈ = {Array.from(x.slice(0, 8), (v) => fmt(v, 3)).join('; ')}
      </p>
    </div>
  )
}

function FlatStrip({ x }: { x: Float32Array }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const W = 256
    const H = x.length / W
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(W, H)
    let max = 1e-6
    for (const v of x) if (v > max) max = v
    for (let i = 0; i < x.length; i++) {
      const t = x[i] / max
      img.data[i * 4] = 6 + (255 - 6) * t
      img.data[i * 4 + 1] = 26 + (194 - 26) * t
      img.data[i * 4 + 2] = 22 + (71 - 22) * t
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, [x])
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Vektor flatten 8.192 nilai"
      className="block h-16 w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function HiddenStep({ r }: { r: Classification }) {
  const { z, zin } = r.trace
  const max = Math.max(...Array.from(zin, Math.abs), 1e-6)
  const activeCount = z.reduce((c, v) => c + (v > 0 ? 1 : 0), 0)
  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex h-56 items-center gap-1 rounded-2xl bg-white/4 px-3 sm:gap-1.5">
        {Array.from(zin).map((v, j) => (
          <div key={j} className="group relative flex h-full flex-1 flex-col justify-center">
            <div className="relative h-1/2">
              {v > 0 && (
                <div
                  className="bg-daun absolute inset-x-0 bottom-0 origin-bottom rounded-t-md transition-[height] duration-700 ease-out"
                  style={{ height: `${(v / max) * 100}%` }}
                />
              )}
            </div>
            <div className="h-px bg-white/25" />
            <div className="relative h-1/2">
              {v <= 0 && (
                <div
                  className="absolute inset-x-0 top-0 rounded-b-md bg-white/15"
                  style={{ height: `${(-v / max) * 100}%` }}
                />
              )}
            </div>
            <span className="bg-rimba-900 angka pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md px-2 py-1 text-[11px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
              z{j + 1}: z_in {fmt(v, 2)}
            </span>
          </div>
        ))}
      </div>
      <div>
        <p className="text-redup leading-relaxed">
          Ke-16 hidden unit menghitung{' '}
          <span className="text-teks font-medium">z_in = v₀ + Σ xᵢvᵢⱼ</span>. Batang hijau adalah
          unit yang aktif. Batang abu-abu bernilai negatif dan dimatikan ReLU sehingga tidak
          meneruskan sinyal.
        </p>
        <p className="font-display angka mt-4 text-3xl font-bold">
          {activeCount} <span className="text-redup text-lg font-semibold">dari 16 unit aktif</span>
        </p>
      </div>
    </div>
  )
}

function OutputStep({ r }: { r: Classification }) {
  const { yIn, y } = r.trace
  const W = 360
  const H = 200
  const X = (v: number) => ((Math.max(-8, Math.min(8, v)) + 8) / 16) * W
  const Y = (v: number) => H - 16 - v * (H - 32)
  const path = Array.from({ length: 81 }, (_, i) => {
    const v = -8 + (16 * i) / 80
    return `${i ? 'L' : 'M'}${X(v).toFixed(1)},${Y(1 / (1 + Math.exp(-v))).toFixed(1)}`
  }).join(' ')
  const ano = y >= r.meta.threshold
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-2xl bg-white/4"
        role="img"
        aria-label={`Kurva sigmoid, y = ${fmt(y, 3)}`}
      >
        <line
          x1="0"
          x2={W}
          y1={Y(0.5)}
          y2={Y(0.5)}
          stroke="#ecf6f0"
          strokeOpacity=".3"
          strokeDasharray="4 4"
        />
        <text x="6" y={Y(0.5) - 6} fontSize="11" fill="#9cb9ae">
          ambang 0,5
        </text>
        <path d={path} fill="none" stroke="#ecf6f0" strokeWidth="2.5" />
        <line
          x1={X(yIn)}
          x2={X(yIn)}
          y1={Y(y)}
          y2={H - 16}
          stroke={ano ? '#ffc247' : '#3fbf77'}
          strokeDasharray="3 3"
        />
        <circle
          cx={X(yIn)}
          cy={Y(y)}
          r="8"
          fill={ano ? '#ffc247' : '#3fbf77'}
          stroke="#0b2b26"
          strokeWidth="2"
        />
        <text
          x={X(yIn) + (yIn > 4 ? -12 : 12)}
          y={Y(y) + (y > 0.5 ? 18 : -10)}
          fontSize="12"
          fontWeight="600"
          textAnchor={yIn > 4 ? 'end' : 'start'}
          fill="#ecf6f0"
        >
          y = {fmt(y, 3)}
        </text>
        <text x={W - 6} y={H - 4} fontSize="11" textAnchor="end" fill="#9cb9ae">
          y_in →
        </text>
      </svg>
      <div className="space-y-3 text-[0.95rem] leading-relaxed">
        <p className="angka">
          <span className="text-redup">Jumlahan output:</span> y_in = w₀ + Σ zⱼwⱼ ={' '}
          <strong>{fmt(yIn, 4)}</strong>
        </p>
        <p className="angka">
          <span className="text-redup">Sigmoid:</span> y = 1 / (1 + e<sup>−y_in</sup>) ={' '}
          <strong>{fmt(y, 4)}</strong>
        </p>
        <p className="angka">
          <span className="text-redup">Keputusan:</span> karena y {ano ? '≥' : '<'} 0,5, citra ini{' '}
          <strong>{ano ? 'anorganik (t = 1)' : 'organik (t = 0)'}</strong>.
        </p>
        <p className="text-redup text-sm">
          Nilai y adalah peluang anorganik. Peluang organiknya 1 − y = {fmt(1 - y, 4)}.
        </p>
      </div>
    </div>
  )
}

export function ProcessExplorer({ result }: { result: Classification }) {
  const [step, setStep] = useState<StepId>('input')
  const [weights, setWeights] = useState<ModelWeights | null>(null)
  useEffect(() => {
    loadModel()
      .then((m) => setWeights(m.weights))
      .catch(() => undefined)
  }, [])
  const idx = STEPS.findIndex((s) => s.id === step)

  return (
    <section id="proses" className="kartu rounded-4xl p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Dari foto ke keputusan</h2>
          <p className="text-redup mt-2 max-w-2xl">
            Semua angka di bawah dihitung khusus untuk fotomu barusan, langkah demi langkah sesuai
            algoritma CNN. Waktu hitungnya {fmt(result.ms, 0)} milidetik.
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Langkah CNN"
        className="-mx-1 mt-6 flex snap-x gap-2 overflow-x-auto px-1 pb-2"
      >
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            id={`langkah-${s.id}`}
            aria-selected={step === s.id}
            aria-controls="panel-langkah"
            onClick={() => setStep(s.id)}
            className={cn(
              'flex shrink-0 snap-start items-center gap-2.5 rounded-2xl px-4 py-2.5 text-left transition-colors duration-200',
              step === s.id
                ? 'bg-emas text-rimba-950'
                : i < idx
                  ? 'bg-daun/15 text-daun-terang hover:bg-daun/25'
                  : 'text-redup bg-white/4 ring-1 ring-white/10 hover:text-white',
            )}
          >
            <span
              className={cn(
                'font-display grid size-6 place-items-center rounded-full text-xs font-bold',
                step === s.id
                  ? 'bg-rimba-950 text-emas'
                  : 'bg-white/10 text-white ring-1 ring-white/10',
              )}
            >
              {i + 1}
            </span>
            <span>
              <span className="font-display block text-sm leading-tight font-semibold">
                {s.title}
              </span>
              <span
                className={cn(
                  'angka block text-xs',
                  step === s.id ? 'text-rimba-950/70' : 'text-redup',
                )}
              >
                {s.sub}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div
        key={step}
        id="panel-langkah"
        role="tabpanel"
        aria-labelledby={`langkah-${step}`}
        className="halaman-masuk mt-6"
      >
        {step === 'input' && <InputStep r={result} />}
        {step === 'conv' && <MapsStep r={result} pooled={false} weights={weights} />}
        {step === 'pool' && <MapsStep r={result} pooled weights={weights} />}
        {step === 'flat' && <FlattenStep r={result} />}
        {step === 'hidden' && <HiddenStep r={result} />}
        {step === 'out' && <OutputStep r={result} />}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={() => setStep(STEPS[Math.max(0, idx - 1)].id)}
          disabled={idx === 0}
          className="text-redup inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:text-white disabled:opacity-30"
        >
          <Icon name="arrowLeft" size={16} /> Sebelumnya
        </button>
        <span className="text-redup angka text-xs">
          {idx + 1} / {STEPS.length}
        </span>
        <button
          type="button"
          onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, idx + 1)].id)}
          disabled={idx === STEPS.length - 1}
          className="text-teks hover:text-daun-terang inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-30"
        >
          Berikutnya <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </section>
  )
}
