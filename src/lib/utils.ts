/** Gabungkan className, abaikan nilai kosong. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Format angka gaya Indonesia: 0.8808 → "0,8808". */
export function fmt(n: number, digits = 2) {
  return n.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function pct(n: number, digits = 0) {
  return `${fmt(n * 100, digits)}%`
}
