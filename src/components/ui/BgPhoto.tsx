import { useState } from 'react'
import { unsplash } from '@/lib/content'
import { cn } from '@/lib/utils'

/**
 * Foto latar (Unsplash) yang muncul perlahan setelah termuat.
 * Bila gagal dimuat (mis. sedang offline), foto disembunyikan dan gradien di belakangnya tetap tampil.
 */
export function BgPhoto({
  id,
  width = 1920,
  className,
  imgClassName,
  eager = false,
}: {
  id: string
  width?: number
  className?: string
  imgClassName?: string
  eager?: boolean
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  if (state === 'error') return null
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <img
        src={unsplash(id, width)}
        srcSet={`${unsplash(id, Math.round(width / 2))} ${Math.round(width / 2)}w, ${unsplash(id, width)} ${width}w`}
        sizes="100vw"
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : 'auto'}
        onLoad={() => setState('ok')}
        onError={() => setState('error')}
        className={cn(
          'size-full object-cover transition-opacity duration-[1400ms] ease-out',
          state === 'ok' ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />
    </div>
  )
}
