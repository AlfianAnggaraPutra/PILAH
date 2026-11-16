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
  /** Tombol utama di latar terang. */
  primary:
    'bg-rimba-900 text-white shadow-lembut hover:bg-rimba-800 hover:shadow-angkat hover:-translate-y-0.5',
  /** Tombol utama di latar gelap. */
  gold: 'bg-emas text-rimba-900 shadow-[0_10px_30px_-8px_rgb(255_194_71/0.55)] hover:bg-emas-terang hover:-translate-y-0.5',
  secondary:
    'bg-white text-teks ring-1 ring-garis hover:ring-rimba-600/40 hover:bg-mint/60 hover:-translate-y-0.5',
  /** Tombol sekunder di latar gelap. */
  glass: 'bg-white/8 text-white ring-1 ring-white/20 hover:bg-white/14 hover:ring-white/35',
  ghost: 'text-daun-tua hover:bg-mint',
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
