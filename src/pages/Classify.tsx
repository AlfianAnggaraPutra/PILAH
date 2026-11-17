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
import { PhotoStrip } from '@/components/classify/PhotoStrip'
import { BgPhoto } from '@/components/ui/BgPhoto'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon, type IconName } from '@/components/ui/Icon'
import { MapCanvas } from '@/components/ui/MapCanvas'
import { PHOTOS } from '@/lib/content'
import { ITEMS } from '@/lib/items'
import { classifyImage, UserFacingError, type Classification } from '@/lib/ml/classify'
import { loadModel, modelStatus, retryModel } from '@/lib/ml/model'
import { prefersReducedMotion, trackSpotlight } from '@/lib/motion'
import { useBlocker, useNavigate } from '@/lib/router'
import { ACCEPT, FORMAT_TEXT, MAX_PHOTOS, screenFiles, type Rejected } from '@/lib/photos'
import { cn, sleep } from '@/lib/utils'
import {
  classifyActions,
  getClassifyState,
  useClassifyStore,
  type Photo,
} from '@/store/classifyStore'

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

/** Laporan setelah memilih foto: berkas yang ditolak (beserta alasannya) dan yang melebihi batas. */
interface UploadReport {
  title: string
  lines: string[]
  rejected: Rejected[]
  showFormats: boolean
}

function buildReport(
  added: number,
  rejected: Rejected[],
  overflow: number,
  full: boolean,
): UploadReport | null {
  if (full && rejected.length === 0) {
    return {
      title: `Batas ${MAX_PHOTOS} foto sudah tercapai`,
      lines: [
        'Foto baru tidak ditambahkan. Hapus salah satu foto terlebih dahulu jika ingin menggantinya dengan foto lain.',
      ],
      rejected: [],
      showFormats: false,
    }
  }
  if (rejected.length === 0 && overflow === 0) return null
  const lines: string[] = []
  let title: string
  if (rejected.length === 1) title = `Berkas "${rejected[0].name}" tidak dapat diunggah`
  else if (rejected.length > 1) title = `${rejected.length} berkas tidak dapat diunggah`
  else title = `Hanya ${added} foto yang ditambahkan`
  if (overflow > 0) {
    lines.push(
      full
        ? `Batas ${MAX_PHOTOS} foto sudah tercapai, jadi ${overflow} foto lainnya tidak ditambahkan.`
        : `Satu pindaian maksimal ${MAX_PHOTOS} foto, jadi ${overflow} foto lainnya tidak ditambahkan.`,
    )
  }
  if (rejected.length > 0 && added > 0) lines.push(`${added} foto lainnya berhasil ditambahkan.`)
  return {
    title,
    lines,
    rejected,
    showFormats: rejected.some((r) => /format|ukuran|rusak/.test(r.reason)),
  }
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Lapisan proses banyak foto: kemajuan foto demi foto. */
function BatchOverlay({ done, total }: { done: number; total: number }) {
  const current = Math.min(done + 1, total)
  return (
    <div className="from-rimba-950/95 via-rimba-950/50 to-rimba-950/10 absolute inset-0 z-10 flex flex-col items-center justify-end gap-3 bg-linear-to-t p-5 text-white sm:p-6">
      <div
        aria-hidden
        className="animate-pindai via-daun/50 pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-linear-to-b from-transparent to-transparent"
      />
      <p
        className="font-display text-lg font-semibold"
        aria-live="polite"
        data-testid="batch-progress"
      >
        Mengenali foto {current} dari {total}
      </p>
      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/15">
        <div
          className="bg-emas ease-keluar h-full rounded-full transition-[width] duration-300"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      <p className="text-mint-teks/80 text-xs">Semua foto diproses langsung di perangkatmu.</p>
    </div>
  )
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
        <div className="animate-pindai via-daun/60 absolute inset-x-0 top-0 h-1/4 bg-linear-to-b from-transparent to-transparent" />
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

/**
 * Ilustrasi bingkai kosong: beberapa sampah melayang di sekitarnya.
 * `topOnly`: hanya yang di atas, supaya baris foto contoh di bawah tidak tertutup.
 */
function EmptyArt({ dragging, topOnly }: { dragging: boolean; topOnly: boolean }) {
  const orbit: Array<[keyof typeof ITEMS, string, number]> = [
    ['banana', 'left-[8%] top-[14%]', -14],
    ['can', 'right-[9%] top-[12%]', 12],
    ['leaf', 'left-[14%] bottom-[16%]', 8],
    ['cup', 'right-[13%] bottom-[18%]', -10],
  ]
  return (
    <>
      {orbit.slice(0, topOnly ? 2 : 4).map(([id, pos, rot], i) => (
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
  const { photos, activeId } = useClassifyStore()
  const status = useModelStatus()
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<UploadReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [stage, setStage] = useState(0)
  const [pending, setPending] = useState<Classification | null>(null)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [camera, setCamera] = useState(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const [loadingSample, setLoadingSample] = useState<string | null>(null)
  const [leaveTo, setLeaveTo] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const galleryRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const nativeCamRef = useRef<HTMLInputElement>(null)
  /** Foto yang sedang diganti lewat galeri / kamera bawaan (null = menambah). */
  const replaceTarget = useRef<string | null>(null)
  const runRef = useRef<HTMLButtonElement>(null)
  const dragDepth = useRef(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const count = photos.length
  const active = photos.find((p) => p.id === activeId) ?? photos[0] ?? null
  const activeIndex = active ? photos.indexOf(active) : -1

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
      count > 0 || busy
        ? (to: string) => {
            setLeaveTo(to)
            return true
          }
        : null,
    [count, busy],
  )
  useBlocker(guard)

  // Muat ulang / tutup tab: browser menampilkan peringatan bawaannya.
  useEffect(() => {
    if (count === 0) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [count])

  /**
   * Terima berkas dari galeri, kamera, seret-lepas, tempel, atau foto contoh.
   * `replace`: id foto yang diganti; null berarti menambah ke daftar.
   */
  const addFiles = useCallback(async (files: File[], replace: string | null = null) => {
    if (files.length === 0) return
    setError(null)
    const current = getClassifyState().photos
    const others = replace ? current.filter((p) => p.id !== replace) : current
    setAdding(true)
    try {
      const { accepted, rejected, overflow, full } = await screenFiles(
        replace ? files.slice(0, 1) : files,
        others.map((p) => p.file),
      )
      if (replace && accepted[0]) classifyActions.replacePhoto(replace, accepted[0])
      else classifyActions.addPhotos(accepted)
      setReport(buildReport(accepted.length, rejected, overflow, full))
      if (accepted.length)
        requestAnimationFrame(() => runRef.current?.focus({ preventScroll: true }))
    } finally {
      setAdding(false)
    }
  }, [])

  // Tempel foto dari clipboard (Ctrl+V / Cmd+V).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (busy) return
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((i) => i.kind === 'file')
        .map((i) => i.getAsFile())
        .filter((f): f is File => !!f)
      if (files.length === 0) return
      e.preventDefault()
      void addFiles(
        files.map((f, i) =>
          f.name ? f : new File([f], `tempel-${Date.now()}-${i + 1}.png`, { type: f.type }),
        ),
      )
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles, busy])

  // Seret-lepas di mana saja di halaman ini (boleh banyak berkas sekaligus).
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e) || busy) return
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
      if (busy) return
      void addFiles(Array.from(e.dataTransfer?.files ?? []))
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
  }, [addFiles, busy])

  // replaceTarget sudah diisi saat kamera dibuka, jadi kamera bawaan (fallback) tahu foto mana yang diganti.
  const onCameraFail = useCallback((reason: CameraFailure) => {
    setCamera(false)
    if (reason === 'unsupported' || reason === 'other') {
      nativeCamRef.current?.click()
      return
    }
    setError(cameraMessage(reason))
  }, [])
  const onCameraClose = useCallback(() => {
    replaceTarget.current = null
    setCamera(false)
  }, [])
  const onCapture = useCallback(
    (f: File) => {
      const target = replaceTarget.current
      replaceTarget.current = null
      setCamera(false)
      void addFiles([f], target)
    },
    [addFiles],
  )

  function openCamera(replace: string | null = null) {
    setError(null)
    if (!replace && getClassifyState().photos.length >= MAX_PHOTOS) {
      setReport(buildReport(0, [], 0, true))
      return
    }
    replaceTarget.current = replace
    if (cameraSupported()) setCamera(true)
    else nativeCamRef.current?.click()
  }

  function openGallery() {
    setError(null)
    if (getClassifyState().photos.length >= MAX_PHOTOS) {
      setReport(buildReport(0, [], 0, true))
      return
    }
    galleryRef.current?.click()
  }

  function openReplace(id: string) {
    setError(null)
    replaceTarget.current = id
    replaceRef.current?.click()
  }

  function removePhoto(id: string) {
    classifyActions.removePhoto(id)
    setError(null)
    if (getClassifyState().photos.length < MAX_PHOTOS)
      setReport((r) => (r?.title.startsWith('Batas') ? null : r))
  }

  async function pickSample(s: Sample) {
    setLoadingSample(s.src)
    try {
      const res = await fetch(s.src)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const name = s.src.split('/').pop() || 'contoh.jpg'
      await addFiles([new File([blob], name, { type: blob.type || 'image/jpeg' })])
    } catch {
      setError('Foto contoh gagal dimuat. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoadingSample(null)
    }
  }

  async function runSingle(photo: Photo) {
    setStage(0)
    setPending(null)
    const pace = prefersReducedMotion() ? 60 : 340
    const res = await classifyImage(photo.file)
    setPending(res)
    // Perhitungannya sendiri hanya puluhan milidetik; tahapan ditampilkan sebentar agar bisa diikuti.
    for (let s = 1; s < STAGES.length; s++) {
      await sleep(pace)
      if (!alive.current) return
      setStage(s)
    }
    await sleep(pace + 120)
    // Pengguna sudah meninggalkan halaman lewat dialog konfirmasi: jangan paksa pindah ke hasil.
    if (!alive.current) return
    await classifyActions.commitResults([{ photo, result: res }])
    navigate('/hasil', { force: true })
  }

  async function runBatch(list: Photo[]) {
    const pace = prefersReducedMotion() ? 0 : 160
    const ok: { photo: Photo; result: Classification }[] = []
    const failed: string[] = []
    setProgress(0)
    for (let i = 0; i < list.length; i++) {
      if (!alive.current) return
      classifyActions.setActive(list[i].id)
      try {
        ok.push({ photo: list[i], result: await classifyImage(list[i].file) })
      } catch (e) {
        // Kesalahan model (mis. gagal dimuat) menghentikan semuanya; kesalahan foto cukup dilewati.
        if (e instanceof Error && e.name === 'ModelUnavailableError') throw e
        failed.push(list[i].file.name)
      }
      setProgress(i + 1)
      await sleep(pace)
    }
    if (!alive.current) return
    if (ok.length === 0)
      throw new UserFacingError('Tidak ada foto yang bisa dikenali. Coba pilih foto lain.')
    await sleep(prefersReducedMotion() ? 0 : 250)
    if (!alive.current) return
    await classifyActions.commitResults(ok, failed)
    navigate('/hasil', { force: true })
  }

  async function run() {
    const list = getClassifyState().photos
    if (list.length === 0 || busy || adding) return
    setBusy(true)
    setError(null)
    setReport(null)
    try {
      if (list.length === 1) await runSingle(list[0])
      else await runBatch(list)
    } catch (e) {
      if (!alive.current) return
      setError(
        e instanceof UserFacingError || (e instanceof Error && e.name === 'ModelUnavailableError')
          ? e.message
          : 'Terjadi kesalahan saat memproses foto. Coba lagi atau pakai foto lain.',
      )
      setBusy(false)
    }
  }

  const blocked = status === 'error'
  const step = busy ? 2 : count > 0 ? 1 : 0
  const many = count > 1

  return (
    <div className="relative isolate overflow-hidden">
      <BgPhoto
        id={PHOTOS.pindai.id}
        className="-z-10 h-136 mask-[linear-gradient(to_bottom,black,transparent)] opacity-25"
      />
      <div
        aria-hidden
        className="pola-titik absolute inset-x-0 top-0 -z-10 h-136 mask-[linear-gradient(to_bottom,black,transparent)] opacity-50"
      />
      <div
        aria-hidden
        className="bg-daun/10 pointer-events-none absolute top-20 right-[-10%] -z-10 size-128 rounded-full blur-3xl"
      />

      <section className="mx-auto max-w-6xl px-5 pt-24 pb-16 sm:px-6 md:pt-28 md:pb-20">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <h1
              className="masuk-blur text-4xl font-bold tracking-tight sm:text-5xl"
              style={delay(0)}
            >
              Pindai sampahmu
            </h1>
            <p className="masuk text-mint-teks/85 mt-3 text-lg leading-relaxed" style={delay(120)}>
              Ambil foto atau pilih dari galeri, satu atau sekaligus hingga {MAX_PHOTOS} foto. PILAH
              memberi tahu jenis sampahnya beserta cara membuangnya.
            </p>
          </div>
          <ol
            className="masuk flex items-center justify-between gap-1.5 text-[0.82rem] whitespace-nowrap sm:justify-start sm:gap-2 sm:text-sm"
            style={delay(220)}
            aria-label="Tahapan"
          >
            {['Pilih foto', 'Kenali', 'Lihat hasil'].map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-1.5 font-medium transition-colors duration-500 sm:gap-2 sm:pr-3.5',
                    i === step
                      ? 'bg-emas text-rimba-950'
                      : i < step
                        ? 'bg-daun/20 text-daun-terang'
                        : 'text-redup bg-white/5 ring-1 ring-white/10',
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
                {i < 2 && (
                  <span aria-hidden className="hidden h-px w-4 bg-white/15 min-[25rem]:block" />
                )}
              </li>
            ))}
          </ol>
        </div>

        {status === 'demo' && (
          <p
            role="status"
            className="masuk bg-krem/80 text-emas-terang ring-emas/30 mt-6 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ring-1"
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
            className="masuk bg-koral/10 ring-koral/30 mt-6 flex flex-col gap-3 rounded-2xl p-4 text-sm ring-1 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-teks flex items-start gap-3">
              <Icon name="wifiOff" size={18} className="text-koral mt-0.5 shrink-0" />
              {modelStatus.message() ||
                'Model gagal dimuat. Periksa koneksi internet lalu coba lagi.'}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => retryModel().catch(() => undefined)}
            >
              <Icon name="refresh" size={16} /> Muat ulang model
            </Button>
          </div>
        )}

        {/* Pemberitahuan di atas kotak, supaya tinggi kotak unggah dan kotak tips tetap sama. */}
        <div aria-live="assertive">
          {error && (
            <p
              role="alert"
              className="animate-goyang bg-koral/10 text-teks ring-koral/30 mt-6 flex items-start gap-2.5 rounded-2xl p-4 text-sm ring-1"
            >
              <Icon name="alert" size={18} className="text-koral mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          {report && !error && (
            <div
              role="alert"
              data-testid="upload-report"
              className="animate-goyang bg-krem/70 ring-emas/35 mt-6 flex items-start gap-3 rounded-2xl p-4 text-sm ring-1"
            >
              <Icon name="alert" size={18} className="text-emas mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-emas-terang font-semibold wrap-break-word">{report.title}</p>
                {report.rejected.length === 1 && (
                  <p className="text-teks mt-1">{capital(report.rejected[0].reason)}.</p>
                )}
                {report.rejected.length > 1 && (
                  <ul className="text-teks mt-1.5 space-y-1">
                    {report.rejected.map((r, i) => (
                      <li key={`${r.name}-${i}`} className="flex gap-2">
                        <span aria-hidden className="bg-emas mt-2 size-1 shrink-0 rounded-full" />
                        <span className="min-w-0 wrap-break-word">
                          <strong className="font-semibold">{r.name}</strong>: {r.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {report.lines.map((l) => (
                  <p key={l} className="text-teks mt-1">
                    {l}
                  </p>
                ))}
                {report.showFormats && (
                  <p className="text-redup mt-2 text-xs">
                    Format yang diterima: {FORMAT_TEXT}, maksimal 15 MB per foto dan {MAX_PHOTOS}{' '}
                    foto per pindaian.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReport(null)}
                aria-label="Tutup pemberitahuan"
                className="text-redup -m-1 grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.45fr_1fr] lg:gap-7">
          {/* Kiri: bingkai foto + deretan pratinjau + tombol */}
          <div
            className="masuk-skala kartu flex min-w-0 flex-col rounded-4xl p-3 sm:p-4"
            style={delay(200)}
          >
            <div
              data-testid="viewfinder"
              className={cn(
                'relative grid min-h-72 place-items-center overflow-hidden rounded-3xl py-6 transition-[background-color,box-shadow] duration-300 sm:aspect-4/3 sm:min-h-0 lg:aspect-auto lg:flex-1',
                active ? 'lg:min-h-60' : 'lg:min-h-80',
                active
                  ? dragging
                    ? 'bg-rimba-950 ring-daun ring-2'
                    : 'bg-rimba-950'
                  : dragging
                    ? 'bg-daun/15 ring-daun ring-2'
                    : 'bg-rimba-950/60 bg-[radial-gradient(70%_70%_at_50%_45%,rgb(63_191_119/0.12),transparent_70%)] ring-1 ring-white/6',
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
                    'pointer-events-none absolute z-20 size-10 transition-[border-color,opacity] duration-300',
                    active ? 'opacity-0' : dragging ? 'border-daun' : 'border-white/25',
                    c,
                  )}
                />
              ))}

              {active ? (
                <>
                  {/* Foto ditampilkan utuh (tidak dipotong); sisa ruang diisi versi buram dari foto yang sama. */}
                  <img
                    key={`bg-${active.id}`}
                    src={active.url}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-2xl"
                  />
                  <img
                    key={active.id}
                    src={active.url}
                    alt="Foto yang akan dipindai"
                    className="halaman-masuk absolute inset-0 size-full object-contain p-3 drop-shadow-[0_12px_30px_rgb(0_0_0/0.45)] sm:p-4"
                  />
                  {busy &&
                    (many ? (
                      <BatchOverlay done={progress} total={count} />
                    ) : (
                      <ProcessingOverlay result={pending} stage={stage} />
                    ))}
                  {!busy && (
                    <>
                      {many && (
                        <p
                          className="bg-rimba-950/80 absolute top-4 left-4 z-30 max-w-[45%] truncate rounded-full px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur"
                          title={active.file.name}
                        >
                          <span className="angka">
                            {activeIndex + 1} / {count}
                          </span>
                          <span className="text-mint-teks/80 hidden font-normal sm:inline">
                            {' '}
                            · {active.file.name}
                          </span>
                        </p>
                      )}
                      <div className="absolute top-4 right-4 z-30 flex gap-2">
                        <button
                          type="button"
                          onClick={() => openCamera(active.id)}
                          aria-label="Foto ulang"
                          title="Foto ulang dengan kamera"
                          className="bg-rimba-950/80 hover:bg-rimba-950 inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur transition-colors sm:px-4"
                        >
                          <Icon name="camera" size={16} />{' '}
                          <span className="max-sm:hidden">Foto ulang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openReplace(active.id)}
                          aria-label="Ganti foto ini"
                          title="Ganti dengan foto dari galeri"
                          className="bg-rimba-950/80 hover:bg-rimba-950 inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur transition-colors sm:px-4"
                        >
                          <Icon name="image" size={16} />{' '}
                          <span className="max-sm:hidden">Ganti</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(active.id)}
                          aria-label="Hapus foto ini"
                          title="Hapus foto ini"
                          className="grid size-10 place-items-center rounded-full bg-red-500/90 text-white ring-1 ring-white/20 backdrop-blur transition-[background-color,transform] duration-300 hover:rotate-90 hover:bg-red-600"
                        >
                          <Icon name="x" size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                      {many && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              classifyActions.setActive(
                                photos[(activeIndex - 1 + count) % count].id,
                              )
                            }
                            aria-label="Foto sebelumnya"
                            className="bg-rimba-950/70 hover:bg-rimba-950 absolute top-1/2 left-3 z-30 grid size-10 -translate-y-1/2 place-items-center rounded-full text-white ring-1 ring-white/20 backdrop-blur transition-colors"
                          >
                            <Icon name="arrowLeft" size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              classifyActions.setActive(photos[(activeIndex + 1) % count].id)
                            }
                            aria-label="Foto berikutnya"
                            className="bg-rimba-950/70 hover:bg-rimba-950 absolute top-1/2 right-3 z-30 grid size-10 -translate-y-1/2 place-items-center rounded-full text-white ring-1 ring-white/20 backdrop-blur transition-colors"
                          >
                            <Icon name="arrowRight" size={18} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <EmptyArt dragging={dragging} topOnly={samples.length > 0} />
                  <div className="relative flex flex-col items-center px-8 text-center">
                    <span
                      className={cn(
                        'relative grid size-16 place-items-center rounded-3xl transition-[transform,background-color] duration-300 sm:size-20',
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
                    <p className="font-display mt-4 text-xl font-semibold text-white sm:mt-5">
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
                        Satu atau beberapa foto sekaligus. Kamu juga bisa menempel gambar dengan
                        Ctrl+V.
                      </span>
                      <span className="hidden pointer-coarse:inline">
                        Ketuk tombol kamera untuk memotret, atau pilih satu atau beberapa foto dari
                        galeri.
                      </span>
                    </p>
                    {samples.length > 0 && !dragging && (
                      <div className="mt-5" data-testid="samples">
                        <p className="text-mint-teks/70 text-xs font-semibold">
                          Belum punya foto? Coba salah satu contoh:
                        </p>
                        <ul className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:gap-2">
                          {samples.map((s) => (
                            <li key={s.src}>
                              <button
                                type="button"
                                onClick={() => void pickSample(s)}
                                disabled={busy || !!loadingSample}
                                className="group hover:ring-emas relative block size-11 overflow-hidden rounded-xl ring-1 ring-white/15 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:ring-2 sm:size-14"
                                aria-label={`Pakai ${s.label}`}
                                title={s.label}
                              >
                                <img
                                  src={s.src}
                                  alt=""
                                  loading="lazy"
                                  className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                {loadingSample === s.src && (
                                  <span className="bg-rimba-950/60 absolute inset-0 grid place-items-center">
                                    <span className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
              {adding && (
                <span className="bg-rimba-950/85 absolute inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm text-white ring-1 ring-white/15">
                  <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />{' '}
                  Memeriksa foto…
                </span>
              )}
            </div>

            {count > 0 && (
              <PhotoStrip
                photos={photos}
                activeId={active?.id ?? null}
                max={MAX_PHOTOS}
                disabled={busy}
                onSelect={(id) => classifyActions.setActive(id)}
                onRemove={removePhoto}
                onAdd={openGallery}
                onClearAll={() => setConfirmClear(true)}
              />
            )}

            <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-[1fr_1fr_1.3fr]">
              <Button
                variant="secondary"
                size="lg"
                className="px-2 max-[22rem]:gap-1.5 max-[22rem]:text-[0.9rem] sm:px-6 xl:px-3"
                onClick={() => openCamera()}
                disabled={busy}
                aria-label="Buka kamera"
              >
                <Icon name="camera" size={19} className="shrink-0" />
                <span className="sm:hidden">Kamera</span>
                <span className="max-sm:hidden">Buka kamera</span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="px-2 max-[22rem]:gap-1.5 max-[22rem]:text-[0.9rem] sm:px-6 xl:px-3"
                onClick={openGallery}
                disabled={busy}
                aria-label="Pilih foto"
              >
                <Icon name="image" size={19} className="shrink-0" />
                <span className="sm:hidden">Galeri</span>
                <span className="max-sm:hidden">Pilih foto</span>
              </Button>
              <Button
                ref={runRef}
                size="lg"
                className="col-span-2 xl:col-span-1 xl:px-4"
                onClick={run}
                disabled={count === 0 || busy || blocked || adding}
                data-testid="run"
              >
                {busy ? (
                  <>
                    <span className="border-rimba-950/30 border-t-rimba-950 size-5 animate-spin rounded-full border-2" />
                    {many ? `Mengenali ${Math.min(progress + 1, count)}/${count}…` : 'Mengenali…'}
                  </>
                ) : (
                  <>
                    <Icon name="sparkle" size={19} />{' '}
                    {many ? `Kenali ${count} foto` : 'Kenali jenisnya'}
                  </>
                )}
              </Button>
            </div>

            <input
              ref={galleryRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              data-testid="input-gallery"
              onChange={(e) => {
                void addFiles(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
            <input
              ref={replaceRef}
              type="file"
              accept={ACCEPT}
              hidden
              data-testid="input-replace"
              onChange={(e) => {
                const target = replaceTarget.current
                replaceTarget.current = null
                void addFiles(Array.from(e.target.files ?? []), target)
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
                const target = replaceTarget.current
                replaceTarget.current = null
                void addFiles(Array.from(e.target.files ?? []), target)
                e.target.value = ''
              }}
            />
          </div>

          {/* Kanan: tips. Kotak unggah di kiri dan kotak ini selalu sama tinggi. */}
          <aside className="masuk kartu flex flex-col rounded-4xl p-6 sm:p-7" style={delay(320)}>
            <h2 className="font-display text-lg font-semibold">Biar hasilnya akurat</h2>
            <ul className="mt-3 flex flex-1 flex-col justify-between gap-1">
              {TIPS.map((t) => (
                <li
                  key={t.title}
                  onPointerMove={trackSpotlight}
                  className="sorot group flex items-start gap-3.5 rounded-2xl px-3 py-2.5 transition-colors duration-300 hover:bg-white/4"
                >
                  <span className="text-emas group-hover:bg-emas group-hover:text-rimba-950 grid size-10 shrink-0 place-items-center rounded-xl bg-white/6 ring-1 ring-white/10 transition-[transform,background-color,color] duration-300 group-hover:-rotate-6">
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
          </aside>
        </div>
      </section>

      {camera && (
        <CameraModal onCapture={onCapture} onClose={onCameraClose} onFail={onCameraFail} />
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Hapus semua foto?"
        media={<PhotoStack photos={photos} />}
        confirmLabel="Ya, hapus semua"
        cancelLabel="Batal"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false)
          classifyActions.clearPhotos()
          setReport(null)
          setError(null)
        }}
      >
        {count} foto yang sudah kamu pilih akan dihapus dari daftar. Kamu bisa memilih foto lain
        setelahnya.
      </ConfirmDialog>

      <ConfirmDialog
        open={leaveTo !== null}
        title={busy ? 'Pindaian sedang berjalan' : 'Tinggalkan halaman pindai?'}
        media={count > 0 ? <PhotoStack photos={photos} /> : undefined}
        confirmLabel={
          busy ? 'Hentikan & pindah' : many ? 'Hapus semua & pindah' : 'Hapus foto & pindah'
        }
        cancelLabel={busy ? 'Tunggu hasilnya' : 'Tetap di sini'}
        onCancel={() => setLeaveTo(null)}
        onConfirm={() => {
          const to = leaveTo
          setLeaveTo(null)
          classifyActions.reset()
          if (to) navigate(to, { force: true })
        }}
      >
        {busy
          ? `PILAH sedang mengenali ${many ? `${count} fotomu` : 'fotomu'} dan hasilnya tinggal beberapa detik lagi. Jika pindah sekarang, pindaian dihentikan dan ${many ? 'semua foto' : 'fotonya'} ikut dihapus.`
          : many
            ? `${count} foto yang sudah kamu pilih belum dikenali. Jika pindah halaman sekarang, semua foto ini akan dihapus dan perlu dipilih lagi dari awal.`
            : 'Fotomu sudah siap, tapi belum dikenali. Jika pindah halaman sekarang, foto ini akan dihapus dan kamu perlu memilihnya lagi dari awal.'}
      </ConfirmDialog>
    </div>
  )
}

/** Tumpukan kecil foto untuk dialog (maksimal tiga, sisanya ditulis sebagai angka). */
function PhotoStack({ photos }: { photos: Photo[] }) {
  const shown = photos.slice(0, 3)
  return (
    <span className="relative flex items-center">
      {shown.map((p, i) => (
        <img
          key={p.id}
          src={p.url}
          alt=""
          className={cn('ring-panel size-18 rounded-2xl object-cover ring-4', i > 0 && '-ml-7')}
          style={{ transform: `rotate(${(i - (shown.length - 1) / 2) * 7}deg)`, zIndex: 3 - i }}
        />
      ))}
      {photos.length > 3 && (
        <span className="bg-emas font-display text-rimba-950 ring-panel absolute -right-3 -bottom-2 z-10 rounded-full px-2 py-0.5 text-xs font-bold ring-2">
          +{photos.length - 3}
        </span>
      )}
    </span>
  )
}
