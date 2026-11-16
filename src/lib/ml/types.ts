/** Isi meta.json yang diekspor dari Colab bersama model.bin. */
export interface ModelMeta {
  version: string
  inputSize: number // 64
  kernels: number // 8
  kernelSize: number // 3
  hidden: number // 16
  /** Urutan flatten. Notebook NumPy berbentuk (kanal, baris, kolom) → 'channel-major'. */
  flatten: 'channel-major'
  /** true jika saat training nilai grayscale dibulatkan ke bilangan bulat sebelum dibagi 255. */
  grayRound: boolean
  threshold: number // 0.5 → y ≥ threshold = anorganik
  /** Rentang |y − threshold| yang dianggap "kurang yakin". */
  uncertainBand?: number
  metrics?: ModelMetrics
  training?: ModelTraining
  trainedAt?: string
}

export interface ModelWeights {
  K: Float32Array // [kernel][u][v]
  bc: Float32Array // [kernel]
  V: Float32Array // [i][j], i = indeks flatten, j = hidden
  v0: Float32Array // [hidden]
  w: Float32Array // [hidden]
  w0: number
}

export interface LoadedModel {
  meta: ModelMeta
  weights: ModelWeights
  /** true bila memakai bobot acak (hanya mode dev, tanpa model.bin). */
  isMock: boolean
}

/** Hasil antara umpan maju — dipakai untuk visualisasi "Lihat proses". */
export interface ForwardTrace {
  size: number
  gray: Float32Array // matriks input I (setelah normalisasi)
  R: Float32Array[] // feature map setelah ReLU, per kernel (size × size)
  P: Float32Array[] // hasil max pooling, per kernel (size/2 × size/2)
  x: Float32Array // vektor flatten
  zin: Float32Array // z_in hidden layer (sebelum ReLU)
  z: Float32Array // output hidden layer
  yIn: number
  y: number
}

/** Hasil evaluasi pada data uji, diekspor oleh notebook Colab (anorganik = kelas positif). */
export interface ModelMetrics {
  accuracy: number
  precision: number
  recall: number
  f1: number
  testSize: number
  tp?: number
  tn?: number
  fp?: number
  fn?: number
}

/** Ringkasan pelatihan dari notebook Colab. */
export interface ModelTraining {
  trainSize: number
  epochs: number
  alpha: number
  epsilon: number
  eMax: number
  seconds?: number
  lossHistory?: number[]
  accHistory?: number[]
}
