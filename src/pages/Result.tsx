import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { BatchSummary } from '@/components/result/BatchSummary'
import { ProcessExplorer } from '@/components/result/ProcessExplorer'
import { SortReveal } from '@/components/result/SortReveal'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { tally, verdictOf, VERDICT_LABEL } from '@/lib/advice'
import { GUIDE } from '@/lib/content'
import { classifyInput } from '@/lib/ml/classify'
import { prefersReducedMotion, useCountUp } from '@/lib/motion'
import { useBlocker, useLocation, useNavigate } from '@/lib/router'
import { cn, fmt } from '@/lib/utils'
import { classifyActions, decodeGray, useClassifyStore, type ScanItem } from '@/store/classifyStore'

const delay = (ms: number) => ({ '--tunda': `${ms}ms` }) as CSSProperties

const RETAKE_TIPS: { icon: IconName; text: string }[] = [
  { icon: 'square', text: 'Foto satu benda saja, dekatkan kamera agar bendanya memenuhi bingkai.' },
  { icon: 'layers', text: 'Pindahkan ke latar polos seperti lantai atau meja.' },
  { icon: 'sun', text: 'Cari tempat yang lebih terang dan hindari bayangan.' },
]

/** Cincin keyakinan yang terisi dari 0. */
function ConfidenceRing({ value, tone }: { value: number; tone: 'daun' | 'emas' | 'netral' }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGo(true), 350)
    return () => clearTimeout(t)
  }, [])
  const shown = useCountUp(value * 100, { start: go, duration: 1200 })
  const R = 52
  const C = 2 * Math.PI * R
  const color = tone === 'daun' ? '#3fbf77' : tone === 'emas' ? '#ffc247' : '#9cb9ae'
  return (
    <div
      className="relative size-36 shrink-0"
      role="img"
      aria-label={`Keyakinan ${fmt(value * 100, 1)} persen`}
    >
      <svg
        viewBox="0 0 120 120"
        className="size-full -rotate-90 overflow-visible"
        style={{ filter: `drop-shadow(0 0 10px ${color}55)` }}
      >
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="rgb(255 255 255 / 0.08)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={go ? C * (1 - value) : C}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div aria-hidden className="absolute inset-0 grid place-content-center text-center">
        <span className="font-display angka text-3xl font-bold text-white">{fmt(shown, 1)}%</span>
        <span className="text-redup text-xs">keyakinan</span>
      </div>
    </div>
  )
}

function SplitBar({ y }: { y: number }) {
  // Dibulatkan satu desimal dan dibuat berjumlah tepat 100%.
  const pOrg = Math.round((1 - y) * 1000) / 10
  const pAno = Math.round((100 - pOrg) * 10) / 10
  const [go, setGo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGo(true), 450)
    return () => clearTimeout(t)
  }, [])
  return (
    <div
      role="img"
      aria-label={`Peluang organik ${fmt(pOrg, 1)} persen, anorganik ${fmt(pAno, 1)} persen`}
    >
      <div className="flex justify-between text-sm font-semibold">
        <span className="text-daun-terang flex items-center gap-2">
          <span className="bg-daun size-2.5 rounded-full" /> Organik {fmt(pOrg, 1)}%
        </span>
        <span className="text-emas-terang flex items-center gap-2">
          Anorganik {fmt(pAno, 1)}% <span className="bg-emas size-2.5 rounded-full" />
        </span>
      </div>
      <div className="relative mt-2.5 flex h-3 overflow-hidden rounded-full bg-white/8">
        <div
          className="bg-daun ease-keluar h-full rounded-l-full transition-[width] duration-1000"
          style={{ width: go ? `${pOrg}%` : '0%' }}
        />
        <div className="flex-1" />
        <div
          className="bg-emas ease-keluar h-full rounded-r-full transition-[width] duration-1000"
          style={{ width: go ? `${pAno}%` : '0%' }}
        />
        <span aria-hidden className="bg-latar absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2" />
      </div>
    </div>
  )
}

function Empty() {
  return (
    <section className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-5 pt-28 pb-20 text-center">
      <span className="masuk-skala text-daun-terang grid size-20 place-items-center rounded-3xl bg-white/6 ring-1 ring-white/10">
        <Icon name="scan" size={34} strokeWidth={1.7} />
      </span>
      <h1 className="masuk mt-6 text-3xl font-bold" style={delay(100)}>
        Belum ada hasil untuk ditampilkan
      </h1>
      <p className="masuk text-redup mt-3 text-lg" style={delay(180)}>
        Pindai foto sampahmu dulu, hasilnya akan muncul di sini.
      </p>
      <ButtonLink to="/klasifikasi" size="lg" className="masuk mt-8" style={delay(260)}>
        <Icon name="scan" size={19} /> Pindai sampah
      </ButtonLink>
    </section>
  )
}

interface BatchNav {
  index: number
  total: number
  onBack: () => void
  onPrev: () => void
  onNext: () => void
}

/** Rincian hasil satu foto: keputusan, keyakinan, saran, dan penelusuran perhitungan CNN. */
function Detail({
  item,
  batch,
  onRescan,
}: {
  item: ScanItem
  batch?: BatchNav
  onRescan: () => void
}) {
  const [showProcess, setShowProcess] = useState(false)
  /** true saat dibuka lewat tombol "Lihat perhitungan": panel langsung terbuka penuh agar bisa digulir tepat ke sana. */
  const [jump, setJump] = useState(false)

  const openProcess = useCallback(() => {
    setJump(true)
    setShowProcess(true)
    // Tunggu panel perhitungan selesai dirender (dua frame) baru gulir, supaya posisinya sudah final.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.getElementById('perhitungan')?.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        }),
      ),
    )
  }, [])

  const result = item.result
  const { kind, confidence, uncertain, y, isMock } = result
  const g = GUIDE[kind]
  const org = kind === 'organik'
  const title = uncertain ? 'PILAH belum yakin' : org ? 'Sampah organik' : 'Sampah anorganik'
  const tone = uncertain ? 'netral' : org ? 'daun' : 'emas'

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 -z-10 h-160',
          uncertain
            ? 'bg-[radial-gradient(50%_60%_at_30%_20%,rgb(255_255_255/0.07),transparent_70%)]'
            : org
              ? 'bg-[radial-gradient(50%_60%_at_25%_20%,rgb(63_191_119/0.22),transparent_70%)]'
              : 'bg-[radial-gradient(50%_60%_at_25%_20%,rgb(255_194_71/0.18),transparent_70%)]',
        )}
      />
      <div
        aria-hidden
        className="pola-titik absolute inset-x-0 top-0 -z-10 h-160 mask-[linear-gradient(to_bottom,black,transparent)] opacity-40"
      />

      <div className="mx-auto max-w-6xl px-5 pt-24 pb-16 sm:px-6 md:pt-28 md:pb-20">
        {batch && (
          <nav
            aria-label="Navigasi hasil"
            className="masuk mb-5 flex flex-wrap items-center justify-between gap-3"
          >
            <button
              type="button"
              onClick={batch.onBack}
              className="group inline-flex h-11 items-center gap-2 rounded-full bg-white/6 pr-5 pl-3.5 text-sm font-semibold text-white ring-1 ring-white/12 transition-colors hover:bg-white/10"
            >
              <Icon
                name="arrowLeft"
                size={17}
                className="transition-transform duration-300 group-hover:-translate-x-0.5"
              />
              Kembali ke ringkasan
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={batch.onPrev}
                disabled={batch.index === 0}
                aria-label="Foto sebelumnya"
                className="grid size-11 place-items-center rounded-full bg-white/6 text-white ring-1 ring-white/12 transition-colors hover:bg-white/10 disabled:opacity-35"
              >
                <Icon name="arrowLeft" size={17} />
              </button>
              <span
                className="text-redup angka min-w-20 text-center text-sm"
                data-testid="detail-pos"
              >
                {batch.index + 1} dari {batch.total}
              </span>
              <button
                type="button"
                onClick={batch.onNext}
                disabled={batch.index === batch.total - 1}
                aria-label="Foto berikutnya"
                className="grid size-11 place-items-center rounded-full bg-white/6 text-white ring-1 ring-white/12 transition-colors hover:bg-white/10 disabled:opacity-35"
              >
                <Icon name="arrowRight" size={17} />
              </button>
            </div>
          </nav>
        )}
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
          className="masuk-skala kartu grid overflow-hidden rounded-[2.25rem] lg:grid-cols-[0.9fr_1.1fr]"
          style={delay(0)}
        >
          {/* Kiri: animasi masuk tong */}
          <div
            className={cn(
              'pola-titik relative flex min-h-80 flex-col items-center justify-between gap-4 p-5 sm:gap-6 sm:p-6 lg:min-h-112',
              uncertain ? 'bg-white/3' : org ? 'bg-mint/70' : 'bg-krem/70',
            )}
          >
            <span
              className={cn(
                'font-display relative self-start rounded-full px-3.5 py-1.5 text-sm font-semibold',
                uncertain
                  ? 'bg-white/10 text-white ring-1 ring-white/20'
                  : org
                    ? 'bg-daun text-rimba-950'
                    : 'bg-emas text-rimba-950',
              )}
            >
              {uncertain ? 'Di antara dua tong' : `Masuk tong ${kind}`}
            </span>
            <div className="relative my-auto">
              <SortReveal key={item.id} kind={kind} src={item.src} uncertain={uncertain} />
            </div>
            <div className="bg-rimba-950/50 relative flex min-w-0 items-center gap-3 self-stretch rounded-2xl p-2 pr-4 ring-1 ring-white/10">
              <img
                src={item.src}
                alt="Foto yang dipindai"
                className="size-12 shrink-0 rounded-xl object-cover"
              />
              <p className="text-mint-teks/80 min-w-0 text-sm">
                Foto yang kamu pindai
                <span className="text-redup block truncate text-xs" title={item.name}>
                  {item.name}
                </span>
              </p>
            </div>
          </div>

          {/* Kanan: keputusan */}
          <div className="flex flex-col justify-center p-6 sm:p-9">
            <p className="masuk text-redup text-sm font-semibold" style={delay(150)}>
              Hasil pindaian
            </p>
            <div className="mt-2 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1
                  data-testid="verdict"
                  className={cn(
                    'masuk-blur text-4xl font-bold tracking-tight sm:text-5xl',
                    uncertain ? 'text-white' : org ? 'text-daun-terang' : 'text-emas-terang',
                  )}
                  style={delay(200)}
                >
                  {title}
                </h1>
                <p
                  className="masuk text-mint-teks/85 mt-3 max-w-md text-lg leading-relaxed"
                  style={delay(300)}
                >
                  {uncertain
                    ? 'Peluang organik dan anorganik hampir seimbang, jadi PILAH belum bisa memastikan.'
                    : `PILAH cukup yakin ini sampah ${kind}. Buang ke tong ${org ? 'hijau' : 'kuning'} atau wadah ${kind}.`}
                </p>
              </div>
              <div className="masuk-skala self-center sm:self-auto" style={delay(350)}>
                <ConfidenceRing value={uncertain ? Math.max(y, 1 - y) : confidence} tone={tone} />
              </div>
            </div>

            <div className="masuk mt-8" style={delay(450)}>
              <SplitBar key={item.id} y={y} />
            </div>

            <div
              className="masuk mt-8 grid gap-3 min-[25rem]:grid-cols-2 sm:flex sm:flex-wrap"
              style={delay(550)}
            >
              <Button
                size="lg"
                className="gap-1.5 px-3 max-sm:text-[0.95rem] sm:gap-2 sm:px-7"
                onClick={onRescan}
              >
                <Icon name="camera" size={19} /> Pindai lagi
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="gap-1.5 px-3 max-sm:text-[0.95rem] sm:gap-2 sm:px-7"
                onClick={openProcess}
              >
                <Icon name="layers" size={18} /> Lihat perhitungan
              </Button>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <Reveal gaya="naik" className="h-full">
            {uncertain ? (
              <div className="kartu h-full rounded-4xl p-7">
                <h2 className="font-display flex items-center gap-2.5 text-lg font-semibold">
                  <Icon name="camera" size={20} className="text-emas" /> Coba foto ulang seperti ini
                </h2>
                <ul className="mt-5 space-y-3">
                  {RETAKE_TIPS.map((t) => (
                    <li key={t.text} className="group flex gap-3">
                      <span className="text-emas grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.07] transition-transform duration-300 group-hover:-rotate-6">
                        <Icon name={t.icon} size={17} />
                      </span>
                      <span className="text-mint-teks/90 pt-1.5 leading-relaxed">{t.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div
                className={cn('kartu h-full rounded-4xl p-7', org ? 'bg-mint/40' : 'bg-krem/40')}
              >
                <h2 className="font-display flex items-center gap-2.5 text-lg font-semibold">
                  <Icon
                    name={org ? 'leaf' : 'recycle'}
                    size={20}
                    className={org ? 'text-daun-terang' : 'text-emas'}
                  />
                  Yang sebaiknya kamu lakukan
                </h2>
                <ol className="mt-5 space-y-3.5">
                  {g.steps.map((s, i) => (
                    <li key={s} className="group flex gap-3">
                      <span
                        className={cn(
                          'font-display grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-transform duration-300 group-hover:scale-110',
                          org ? 'bg-daun text-rimba-950' : 'bg-emas text-rimba-950',
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="text-mint-teks/90 pt-0.5 leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm text-white ring-1 ring-white/10">
                  Bisa diolah menjadi: {g.becomes.toLowerCase()}
                </p>
              </div>
            )}
          </Reveal>
          <Reveal gaya="naik" delay={120} className="h-full">
            <div className="kartu h-full rounded-4xl p-7">
              <h2 className="font-display flex items-center gap-2.5 text-lg font-semibold">
                <Icon name="info" size={20} className="text-daun-terang" /> Tentang hasil ini
              </h2>
              <p className="text-redup mt-4 leading-relaxed">
                PILAH menebak dari pola bentuk dan tekstur di foto, bukan dari pemeriksaan bahan.
                Kalau masih ragu, lihat bahannya: dari makhluk hidup berarti organik, sedangkan
                plastik, logam, kaca, atau kertas olahan berarti anorganik.
              </p>
              <button
                type="button"
                onClick={openProcess}
                className="group text-emas hover:text-emas-terang mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
              >
                Lihat cara PILAH menghitungnya
                <Icon
                  name="arrowDown"
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-y-0.5"
                />
              </button>
            </div>
          </Reveal>
        </div>

        <div id="perhitungan" className="mt-10">
          <button
            type="button"
            aria-expanded={showProcess}
            aria-controls="proses"
            onClick={() => {
              setJump(false)
              setShowProcess((s) => !s)
            }}
            className="group flex w-full items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/3 px-6 py-5 text-left transition-colors hover:bg-white/6"
          >
            <span>
              <span className="font-display block text-lg font-semibold text-white">
                Penasaran cara PILAH sampai ke jawaban ini?
              </span>
              <span className="text-redup mt-1 block text-sm">
                Telusuri enam langkah perhitungan CNN untuk fotomu, dari piksel sampai keputusan.
              </span>
            </span>
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full bg-white/8 transition-transform duration-500',
                showProcess && 'bg-emas text-rimba-950 rotate-180',
              )}
            >
              <Icon name="chevronDown" size={20} />
            </span>
          </button>
          <div
            className={cn(
              'ease-keluar grid duration-700',
              jump ? 'transition-opacity' : 'transition-[grid-template-rows,opacity]',
              showProcess ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              {showProcess && <ProcessExplorer result={result} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Result() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { items, saved, scannedAt, failed } = useClassifyStore()
  const [restoring, setRestoring] = useState(items.length === 0 && saved !== null)
  /** Tujuan perpindahan yang menunggu konfirmasi (null = dialog tertutup). */
  const [leaveTo, setLeaveTo] = useState<string | null>(null)
  const [pdfState, setPdfState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  /** Foto terakhir yang dibuka rinciannya, untuk kembali ke posisinya di ringkasan. */
  const [lastViewed, setLastViewed] = useState<string | null>(null)
  const openedFromSummary = useRef(false)

  // Halaman dimuat ulang: pulihkan hasil sesi ini dari salinan tersimpan dan hitung ulang semuanya.
  useEffect(() => {
    if (items.length > 0 || !saved) return
    let dead = false
    Promise.all(saved.items.map((s) => classifyInput(decodeGray(s.gray))))
      .then((res) => !dead && classifyActions.restore(res))
      .catch(() => undefined)
      .finally(() => !dead && setRestoring(false))
    return () => {
      dead = true
    }
  }, [items.length, saved])

  // Hasil tidak disimpan permanen: setiap perpindahan halaman (menu, logo, tombol back) dikonfirmasi dulu.
  const guard = useMemo(
    () =>
      items.length > 0
        ? (to: string) => {
            setLeaveTo(to)
            return true
          }
        : null,
    [items.length],
  )
  useBlocker(guard)

  const fotoId = new URLSearchParams(search).get('foto')
  const many = items.length > 1
  const index = many && fotoId ? items.findIndex((i) => i.id === fotoId) : -1

  const openDetail = useCallback(
    (id: string) => {
      setLastViewed(id)
      openedFromSummary.current = true
      navigate(`/hasil?foto=${encodeURIComponent(id)}`)
    },
    [navigate],
  )
  const backToSummary = useCallback(() => {
    if (openedFromSummary.current) {
      openedFromSummary.current = false
      window.history.back()
    } else navigate('/hasil', { replace: true })
  }, [navigate])
  const goTo = useCallback(
    (i: number) => {
      const it = items[i]
      if (!it) return
      setLastViewed(it.id)
      navigate(`/hasil?foto=${encodeURIComponent(it.id)}`, { replace: true })
    },
    [items, navigate],
  )

  async function downloadPdf() {
    if (pdfState === 'busy') return
    setPdfState('busy')
    try {
      const { downloadReport } = await import('@/lib/report')
      await downloadReport(items, scannedAt ?? Date.now(), failed)
      setPdfState('done')
      setTimeout(() => setPdfState((s) => (s === 'done' ? 'idle' : s)), 2600)
    } catch {
      setPdfState('error')
    }
  }

  if (items.length === 0)
    return restoring ? <div className="min-h-[80vh]" aria-busy="true" /> : <Empty />

  const newScan = leaveTo !== null && leaveTo.split(/[?#]/)[0] === '/klasifikasi'
  const t = tally(items.map((i) => i.result))

  let view
  if (!many)
    view = <Detail key={items[0].id} item={items[0]} onRescan={() => setLeaveTo('/klasifikasi')} />
  else if (index >= 0)
    view = (
      <Detail
        key={items[index].id}
        item={items[index]}
        onRescan={() => setLeaveTo('/klasifikasi')}
        batch={{
          index,
          total: items.length,
          onBack: backToSummary,
          onPrev: () => goTo(index - 1),
          onNext: () => goTo(index + 1),
        }}
      />
    )
  else
    view = (
      <BatchSummary
        items={items}
        failed={failed}
        scannedAt={scannedAt}
        focusId={lastViewed}
        pdfState={pdfState}
        onOpen={openDetail}
        onDownload={downloadPdf}
        onRescan={() => setLeaveTo('/klasifikasi')}
      />
    )

  return (
    <>
      {view}
      <ConfirmDialog
        open={leaveTo !== null}
        title={newScan ? 'Mulai pindaian baru?' : 'Tinggalkan halaman hasil?'}
        media={many ? <ResultStack items={items} /> : <SingleThumb item={items[0]} />}
        confirmLabel={newScan ? 'Ya, pindai foto baru' : 'Ya, tinggalkan'}
        cancelLabel="Kembali ke hasil"
        onCancel={() => setLeaveTo(null)}
        onConfirm={() => {
          const to = leaveTo
          setLeaveTo(null)
          classifyActions.reset()
          if (to) navigate(to, { force: true })
        }}
      >
        {newScan
          ? many
            ? `Hasil ${t.total} foto ini akan dihapus dan diganti dengan pindaian berikutnya. Jika ingin menyimpannya, unduh laporan PDF terlebih dahulu.`
            : 'Hasil ini akan dihapus dan diganti dengan pindaian berikutnya. Pastikan kamu sudah mencatat jenis sampah dan cara membuangnya.'
          : many
            ? `Hasil ${t.total} foto ini tidak disimpan. Setelah berpindah halaman, hasil dan rinciannya tidak bisa dibuka lagi. Jika ingin menyimpannya, unduh laporan PDF terlebih dahulu.`
            : 'Hasil pindaian tidak disimpan. Setelah berpindah halaman, hasil dan rincian perhitungannya tidak bisa dibuka lagi. Pastikan kamu sudah membaca semua informasinya.'}
      </ConfirmDialog>
    </>
  )
}

function SingleThumb({ item }: { item: ScanItem }) {
  const v = verdictOf(item.result)
  return (
    <span className="relative block">
      <img
        src={item.src}
        alt=""
        className="size-20 rounded-2xl object-cover ring-4 ring-white/10"
      />
      <span
        className={cn(
          'font-display ring-panel absolute -right-2 -bottom-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-2',
          v === 'ragu'
            ? 'text-rimba-950 bg-white'
            : v === 'organik'
              ? 'bg-daun text-rimba-950'
              : 'bg-emas text-rimba-950',
        )}
      >
        {VERDICT_LABEL[v]}
      </span>
    </span>
  )
}

function ResultStack({ items }: { items: ScanItem[] }) {
  const shown = items.slice(0, 3)
  return (
    <span className="relative flex items-center">
      {shown.map((it, i) => (
        <img
          key={it.id}
          src={it.src}
          alt=""
          className={cn('ring-panel size-18 rounded-2xl object-cover ring-4', i > 0 && '-ml-7')}
          style={{ transform: `rotate(${(i - (shown.length - 1) / 2) * 7}deg)`, zIndex: 3 - i }}
        />
      ))}
      <span className="bg-emas font-display text-rimba-950 ring-panel absolute -right-3 -bottom-2 z-10 rounded-full px-2 py-0.5 text-xs font-bold ring-2">
        {items.length} foto
      </span>
    </span>
  )
}
