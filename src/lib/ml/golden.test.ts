/**
 * Tes kesamaan Colab ↔ web. Aktif otomatis begitu berkas ini ada di public/model:
 *   model.bin, meta.json, golden.json   (cara membuatnya: docs/MODEL-FORMAT.md)
 * Menguji matematika jaringan (padding → konvolusi → ReLU → pooling → flatten → FC → sigmoid)
 * pada citra masukan yang sama persis dengan notebook.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { forward } from './forward'
import { DEFAULT_META, parseWeights } from './model'
import type { ModelMeta } from './types'

const dir = join(process.cwd(), 'public', 'model')
const ready = ['model.bin', 'meta.json', 'golden.json'].every((f) => existsSync(join(dir, f)))

describe.skipIf(!ready)('golden: hasil web sama dengan Colab', () => {
  const meta: ModelMeta = ready
    ? { ...DEFAULT_META, ...JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) }
    : DEFAULT_META
  const bin = ready ? readFileSync(join(dir, 'model.bin')) : Buffer.alloc(0)
  const buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer
  // `input` (kanal → baris → kolom) atau `gray` (model lama), berupa bilangan bulat 0–255 atau 0–1.
  const cases: { name: string; input?: number[]; gray?: number[]; y: number }[] = ready
    ? JSON.parse(readFileSync(join(dir, 'golden.json'), 'utf8'))
    : []

  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const weights = parseWeights(buf, meta)
    const raw: number[] = c.input ?? c.gray ?? []
    const scale = Math.max(...raw) > 1 ? 255 : 1
    const trace = forward(
      Float32Array.from(raw, (v) => v / scale),
      weights,
      meta,
    )
    expect(trace.y).toBeCloseTo(c.y, 4)
  })
})
