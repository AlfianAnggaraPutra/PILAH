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

/** Slogan dengan "Pil" dan "ah" disorot emas: dari dua potongan itulah nama PILAH terbentuk. */
export function Slogan({ className, highlight = true }: { className?: string; highlight?: boolean }) {
  const [a, mid, b] = BRAND.sloganParts
  const mark = highlight ? 'rounded-[4px] bg-emas px-[2px] text-rimba-900' : ''
  return (
    <span className={className}>
      <span className={mark}>{a}</span>
      {mid}
      <span className={mark}>{b}</span>
    </span>
  )
}
