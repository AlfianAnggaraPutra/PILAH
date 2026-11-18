/**
 * Umpan maju CNN — padanan 1:1 dengan Subbab 2.6 makalah (persamaan 2.9–2.16).
 * Semua fungsi murni sehingga bisa diuji terhadap contoh hitung manual.
 */
import type { ForwardTrace, ModelMeta, ModelWeights } from './types'

export const relu = (x: number) => (x > 0 ? x : 0)

/** Sigmoid biner (pers. 2.7), stabil untuk |x| besar. */
export function sigmoid(x: number): number {
  if (x >= 0) return 1 / (1 + Math.exp(-x))
  const e = Math.exp(x)
  return e / (1 + e)
}

/** Zero padding q piksel di semua sisi (pers. 2.9: q = (k − 1) / 2). */
export function zeroPad(I: Float32Array, H: number, W: number, q = 1) {
  const Hp = H + 2 * q
  const Wp = W + 2 * q
  const out = new Float32Array(Hp * Wp)
  for (let r = 0; r < H; r++) out.set(I.subarray(r * W, r * W + W), (r + q) * Wp + q)
  return { data: out, H: Hp, W: Wp }
}

/** Konvolusi k×k stride 1 pada matriks yang sudah di-padding (pers. 2.10). Hasil: (Hp−k+1)×(Wp−k+1). */
export function conv(
  Ip: Float32Array,
  Hp: number,
  Wp: number,
  K: Float32Array,
  k: number,
  b: number,
) {
  const H = Hp - k + 1
  const W = Wp - k + 1
  const C = new Float32Array(H * W)
  for (let i = 0; i < H; i++) {
    for (let j = 0; j < W; j++) {
      let s = b
      for (let u = 0; u < k; u++) {
        const rowI = (i + u) * Wp + j
        const rowK = u * k
        for (let v = 0; v < k; v++) s += Ip[rowI + v] * K[rowK + v]
      }
      C[i * W + j] = s
    }
  }
  return C
}

export function reluMap(C: Float32Array): Float32Array {
  const R = new Float32Array(C.length)
  for (let i = 0; i < C.length; i++) R[i] = relu(C[i])
  return R
}

/** Max pooling 2×2 stride 2 (pers. 2.12). */
export function maxPool2x2(R: Float32Array, H: number, W: number) {
  const h = H >> 1
  const w = W >> 1
  const P = new Float32Array(h * w)
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const a = 2 * i * W + 2 * j
      P[i * w + j] = Math.max(R[a], R[a + 1], R[a + W], R[a + W + 1])
    }
  }
  return { data: P, H: h, W: w }
}

/**
 * Seluruh umpan maju untuk satu citra ternormalisasi.
 * `I` berurutan kanal → baris → kolom (channels × size × size), sama seperti array NumPy di notebook.
 * Untuk citra berkanal banyak, hasil konvolusi tiap kernel adalah jumlah konvolusi semua kanalnya.
 */
export function forward(I: Float32Array, weights: ModelWeights, meta: ModelMeta): ForwardTrace {
  const { inputSize: n, kernels: F, kernelSize: k, hidden: Hd } = meta
  const ch = meta.channels ?? 1
  const q = (k - 1) / 2
  const plane = n * n
  const padded = Array.from({ length: ch }, (_, c) =>
    zeroPad(I.subarray(c * plane, (c + 1) * plane), n, n, q),
  )
  const Wp = padded[0].W

  const R: Float32Array[] = []
  const P: Float32Array[] = []
  const half = n >> 1
  const x = new Float32Array(F * half * half) // flatten: kernel → baris → kolom
  for (let f = 0; f < F; f++) {
    // Dijumlahkan dalam presisi ganda, seperti np.einsum di notebook, baru disimpan sebagai float32.
    const acc64 = new Float64Array(plane).fill(weights.bc[f])
    for (let c = 0; c < ch; c++) {
      const Ip = padded[c].data
      const K = weights.K.subarray((f * ch + c) * k * k, (f * ch + c + 1) * k * k)
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          let s = 0
          for (let u = 0; u < k; u++) {
            const rowI = (i + u) * Wp + j
            for (let v = 0; v < k; v++) s += Ip[rowI + v] * K[u * k + v]
          }
          acc64[i * n + j] += s
        }
      }
    }
    const Rf = reluMap(Float32Array.from(acc64))
    const pooled = maxPool2x2(Rf, n, n)
    R.push(Rf)
    P.push(pooled.data)
    x.set(pooled.data, f * half * half)
  }

  // Hidden layer (pers. 2.3–2.4): z_in_j = v0j + Σ x_i v_ij, lalu ReLU.
  const acc = Float64Array.from(weights.v0) // akumulasi presisi ganda, sama seperti NumPy
  for (let i = 0; i < x.length; i++) {
    const xi = x[i]
    if (xi === 0) continue
    const row = i * Hd
    for (let j = 0; j < Hd; j++) acc[j] += xi * weights.V[row + j]
  }
  const zin = Float32Array.from(acc)
  const z = new Float32Array(Hd)
  for (let j = 0; j < Hd; j++) z[j] = relu(acc[j])

  // Output (pers. 2.14–2.15)
  let yIn = weights.w0
  for (let j = 0; j < Hd; j++) yIn += relu(acc[j]) * weights.w[j]
  return { size: n, preview: previewOf(I, n, ch), R, P, x, zin, z, yIn, y: sigmoid(yIn) }
}

/** Satu lapis untuk ditampilkan: kanal tunggal apa adanya, atau rata-rata berbobot kanal RGB. */
function previewOf(I: Float32Array, n: number, ch: number): Float32Array {
  if (ch === 1) return I
  const plane = n * n
  const out = new Float32Array(plane)
  for (let i = 0; i < plane; i++)
    out[i] = 0.299 * I[i] + 0.587 * I[plane + i] + 0.114 * I[2 * plane + i]
  return out
}
