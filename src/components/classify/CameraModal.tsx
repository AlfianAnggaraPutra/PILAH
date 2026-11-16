import { useCallback, useEffect, useRef, useState } from 'react'
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

/** Kamera langsung di dalam halaman, dengan bingkai bidik. */
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
  const captureRef = useRef<HTMLButtonElement>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [ready, setReady] = useState(false)
  const [multi, setMulti] = useState(false)
  const [flash, setFlash] = useState(false)

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    let cancelled = false
    setReady(false)
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
        stop()
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => undefined)
          setReady(true)
          captureRef.current?.focus()
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

  useEffect(() => () => stop(), [])

  const close = useCallback(() => {
    stop()
    onClose()
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    setFlash(true)
    c.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `kamera-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setTimeout(() => {
          stop()
          onCapture(file)
        }, 180)
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kamera"
      className="bg-rimba-950 halaman-masuk fixed inset-0 z-[90] flex flex-col"
    >
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn(
            'size-full object-cover transition-opacity duration-500',
            ready ? 'opacity-100' : 'opacity-0',
            facing === 'user' && '-scale-x-100',
          )}
        />
        {!ready && (
          <p className="text-mint-teks/70 absolute inset-0 grid place-items-center">
            Membuka kamera…
          </p>
        )}
        {/* Bingkai bidik persegi: model membaca citra persegi 64 × 64. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center p-8"
        >
          <div className="relative aspect-square w-[min(78vw,62vh)]">
            {[
              'top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl',
              'top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl',
              'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl',
              'bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl',
            ].map((c) => (
              <span key={c} className={cn('border-emas absolute size-12', c)} />
            ))}
          </div>
        </div>
        <p className="absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] text-center text-sm font-medium text-white drop-shadow">
          Taruh satu benda di dalam bingkai
        </p>
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 bg-white transition-opacity',
            flash ? 'opacity-90 duration-75' : 'opacity-0 duration-300',
          )}
        />
      </div>
      <div className="flex items-center justify-between px-8 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={close}
          className="grid size-12 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
          aria-label="Tutup kamera"
        >
          <Icon name="x" size={22} />
        </button>
        <button
          ref={captureRef}
          type="button"
          onClick={capture}
          disabled={!ready}
          aria-label="Ambil foto"
          className="grid size-20 place-items-center rounded-full bg-white ring-4 ring-white/30 transition-transform active:scale-90 disabled:opacity-50"
        >
          <span className="bg-emas ring-rimba-900 size-16 rounded-full ring-2" />
        </button>
        <button
          type="button"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          disabled={!multi}
          className="grid size-12 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20 disabled:invisible"
          aria-label="Ganti kamera depan/belakang"
        >
          <Icon name="flip" size={20} />
        </button>
      </div>
    </div>
  )
}
