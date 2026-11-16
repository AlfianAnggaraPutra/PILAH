import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useInView } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** Membungkus konten agar muncul halus saat masuk layar. `delay` dalam milidetik. */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className,
  children,
  ...rest
}: {
  as?: ElementType
  delay?: number
  className?: string
  children: ReactNode
  id?: string
}) {
  const [ref, inView] = useInView<HTMLElement>()
  return (
    <Tag
      ref={ref}
      data-tampak={inView ? '1' : '0'}
      className={cn('muncul', className)}
      style={{ '--tunda': `${delay}ms` } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  )
}
