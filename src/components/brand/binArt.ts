/**
 * Geometri tong PILAH (gaya 3D-clay, selaras dengan Fluent Emoji 3D).
 * viewBox tong: x -10..210, y -45..240 → BIN_VIEWBOX. Badan tong ada di x 22..178, y 72..224.
 * Lapisan: back (bayangan, bibir, mulut) → [item di sini] → front (badan, lambang) → tutup.
 */
export type BinKind = 'organik' | 'anorganik'

export const BIN_VIEWBOX = '-10 -45 220 285'
export const BIN_RATIO = 220 / 285
export const INK = '#0F2E25'

export const THEMES = {
  organik: {
    l: '#8CEBB3',
    b: '#3FBF77',
    d: '#2A9A5A',
    d2: '#218A4E',
    lid1: '#9CF0BF',
    lid2: '#52CC88',
    handle1: '#35A869',
    handle2: '#2A9A5A',
  },
  anorganik: {
    l: '#FFE08F',
    b: '#FFC247',
    d: '#EBA51C',
    d2: '#D8920E',
    lid1: '#FFE29A',
    lid2: '#FFCB5C',
    handle1: '#EBA51C',
    handle2: '#D8920E',
  },
} as const

export const PATHS = {
  body: 'M22 72 A78 10 0 0 0 178 72 L164 208 Q163 224 148 224 L52 224 Q37 224 36 208 Z',
  rimFront: 'M22 72 A78 10 0 0 0 178 72',
  streak: 'M45 94 Q51 91 55 95 L58 198 Q54 202 50 198 Z',
  leaf: 'M100 116 C132 126 136 160 106 186 C74 174 68 138 100 116 Z',
  leafRib: 'M100 128 C101 150 103 166 106 180',
  bottle:
    'M92 116 h16 v9 h-16 z M89 127 h22 q9 9 9 24 v31 q0 6 -6 6 h-28 q-6 0 -6 -6 v-31 q0 -15 9 -24 z',
  bottleBand: 'M85 150 h30 v14 h-30 z',
} as const

/** Sudut tutup saat terbuka (derajat). Engsel kiri → negatif, engsel kanan → positif. */
export const LID_OPEN = 28
