import { useCountUp, useInView } from '@/lib/motion'
import { fmt } from '@/lib/utils'

/** Angka yang menghitung naik saat pertama kali terlihat. */
export function CountUp({
  value,
  digits = 0,
  suffix = '',
  delay = 0,
  className,
}: {
  value: number
  digits?: number
  suffix?: string
  delay?: number
  className?: string
}) {
  const [ref, inView] = useInView<HTMLSpanElement>()
  const v = useCountUp(value, { start: inView, delay })
  return (
    <span ref={ref} className={className} aria-label={`${fmt(value, digits)}${suffix}`}>
      <span aria-hidden className="angka">
        {fmt(v, digits)}
        {suffix}
      </span>
    </span>
  )
}
