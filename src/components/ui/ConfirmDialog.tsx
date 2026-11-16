import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/**
 * Dialog konfirmasi. Fokus awal di tombol aman, Escape atau klik di luar = batal,
 * Tab berputar di dalam dialog.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  media,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children: ReactNode
  media?: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Tab' && boxRef.current) {
        const f = boxRef.current.querySelectorAll<HTMLElement>('button')
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
      prev?.focus?.()
    }
  }, [open, onCancel])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-95 grid place-items-center p-4">
      <div
        aria-hidden
        onClick={onCancel}
        className="bg-rimba-950/70 absolute inset-0 animate-[masuk-blur_0.35s_ease-out_both] backdrop-blur-md"
      />
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-judul"
        aria-describedby="dialog-isi"
        className="kartu bg-panel/95 relative w-full max-w-md animate-[masuk-skala_0.45s_cubic-bezier(.22,1,.36,1)_both] overflow-hidden rounded-4xl p-7 text-center sm:p-8"
      >
        <div
          aria-hidden
          className="bg-emas/20 pointer-events-none absolute -top-20 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full blur-3xl"
        />
        {media && <div className="relative mx-auto mb-5 w-fit">{media}</div>}
        <h2 id="dialog-judul" className="relative text-2xl font-bold">
          {title}
        </h2>
        <div id="dialog-isi" className="text-redup relative mt-3 leading-relaxed">
          {children}
        </div>
        <div className="relative mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'font-display inline-flex h-12 items-center justify-center rounded-full px-6 text-[0.95rem] font-semibold text-white ring-1 ring-white/15 transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/10',
            )}
          >
            {confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="kilau bg-emas font-display text-rimba-950 hover:bg-emas-terang inline-flex h-12 items-center justify-center rounded-full px-6 text-[0.95rem] font-semibold shadow-[0_12px_32px_-10px_rgb(255_194_71/0.6)] transition-[background-color,transform] duration-300 hover:-translate-y-0.5"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
