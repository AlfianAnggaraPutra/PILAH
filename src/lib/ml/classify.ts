import type { WasteKind } from '@/lib/items'
import { forward } from './forward'
import { loadModel } from './model'
import { imageToInput } from './preprocess'
import type { ForwardTrace, ModelMeta } from './types'

export interface Classification {
  y: number // peluang anorganik
  kind: WasteKind
  /** Peluang kelas yang diprediksi (0,5–1). */
  confidence: number
  uncertain: boolean
  trace: ForwardTrace
  meta: ModelMeta
  isMock: boolean
  ms: number
  /** Ukuran citra asli (piksel). */
  source?: { width: number; height: number }
}

/** Kesalahan yang pesannya aman ditampilkan langsung ke pengguna. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}

export const MIN_SIDE = 32

export async function decodeImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // Tanpa konversi profil warna, sama seperti Pillow yang membaca nilai piksel apa adanya.
    return await createImageBitmap(file, {
      imageOrientation: 'from-image',
      colorSpaceConversion: 'none',
      premultiplyAlpha: 'none',
    })
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } catch {
      const heic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test((file as File).name ?? '')
      throw new UserFacingError(
        heic
          ? 'Foto berformat HEIC belum bisa dibuka di browser ini. Ubah ke JPG dulu, atau ambil foto langsung lewat tombol kamera.'
          : 'Foto ini tidak bisa dibuka. Mungkin berkasnya rusak atau formatnya tidak didukung. Coba foto lain.',
      )
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

export function interpret(y: number, meta: ModelMeta) {
  const kind: WasteKind = y >= meta.threshold ? 'anorganik' : 'organik'
  const confidence = kind === 'anorganik' ? y : 1 - y
  const uncertain = Math.abs(y - meta.threshold) < (meta.uncertainBand ?? 0.1)
  return { kind, confidence, uncertain }
}

/** Foto → klasifikasi lengkap beserta seluruh hasil antara (untuk panel "proses"). */
export async function classifyImage(file: Blob): Promise<Classification> {
  const [model, bitmap] = await Promise.all([loadModel(), decodeImage(file)])
  const width = bitmap.width
  const height = bitmap.height
  if (width < MIN_SIDE || height < MIN_SIDE) {
    if ('close' in bitmap) bitmap.close()
    throw new UserFacingError(
      `Foto terlalu kecil (${width} × ${height} piksel). Pakai foto minimal ${MIN_SIDE} × ${MIN_SIDE} piksel.`,
    )
  }
  const t0 = performance.now()
  const size = model.meta.inputSize
  const input = imageToInput(bitmap, size, model.meta.grayRound)
  if ('close' in bitmap) bitmap.close()
  const trace = forward(input, model.weights, model.meta)
  return {
    y: trace.y,
    ...interpret(trace.y, model.meta),
    trace,
    meta: model.meta,
    isMock: model.isMock,
    ms: performance.now() - t0,
    source: { width, height },
  }
}

/** Hitung ulang dari matriks input yang disimpan (dipakai saat halaman hasil dimuat ulang). */
export async function classifyInput(input: Float32Array): Promise<Classification> {
  const model = await loadModel()
  const t0 = performance.now()
  const trace = forward(input, model.weights, model.meta)
  return {
    y: trace.y,
    ...interpret(trace.y, model.meta),
    trace,
    meta: model.meta,
    isMock: model.isMock,
    ms: performance.now() - t0,
  }
}
