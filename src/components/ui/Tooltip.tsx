import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Keterangan kecil yang muncul saat disorot, difokus, atau diketuk (di HP).
 * Dipakai untuk memberi informasi tambahan tanpa memenuhi layar.
 */
export function Tooltip({
  tip,
  children,
  side = 'top',
  className,
  width = 'w-64',
}: {
  tip: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
  width?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <span
      className={cn('group/tip relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
    >
      <span
        aria-describedby={id}
        tabIndex={0}
        className="inline-flex cursor-help rounded-lg outline-offset-2"
      >
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          'bg-rimba-950/95 text-mint-teks shadow-angkat pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 p-3.5 text-left text-[0.82rem] leading-relaxed backdrop-blur-xl transition-[opacity,transform] duration-200',
          width,
          side === 'top' ? 'bottom-full mb-3' : 'top-full mt-3',
          open
            ? 'translate-y-0 opacity-100'
            : side === 'top'
              ? 'translate-y-1.5 opacity-0'
              : '-translate-y-1.5 opacity-0',
        )}
      >
        {tip}
        <span
          aria-hidden
          className={cn(
            'bg-rimba-950 absolute left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-white/10',
            side === 'top' ? '-bottom-1.5 border-r border-b' : '-top-1.5 border-t border-l',
          )}
        />
      </span>
    </span>
  )
}
