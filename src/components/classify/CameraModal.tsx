import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

export type CameraFailure = 'denied' | 'notfound' | 'unsupported' | 'busy' | 'other'

const MESSAGES: Record<CameraFailure, string> = {
  denied:
    'Akses kamera ditolak. Izinkan kamera lewat ikon gembok di bilah alamat, atau pilih foto dari galeri.',
  notfound: 'Kamera tidak ditemukan di perangkat ini. Pilih foto dari galeri saja.',
  unsupported: 'Browser ini belum mendukung kamera langsung.',
  busy: 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.',
  other: 'Kamera tidak bisa dibuka. Coba lagi atau pilih foto dari galeri.',
}
export const cameraMessage = (f: CameraFailure) => MESSAGES[f]

function classify(err: unknown): CameraFailure {
  const name = (err as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'notfound'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'other'
}

export const cameraSupported = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  window.isSecureContext

/** Matikan kamera (lampu indikator kamera ikut padam). */
function stopStream(ref: { current: MediaStream | null }) {
  ref.current?.getTracks().forEach((t) => t.stop())
  ref.current = null
}

/** Sisi terpanjang foto hasil jepretan. Cukup tajam untuk pratinjau, tetap ringan diproses. */
const MAX_SIDE = 1280

const CORNERS = [
  '-top-px -left-px border-t-[3px] border-l-[3px] rounded-tl-2xl',
  '-top-px -right-px border-t-[3px] border-r-[3px] rounded-tr-2xl',
  '-bottom-px -left-px border-b-[3px] border-l-[3px] rounded-bl-2xl',
  '-bottom-px -right-px border-b-[3px] border-r-[3px] rounded-br-2xl',
]

/**
 * Kamera langsung.
 * Laptop/tablet: jendela ringkas, bidikan persegi di kiri dan panel kontrol (tombol potret) di kanan,
 * semuanya muat dalam satu layar tanpa digulir.
 * HP: layar penuh ala aplikasi kamera, bingkai persegi di tengah, tombol potret di bawah.
 * Setelah memotret, fotonya ditampilkan dulu: pilih "Pakai foto" atau "Ulangi".
 * Foto yang disimpan adalah potongan persegi yang sama persis dengan isi bingkai.
 */
export function CameraModal({
  onCapture,
  onClose,
  onFail,
}: {
  onCapture: (file: File) => void
  onClose: () => void
  onFail: (reason: CameraFailure) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const shutterRef = useRef<HTMLButtonElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)
  const acceptRef = useRef<HTMLButtonElement>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [ready, setReady] = useState(false)
  const [multi, setMulti] = useState(false)
  const [flash, setFlash] = useState(false)
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null)

  const stop = () => stopStream(streamRef)

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        stopStream(streamRef)
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => undefined)
          if (cancelled) return
          setReady(true)
          shutterRef.current?.focus({ preventScroll: true })
        }
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
        if (!cancelled) setMulti(devices.filter((d) => d.kind === 'videoinput').length > 1)
      })
      .catch((err) => {
        if (!cancelled) onFail(classify(err))
      })
    return () => {
      cancelled = true
    }
  }, [facing, onFail])

  useEffect(() => () => stopStream(streamRef), [])

  // Lepas URL pratinjau jepretan saat diganti atau saat jendela ditutup.
  useEffect(() => {
    if (!shot) return
    return () => URL.revokeObjectURL(shot.url)
  }, [shot])

  const close = useCallback(() => {
    stopStream(streamRef)
    onClose()
  }, [onClose])

  // Escape menutup, Tab berputar di dalam jendela, dan halaman di belakangnya tidak ikut tergulir.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
      if (e.key === 'Tab' && boxRef.current) {
        const f = Array.from(boxRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'))
        if (f.length === 0) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = ''
      prev?.focus?.({ preventScroll: true })
    }
  }, [close])

  function capture() {
    const v = videoRef.current
    const g = guideRef.current
    if (!v || !g || !v.videoWidth || shot) return
    // Ambil persis area bingkai persegi yang terlihat di layar (video tampil dengan object-cover).
    const vr = v.getBoundingClientRect()
    const gr = g.getBoundingClientRect()
    const k = Math.max(vr.width / v.videoWidth, vr.height / v.videoHeight)
    const ox = (vr.width - v.videoWidth * k) / 2
    const oy = (vr.height - v.videoHeight * k) / 2
    const side = Math.min(gr.width / k, v.videoWidth, v.videoHeight)
    const clamp = (n: number, max: number) => Math.max(0, Math.min(max - side, n))
    let sx = clamp((gr.left - vr.left - ox) / k, v.videoWidth)
    const sy = clamp((gr.top - vr.top - oy) / k, v.videoHeight)
    const mirrored = facing === 'user'
    if (mirrored) sx = v.videoWidth - sx - side // tampilan dicerminkan, sumbernya tidak
    const out = Math.round(Math.min(side, MAX_SIDE))
    const c = document.createElement('canvas')
    c.width = out
    c.height = out
    const ctx = c.getContext('2d')!
    if (mirrored) {
      // Kamera depan ditampilkan seperti cermin, jadi hasilnya juga dicerminkan agar sama.
      ctx.translate(out, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, sx, sy, side, side, 0, 0, out, out)
    v.pause()
    setFlash(true)
    setTimeout(() => setFlash(false), 160)
    c.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `kamera-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setShot({ file, url: URL.createObjectURL(blob) })
        requestAnimationFrame(() => acceptRef.current?.focus({ preventScroll: true }))
      },
      'image/jpeg',
      0.92,
    )
  }

  function retake() {
    setShot(null)
    videoRef.current?.play().catch(() => undefined)
    requestAnimationFrame(() => shutterRef.current?.focus({ preventScroll: true }))
  }

  function accept() {
    if (!shot) return
    stop()
    onCapture(shot.file)
  }

  const iconBtn =
    'grid size-11 place-items-center rounded-full bg-white/8 text-white ring-1 ring-white/15 transition-[background-color,transform] duration-200 hover:bg-white/15 active:scale-95'

  return createPortal(
    <div
      className="bg-rimba-950 halaman-masuk md:bg-rimba-950/80 fixed inset-0 z-90 grid place-items-center md:p-6 md:backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kamera-judul"
        data-testid="camera"
        className={cn(
          'grid size-full grid-rows-[auto_minmax(0,1fr)_auto] gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          'md:bg-panel md:shadow-angkat md:size-auto md:grid-cols-[auto_17rem] md:grid-rows-[auto_1fr] md:gap-x-7 md:gap-y-0 md:rounded-4xl md:border md:border-white/10 md:p-5 md:pr-6',
        )}
      >
        {/* Judul + tutup */}
        <div className="flex items-start justify-between gap-4 md:col-start-2 md:row-start-1 md:pt-1">
          <div className="min-w-0">
            <h2
              id="kamera-judul"
              className="font-display text-lg font-semibold text-white md:text-xl"
            >
              {shot ? 'Sudah pas?' : 'Ambil foto'}
            </h2>
            <p className="text-redup mt-1 text-sm leading-relaxed">
              {shot
                ? 'Pastikan bendanya terlihat jelas dan tidak buram.'
                : 'Taruh satu benda di dalam bingkai.'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className={cn(iconBtn, 'shrink-0')}
            aria-label="Tutup kamera"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/*
          Area kamera. Di HP mengisi layar; di laptop berupa kotak persegi di kiri.
          Bingkai persegi di tengahnya adalah bagian yang diambil, karena model membaca citra persegi.
        */}
        <div
          data-testid="camera-frame"
          className="@container-size relative size-full overflow-hidden rounded-3xl bg-black ring-1 ring-white/10 md:col-start-1 md:row-span-2 md:row-start-1 md:aspect-square md:size-auto md:w-[min(30rem,calc(100dvh-9rem),calc(100vw-28rem))]"
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn(
              'absolute inset-0 size-full object-cover transition-opacity duration-500',
              ready ? 'opacity-100' : 'opacity-0',
              facing === 'user' && '-scale-x-100',
            )}
          />
          {!ready && !shot && (
            <p className="text-mint-teks/70 absolute inset-0 grid place-items-center text-sm">
              <span className="flex items-center gap-2.5">
                <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                Membuka kamera…
              </span>
            </p>
          )}
          <div
            ref={guideRef}
            aria-hidden
            className={cn(
              'absolute inset-0 m-auto aspect-square w-[min(100cqw-2rem,100cqh-2rem)] rounded-2xl transition-shadow duration-300',
              shot
                ? 'shadow-[0_0_0_100vmax_rgb(3_14_11/0.92)]'
                : 'shadow-[0_0_0_100vmax_rgb(3_14_11/0.5)]',
            )}
          >
            {shot && (
              <img
                src={shot.url}
                alt="Foto hasil jepretan"
                className="halaman-masuk size-full rounded-2xl object-cover"
              />
            )}
            {CORNERS.map((c) => (
              <span
                key={c}
                className={cn(
                  'absolute size-9 transition-colors duration-300',
                  shot ? 'border-daun' : 'border-emas',
                  c,
                )}
              />
            ))}
          </div>
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 bg-white transition-opacity',
              flash ? 'opacity-90 duration-75' : 'opacity-0 duration-300',
            )}
          />
        </div>

        {/* Kontrol: baris di HP, kolom di laptop */}
        <div className="flex flex-col items-center justify-center md:col-start-2 md:row-start-2 md:justify-between md:gap-6 md:pt-6">
          {shot ? (
            <div className="grid w-full max-w-sm grid-cols-2 gap-3 md:my-auto md:max-w-none md:grid-cols-1">
              <button
                ref={acceptRef}
                type="button"
                onClick={accept}
                className="kilau bg-emas font-display text-rimba-950 hover:bg-emas-terang inline-flex h-13 items-center justify-center gap-2 rounded-full px-5 font-semibold shadow-[0_12px_32px_-10px_rgb(255_194_71/0.6)] transition-[background-color,transform] duration-200 active:scale-[0.97] max-md:order-last"
              >
                <Icon name="check" size={19} strokeWidth={2.4} /> Pakai foto
              </button>
              <button
                type="button"
                onClick={retake}
                className="font-display inline-flex h-13 items-center justify-center gap-2 rounded-full bg-white/8 px-5 font-semibold text-white ring-1 ring-white/15 transition-[background-color,transform] duration-200 hover:bg-white/14 active:scale-[0.97]"
              >
                <Icon name="refresh" size={18} /> Ulangi
              </button>
            </div>
          ) : (
            <div className="grid w-full max-w-sm grid-cols-[1fr_auto_1fr] items-center md:my-auto md:max-w-none md:grid-cols-1 md:justify-items-center md:gap-4">
              <span aria-hidden className="md:hidden" />
              <div className="flex flex-col items-center gap-2">
                <button
                  ref={shutterRef}
                  type="button"
                  onClick={capture}
                  disabled={!ready}
                  aria-label="Ambil foto"
                  data-testid="shutter"
                  className="group hover:ring-emas/40 grid size-19 place-items-center rounded-full bg-white/95 ring-4 ring-white/20 transition-[transform,box-shadow] duration-200 active:scale-90 disabled:opacity-40 md:size-22 [@media(max-height:520px)]:size-16"
                >
                  <span className="bg-emas ring-rimba-900 size-15 rounded-full ring-2 transition-transform duration-200 group-hover:scale-95 md:size-18 [@media(max-height:520px)]:size-12" />
                </button>
                <span className="text-mint-teks hidden text-sm font-medium md:block">Potret</span>
              </div>
              <div className="flex justify-end md:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setReady(false)
                    setFacing((f) => (f === 'environment' ? 'user' : 'environment'))
                  }}
                  disabled={!multi}
                  className={cn(
                    iconBtn,
                    'disabled:hidden md:h-10 md:w-auto md:gap-2 md:px-4 md:text-sm md:font-medium',
                  )}
                  aria-label="Ganti kamera depan/belakang"
                >
                  <Icon name="flip" size={18} />
                  <span className="hidden md:inline">Ganti kamera</span>
                </button>
              </div>
            </div>
          )}
          <ul className="text-redup hidden w-full space-y-2 border-t border-white/8 pt-5 text-sm md:block [@media(max-height:620px)]:hidden">
            {['Satu benda saja', 'Latar polos', 'Cahaya cukup, tidak buram'].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="bg-daun/15 text-daun-terang grid size-5 shrink-0 place-items-center rounded-full">
                  <Icon name="check" size={12} strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  )
}
