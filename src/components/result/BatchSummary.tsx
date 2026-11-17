import { useEffect, useState, type CSSProperties } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import {
  adviceFor,
  confidenceOf,
  LOW_CONFIDENCE,
  tally,
  verdictOf,
  VERDICT_LABEL,
  type Verdict,
} from '@/lib/advice'
import { cn, fmt } from '@/lib/utils'
import type { ScanItem } from '@/store/classifyStore'

const delay = (ms: number) => ({ '--tunda': `${ms}ms` }) as CSSProperties

const TONE: Record<Verdict, { badge: string; bar: string; text: string; dot: string }> = {
  organik: {
    badge: 'bg-daun text-rimba-950',
    bar: 'bg-daun',
    text: 'text-daun-terang',
    dot: 'bg-daun',
  },
  anorganik: {
    badge: 'bg-emas text-rimba-950',
    bar: 'bg-emas',
    text: 'text-emas-terang',
    dot: 'bg-emas',
  },
  ragu: {
    badge: 'bg-white/85 text-rimba-950',
    bar: 'bg-white/60',
    text: 'text-white',
    dot: 'bg-white/70',
  },
}

type Filter = 'semua' | Verdict

/** Ringkasan hasil banyak foto: jumlah per jenis, daftar foto beserta hasilnya, dan unduh PDF. */
export function BatchSummary({
  items,
  failed,
  scannedAt,
  focusId,
  pdfState,
  onOpen,
  onDownload,
  onRescan,
}: {
  items: ScanItem[]
  failed: string[]
  scannedAt: number | null
  focusId: string | null
  pdfState: 'idle' | 'busy' | 'done' | 'error'
  onOpen: (id: string) => void
  onDownload: () => void
  onRescan: () => void
}) {
  const [filter, setFilter] = useState<Filter>('semua')
  const t = tally(items.map((i) => i.result))
  const isMock = items.some((i) => i.result.isMock)
  const shown = filter === 'semua' ? items : items.filter((i) => verdictOf(i.result) === filter)

  // Kembali dari rincian: tampilkan lagi baris foto yang terakhir dibuka.
  useEffect(() => {
    if (!focusId) return
    const el = document.getElementById(`hasil-${focusId}`)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    el.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
  }, [focusId])

  const when = scannedAt
    ? new Date(scannedAt).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
  const pct = (n: number) => `${fmt((n / t.total) * 100, n === t.total || n === 0 ? 0 : 1)}%`

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-160 bg-[radial-gradient(50%_60%_at_25%_15%,rgb(63_191_119/0.16),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pola-titik absolute inset-x-0 top-0 -z-10 h-160 mask-[linear-gradient(to_bottom,black,transparent)] opacity-40"
      />

      <div className="mx-auto max-w-6xl px-5 pt-24 pb-16 sm:px-6 md:pt-28 md:pb-20">
        {isMock && (
          <p
            role="status"
            className="masuk bg-krem/80 text-emas-terang ring-emas/30 mb-6 flex items-start gap-2.5 rounded-2xl p-3.5 text-sm ring-1"
          >
            <Icon name="alert" size={17} className="mt-0.5 shrink-0" />
            Mode demo: model hasil pelatihan belum dipasang, jadi hasil ini masih acak.
          </p>
        )}

        <section
          className="masuk-skala kartu grid gap-8 overflow-hidden rounded-[2.25rem] p-6 sm:p-9 lg:grid-cols-[1.2fr_1fr] lg:gap-10"
          style={delay(0)}
        >
          <div className="flex flex-col">
            <p className="text-redup text-sm font-semibold">
              Hasil pindaian{when ? `, ${when}` : ''}
            </p>
            <h1
              className="masuk-blur mt-2 text-4xl font-bold tracking-tight sm:text-5xl"
              data-testid="batch-title"
              style={delay(120)}
            >
              {t.total} foto selesai dikenali
            </h1>
            <p
              className="masuk text-mint-teks/85 mt-4 max-w-lg text-lg leading-relaxed"
              style={delay(220)}
            >
              {t.top && t.top !== 'ragu' ? (
                <>
                  Sebagian besar sampahmu{' '}
                  <strong className={TONE[t.top].text}>{VERDICT_LABEL[t.top].toLowerCase()}</strong>{' '}
                  ({t[t.top]} dari {t.total} foto).
                </>
              ) : t.top === 'ragu' ? (
                <>Sebagian besar foto belum bisa dipastikan jenisnya.</>
              ) : (
                <>Jumlah sampah tiap jenis seimbang.</>
              )}{' '}
              Ketuk salah satu foto untuk melihat rincian dan cara PILAH menghitungnya.
            </p>
            <div
              className="masuk mt-auto grid gap-3 pt-8 min-[25rem]:grid-cols-2 sm:flex sm:flex-wrap"
              style={delay(320)}
            >
              <Button
                size="lg"
                className="gap-1.5 px-3 max-sm:text-[0.95rem] sm:gap-2 sm:px-7"
                onClick={onDownload}
                disabled={pdfState === 'busy'}
                data-testid="download-pdf"
              >
                {pdfState === 'busy' ? (
                  <>
                    <span className="border-rimba-950/30 border-t-rimba-950 size-5 animate-spin rounded-full border-2" />{' '}
                    Menyiapkan PDF…
                  </>
                ) : pdfState === 'done' ? (
                  <>
                    <Icon name="check" size={19} strokeWidth={2.6} /> PDF terunduh
                  </>
                ) : (
                  <>
                    <Icon name="download" size={19} /> Unduh PDF
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="gap-1.5 px-3 max-sm:text-[0.95rem] sm:gap-2 sm:px-7"
                onClick={onRescan}
              >
                <Icon name="camera" size={19} /> Pindai lagi
              </Button>
            </div>
            {pdfState === 'error' && (
              <p role="alert" className="text-koral mt-3 text-sm">
                PDF gagal dibuat. Periksa koneksi lalu coba lagi.
              </p>
            )}
          </div>

          <div className="masuk flex flex-col justify-center gap-5" style={delay(260)}>
            <ul className="grid grid-cols-3 gap-2.5 sm:gap-3" data-testid="tally">
              {(['organik', 'anorganik', 'ragu'] as const).map((k) => (
                <li
                  key={k}
                  className="min-w-0 rounded-2xl bg-white/5 px-3 py-4 text-center ring-1 ring-white/10 sm:px-4"
                >
                  <p
                    className={cn(
                      'font-display angka text-3xl font-bold sm:text-4xl',
                      t[k] ? TONE[k].text : 'text-white/35',
                    )}
                  >
                    {t[k]}
                  </p>
                  <p className="text-mint-teks/80 mt-1 text-[0.7rem] leading-tight font-semibold min-[25rem]:text-xs sm:text-sm">
                    {VERDICT_LABEL[k]}
                  </p>
                  <p className="text-redup angka text-xs">{pct(t[k])}</p>
                </li>
              ))}
            </ul>
            <div>
              <div
                className="flex h-3 overflow-hidden rounded-full bg-white/8"
                role="img"
                aria-label={`Organik ${t.organik}, anorganik ${t.anorganik}, belum yakin ${t.ragu} dari ${t.total} foto`}
              >
                {(['organik', 'anorganik', 'ragu'] as const).map((k) =>
                  t[k] ? (
                    <span
                      key={k}
                      className={cn('h-full first:rounded-l-full last:rounded-r-full', TONE[k].bar)}
                      style={{ width: `${(t[k] / t.total) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
              <p className="text-redup mt-2.5 text-sm">
                Unduh PDF untuk menyimpan tabel hasil, keyakinan, dan saran penanganan setiap foto.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">Rincian per foto</h2>
            <p className="text-redup mt-1 text-sm">
              Ketuk baris untuk melihat hasil lengkap dan perhitungan CNN-nya.
            </p>
          </div>
          <div
            role="toolbar"
            aria-label="Saring hasil"
            className="-mx-1 flex scrollbar-none gap-2 overflow-x-auto px-1 pb-1"
          >
            {(['semua', 'organik', 'anorganik', 'ragu'] as const).map((k) => {
              const n = k === 'semua' ? t.total : t[k]
              const on = filter === k
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  disabled={n === 0}
                  onClick={() => setFilter(k)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200 disabled:opacity-35',
                    on
                      ? 'bg-emas text-rimba-950'
                      : 'text-mint-teks bg-white/6 ring-1 ring-white/10 hover:bg-white/10',
                  )}
                >
                  {k === 'semua' ? 'Semua' : VERDICT_LABEL[k]}{' '}
                  <span className="angka opacity-70">{n}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-white/10">
          <div
            aria-hidden
            className="bg-rimba-900 text-mint-teks/80 hidden grid-cols-[5.5rem_9.5rem_9rem_1fr_2.5rem] gap-5 px-5 py-3 text-xs font-semibold md:grid"
          >
            <span>Foto</span>
            <span>Hasil</span>
            <span>Keyakinan</span>
            <span>Catatan dan saran penanganan</span>
            <span />
          </div>
          <ul data-testid="batch-list" className="divide-y divide-white/8">
            {shown.map((it) => {
              const r = it.result
              const v = verdictOf(r)
              const conf = confidenceOf(r)
              return (
                <li key={it.id} id={`hasil-${it.id}`}>
                  <button
                    type="button"
                    onClick={() => onOpen(it.id)}
                    aria-label={`Lihat rincian ${it.name}: ${VERDICT_LABEL[v]}, keyakinan ${fmt(conf * 100, 1)} persen`}
                    className="group grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 gap-y-1 bg-white/2 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-white/6 focus-visible:bg-white/6 sm:grid-cols-[5.5rem_1fr_auto] md:grid-cols-[5.5rem_9.5rem_9rem_1fr_2.5rem] md:gap-5 md:px-5"
                  >
                    <img
                      src={it.src}
                      alt={it.name}
                      title={it.name}
                      className="row-span-3 size-18 rounded-2xl object-cover ring-1 ring-white/15 sm:size-22 md:row-span-1"
                    />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'font-display inline-flex rounded-full px-3 py-1 text-sm font-semibold',
                          TONE[v].badge,
                        )}
                      >
                        {VERDICT_LABEL[v]}
                      </span>
                      {v === 'ragu' && (
                        <span className="text-redup mt-1 block text-xs">cenderung {r.kind}</span>
                      )}
                    </span>
                    <span className="col-start-2 min-w-0 md:col-start-auto">
                      <span
                        className={cn(
                          'font-display angka text-lg font-semibold',
                          conf < LOW_CONFIDENCE ? 'text-emas-terang' : 'text-white',
                        )}
                      >
                        {fmt(conf * 100, 1)}%
                      </span>
                      <span className="mt-1 block h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-white/10">
                        <span
                          className={cn('block h-full rounded-full', TONE[v].bar)}
                          style={{ width: `${conf * 100}%` }}
                        />
                      </span>
                    </span>
                    <span className="text-mint-teks/80 col-start-2 line-clamp-2 text-sm leading-relaxed md:col-start-auto md:line-clamp-3">
                      {adviceFor(r)}
                    </span>
                    <span className="group-hover:bg-emas group-hover:text-rimba-950 col-start-3 row-span-3 row-start-1 grid size-9 place-items-center rounded-full bg-white/6 text-white transition-[transform,background-color] duration-300 group-hover:translate-x-0.5 md:col-start-auto md:row-span-1 md:row-start-auto">
                      <Icon name="arrowRight" size={17} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {failed.length > 0 && (
          <p className="bg-koral/10 text-teks ring-koral/25 mt-5 flex items-start gap-2.5 rounded-2xl p-4 text-sm ring-1">
            <Icon name="alert" size={17} className="text-koral mt-0.5 shrink-0" />
            {failed.length} foto tidak bisa dikenali dan tidak dimasukkan ke hasil:{' '}
            {failed.join(', ')}.
          </p>
        )}
        <p className="text-redup mt-6 text-sm leading-relaxed">
          PILAH menebak dari pola bentuk dan tekstur di foto, bukan dari pemeriksaan bahan.
          Keyakinan di bawah {fmt(LOW_CONFIDENCE * 100, 0)}% sebaiknya dicek ulang.
        </p>
      </div>
    </div>
  )
}
