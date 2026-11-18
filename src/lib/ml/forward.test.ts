import { describe, expect, it } from 'vitest'
import { conv, forward, maxPool2x2, reluMap, sigmoid, zeroPad } from './forward'
import { toGray } from './preprocess'
import { expectedFloats, DEFAULT_META } from './model'

/** Seluruh angka di bawah diambil dari contoh hitung manual di makalah/PPT. */
describe('contoh hitung manual makalah', () => {
  it('grayscale (2.1): (200,150,100) → 159,25', () => {
    expect(toGray(200, 150, 100)).toBeCloseTo(159.25, 5)
  })

  it('sigmoid (2.7): σ(0)=0,5  σ(2)≈0,8808  σ(−2)≈0,1192', () => {
    expect(sigmoid(0)).toBe(0.5)
    expect(sigmoid(2)).toBeCloseTo(0.8808, 4)
    expect(sigmoid(-2)).toBeCloseTo(0.1192, 4)
  })

  it('zero padding 3×3 → 5×5 lalu konvolusi: C₁,₁ = 1,52 (PPT slide 8)', () => {
    const I = Float32Array.from([0.62, 0.4, 0.15, 0.55, 0.8, 0.3, 0.2, 0.45, 0.9])
    const K = Float32Array.from([1, 0, -1, 0, 1, 0, -1, 0, 1])
    const p = zeroPad(I, 3, 3, 1)
    expect([p.H, p.W]).toEqual([5, 5])
    const C = conv(p.data, p.H, p.W, K, 3, 0.1)
    expect(C.length).toBe(9)
    expect(C[0]).toBeCloseTo(1.52, 5)
  })

  it('ReLU (2.11) mengubah nilai negatif menjadi 0', () => {
    const R = reluMap(Float32Array.from([1.52, -0.3, -0.75, 0.48]))
    expect(Array.from(R)).toEqual([Float32Array.of(1.52)[0], 0, 0, Float32Array.of(0.48)[0]])
  })

  it('max pooling 2×2 stride 2: R(4×4) → P = [[1,52 0,90],[0,64 0,33]] (PPT slide 8)', () => {
    const R = Float32Array.from([
      1.52, 0, 0.21, 0.35, 0, 0.48, 0.9, 0, 0.12, 0, 0, 0.33, 0.64, 0.27, 0.05, 0,
    ])
    const { data, H, W } = maxPool2x2(R, 4, 4)
    expect([H, W]).toEqual([2, 2])
    expect(Array.from(data).map((v) => +v.toFixed(2))).toEqual([1.52, 0.9, 0.64, 0.33])
  })
})

describe('format model.bin', () => {
  it('arsitektur 64×64 → 8 kernel → 16 hidden = 131.185 float32 (≈ 0,5 MB)', () => {
    expect(expectedFloats(DEFAULT_META)).toBe(131_185)
  })
  it('input tiga kanal menambah bobot kernel: 131.329 float32', () => {
    expect(expectedFloats({ ...DEFAULT_META, channels: 3 })).toBe(131_329)
  })
})

describe('konvolusi banyak kanal', () => {
  it('hasil tiap kernel = jumlah konvolusi semua kanal + bias', () => {
    const meta = { ...DEFAULT_META, inputSize: 2, kernels: 1, hidden: 1, channels: 3 }
    // Tiga kanal 2×2 bernilai konstan 0,1 / 0,2 / 0,3; kernel hanya titik tengah (1 / 2 / 3).
    const I = Float32Array.from([0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.3, 0.3, 0.3, 0.3])
    const K = new Float32Array(27)
    K[4] = 1
    K[13] = 2
    K[22] = 3
    const w = {
      K,
      bc: Float32Array.of(0.5),
      V: Float32Array.of(1),
      v0: Float32Array.of(0),
      w: Float32Array.of(1),
      w0: 0,
    }
    const t = forward(I, w, meta)
    // 0,5 + 0,1·1 + 0,2·2 + 0,3·3 = 1,9 → pooling 2×2 → x = 1,9 → z = 1,9 → y = σ(1,9)
    expect(t.x[0]).toBeCloseTo(1.9, 5)
    expect(t.y).toBeCloseTo(sigmoid(1.9), 6)
  })
})
