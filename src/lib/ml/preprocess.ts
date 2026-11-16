/** Prapemrosesan sesuai Bab III langkah 3: resize 64×64 → grayscale (pers. 2.1) → normalisasi (pers. 2.2). */

/** Pembobotan RGB → grayscale (pers. 2.1). */
export const toGray = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

type Source = CanvasImageSource & { width: number; height: number }

/*
 * Resize meniru persis Image.resize(..., Image.BILINEAR) milik Pillow yang dipakai notebook Colab:
 * filter segitiga yang lebarnya ikut membesar saat memperkecil (antialias), dua lintasan
 * (horizontal dulu, lalu vertikal), koefisien fixed-point 22 bit, dan hasil antara dibulatkan ke 8 bit.
 * Dengan begitu matriks input di web sama dengan di notebook, bukan sekadar mirip.
 */
const PRECISION_BITS = 32 - 8 - 2

function coeffs(inSize: number, outSize: number) {
  const scale = inSize / outSize
  const filterscale = Math.max(1, scale)
  const support = 1 * filterscale // dukungan filter bilinear = 1
  const ksize = Math.ceil(support) * 2 + 1
  const kk = new Int32Array(outSize * ksize)
  const bounds = new Int32Array(outSize * 2)
  const pre = new Float64Array(ksize)
  for (let xx = 0; xx < outSize; xx++) {
    const center = (xx + 0.5) * scale
    const ss = 1 / filterscale
    let xmin = Math.trunc(center - support + 0.5)
    if (xmin < 0) xmin = 0
    let xmax = Math.trunc(center + support + 0.5)
    if (xmax > inSize) xmax = inSize
    xmax -= xmin
    let ww = 0
    for (let x = 0; x < xmax; x++) {
      const t = Math.abs((x + xmin - center + 0.5) * ss)
      const w = t < 1 ? 1 - t : 0
      pre[x] = w
      ww += w
    }
    for (let x = 0; x < ksize; x++) {
      const k = x < xmax && ww !== 0 ? pre[x] / ww : 0
      kk[xx * ksize + x] = k < 0 ? Math.trunc(-0.5 + k * (1 << PRECISION_BITS)) : Math.trunc(0.5 + k * (1 << PRECISION_BITS))
    }
    bounds[xx * 2] = xmin
    bounds[xx * 2 + 1] = xmax
  }
  return { ksize, kk, bounds }
}

const clip8 = (v: number) => {
  const r = Math.floor(v / 2 ** PRECISION_BITS)
  return r < 0 ? 0 : r > 255 ? 255 : r
}

/** Resize RGB(A) 8 bit seperti Pillow BILINEAR. `src` = RGBA dari getImageData. Hasil: RGB. */
export function pillowResizeRGB(src: Uint8ClampedArray | Uint8Array, w: number, h: number, ow: number, oh: number) {
  const H = coeffs(w, ow)
  const V = coeffs(h, oh)
  const yFirst = V.bounds[0]
  const yLast = V.bounds[(oh - 1) * 2] + V.bounds[(oh - 1) * 2 + 1]
  const needH = ow !== w
  const needV = oh !== h
  const tmpH = needH ? yLast - yFirst : h
  const offset = needH ? yFirst : 0
  // Lintasan horizontal (hanya baris yang dipakai lintasan vertikal).
  const tmp = new Uint8Array(ow * tmpH * 3)
  const half = 1 << (PRECISION_BITS - 1)
  if (needH) {
    for (let y = 0; y < tmpH; y++) {
      const row = (y + yFirst) * w * 4
      for (let xx = 0; xx < ow; xx++) {
        const xmin = H.bounds[xx * 2]
        const xmax = H.bounds[xx * 2 + 1]
        const k = xx * H.ksize
        let r = half
        let g = half
        let b = half
        for (let x = 0; x < xmax; x++) {
          const c = H.kk[k + x]
          const p = row + (x + xmin) * 4
          r += src[p] * c
          g += src[p + 1] * c
          b += src[p + 2] * c
        }
        const o = (y * ow + xx) * 3
        tmp[o] = clip8(r)
        tmp[o + 1] = clip8(g)
        tmp[o + 2] = clip8(b)
      }
    }
  } else {
    for (let i = 0; i < w * h; i++) {
      tmp[i * 3] = src[i * 4]
      tmp[i * 3 + 1] = src[i * 4 + 1]
      tmp[i * 3 + 2] = src[i * 4 + 2]
    }
  }
  if (!needV) return tmp
  const out = new Uint8Array(ow * oh * 3)
  for (let yy = 0; yy < oh; yy++) {
    const ymin = V.bounds[yy * 2] - offset
    const ymax = V.bounds[yy * 2 + 1]
    const k = yy * V.ksize
    for (let xx = 0; xx < ow; xx++) {
      let r = half
      let g = half
      let b = half
      for (let y = 0; y < ymax; y++) {
        const c = V.kk[k + y]
        const p = ((y + ymin) * ow + xx) * 3
        r += tmp[p] * c
        g += tmp[p + 1] * c
        b += tmp[p + 2] * c
      }
      const o = (yy * ow + xx) * 3
      out[o] = clip8(r)
      out[o + 1] = clip8(g)
      out[o + 2] = clip8(b)
    }
  }
  return out
}

/** Ambil piksel RGBA citra pada ukuran aslinya, di atas latar putih (sama seperti notebook). */
function readPixels(src: Source) {
  const w = src.width
  const h = src.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(src, 0, 0)
  return ctx.getImageData(0, 0, w, h).data
}

/** RGB 8 bit → matriks input I (nilai 0..1) lewat grayscale (pers. 2.1) dan normalisasi (pers. 2.2). */
export function rgbToInput(rgb: Uint8Array, roundGray = true): Float32Array {
  const out = new Float32Array(rgb.length / 3)
  for (let p = 0; p < out.length; p++) {
    const gray = toGray(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2])
    // Math.round = floor(x + 0,5), sama dengan np.floor(gray + 0.5) di notebook.
    out[p] = (roundGray ? Math.round(gray) : gray) / 255
  }
  return out
}

/** Citra → matriks input I (size×size, nilai 0..1). */
export function imageToInput(src: Source, size = 64, roundGray = true): Float32Array {
  const rgba = readPixels(src)
  return rgbToInput(pillowResizeRGB(rgba, src.width, src.height, size, size), roundGray)
}

export type MapStyle = 'gray' | 'heat' | 'diverge'

/**
 * Gambar peta nilai ke canvas (untuk visualisasi).
 * - gray: 0..1 apa adanya (citra input)
 * - heat: dinormalkan ke nilai maksimum, gelap → hijau → emas (feature map setelah ReLU)
 * - diverge: negatif biru-hijau tua, positif emas (hasil konvolusi sebelum ReLU)
 */
export function drawMap(
  canvas: HTMLCanvasElement,
  map: Float32Array,
  side: number,
  style: MapStyle = 'gray',
) {
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(side, side)
  let max = 1e-6
  let min = 0
  for (let i = 0; i < map.length; i++) {
    if (map[i] > max) max = map[i]
    if (map[i] < min) min = map[i]
  }
  const lim = Math.max(max, -min, 1e-6)
  for (let i = 0; i < map.length; i++) {
    let r: number, g: number, b: number
    if (style === 'gray') {
      r = g = b = clamp255(map[i] * 255)
    } else if (style === 'heat') {
      ;[r, g, b] = heat(map[i] / max)
    } else {
      const t = map[i] / lim
      ;[r, g, b] = t >= 0 ? mix([17, 58, 51], [255, 194, 71], t) : mix([17, 58, 51], [120, 200, 230], -t)
    }
    img.data[i * 4] = r
    img.data[i * 4 + 1] = g
    img.data[i * 4 + 2] = b
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
const mix = (a: number[], b: number[], t: number) =>
  a.map((v, i) => clamp255(v + (b[i] - v) * Math.min(1, Math.max(0, t)))) as [number, number, number]

/** Rimba (0) → daun (0,55) → emas terang (1). */
function heat(t: number): [number, number, number] {
  if (t <= 0) return [6, 26, 22]
  if (t < 0.55) return mix([6, 26, 22], [63, 191, 119], t / 0.55)
  return mix([63, 191, 119], [255, 224, 143], (t - 0.55) / 0.45)
}
