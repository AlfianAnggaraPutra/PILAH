import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from 'react'
import { Link } from '@/lib/router'
import { cn } from '@/lib/utils'

const base =
  'kilau inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold whitespace-nowrap ' +
  'transition-[transform,background-color,box-shadow,color] duration-200 ease-out active:scale-[0.97] ' +
  'disabled:pointer-events-none disabled:opacity-45'

const sizes = {
  md: 'h-12 px-6 text-[0.95rem]',
  lg: 'h-14 px-7 text-base',
  sm: 'h-10 px-4 text-sm',
} as const

export const variants = {
  /** Tombol utama: emas, paling menonjol di latar gelap. */
  primary:
    'bg-emas text-rimba-950 shadow-[0_12px_32px_-10px_rgb(255_194_71/0.6)] hover:bg-emas-terang hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgb(255_194_71/0.75)]',
  /** Tombol hijau (aksi organik / sekunder kuat). */
  hijau:
    'bg-daun text-rimba-950 shadow-[0_12px_32px_-12px_rgb(63_191_119/0.6)] hover:bg-daun-terang hover:-translate-y-0.5',
  /** Tombol kaca untuk aksi kedua. */
  secondary:
    'bg-white/6 text-teks ring-1 ring-white/15 backdrop-blur hover:bg-white/11 hover:ring-white/30 hover:-translate-y-0.5',
  ghost: 'text-daun-terang hover:bg-white/6',
  /* Alias lama agar kode lain tetap jalan. */
  gold: 'bg-emas text-rimba-950 shadow-[0_12px_32px_-10px_rgb(255_194_71/0.6)] hover:bg-emas-terang hover:-translate-y-0.5',
  glass:
    'bg-white/6 text-white ring-1 ring-white/20 backdrop-blur hover:bg-white/12 hover:ring-white/35',
} as const

export type Variant = keyof typeof variants
type Size = keyof typeof sizes

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  )
})

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cn(base, sizes[size], variants[variant], className)} {...props} />
}
