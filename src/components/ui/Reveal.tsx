import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useInView } from '@/lib/motion'
import { cn } from '@/lib/utils'

export type RevealStyle = 'naik' | 'blur' | 'skala' | 'kiri' | 'kanan' | 'tirai'

/**
 * Membungkus konten agar muncul halus saat masuk layar.
 * `gaya` memilih jenis gerak, `delay` (ms) untuk urutan bertahap.
 */
export function Reveal({
  as: Tag = 'div',
  gaya = 'naik',
  delay = 0,
  className,
  style,
  children,
  ...rest
}: {
  as?: ElementType
  gaya?: RevealStyle
  delay?: number
  className?: string
  style?: CSSProperties
  children: ReactNode
  id?: string
  [key: `data-${string}`]: string | undefined
}) {
  const [ref, inView] = useInView<HTMLElement>()
  return (
    <Tag
      ref={ref}
      data-tampak={inView ? '1' : '0'}
      data-gaya={gaya}
      className={cn('muncul', className)}
      style={{ '--tunda': `${delay}ms`, ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Judul yang muncul kata demi kata (untuk judul besar di bagian atas halaman). */
export function WordsIn({
  text,
  start = 0,
  step = 70,
}: {
  text: string
  start?: number
  step?: number
}) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i}>
          {i > 0 && ' '}
          <span className="kata">
            <span style={{ '--tunda': `${start + i * step}ms` } as CSSProperties}>{w}</span>
          </span>
        </span>
      ))}
    </>
  )
}
