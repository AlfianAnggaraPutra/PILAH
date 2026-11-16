import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react'
import {
  CameraModal,
  cameraMessage,
  cameraSupported,
  type CameraFailure,
} from '@/components/classify/CameraModal'
import { BgPhoto } from '@/components/ui/BgPhoto'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon, type IconName } from '@/components/ui/Icon'
import { MapCanvas } from '@/components/ui/MapCanvas'
import { Reveal } from '@/components/ui/Reveal'
import { PHOTOS } from '@/lib/content'
import { ITEMS } from '@/lib/items'
import {
  classifyImage,
  classifyInput,
  UserFacingError,
  type Classification,
} from '@/lib/ml/classify'
import { loadModel, modelStatus, retryModel } from '@/lib/ml/model'
import { prefersReducedMotion, trackSpotlight } from '@/lib/motion'
import { useBlocker, useNavigate } from '@/lib/router'
import { cn, pct, sleep } from '@/lib/utils'
import {
  classifyActions,
  decodeGray,
  useClassifyStore,
  type HistoryItem,
} from '@/store/classifyStore'

const MAX_BYTES = 15 * 1024 * 1024
const ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif'
const delay = (ms: number) => ({ '--tunda': `${ms}ms` }) as CSSProperties

/** Tahapan yang ditampilkan selama foto diproses (bahasa sehari-hari). */
const STAGES = [
  'Menyiapkan foto',
  'Menyederhanakan warna',
  'Mencari pola bentuk dan tekstur',
  'Merangkum ciri yang paling penting',
  'Menentukan jenis sampah',
] as const

const TIPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'square',
    title: 'Satu benda saja',
    text: 'Isi bingkai dengan satu sampah supaya PILAH tidak bingung.',
  },
  {
    icon: 'sun',
    title: 'Cahaya cukup',
    text: 'Hindari foto gelap atau silau karena lampu dan matahari.',
  },
  {
    icon: 'layers',
    title: 'Latar polos',
    text: 'Lantai, meja, atau dinding polos membantu PILAH fokus.',
  },
  {
    icon: 'focus',
    title: 'Foto tajam',
    text: 'Tahan ponsel sebentar sampai gambarnya tidak goyang.',
  },
]

interface Sample {
  src: string
  label: string
  kind?: string
}

function useModelStatus() {
  return useSyncExternalStore(modelStatus.subscribe, modelStatus.get, modelStatus.get)
}

function looksLikeImage(f: File) {
  return f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|hei[cf])$/i.test(f.name)
}

/** Lapisan proses: menampilkan hasil antara yang sungguhan selama foto dikenali. */
function ProcessingOverlay({ result, stage }: { result: Classification | null; stage: number }) {
  const t = result?.trace
  return (
    <div className="bg-rimba-950/85 absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 p-6 text-white backdrop-blur-sm">
      <div className="ring-emas/80 relative size-36 overflow-hidden rounded-2xl ring-2 sm:size-44">
        {t && stage >= 1 && (
          <MapCanvas
            key={stage >= 3 ? `p${stage}` : stage === 2 ? 'r' : 'g'}
            data={stage >= 3 ? t.P[stage % t.P.length] : stage === 2 ? t.R[0] : t.gray}
            side={stage >= 3 ? t.size / 2 : t.size}
            mapStyle={stage >= 2 ? 'heat' : 'gray'}
            label="Pratinjau proses pengenalan"
            className="halaman-masuk size-full"
          />
        )}
        <div className="animate-pindai via-daun/60 absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent to-transparent" />
      </div>
      <ol className="w-full max-w-xs space-y-1.5 text-sm" aria-live="polite">
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={cn(
              'flex items-center gap-2.5 transition-opacity duration-300',
              i > stage ? 'opacity-35' : 'opacity-100',
            )}
          >
            <span
              className={cn(
                'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors',
                i < stage
                  ? 'bg-daun text-rimba-950'
                  : i === stage
                    ? 'bg-emas text-rimba-950'
                    : 'bg-white/15',
              )}
            >
              {i < stage ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Ilustrasi bingkai kosong: dua tong dengan beberapa sampah melayang di sekitarnya. */
function EmptyArt({ dragging }: { dragging: boolean }) {
  const orbit: Array<[keyof typeof ITEMS, string, number]> = [
    ['banana', 'left-[8%] top-[14%]', -14],
    ['can', 'right-[9%] top-[12%]', 12],
    ['leaf', 'left-[14%] bottom-[16%]', 8],
    ['cup', 'right-[13%] bottom-[18%]', -10],
  ]
  return (
    <>
      {orbit.map(([id, pos, rot], i) => (
        <img
          key={id}
          src={ITEMS[id].src}
          alt=""
          aria-hidden
          className={cn(
            'motion-safe:animate-melayang pointer-events-none absolute hidden size-14 opacity-80 drop-shadow-[0_12px_14px_rgba(0,0,0,0.45)] sm:block',
            pos,
            dragging && 'opacity-30',
          )}
          style={{ '--rot': `${rot}deg`, animationDelay: `${i * -1.2}s` } as CSSProperties}
        />
      ))}
    </>
  )
}

export default function Classify() {
  const navigate = useNavigate()
  const { file, previewUrl, history } = useClassifyStore()
  const status = useModelStatus()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  const [pending, setPending] = useState<Classification | null>(null)
  const [dragging, setDragging] = useState(false)
  const [camera, setCamera] = useState(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const [loadingSample, setLoadingSample] = useState<string | null>(null)
  const [leaveTo, setLeaveTo] = useState<string | null>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const nativeCamRef = useRef<HTMLInputElement>(null)
  const runRef = useRef<HTMLButtonElement>(null)
  const dragDepth = useRef(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    loadModel().catch(() => undefined)
    fetch('/samples/manifest.json')
      .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : []))
      .then((j: unknown) => Array.isArray(j) && setSamples(j as Sample[]))
      .catch(() => undefined)
  }, [])

  // Tahan perpindahan halaman selama ada foto yang belum dikenali, lalu tanyakan dulu lewat dialog.
  const guard = useMemo(
    () =>
      file || busy
        ? (to: string) => {
            setLeaveTo(to)
            return true
          }
        : null,
    [file, busy],
  )
  useBlocker(guard)

  // Muat ulang / tutup tab: browser menampilkan peringatan bawaannya.
  useEffect(() => {
    if (!file) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [file])

  const pick = useCallback((f: File | null | undefined, extraNote?: string) => {
    setError(null)
    setNotice(extraNote ?? null)
    if (!f) return
    if (!looksLikeImage(f)) {
      setError('Berkas ini bukan gambar. Pilih foto berformat JPG, PNG, atau WebP.')
      return
    }
    if (f.size === 0) {
      setError('Berkas foto kosong. Coba pilih ulang fotonya.')
      return
    }
    if (f.size > MAX_BYTES) {
      setError(
        `Ukuran foto ${(f.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB, lebih dari batas 15 MB. Kecilkan dulu atau pilih foto lain.`,
      )
      return
    }
    classifyActions.setFile(f)
    requestAnimationFrame(() => runRef.current?.focus({ preventScroll: true }))
  }, [])

  // Tempel foto dari clipboard (Ctrl+V / Cmd+V).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'))
      const f = item?.getAsFile()
      if (f) {
        e.preventDefault()
        pick(new File([f], f.name || `tempel-${Date.now()}.png`, { type: f.type }))
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [pick])

  // Seret-lepas di mana saja di halaman ini.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth.current++
      setDragging(true)
    }
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const leave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragging(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      pick(
        files[0],
        files.length > 1
          ? `${files.length} berkas dilepas, yang dipakai hanya yang pertama.`
          : undefined,
      )
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [pick])

  const onCameraFail = useCallback((reason: CameraFailure) => {
    setCamera(false)
    if (reason === 'unsupported' || reason === 'other') {
      nativeCamRef.current?.click()
      return
    }
    setError(cameraMessage(reason))
  }, [])
  const onCameraClose = useCallback(() => setCamera(false), [])
  const onCapture = useCallback(
    (f: File) => {
      setCamera(false)
      pick(f)
    },
    [pick],
  )

  function openCamera() {
    setError(null)
    if (cameraSupported()) setCamera(true)
    else nativeCamRef.current?.click()
  }

  async function pickSample(s: Sample) {
    setLoadingSample(s.src)
    try {
      const res = await fetch(s.src)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const name = s.src.split('/').pop() || 'contoh.jpg'
      pick(new File([blob], name, { type: blob.type || 'image/jpeg' }))
    } catch {
      setError('Foto contoh gagal dimuat. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoadingSample(null)
    }
  }

  async function run() {
    if (!file || busy) return
    setBusy(true)
    setStage(0)
    setPending(null)
    setError(null)
    const pace = prefersReducedMotion() ? 60 : 340
    try {
      const res = await classifyImage(file)
      setPending(res)
      // Perhitungannya sendiri hanya puluhan milidetik; tahapan ditampilkan sebentar agar bisa diikuti.
      for (let s = 1; s < STAGES.length; s++) {
        await sleep(pace)
        setStage(s)
      }
      await sleep(pace + 120)
      // Pengguna sudah meninggalkan halaman lewat dialog konfirmasi: jangan paksa pindah ke hasil.
      if (!alive.current) return
      await classifyActions.commitResult(res)
      navigate('/hasil', { force: true })
    } catch (e) {
      setError(
        e instanceof UserFacingError || (e instanceof Error && e.name === 'ModelUnavailableError')
          ? e.message
          : 'Terjadi kesalahan saat memproses foto. Coba lagi atau pakai foto lain.',
      )
      setBusy(false)
    }
  }

  async function openHistory(h: HistoryItem) {
    try {
      const res = await classifyInput(decodeGray(h.gray))
      classifyActions.restore(h, res)
      navigate('/hasil', { force: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Riwayat ini tidak bisa dibuka.')
    }
  }

  const blocked = status === 'missing' || status === 'error'
  const step = busy ? 2 : file ? 1 : 0

  return (
    <div className="relative isolate overflow-hidden">
      <BgPhoto
        id={PHOTOS.pindai.id}
        className="-z-10 h-[34rem] [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-25"
      />
      <div
        aria-hidden
        className="pola-titik absolute inset-x-0 top-0 -z-10 h-[34rem] [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-50"
      />
      <div
        aria-hidden
        className="bg-daun/10 pointer-events-none absolute top-20 right-[-10%] -z-10 size-[32rem] rounded-full blur-3xl"
      />

      <section className="mx-auto max-w-6xl px-5 pt-28 pb-20 sm:px-6 md:pt-32">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <h1
              className="masuk-blur text-4xl font-bold tracking-tight sm:text-5xl"
              style={delay(0)}
            >
              Pindai sampahmu
            </h1>
            <p className="masuk text-mint-teks/85 mt-4 text-lg leading-relaxed" style={delay(120)}>
              Ambil foto atau pilih dari galeri. Dalam beberapa detik PILAH memberi tahu jenis
              sampahnya beserta cara membuangnya.
            </p>
          </div>
          <ol
            className="masuk flex items-center gap-2 text-sm"
            style={delay(220)}
            aria-label="Tahapan"
          >
            {['Pilih foto', 'Kenali', 'Lihat hasil'].map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 font-medium transition-colors duration-500',
                    i === step
                      ? 'bg-emas text-rimba-950'
                      : i < step
                        ? 'bg-daun/20 text-daun-terang'
                        : 'text-redup bg-white/[0.05] ring-1 ring-white/10',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-6 place-items-center rounded-full text-xs font-bold',
                      i === step
                        ? 'bg-rimba-950 text-emas'
                        : i < step
                          ? 'bg-daun text-rimba-950'
                          : 'bg-white/10',
                    )}
                  >
                    {i < step ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  {label}
                </span>
                {i < 2 && <span aria-hidden className="h-px w-4 bg-white/15" />}
              </li>
            ))}
          </ol>
        </div>

        {status === 'demo' && (
          <p
            role="status"
            className="masuk bg-krem/80 text-emas-terang ring-emas/30 mt-7 flex items-start gap-3 rounded-2xl p-4 text-sm ring-1"
          >
            <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
            <span>
              <strong>Mode demo.</strong> Model hasil pelatihan belum dipasang, jadi hasil pindaian
              masih acak dan bukan prediksi sungguhan.
            </span>
          </p>
        )}
        {blocked && (
          <div
            role="alert"
            className="masuk bg-koral/10 ring-koral/30 mt-7 flex flex-col gap-3 rounded-2xl p-4 text-sm ring-1 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-teks flex items-start gap-3">
              <Icon
                name={status === 'error' ? 'wifiOff' : 'alert'}
                size={18}
                className="text-koral mt-0.5 shrink-0"
              />
              {status === 'missing'
                ? 'Model belum terpasang di server ini, jadi fitur pindai belum bisa dipakai.'
                : modelStatus.message() ||
                  'Model gagal dimuat. Periksa koneksi internet lalu coba lagi.'}
            </p>
            {status === 'error' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => retryModel().catch(() => undefined)}
              >
                <Icon name="refresh" size={16} /> Muat ulang model
              </Button>
            )}
          </div>
        )}

        <div className="mt-9 grid gap-6 lg:grid-cols-[1.45fr_1fr] lg:gap-7">
          {/* Kiri: bingkai foto + tombol */}
          <div
            className="masuk-skala kartu flex flex-col rounded-[2rem] p-3 sm:p-4"
            style={delay(200)}
          >
            <div
              data-testid="viewfinder"
              className={cn(
                'relative grid aspect-[4/3.6] place-items-center overflow-hidden rounded-[1.5rem] transition-[background-color,box-shadow] duration-300 sm:aspect-[4/3] lg:aspect-auto lg:min-h-[24rem] lg:flex-1',
                previewUrl
                  ? 'bg-rimba-950'
                  : dragging
                    ? 'bg-daun/15 ring-daun ring-2'
                    : 'bg-rimba-950/60 bg-[radial-gradient(70%_70%_at_50%_45%,rgb(63_191_119/0.12),transparent_70%)] ring-1 ring-white/[0.06]',
              )}
            >
              {[
                'top-4 left-4 border-t-[3px] border-l-[3px] rounded-tl-2xl',
                'top-4 right-4 border-t-[3px] border-r-[3px] rounded-tr-2xl',
                'bottom-4 left-4 border-b-[3px] border-l-[3px] rounded-bl-2xl',
                'bottom-4 right-4 border-b-[3px] border-r-[3px] rounded-br-2xl',
              ].map((c) => (
                <span
                  key={c}
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute z-20 size-10 transition-colors duration-300',
                    previewUrl ? 'border-emas' : dragging ? 'border-daun' : 'border-white/25',
                    c,
                  )}
                />
              ))}

              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Foto yang akan dipindai"
                    className="halaman-masuk max-h-full max-w-full object-contain"
                  />
                  {busy && <ProcessingOverlay result={pending} stage={stage} />}
                  {!busy && (
                    <div className="absolute top-4 right-4 z-30 flex gap-2">
                      <button
                        type="button"
                        onClick={() => galleryRef.current?.click()}
                        className="bg-rimba-950/80 hover:bg-rimba-950 inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur transition-colors"
                      >
                        <Icon name="image" size={16} /> Ganti
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          classifyActions.setFile(null)
                          setError(null)
                          setNotice(null)
                        }}
                        aria-label="Hapus foto"
                        className="bg-rimba-950/80 hover:bg-koral hover:text-rimba-950 grid size-10 place-items-center rounded-full text-white ring-1 ring-white/20 backdrop-blur transition-[background-color,transform] duration-300 hover:rotate-90"
                      >
                        <Icon name="x" size={18} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <EmptyArt dragging={dragging} />
                  <div className="relative flex flex-col items-center px-8 text-center">
                    <span
                      className={cn(
                        'relative grid size-20 place-items-center rounded-3xl transition-[transform,background-color] duration-300',
                        dragging
                          ? 'bg-daun text-rimba-950 scale-110'
                          : 'text-daun-terang bg-white/[0.07] ring-1 ring-white/10',
                      )}
                    >
                      <span
                        aria-hidden
                        className="ring-daun/40 absolute inset-0 animate-[denyut_2.6s_ease-in-out_infinite] rounded-3xl ring-1"
                      />
                      <Icon name={dragging ? 'arrowDown' : 'camera'} size={34} strokeWidth={1.8} />
                    </span>
                    <p className="font-display mt-5 text-xl font-semibold text-white">
                      {dragging ? (
                        'Lepaskan fotonya di sini'
                      ) : (
                        <>
                          <span className="pointer-coarse:hidden">Tarik foto ke sini</span>
                          <span className="hidden pointer-coarse:inline">Foto sampahnya dulu</span>
                        </>
                      )}
                    </p>
                    <p className="text-redup mt-2 max-w-xs text-sm leading-relaxed">
                      <span className="pointer-coarse:hidden">
                        Atau gunakan tombol di bawah. Kamu juga bisa menempel gambar dengan Ctrl+V.
                      </span>
                      <span className="hidden pointer-coarse:inline">
                        Ketuk Buka kamera untuk memotret, atau Pilih foto untuk mengambil dari
                        galeri.
                      </span>
                    </p>
                    <p className="text-redup mt-4 rounded-full bg-white/[0.05] px-3 py-1 text-xs ring-1 ring-white/10">
                      JPG, PNG, atau WebP hingga 15 MB
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="px-3 sm:px-7"
                onClick={openCamera}
                disabled={busy}
              >
                <Icon name="camera" size={19} /> Buka kamera
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="px-3 sm:px-7"
                onClick={() => galleryRef.current?.click()}
                disabled={busy}
              >
                <Icon name="image" size={19} /> Pilih foto
              </Button>
            </div>
            <Button
              ref={runRef}
              size="lg"
              className="mt-3 w-full"
              onClick={run}
              disabled={!file || busy || blocked || status === 'loading'}
              data-testid="run"
            >
              {busy ? (
                <>
                  <span className="border-rimba-950/30 border-t-rimba-950 size-5 animate-spin rounded-full border-2" />
                  Sedang mengenali…
                </>
              ) : status === 'loading' && file ? (
                'Menyiapkan…'
              ) : (
                <>
                  <Icon name="sparkle" size={19} /> Kenali jenisnya
                </>
              )}
            </Button>

            <div aria-live="assertive">
              {error && (
                <p
                  role="alert"
                  className="animate-goyang bg-koral/10 text-teks ring-koral/30 mt-3 flex items-start gap-2.5 rounded-2xl p-4 text-sm ring-1"
                >
                  <Icon name="alert" size={18} className="text-koral mt-0.5 shrink-0" />
                  {error}
                </p>
              )}
              {notice && !error && (
                <p className="text-redup mt-3 flex items-start gap-2.5 px-1 text-sm">
                  <Icon name="info" size={17} className="mt-0.5 shrink-0" />
                  {notice}
                </p>
              )}
            </div>

            <input
              ref={galleryRef}
              type="file"
              accept={ACCEPT}
              hidden
              data-testid="input-gallery"
              onChange={(e) => {
                pick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <input
              ref={nativeCamRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              data-testid="input-camera"
              onChange={(e) => {
                pick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>

          {/* Kanan: tips + contoh */}
          <aside className="flex flex-col gap-6">
            <div className="masuk kartu rounded-[2rem] p-6" style={delay(320)}>
              <h2 className="font-display text-lg font-semibold">Biar hasilnya akurat</h2>
              <ul className="mt-4 grid gap-2">
                {TIPS.map((t) => (
                  <li
                    key={t.title}
                    onPointerMove={trackSpotlight}
                    className="sorot group flex items-start gap-3.5 rounded-2xl p-3 transition-colors duration-300 hover:bg-white/[0.04]"
                  >
                    <span className="text-emas group-hover:bg-emas group-hover:text-rimba-950 grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] ring-1 ring-white/10 transition-[transform,background-color,color] duration-300 group-hover:-rotate-6">
                      <Icon name={t.icon} size={18} />
                    </span>
                    <span>
                      <span className="font-display block text-[0.95rem] font-semibold text-white">
                        {t.title}
                      </span>
                      <span className="text-redup mt-0.5 block text-sm leading-relaxed">
                        {t.text}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {samples.length > 0 ? (
              <div className="masuk kartu flex-1 rounded-[2rem] p-6" style={delay(420)}>
                <h2 className="font-display text-lg font-semibold">Belum punya foto?</h2>
                <p className="text-redup mt-1 text-sm">Coba pakai salah satu foto contoh ini.</p>
                <ul className="mt-4 grid grid-cols-3 gap-2.5">
                  {samples.map((s) => (
                    <li key={s.src}>
                      <button
                        type="button"
                        onClick={() => void pickSample(s)}
                        disabled={busy || !!loadingSample}
                        className="group hover:shadow-angkat hover:ring-emas/60 relative block aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-white/10 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5"
                        aria-label={`Pakai ${s.label}`}
                      >
                        <img
                          src={s.src}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <span className="from-rimba-950/70 absolute inset-0 bg-gradient-to-t to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <span className="absolute inset-x-0 bottom-1.5 text-center text-[11px] font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          Pakai
                        </span>
                        {loadingSample === s.src && (
                          <span className="bg-rimba-950/60 absolute inset-0 grid place-items-center">
                            <span className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="masuk kartu flex-1 rounded-[2rem] p-6" style={delay(420)}>
                <h2 className="font-display text-lg font-semibold">Yang bisa dikenali</h2>
                <p className="text-redup mt-1 text-sm">
                  Dua kelompok sampah rumah tangga sehari-hari.
                </p>
                {(['organik', 'anorganik'] as const).map((k) => (
                  <div key={k} className="mt-4">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        k === 'organik' ? 'text-daun-terang' : 'text-emas-terang',
                      )}
                    >
                      {k === 'organik' ? 'Organik' : 'Anorganik'}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {Object.values(ITEMS)
                        .filter((it) => it.kind === k)
                        .map((it) => (
                          <li key={it.id}>
                            <img
                              src={it.src}
                              alt={it.label}
                              title={it.label}
                              className="size-11 transition-transform duration-300 hover:-translate-y-1 hover:scale-110"
                            />
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>

        {history.length > 0 && (
          <Reveal className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Pindaian sesi ini</h2>
              <button
                type="button"
                onClick={() => classifyActions.clearHistory()}
                className="text-redup hover:bg-koral/10 hover:text-koral rounded-full px-3 py-1.5 text-sm transition-colors"
              >
                Hapus riwayat
              </button>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="history">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => void openHistory(h)}
                    className="kartu group flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-white/25"
                  >
                    {h.thumb ? (
                      <img src={h.thumb} alt="" className="size-14 rounded-xl object-cover" />
                    ) : (
                      <span className="size-14 rounded-xl bg-white/10" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">
                        {h.uncertain
                          ? 'Belum yakin'
                          : h.kind === 'organik'
                            ? 'Organik'
                            : 'Anorganik'}
                      </span>
                      <span className="text-redup block truncate text-xs">{h.name}</span>
                    </span>
                    <span
                      className={cn(
                        'angka shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                        h.uncertain
                          ? 'bg-white/10 text-white'
                          : h.kind === 'organik'
                            ? 'bg-daun/20 text-daun-terang'
                            : 'bg-emas/20 text-emas-terang',
                      )}
                    >
                      {pct(h.kind === 'anorganik' ? h.y : 1 - h.y)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </section>

      {camera && (
        <CameraModal onCapture={onCapture} onClose={onCameraClose} onFail={onCameraFail} />
      )}

      <ConfirmDialog
        open={leaveTo !== null}
        title="Tinggalkan halaman pindai?"
        media={
          previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="size-20 rounded-2xl object-cover ring-4 ring-white/10"
            />
          ) : undefined
        }
        confirmLabel="Ya, tinggalkan"
        cancelLabel="Lanjutkan pindai"
        onCancel={() => setLeaveTo(null)}
        onConfirm={() => {
          const to = leaveTo
          setLeaveTo(null)
          classifyActions.setFile(null)
          if (to) navigate(to, { force: true })
        }}
      >
        Foto yang kamu pilih belum dikenali. Kalau pindah halaman sekarang, foto ini akan dihapus
        dan perlu dipilih ulang nanti.
      </ConfirmDialog>
    </div>
  )
}
