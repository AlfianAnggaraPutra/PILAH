import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/utils'

/** Logo pasangan tong (berkas statis di /public/brand). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/logo-mark.svg"
      alt=""
      width={358}
      height={210}
      className={cn('h-8 w-auto', className)}
      draggable={false}
    />
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-bold tracking-[0.16em]', className)}>{BRAND.name}</span>
  )
}

/** Slogan PILAH, ditulis apa adanya tanpa sorotan. */
export function Slogan({ className }: { className?: string }) {
  return <span className={className}>{BRAND.slogan}</span>
}
