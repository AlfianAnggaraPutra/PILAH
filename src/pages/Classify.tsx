import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  CameraModal,
  cameraMessage,
  cameraSupported,
  type CameraFailure,
} from '@/components/classify/CameraModal'
import { Button } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { MapCanvas } from '@/components/ui/MapCanvas'
import { classifyImage, classifyInput, UserFacingError, type Classification } from '@/lib/ml/classify'
import { loadModel, modelStatus, retryModel } from '@/lib/ml/model'
import { prefersReducedMotion } from '@/lib/motion'
import { useNavigate } from '@/lib/router'
import { cn, pct, sleep } from '@/lib/utils'
import {
  classifyActions,
  decodeGray,
  useClassifyStore,
  type HistoryItem,
} from '@/store/classifyStore'

const MAX_BYTES = 15 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif'

const STAGES = [
  'Mengecilkan foto ke 64 × 64',
  'Mengubah ke grayscale',
  'Konvolusi dengan 8 kernel',
  'Max pooling 2 × 2',
  'Menghitung peluang',
] as const

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'square', text: 'Satu benda per foto, usahakan memenuhi bingkai.' },
  { icon: 'sun', text: 'Cahaya cukup dan tidak silau.' },
  { icon: 'layers', text: 'Latar polos membantu model fokus ke bendanya.' },
  { icon: 'focus', text: 'Pastikan foto tajam, tidak goyang.' },
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

/** Lapisan proses: menampilkan hasil antara yang sungguhan selama model "berpikir". */
function ProcessingOverlay({ result, stage }: { result: Classification | null; stage: number }) {
  const t = result?.trace
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-rimba-950/80 p-6 text-white backdrop-blur-[2px]">
      <div className="relative size-36 overflow-hidden rounded-2xl ring-2 ring-emas/80 sm:size-44">
        {t && stage >= 1 && (
          <MapCanvas
            key={stage >= 3 ? `p${stage}` : 'g'}
            data={stage >= 3 ? t.P[stage % t.P.length] : stage === 2 ? t.R[0] : t.gray}
            side={stage >= 3 ? t.size / 2 : t.size}
            mapStyle={stage >= 2 ? 'heat' : 'gray'}
            label="Hasil antara pemrosesan"
            className="size-full halaman-masuk"
          />
        )}
        <div className="absolute inset-x-0 top-0 h-1/4 animate-pindai bg-gradient-to-b from-transparent via-daun/60 to-transparent" />
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
                i < stage ? 'bg-daun text-rimba-900' : i === stage ? 'bg-emas text-rimba-900' : 'bg-white/15',
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
  const galleryRef = useRef<HTMLInputElement>(null)
  const nativeCamRef = useRef<HTMLInputElement>(null)
  const runRef = useRef<HTMLButtonElement>(null)
  const dragDepth = useRef(0)

  useEffect(() => {
    loadModel().catch(() => undefined)
    fetch('/samples/manifest.json')
      .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : []))
      .then((j: unknown) => Array.isArray(j) && setSamples(j as Sample[]))
      .catch(() => undefined)
  }, [])

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
      pick(files[0], files.length > 1 ? `${files.length} berkas dilepas, yang dipakai hanya yang pertama.` : undefined)
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
    const reduced = prefersReducedMotion()
    const pace = reduced ? 60 : 340
    try {
      const res = await classifyImage(file)
      setPending(res)
      // Komputasi aslinya hanya puluhan milidetik; tahapan ditampilkan sebentar agar bisa diikuti.
      for (let s = 1; s < STAGES.length; s++) {
        await sleep(pace)
        setStage(s)
      }
      await sleep(pace + 120)
      await classifyActions.commitResult(res)
      navigate('/hasil')
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
      navigate('/hasil')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Riwayat ini tidak bisa dibuka.')
    }
  }

  const blocked = status === 'missing' || status === 'error'

  return (
    <section className="mx-auto max-w-6xl px-5 pt-28 pb-24 sm:px-6 md:pt-32">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Pindai sampah</h1>
        <p className="mt-3 text-lg text-redup">
          Pakai satu foto untuk satu benda. Hasil paling bagus kalau bendanya terlihat jelas dan
          cahayanya cukup.
        </p>
      </div>

      {status === 'demo' && (
        <p
          role="status"
          className="mt-6 flex items-start gap-3 rounded-2xl bg-krem p-4 text-sm ring-1 ring-emas/50"
        >
          <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-emas-tua" />
          <span>
            <strong>Mode demo.</strong> Berkas <code className="rounded bg-white/70 px-1">model.bin</code>{' '}
            belum dipasang, jadi hasil memakai bobot acak dan bukan prediksi sungguhan.
          </span>
        </p>
      )}
      {blocked && (
        <div
          role="alert"
          className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-koral/40 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-3 text-teks">
            <Icon name={status === 'error' ? 'wifiOff' : 'alert'} size={18} className="mt-0.5 shrink-0 text-koral" />
            {status === 'missing'
              ? 'Model belum terpasang di server ini, jadi pindaian belum bisa dijalankan.'
              : modelStatus.message() || 'Model gagal dimuat. Periksa koneksi internet lalu coba lagi.'}
          </p>
          {status === 'error' && (
            <Button size="sm" variant="secondary" onClick={() => retryModel().catch(() => undefined)}>
              <Icon name="refresh" size={16} /> Muat ulang model
            </Button>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
        {/* Kiri: bingkai foto */}
        <div>
          <div
            data-testid="viewfinder"
            className={cn(
              'relative grid aspect-[4/3.4] place-items-center overflow-hidden rounded-[2rem] transition-[background-color,box-shadow] duration-300 sm:aspect-[4/3]',
              previewUrl
                ? 'bg-rimba-950'
                : dragging
                  ? 'bg-mint ring-4 ring-daun'
                  : 'bg-white ring-1 ring-garis',
            )}
          >
            {/* sudut bingkai bidik */}
            {['top-5 left-5 border-t-[3px] border-l-[3px] rounded-tl-2xl', 'top-5 right-5 border-t-[3px] border-r-[3px] rounded-tr-2xl', 'bottom-5 left-5 border-b-[3px] border-l-[3px] rounded-bl-2xl', 'bottom-5 right-5 border-b-[3px] border-r-[3px] rounded-br-2xl'].map((c) => (
              <span
                key={c}
                aria-hidden
                className={cn(
                  'pointer-events-none absolute z-20 size-10 transition-colors duration-300',
                  previewUrl ? 'border-emas' : dragging ? 'border-daun-tua' : 'border-rimba-900/25',
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
                      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/90 px-4 text-sm font-semibold text-teks shadow-lembut transition-colors hover:bg-white"
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
                      className="grid size-10 place-items-center rounded-full bg-white/90 text-teks shadow-lembut transition-[background-color,transform] hover:rotate-90 hover:bg-white"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center px-8 text-center">
                <span
                  className={cn(
                    'grid size-20 place-items-center rounded-3xl transition-[transform,background-color] duration-300',
                    dragging ? 'scale-110 bg-daun text-rimba-900' : 'bg-mint text-daun-tua',
                  )}
                >
                  <Icon name={dragging ? 'arrowDown' : 'upload'} size={34} strokeWidth={1.8} />
                </span>
                <p className="mt-5 font-display text-xl font-semibold">
                  {dragging ? (
                    'Lepaskan fotonya'
                  ) : (
                    <>
                      <span className="pointer-coarse:hidden">Tarik foto ke sini</span>
                      <span className="hidden pointer-coarse:inline">Foto sampahnya dulu</span>
                    </>
                  )}
                </p>
                <p className="mt-1.5 max-w-xs text-sm text-redup">
                  <span className="pointer-coarse:hidden">
                    atau buka kamera dan galeri dengan tombol di bawah. Bisa juga tempel gambar dengan
                    Ctrl+V.
                  </span>
                  <span className="hidden pointer-coarse:inline">
                    Ketuk Buka kamera untuk memotret, atau Pilih foto untuk mengambil dari galeri.
                  </span>
                </p>
                <p className="mt-4 text-xs text-redup/80">JPG, PNG, atau WebP, maksimal 15 MB</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" className="px-3 sm:px-7" onClick={openCamera} disabled={busy}>
              <Icon name="camera" size={19} /> Buka kamera
            </Button>
            <Button variant="secondary" size="lg" className="px-3 sm:px-7" onClick={() => galleryRef.current?.click()} disabled={busy}>
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
                <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Memproses…
              </>
            ) : status === 'loading' && file ? (
              'Menyiapkan model…'
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
                className="mt-4 flex animate-goyang items-start gap-2.5 rounded-2xl bg-koral/8 p-4 text-sm text-teks ring-1 ring-koral/30"
              >
                <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-koral" />
                {error}
              </p>
            )}
            {notice && !error && (
              <p className="mt-4 flex items-start gap-2.5 text-sm text-redup">
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

        {/* Kanan: tips, contoh, riwayat */}
        <aside className="space-y-6">
          <div className="rounded-[1.75rem] bg-rimba-900 p-6 text-white">
            <h2 className="font-display text-lg font-semibold">Biar hasilnya akurat</h2>
            <ul className="mt-4 space-y-3.5">
              {TIPS.map((t) => (
                <li key={t.text} className="flex items-start gap-3 text-[0.95rem] text-mint/80">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/10 text-emas">
                    <Icon name={t.icon} size={17} />
                  </span>
                  <span className="pt-1">{t.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {samples.length > 0 && (
            <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-garis">
              <h2 className="font-display text-lg font-semibold">Belum ada foto?</h2>
              <p className="mt-1 text-sm text-redup">Coba pakai contoh dari data uji penelitian.</p>
              <ul className="mt-4 grid grid-cols-3 gap-2.5">
                {samples.map((s) => (
                  <li key={s.src}>
                    <button
                      type="button"
                      onClick={() => void pickSample(s)}
                      disabled={busy || !!loadingSample}
                      className="group relative block aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-garis transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-angkat"
                      aria-label={`Pakai ${s.label}`}
                    >
                      <img
                        src={s.src}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {loadingSample === s.src && (
                        <span className="absolute inset-0 grid place-items-center bg-white/60">
                          <span className="size-6 animate-spin rounded-full border-2 border-rimba-900/20 border-t-rimba-900" />
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {history.length > 0 && (
            <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-garis">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Pindaian sesi ini</h2>
                <button
                  type="button"
                  onClick={() => classifyActions.clearHistory()}
                  className="rounded-full px-2 py-1 text-sm text-redup transition-colors hover:text-koral"
                >
                  Hapus
                </button>
              </div>
              <ul className="mt-4 space-y-2" data-testid="history">
                {history.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => void openHistory(h)}
                      className="flex w-full items-center gap-3 rounded-2xl p-1.5 text-left transition-colors hover:bg-mint/70"
                    >
                      {h.thumb ? (
                        <img src={h.thumb} alt="" className="size-12 rounded-xl object-cover" />
                      ) : (
                        <span className="size-12 rounded-xl bg-mint" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {h.uncertain ? 'Belum yakin' : h.kind === 'organik' ? 'Organik' : 'Anorganik'}
                        </span>
                        <span className="block truncate text-xs text-redup">{h.name}</span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold angka',
                          h.uncertain ? 'bg-garis/60' : h.kind === 'organik' ? 'bg-mint text-daun-tua' : 'bg-krem text-emas-tua',
                        )}
                      >
                        {pct(h.kind === 'anorganik' ? h.y : 1 - h.y)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {camera && <CameraModal onCapture={onCapture} onClose={onCameraClose} onFail={onCameraFail} />}
    </section>
  )
}
