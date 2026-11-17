/** Label dan saran singkat per hasil, dipakai di ringkasan hasil dan laporan PDF. */
import type { Classification } from '@/lib/ml/classify'

export type Verdict = 'organik' | 'anorganik' | 'ragu'

export const verdictOf = (r: Classification): Verdict => (r.uncertain ? 'ragu' : r.kind)

export const VERDICT_LABEL: Record<Verdict, string> = {
  organik: 'Organik',
  anorganik: 'Anorganik',
  ragu: 'Belum yakin',
}

/** Keyakinan yang ditampilkan: peluang kelas terbesar. */
export const confidenceOf = (r: Classification) => Math.max(r.y, 1 - r.y)

/** Di bawah nilai ini, hasil masih ditampilkan tetapi pengguna disarankan memeriksa ulang. */
export const LOW_CONFIDENCE = 0.7

export function adviceFor(r: Classification): string {
  const v = verdictOf(r)
  if (v === 'ragu') {
    return `Peluang organik dan anorganik hampir seimbang (cenderung ${r.kind}). Foto ulang dengan latar polos dan cahaya cukup, atau periksa bahannya langsung.`
  }
  const base =
    v === 'organik'
      ? 'Pisahkan dari plastik dan kertas, tiriskan bila basah, lalu olah menjadi kompos.'
      : 'Kosongkan, bilas, dan keringkan, lalu setorkan ke bank sampah atau pengepul daur ulang.'
  return confidenceOf(r) < LOW_CONFIDENCE
    ? `${base} Keyakinannya belum tinggi, sebaiknya cek ulang bahannya.`
    : base
}

export interface Tally {
  organik: number
  anorganik: number
  ragu: number
  total: number
  /** Kelompok terbanyak; null bila seri. */
  top: Verdict | null
}

export function tally(results: Classification[]): Tally {
  const t = { organik: 0, anorganik: 0, ragu: 0 }
  results.forEach((r) => t[verdictOf(r)]++)
  const order: Verdict[] = ['anorganik', 'organik', 'ragu']
  const max = Math.max(t.organik, t.anorganik, t.ragu)
  const tops = order.filter((k) => t[k] === max)
  return { ...t, total: results.length, top: tops.length === 1 ? tops[0] : null }
}
