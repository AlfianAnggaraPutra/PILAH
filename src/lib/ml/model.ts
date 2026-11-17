import type { LoadedModel, ModelMeta, ModelWeights } from './types'

const META_URL = '/model/meta.json'
const BIN_URL = '/model/model.bin'

export type ModelStatus = 'loading' | 'ready' | 'demo' | 'error'

export class ModelUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelUnavailableError'
  }
}

export const DEFAULT_META: ModelMeta = {
  version: 'dev',
  inputSize: 64,
  kernels: 8,
  kernelSize: 3,
  hidden: 16,
  flatten: 'channel-major',
  grayRound: true,
  threshold: 0.5,
  uncertainBand: 0.1,
}

/** Jumlah float32 di model.bin: K, bc, V, v0, w, w0. Lihat docs/MODEL-FORMAT.md. */
export function expectedFloats(m: ModelMeta) {
  const flat = m.kernels * (m.inputSize / 2) ** 2
  return m.kernels * m.kernelSize ** 2 + m.kernels + flat * m.hidden + m.hidden + m.hidden + 1
}

export function parseWeights(buf: ArrayBuffer, m: ModelMeta): ModelWeights {
  const need = expectedFloats(m)
  if (buf.byteLength !== need * 4) {
    throw new ModelUnavailableError(
      `Ukuran model.bin tidak sesuai: ${buf.byteLength} byte, seharusnya ${need * 4} byte.`,
    )
  }
  const f = new Float32Array(buf) // little-endian, sama seperti np.float32.tobytes() di Colab
  const flat = m.kernels * (m.inputSize / 2) ** 2
  let o = 0
  const take = (n: number) => f.subarray(o, (o += n))
  const K = take(m.kernels * m.kernelSize ** 2)
  const bc = take(m.kernels)
  const V = take(flat * m.hidden)
  const v0 = take(m.hidden)
  const w = take(m.hidden)
  const w0 = take(1)[0]
  return { K, bc, V, v0, w, w0 }
}

/** Bobot acak kecil, hanya untuk mode demo agar alur bisa dicoba sebelum model.bin dipasang. */
function mockWeights(m: ModelMeta): ModelWeights {
  let s = 1234567
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32 - 0.5) * 2
  const fill = (n: number, scale: number) => Float32Array.from({ length: n }, () => rnd() * scale)
  const flat = m.kernels * (m.inputSize / 2) ** 2
  return {
    K: fill(m.kernels * m.kernelSize ** 2, 0.6),
    bc: fill(m.kernels, 0.1),
    V: fill(flat * m.hidden, Math.sqrt(6 / flat)),
    v0: fill(m.hidden, 0.05),
    w: fill(m.hidden, 0.5),
    w0: 0,
  }
}

let cache: Promise<LoadedModel> | null = null
let status: ModelStatus = 'loading'
let statusMessage = ''
const listeners = new Set<() => void>()
function setStatus(s: ModelStatus, msg = '') {
  status = s
  statusMessage = msg
  listeners.forEach((l) => l())
}
export const modelStatus = {
  get: () => status,
  message: () => statusMessage,
  subscribe(cb: () => void) {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
}

/** Mulai ulang pemuatan (mis. setelah koneksi kembali). */
export function retryModel() {
  cache = null
  return loadModel()
}

/** Memuat model sekali; dipanggil lebih awal oleh splash agar siap saat dipakai. */
export function loadModel(): Promise<LoadedModel> {
  cache ??= (async () => {
    setStatus('loading')
    try {
      const [metaRes, binRes] = await Promise.all([fetch(META_URL), fetch(BIN_URL)])
      const ct = metaRes.headers.get('content-type') ?? ''
      // Tanpa berkas model, server SPA mengembalikan index.html (bukan JSON) atau 404.
      if (metaRes.status === 404 || binRes.status === 404 || (metaRes.ok && !ct.includes('json'))) {
        throw new ModelUnavailableError('missing')
      }
      if (!metaRes.ok || !binRes.ok) throw new Error(`HTTP ${metaRes.status}/${binRes.status}`)
      const meta: ModelMeta = { ...DEFAULT_META, ...(await metaRes.json()) }
      const model = { meta, weights: parseWeights(await binRes.arrayBuffer(), meta), isMock: false }
      setStatus('ready')
      return model
    } catch (err) {
      const missing = err instanceof ModelUnavailableError && err.message === 'missing'
      // Berkas model belum diunggah: tetap bisa dicoba dengan bobot acak, ditandai jelas sebagai mode demo.
      // Begitu model.bin + meta.json dari Colab ditaruh di public/model/, prediksi sungguhan dipakai otomatis.
      if (missing) {
        console.warn('[PILAH] model.bin belum ada di /model/, memakai bobot acak (mode demo).')
        setStatus('demo')
        return { meta: DEFAULT_META, weights: mockWeights(DEFAULT_META), isMock: true }
      }
      cache = null // izinkan mencoba lagi
      const msg =
        err instanceof ModelUnavailableError
          ? err.message
          : 'Model gagal dimuat. Periksa koneksi internet lalu coba lagi.'
      setStatus('error', msg)
      throw new ModelUnavailableError(msg)
    }
  })()
  return cache
}
