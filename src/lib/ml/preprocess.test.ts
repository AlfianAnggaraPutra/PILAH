/**
 * Resize di web harus identik dengan Image.resize(..., Image.BILINEAR) milik Pillow di notebook.
 * Fixture dibuat dengan Pillow dari beberapa citra acak (perkecil, perbesar, dan satu sisi saja).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { pillowResizeRGB, rgbToChannels, rgbToInput } from './preprocess'

const fx = JSON.parse(
  readFileSync(join(process.cwd(), 'src/lib/ml/__fixtures__/pillow-resize.json'), 'utf8'),
) as { pillow: string; cases: { w: number; h: number; rgb: string; expected: string }[] }

const b64 = (s: string) => Uint8Array.from(Buffer.from(s, 'base64'))

describe(`resize sama persis dengan Pillow ${fx.pillow}`, () => {
  it.each(fx.cases.map((c) => [`${c.w}×${c.h} → 64×64`, c] as const))('%s', (_n, c) => {
    const rgb = b64(c.rgb)
    const rgba = new Uint8Array(c.w * c.h * 4)
    for (let i = 0; i < c.w * c.h; i++) {
      rgba.set(rgb.subarray(i * 3, i * 3 + 3), i * 4)
      rgba[i * 4 + 3] = 255
    }
    const out = pillowResizeRGB(rgba, c.w, c.h, 64, 64)
    const exp = b64(c.expected)
    let diff = 0
    for (let i = 0; i < exp.length; i++) diff = Math.max(diff, Math.abs(out[i] - exp[i]))
    expect(diff).toBe(0)
  })

  it('grayscale dibulatkan seperti np.floor(x + 0,5)', () => {
    // (200,150,100) → 159,25 → 159 ; (1,1,0) → 0,886 → 1
    const I = rgbToInput(Uint8Array.from([200, 150, 100, 1, 1, 0]))
    expect(Math.round(I[0] * 255)).toBe(159)
    expect(Math.round(I[1] * 255)).toBe(1)
  })

  it('input RGB disusun kanal → baris → kolom seperti array NumPy (3, 64, 64)', () => {
    const I = rgbToChannels(Uint8Array.from([255, 0, 51, 0, 102, 255]))
    expect(Array.from(I).map((v) => Math.round(v * 255))).toEqual([255, 0, 0, 102, 51, 255])
  })
})
